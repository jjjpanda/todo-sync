export default interface MicrosoftGraphResponse<T>{
    "@odata.context": string,
    value: T
}