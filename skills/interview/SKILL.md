---
name: interview
description: "Conduct a structured deep interview with a PM or stakeholder to gather architecture change request information. Probes assumptions, asks 'why' repeatedly, and references existing landscape data."
metadata: { "openclaw": { "emoji": "🏛️" } }
---

# PM Deep Interview

Conduct a structured architecture change request interview with a PM or stakeholder. The goal is to extract all information needed to create a complete change request with impact assessment.

## Interview Flow

### Phase 1: Context Gathering

1. Ask the PM to describe the change in their own words
2. Identify the primary application affected - search the landscape:
   ```
   Look up the application in landscape/model/applications/ to find its passport
   ```
3. Ask about the business driver behind the change

### Phase 2: Deep Probing

Challenge assumptions and dig deeper:

- **Ask "why" at least 3 times** to get to the root motivation
- Reference existing landscape data: "I see this application currently integrates with X via Y - will that change?"
- Check for hidden dependencies: "Are there any batch jobs, scheduled reports, or manual processes that depend on this?"
- Probe data impact: "Which data entities will be affected? Will data ownership change?"

### Phase 3: Impact Scoping

Gather structured impact information:

- Which other applications are affected?
- What capabilities does this change touch?
- What is the expected cost level? (low/medium/high)
- What is the risk level? (low/medium/high)
- What data classification applies? (public/internal/confidential/restricted)
- Are there compliance implications? (GDPR, SOX, etc.)

### Phase 4: Validation

Before concluding:

- Summarize all gathered information back to the PM
- Confirm the list of affected applications and capabilities
- Verify the problem statement and objectives
- Get PM sign-off on the summary

## Output Artifacts

After the interview, generate these files in `landscape/changes/{ID}/`:

1. **change.yaml** - Structured change request metadata (validate against ChangeRequestSchema)
2. **interview.md** - Full interview notes with Q&A
3. **problem.md** - Concise problem statement extracted from the interview
4. **objective.md** - Clear objectives and success criteria

## Landscape References

During the interview, always reference existing landscape data:

- Read application passports from `landscape/model/applications/{ID}/passport.yaml`
- Check existing integrations in `landscape/model/integrations/_index.yaml`
- Review affected capabilities in `landscape/model/capabilities/_index.yaml`
- Look up data entities in `landscape/model/data-entities/`

## Diagram Generation

After the interview, generate architecture diagrams:

```bash
bun src/archiclaw/render/cli.ts current-vs-target --title "{CHANGE_TITLE}" --current current.yaml --target target.yaml --out landscape/changes/{ID}/diagrams/arch-change.svg
```

## Guardrails

- Never fabricate landscape data; always read from the actual files
- If an application is mentioned that doesn't exist in the landscape, flag it and ask about creating a passport
- Always validate generated YAML against the Zod schemas before writing
- Use `nextId()` from `src/archiclaw/model/ids.ts` to allocate new change request IDs
- Set initial status to `draft`
