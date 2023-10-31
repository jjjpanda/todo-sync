import TaskList from "./TaskList"
import Task from "./Task"

import moment from "moment"

export default class ToDoExtracter {
    static async getToDoTasks (server){
        const taskSets = (await server.getTasks()).value
        console.log("task-lists in to-do", taskSets)
        
        const taskSetsExpanded = await Promise.all(taskSets.map(list => server.getTaskItems(list.id)))
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