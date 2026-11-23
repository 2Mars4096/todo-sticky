import { ui } from '../interfaceLocale'
import { useState, type ReactNode } from 'react'
import { invoke, isTauri } from '@tauri-apps/api/core'

export function SuiteLink({href, destination, children}: {href:string; destination?:"mynit" | "shiprite"; children:ReactNode}) {
  const [error,setError] = useState('')
  return <><a data-pd-destination={destination} href={href} target="_blank" rel="noopener noreferrer" onClick={event => {
    if (!isTauri()) return
    event.preventDefault()
    void invoke('open_suite_link',{url:href}).catch(() => setError(ui("Could not open the link in your browser.")))
  }}>{children}</a>{error && <span role="alert">{error}</span>}</>
}
