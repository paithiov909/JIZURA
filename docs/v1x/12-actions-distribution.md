# 12 — GitHub Actions distribution

**Depends on:** task 11's verified commands. Do not publish from the integration branch.

## Work

Add CI for task PRs and `codex/v1x-integration` using the pinned dependency graph and task 11's required checks. Add a Pages workflow triggered by pushes to `v1.x`: checkout, build the seven-language site, upload a Pages artifact and deploy it directly. Configure the workflow to use Pages Source **GitHub Actions**, not branch publishing. No `docs` branch and no generated-site commit are part of the design.

Add a release workflow for `v1.*` tags from `v1.x`: build and validate Japanese/English AE scripts, Japanese/English CEP ZIPs, offline browser package and checksums; upload those files to a GitHub Release. Give the Pages and release jobs only the permissions they require. Prevent a tag from an unrelated branch from publishing a v1.x release. Document the tag and Pages settings procedure.

## Deliverable and acceptance

- Workflow configuration is linted/reviewed and the build/packaging steps run successfully on the integration branch without deployment.
- The Pages workflow contains a `v1.x` push filter and direct artifact deployment; the release workflow contains tag and ancestry gates.
- The expected release filenames, checksums, license notices and Pages routes are documented for post-publish inspection.

**Handoff to:** task 13.
