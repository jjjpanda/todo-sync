import Task from "./Task"
import Logger from "../util/logger";
import Comparable from "./Comparable"

const logger = new Logger("TaskList")
export default class TaskList implements Comparable{
    name: string;
    tasks: Task[];
    id: string;
    modifiedTime: number;
    
    
    constructor(name: string, mtime: number){
        this.id = ""
        this.name = name;
        this.modifiedTime = mtime
        this.tasks = []
    }

    addTask(task: Task){
        this.tasks.push(task)
    }

    addTasks(tasks: Task[]){
        this.tasks = this.tasks.concat(tasks)
    }

    equals(taskList: TaskList): boolean {
        const sameId = taskList.id === this.id
        if(sameId){
            return true;
        }
        else{
            return false;
        }
    }

    isAnOlderVersionOf(taskList: TaskList): boolean{
        if(this.equals(taskList) && this.name !== taskList.name){
            return this.modifiedTime < taskList.modifiedTime
        }
        else{
            return false
        }
    }

    static from(obj: {
        name?: string;
        tasks?: Task[];
        id?: string;
        modifiedTime?: number;
    }): TaskList {
        let result = new TaskList(
            obj.name ?? "", 
            obj.modifiedTime ?? 0
        );
        result.id = obj.id ?? "";
        result.tasks = obj.tasks ?? [];

        return result;
    }
}