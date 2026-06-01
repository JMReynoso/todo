/**
 * Demo mode. When `NEXT_PUBLIC_DEMO=true` is set at build time, the app runs
 * entirely in the browser against an in-memory/localStorage mock backend
 * (see ./store) — no API, database, or auth. Used by the standalone demo
 * deployment that builds from the same repo as production.
 *
 * Because the flag is a `NEXT_PUBLIC_*` var it is inlined into the bundle at
 * build time, so this constant is statically known and tree-shakes cleanly.
 */
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO === 'true';

/** The signed-in identity the demo auto-authenticates as (see AuthCtx). */
export const DEMO_PERSON = {
  id: 1,
  name: 'Demo User',
  email: 'demo@todo.app',
} as const;
