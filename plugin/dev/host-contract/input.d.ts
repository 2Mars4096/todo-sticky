import type { PluginRecord } from './client';
import type { PluginInput } from './input-context';
export function createRecordInput(record: PluginRecord, accountScope: string, text?: string, title?: string): PluginInput;
export function validatePluginInput(value: unknown): PluginInput | null;
export function formatPluginInput(value: PluginInput): string;
