interface PriorityMapping {
    [key: string]: string;
}

const symbolToPriorityMap: PriorityMapping = {
    "^^": "highest",
    "^": "high",
    "o": "medium",
    "v": "low",
    "vv": "lowest",
};

const priorityToSymbolMap: PriorityMapping = Object.fromEntries(
    Object.entries(symbolToPriorityMap).map(([symbol, priority]) => [priority, symbol])
);

export function symbolToPriority(symbol?: string): string{
    return symbolToPriorityMap[symbol] ?? "normal"
}

export function priorityToSymbol(priority: string): string{
    return priorityToSymbolMap[priority] ?? ""
}