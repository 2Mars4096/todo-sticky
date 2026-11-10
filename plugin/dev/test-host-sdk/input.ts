import type { PluginRecord } from '../host-contract/client';
import type { PluginInput } from '../host-contract/input-context';
import { unavailable } from './client';
/** Shape-only fixture. Host authorization and input validation are separate integration checks. */
export function createRecordInput(record: PluginRecord, accountScope: string, text = record.text || record.title, title = record.title): PluginInput {
  if (record._scope && record._scope !== accountScope) throw new Error('The Diane account changed.');
  return { id: crypto.randomUUID(), pluginId: record.plugin_id, accountScope, title, text,
    source: { kind: 'record', recordType: record.record_type, recordId: record.record_id, revision: record.revision } };
}
export const validatePluginInput = (_value: unknown): PluginInput | null => unavailable('validatePluginInput');
export const formatPluginInput = (_value: PluginInput): string => unavailable('formatPluginInput');
