import type { PluginRecord } from '../host-contract/client';
export function WorkflowReview(_props: { task: PluginRecord; active: boolean; enabled?: boolean }) {
  return <section aria-label="Diane workflow"><button type="button" disabled>Requires the real Diane host</button></section>;
}
