import { createContext, useContext } from 'react';
import type { ManagedPluginHost } from '../host-contract/host-context';
export type { ManagedPluginHost };
export const PluginHostContext = createContext<ManagedPluginHost | null>(null);
export const useManagedPluginHost = () => useContext(PluginHostContext);
export const isManagedSideTool = (id: string) => id === 'meeting' || id === 'todo';
