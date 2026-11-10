import type { Context } from 'react';
export interface ManagedPluginHost {
  installed: readonly string[];
  open: (pluginId: string, recordId?: string, sourceRevision?: number) => void;
  selection?: { pluginId: string; recordId: string; requestId: string; sourceRevision?: number };
}
export const PluginHostContext: Context<ManagedPluginHost | null>;
export function useManagedPluginHost(): ManagedPluginHost | null;
export function isManagedSideTool(id: string): boolean;
