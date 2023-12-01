export const CHECKBOX_REGEX = /^- \[(B| |\/|x|!)\] .+(\n[ \t]+-.*)*$/gm;

export const CHECKBOX_LIST_REGEX = /^- .+(\n[ \t]*- .*)*$/gm;

export const EXTRA_NEWLINE_BETWEEN_TASKS_REGEX = /(\n{2,})(?=- \[[x\s!B/]\])/g;

export const TASKLIST_ID_REGEX = /<!---(.*)--->/;

export const TASK_CHECK_REGEX = /-\s\[(\s|\/|x|B|!)\] (.*)/

export const SPACES_AND_NEWLINES = /[\n\r\s]*/g

