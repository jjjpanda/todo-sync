import DateTimeUtils from "../DateTimeUtils"
import Logger from "../logger";
import TaskList from "./TaskList";

const logger = new Logger("Task")
export default class Task{
    title: string;
    status: string;
    dueDate;
    dueTime;
    priority;
    modifiedTime;
    id: string;
    parent: TaskList

    constructor(parent, taskStringOrObject, mtime){
        this.modifiedTime = mtime
        this.parent = parent
        if(typeof taskStringOrObject === "string"){
            this.setTaskPropertiesWithString(taskStringOrObject)
        }
        else{
            this.setTaskPropertiesWithObject(taskStringOrObject)
        }
    }

    setTaskPropertiesWithString(taskString: string){
        const {status, text} = Task.isLineATask(taskString);
        const obj = Task.parseTextToObject(text)
        this.status = status;
        this.title = obj.title
        this.dueDate = obj.due
        this.dueTime = obj.time ? DateTimeUtils.extractTimeFromString(obj.time) : (obj.due ? DateTimeUtils.MIDNIGHT : undefined)
        this.priority = obj.priority
    }

    setTaskPropertiesWithObject(taskObject: {}){
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
    
    static parseDateTime(dateTime){
        const splitDateTime =  dateTime.replace("Z", "").split("T")
        return {date: splitDateTime[0], time: splitDateTime[1]}
    }

    static isLineATask(line){
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

    static metatagExtractor(field, text){
        const regex = `\\[\\s*${field}::\\s*(.*?)\\s*\\]`;
        const extraction = {}
        const match = new RegExp(regex).exec(text);
        if (match) {
          extraction[field] = match[1];
        }
        return {
            extraction,
            text: match ? match[0] : ""
        }
    }

    static parseTextToObject(text) {
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
    
}