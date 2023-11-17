import Task from "./Task"

export default interface TaskDelta{
    toOrigin: { 
        add?: Task[], //if not in origin but seen in remote
        modify?: Task[], //if in origin (by id) but different 
        delete?: Task[] //if in origin (by id) but not in remote 
    }, 
    toRemote: {
        add?: Task[], //if in remote but not in origin
        modify?: Task[], //if in remote (by id) but different
        delete?: Task[] //if in remote (by id) but explicitly caught as removal during application usage
    } 
}