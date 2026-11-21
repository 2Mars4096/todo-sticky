import { useSyncExternalStore } from 'react'
import { chooseLanguage, languageChoice, languages, languageSnapshot, subscribeLanguage, ui } from '../interfaceLocale'

export function InterfaceLanguage() {
  useSyncExternalStore(subscribeLanguage,languageSnapshot)
  return <label className="interface-language" title={ui('Display language')}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>
    </svg>
    <select aria-label={ui('Display language')} value={languageChoice()} onChange={event=>chooseLanguage(event.target.value)}>
      <option value="system">{ui('System default')}</option>
      {Object.entries(languages).map(([tag,name])=><option key={tag} value={tag} lang={tag}>{name}</option>)}
    </select>
  </label>
}
