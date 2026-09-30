import type { AppEnvironment } from './environment.model';

/**
 * Production environment — swapped in by `fileReplacements` when building
 * with `--configuration production` (the default for `ng build`).
 *
 * Feature services must never reference this URL directly; they read
 * `environment.apiBaseUrl` from `./environment`, which resolves to this file
 * only in a production build.
 */
export const environment: AppEnvironment = {
  name: 'production',
  apiBaseUrl: 'https://smart-lunch-api.f0kki0.me/api',
};
