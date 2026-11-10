export const PLUGIN_RECORD_CHANGE_KEY: string;
export function recordsChanged(plugin: string, scope?: string): void;
export function subscribeToPluginChanges(plugin: string, callback: () => void, scope?: string): () => void;
export function usePluginScope(): string;
