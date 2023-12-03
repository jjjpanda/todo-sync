
import Task from "./model/Task";
import TaskList from "./model/TaskList";
import Logger from "./util/logger"
import Delta from "./model/Delta";
import ObsidianUtils from "./util/obsidianUtils";
import { CHECKBOX_REGEX, EXTRA_NEWLINE_BETWEEN_TASKS_REGEX, TASKLIST_ID_REGEX } from "./model/TaskRegex";
import { TAbstractFile, TFile } from "obsidian";
const logger = new Logger("TaskManager")
export default class TaskManager {
    folder: string;
    obsidianUtils: ObsidianUtils;
	kanbanCards;

    constructor(obsidianUtils, folder){
        this.obsidianUtils = obsidianUtils;
        this.folder = folder;
    }

    findKanbanCard(file: TAbstractFile): number {
        if(!this.kanbanCards){
            return -1
        }
        return this.kanbanCards.findIndex(card => card.path === file.path)
    }
    
    async syncKanbanCards(){
        logger.info("syncing cards from", this.folder)
        let tag = 'kanban_card';

        // Get all markdown files in the vault
        let markdownFiles = this.obsidianUtils.getFiles();
        logger.debug("all files", markdownFiles)

        // Filter files based on the folder
        let filesInFolder = markdownFiles.filter(file => {
            let filePath = this.obsidianUtils.getAbstractFileByPath(file.path);
            return filePath && filePath.parent && filePath.parent.path.includes(this.folder);
        });
        logger.debug("found files", filesInFolder)

        const fileIfKanbanCard = (file: TFile) => this.obsidianUtils.getFileContents(file).then(content => {
            // Parse YAML frontmatter
            let contentSplit = content.split('---');
            let frontMatter = contentSplit[1];
            if (frontMatter.includes("tags:")) {
                // Check if frontmatter contains the specified tag
                if (frontMatter.includes(tag)) {
                    return file;
                }
            }
            // Check if content contains the specified tag not in YAML
            return content.includes(`#${tag}`) ? file : null;
        })

        // Read all files and filter based on the tag
        const kanbanCardsUnfiltered = await Promise.all(filesInFolder.map(fileIfKanbanCard))

        this.kanbanCards = kanbanCardsUnfiltered.filter(file => !!file)
        logger.info("kanban cards file list", this.kanbanCards)
    }

    async resolveListDelta(delta: Delta<TaskList>): Promise<Delta<TaskList>> {

        const newCardContents = await this.obsidianUtils.getNewCardContents()
    
        logger.warn("resolving List Delta", this.folder, delta)
        // toOrigin.add
        for(let list of delta.toOrigin.add){
            await this.obsidianUtils.getVault().create(list.pathFrom(this.folder), `${newCardContents}\n<!---${list.id}--->`)
        }

        // toOrigin.removeID 
        for(let list of delta.toOrigin.removeID){
            const file = this.obsidianUtils.getFile(list.pathFrom(this.folder));
            if(file){
                const contents = await this.obsidianUtils.getFileContents(file)
                await this.obsidianUtils.getVault().modify(file, contents.replace(TASKLIST_ID_REGEX, ""))
            }
            else{
                logger.warn("couldn't find", file)
            }
        }

        // toOrigin.modify + (insert new ids)
        for(let list of delta.toOrigin.modify){
            const file = this.obsidianUtils.getFile(list.pathFrom(this.folder));
            if(file){
                const contents = await this.obsidianUtils.getFileContents(file)
                const id = TaskManager.parseId(contents);
                if(id){
                    //id existed
                    await this.obsidianUtils.getVault().modify(file, contents.replace(id, list.id))
                }
                else{
                    await this.obsidianUtils.getVault().modify(file, `${contents}\n<!---${list.id}--->`)
                }
                await this.obsidianUtils.getVault().rename(file, list.pathFrom(this.folder))
            }
            else{
                logger.warn("couldn't find", file)
            }
        }
    
        return delta
    }

    async resolveTaskDelta(delta: Delta<Task>): Promise<Delta<Task>>{

        let taskListMapping = {} as {[path: string]: {task: Task, operation: "add"|"mod"|"del"}[]}
        
        const addToMapping = (type: "add"|"mod"|"del") => (task: Task) => {
            const path = task.parent.pathFrom(this.folder)
            if(path in taskListMapping){
                taskListMapping[path].push({task, operation: type})
            }
            else{
                taskListMapping[path] = [{task, operation: type}]
            }
        }
        delta.toOrigin.add.forEach(addToMapping("add"))
        delta.toOrigin.modify.forEach(addToMapping("mod"))
        delta.toOrigin.removeID.forEach(addToMapping("del"))

        logger.warn("resolving Task Delta", this.folder, delta, "with mapping", taskListMapping)

        for(const path in taskListMapping){
            const taskList = taskListMapping[path];
            const file = this.obsidianUtils.getFile(path)
            if(!file){
                continue
            }
            let contents = await this.obsidianUtils.getFileContents(file);
            const lines = contents.split("\n")
            let taskLine = undefined
            for(const {task, operation} of taskList){
                switch(operation){
                    case "add":
                        const matches = contents.match(CHECKBOX_REGEX)
                        if(!matches) continue
                        const lastMatch = matches[matches.length - 1]
                        contents = contents.replace(lastMatch, `${lastMatch}\n${task.toText()}`)
                        break;
                    case "mod":
                        taskLine = lines.find((line) => line.includes(task.id) || task.isSimilar(line))
                        if(!taskLine) continue
                        contents = contents.replace(taskLine, task.toText())
                        break;
                    case "del":
                        contents = contents.replace(` %%[id:: ${task.id}]%%`, "").replace(EXTRA_NEWLINE_BETWEEN_TASKS_REGEX, "\n")
                        break;
                }
            }
            await this.obsidianUtils.getVault().modify(file, contents)
        }
    
        return delta
    }

    static parseId(contents: string){
        const match = contents.match(TASKLIST_ID_REGEX);
        return match ? match[1] : null
    }

}