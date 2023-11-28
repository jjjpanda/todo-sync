import { Editor, MarkdownViewModeType, TFile, Vault } from "obsidian";

import Logger from "./logger";


const logger = new Logger("Reordering Tasks")
export function reorderCheckboxes(mode: MarkdownViewModeType, editor: Editor, vault?: Vault, file?: TFile) {
    const currentText = editor.getValue();
    const reorderedText = reorderCheckboxesInFile(currentText);
    logger.debug(editor)
    if(mode === "preview" && vault && file){
        logger.debug("writing to path", file.path)
        vault.modify(file, reorderedText);
    }
    else{
        editor.setValue(reorderedText);
    }
}

function reorderCheckboxesInList(inputText: string) {
    const checkboxPattern = /^- \[(B| |\/|x|!)\] .+(\n[ \t]+-.*)*$/gm;
  
    const allCheckboxes = inputText.match(checkboxPattern) ?? [];
    logger.debug()

    const filterBySymbol = (symbol: string) => allCheckboxes.filter((cb) => cb.startsWith(`- [${symbol}]`));

    const backlog = filterBySymbol("B")
    const toDo = filterBySymbol(" ")
    const inProgress = filterBySymbol("/")
    const done = filterBySymbol("x")
    const watchlist = filterBySymbol("!")
  
    const reorderedCheckboxes = [
        ...inProgress,
        ...toDo,
        ...backlog,
        ...watchlist,
        ...done,
    ];
    
    logger.debug(reorderedCheckboxes.length, "out of", allCheckboxes.length, "checkboxes rearranged");

    const reorderedText = inputText.replace(
        checkboxPattern,
        () => reorderedCheckboxes.shift() || "",
    );
  
    return reorderedText;
}

function reorderCheckboxesInFile(inputText: string) {
    //logger.debug("INPUT", inputText)
    const checkboxListPattern = /^- .+(\n[ \t]*- .*)*$/gm;
    const extraNewLine = /(\n{2,})(?=- \[[x\s!B/]\])/g;

    const reorderedText = inputText
        .replace(extraNewLine, '\n')
        .replace(
            checkboxListPattern,
            reorderCheckboxesInList
        );
    //logger.debug("OUTPUT", reorderedText)
    return reorderedText;
}