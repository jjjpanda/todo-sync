import DateTimeUtils from "../DateTimeUtils"
import Logger from "../logger";
import TaskList from "./TaskList";
import Comparable from "./Comparable"
import ToDoTask from "./ToDoTask";

const logger = new Logger("Task")
export default class Task implements Comparable{
    title = "";
    status = "";
    dueDate = "";
    dueTime = "";
    priority = "";
    modifiedTime = 0;
    id = "";
    parent: TaskList

    constructor(parent: TaskList, taskStringOrObject: (string | ToDoTask | null), mtime: number){
        this.modifiedTime = mtime
        this.parent = parent
        if(!taskStringOrObject){
            this.title = "";
            this.status = "";
            this.dueDate = "";
            this.dueTime = "";
            this.priority = "";
            this.id = ""
            return
        }
        else if(typeof taskStringOrObject === "string"){
            this.setTaskPropertiesWithString(taskStringOrObject)
        }
        else{
            this.setTaskPropertiesWithObject(taskStringOrObject)
        }
    }

    setTaskPropertiesWithString(taskString: string){
        const {status, text} = Task.lineToTask(taskString);
        const obj = Task.parseTextToObject(text)
        this.status = status;
        this.title = obj.title
        this.dueDate = obj.due ?? ""
        this.dueTime = obj.time ? DateTimeUtils.extractTimeFromString(obj.time) : (obj.due ? DateTimeUtils.MIDNIGHT : "")
        this.priority = obj.priority ?? ""
    }

    setTaskPropertiesWithObject(taskObject: ToDoTask){
        this.title = taskObject.title
        switch(taskObject.status){
            case "notStarted":
                this.status = " "
                break;
            case "inProgress":
                this.status = "/"
                break;
            case "completed":
                this.status = "x"
                break;
            case "waitingOnOthers":
                this.status = "!"
                break;
            case "deferred":
                this.status = "B"
                break;
        }
        switch(taskObject.body?.content){
            case "^^":
                this.priority = "highest"
                break;
            case "^":
                this.priority = "high"
                break;
            case "o":
                this.priority = "medium"
                break;
            case "v":
                this.priority = "low"
                break;
            case "vv":
                this.priority = "lowest"
                break;
            default:
                this.priority = "normal"
                break;
        }
        const {date, time} = Task.parseDateTime(taskObject.dueDateTime.dateTime)
        this.dueDate = date
        this.dueTime = time
    }
    
    static parseDateTime(dateTime: string){
        const splitDateTime =  dateTime.replace("Z", "").split("T")
        return {date: splitDateTime[0], time: splitDateTime[1]}
    }

    static isLineATask(line: string){
        const match = /-\s\[(\s|\/|x|B|!)\] (.*)/.exec(line)
        if(match){
            return {
                status: match[1],
                text: match[2]
            }
        }
        else{
            return null;
        }
    }

    static lineToTask(line: string){
        const match = /-\s\[(\s|\/|x|B|!)\] (.*)/.exec(line)
        return {
            status: match ? match[1] : "",
            text: match ? match[2] : ""
        }
    }

    static metatagExtractor(field: string, text: string){
        const regex = `\\[\\s*${field}::\\s*(.*?)\\s*\\]`;
        const extraction = {} as {[key: string]: string}
        const match = new RegExp(regex).exec(text);
        if (match) {
          extraction[field] = match[1];
        }
        return {
            extraction,
            text: match ? match[0] : ""
        }
    }

    static parseTextToObject(text: string): {title: string, due?: string, time?: string, priority?: string } {
        const due = this.metatagExtractor("due", text) 
        text = text.replace(due.text, "")

        const time = this.metatagExtractor("time", text)
        text = text.replace(time.text, "")

        const priority = this.metatagExtractor("priority", text)
        text = text.replace(priority.text, "")

        text = text.trim()
        text = text.replace(/\s\s+/g, ' ')

        return {
            title: text,
            ...due.extraction,
            ...time.extraction,
            ...priority.extraction
        };
    }

    equals(task: Task): boolean {
        const sameId = task.id === this.id
        if(sameId){
            return true;
        }
        else{
            return false;
        }
    }

    isAnOlderVersionOf(task: Task): boolean{
        if(this.equals(task)){
            return this.modifiedTime < task.modifiedTime
        }
        else{
            return false
        }
    }
    
    static from(obj: {
        title?: string;
        status?: string;
        dueDate?: string;
        dueTime?: string;
        priority?: string;
        modifiedTime?: number;
        id?: string;
        parent?: TaskList
    }): Task {
        let result = new Task(
            obj.parent ?? TaskList.from({}),
            null, 
            obj.modifiedTime ?? 0
        );
        result.id = obj.id ?? "";

        result.title = obj.title ?? "";
        result.status = obj.status ?? "";
        result.dueDate = obj.dueDate ?? "";
        result.dueTime = obj.dueTime ?? "";
        result.priority = obj.priority ?? "";

        return result;
    }
}