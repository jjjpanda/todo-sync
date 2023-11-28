
import Task from "./model/Task";
import TaskList from "./model/TaskList";
import Logger from "./util/logger"
import Delta from "./model/Delta";
import ObsidianUtils from "./util/obsidianUtils";
const logger = new Logger("TaskManager")
export default class TaskManager {
    folder: string;
    obsidianUtils: ObsidianUtils;
	kanbanCards;
    

    constructor(obsidianUtils, folder){
        this.obsidianUtils = obsidianUtils;
        this.folder = folder;
    }

    findKanbanCard(file) {
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

        // Read all files and filter based on the tag
        const kanbanCardsUnfiltered = await Promise.all(filesInFolder.map(file => this.obsidianUtils.getFileContents(file).then(content => {
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
        })))

        this.kanbanCards = kanbanCardsUnfiltered.filter(file => !!file)
        logger.info("kanban cards file list", this.kanbanCards)
    }

    async resolveListDelta(delta: Delta<TaskList>): Promise<Delta<TaskList>> {
    
        logger.error(this.folder, delta)
        // toOrigin.add
        for(let list of delta.toOrigin.add){
            await this.obsidianUtils.getVault().create(`${this.folder}/${list.group}/${list.name}`, "")
        }

        // toOrigin.removeID 
        for(let list of delta.toOrigin.removeID){
    
        }

        // toOrigin.modify + (insert new ids)
        for(let list of delta.toOrigin.modify){
            
        }
    
        // delta.toOrigin.add = [];
        // delta.toOrigin.modify = [];
        // delta.toOrigin.removeID = [];

        return delta
    }

    async resolveTaskDelta(delta: Delta<Task>): Promise<Delta<Task>>{

    }

}