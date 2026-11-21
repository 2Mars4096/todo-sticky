import { createContext } from 'react'
export const AssignmentEntry = createContext<{requested?:string;open:(id:string,date?:string)=>void} | undefined>(undefined)
