/**
 * Landscape data accessor. Imports the pre-bundled JSON (generated at build time
 * by scripts/bundle-landscape.ts) and exports typed accessors for use in tools.
 */

import landscapeData from "./landscape-data.json";

export interface LandscapeStats {
  applications: number;
  domains: number;
  capabilities: number;
  integrations: number;
  dataEntities: number;
}

export interface ValidationResult {
  valid: boolean;
  issues: Array<{ file: string; message: string; severity: "error" | "warning" }>;
}

export interface ApplicationPassport {
  id: string;
  name: string;
  domain: string;
  status: string;
  togaf_layer: string;
  owners: { business: string; technical: string };
  technology: { stack: string[]; hosting: string; data_classification: string };
  integrations: Array<{ target: string; type: string; direction: string; protocol: string }>;
  compliance: string[];
  sla: { availability: string; rpo: string; rto: string };
  created: string;
  updated: string;
}

export interface DomainDefinition {
  id: string;
  name: string;
  description: string;
  lead: string;
  capabilities: string[];
  applications: string[];
}

export interface Capability {
  id: string;
  name: string;
  domain: string;
  description: string;
  parent?: string;
  level: number;
  children: string[];
}

export interface IntegrationEntry {
  source: string;
  target: string;
  type: string;
  direction: string;
  protocol: string;
  description: string;
}

export interface DataEntity {
  id: string;
  name: string;
  domain: string;
  description: string;
  applications: Record<string, { operations: string[]; role: string }>;
}

// Double assertion needed because JSON import infers literal key types
// for data entity application maps, which don't match Record<string, ...>
export const landscape = landscapeData as unknown as {
  domains: DomainDefinition[];
  applications: Record<string, ApplicationPassport>;
  applicationList: Array<{ id: string; name: string; domain: string }>;
  capabilities: Capability[];
  integrations: IntegrationEntry[];
  dataEntities: DataEntity[];
  stats: LandscapeStats;
  validationResult: ValidationResult;
};

export function getLandscapeSummary(): { stats: LandscapeStats } {
  return { stats: landscape.stats };
}

export function getApplication(id: string): ApplicationPassport | undefined {
  return landscape.applications[id];
}

export function getApplicationsByDomain(domainId: string): ApplicationPassport[] {
  return Object.values(landscape.applications).filter(
    (app) => app.domain === domainId.toUpperCase(),
  );
}

export function getDomain(id: string): DomainDefinition | undefined {
  return landscape.domains.find((d) => d.id === id.toUpperCase());
}

export function getIntegrationsForApp(appId: string): IntegrationEntry[] {
  return landscape.integrations.filter((i) => i.source === appId || i.target === appId);
}

export function getIntegrationsBetween(appA: string, appB: string): IntegrationEntry[] {
  return landscape.integrations.filter(
    (i) => (i.source === appA && i.target === appB) || (i.source === appB && i.target === appA),
  );
}

export function getDataEntitiesByDomain(domainId: string): DataEntity[] {
  return landscape.dataEntities.filter((e) => e.domain === domainId.toUpperCase());
}

export function getDataEntitiesForApp(appId: string): DataEntity[] {
  return landscape.dataEntities.filter((e) => appId in e.applications);
}

export function getCapabilitiesByDomain(domainId: string): Capability[] {
  return landscape.capabilities.filter((c) => c.domain === domainId.toUpperCase());
}

/** Full-text search across all entity types (case-insensitive). */
export function searchLandscape(query: string): {
  applications: ApplicationPassport[];
  domains: DomainDefinition[];
  capabilities: Capability[];
  dataEntities: DataEntity[];
  integrations: IntegrationEntry[];
} {
  const q = query.toLowerCase();

  return {
    applications: Object.values(landscape.applications).filter(
      (app) =>
        app.id.toLowerCase().includes(q) ||
        app.name.toLowerCase().includes(q) ||
        app.domain.toLowerCase().includes(q) ||
        app.technology.stack.some((s) => s.toLowerCase().includes(q)),
    ),
    domains: landscape.domains.filter(
      (d) =>
        d.id.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q),
    ),
    capabilities: landscape.capabilities.filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    ),
    dataEntities: landscape.dataEntities.filter(
      (e) =>
        e.id.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q),
    ),
    integrations: landscape.integrations.filter(
      (i) =>
        i.source.toLowerCase().includes(q) ||
        i.target.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.protocol.toLowerCase().includes(q),
    ),
  };
}
