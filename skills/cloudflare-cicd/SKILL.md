# Cloudflare CI/CD Pipeline

GitHub Actions pipeline for automated deployment of the ArchiClaw Cloudflare Worker.

## Pipeline Overview

File: `.github/workflows/deploy-cloudflare.yml`

Triggers:

- **Push to main** (paths: `workers/archiclaw-agent/**`, `src/archiclaw/**`, `landscape/**`) -- deploys to production
- **Pull requests** (same paths) -- validates and deploys to staging

## Pipeline Stages

1. **validate** -- type-check + tests
2. **deploy-production** -- bundle landscape, deploy to production, smoke test (main only)
3. **deploy-preview** -- deploy to staging environment (PRs only)

## Required GitHub Secrets

| Secret                  | Purpose                       |
| ----------------------- | ----------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Wrangler authentication       |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account identifier |

### Creating the Cloudflare API Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token" > "Custom token"
3. Token name: `archiclaw-worker-deploy`
4. Permissions:
   - Account > Workers Scripts > Edit
5. Account Resources: Include > your account
6. Optionally set a TTL (e.g. 1 year)
7. Copy token and add as `CLOUDFLARE_API_TOKEN` in GitHub repo secrets

### Adding GitHub Secrets

1. Go to GitHub repo > Settings > Secrets and variables > Actions
2. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`

## Branch Strategy

- **PRs**: validate + deploy to staging (`archiclaw-agent-staging`)
- **main**: validate + deploy to production (`archiclaw-agent`)

## Troubleshooting

### Common Failures

**"Authentication error"**

- Check that `CLOUDFLARE_API_TOKEN` is set and not expired
- Verify token has Workers Scripts Edit permission

**"Could not find wrangler.jsonc"**

- Ensure working directory is `workers/archiclaw-agent`

**"Landscape bundle missing"**

- The pipeline runs `bun scripts/bundle-landscape.ts` before deploy
- Check that landscape YAML files are valid

**"Type errors"**

- Run `pnpm typecheck` locally in the worker directory to reproduce

### Manual Deploy (bypassing CI)

```bash
cd workers/archiclaw-agent
bun ../../scripts/bundle-landscape.ts
CLOUDFLARE_API_TOKEN=<token> CLOUDFLARE_ACCOUNT_ID=<id> pnpm deploy
```
