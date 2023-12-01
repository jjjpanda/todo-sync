export default function sleep(millis: number) {
    return new Promise(r => setTimeout(r, millis))
}