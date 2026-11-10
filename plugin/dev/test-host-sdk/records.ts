import { useSyncExternalStore } from 'react';
import { pluginScope, subscribePluginScope } from './client';
export const PLUGIN_RECORD_CHANGE_KEY = 'diane.plugins.record-change.v1';
export const recordsChanged = (_plugin: string, _scope?: string) => {};
export const subscribeToPluginChanges = (_plugin: string, _callback: () => void, _scope?: string) => () => {};
export const usePluginScope = () => useSyncExternalStore(subscribePluginScope, pluginScope, pluginScope);
