import moment from "moment"
import Logger from "./logger"

const logger = new Logger("DateTimeUtils");
export default class DateTimeUtils {
    static MIDNIGHT = "23:59:59.000000"

    static extractTimeFromString(timeString: string): string {
        const time = moment(timeString, ['h:mm a', 'h a'], true);
        if (time.isValid()) {
          return time.format('HH:mm:ss.SSSSSS');
        }
      
        return "";
    }

    static stringToMomentHoursMinutes(time: string){
      return moment(time, "HH:mm:ss.SSSSSS").format('h:mm a')
    }

    static currentDateTimeString(){
      return moment().format('YYYY-MM-DDTHH:mm:ss');;
    }
}