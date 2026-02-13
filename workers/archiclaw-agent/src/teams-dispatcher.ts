/**
 * Teams query dispatcher — pattern-matches user text to landscape accessors.
 * No LLM; direct in-memory lookups for sub-second responses.
 */

import type {
  ApplicationPassport,
  Capability,
  DataEntity,
  IntegrationEntry,
  ValidationResult,
} from "./landscape-loader.js";
import {
  getApplication,
  getApplicationsByDomain,
  getCapabilitiesByDomain,
  getDataEntitiesByDomain,
  getDataEntitiesForApp,
  getDomain,
  getIntegrationsBetween,
  getIntegrationsForApp,
  getLandscapeSummary,
  landscape,
  searchLandscape,
} from "./landscape-loader.js";

export type DispatchResult =
  | { type: "help" }
  | { type: "app-list"; domain: string; apps: ApplicationPassport[] }
  | { type: "passport"; app: ApplicationPassport }
  | { type: "integrations"; label: string; integrations: IntegrationEntry[] }
  | { type: "data-entities"; label: string; entities: DataEntity[] }
  | { type: "capabilities"; domain: string; capabilities: Capability[] }
  | { type: "summary"; stats: Record<string, number>; domains: typeof landscape.domains }
  | { type: "validation"; result: ValidationResult }
  | {
      type: "search";
      query: string;
      results: ReturnType<typeof searchLandscape>;
    }
  | { type: "not-found"; message: string };

/** Strip HTML tags that Teams wraps around message text. */
export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

/** Strip Teams @mention tags: <at>BotName</at> */
export function stripMentionTags(text: string): string {
  return text.replace(/<at[^>]*>.*?<\/at>/gi, "").trim();
}

/** Clean raw Teams input: strip mentions, HTML, and normalize whitespace. */
export function cleanInput(raw: string): string {
  let text = stripMentionTags(raw);
  text = stripHtml(text);
  return text.replace(/\s+/g, " ").trim();
}

// App ID pattern: 2+ uppercase letters, dash, "APP", dash, digits (e.g. FIN-APP-001)
const APP_ID_RE = /\b([A-Z]{2,}-APP-\d+)\b/i;

export function dispatch(rawText: string): DispatchResult {
  const text = cleanInput(rawText);
  const lower = text.toLowerCase();

  // help
  if (/^\s*help\s*$/i.test(text)) {
    return { type: "help" };
  }

  // apps/applications in/for <DOMAIN>
  const appsMatch = lower.match(/^(?:apps?|applications?)\s+(?:in|for)\s+(\S+)/);
  if (appsMatch) {
    const domainId = appsMatch[1]!.toUpperCase();
    const apps = getApplicationsByDomain(domainId);
    if (apps.length === 0) {
      return { type: "not-found", message: `No applications found in domain '${domainId}'.` };
    }
    return { type: "app-list", domain: domainId, apps };
  }

  // passport/details <APP-ID>
  const passportMatch = lower.match(/^(?:passport|details)\s+(.+)/);
  if (passportMatch) {
    const id = passportMatch[1]!.trim().toUpperCase();
    const app = getApplication(id);
    if (!app) {
      return { type: "not-found", message: `Application '${id}' not found.` };
    }
    return { type: "passport", app };
  }

  // integrations between <A> and <B>
  const intBetweenMatch = lower.match(/^integrations?\s+between\s+(\S+)\s+and\s+(\S+)/);
  if (intBetweenMatch) {
    const a = intBetweenMatch[1]!.toUpperCase();
    const b = intBetweenMatch[2]!.toUpperCase();
    const integrations = getIntegrationsBetween(a, b);
    if (integrations.length === 0) {
      return { type: "not-found", message: `No integrations found between '${a}' and '${b}'.` };
    }
    return { type: "integrations", label: `${a} ↔ ${b}`, integrations };
  }

  // integrations for <APP-ID>
  const intForMatch = lower.match(/^integrations?\s+(?:for|of)\s+(\S+)/);
  if (intForMatch) {
    const id = intForMatch[1]!.toUpperCase();
    const integrations = getIntegrationsForApp(id);
    if (integrations.length === 0) {
      return { type: "not-found", message: `No integrations found for '${id}'.` };
    }
    return { type: "integrations", label: id, integrations };
  }

  // data entities in/for <DOMAIN> or data entities for <APP-ID>
  const dataMatch = lower.match(/^(?:data\s+)?entit(?:y|ies)\s+(?:in|for)\s+(\S+)/);
  if (dataMatch) {
    const id = dataMatch[1]!.toUpperCase();
    // If it looks like an app ID, query by app
    if (APP_ID_RE.test(id)) {
      const entities = getDataEntitiesForApp(id);
      if (entities.length === 0) {
        return { type: "not-found", message: `No data entities found for application '${id}'.` };
      }
      return { type: "data-entities", label: id, entities };
    }
    const entities = getDataEntitiesByDomain(id);
    if (entities.length === 0) {
      return { type: "not-found", message: `No data entities found in domain '${id}'.` };
    }
    return { type: "data-entities", label: id, entities };
  }

  // capabilities in/for <DOMAIN>
  const capsMatch = lower.match(/^capabilit(?:y|ies)\s+(?:in|for)\s+(\S+)/);
  if (capsMatch) {
    const domainId = capsMatch[1]!.toUpperCase();
    const capabilities = getCapabilitiesByDomain(domainId);
    if (capabilities.length === 0) {
      return { type: "not-found", message: `No capabilities found in domain '${domainId}'.` };
    }
    return { type: "capabilities", domain: domainId, capabilities };
  }

  // domains / landscape / summary / stats
  if (/^(?:domains?|landscape|summary|stats|overview)\s*$/i.test(text)) {
    const { stats } = getLandscapeSummary();
    return { type: "summary", stats, domains: landscape.domains };
  }

  // validate / check / health
  if (/^(?:validate|check|health)\s*$/i.test(text)) {
    return { type: "validation", result: landscape.validationResult };
  }

  // Raw app ID like FIN-APP-001
  const rawIdMatch = text.match(APP_ID_RE);
  if (rawIdMatch && text.trim().toUpperCase() === rawIdMatch[1]!.toUpperCase()) {
    const id = rawIdMatch[1]!.toUpperCase();
    const app = getApplication(id);
    if (!app) {
      return { type: "not-found", message: `Application '${id}' not found.` };
    }
    return { type: "passport", app };
  }

  // Fallback: full-text search
  const results = searchLandscape(text);
  const total =
    results.applications.length +
    results.domains.length +
    results.capabilities.length +
    results.dataEntities.length +
    results.integrations.length;

  if (total === 0) {
    return {
      type: "not-found",
      message: `No results found for '${text}'. Type "help" for available commands.`,
    };
  }

  return { type: "search", query: text, results };
}
