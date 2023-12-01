import TaskList from "./model/TaskList"
import Task from "./model/Task"

import moment from "moment"
import Logger from "./util/logger"
import GraphClient from "./util/graphClient"
import Delta from "./model/Delta"


const logger = new Logger("ToDoManager")
export default class ToDoManager {

    graphClient: GraphClient | null

    constructor() {
        this.graphClient = null
    }

    setGraphClient(graphClient: GraphClient | null){
        this.graphClient = graphClient;
    }
    
    async getToDoTasks (){
        if(this.graphClient === null){
            return null;
        }

        const taskSetResponse = await this.graphClient.getUserTasksLists()
        const taskSets = taskSetResponse.value
        logger.debug("task-lists in to-do", taskSets)
        
        const taskSetsExpanded = await Promise.all(
            taskSets.map(
                list => this.graphClient!.getUserTaskListItems(list.id)
            )
        )
        logger.debug("tasks in to-do", taskSetsExpanded)

        const contextualizedTaskSets = taskSetsExpanded.map((taskItems, index) => {
            const taskList = new TaskList(
                taskSets[index].wellknownListName === "defaultList" ? "__Other" : taskSets[index].displayName,
                taskSets[index].id,
                taskSets[index].lastModifiedDateTime
            )

            let taskListOverallModificationTime = 0
            
            taskList.addTasks(taskItems.value.map(item => {
                const modifiedTime = moment(item.lastModifiedDateTime)
                
                const modifiedTimeUnix = modifiedTime ? modifiedTime.valueOf() : 0
                taskListOverallModificationTime = Math.max(taskListOverallModificationTime, modifiedTimeUnix)
                
                const task = new Task(taskList, item, modifiedTimeUnix)
                task.id = item.id
                return task
            }))

            taskList.modifiedTime = taskListOverallModificationTime
            return taskList
        })

        return contextualizedTaskSets
    }

    async resolveListDelta(delta: Delta<TaskList>): Promise<Delta<TaskList>> {
        if(this.graphClient === null){
            throw new Error("not connected to graph api");
        }

        for(let list of delta.toRemote.delete){
            await this.graphClient.deleteUserTaskList(list.id)
        }

        for(let list of delta.toRemote.add){
            const addedList = await this.graphClient.postUserTaskList(list.toToDoTaskList())
            list.id = addedList.id
            delta.toOrigin.modify.push(list)
        }

        for(let list of delta.toRemote.modify){
            await this.graphClient.patchUserTaskList(list.toToDoTaskList())
        }

        return delta
    }

    async resolveTaskDelta(delta: Delta<Task>): Promise<Delta<Task>>{
        if(this.graphClient === null){
            throw new Error("not connected to graph api");
        }

        for(let task of delta.toRemote.delete){
            try{
                await this.graphClient.deleteUserTaskListItem(task.parent.id, task.id)
            } catch(e){
                logger.error(task, e)
            }
        }

        for(let task of delta.toRemote.add){
            try{
                const addedTask = await this.graphClient.postUserTaskListItem(task.parent.id, task.toToDoTask())
                task.id = addedTask.id
                delta.toOrigin.modify.push(task)
            } catch(e){
                logger.error(task, e)
            }
        }

        for(let task of delta.toRemote.modify){
            try{
                await this.graphClient.patchUserTaskListItem(task.parent.id, task.toToDoTask())
            } catch(e){
                logger.error(task, e)
            }
        }

        return delta
    }
}