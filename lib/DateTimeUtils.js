import moment from "moment"

export default class DateTimeUtils {
    static MIDNIGHT = "11:59:59.000000"

    static extractTimeFromString(timeString) {
        const time = moment(timeString, ['h:mm a', 'h a'], true);
        if (time.isValid()) {
          return time.format('HH:mm:ss.SSSSSS');
        }
      
        // Return null for invalid input
        return null;
    }
}