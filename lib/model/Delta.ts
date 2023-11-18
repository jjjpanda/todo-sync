

export default interface Delta<T>{
    toOrigin: { 
        add?: T[], //if not in origin but seen in remote
        modify?: T[], //if in origin (by id) but different 
        delete?: T[] //if in origin (by id) but not in remote 
    }, 
    toRemote: {
        add?: T[], //if in remote but not in origin
        modify?: T[], //if in remote (by id) but different
        delete?: T[] //if in remote (by id) but explicitly caught as removal during application usage
    } 
}