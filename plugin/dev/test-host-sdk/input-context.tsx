import { createContext } from 'react';
import type { PluginInput } from '../host-contract/input-context';
import type { PluginRecord } from '../host-contract/client';
export type { PluginInput };
export const PluginInputContext = createContext<{ accountScope: string; onInput: (input: PluginInput) => void | Promise<void> } | null>(null);
export function UseInDiane({ label = 'Discuss in Diane' }: { record: PluginRecord; text?: string; title?: string; label?: string; iconOnly?: boolean }) {
  return <button type="button" disabled title="Requires the real Diane host">{label}</button>;
}
