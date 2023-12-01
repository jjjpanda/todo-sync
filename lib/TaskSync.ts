
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

const logger = new Logger("TaskSync")
export default class TaskSync {
	obsidianUtils: ObsidianUtils;
    taskManager: TaskManager;
    server: MSAuthServer;
    toDoManager: ToDoManager;
    running: boolean;
    knownDeltaForTaskLists = new Delta<TaskList>();
    knownDeltaForTask = new Delta<Task>();
    
    constructor(app: App, settings: ToDoSettings){
        this.obsidianUtils = new ObsidianUtils(app, settings.NEW_CARD_TEMPLATE)
        this.taskManager = new TaskManager(this.obsidianUtils, settings.TASK_FOLDER)
        this.toDoManager = new ToDoManager()
        this.server = new MSAuthServer(settings)
        this.running = false
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
    
    async assureNoResolutionProcessCollision() {
        while(this.running){
            await sleep(50);
        }
        this.running = true
    }

    resetKnownDeltas() {
        this.knownDeltaForTask = new Delta<Task>();
        this.knownDeltaForTaskLists = new Delta<TaskList>();
    }

    async resolution() {
        await this.assureNoResolutionProcessCollision();
        logger.info("beginning initial resolution")
        const taskLists = await this.obsidianUtils.parseTasks(this.taskManager.kanbanCards)
        logger.debug("task lists", taskLists)
        const todoLists = await this.toDoManager.getToDoTasks() ?? []
        logger.debug("todo lists", todoLists)

        let taskListDelta = DeltaResolver.getTaskListDeltas(
            taskLists, 
            todoLists,
            this.knownDeltaForTaskLists
        )
        logger.info("tasklist delta", taskListDelta)

        let taskDelta = DeltaResolver.getTaskDeltas(
            taskLists.map(list => list.tasks).flat(), 
            todoLists.map(list => list.tasks).flat(),
            this.knownDeltaForTask
        )
        logger.info("task delta", taskDelta)

        // taskListDelta = await this.toDoManager.resolveListDelta(taskListDelta)
        // logger.debug("task list delta resolved to remote", taskListDelta)
        // taskListDelta = await this.taskManager.resolveListDelta(taskListDelta)
        // logger.info("task list delta resolved", taskListDelta)

        // taskDelta = await this.toDoManager.resolveTaskDelta(taskDelta)
        // logger.debug("task delta resolved to remote", taskDelta)
        // taskDelta = await this.taskManager.resolveTaskDelta(taskDelta)
        // logger.info("task delta resolved", taskDelta)

        this.resetKnownDeltas()

        logger.info("initial resolution complete")
    }

    async queueAdditionToRemote(file: TAbstractFile) {
        //await this.syncCards()
    }

    async queueModificationToRemote(file: TAbstractFile, oldPath: string) {
    }

    async queueDeletionToRemote(file: TAbstractFile) {
    }

}