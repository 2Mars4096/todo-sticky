/** Tauri rejects Rust Result errors as strings, not JavaScript Error objects. */
export function aiErrorMessage(cause: unknown, fallback = 'The AI request failed. Try again.'): string {
  const message = typeof cause === 'string'
    ? cause
    : cause && typeof cause === 'object' && 'message' in cause && typeof cause.message === 'string'
      ? cause.message
      : ''
  return message.trim() || fallback
}
