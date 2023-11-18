import TaskList from "./model/TaskList"
import Task from "./model/Task"
import Logger from "./logger";
import Delta from "./model/Delta";
const logger = new Logger("TaskDeltaResolver")

export default class TaskDeltaResolver {

    static getTaskListDeltas(_origin: TaskList[], _remote: TaskList[], knownDelta = {toOrigin: {}, toRemote: {}} as Delta<TaskList>): Delta<TaskList>{
        const delta: Delta<TaskList> = {toOrigin: {}, toRemote: {}}
        let origin = [..._origin]
        let remote = [..._remote]
        
        return delta
    }

    static getTaskDeltas (_origin: TaskList[], _remote: TaskList[], knownDelta = {toOrigin: {}, toRemote: {}} as Delta<Task>): Delta<Task> {
        const delta: Delta<Task> = {toOrigin: {}, toRemote: {}}
        let origin = [..._origin]
        let remote = [..._remote]
        
        return delta

        // const deltaMissingFromRemote = []
        
        // for(const taskList of origin){
        //     if(taskList.name === "__Other"){
        //         continue;
        //     }

        //     const matchingRemoteObject = remote.find(remoteTaskList => remoteTaskList.name === taskList.name)

        //     if(!matchingRemoteObject){
        //         deltaMissingFromRemote.push(taskList)
        //     }
        //     else{
        //         const deltaTaskList = new TaskList(matchingRemoteObject.name)
        //         deltaTaskList.id = matchingRemoteObject.id
        //         for(const task of taskList.tasks){
        //             const matchingRemoteTask = matchingRemoteObject.tasks.find(remoteTask => remoteTask.title === task.title)
        //             if(!matchingRemoteTask){
        //                 deltaTaskList.addTask(task)
        //             }
        //             else{
        //                 if(task.modifiedTime > matchingRemoteTask.modifiedTime){
        //                     deltaTaskList.addTask(task)
        //                     deltaTaskList.tasks[deltaTaskList.tasks.length - 1].id = matchingRemoteTask.id
        //                 }
        //             }
        //         }
        //         if(deltaTaskList.tasks.length > 0){
        //             deltaMissingFromRemote.push(deltaTaskList)
        //         }
        //     }
        // }

        
    }
}