import Task from "./Task"
import TaskList from "./TaskList"

export default class TaskExtracter {
    static async parseTasks(app, kanbanCards){
        const contents = await Promise.all(kanbanCards.map(card => app.vault.read(card)))
        const taskLists = Array.from(new Set(kanbanCards.map(card => TaskExtracter.label(card)))).map(name => new TaskList(name))
        contents.forEach((content, index) => {
            const name = TaskExtracter.label(kanbanCards[index])
            const indexOfNamedTaskList = taskLists.findIndex(list => list.name === name);
            taskLists[indexOfNamedTaskList].addTasks(
                content
                    .split("\n")
                    .filter(line => Task.isLineATask(line) != null)
                    .map(taskLine => new Task(taskLine, kanbanCards[index].stat.mtime ?? 0))
            )
        })
        
        return taskLists
    }

    static label(card){
        return `${card.parent.name} > ${card.name.replace(".md", "")}`
    }
      
}