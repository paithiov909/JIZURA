# 13 — Orphan `v1.x` cutover

**Depends on:** tasks 11 and 12, including required actual-AE evidence. This is the only task that publishes the new line.

## Work

Freeze and record the verified `codex/v1x-integration` SHA. From its working tree, create a new orphan `v1.x` root commit containing source, tests, documentation and workflows but no generated web pages, AE bundles, CEP ZIPs, caches or dependencies. Preserve license, third-party notices and contributor acknowledgements. Record the old baseline SHA for provenance. Confirm `git merge-base main v1.x` has no result and that a clean checkout builds every artifact.

Set Pages Source to GitHub Actions, then push `v1.x` and confirm its push workflow publishes the root and all six locale routes with expected metadata and functionality. Create a `v1.*` version tag on `v1.x`; confirm the Release assets and checksums install or open successfully. Only after those gates pass, change the repository default branch to `v1.x` and update repository links/instructions. Keep `main` intact for history. Report the actual URLs, SHAs and verification results.

## Deliverable and acceptance

- `v1.x` is an orphan branch with a root commit, no common ancestor with `main`, no tracked build products, and successful clean-checkout builds.
- The live Pages site and release assets are verified, including Japanese/English AE and CEP packages; actual-AE evidence is recorded.
- The default branch points to `v1.x` only after publication checks pass. No `docs` branch is created.

**Handoff:** migration complete; subsequent development begins from `v1.x`.
