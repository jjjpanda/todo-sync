
import ToDoManager from "./ToDoManager"
import DeltaResolver from "./util/DeltaResolver"
import ObsidianUtils from "./util/obsidianUtils";
import TaskManager from "./TaskManager";
import MSAuthServer from "./MSAuthServer";
import Logger from "./util/logger"
import ToDoSettings from "./model/ToDoSettings";
import GraphClient from "./util/graphClient";
import {App, TAbstractFile} from "obsidian"

const logger = new Logger("TaskSync")
export default class TaskSync {
	obsidianUtils: ObsidianUtils;
    taskManager: TaskManager;
    server: MSAuthServer;
    toDoManager: ToDoManager;
    
    constructor(app: App, settings: ToDoSettings){
        this.obsidianUtils = new ObsidianUtils(app)
        this.taskManager = new TaskManager(this.obsidianUtils, settings.TASK_FOLDER)
        this.toDoManager = new ToDoManager()
        this.server = new MSAuthServer(settings)
    }

    async syncCards() {
        await this.taskManager.syncKanbanCards()
    }

    getCards() {
        return this.taskManager.kanbanCards
    }

    setGraphClient(graphClient: GraphClient){
        this.toDoManager.setGraphClient(graphClient)
    }
    

    async initialResolution() {
        logger.info("beginning initial resolution")
        const taskLists = await this.obsidianUtils.parseTasks(this.taskManager.kanbanCards)
        logger.debug("task lists", taskLists)
        const todoLists = await this.toDoManager.getToDoTasks() ?? []
        logger.debug("todo lists", todoLists)

        let taskListDelta = DeltaResolver.getTaskListDeltas(
            taskLists, 
            todoLists
        )
        logger.info("tasklist delta", taskListDelta)

        let taskDelta = DeltaResolver.getTaskDeltas(
            taskLists.map(list => list.tasks).flat(), 
            todoLists.map(list => list.tasks).flat()
        )
        logger.info("task delta", taskDelta)

        //taskListDelta = await this.toDoManager.resolveListDelta(taskListDelta)
        logger.debug("task list delta resolved to remote", taskListDelta)
        taskListDelta = await this.taskManager.resolveListDelta(taskListDelta)
        logger.info("task list delta resolved", taskListDelta)

        // taskDelta = await this.toDoManager.resolveTaskDelta(taskDelta)
        // logger.debug("task delta resolved to remote", taskDelta)
        // taskDelta = await this.taskManager.resolveTaskDelta(taskDelta)
        // logger.info("task delta resolved", taskDelta)

        logger.info("initial resolution complete")
    }

    async periodicResolution(){
        
    }

    async queueAdditionToRemote(file: TAbstractFile) {

    }

    async queueModificationToRemote(file: TAbstractFile, oldPath: string) {

    }

    async queueDeletionToRemote(file: TAbstractFile) {

    }

}