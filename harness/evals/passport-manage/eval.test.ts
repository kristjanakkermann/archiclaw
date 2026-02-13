// Tests validate eval definition structure and example data, not skill execution.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { ApplicationPassportSchema } from "../../../src/archiclaw/model/application.js";
import { loadEvalDefinition, computeWeightedScore } from "../../runner.js";

const EVAL_DIR = import.meta.dirname ?? new URL(".", import.meta.url).pathname;

describe("passport-manage eval fixtures", () => {
  const evalDef = loadEvalDefinition("passport-manage");

  it("has valid eval definition with criteria", () => {
    expect(evalDef.criteria.length).toBeGreaterThan(0);
    const totalWeight = evalDef.criteria.reduce((sum, c) => sum + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 1);
  });

  it("example 001-new-crm-app has valid input", () => {
    const inputPath = join(EVAL_DIR, "examples", "001-new-crm-app", "input.yaml");
    expect(existsSync(inputPath)).toBe(true);

    const input = parse(readFileSync(inputPath, "utf-8"));
    expect(input.scenario).toBeDefined();
    expect(input.operation).toBe("create");
    expect(input.domain).toBe("SALES");
    expect(input.data.name).toBe("HubSpot CRM");
  });

  it("sample passport data validates against schema", () => {
    const inputPath = join(EVAL_DIR, "examples", "001-new-crm-app", "input.yaml");
    const input = parse(readFileSync(inputPath, "utf-8"));

    // Build a complete passport from input data to validate schema
    const passport = {
      id: "SALES-APP-002",
      name: input.data.name,
      domain: input.domain,
      status: input.data.status,
      togaf_layer: input.data.togaf_layer,
      owners: input.data.owners,
      technology: input.data.technology,
      integrations: input.data.integrations,
      compliance: input.data.compliance,
      sla: input.data.sla,
      created: "2025-01-15",
      updated: "2025-01-15",
    };

    const result = ApplicationPassportSchema.safeParse(passport);
    expect(result.success).toBe(true);
  });

  it("computes weighted scores correctly", () => {
    const scores = {
      completeness: 1.0,
      schema_compliance: 1.0,
      consistency: 0.8,
      diagram_quality: 0.6,
    };
    const weighted = computeWeightedScore(evalDef.criteria, scores);
    expect(weighted).toBeGreaterThan(0.7);
  });
});
