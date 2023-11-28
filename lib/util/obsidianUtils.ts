import Task from "../model/Task"
import TaskList from "../model/TaskList";
import { App, FileSystemAdapter, TFile, TAbstractFile, Vault } from 'obsidian';
import path from 'path';
import Logger from "./logger";    

const logger: Logger = new Logger("ObsidianUtils")

export default class ObsidianUtils {
	private app: App;
	private fileSystem: FileSystemAdapter;

	private yamlRegex = /^---.*?---\n(.*?)($|---)/s;

	constructor(app: App) {
		this.app = app;
		this.fileSystem = this.app.vault.adapter as FileSystemAdapter;
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
        const contents = await Promise.all(files.map(card => this.getFileContents(card)))
        const taskLists = Array.from(
			new Set(
				files.map(card => ({title: this.label(card), mtime: card.stat.mtime ?? 0}))
			)
		).map(({title, mtime}) => new TaskList(title, mtime))
        contents.forEach((content, index) => {
            const title = this.label(files[index])
            const indexOfNamedTaskList = taskLists.findIndex(list => list.title() === title);
            taskLists[indexOfNamedTaskList].addTasks(
                content
                    .split("\n")
                    .filter(line => Task.isLineATask(line) != null)
                    .map(taskLine => new Task(taskLists[indexOfNamedTaskList], taskLine, files[index].stat.mtime ?? 0))
            )
        })
        
        return taskLists
    }
}