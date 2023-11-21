import TaskList from "./model/TaskList"
import Task from "./model/Task"
import Logger from "./logger";
import Delta from "./model/Delta";
import Comparable from "./model/Comparable"
const logger = new Logger("DeltaResolver")

export default class DeltaResolver {

    static filterDeltas<T extends Comparable>(_list: T[], filters: T[]): T[]{
        let filteredCount = 0
        const list = _list.filter(item => {
            let keep = true;
            for ( const change of filters){
                keep = !item.equals(change)
                if(!keep){
                    filteredCount++
                    break;
                }
            }
            return keep
        })

        if(filteredCount !== filters.length){
            logger.error("Error with filtering deltas, mismatch in filtered count and filters list length")
            throw new Error("")
        }

        return list
    }

    static filterByKnownDelta<T extends Comparable>(_origin: T[], _remote: T[], knownDelta = {toOrigin: {}, toRemote: {}} as Delta<T>): {origin: T[], remote: T[]} {
        const remoteFilters = [
            ...(knownDelta.toRemote.delete ?? []), 
            ...(knownDelta.toOrigin.add ?? []),
            ...(knownDelta.toOrigin.modify ?? []),
            ...(knownDelta.toRemote.modify ?? [])
        ]

        const originFilters = [
            ...(knownDelta.toRemote.add ?? []), 
            ...(knownDelta.toOrigin.modify ?? []),
            ...(knownDelta.toRemote.modify ?? [])
        ]

        let remote = DeltaResolver.filterDeltas(_remote, remoteFilters)
        let origin = DeltaResolver.filterDeltas(_origin, originFilters)
    
        return {origin, remote}
    }

    static getTaskListDeltas(_origin: TaskList[], _remote: TaskList[], knownDelta = new Delta<TaskList>()): Delta<TaskList>{
        const delta: Delta<TaskList> = knownDelta
        let {origin, remote} = DeltaResolver.filterByKnownDelta<TaskList>(_origin, _remote, knownDelta);

        logger.debug(origin, remote)

        origin.forEach(tasklist => {
            if(!tasklist.id){
                //not in remote
                delta.toRemote.add.push(tasklist)
            }
            else{
                const tasklistInRemoteIndex = remote.findIndex(t => t.id === tasklist.id)
                if(tasklistInRemoteIndex === -1){
                    //somehow has id but not in remote
                    delta.toOrigin.removeID.push(tasklist)
                }
                else{
                    if(tasklist.isAnOlderVersionOf(remote[tasklistInRemoteIndex])){
                        //origin is behind
                        delta.toOrigin.modify.push(remote[tasklistInRemoteIndex])
                    }
                    else{ 
                        //remote is behind
                        delta.toRemote.modify.push(tasklist)
                    }
                    remote.splice(tasklistInRemoteIndex, 1); //mutable removal of remote task
                }
            }
        })
        
        remote.forEach(taskList => {
            if(taskList.name !== "__Other"){
                delta.toOrigin.add.push(taskList)
            }
        })


        return delta
    }

    static getTaskDeltas (_origin: Task[], _remote: Task[], knownDelta = new Delta<Task>): Delta<Task> {
        const delta: Delta<Task> = knownDelta
        let {origin, remote} = DeltaResolver.filterByKnownDelta<Task>(_origin, _remote, knownDelta);
        
        origin = origin.filter(task => {
            if(!task.id){
                //not in remote
                delta.toRemote.add.push(task)
                return false;
            }
            else{
                const taskInRemoteIndex = remote.findIndex(t => t.id === task.id)
                if(taskInRemoteIndex === -1){
                    //somehow has id but not in remote
                    delta.toOrigin.removeID.push(task)
                    return false;
                }
                else{
                    if(task.isAnOlderVersionOf(remote[taskInRemoteIndex])){
                        //origin is behind
                        delta.toOrigin.modify.push(remote[taskInRemoteIndex])
                    }
                    else{ 
                        //remote is behind
                        delta.toRemote.modify.push(task)
                    }
                    remote.splice(taskInRemoteIndex, 1); //mutable removal of remote task
                    return false;
                }
            }
        })

        remote.forEach(task => {
            if(task.parent.name !== "__Other"){
                delta.toOrigin.add.push(task)
            }
        })

        return delta        
    }

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