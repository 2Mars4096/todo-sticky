import { unavailable } from './client';
import type { RequestOptions } from '../host-contract/http';
export type { RequestOptions };
export class ApiError extends Error {
  constructor(readonly status: number, message: string, readonly detail?: unknown) { super(`${status}: ${message}`); }
}
export const requestJson = async <T>(_url: string, _options?: RequestOptions): Promise<T> => unavailable('requestJson');
