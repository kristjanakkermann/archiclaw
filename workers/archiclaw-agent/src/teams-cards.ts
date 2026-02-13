/**
 * Adaptive Card builders for Teams webhook responses.
 * Uses Adaptive Card v1.5 (broadly supported across Teams clients).
 */

import type {
  ApplicationPassport,
  Capability,
  DataEntity,
  DomainDefinition,
  IntegrationEntry,
} from "./landscape-loader.js";

// -- Adaptive Card wrapper types -------------------------------------------

type AdaptiveCardBody = Record<string, unknown>;
type AdaptiveCardAction = Record<string, unknown>;

interface AdaptiveCard {
  type: "AdaptiveCard";
  version: "1.5";
  body: AdaptiveCardBody[];
  actions?: AdaptiveCardAction[];
}

export interface TeamsCardResponse {
  type: "message";
  attachments: Array<{
    contentType: "application/vnd.microsoft.card.adaptive";
    content: AdaptiveCard;
  }>;
}

export interface TeamsTextResponse {
  type: "message";
  text: string;
}

export type TeamsResponse = TeamsCardResponse | TeamsTextResponse;

// -- Helpers ---------------------------------------------------------------

function textBlock(
  text: string,
  opts?: { weight?: string; size?: string; wrap?: boolean; isSubtle?: boolean; spacing?: string },
): AdaptiveCardBody {
  return { type: "TextBlock", text, wrap: true, ...opts };
}

function factSet(facts: Array<{ title: string; value: string }>): AdaptiveCardBody {
  return { type: "FactSet", facts };
}

function card(body: AdaptiveCardBody[]): AdaptiveCard {
  return { type: "AdaptiveCard", version: "1.5", body };
}

function wrapCard(content: AdaptiveCard): TeamsCardResponse {
  return {
    type: "message",
    attachments: [{ contentType: "application/vnd.microsoft.card.adaptive", content }],
  };
}

function textResponse(text: string): TeamsTextResponse {
  return { type: "message", text };
}

// -- Card builders ---------------------------------------------------------

export function buildHelpCard(): TeamsCardResponse {
  return wrapCard(
    card([
      textBlock("ArchiClaw — Enterprise Architecture Advisor", {
        weight: "Bolder",
        size: "Medium",
      }),
      textBlock("Available commands:"),
      factSet([
        { title: "apps in <DOMAIN>", value: "List applications in a domain" },
        { title: "passport <APP-ID>", value: "Full application passport" },
        { title: "integrations for <APP-ID>", value: "Show integrations" },
        { title: "integrations between <A> and <B>", value: "Compare two apps" },
        { title: "data entities in <DOMAIN>", value: "Data entities by domain" },
        { title: "entities for <APP-ID>", value: "Data entities for an app" },
        { title: "capabilities in <DOMAIN>", value: "Business capabilities" },
        { title: "domains / summary", value: "Landscape overview" },
        { title: "validate", value: "Check landscape health" },
        { title: "<APP-ID>", value: "Quick passport lookup" },
        { title: "<any text>", value: "Full-text search" },
      ]),
      textBlock("Examples: `apps in FIN`, `passport FIN-APP-001`, `SAP`", { isSubtle: true }),
    ]),
  );
}

export function buildApplicationListCard(
  domain: string,
  apps: ApplicationPassport[],
): TeamsCardResponse {
  const body: AdaptiveCardBody[] = [
    textBlock(`Applications in ${domain}`, { weight: "Bolder", size: "Medium" }),
    textBlock(`${apps.length} application${apps.length === 1 ? "" : "s"} found`, {
      isSubtle: true,
    }),
  ];

  for (const app of apps) {
    body.push(
      factSet([
        { title: "ID", value: app.id },
        { title: "Name", value: app.name },
        { title: "Status", value: app.status },
        { title: "Hosting", value: app.technology.hosting },
        { title: "Stack", value: app.technology.stack.join(", ") },
      ]),
    );
  }

  return wrapCard(card(body));
}

