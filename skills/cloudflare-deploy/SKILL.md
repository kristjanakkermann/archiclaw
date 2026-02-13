# Cloudflare Worker Deployment

Deploy and manage the ArchiClaw agent on Cloudflare Workers (Agents SDK).

## Prerequisites

- Cloudflare account with Workers Paid plan
- `wrangler` CLI (bundled as devDependency)
- OpenAI API key for LLM calls
- Node.js 22+ and pnpm

## Local Development

```bash
cd workers/archiclaw-agent
cp .dev.vars.example .dev.vars
# Edit .dev.vars and add your OPENAI_API_KEY

pnpm install
pnpm dev
# Open http://localhost:8787
```

The `prebuild` script automatically bundles landscape YAML into JSON before each build.

## Secret Management

Runtime secrets are stored in Cloudflare (not in code or GitHub):

```bash
# Production
npx wrangler secret put OPENAI_API_KEY

# Staging
npx wrangler secret put OPENAI_API_KEY --env staging
```

## Deployment

### Production

```bash
cd workers/archiclaw-agent
bun ../../scripts/bundle-landscape.ts   # bundle landscape data
pnpm deploy                             # deploy to production
```

### Staging

```bash
pnpm deploy:staging
```

## Landscape Data Updates

When landscape YAML files change, re-bundle and redeploy:

```bash
bun scripts/bundle-landscape.ts
cd workers/archiclaw-agent && pnpm deploy
```

The CI pipeline handles this automatically on push to main.

## Custom Domain Setup

1. Go to Cloudflare Dashboard > Workers & Pages > archiclaw-agent > Settings > Domains
2. Add custom domain (e.g. `agent.archiclaw.dev`)
3. Cloudflare auto-provisions TLS

## Monitoring

```bash
# Live tail of worker logs
npx wrangler tail

# Staging logs
npx wrangler tail --env staging
```

Dashboard: Cloudflare Dashboard > Workers & Pages > archiclaw-agent > Metrics

## Rollback

```bash
npx wrangler rollback
```

## Health Check

```bash
curl https://archiclaw-agent.<account>.workers.dev/health
```

Returns landscape stats, model, and environment info.
