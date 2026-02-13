import type { ZodType } from "zod";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { parse } from "yaml";
import {
  ApplicationPassportSchema,
  ApplicationRegistrySchema,
  CapabilityRegistrySchema,
  ChangeRequestSchema,
  DataEntityRegistrySchema,
  DataEntitySchema,
  DomainDefinitionSchema,
  DomainRegistrySchema,
  IntegrationRegistrySchema,
  IdSequencesSchema,
  parseId,
} from "../model/index.js";

export interface ValidationIssue {
  file: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  stats: {
    applications: number;
    domains: number;
    dataEntities: number;
    capabilities: number;
    changeRequests: number;
  };
}

function readYaml(filePath: string): unknown {
  return parse(readFileSync(filePath, "utf-8"));
}

function validateFile(filePath: string, schema: ZodType, issues: ValidationIssue[]): boolean {
  if (!existsSync(filePath)) {
    issues.push({ file: filePath, message: "File not found", severity: "error" });
    return false;
  }
  try {
    const data = readYaml(filePath);
    schema.parse(data);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    issues.push({
      file: filePath,
      message: `Schema validation failed: ${message}`,
      severity: "error",
    });
    return false;
  }
}

/** List subdirectories in a directory. */
function listDirs(dirPath: string): string[] {
  if (!existsSync(dirPath)) return [];
  return readdirSync(dirPath, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

/** List files matching a suffix in a directory (non-recursive). */
function listFiles(dirPath: string, suffix: string): string[] {
  if (!existsSync(dirPath)) return [];
  return readdirSync(dirPath, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(suffix))
    .map((d) => d.name);
}

/**
 * Validate the entire landscape directory for schema compliance and ID uniqueness.
 */
export function validateLandscape(landscapePath: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const allIds = new Set<string>();
  const stats = {
    applications: 0,
    domains: 0,
    dataEntities: 0,
    capabilities: 0,
    changeRequests: 0,
  };

  function checkIdUnique(id: string, file: string) {
    if (allIds.has(id)) {
      issues.push({ file, message: `Duplicate ID: ${id}`, severity: "error" });
    }
    allIds.add(id);
  }

  // Validate config
  const configPath = join(landscapePath, ".archiclaw", "config.yaml");
  if (!existsSync(configPath)) {
    issues.push({ file: configPath, message: "Landscape config not found", severity: "error" });
  }

  // Validate ID sequences
  const seqPath = join(landscapePath, ".archiclaw", "id-sequences.yaml");
  validateFile(seqPath, IdSequencesSchema, issues);

  // Validate domain registry
  const domainRegPath = join(landscapePath, "model", "domains", "_index.yaml");
  validateFile(domainRegPath, DomainRegistrySchema, issues);

  // Validate individual domain definitions
  const domainDirs = listDirs(join(landscapePath, "model", "domains"));
  for (const domainDir of domainDirs) {
    const defPath = join(landscapePath, "model", "domains", domainDir, "domain.yaml");
    if (existsSync(defPath)) {
      validateFile(defPath, DomainDefinitionSchema, issues);
      stats.domains++;
    }
  }

  // Validate application registry
  const appRegPath = join(landscapePath, "model", "applications", "_index.yaml");
  validateFile(appRegPath, ApplicationRegistrySchema, issues);

  // Validate individual application passports
  const appDirs = listDirs(join(landscapePath, "model", "applications"));
  for (const appDir of appDirs) {
    const passportPath = join(landscapePath, "model", "applications", appDir, "passport.yaml");
    if (!existsSync(passportPath)) continue;

    if (validateFile(passportPath, ApplicationPassportSchema, issues)) {
      const data = readYaml(passportPath) as { id: string };
      checkIdUnique(data.id, relative(landscapePath, passportPath));

      // Check that folder name matches ID
      if (appDir !== data.id) {
        issues.push({
          file: relative(landscapePath, passportPath),
          message: `Folder name '${appDir}' does not match passport ID '${data.id}'`,
          severity: "error",
        });
      }
      stats.applications++;
    }
  }

  // Validate capability registry
  const capRegPath = join(landscapePath, "model", "capabilities", "_index.yaml");
  if (validateFile(capRegPath, CapabilityRegistrySchema, issues)) {
    const data = readYaml(capRegPath) as { capabilities: Array<{ id: string }> };
    for (const cap of data.capabilities) {
      checkIdUnique(cap.id, relative(landscapePath, capRegPath));
      stats.capabilities++;
    }
  }

  // Validate data entity registry
  const entityRegPath = join(landscapePath, "model", "data-entities", "_index.yaml");
  validateFile(entityRegPath, DataEntityRegistrySchema, issues);

  // Validate individual data entity files
  const entityFiles = listFiles(join(landscapePath, "model", "data-entities"), ".yaml").filter(
    (f) => f !== "_index.yaml",
  );

  for (const entityFile of entityFiles) {
    const fullPath = join(landscapePath, "model", "data-entities", entityFile);
    if (validateFile(fullPath, DataEntitySchema, issues)) {
      const data = readYaml(fullPath) as { id: string };
      checkIdUnique(data.id, relative(landscapePath, fullPath));
      stats.dataEntities++;
    }
  }

  // Validate integration registry
  const intRegPath = join(landscapePath, "model", "integrations", "_index.yaml");
  validateFile(intRegPath, IntegrationRegistrySchema, issues);

  // Validate change requests
  const changesDir = join(landscapePath, "changes");
  const changeDirs = listDirs(changesDir);
  const changeFiles: string[] = [];

  for (const changeDir of changeDirs) {
    const changePath = join(changesDir, changeDir, "change.yaml");
    if (existsSync(changePath)) {
      changeFiles.push(join(changeDir, "change.yaml"));
    }
  }

  for (const changeFile of changeFiles) {
    const fullPath = join(changesDir, changeFile);
    if (validateFile(fullPath, ChangeRequestSchema, issues)) {
      const data = readYaml(fullPath) as { id: string };
      checkIdUnique(data.id, relative(landscapePath, fullPath));

      const folderName = changeFile.split("/")[0];
      if (folderName !== data.id) {
        issues.push({
          file: relative(landscapePath, fullPath),
          message: `Folder name '${folderName}' does not match change ID '${data.id}'`,
          severity: "error",
        });
      }
      stats.changeRequests++;
    }
  }

  // Cross-reference: check that application IDs referenced in change requests exist
  for (const changeFile of changeFiles) {
    const fullPath = join(changesDir, changeFile);
    if (!existsSync(fullPath)) continue;
    try {
      const data = readYaml(fullPath) as {
        applications: { primary: string; affected: string[] };
      };
      const refIds = [data.applications.primary, ...data.applications.affected];
      for (const refId of refIds) {
        if (refId && !allIds.has(refId)) {
          issues.push({
            file: relative(landscapePath, fullPath),
            message: `Referenced application '${refId}' not found in landscape`,
            severity: "warning",
          });
        }
      }
    } catch {
      // Already reported as schema error
    }
  }

  // Check ID sequence consistency: no allocated ID should exceed the counter
  if (existsSync(seqPath)) {
    try {
      const sequences = readYaml(seqPath) as Record<string, Record<string, number>>;
      for (const id of allIds) {
        try {
          const parsed = parseId(id);
          const maxSeq = sequences[parsed.domain]?.[parsed.type];
          if (maxSeq !== undefined && parsed.sequence > maxSeq) {
            issues.push({
              file: "id-sequences.yaml",
              message: `ID '${id}' has sequence ${parsed.sequence} but counter is only at ${maxSeq}`,
              severity: "error",
            });
          }
        } catch {
          // Not a standard ID format, skip
        }
      }
    } catch {
      // Already reported
    }
  }

  return {
    valid: issues.filter((i) => i.severity === "error").length === 0,
    issues,
    stats,
  };
}
