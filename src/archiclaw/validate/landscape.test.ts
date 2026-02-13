import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { stringify } from "yaml";
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

describe("validateLandscape negative cases", () => {
  const TMP = join(import.meta.dirname ?? ".", "..", "..", "..", ".tmp-test-landscape");

  // Minimal valid passport factory
  function passport(id: string, domain: string) {
    return {
      id,
      name: `Test App ${id}`,
      domain,
      status: "run",
      togaf_layer: "application",
      owners: { business: "A", technical: "B" },
      technology: { stack: ["Node"], hosting: "cloud", data_classification: "internal" },
      integrations: [],
      compliance: [],
      sla: { availability: "99%", rpo: "1h", rto: "2h" },
      created: "2025-01-01",
      updated: "2025-01-01",
    };
  }

  // Write a minimal valid landscape scaffold into TMP, with one domain (TST) and one app
  function scaffold() {
    mkdirSync(join(TMP, ".archiclaw"), { recursive: true });
    writeFileSync(join(TMP, ".archiclaw", "config.yaml"), "organization: Test\n");
    writeFileSync(
      join(TMP, ".archiclaw", "id-sequences.yaml"),
      stringify({ TST: { APP: 1, ACR: 0, CAP: 0 } }),
    );

    mkdirSync(join(TMP, "model", "domains", "TST"), { recursive: true });
    writeFileSync(
      join(TMP, "model", "domains", "_index.yaml"),
      stringify({ domains: [{ id: "TST", name: "Test", lead: "Tester" }] }),
    );
    writeFileSync(
      join(TMP, "model", "domains", "TST", "domain.yaml"),
      stringify({
        id: "TST",
        name: "Test",
        description: "Test domain",
        lead: "Tester",
        capabilities: [],
        applications: ["TST-APP-001"],
      }),
    );

    mkdirSync(join(TMP, "model", "applications", "TST-APP-001"), { recursive: true });
    writeFileSync(
      join(TMP, "model", "applications", "_index.yaml"),
      stringify({ applications: [{ id: "TST-APP-001", name: "Test App", domain: "TST" }] }),
    );
    writeFileSync(
      join(TMP, "model", "applications", "TST-APP-001", "passport.yaml"),
      stringify(passport("TST-APP-001", "TST")),
    );

    mkdirSync(join(TMP, "model", "capabilities"), { recursive: true });
    writeFileSync(
      join(TMP, "model", "capabilities", "_index.yaml"),
      stringify({ capabilities: [] }),
    );

    mkdirSync(join(TMP, "model", "data-entities"), { recursive: true });
    writeFileSync(
      join(TMP, "model", "data-entities", "_index.yaml"),
      stringify({ entities: [] }),
    );

    mkdirSync(join(TMP, "model", "integrations"), { recursive: true });
    writeFileSync(
      join(TMP, "model", "integrations", "_index.yaml"),
      stringify({ integrations: [] }),
    );
  }

  beforeEach(() => {
    rmSync(TMP, { recursive: true, force: true });
    scaffold();
  });

  afterEach(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it("detects duplicate application IDs", () => {
    // Add a second app folder with the same ID as TST-APP-001
    mkdirSync(join(TMP, "model", "applications", "TST-APP-DUP"), { recursive: true });
    writeFileSync(
      join(TMP, "model", "applications", "TST-APP-DUP", "passport.yaml"),
      stringify(passport("TST-APP-001", "TST")),
    );

    const result = validateLandscape(TMP);
    const dupes = result.issues.filter((i) => i.message.includes("Duplicate ID"));
    expect(dupes.length).toBeGreaterThan(0);
    expect(result.valid).toBe(false);
  });

  it("detects folder-name mismatch", () => {
    mkdirSync(join(TMP, "model", "applications", "WRONG-FOLDER"), { recursive: true });
    writeFileSync(
      join(TMP, "model", "applications", "WRONG-FOLDER", "passport.yaml"),
      stringify(passport("TST-APP-099", "TST")),
    );

    const result = validateLandscape(TMP);
    const mismatches = result.issues.filter((i) => i.message.includes("does not match"));
    expect(mismatches.length).toBeGreaterThan(0);
    expect(mismatches[0].message).toContain("WRONG-FOLDER");
  });

  it("warns about broken cross-references in change requests", () => {
    mkdirSync(join(TMP, "changes", "TST-ACR-001"), { recursive: true });
    writeFileSync(
      join(TMP, "changes", "TST-ACR-001", "change.yaml"),
      stringify({
        id: "TST-ACR-001",
        title: "Test change",
        domain: "TST",
        status: "draft",
        created: "2025-01-01",
        author: "Tester",
        applications: {
          primary: "TST-APP-001",
          affected: ["TST-APP-999"], // does not exist
        },
        capabilities_affected: [],
        impact: {
          cost: "low",
          risk: "low",
          data_sensitivity: "internal",
          affected_systems_count: 1,
          recommended_tier: "individual",
        },
        decision_tier: "individual",
        artifacts: {
          diagrams: [],
          data_matrix: "",
          adr: "",
        },
        push: { jira_issue: "", confluence_page: "" },
      }),
    );

    // Update id-sequences to include ACR counter
    writeFileSync(
      join(TMP, ".archiclaw", "id-sequences.yaml"),
      stringify({ TST: { APP: 1, ACR: 1, CAP: 0 } }),
    );

    const result = validateLandscape(TMP);
    const warnings = result.issues.filter(
      (i) => i.severity === "warning" && i.message.includes("TST-APP-999"),
    );
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].message).toContain("not found in landscape");
  });

  it("detects ID sequence exceeded by counter", () => {
    // Create passport with sequence 999 but counter is only at 1
    mkdirSync(join(TMP, "model", "applications", "TST-APP-999"), { recursive: true });
    writeFileSync(
      join(TMP, "model", "applications", "TST-APP-999", "passport.yaml"),
      stringify(passport("TST-APP-999", "TST")),
    );

    const result = validateLandscape(TMP);
    const seqErrors = result.issues.filter(
      (i) => i.message.includes("sequence") && i.message.includes("999"),
    );
    expect(seqErrors.length).toBeGreaterThan(0);
    expect(seqErrors[0].message).toContain("counter is only at");
  });
});
