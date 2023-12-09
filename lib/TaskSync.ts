
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
import moment from "moment";

const logger = new Logger("TaskSync")

type IdCountObject = {[id: string]: {count: number, earliestDueDate: string}}
export default class TaskSync {
	obsidianUtils: ObsidianUtils;
    taskManager: TaskManager;
    server: MSAuthServer;
    toDoManager: ToDoManager;
    lastFetchFailed: boolean;
    processQueue: {trace: string, type: ProcessType, running: boolean}[];
    knownDeltaForTaskLists = new Delta<TaskList>();
    knownDeltaForTasks = new Delta<Task>();
    cachedTaskLists: TaskList[];
    
    constructor(app: App, settings: ToDoSettings){
        this.obsidianUtils = new ObsidianUtils(app, settings.NEW_CARD_TEMPLATE)
        this.taskManager = new TaskManager(this.obsidianUtils, settings.TASK_FOLDER)
        this.toDoManager = new ToDoManager()
        this.server = new MSAuthServer(settings)
        this.lastFetchFailed = false
        this.processQueue = []
        this.cachedTaskLists = []
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
    
    async runJobWithNoResolutionProcessCollision<T>(type: ProcessType, job: (id: string) => Promise<T>) {
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
        const results = await job(trace);
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
    
    private async fetchTasksFromKanbanCards() {
        const taskLists = await this.obsidianUtils.parseTasks(this.taskManager.kanbanCards);
        logger.debug("task lists", taskLists);

        this.cachedTaskLists = taskLists;
        return taskLists;
    }

    private async fetchTasksFromToDo() {
        const todoLists = await this.toDoManager.getToDoTasks() ?? [];
        logger.debug("todo lists", todoLists);

        return todoLists;
    }

    async fetchDelta() {    
        while(!this.taskManager.kanbanCards){
            logger.debug("waiting for kanban cards list to be not undefined")
            await sleep(100)
        }    
        return await this.runJobWithNoResolutionProcessCollision(
            ProcessType.FETCH,
            async (traceId) => {
                logger.info(traceId, "beginning fetch");

                logger.debug(traceId, "known deltas", this.knownDeltaForTaskLists, this.knownDeltaForTasks);
                
                let taskLists, todoLists;

                try {
                    taskLists = await this.fetchTasksFromKanbanCards();
                    todoLists = await this.fetchTasksFromToDo();
                } catch (e) {
                    logger.error(traceId, e)
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
                    logger.info(traceId, "tasklist delta", taskListDelta);
                } catch(e){
                    logger.error(traceId, "issue with resolving tasklists", e)
                    this.lastFetchFailed = true;
                    return "⚠"
                }
        
                try{
                    taskDelta = DeltaResolver.getTaskDeltas(
                        taskLists.map(list => list.tasks).flat(),
                        todoLists.map(list => list.tasks).flat(),
                        this.knownDeltaForTasks
                    );
                    logger.info(traceId, "task delta", taskDelta);
                } catch(e){
                    logger.error(traceId, "issue with resolving tasks", e)
                    this.lastFetchFailed = true;
                    return "⚠"
                }

                this.knownDeltaForTaskLists = taskListDelta;
                this.knownDeltaForTasks = taskDelta
        
                this.lastFetchFailed = false;
                logger.info(traceId, "fetch done");
        
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
            async (traceId) => {
                if(this.lastFetchFailed){
                    logger.warn(traceId, "not starting sync, last FETCH failed")
                    new Notice("not starting sync, last FETCH failed")
                    return "⚠";
                }

                let taskListDelta = this.knownDeltaForTaskLists;
                let taskDelta = this.knownDeltaForTasks;
                logger.info(traceId, "starting sync")
        
                taskListDelta = await this.toDoManager.resolveListDelta(taskListDelta);
                logger.debug(traceId, "task list delta resolved to remote", taskListDelta);
                taskListDelta = await this.taskManager.resolveListDelta(taskListDelta);
                logger.info(traceId, "task list delta resolved", taskListDelta);
        
                taskDelta = await this.toDoManager.resolveTaskDelta(taskDelta);
                logger.debug(traceId, "task delta resolved to remote", taskDelta);
                taskDelta = await this.taskManager.resolveTaskDelta(taskDelta);
                logger.info(traceId, "task delta resolved", taskDelta);
        
                logger.info(traceId, "completed sync")  
                
                this.resetKnownDeltas()  
                await this.fetchTasksFromKanbanCards()
                
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
        const listByPath = (list: TaskList) => (list.pathFrom(this.taskManager.folder) === file.path)
        const taskListFromCache = this.cachedTaskLists.find(listByPath)
        if(taskListFromCache){
            this.knownDeltaForTaskLists.toRemote.delete.push(taskListFromCache);
        }
        else{
            const taskListFromRemoteAddIndex = this.knownDeltaForTaskLists.toRemote.add.findIndex(listByPath)
            if(taskListFromRemoteAddIndex){
                this.knownDeltaForTaskLists.toRemote.add.splice(taskListFromRemoteAddIndex, 1)
            }
        }
    }

    async queueAdditionToRemote(abstractFile: TAbstractFile) {
        if(!(await this.taskManager.isAbstractFileKanbanCard(abstractFile))){
            return this.deltaStatus();//not kanban so idc
        }
        logger.debug('analysis created', abstractFile)
        return await this.runJobWithNoResolutionProcessCollision(
            ProcessType.CREATE,
            async (traceId) => {
                logger.debug(traceId, "starting analysis | creation of", abstractFile)
                await this.addToRemote(abstractFile as TFile);
                await this.fetchTasksFromKanbanCards();
                logger.debug(traceId, "finished analysis | creation of", abstractFile, this.knownDeltaForTaskLists, this.knownDeltaForTasks)
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
            async (traceId) => {
                logger.debug(traceId, "starting analysis | rename of", oldPath)
                
                const file = abstractFile as TFile
                const cardIndex = this.taskManager.findKanbanCardByPath(oldPath);
                if(cardIndex === -1){
                    logger.debug(traceId, oldPath, "wasn't a kanban card, adding it")
                    await this.addToRemote(file)
                }
                else{
                    await this.modifyRemote(cardIndex, file);
                }
                await this.fetchTasksFromKanbanCards();
                
                logger.debug(traceId, "finished analysis | rename of", oldPath, "to", abstractFile, this.knownDeltaForTaskLists, this.knownDeltaForTasks)
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
            async (traceId) => {
                logger.debug(traceId, "starting analysis | modify of", abstractFile)
                const file = abstractFile as TFile
                const cardIndex = this.taskManager.findKanbanCard(file);
                if(cardIndex === -1){
                    logger.debug(traceId, file, "wasn't a kanban card, adding it")
                    await this.addToRemote(file)
                }
                else{
                    const taskListCurrent = await this.taskListFromFile(file)   
                    let taskListContents = await this.obsidianUtils.getFileContents(file);
                    const idCounts = taskListCurrent.tasks.reduce<IdCountObject>((obj, {id, dueDate}) => {
                        const keySafeId = id !== "" ? id : "__blank"
                        let earlierDueDate = moment(dueDate).format("YYYY-MM-DD")
                        if(keySafeId in obj){
                            earlierDueDate = moment.min(moment(dueDate), moment(obj[keySafeId].earliestDueDate)).format("YYYY-MM-DD")
                        }
                        return {
                            ...obj, 
                            [keySafeId]: {
                                count: id !== "" ? (taskListContents.match(new RegExp(id, "g")) || []).length : -1,
                                earliestDueDate: earlierDueDate
                            }
                        }
                    }, {})
                    let duplicateIds = {} as {[id: string]: boolean}
                    for(const id in idCounts){
                        if(id !== "__blank" && idCounts[id].count > 1){
                            duplicateIds[id] = true
                        }
                        else{
                            continue;
                        }
                    }
                    let lines = taskListContents.split("\n")
                    for(let line of lines){
                        const taskOfLine = new Task(taskListCurrent, line, file.stat.mtime);
                        if(taskOfLine.id in duplicateIds){
                            if(! moment(taskOfLine.dueDate).isSame(moment(idCounts[taskOfLine.id].earliestDueDate), "D") ){
                                const lineWithoutId = line.replace(` %%[id:: ${taskOfLine.id}]%%`, "")
                                taskListContents = taskListContents.replace(line, lineWithoutId)
                                this.knownDeltaForTasks.toRemote.add.push(new Task(taskListCurrent, lineWithoutId, file.stat.mtime))
                            } 
                            else{
                                this.knownDeltaForTasks.toRemote.modify.push(new Task(taskListCurrent, line, file.stat.mtime))
                            }
                        }
                    }
                    if(Object.keys(duplicateIds).length > 0){
                        await this.obsidianUtils.getVault().modify(file, taskListContents);
                        await this.fetchTasksFromKanbanCards();
                        return this.deltaStatus();
                    }

                    logger.debug(traceId, "no duplicate ids found in", file)
                    const previousCachedTasks = await this.cachedTaskLists.find(list => list.id === taskListCurrent.id)
                    const diff = DeltaResolver.getTaskDeltas(taskListCurrent.tasks, previousCachedTasks?.tasks ?? [])
                    logger.debug(traceId, previousCachedTasks, taskListCurrent, idCounts, diff)

                    if(previousCachedTasks){                        
                        for(const task of diff.toOrigin.add){
                            let alreadyTakenOutOfPresumedAddition = false
                            for(const knownTaskAdd of diff.toRemote.add){
                                if(!task.hasSameProperties(knownTaskAdd)){
                                    continue;
                                }
                                const indexOfTaskAdd = this.knownDeltaForTasks.toRemote.add.findIndex(t => t.hasSameProperties(knownTaskAdd))
                                if(indexOfTaskAdd !== -1){
                                    this.knownDeltaForTasks.toRemote.add.splice(indexOfTaskAdd, 1)
                                    alreadyTakenOutOfPresumedAddition = true
                                    break;
                                }
                            }
                            if(!alreadyTakenOutOfPresumedAddition && task.id !== "" && previousCachedTasks.tasks.length > taskListCurrent.tasks.length){
                                this.knownDeltaForTasks.toRemote.delete.push(task)
                            }
                        }
                        for(const task of diff.toRemote.modify){
                            if(task.id !== ""){
                                let existingModificationTaskIndex = this.knownDeltaForTasks.toRemote.modify.findIndex(t => t.isAnOlderVersionOf(task));
                                if(existingModificationTaskIndex !== -1){
                                    this.knownDeltaForTasks.toRemote.modify.splice(existingModificationTaskIndex, 1, task)
                                }
                                else{
                                    this.knownDeltaForTasks.toRemote.modify.push(task)
                                }
                            }
                        }
                    }
                }
                
                await this.fetchTasksFromKanbanCards();
                logger.debug(traceId, "finished analysis | modify of", abstractFile, this.knownDeltaForTaskLists, this.knownDeltaForTasks)
                return this.deltaStatus();
            }
        );
    }

    async queueDeletionToRemote(abstractFile: TAbstractFile) {
        logger.debug('analysis deleted', abstractFile)
        return await this.runJobWithNoResolutionProcessCollision(
            ProcessType.DELETE,
            async (traceId) => {
                logger.debug(traceId, "starting analysis | delete of", abstractFile)
                const file = abstractFile as TFile
                const cardIndex = this.taskManager.findKanbanCard(file);
                if(cardIndex !== -1){
                    await this.deleteFromRemote(cardIndex, file);
                }
                else{
                    logger.debug(traceId, "not a kanban card to delete")
                }
                await this.fetchTasksFromKanbanCards();
                logger.debug(traceId, "finished analysis | delete of", abstractFile, this.knownDeltaForTaskLists, this.knownDeltaForTasks)
                return this.deltaStatus();
            }
        )
    }

   

}