import TaskExtracter from "./TaskExtracter"
import ToDoExtracter from "./ToDoExtracter"
import TaskDelta from "./TaskDelta"
import ToDoUploader from "./ToDoUploader"
import ObsidianUtils from "./obsidianUtils";
import TaskManager from "./TaskManager";

export default class TaskSync {
	obsidianUtils;
    taskManager

    constructor(app, folder){
        this.obsidianUtils = new ObsidianUtils(app)
        this.taskManager = new TaskManager(app, folder)
    }

    async syncCards() {
        await this.taskManager.syncKanbanCards()
    }

    async initialResolution() {

    }

    async periodicResolution(app, cardManager, server){
        const taskLists = await TaskExtracter.parseTasks(app, cardManager.kanbanCards)
        const todoLists = await ToDoExtracter.getToDoTasks(server)

        console.log(taskLists, todoLists)

        //compare the two lists
        const missingFromCloud = TaskDelta.getTaskDelta(taskLists, todoLists)
        const missingFromLocal = TaskDelta.getTaskDelta(todoLists, taskLists)
        console.log("missing from cloud", missingFromCloud, "missing from local", missingFromLocal)


        //upload to cloud
        ToDoUploader.upload(server, missingFromCloud)
    }

    async queueAdditionToRemote() {

    }

    async queueModificationToRemote() {

    }

    async queueDeletionToRemote() {

    }

}