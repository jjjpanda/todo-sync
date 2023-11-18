import TaskList from "./TaskList"

export default interface TaskDelta{
    toOrigin: { 
        add?: TaskList[], //if not in origin but seen in remote
        modify?: TaskList[], //if in origin (by id) but different 
        delete?: TaskList[] //if in origin (by id) but not in remote 
    }, 
    toRemote: {
        add?: TaskList[], //if in remote but not in origin
        modify?: TaskList[], //if in remote (by id) but different
        delete?: TaskList[] //if in remote (by id) but explicitly caught as removal during application usage
    } 
}