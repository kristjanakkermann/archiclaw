#!/usr/bin/env bun
/**
 * Bundle landscape YAML files into a single JSON file for the Cloudflare Worker.
 * Reads from landscape/, validates with Zod schemas, outputs to
 * workers/archiclaw-agent/src/landscape-data.json.
 *
 * Usage: bun scripts/bundle-landscape.ts
 */

import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { parse } from "yaml";
import type {
  ApplicationPassport,
  Capability,
  DataEntity,
  DomainDefinition,
  IntegrationEntry,
  IntegrationRegistry,
} from "../src/archiclaw/model/index.js";
import {
  ApplicationPassportSchema,
  ApplicationRegistrySchema,
  CapabilityRegistrySchema,
  DataEntitySchema,
  DataEntityRegistrySchema,
  DomainDefinitionSchema,
  DomainRegistrySchema,
  IntegrationRegistrySchema,
} from "../src/archiclaw/model/index.js";

const ROOT = join(import.meta.dirname!, "..");
const LANDSCAPE = join(ROOT, "landscape");
const OUTPUT = join(ROOT, "workers", "archiclaw-agent", "src", "landscape-data.json");

if (!existsSync(LANDSCAPE)) {
  console.error(`Error: landscape directory not found at ${LANDSCAPE}`);
  console.error("Run from the repository root or ensure landscape/ exists.");
  process.exit(1);
}

interface BundleIssue {
  file: string;
  message: string;
  severity: "error" | "warning";
}

function readYaml(filePath: string): unknown {
  return parse(readFileSync(filePath, "utf-8"));
}

function listDirs(dirPath: string): string[] {
  if (!existsSync(dirPath)) return [];
  return readdirSync(dirPath, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function listFiles(dirPath: string, suffix: string): string[] {
  if (!existsSync(dirPath)) return [];
  return readdirSync(dirPath, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(suffix))
    .map((d) => d.name);
}

const issues: BundleIssue[] = [];

// --- Domains ---
const domains: DomainDefinition[] = [];
const domainRegPath = join(LANDSCAPE, "model", "domains", "_index.yaml");
if (existsSync(domainRegPath)) {
  DomainRegistrySchema.parse(readYaml(domainRegPath));
}
for (const domainDir of listDirs(join(LANDSCAPE, "model", "domains"))) {
  const defPath = join(LANDSCAPE, "model", "domains", domainDir, "domain.yaml");
  if (!existsSync(defPath)) continue;
  try {
    const data = DomainDefinitionSchema.parse(readYaml(defPath));
    domains.push(data);
  } catch (err) {
    issues.push({
      file: `model/domains/${domainDir}/domain.yaml`,
      message: `Schema error: ${err instanceof Error ? err.message : String(err)}`,
      severity: "error",
    });
  }
}

// --- Applications ---
const applications: Record<string, ApplicationPassport> = {};
const applicationList: Array<{ id: string; name: string; domain: string }> = [];
const appRegPath = join(LANDSCAPE, "model", "applications", "_index.yaml");
if (existsSync(appRegPath)) {
  const reg = ApplicationRegistrySchema.parse(readYaml(appRegPath));
  for (const entry of reg.applications) {
    applicationList.push({ id: entry.id, name: entry.name, domain: entry.domain });
  }
}
for (const appDir of listDirs(join(LANDSCAPE, "model", "applications"))) {
  const passportPath = join(LANDSCAPE, "model", "applications", appDir, "passport.yaml");
  if (!existsSync(passportPath)) continue;
  try {
    const data = ApplicationPassportSchema.parse(readYaml(passportPath));
    applications[data.id] = data;
  } catch (err) {
    issues.push({
      file: `model/applications/${appDir}/passport.yaml`,
      message: `Schema error: ${err instanceof Error ? err.message : String(err)}`,
      severity: "error",
    });
  }
}

// --- Capabilities ---
const capabilities: Capability[] = [];
const capRegPath = join(LANDSCAPE, "model", "capabilities", "_index.yaml");
if (existsSync(capRegPath)) {
  const reg = CapabilityRegistrySchema.parse(readYaml(capRegPath));
  capabilities.push(...reg.capabilities);
}

// --- Integrations ---
let integrations: IntegrationEntry[] = [];
const intRegPath = join(LANDSCAPE, "model", "integrations", "_index.yaml");
if (existsSync(intRegPath)) {
  const reg = IntegrationRegistrySchema.parse(readYaml(intRegPath)) as IntegrationRegistry;
  integrations = reg.integrations;
}

// --- Data Entities ---
const dataEntities: DataEntity[] = [];
const entityRegPath = join(LANDSCAPE, "model", "data-entities", "_index.yaml");
if (existsSync(entityRegPath)) {
  DataEntityRegistrySchema.parse(readYaml(entityRegPath));
}
const entityFiles = listFiles(join(LANDSCAPE, "model", "data-entities"), ".yaml").filter(
  (f) => f !== "_index.yaml",
);
for (const entityFile of entityFiles) {
  const fullPath = join(LANDSCAPE, "model", "data-entities", entityFile);
  try {
    const data = DataEntitySchema.parse(readYaml(fullPath));
    dataEntities.push(data);
  } catch (err) {
    issues.push({
      file: `model/data-entities/${entityFile}`,
      message: `Schema error: ${err instanceof Error ? err.message : String(err)}`,
      severity: "error",
    });
  }
}

// --- Build output ---
const stats = {
  applications: Object.keys(applications).length,
  domains: domains.length,
  capabilities: capabilities.length,
  integrations: integrations.length,
  dataEntities: dataEntities.length,
};

const hasErrors = issues.some((i) => i.severity === "error");

const bundle = {
  domains,
  applications,
  applicationList,
  capabilities,
  integrations,
  dataEntities,
  stats,
  validationResult: {
    valid: !hasErrors,
    issues,
  },
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(bundle, null, 2), "utf-8");

console.log(`Landscape bundled to ${OUTPUT}`);
console.log(`  Domains: ${stats.domains}`);
console.log(`  Applications: ${stats.applications}`);
console.log(`  Capabilities: ${stats.capabilities}`);
console.log(`  Integrations: ${stats.integrations}`);
console.log(`  Data Entities: ${stats.dataEntities}`);

if (issues.length > 0) {
  console.log(`\n  Issues: ${issues.length}`);
  for (const issue of issues) {
    console.log(`    [${issue.severity}] ${issue.file}: ${issue.message}`);
  }
}

if (hasErrors) {
  console.error("\nBundle completed with validation errors.");
  process.exit(1);
}
