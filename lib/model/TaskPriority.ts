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
    if(symbol && symbol.length !== 0){
        return symbolToPriorityMap[symbol]
    }
    else{
        return "normal"
    }
}

export function priorityToSymbol(priority: string): string{
    if(priority === "normal"){
        return ""
    }
    else{
        return priorityToSymbolMap[priority]
    }
}