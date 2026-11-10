/** The products receive but do not inspect the host's private PanelContext. */
export interface SidePanelProps {
  context: unknown;
  /** Visible tools are active; hidden tools remain mounted. */
  active: boolean;
}
