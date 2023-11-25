import Task from "./Task"
import Logger from "../util/logger";
import Comparable from "./Comparable"
import ToDoTaskList from "./ToDoTaskList";

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

    toToDoTaskList(): ToDoTaskList{
        return {
            displayName: this.name,
            id: this.id
        } as ToDoTaskList
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

    hasSameProperties(taskList: TaskList): boolean{
        return (
            this.name !== taskList.name
        )
    }

    isAnOlderVersionOf(taskList: TaskList): boolean{
        if(this.equals(taskList) && !this.hasSameProperties(taskList)){
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

    groupName(){
        return this.name.split(">")[0].trim()
    }
}