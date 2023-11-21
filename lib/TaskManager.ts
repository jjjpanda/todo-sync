
import Logger from "./util/logger"
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
        logger.log("syncing cards from", this.folder)
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
        const kanbanCardsUnfiltered = await Promise.all(filesInFolder.map(file => this.obsidianUtils.getFile(file).then(content => {
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
        logger.log("kanban cards file list", this.kanbanCards)
    }

}