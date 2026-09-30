# JIZURA v1.x work instructions

Read [docs/v1x/README.md](docs/v1x/README.md) and the assigned task memo before changing code. This repository is being migrated from `codex/webmcp` at `d217fb0a06d0f81bc31f8b31b9646c30dc540f82`. The task memos define scope and acceptance criteria; they are plans, not evidence that a check has passed.

## Branches and handoff

- Use `codex/v1x-integration` as the integration base. Create a separate `codex/` task branch or worktree for each implementation task and merge reviewed work back into the integration branch. Keep unrelated changes out of a task.
- Only the final cutover task creates the orphan branch `v1.x`. Do not merge `main` or `codex/webmcp` into `v1.x`; its root commit must have no parent. Keep `main` available for historical reference.
- Report changed files, checks actually run, remaining compatibility gaps, and the next dependent task in each task handoff. If a check needs an actual After Effects installation, say so explicitly; a mock test is not equivalent.

## Compatibility contract

- Preserve the behavior and UI of `codex/webmcp`, including the seven browser languages and existing locale URLs, project JSON and AE plan formats, deterministic seeds, effect IDs and ordering, browser export options, and the browser-only WebMCP interface. Use [task 01](docs/v1x/01-baseline-contract.md) to establish precise fixtures before implementation.
- Keep the After Effects ScriptUI and CEP distributions in Japanese and English. The AE host code must remain valid ExtendScript ES3. The CEP panel must work with its supported AE/CEP runtime and its local extension files; verify browser and CEP bundles separately.
- Keep effect definitions modular and explicitly registered. An effect's stable ID, group, metadata, and AE implementation or fallback must be testable. Do not silently rename IDs or change the saved-plan schema.
- Prefer TypeScript and Vite for browser and CEP source/build orchestration. Keep an alternative CEP output path only if the compatibility spike documents why it is necessary.

## Build and distribution

- Build outputs belong in ignored directories such as `dist/`. Do not add or update generated HTML, JSX bundles, ZIP files, sourcemaps, or downloaded dependencies in migration commits. The starting integration branch inherits tracked generated files; remove those from the final `v1.x` source snapshot. Small intentional test fixtures are source material, not release assets.
- The final Pages workflow runs on pushes to `v1.x`, builds the site in Actions, and deploys it directly with GitHub Pages Actions. There is no `docs` publishing branch. Release assets are built in Actions from version tags on `v1.x` and uploaded to GitHub Releases.
- Do not change the repository default branch or publish a release during an implementation task. Those operations belong to [task 13](docs/v1x/13-cutover.md) after the verification gates pass.

## Verification

- Run the focused checks relevant to the files changed, then the integration checks named in the assigned task. Preserve their output or a concise result in the handoff.
- Treat source comparison, syntax checks, browser automation, AE mocks, CEP mocks, and actual AE runs as distinct evidence. Record unsupported or unavailable environments rather than assuming compatibility.
- Update the appropriate task memo if a validated design decision changes the dependency graph or acceptance criteria, and explain the reason in the handoff.
