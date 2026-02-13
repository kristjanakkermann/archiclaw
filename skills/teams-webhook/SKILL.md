# Teams Outgoing Webhook

Connect ArchiClaw to Microsoft Teams via an outgoing webhook for instant architecture queries.

## Prerequisites

- ArchiClaw Cloudflare Worker deployed (see `skills/cloudflare-deploy/SKILL.md`)
- Microsoft Teams admin access (or permission to create outgoing webhooks in a channel)
- Worker URL: `https://<worker-domain>/api/teams/webhook`

## Setup

### 1. Create the Outgoing Webhook in Teams

1. Open Microsoft Teams and navigate to the channel where ArchiClaw should respond
2. Click the three dots (**...**) next to the channel name > **Manage channel**
3. Select **Connectors** (or **Apps** depending on Teams version)
4. Click **Create** under **Outgoing Webhook**
5. Fill in:
   - **Name**: `ArchiClaw`
   - **Callback URL**: `https://<your-worker-domain>/api/teams/webhook`
   - **Description**: Enterprise architecture advisor
6. Click **Create**
7. **Copy the HMAC security token** shown — you will need it in the next step

### 2. Set the HMAC Secret on Cloudflare

```bash
cd workers/archiclaw-agent

# Production
npx wrangler secret put TEAMS_WEBHOOK_SECRET
# Paste the HMAC token from step 1 when prompted

# Staging
npx wrangler secret put TEAMS_WEBHOOK_SECRET --env staging
```

### 3. Test the Connection

In the Teams channel, @mention the webhook:

```
@ArchiClaw help
```

You should see an Adaptive Card listing available commands.

## Supported Queries

| Command                            | Description                   | Example                                                      |
| ---------------------------------- | ----------------------------- | ------------------------------------------------------------ |
| `help`                             | Show available commands       | `@ArchiClaw help`                                            |
| `apps in <DOMAIN>`                 | List applications in a domain | `@ArchiClaw apps in FIN`                                     |
| `passport <APP-ID>`                | Full application passport     | `@ArchiClaw passport FIN-APP-001`                            |
| `integrations for <APP-ID>`        | Show integrations for an app  | `@ArchiClaw integrations for FIN-APP-001`                    |
| `integrations between <A> and <B>` | Integrations between two apps | `@ArchiClaw integrations between FIN-APP-001 and HR-APP-001` |
| `data entities in <DOMAIN>`        | Data entities by domain       | `@ArchiClaw data entities in FIN`                            |
| `entities for <APP-ID>`            | Data entities for an app      | `@ArchiClaw entities for FIN-APP-001`                        |
| `capabilities in <DOMAIN>`         | Business capabilities         | `@ArchiClaw capabilities in SALES`                           |
| `domains` / `summary`              | Landscape overview            | `@ArchiClaw domains`                                         |
| `validate`                         | Check landscape health        | `@ArchiClaw validate`                                        |
| `<APP-ID>`                         | Quick passport lookup         | `@ArchiClaw FIN-APP-001`                                     |
| `<any text>`                       | Full-text search              | `@ArchiClaw SAP`                                             |

## Limitations

- **Channel-only**: Outgoing webhooks only work in channels, not 1:1 or group chats
- **Read-only**: Query-only MVP — no landscape modifications
- **No Mermaid diagrams**: Teams Adaptive Cards do not render Mermaid; use the web UI for diagrams
- **5-second timeout**: Teams requires webhook responses within 5 seconds; all queries use in-memory data lookups so this is not an issue
- **No conversation context**: Each query is stateless; the webhook does not remember previous questions

## Troubleshooting

### 401 Unauthorized

- Verify the HMAC secret matches what Teams generated
- Re-run `npx wrangler secret put TEAMS_WEBHOOK_SECRET` with the correct value

### No response in Teams

- Check the worker is deployed: `curl https://<worker-domain>/health`
- Check worker logs: `npx wrangler tail`

### Webhook not triggering

- Outgoing webhooks require an @mention — type `@ArchiClaw` before your query
- The webhook must be created in the specific channel where you are messaging

## Phase 2 (Future)

- LLM fallback for complex natural-language queries
- Incoming webhook for async responses (removes 5s timeout constraint)
- Azure Bot registration for 1:1 chats and proactive messaging
- Interactive ADR workflows via Adaptive Card forms
