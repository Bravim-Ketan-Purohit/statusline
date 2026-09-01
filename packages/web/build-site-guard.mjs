/**
 * Not a build step. This exists so that a misconfigured Vercel project fails
 * with the fix instead of "Command build:site not found. Did you mean pnpm
 * build?", which is what pnpm says and which points the wrong way.
 *
 * Vercel's importer scans pnpm-workspace.yaml, finds a Vite app here, and
 * pre-fills Root Directory as packages/web. That is a sensible guess for an
 * ordinary monorepo and wrong for this one: the site is assembled FROM four
 * directories, so it can only be built from the repository root.
 */
console.error(`
  ─────────────────────────────────────────────────────────────────
  Root Directory is set to packages/web. It must be the repo root.

  Vercel → your project → Settings → Build and Deployment
    (older UI: Settings → General)
      Root Directory   clear the field, leave it empty
      Framework Preset Other
    Save, then Deployments → ⋯ → Redeploy

  From packages/web the build cannot see any of:
    packages/core   vite cannot resolve @statusline/core without it
    www/            the landing page
    docs/           GUIDE.md + REFERENCE.md
    landing-kit/    screenshots and video posters
    vercel.json     not even read from here
  ─────────────────────────────────────────────────────────────────
`);
process.exit(1);
