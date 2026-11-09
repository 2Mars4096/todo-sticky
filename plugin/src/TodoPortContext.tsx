import { createContext, useContext } from 'react';
export const TodoPortContext=createContext<{scope:string;active:boolean;enabled:boolean;taskKey?:string;flush:()=>Promise<void>;selection?:{recordId:string;requestId?:number|string}}|null>(null);
export const useTodoPort=()=>useContext(TodoPortContext);
