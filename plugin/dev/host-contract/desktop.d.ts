export function isElectron(): boolean;
export const nativePluginWindows: {
  open(target: { pluginId: string; accountScope: string }): Promise<{ ok: boolean }>;
  close(target: { pluginId: string; accountScope: string }): Promise<{ ok: boolean }>;
  openWorkbench(): Promise<{ ok: boolean }>;
  setAlwaysOnTop(value: boolean): Promise<unknown>;
};
