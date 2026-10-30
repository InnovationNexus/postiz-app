# InnovationNexus fork of postiz-app

Default branch `innexus/main` = upstream tag **v2.25.3** plus the patches below.
Image: `ghcr.io/innovationnexus/postiz-app:<commit sha>`, built by
`.github/workflows/innexus-ci.yml` on every merge to `innexus/main`.
Deployed by `InnovationNexus/infra`, `apps/postiz/postiz.yaml`.

Upstream workflows were removed on this branch: they publish to gitroomhq's
registry and run schedules this fork does not need.

## Patches (all LinkedIn, all in `libraries/nestjs-libraries/src/integrations/social/`)

| File | Change | Why |
|---|---|---|
| `linkedin.innexus.ts` (+ `.spec.ts`) | New, import-free helpers and their tests | Keeps the patch logic testable without the Nest/Prisma toolchain |
| `linkedin.page.provider.ts` | Reads `LINKEDIN_PAGE_CLIENT_ID` / `LINKEDIN_PAGE_CLIENT_SECRET`, falling back to the shared pair only when both are unset | LinkedIn's Community Management API must be the only product on its app, so the Page channel needs a different app from the personal channel |
| `linkedin.page.provider.ts` | Drops the `profile` scope; display name falls back to `/v2/me` | `profile` is not grantable on a Community Management app |
| `linkedin.provider.ts` | Requests only `openid profile w_member_social` | Upstream asks the personal app for organization scopes it can never hold (gitroomhq/postiz-app#1582) |
| both | `prompt=consent` instead of `prompt=none` | Silent auth fails on a first connect (gitroomhq/postiz-app#1580) |

These replace the boot-time `sed` patch that `apps/postiz/postiz.yaml` used to
run against the compiled JS.

## Rebasing onto a new upstream release

1. `git fetch upstream --tags`, branch from the new tag.
2. Re-run `_scratch/fork_src/apply_patch.py` (kept in the Postiz project
   folder, `C:\Projects\Projects\Postiz\_scratch\fork_src\`) or cherry-pick the
   patch commit; the script asserts every match count, so upstream drift fails
   loudly instead of silently.
3. Bump `UPSTREAM_TAG` in the workflow, open a PR, merge on green, then bump the
   image SHA in infra.
