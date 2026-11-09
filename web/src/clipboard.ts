import { writeText as writeClipboardText } from '@tauri-apps/plugin-clipboard-manager'

export async function copyText(text: string) {
  await writeClipboardText(text)
}
