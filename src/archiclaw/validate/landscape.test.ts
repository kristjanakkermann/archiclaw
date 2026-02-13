import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { validateLandscape } from "./landscape.js";

const LANDSCAPE_PATH = join(import.meta.dirname ?? ".", "..", "..", "..", "landscape");

describe("validateLandscape", () => {
  it("validates the seeded landscape without errors", () => {
    const result = validateLandscape(LANDSCAPE_PATH);

    // Log issues for debugging if any
    if (result.issues.length > 0) {
      for (const issue of result.issues) {
        console.log(`[${issue.severity}] ${issue.file}: ${issue.message}`);
      }
    }

    const errors = result.issues.filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("finds the seeded applications", () => {
    const result = validateLandscape(LANDSCAPE_PATH);
    expect(result.stats.applications).toBe(5);
  });

  it("finds the seeded domains", () => {
    const result = validateLandscape(LANDSCAPE_PATH);
    expect(result.stats.domains).toBe(5);
  });

  it("finds the seeded data entities", () => {
    const result = validateLandscape(LANDSCAPE_PATH);
    expect(result.stats.dataEntities).toBe(5);
  });

  it("finds the seeded capabilities", () => {
    const result = validateLandscape(LANDSCAPE_PATH);
    expect(result.stats.capabilities).toBe(10);
  });

  it("has no change requests yet", () => {
    const result = validateLandscape(LANDSCAPE_PATH);
    expect(result.stats.changeRequests).toBe(0);
  });
});
