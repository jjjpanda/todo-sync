import DateTimeUtils from "./DateTimeUtils"
import Logger from "./logger";

const logger = new Logger("Throttler");
export default class Throttler{ 
    limit: number;
    now = DateTimeUtils.currentDateTimeString();
    calls = 0 

    constructor(maxHitsPerSec: number){
        this.limit = maxHitsPerSec
    }

    addCall(){
        this.calls++
    }

    inThePresent(){
        return this.now === DateTimeUtils.currentDateTimeString()
    }

    reset() {
        this.now = DateTimeUtils.currentDateTimeString()
        this.calls = 0
    }

    async safeToCall() {
        await new Promise<void>(async resolve => {
            if(this.calls >= this.limit){
                while(this.inThePresent()){
                    await sleep(50)
                }
                this.reset()
                resolve();
            }
            else{
                this.addCall();
                logger.warn(this.now, this.calls, "out of", this.limit)
                resolve();
            }
        })
    }
}