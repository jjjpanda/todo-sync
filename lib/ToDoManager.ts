import TaskList from "./model/TaskList"
import Task from "./model/Task"

import moment from "moment"
const logger = new Logger("ToDoManager")
import Logger from "./util/logger"
import GraphClient from "./util/graphClient"
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
            const taskList = new TaskList(
                taskSets[index].wellknownListName === "defaultList" ? "__Other" : taskSets[index].displayName,
                taskSets[index].lastModifiedDateTime
            )
            taskList.id = taskSets[index].id

            let overallModificationTime = 0
            
            taskList.addTasks(taskItems.value.map(item => {
                const modifiedTime = moment(item.lastModifiedDateTime)
                const modifiedTimeUnix = modifiedTime ? modifiedTime.valueOf() : 0
                overallModificationTime = Math.max(overallModificationTime, modifiedTimeUnix)
                const task = new Task(taskList, item, modifiedTimeUnix)
                task.id = item.id
                return task
            }))

            taskList.modifiedTime = overallModificationTime
            return taskList
        })

        return contextualizedTaskSets
    }
}