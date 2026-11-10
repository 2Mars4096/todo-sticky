import type { Context, ReactElement } from 'react';
import type { PluginRecord } from './client';
export interface PluginInput {
  id: string; pluginId: string; accountScope: string; title: string; text: string;
  source: { kind: 'record' | 'tool_result'; recordType?: string; recordId?: string; revision?: number; requestId?: string; action?: string };
}
export const PluginInputContext: Context<{ accountScope: string; onInput: (input: PluginInput) => void | Promise<void> } | null>;
export function UseInDiane(props: { record: PluginRecord; text?: string; title?: string; label?: string; iconOnly?: boolean }): ReactElement | null;
