// Tests validate eval definition structure and example data, not skill execution.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { loadEvalDefinition, computeWeightedScore } from "../../runner.js";

const EVAL_DIR = import.meta.dirname ?? new URL(".", import.meta.url).pathname;

describe("landscape-query eval fixtures", () => {
  const evalDef = loadEvalDefinition("landscape-query");

  it("has valid eval definition with criteria", () => {
    expect(evalDef.criteria.length).toBeGreaterThan(0);
    const totalWeight = evalDef.criteria.reduce((sum, c) => sum + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 1);
  });

  it("example 001-app-by-domain has valid input and expected output", () => {
    const inputPath = join(EVAL_DIR, "examples", "001-app-by-domain", "input.yaml");
    const expectedPath = join(EVAL_DIR, "examples", "001-app-by-domain", "expected.yaml");

    expect(existsSync(inputPath)).toBe(true);
    expect(existsSync(expectedPath)).toBe(true);

    const input = parse(readFileSync(inputPath, "utf-8"));
    expect(input.query).toContain("Finance");

    const expected = parse(readFileSync(expectedPath, "utf-8"));
    expect(expected.expected_applications).toBeInstanceOf(Array);
    expect(expected.expected_applications.length).toBe(3);
  });

  it("computes weighted scores correctly", () => {
    const scores = {
      accuracy: 1.0,
      completeness: 0.9,
      references: 0.8,
      clarity: 0.7,
    };
    const weighted = computeWeightedScore(evalDef.criteria, scores);
    // (1.0*0.35 + 0.9*0.3 + 0.8*0.2 + 0.7*0.15) = 0.35+0.27+0.16+0.105 = 0.885
    expect(weighted).toBeCloseTo(0.885, 2);
  });
});
