
import ToDoManager from "./ToDoManager"
import DeltaResolver from "./util/DeltaResolver"
import ObsidianUtils from "./util/obsidianUtils";
import TaskManager from "./TaskManager";
import MSAuthServer from "./MSAuthServer";
import Logger from "./util/logger"
import ToDoSettings from "./model/ToDoSettings";
import GraphClient from "./util/graphClient";
import {App, Notice, TAbstractFile, TFile} from "obsidian"
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

    deltaStatus() {
        const numberOfOriginChanges = this.knownDeltaForTasks.toOriginChangesCount() + this.knownDeltaForTaskLists.toOriginChangesCount();
        const numberOfRemoteChanges = this.knownDeltaForTasks.toRemoteChangesCount() + this.knownDeltaForTaskLists.toRemoteChangesCount();
        return `↓${numberOfOriginChanges} ↑${numberOfRemoteChanges}`
    }

    async fetchDelta() {    
        while(!this.taskManager.kanbanCards){
            logger.debug("waiting for kanban cards list to be not undefined")
            await sleep(100)
        }    
        return await this.runJobWithNoResolutionProcessCollision(
            ProcessType.FETCH,
            async () => {
                logger.info("beginning fetch");

                logger.debug("known deltas", this.knownDeltaForTaskLists, this.knownDeltaForTasks);
                
                let taskLists, todoLists;

                try{
                    taskLists = await this.obsidianUtils.parseTasks(this.taskManager.kanbanCards);
                    logger.debug("task lists", taskLists);

                    todoLists = await this.toDoManager.getToDoTasks() ?? [];
                    logger.debug("todo lists", todoLists);    
                } catch (e){
                    logger.error(e)
                    this.lastFetchFailed = true;
                    return "⚠"
                }
                
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
        
                this.lastFetchFailed = false;
                logger.info("fetch done");
        
                if(taskDelta.isEmpty() && taskListDelta.isEmpty()){
                    return "✓ synced";
                }
                else{
                    return this.deltaStatus()
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
                    new Notice("not starting sync, last FETCH failed")
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

    async taskListFromFile(file: TFile){
        const contents = await this.obsidianUtils.getFileContents(file);
        const tasklist = new TaskList(
            this.obsidianUtils.label(file),
            TaskManager.parseId(contents) ?? "",
            file.stat.mtime
        );
        tasklist.addTasks(
            contents
                .split("\n")
                .filter(line => Task.isLineATask(line) !== null)
                .map(taskLine => new Task(tasklist, taskLine, file.stat.mtime ?? 0))
        );
        return tasklist
    }

    private async addToRemote(file: TFile) {
        this.taskManager.kanbanCards.push(file);
        this.knownDeltaForTaskLists.toRemote.add.push(
            await this.taskListFromFile(file)
        );
    }
    
    private async modifyRemote(cardIndex: number, file: TFile) {
        this.taskManager.kanbanCards[cardIndex] = file;
        this.knownDeltaForTaskLists.toRemote.modify.push(await this.taskListFromFile(file));
    }

    private async deleteFromRemote(cardIndex: number, file: TFile) {
        this.taskManager.kanbanCards.splice(cardIndex, 1)
        this.knownDeltaForTaskLists.toRemote.delete.push(await this.taskListFromFile(file));
    }

    async queueAdditionToRemote(abstractFile: TAbstractFile) {
        if(!(await this.taskManager.isAbstractFileKanbanCard(abstractFile))){
            return this.deltaStatus();//not kanban so idc
        }
        logger.debug('analysis created', abstractFile)
        return await this.runJobWithNoResolutionProcessCollision(
            ProcessType.CREATE,
            async () => {
                logger.debug("starting analysis | creation of", abstractFile)
                await this.addToRemote(abstractFile as TFile);
                logger.debug("finished analysis | creation of", abstractFile)
                return this.deltaStatus()
            }
        );
    }

    async queueAbstractModificationFromRename(abstractFile: TAbstractFile, oldPath: string) {
        if(!(await this.taskManager.isAbstractFileKanbanCard(abstractFile))){
            return this.deltaStatus();//not kanban so idc
        }
        logger.debug('analysis renamed', abstractFile, "from", oldPath)
        return await this.runJobWithNoResolutionProcessCollision(
            ProcessType.RENAME,
            async () => {
                logger.debug("starting analysis | rename of", oldPath)
                
                const file = abstractFile as TFile
                const cardIndex = this.taskManager.findKanbanCardByPath(oldPath);
                if(cardIndex === -1){
                    logger.debug(oldPath, "wasn't a kanban card, adding it")
                    return await this.addToRemote(file)
                }
                else{
                    await this.modifyRemote(cardIndex, file);
                }

                logger.debug("finished analysis | rename of", oldPath, "to", abstractFile)
                return this.deltaStatus();
            }
        );
					
    }

    async queueModificationToRemoteFromWrite(abstractFile: TAbstractFile) {
        if(!(await this.taskManager.isAbstractFileKanbanCard(abstractFile))){
            return this.deltaStatus();//not kanban card => don't care
        }
        logger.info('analysis modified card', abstractFile)

        return await this.runJobWithNoResolutionProcessCollision(
            ProcessType.MODIFY,
            async () => {
                logger.debug("starting analysis | modify of", abstractFile)
                //assuming a cached, resolved taskLists/todoLists object

                //check if file is in this.kanbancards
                //if it is, analyze it's current tasks (obv. post write/modification)        

                //if there's duplicate ID's, delete the ids on the newer due-dated task

                //compare to existing, corresponding tasks in the kanban card in the cached list

                //add to known delta accordingly.
                logger.debug("finished analysis | modify of", abstractFile)
                return this.deltaStatus();
            }
        );
    }

    async queueDeletionToRemote(abstractFile: TAbstractFile) {
        if(!(await this.taskManager.isAbstractFileKanbanCard(abstractFile))){
            return this.deltaStatus();//not kanban so idc
        }
        logger.debug('analysis deleted', abstractFile)
        return await this.runJobWithNoResolutionProcessCollision(
            ProcessType.DELETE,
            async () => {
                logger.debug("starting analysis | delete of", abstractFile)
                const file = abstractFile as TFile
                const cardIndex = this.taskManager.findKanbanCard(file);
                if(cardIndex !== -1){
                    await this.deleteFromRemote(cardIndex, file);
                }
                else{
                    logger.debug("not a kanban card to delete")
                }
                logger.debug("finished analysis | delete of", abstractFile)
                return this.deltaStatus();
            }
        )
    }

   

}