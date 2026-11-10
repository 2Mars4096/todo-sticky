/** Only presentation preferences and explicit pending-write journals live here. */
export function storageForAccount(account: string) {
 const prefix=`diane.todoPort.v1:${encodeURIComponent(account)}:`;
 return {getItem:(key:string)=>localStorage.getItem(prefix+key),setItem:(key:string,value:string)=>localStorage.setItem(prefix+key,value),removeItem:(key:string)=>localStorage.removeItem(prefix+key)};
}
