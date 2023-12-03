
import ToDoManager from "./ToDoManager"
import DeltaResolver from "./util/DeltaResolver"
import ObsidianUtils from "./util/obsidianUtils";
import TaskManager from "./TaskManager";
import MSAuthServer from "./MSAuthServer";
import Logger from "./util/logger"
import ToDoSettings from "./model/ToDoSettings";
import GraphClient from "./util/graphClient";
import {App, TAbstractFile} from "obsidian"
import Delta from "./model/Delta";
import TaskList from "./model/TaskList";
import Task from "./model/Task";
import { randomUUID } from "crypto";
import ProcessType from "./model/ProcessType";

const logger = new Logger("TaskSync")
export default class TaskSync {
	obsidianUtils: ObsidianUtils;
    taskManager: TaskManager;
    server: MSAuthServer;
    toDoManager: ToDoManager;
    lastFetchFailed: boolean;
    processQueue: {trace: string, type: ProcessType, running: boolean}[];
    knownDeltaForTaskLists = new Delta<TaskList>();
    knownDeltaForTasks = new Delta<Task>();
    
    constructor(app: App, settings: ToDoSettings){
        this.obsidianUtils = new ObsidianUtils(app, settings.NEW_CARD_TEMPLATE)
        this.taskManager = new TaskManager(this.obsidianUtils, settings.TASK_FOLDER)
        this.toDoManager = new ToDoManager()
        this.server = new MSAuthServer(settings)
        this.lastFetchFailed = false
        this.processQueue = []
    }

    async syncCards() {
        await this.taskManager.syncKanbanCards()
    }

    getCards() {
        return this.taskManager.kanbanCards
    }

    setGraphClient(graphClient: GraphClient | null){
        this.toDoManager.setGraphClient(graphClient)
    }

    printProcessQueue(){
        logger.debug(
            "current process queue", 
            [... this.processQueue.map(({trace, type, running}) => ({trace, type: ProcessType[type], running})) ]
        )
    }

    submitToQueue(type: ProcessType): string{
        const trace = randomUUID();
        this.processQueue.push({
            trace,
            type,
            running: false
        })
        this.processQueue.sort((process1, process2) => {
            if(process1.running){
                return -Infinity
            }
            else if(process2.running){
                return Infinity
            }
            else{
                return process1.type - process2.type
            }
        })
        this.printProcessQueue()
        return trace
    }

    removeFromQueue(trace: string){
        this.processQueue = this.processQueue.filter(process => {
            process.trace !== trace
        })
        this.printProcessQueue()
    }
    
    async runJobWithNoResolutionProcessCollision<T>(type: ProcessType, job: () => Promise<T>) {
        const trace = this.submitToQueue(type)
        while(this.processQueue.length > 0){
            if(trace === this.processQueue[0].trace){
                this.processQueue[0].running = true;
                break;
            }
            else {
                await sleep(5);
            }
        }
        logger.debug("starting task w/ trace", trace, "and type", ProcessType[type])
        const results = await job();
        this.removeFromQueue(trace)
        return results
    }

    resetKnownDeltas() {
        this.knownDeltaForTasks = new Delta<Task>();
        this.knownDeltaForTaskLists = new Delta<TaskList>();
    }

