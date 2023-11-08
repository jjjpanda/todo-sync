import Task from "./Task"
import TaskList from "./TaskList";
import { App, FileSystemAdapter, TFile } from 'obsidian';
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

	getVaultName(): string {
		return this.app.vault.getName();
	}

	getVaultDirectory(): string {
		return this.fileSystem.getBasePath();
	}

	getPluginDirectory(): string {
		return path.join(this.getVaultDirectory(), this.app.vault.configDir, 'plugins/todo-sync/');
	}

	async getFile(file: TFile): Promise<string> {
		return await this.app.vault.read(file)
	}

	label(card: TFile): string {
        return `${card.parent?.name} > ${card.name.replace(".md", "")}`
    }

	async parseTasks(files: TFile[]){
        const contents = await Promise.all(files.map(card => this.getFile(card)))
        const taskLists = Array.from(new Set(files.map(card => this.label(card)))).map(name => new TaskList(name))
        contents.forEach((content, index) => {
            const name = this.label(files[index])
            const indexOfNamedTaskList = taskLists.findIndex(list => list.name === name);
            taskLists[indexOfNamedTaskList].addTasks(
                content
                    .split("\n")
                    .filter(line => Task.isLineATask(line) != null)
                    .map(taskLine => new Task(taskLine, files[index].stat.mtime ?? 0))
            )
        })
        
        return taskLists
    }
}