
import ToDoExtracter from "./ToDoExtracter"
import TaskDelta from "./TaskDelta"
import ObsidianUtils from "./obsidianUtils";
import TaskManager from "./TaskManager";
import MSAuthServer from "./MSAuthServer";
import Logger from "./logger"
const logger = new Logger("TaskSync")
export default class TaskSync {
	obsidianUtils;
    taskManager
    server
    

    constructor(app, settings){
        this.obsidianUtils = new ObsidianUtils(app)
        this.taskManager = new TaskManager(app, settings.TASK_FOLDER)
        this.server = new MSAuthServer(settings)
    }

    async syncCards() {
        await this.taskManager.syncKanbanCards()
    }

    getCards() {
        return this.taskManager.kanbanCards
    }
    

    async initialResolution() {
        const taskLists = await this.obsidianUtils.parseTasks(this.taskManager.kanbanCards)
        const todoLists = await ToDoExtracter.getToDoTasks(this.server)

        logger.log(taskLists, todoLists)

        //compare the two lists
        const missingFromCloud = TaskDelta.getTaskDelta(taskLists, todoLists)
        const missingFromLocal = TaskDelta.getTaskDelta(todoLists, taskLists)
        logger.log("missing from cloud", missingFromCloud, "missing from local", missingFromLocal)


        //upload to cloud
    }

    async periodicResolution(app, cardManager, server){
        
    }

    async queueAdditionToRemote() {

    }

    async queueModificationToRemote() {

    }

    async queueDeletionToRemote() {

    }

}