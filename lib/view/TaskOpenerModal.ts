import { FuzzySuggestModal, TFile } from 'obsidian';
import Logger from "../util/logger"
import TaskSync from '../TaskSync';
const logger = new Logger("TaskOpenerModal")
export default class TaskOpenerModal extends FuzzySuggestModal<TFile> {
    taskSync: TaskSync;
    
    constructor(app, taskSync) {
        super(app);
        this.taskSync = taskSync;
    }

    getItems() {
        return this.taskSync.getCards();
    }

    getItemText(item) {
        const group = item.parent.name
        return `${group} > ${item.basename}`;
    }

    onChooseItem(item, evt) {
        this.taskSync.syncCards();
        this.app.workspace.openLinkText(item.path, '', true, {active: true});
    }
}