
import ToDoManager from "./ToDoManager"
import TaskDeltaResolver from "./TaskDeltaResolver"
import ObsidianUtils from "./obsidianUtils";
import TaskManager from "./TaskManager";
import MSAuthServer from "./MSAuthServer";
import Logger from "./logger"
import ToDoSettings from "./ToDoSettings";
const logger = new Logger("TaskSync")
export default class TaskSync {
	obsidianUtils: ObsidianUtils;
    taskManager: TaskManager;
    server: MSAuthServer;
    toDoManager: ToDoManager;
    
    constructor(app, settings: ToDoSettings){
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
        logger.log("beginning initial resolution")
        const taskLists = await this.obsidianUtils.parseTasks(this.taskManager.kanbanCards)
        logger.debug("task lists", taskLists)
        const todoLists = await this.toDoManager.getToDoTasks() ?? []
        logger.debug("todo lists", todoLists)

        const taskListDelta = TaskDeltaResolver.getTaskListDeltas(taskLists, todoLists)
        const taskDelta = TaskDeltaResolver.getTaskDeltas(taskLists, todoLists)
        logger.log("deltas", taskListDelta, taskDelta)

    }

    async periodicResolution(){
        
    }

    async queueAdditionToRemote() {

    }

    async queueModificationToRemote() {

    }

    async queueDeletionToRemote() {

    }

}