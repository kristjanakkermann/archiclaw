---
name: landscape-query
description: "Search and query the enterprise architecture landscape. Answer natural language questions about applications, integrations, data entities, capabilities, and change history."
metadata: { "openclaw": { "emoji": "🏛️" } }
---

# Landscape Query

Search and query the enterprise architecture landscape to answer questions about the organization's technology portfolio.

## Query Types

### Application Queries

- "Which applications are in the FIN domain?"
  → Read `landscape/model/domains/FIN/domain.yaml` → list `applications`
- "What technology stack does SAP ERP use?"
  → Find the app by name in `_index.yaml`, read its `passport.yaml` → `technology.stack`
- "Which applications are being retired?"
  → Scan all `passport.yaml` files for `status: retire`
- "Show me all cloud-hosted applications"
  → Scan passports for `technology.hosting: cloud`

### Integration Queries

- "What does SAP ERP integrate with?"
  → Read `landscape/model/applications/FIN-APP-001/passport.yaml` → `integrations`
- "Show all API integrations"
  → Read `landscape/model/integrations/_index.yaml`, filter by `type: api`
- "Which systems send data to Workday?"
  → Search integrations where `target` matches Workday's ID and `direction` is inbound/bidirectional

### Data Entity Queries

- "Which applications use the Customer entity?"
  → Read `landscape/model/data-entities/CORE-ENT-001.yaml` → `applications`
- "Where is the master for Employee data?"
  → Search entity files for the Employee entity, find the app with `role: master`
- "Show the CRUD matrix for SAP ERP"
  → Read `landscape/model/applications/FIN-APP-001/data-matrix.yaml`

### Capability Queries

- "What capabilities does the FIN domain have?"
  → Read `landscape/model/capabilities/_index.yaml`, filter by domain
- "Which applications support Financial Reporting?"
  → Find the capability, cross-reference with application passports

### Change History Queries

- "What changes have been made to the FIN domain?"
  → Scan `landscape/changes/FIN-ACR-*/change.yaml`
- "Show me all approved changes in 2025"
  → Scan all change.yaml files, filter `status: approved` and `created` year
- "What did the EAC decide about cloud migration?"
  → Search change requests and decisions related to cloud/migration

### Decision Queries

- "List all architecture decisions"
  → Read `landscape/decisions/_index.yaml`
- "What was decided about the CRM replacement?"
  → Search ADR files in change request folders

## Search Strategy

1. **Exact ID lookup**: If the query contains an ID (e.g., FIN-APP-001), go directly to that file
2. **Name search**: Search `_index.yaml` registries for name matches
3. **Full-text search**: Grep across YAML and Markdown files in the landscape
4. **Cross-reference**: Follow ID references between entities (app → integrations → entities)

## Response Format

Always structure responses with:

1. **Direct answer** to the question
2. **Source references** (file paths where the data came from)
3. **Related information** that might be useful (e.g., when asking about an app, mention its domain and key integrations)

## File Locations

- Applications: `landscape/model/applications/`
- Domains: `landscape/model/domains/`
- Capabilities: `landscape/model/capabilities/_index.yaml`
- Data entities: `landscape/model/data-entities/`
- Integrations: `landscape/model/integrations/_index.yaml`
- Change requests: `landscape/changes/`
- Decisions: `landscape/decisions/_index.yaml`

## Guardrails

- Only return information that exists in the landscape files; never fabricate data
- When data is not found, clearly state it is missing rather than guessing
- Provide file paths so the EA can verify the source
- If a query is ambiguous, ask for clarification rather than guessing
