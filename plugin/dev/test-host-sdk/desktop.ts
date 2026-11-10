import { unavailable } from './client';
export const isElectron = () => false;
export const nativePluginWindows = {
  open: async (_target: { pluginId: string; accountScope: string }) => unavailable('nativePluginWindows.open'),
  close: async (_target: { pluginId: string; accountScope: string }) => unavailable('nativePluginWindows.close'),
  openWorkbench: async () => unavailable('nativePluginWindows.openWorkbench'),
  setAlwaysOnTop: async (_value: boolean) => unavailable('nativePluginWindows.setAlwaysOnTop'),
};
