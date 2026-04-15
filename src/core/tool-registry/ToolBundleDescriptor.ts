export interface ToolBundleDescriptor {
  /** Stable bundle ID — used for policy references and analytics */
  readonly id: string;
  /** Human-readable name */
  readonly displayName: string;
  /** Tool names this bundle registers */
  readonly toolNames: readonly string[];
}
