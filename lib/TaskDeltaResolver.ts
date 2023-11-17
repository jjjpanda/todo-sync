import TaskList from "./model/TaskList"
import Logger from "./logger";
import TaskDelta from "./model/TaskDelta";
const logger = new Logger("TaskDeltaResolver")

export default class TaskDeltaResolver {

    static getTaskDeltas (origin: TaskList[], remote: TaskList[]): TaskDelta {
        const delta: TaskDelta = {toOrigin: {}, toRemote: {}}

        const deltaMissingFromRemote = []
        
        for(const taskList of origin){
            if(taskList.name === "__Other"){
                continue;
            }

            const matchingRemoteObject = remote.find(remoteTaskList => remoteTaskList.name === taskList.name)

            if(!matchingRemoteObject){
                deltaMissingFromRemote.push(taskList)
            }
            else{
                const deltaTaskList = new TaskList(matchingRemoteObject.name)
                deltaTaskList.id = matchingRemoteObject.id
                for(const task of taskList.tasks){
                    const matchingRemoteTask = matchingRemoteObject.tasks.find(remoteTask => remoteTask.title === task.title)
                    if(!matchingRemoteTask){
                        deltaTaskList.addTask(task)
                    }
                    else{
                        if(task.modifiedTime > matchingRemoteTask.modifiedTime){
                            deltaTaskList.addTask(task)
                            deltaTaskList.tasks[deltaTaskList.tasks.length - 1].id = matchingRemoteTask.id
                        }
                    }
                }
                if(deltaTaskList.tasks.length > 0){
                    deltaMissingFromRemote.push(deltaTaskList)
                }
            }
        }

        return delta
        
    }
}