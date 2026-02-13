import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import { z } from "zod";

// Domain IDs are short uppercase identifiers
export const DomainIdSchema = z
  .string()
  .regex(/^[A-Z]{2,10}$/, "Domain ID must be 2-10 uppercase letters");

// Entity type prefixes
export const EntityType = {
  APP: "APP",
  ACR: "ACR",
  ENT: "ENT",
  CAP: "CAP",
} as const;

export type EntityType = (typeof EntityType)[keyof typeof EntityType];

export const EntityTypeSchema = z.enum(["APP", "ACR", "ENT", "CAP"]);

// Full ID format: {DOMAIN}-{TYPE}-{NNN}
const ID_PATTERN = /^[A-Z]{2,10}-(APP|ACR|ENT|CAP)-\d{3,}$/;

export const EntityIdSchema = z
  .string()
  .regex(ID_PATTERN, "ID must match format: DOMAIN-TYPE-NNN (e.g. FIN-APP-001)");

export const ApplicationIdSchema = z
  .string()
  .regex(/^[A-Z]{2,10}-APP-\d{3,}$/, "Application ID must match DOMAIN-APP-NNN");

export const ChangeRequestIdSchema = z
  .string()
  .regex(/^[A-Z]{2,10}-ACR-\d{3,}$/, "Change request ID must match DOMAIN-ACR-NNN");

export const DataEntityIdSchema = z
  .string()
  .regex(/^[A-Z]{2,10}-ENT-\d{3,}$/, "Data entity ID must match DOMAIN-ENT-NNN");

export const CapabilityIdSchema = z
  .string()
  .regex(/^[A-Z]{2,10}-CAP-\d{3,}$/, "Capability ID must match DOMAIN-CAP-NNN");

/** Parse a structured ID into its components. */
export function parseId(id: string): { domain: string; type: EntityType; sequence: number } {
  const match = id.match(/^([A-Z]{2,10})-(APP|ACR|ENT|CAP)-(\d{3,})$/);
  if (!match) throw new Error(`Invalid ID format: ${id}`);
  return {
    domain: match[1],
    type: match[2] as EntityType,
    sequence: parseInt(match[3], 10),
  };
}

/** Format a new ID from components. */
export function formatId(domain: string, type: EntityType, sequence: number): string {
  return `${domain}-${type}-${String(sequence).padStart(3, "0")}`;
}

// ID sequence file schema - each domain has a map of entity type → counter
// Not all entity types are required per domain
export const IdSequencesSchema = z.record(
  DomainIdSchema,
  z.record(z.string(), z.number().int().nonnegative()),
);

export type IdSequences = z.infer<typeof IdSequencesSchema>;

/**
 * Read current ID sequences from the landscape config.
 * Returns a mutable copy.
 */
export function readIdSequences(landscapePath: string): IdSequences {
  const filePath = join(landscapePath, ".archiclaw", "id-sequences.yaml");
  const raw = readFileSync(filePath, "utf-8");
  return IdSequencesSchema.parse(parse(raw));
}

/**
 * Write updated ID sequences back to the landscape config.
 */
export function writeIdSequences(landscapePath: string, sequences: IdSequences): void {
  const filePath = join(landscapePath, ".archiclaw", "id-sequences.yaml");
  writeFileSync(filePath, stringify(sequences), "utf-8");
}

/**
 * Allocate the next sequential ID for a given domain and entity type.
 * Reads, increments, writes, and returns the new ID.
 */
export function nextId(landscapePath: string, domain: string, type: EntityType): string {
  const sequences = readIdSequences(landscapePath);

  if (!sequences[domain]) {
    sequences[domain] = {};
  }
  const current = sequences[domain][type] ?? 0;
  const next = current + 1;
  sequences[domain][type] = next;

  writeIdSequences(landscapePath, sequences);
  return formatId(domain, type, next);
}
