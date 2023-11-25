interface StatusMappings {
    [key: string]: string;
}

export const statusToSymbolObj: StatusMappings = {
    notStarted: " ",
    inProgress: "/",
    completed: "x",
    waitingOnOthers: "!",
    deferred: "B",
};

export const symbolToStatusObj: StatusMappings = Object.fromEntries(
    Object.entries(statusToSymbolObj).map(([status, symbol]) => [symbol, status])
);
