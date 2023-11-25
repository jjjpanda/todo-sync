export default class Logger{
    prefix: string

    constructor(prefix: string){
        this.prefix = `ToDoSync | ${prefix} |`
    }

    debug(...args: any[]){
        console.debug(this.prefix, ...args)
    }

    info(...args: any[]){
        console.log(this.prefix, ...args)
    }

    warn(...args: any[]){
        console.warn(this.prefix, ...args)
    }

    error(...args: any[]){
        console.error(this.prefix, ...args)
    }
}