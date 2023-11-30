import Task from "./Task"
import Logger from "../util/logger";
import Comparable from "./Comparable"
import ToDoTaskList from "./ToDoTaskList";

const logger = new Logger("TaskList")
export default class TaskList implements Comparable{
    name: string;
    group: string;
    tasks: Task[];
    id: string;
    modifiedTime: number;
    
    
    constructor(title: string, id: string, mtime: number){
        this.id = id
        if(title.includes(">")){
            this.group = title.split(">")[0].trim();
            this.name = title.split(">")[1].trim();
        }
        else{
            this.group = ""
            this.name = title;
        }
        this.modifiedTime = mtime
        this.tasks = []
    }

    toToDoTaskList(): ToDoTaskList{
        return {
            displayName: this.title(),
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
            this.name === taskList.name &&
            this.group === taskList.group
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
        title?: string;
        tasks?: Task[];
        id?: string;
        modifiedTime?: number;
    }): TaskList {
        let result = new TaskList(
            obj.title ?? "", 
            obj.id ?? "",
            obj.modifiedTime ?? 0
        );
        result.tasks = obj.tasks ?? [];

        return result;
    }

    groupName(){
        return this.group
    }

    title() {
        return `${this.group} > ${this.name}`
    }

    pathFrom(folder: string){
        return `${folder}/${this.group}/${this.name}.md`
    }
}