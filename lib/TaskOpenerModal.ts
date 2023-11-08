import { FuzzySuggestModal, TFile } from 'obsidian';
import Logger from "./logger"
const logger = new Logger("TaskOpenerModal")
export default class TaskOpenerModal extends FuzzySuggestModal<TFile> {
    files: TFile[];
    

    constructor(app, kanbanCards) {
        super(app);
        this.files = app.vault.getMarkdownFiles();
    }

    getItems() {
        return this.files;
        
    }

    getItemText(item) {
        return item.basename;
    }

    onChooseItem(item, evt) {
        this.app.workspace.openLinkText(item.path, '', true);
    }
}