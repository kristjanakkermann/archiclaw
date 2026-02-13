import { describe, it, expect } from "vitest";
import { ChangeRequestSchema } from "./change-request.js";

describe("ChangeRequestSchema", () => {
  const validChange = {
    id: "FIN-ACR-001",
    title: "Migrate SAP ERP to S/4HANA Cloud",
    domain: "FIN",
    status: "draft",
    created: "2025-01-15",
    author: "kristjan.akkermann",
    applications: {
      primary: "FIN-APP-001",
      affected: ["FIN-APP-003", "HR-APP-001"],
    },
    capabilities_affected: ["FIN-CAP-001", "FIN-CAP-002"],
    impact: {
      cost: "high",
      risk: "high",
      data_sensitivity: "confidential",
      affected_systems_count: 3,
      recommended_tier: "eac",
    },
    decision_tier: "eac",
    artifacts: {
      diagrams: [
        { type: "arch-change", file: "diagrams/arch-change.mmd" },
        { type: "context-c4", file: "diagrams/context-c4.mmd" },
      ],
      data_matrix: "data-matrix.yaml",
      adr: "adr.md",
    },
    push: {
      jira_issue: "ACM-1234",
      confluence_page: "",
    },
  };

  it("accepts a valid change request", () => {
    const result = ChangeRequestSchema.safeParse(validChange);
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const invalid = { ...validChange, status: "pending" };
    expect(ChangeRequestSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects invalid cost level", () => {
    const invalid = {
      ...validChange,
      impact: { ...validChange.impact, cost: "extreme" },
    };
    expect(ChangeRequestSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects invalid diagram type", () => {
    const invalid = {
      ...validChange,
      artifacts: {
        ...validChange.artifacts,
        diagrams: [{ type: "invalid-type", file: "test.mmd" }],
      },
    };
    expect(ChangeRequestSchema.safeParse(invalid).success).toBe(false);
  });

  it("accepts all valid statuses", () => {
    for (const status of ["draft", "review", "approved", "rejected", "implemented"]) {
      expect(ChangeRequestSchema.safeParse({ ...validChange, status }).success).toBe(true);
    }
  });

  it("accepts all valid decision tiers", () => {
    for (const tier of ["eac", "peer", "individual"]) {
      const change = {
        ...validChange,
        decision_tier: tier,
        impact: { ...validChange.impact, recommended_tier: tier },
      };
      expect(ChangeRequestSchema.safeParse(change).success).toBe(true);
    }
  });
});