export function buildPassportCard(app: ApplicationPassport): TeamsCardResponse {
  const body: AdaptiveCardBody[] = [
    textBlock(`${app.name} (${app.id})`, { weight: "Bolder", size: "Medium" }),
    textBlock("General", { weight: "Bolder", spacing: "Medium" }),
    factSet([
      { title: "Domain", value: app.domain },
      { title: "Status", value: app.status },
      { title: "TOGAF Layer", value: app.togaf_layer },
      { title: "Created", value: app.created },
      { title: "Updated", value: app.updated },
    ]),
    textBlock("Owners", { weight: "Bolder", spacing: "Medium" }),
    factSet([
      { title: "Business", value: app.owners.business },
      { title: "Technical", value: app.owners.technical },
    ]),
    textBlock("Technology", { weight: "Bolder", spacing: "Medium" }),
    factSet([
      { title: "Stack", value: app.technology.stack.join(", ") },
      { title: "Hosting", value: app.technology.hosting },
      { title: "Data Classification", value: app.technology.data_classification },
    ]),
    textBlock("SLA", { weight: "Bolder", spacing: "Medium" }),
    factSet([
      { title: "Availability", value: app.sla.availability },
      { title: "RPO", value: app.sla.rpo },
      { title: "RTO", value: app.sla.rto },
    ]),
  ];

  if (app.compliance.length > 0) {
    body.push(
      textBlock("Compliance", { weight: "Bolder", spacing: "Medium" }),
      textBlock(app.compliance.join(", ")),
    );
  }

  if (app.integrations.length > 0) {
    body.push(
      textBlock(`Integrations (${app.integrations.length})`, {
        weight: "Bolder",
        spacing: "Medium",
      }),
    );
    for (const int of app.integrations) {
      body.push(
        factSet([
          { title: "Target", value: int.target },
          { title: "Type", value: int.type },
          { title: "Direction", value: int.direction },
          { title: "Protocol", value: int.protocol },
        ]),
      );
    }
  }

  return wrapCard(card(body));
}

export function buildIntegrationListCard(
  label: string,
  integrations: IntegrationEntry[],
): TeamsCardResponse {
  const body: AdaptiveCardBody[] = [
    textBlock(`Integrations — ${label}`, { weight: "Bolder", size: "Medium" }),
    textBlock(`${integrations.length} integration${integrations.length === 1 ? "" : "s"}`, {
      isSubtle: true,
    }),
  ];

  for (const int of integrations) {
    body.push(
      factSet([
        { title: "Source", value: int.source },
        { title: "Target", value: int.target },
        { title: "Type", value: int.type },
        { title: "Direction", value: int.direction },
        { title: "Protocol", value: int.protocol },
        { title: "Description", value: int.description },
      ]),
    );
  }

  return wrapCard(card(body));
}

export function buildDataEntityListCard(label: string, entities: DataEntity[]): TeamsCardResponse {
  const body: AdaptiveCardBody[] = [
    textBlock(`Data Entities — ${label}`, { weight: "Bolder", size: "Medium" }),
    textBlock(`${entities.length} entit${entities.length === 1 ? "y" : "ies"}`, {
      isSubtle: true,
    }),
  ];

  for (const entity of entities) {
    const appRoles = Object.entries(entity.applications)
      .map(([appId, info]) => `${appId}: ${info.role} (${info.operations.join(", ")})`)
      .join("; ");

    body.push(
      factSet([
        { title: "ID", value: entity.id },
        { title: "Name", value: entity.name },
        { title: "Domain", value: entity.domain },
        { title: "Description", value: entity.description },
        { title: "Applications", value: appRoles || "None" },
      ]),
    );
  }

  return wrapCard(card(body));
}

export function buildCapabilityListCard(
  domain: string,
  capabilities: Capability[],
): TeamsCardResponse {
  const body: AdaptiveCardBody[] = [
    textBlock(`Capabilities in ${domain}`, { weight: "Bolder", size: "Medium" }),
    textBlock(`${capabilities.length} capabilit${capabilities.length === 1 ? "y" : "ies"}`, {
      isSubtle: true,
    }),
  ];

  for (const cap of capabilities) {
    body.push(
      factSet([
        { title: "ID", value: cap.id },
        { title: "Name", value: cap.name },
        { title: "Level", value: String(cap.level) },
        { title: "Description", value: cap.description },
      ]),
    );
  }

  return wrapCard(card(body));
}

