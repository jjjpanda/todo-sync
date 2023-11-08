import Task from "./Task"
import Logger from "./logger";
const logger = new Logger("TaskList")
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