    async fetchDelta() {        
        return await this.runJobWithNoResolutionProcessCollision(
            ProcessType.FETCH,
            async () => {
                logger.info("beginning fetch");
                
                const taskLists = await this.obsidianUtils.parseTasks(this.taskManager.kanbanCards);
                logger.debug("task lists", taskLists);
                const todoLists = await this.toDoManager.getToDoTasks() ?? [];
                logger.debug("todo lists", todoLists);
                logger.debug("known deltas", this.knownDeltaForTaskLists, this.knownDeltaForTasks);

                let taskListDelta;
                let taskDelta;
        
                try{
                    taskListDelta = DeltaResolver.getTaskListDeltas(
                        taskLists,
                        todoLists,
                        this.knownDeltaForTaskLists
                    );
                    logger.info("tasklist delta", taskListDelta);
                } catch(e){
                    logger.error("issue with resolving tasklists", e)
                    this.lastFetchFailed = true;
                    return "⚠"
                }
        
                try{
                    taskDelta = DeltaResolver.getTaskDeltas(
                        taskLists.map(list => list.tasks).flat(),
                        todoLists.map(list => list.tasks).flat(),
                        this.knownDeltaForTasks
                    );
                    logger.info("task delta", taskDelta);
                } catch(e){
                    logger.error("issue with resolving tasks", e)
                    this.lastFetchFailed = true;
                    return "⚠"
                }

                this.knownDeltaForTaskLists = taskListDelta;
                this.knownDeltaForTasks = taskDelta
        
                logger.info("fetch done");
        
                if(taskDelta.isEmpty() && taskListDelta.isEmpty()){
                    return "✓ synced";
                }
                else{
                    const numberOfOriginChanges = taskDelta.toOriginChangesCount() + taskListDelta.toOriginChangesCount();
                    const numberOfRemoteChanges = taskDelta.toRemoteChangesCount() + taskListDelta.toRemoteChangesCount();
                    return `↓${numberOfOriginChanges} ↑${numberOfRemoteChanges}`
                }
            }
        );
    }

    async syncTaskListsAndTasks() {
        return await this.runJobWithNoResolutionProcessCollision(
            ProcessType.SYNC,
            async () => {
                if(this.lastFetchFailed){
                    logger.warn("not starting sync, last FETCH failed")
                    return;
                }

                let taskListDelta = this.knownDeltaForTaskLists;
                let taskDelta = this.knownDeltaForTasks;
                logger.info("starting sync")
        
                taskListDelta = await this.toDoManager.resolveListDelta(taskListDelta);
                logger.debug("task list delta resolved to remote", taskListDelta);
                taskListDelta = await this.taskManager.resolveListDelta(taskListDelta);
                logger.info("task list delta resolved", taskListDelta);
        
                taskDelta = await this.toDoManager.resolveTaskDelta(taskDelta);
                logger.debug("task delta resolved to remote", taskDelta);
                taskDelta = await this.taskManager.resolveTaskDelta(taskDelta);
                logger.info("task delta resolved", taskDelta);
        
                logger.info("completed sync")  
                
                this.resetKnownDeltas()  
                //need a final resolved taskLists and todoLists
                
                return "✓ synced";
            }
        );

        
    }

    async queueAdditionToRemote(file: TAbstractFile) {
        logger.debug('created', file)
        await this.runJobWithNoResolutionProcessCollision(
            ProcessType.CREATE,
            async () => {
                logger.debug("starting analysis of creation of", file)
                //await this.syncCards()
                // task list addition
            }
        );
    }

    async queueAbstractModificationFromRename(file: TAbstractFile, oldPath: string) {
        logger.debug('renamed', file, "from", oldPath)
        await this.runJobWithNoResolutionProcessCollision(
            ProcessType.RENAME,
            async () => {
                logger.debug("starting analysis of rename of", oldPath)
                // task list modification
            }
        );
					
    }

    async queueModificationToRemoteFromWrite(file: TAbstractFile) {
        const cardIndex = this.taskManager.findKanbanCard(file)
        if(cardIndex != -1){
            logger.info('modified card', file)
        }
        else{
            return; //not kanban card => don't care
        }

        await this.runJobWithNoResolutionProcessCollision(
            ProcessType.MODIFY,
            async () => {
                logger.debug("starting analysis of modify of", file)
                //assuming a cached, resolved taskLists/todoLists object

                //check if file is in this.kanbancards
                //if it is, analyze it's current tasks (obv. post write/modification)        

                //if there's duplicate ID's, delete the ids on the newer due-dated task

                //compare to existing, corresponding tasks in the kanban card in the cached list

                //add to known delta accordingly.
            }
        );
    }

    async queueDeletionToRemote(file: TAbstractFile) {
        logger.debug('deleted', file)
        await this.runJobWithNoResolutionProcessCollision(
            ProcessType.DELETE,
            async () => {
                logger.debug("starting analysis of delete of", file)
                // task list deletion
            }
        )
    }

}