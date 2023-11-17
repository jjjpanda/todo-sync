import TaskList from "./model/TaskList"
import Task from "./model/Task"

import moment from "moment"
const logger = new Logger("ToDoManager")
import Logger from "./logger"
import GraphClient from "./graphClient"
export default class ToDoManager {

    graphClient: GraphClient | null

    constructor() {
        this.graphClient = null
    }

    setGraphClient(graphClient: GraphClient){
        this.graphClient = graphClient;
    }

    async getTasks () {
        return await this.graphClient!.getUserTasksList()
	}

	async getTaskItems (id: string) {
		return await this.graphClient!.getUserTaskListItems(id)
	}
    
    async getToDoTasks (){
        if(!this.graphClient){
            return null;
        }

        const taskSets = (await this.getTasks()).value
        logger.debug("task-lists in to-do", taskSets)
        
        const taskSetsExpanded = await Promise.all(taskSets.map(list => this.getTaskItems(list.id)))
        logger.debug("tasks in to-do", taskSetsExpanded)

        const contextualizedTaskSets = taskSetsExpanded.map((taskItems, index) => {
            const taskList = new TaskList(taskSets[index].wellknownListName === "defaultList" ? "__Other" : taskSets[index].displayName)
            taskList.id = taskSets[index].id
            
            taskList.addTasks(taskItems.value.map(item => {
                const modifiedTime = moment(item.lastModifiedDateTime)
                const modifiedTimeUnix = modifiedTime ? modifiedTime.valueOf() : 0
                const task = new Task(item, modifiedTimeUnix)
                task.id = item.id
                return task
            }))
            return taskList
        })

        return contextualizedTaskSets
    }
}