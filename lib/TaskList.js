import Task from "./Task"

export default class TaskList{
    name;
    tasks;
    id;
    
    constructor(name){
        this.name = name;
        this.tasks = []
    }

    addTask(task){
        this.tasks.push(task)
    }

    addTasks(tasks){
        this.tasks = this.tasks.concat(tasks)
    }
}