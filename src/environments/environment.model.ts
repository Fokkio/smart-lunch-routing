/**
 * Shape shared by every environment file.
 *
 * This module is intentionally NOT part of `fileReplacements`: it must stay
 * compiled in both development and production so both environment files are
 * type-checked against the same contract.
 */
export interface AppEnvironment {
  /** Absolute or origin-relative API base path, WITHOUT a trailing slash. */
  readonly apiBaseUrl: string;
  /** Human-readable label used in diagnostics only. */
  readonly name: string;
}
