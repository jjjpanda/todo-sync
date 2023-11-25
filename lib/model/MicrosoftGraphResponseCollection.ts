export default interface MicrosoftGraphResponseCollection<T>{
    "@odata.context": string,
    value: T
}