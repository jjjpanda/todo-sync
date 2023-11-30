import Task from "../model/Task"
import TaskList from "../model/TaskList";
import { App, FileSystemAdapter, TFile, TAbstractFile, Vault } from 'obsidian';
import path from 'path';
import Logger from "./logger";    
import TaskManager from "lib/TaskManager";

const logger: Logger = new Logger("ObsidianUtils")

export default class ObsidianUtils {
	private app: App;
	private fileSystem: FileSystemAdapter;
	private newCardTemplateContents: string;
	private newCardTemplatePath: string;

	constructor(app: App, newCardTemplatePath: string) {
		this.app = app;
		this.fileSystem = this.app.vault.adapter as FileSystemAdapter;
		this.newCardTemplatePath = newCardTemplatePath
	}

	async getNewCardContents(): Promise<string>{
		if(this.newCardTemplateContents){
			return this.newCardTemplateContents
		}
		else{
			const file = this.getFile(this.newCardTemplatePath)
			if(file){
				const contents = await this.getFileContents(file)
				this.newCardTemplateContents = contents;
				return await this.getNewCardContents();
			}
			else{
				return ""
			}
		}
	}

	getVault(): Vault{
		return this.app.vault;
	}

	getVaultName(): string {
		return this.app.vault.getName();
	}

	getVaultDirectory(): string {
		return this.fileSystem.getBasePath();
	}

	getPluginDirectory(): string {
		return path.join(this.getVaultDirectory(), this.app.vault.configDir, 'plugins/todo-sync/');
	}

	async getFileContents(file: TFile): Promise<string> {
		return await this.app.vault.read(file)
	}

	getFile(path: string): TFile | null{
		const files = this.getFiles();
		for(const file of files){
			if(file.path === path){
				return file
			}
		}
		return null;
	}

	getFiles(): TFile[] {
		return this.app.vault.getMarkdownFiles()
	}

	getAbstractFileByPath(path: string) : TAbstractFile | null {
		return this.app.vault.getAbstractFileByPath(path)
	}

	label(card: TFile): string {
        return `${card.parent?.name} > ${card.name.replace(".md", "")}`
    }

	async parseTasks(files: TFile[]){
        const contentFilePairs = await Promise.all(
			files.map(file => {
				return new Promise<{file: TFile, content: string}>(async resolve => {
					const content = await this.getFileContents(file)
					resolve({file, content})
				})
			})
		)
        const taskLists = Array.from(
			new Set(
				contentFilePairs.map(({file, content}) => ({title: this.label(file), content, mtime: file.stat.mtime ?? 0}))
			)
		).map(({title, content, mtime}) => new TaskList(
			title, 
			TaskManager.parseId(content) ?? "",
			mtime
		))
        contentFilePairs.forEach(({file, content}) => {
            const title = this.label(file)
            const indexOfNamedTaskList = taskLists.findIndex(list => list.title() === title);
            taskLists[indexOfNamedTaskList].addTasks(
            	content
                    .split("\n")
                    .filter(line => Task.isLineATask(line) != null)
                    .map(taskLine => new Task(taskLists[indexOfNamedTaskList], taskLine, file.stat.mtime ?? 0))
            )
        })
        
        return taskLists
    }
}