export default interface MicrosoftGraphResponseCollection<T>{
    "@odata.context": string,
    "@odata.deltaLink": string, //you have completed getting all the changes for that round
    "@odata.nextLink": string, //you should continue with the round
    value: T
}