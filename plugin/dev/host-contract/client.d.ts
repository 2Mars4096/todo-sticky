/** Consumed diane-plugin/1 contract snapshot; declarations only, never a host implementation. */
export type PluginId = 'meeting' | 'todo' | 'diagrams' | 'usage';
export interface RecordReference { plugin_id: string; record_type: string; record_id: string; revision?: number; unresolved?: boolean }
export interface Relationship { kind: string; target: RecordReference }
export interface RecordFields {
  schema_version: number; title: string; text: string; status: string; tags: string[];
  relationships: Relationship[]; attachments: unknown[]; extensions: Record<string, unknown>;
}
export interface PluginRecord extends RecordFields {
  plugin_id: PluginId; record_type: string; record_id: string; revision: number;
  created_at: string; updated_at: string; deleted?: boolean; _scope?: string;
}
export interface RecordPage { items: PluginRecord[]; next_cursor: string | null }
export interface PluginSettings { enabled: boolean; revision?: number; definition_digest?: string }
export interface Project { id: string; name: string; root: string }
export interface Workflow {
  workflow_id: string; task_id: string; task_revision: number; state: string; request_id: string;
  project_id: string; dispatch_id: string; session_id?: string; run_id?: string;
  result_version?: string; result?: { summary?: string; [key: string]: unknown }; feedback?: string; review_conflict?: string; can_discard_result?: boolean; _scope?: string;
}
export interface TaskPreparation {
  state: 'pending' | 'ready' | 'unmatched' | 'unavailable' | 'stale';
  project_id?: string; workspace_root?: string; context?: string; reason?: string;
  fingerprint?: string; task_revision?: number; _scope?: string;
}
export interface PluginApi {
  list(plugin: PluginId, cursor?: string | null, signal?: AbortSignal, scope?: string): Promise<RecordPage>;
  put(plugin: PluginId, type: string, id: string, record: RecordFields, revision: number, requestId: string, scope?: string): Promise<PluginRecord>;
  remove(record: PluginRecord, requestId: string): Promise<unknown>;
  settings(plugin: string, signal?: AbortSignal, scope?: string): Promise<PluginSettings>;
  configure(plugin: string, enabled: boolean, revision: number, requestId: string, scope?: string, expectedDefinitionDigest?: string): Promise<PluginSettings>;
  export(plugin: PluginId, scope?: string): Promise<{ format: string; version: number; plugin_id: PluginId; records: unknown[] }>;
  import(plugin: PluginId, body: unknown, scope?: string): Promise<{ imported?: number; records?: number; [key: string]: unknown }>;
  exportDocument(record: PluginRecord, format: 'pdf' | 'docx', includeSources: boolean): Promise<Blob>;
  projects(): Promise<{ projects: Project[]; active_project_id: string | null }>;
  registerProject(root: string, scope?: string): Promise<{ projects: Project[]; selected_project_id: string }>;
  preparation(taskId: string, scope?: string, signal?: AbortSignal): Promise<TaskPreparation>;
  refreshPreparations(scope?: string, signal?: AbortSignal): Promise<{ queued: number; scope: string }>;
  workflows(taskId: string, scope?: string): Promise<{ items: Workflow[] }>;
  workflow(id: string, scope?: string): Promise<Workflow>;
  run(task: PluginRecord, projectId: string, requestId: string, preparationFingerprint?: string): Promise<Workflow>;
  openWorkflow(workflow: Workflow): Promise<unknown>;
  review(workflow: Workflow, decision: 'accept' | 'revise' | 'defer' | 'stop', feedback: string, requestId: string): Promise<Workflow>;
  stop(workflow: Workflow): Promise<Workflow>;
  todoAction(body: Record<string, unknown>, scope?: string): Promise<{ records: PluginRecord[] }>;
}
export const pluginApi: PluginApi;
export function pluginScope(): string;
export function connectionScope(): Promise<string>;
export function subscribePluginScope(listener: () => void): () => void;
export function fields(record?: Partial<RecordFields>): RecordFields;
export function newId(): string;
export function describeError(error: unknown): string;
export function downloadFile(name: string, content: string, type?: string): void;
export function downloadBlob(name: string, blob: Blob): void;
