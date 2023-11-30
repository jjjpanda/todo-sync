import { Editor, MarkdownViewModeType, TFile, Vault } from "obsidian";

import Logger from "./logger";
import { CHECKBOX_REGEX } from "lib/model/TaskRegex";
import { CHECKBOX_LIST_REGEX } from "lib/model/TaskRegex";
import { EXTRA_NEWLINE_BETWEEN_TASKS_REGEX } from "lib/model/TaskRegex";

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
    const allCheckboxes = inputText.match(CHECKBOX_REGEX) ?? [];
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
        CHECKBOX_REGEX,
        () => reorderedCheckboxes.shift() || "",
    );
  
    return reorderedText;
}

function reorderCheckboxesInFile(inputText: string) {
    //logger.debug("INPUT", inputText)
    const reorderedText = inputText
        .replace(EXTRA_NEWLINE_BETWEEN_TASKS_REGEX, '\n')
        .replace(
            CHECKBOX_LIST_REGEX,
            reorderCheckboxesInList
        );
    //logger.debug("OUTPUT", reorderedText)
    return reorderedText;
}