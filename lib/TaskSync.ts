
import ToDoManager from "./ToDoManager"
import DeltaResolver from "./util/DeltaResolver"
import ObsidianUtils from "./util/obsidianUtils";
import TaskManager from "./TaskManager";
import MSAuthServer from "./MSAuthServer";
import Logger from "./util/logger"
import ToDoSettings from "./model/ToDoSettings";
import GraphClient from "./util/graphClient";
import {App} from "obsidian"

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
        logger.log("beginning initial resolution")
        const taskLists = await this.obsidianUtils.parseTasks(this.taskManager.kanbanCards)
        logger.debug("task lists", taskLists)
        const todoLists = await this.toDoManager.getToDoTasks() ?? []
        logger.debug("todo lists", todoLists)

        const taskListDelta = DeltaResolver.getTaskListDeltas(
            taskLists, 
            todoLists
        )
        logger.log("tasklist delta", taskListDelta)

        const taskDelta = DeltaResolver.getTaskDeltas(
            taskLists.map(list => list.tasks).flat(), 
            todoLists.map(list => list.tasks).flat()
        )
        logger.log("task delta", taskDelta)

        //task lists

        // parameter given: Delta Object

        // toRemote.delete
        // toRemote.add 
        // toRemote.modify

        // return a new Delta object that removes all the toRemote stuff + adds a toOrigin.modify for each toRemote.add that contains the id
        
        // toOrigin.removeID + insert new ids
        // toOrigin.add
        // toOrigin.modify

        // return an empty Delta object that represents all resolutions being fulfilled

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