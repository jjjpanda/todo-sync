import TaskList from "./TaskList"
import Task from "./Task"

import moment from "moment"

export class ToDoExtracter {
    static async getToDoTasks (server){
        const taskSets = (await server.getTasks()).value
        
        const taskSetsExpanded = await Promise.all(taskSets.map(list => server.getTaskItems(list.id)))
        const contextualizedTaskSets = taskSetsExpanded.map((taskItems, index) => {
            console.log(taskSets[index])
            const taskList = new TaskList(taskSets[index].wellknownListName === "defaultList" ? "__Other" : taskSets[index].displayName)
            
            taskList.addTasks(taskItems.value.map(item => {
                const modifiedTime = moment(item.lastModifiedDateTime)
                const modifiedTimeUnix = modifiedTime ? modifiedTime.valueOf() : 0
                return new Task(item, modifiedTimeUnix)
            }))
            return taskList
        })

        return contextualizedTaskSets
    }
}