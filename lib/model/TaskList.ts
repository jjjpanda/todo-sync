import Task from "./Task"
import Logger from "../logger";
const logger = new Logger("TaskList")
export default class TaskList{
    name: string;
    tasks: Task[];
    id: string;
    
    
    constructor(name: string){
        this.name = name;
        this.tasks = []
    }

    addTask(task: Task){
        this.tasks.push(task)
    }

    addTasks(tasks: Task[]){
        this.tasks = this.tasks.concat(tasks)
    }

    
}