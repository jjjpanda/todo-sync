export default class Logger{
    prefix

    constructor(prefix: string){
        this.prefix = prefix
    }

    debug(...args){
        console.debug(this.prefix, ...args)
    }

    log(...args){
        console.log(this.prefix, ...args)
    }

    warn(...args){
        console.warn(this.prefix, ...args)
    }

    error(...args){
        console.error(this.prefix, ...args)
    }
}