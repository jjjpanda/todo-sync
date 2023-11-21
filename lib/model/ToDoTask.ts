export default interface ToDoTask {
    id: string
    title: "notStarted"|"inProgress"|"completed"|"waitingOnOthers"|"deferred"
    status: string
    body: {
        content: string
    }
    dueDateTime: {
        dateTime: string
    }
}