export function buildLandscapeSummaryCard(
  stats: Record<string, number>,
  domains: DomainDefinition[],
): TeamsCardResponse {
  const body: AdaptiveCardBody[] = [
    textBlock("Landscape Overview", { weight: "Bolder", size: "Medium" }),
    factSet(
      Object.entries(stats).map(([key, value]) => ({
        title: key.charAt(0).toUpperCase() + key.slice(1),
        value: String(value),
      })),
    ),
    textBlock("Domains", { weight: "Bolder", spacing: "Medium" }),
  ];

  for (const domain of domains) {
    body.push(
      factSet([
        { title: "ID", value: domain.id },
        { title: "Name", value: domain.name },
        { title: "Lead", value: domain.lead },
        { title: "Applications", value: String(domain.applications.length) },
        { title: "Capabilities", value: String(domain.capabilities.length) },
      ]),
    );
  }

  return wrapCard(card(body));
}

export function buildValidationCard(result: {
  valid: boolean;
  issues: Array<{ file: string; message: string; severity: string }>;
}): TeamsTextResponse {
  if (result.valid) {
    return textResponse("Landscape validation passed — no issues found.");
  }

  const lines = result.issues.map(
    (issue) => `[${issue.severity.toUpperCase()}] ${issue.file}: ${issue.message}`,
  );
  return textResponse(
    `Landscape validation found ${result.issues.length} issue(s):\n${lines.join("\n")}`,
  );
}

const MAX_SEARCH_PER_TYPE = 10;

export function buildSearchResultsCard(
  query: string,
  results: {
    applications: Array<{ id: string; name: string; domain: string }>;
    domains: Array<{ id: string; name: string }>;
    capabilities: Array<{ id: string; name: string; domain: string }>;
    dataEntities: Array<{ id: string; name: string; domain: string }>;
    integrations: IntegrationEntry[];
  },
): TeamsCardResponse {
  const body: AdaptiveCardBody[] = [
    textBlock(`Search results for "${query}"`, { weight: "Bolder", size: "Medium" }),
  ];

  if (results.applications.length > 0) {
    body.push(
      textBlock(`Applications (${results.applications.length})`, {
        weight: "Bolder",
        spacing: "Medium",
      }),
    );
    for (const app of results.applications.slice(0, MAX_SEARCH_PER_TYPE)) {
      body.push(factSet([{ title: app.id, value: `${app.name} (${app.domain})` }]));
    }
    if (results.applications.length > MAX_SEARCH_PER_TYPE) {
      body.push(
        textBlock(`...and ${results.applications.length - MAX_SEARCH_PER_TYPE} more`, {
          isSubtle: true,
        }),
      );
    }
  }

  if (results.domains.length > 0) {
    body.push(
      textBlock(`Domains (${results.domains.length})`, { weight: "Bolder", spacing: "Medium" }),
    );
    for (const d of results.domains.slice(0, MAX_SEARCH_PER_TYPE)) {
      body.push(factSet([{ title: d.id, value: d.name }]));
    }
  }

  if (results.capabilities.length > 0) {
    body.push(
      textBlock(`Capabilities (${results.capabilities.length})`, {
        weight: "Bolder",
        spacing: "Medium",
      }),
    );
    for (const c of results.capabilities.slice(0, MAX_SEARCH_PER_TYPE)) {
      body.push(factSet([{ title: c.id, value: `${c.name} (${c.domain})` }]));
    }
  }

  if (results.dataEntities.length > 0) {
    body.push(
      textBlock(`Data Entities (${results.dataEntities.length})`, {
        weight: "Bolder",
        spacing: "Medium",
      }),
    );
    for (const e of results.dataEntities.slice(0, MAX_SEARCH_PER_TYPE)) {
      body.push(factSet([{ title: e.id, value: `${e.name} (${e.domain})` }]));
    }
  }

  if (results.integrations.length > 0) {
    body.push(
      textBlock(`Integrations (${results.integrations.length})`, {
        weight: "Bolder",
        spacing: "Medium",
      }),
    );
    for (const i of results.integrations.slice(0, MAX_SEARCH_PER_TYPE)) {
      body.push(factSet([{ title: `${i.source} → ${i.target}`, value: i.description }]));
    }
  }

  return wrapCard(card(body));
}

export function buildErrorCard(message: string): TeamsTextResponse {
  return textResponse(message);
}

export function buildNotFoundCard(message: string): TeamsTextResponse {
  return textResponse(message);
}
