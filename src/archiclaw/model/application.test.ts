import { describe, it, expect } from "vitest";
import { ApplicationPassportSchema, ApplicationRegistrySchema } from "./application.js";

describe("ApplicationPassportSchema", () => {
  const validPassport = {
    id: "FIN-APP-001",
    name: "SAP ERP",
    domain: "FIN",
    status: "run",
    togaf_layer: "application",
    owners: {
      business: "Jane Doe",
      technical: "John Smith",
    },
    technology: {
      stack: ["SAP ABAP", "HANA DB"],
      hosting: "on-premise",
      data_classification: "confidential",
    },
    integrations: [
      {
        target: "HR-APP-001",
        type: "api",
        direction: "bidirectional",
        protocol: "RFC",
      },
    ],
    compliance: ["GDPR", "SOX"],
    sla: {
      availability: "99.5%",
      rpo: "4h",
      rto: "8h",
    },
    created: "2020-03-15",
    updated: "2025-01-10",
  };

  it("accepts a valid passport", () => {
    const result = ApplicationPassportSchema.safeParse(validPassport);
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const { name: _, ...noName } = validPassport;
    expect(ApplicationPassportSchema.safeParse(noName).success).toBe(false);
  });

  it("rejects invalid status", () => {
    const invalid = { ...validPassport, status: "unknown" };
    expect(ApplicationPassportSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects invalid hosting model", () => {
    const invalid = {
      ...validPassport,
      technology: { ...validPassport.technology, hosting: "bare-metal" },
    };
    expect(ApplicationPassportSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects extra fields (strict mode)", () => {
    const extra = { ...validPassport, extra_field: "not allowed" };
    expect(ApplicationPassportSchema.safeParse(extra).success).toBe(false);
  });

  it("accepts all valid status values", () => {
    for (const status of ["plan", "build", "run", "retire"]) {
      const passport = { ...validPassport, status };
      expect(ApplicationPassportSchema.safeParse(passport).success).toBe(true);
    }
  });

  it("accepts all valid hosting models", () => {
    for (const hosting of ["on-premise", "cloud", "hybrid", "saas"]) {
      const passport = {
        ...validPassport,
        technology: { ...validPassport.technology, hosting },
      };
      expect(ApplicationPassportSchema.safeParse(passport).success).toBe(true);
    }
  });
});

describe("ApplicationRegistrySchema", () => {
  it("accepts a valid registry", () => {
    const registry = {
      applications: [
        { id: "FIN-APP-001", name: "SAP ERP", domain: "FIN" },
        { id: "HR-APP-001", name: "Workday HR", domain: "HR" },
      ],
    };
    expect(ApplicationRegistrySchema.safeParse(registry).success).toBe(true);
  });

  it("accepts empty registry", () => {
    expect(ApplicationRegistrySchema.safeParse({ applications: [] }).success).toBe(true);
  });
});
