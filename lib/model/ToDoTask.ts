export default interface ToDoTask {
    id: string
    status: "notStarted"|"inProgress"|"completed"|"waitingOnOthers"|"deferred"
    title: string
    body: {
        content: string
    }
    dueDateTime: {
        dateTime: string
        timeZone: string
    }
    lastModifiedDateTime: string
}