---
name: Clerk dependency repair
description: A workspace-specific dependency resolution lesson for Clerk package changes.
---

When Clerk dependencies change, rebuild the pnpm install tree before diagnosing API bundler errors. A stale install can leave Clerk shared-runtime links missing or mismatched even when the lockfile resolves correctly.

**Why:** The API server failed to bundle after a frontend Clerk package change because the workspace install tree no longer exposed the shared runtime paths required by `@clerk/express`. A forced pnpm reinstall restored the links without changing application code.

**How to apply:** After adding, removing, or upgrading Clerk packages, run a clean workspace install, then rebuild the API server before investigating route or middleware code.