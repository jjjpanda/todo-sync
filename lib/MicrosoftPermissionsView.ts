import { ItemView, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_MSPERM = "microsoft-permissions-view";

export class MicrosoftPermissionsView extends ItemView {
  private url: string;

  constructor(leaf: WorkspaceLeaf, url: string) {
    super(leaf);
    this.url = url;
  }

  getViewType() {
    return VIEW_TYPE_MSPERM;
  }

  getDisplayText() {
    return "Microsoft Login";
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();

    
    container.createEl("iframe", { attr: { src: this.url, sandbox: "allow-top-navigation allow-scripts allow-popups" }, cls: "full-iframe" });
  }

  async onClose() {
    // Nothing to clean up.
  }
}