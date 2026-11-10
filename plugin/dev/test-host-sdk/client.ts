/** Offline test adapter. All service operations require an explicit test mock. */
import type { PluginApi, RecordFields } from '../host-contract/client';
export type * from '../host-contract/client';
export const unavailable = (name: string): never => { throw new Error(`Mock the Diane host operation: ${name}`); };
let testScope = '';
export const setTestScope = (scope: string) => { testScope = scope; };
export const pluginScope = () => testScope;
export const connectionScope = async () => pluginScope();
export const subscribePluginScope = (_listener: () => void) => () => {};
export const newId = () => crypto.randomUUID();
export const fields = (record: Partial<RecordFields> = {}): RecordFields => ({
  schema_version: record.schema_version ?? 1, title: record.title ?? '', text: record.text ?? '',
  status: record.status ?? '', tags: record.tags ?? [], relationships: record.relationships ?? [],
  attachments: record.attachments ?? [], extensions: record.extensions ?? {},
});
export const describeError = (error: unknown) => error instanceof Error ? error.message.replace(/^\d+: /, '') : String(error);
export const downloadFile = (_name: string, _content: string, _type?: string) => unavailable('downloadFile');
export const downloadBlob = (_name: string, _blob: Blob) => unavailable('downloadBlob');
export const pluginApi: PluginApi = {
  list: async () => unavailable('list'),
  put: async () => unavailable('put'),
  remove: async () => unavailable('remove'),
  settings: async () => unavailable('settings'),
  configure: async () => unavailable('configure'),
  export: async () => unavailable('export'),
  import: async () => unavailable('import'),
  exportDocument: async () => unavailable('exportDocument'),
  projects: async () => unavailable('projects'),
  registerProject: async () => unavailable('registerProject'),
  preparation: async () => unavailable('preparation'),
  refreshPreparations: async () => unavailable('refreshPreparations'),
  workflows: async () => unavailable('workflows'),
  workflow: async () => unavailable('workflow'),
  run: async () => unavailable('run'),
  openWorkflow: async () => unavailable('openWorkflow'),
  review: async () => unavailable('review'),
  stop: async () => unavailable('stop'),
  todoAction: async () => unavailable('todoAction'),
};
