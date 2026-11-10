export type RequestOptions = RequestInit & { timeoutMs?: number };
export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;
  constructor(status: number, message: string, detail?: unknown);
}
export function requestJson<T>(url: string, options?: RequestOptions): Promise<T>;
