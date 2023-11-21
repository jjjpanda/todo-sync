
export default class Delta<T>{
    toOrigin = { 
        add: [] as T[], //if not in origin but seen in remote
        modify: [] as T[], //if in origin (by id) but different 
        removeID: [] as T[] //if in origin (by id) but not in remote 
    }
    toRemote = {
        add: [] as T[], //if in remote but not in origin
        modify: [] as T[], //if in remote (by id) but different
        delete: [] as T[] //if in remote (by id) but explicitly caught as removal during application usage
    } 
}