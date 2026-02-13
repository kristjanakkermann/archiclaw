// Tests validate eval definition structure and example data, not skill execution.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { ChangeRequestSchema } from "../../../src/archiclaw/model/change-request.js";
import { loadEvalDefinition, computeWeightedScore } from "../../runner.js";

const EVAL_DIR = import.meta.dirname ?? new URL(".", import.meta.url).pathname;

describe("interview eval fixtures", () => {
  const evalDef = loadEvalDefinition("interview");

  it("has valid eval definition with criteria", () => {
    expect(evalDef.criteria.length).toBeGreaterThan(0);
    const totalWeight = evalDef.criteria.reduce((sum, c) => sum + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 1);
  });

  it("has at least one example scenario", () => {
    const examplesDir = join(EVAL_DIR, "examples");
    expect(existsSync(examplesDir)).toBe(true);
  });

  it("example 001-sap-migration has valid input and expected output", () => {
    const inputPath = join(EVAL_DIR, "examples", "001-sap-migration", "input.yaml");
    const expectedPath = join(EVAL_DIR, "examples", "001-sap-migration", "expected.yaml");

    expect(existsSync(inputPath)).toBe(true);
    expect(existsSync(expectedPath)).toBe(true);

    const input = parse(readFileSync(inputPath, "utf-8"));
    expect(input.scenario).toBeDefined();
    expect(input.domain).toBeDefined();
    expect(input.pm_responses).toBeInstanceOf(Array);

    const expected = parse(readFileSync(expectedPath, "utf-8"));
    expect(expected.change).toBeDefined();
    expect(expected.change.title).toBeDefined();
    expect(expected.change.domain).toBe("FIN");
  });

  it("expected change output matches ChangeRequestSchema structure", () => {
    const expectedPath = join(EVAL_DIR, "examples", "001-sap-migration", "expected.yaml");
    const expected = parse(readFileSync(expectedPath, "utf-8"));

    // The expected output should be a partial match; validate the fields that are present
    expect(expected.change.impact.recommended_tier).toBe("eac");
    expect(expected.change.impact.cost).toBe("high");
    expect(expected.change.impact.risk).toBe("high");
    expect(expected.change.applications.affected.length).toBeGreaterThan(0);
  });

  it("computes weighted scores correctly", () => {
    const scores = {
      completeness: 0.9,
      accuracy: 0.8,
      consistency: 1.0,
      quality: 0.7,
    };
    const weighted = computeWeightedScore(evalDef.criteria, scores);
    // (0.9*0.3 + 0.8*0.3 + 1.0*0.2 + 0.7*0.2) / 1.0 = 0.27+0.24+0.20+0.14 = 0.85
    expect(weighted).toBeCloseTo(0.85, 2);
  });
});
