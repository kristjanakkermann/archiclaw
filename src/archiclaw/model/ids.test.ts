import { describe, it, expect } from "vitest";
import {
  DomainIdSchema,
  EntityIdSchema,
  ApplicationIdSchema,
  ChangeRequestIdSchema,
  DataEntityIdSchema,
  CapabilityIdSchema,
  parseId,
  formatId,
} from "./ids.js";

describe("ID schemas", () => {
  describe("DomainIdSchema", () => {
    it("accepts valid domain IDs", () => {
      expect(DomainIdSchema.safeParse("FIN").success).toBe(true);
      expect(DomainIdSchema.safeParse("HR").success).toBe(true);
      expect(DomainIdSchema.safeParse("CORE").success).toBe(true);
      expect(DomainIdSchema.safeParse("SALES").success).toBe(true);
    });

    it("rejects invalid domain IDs", () => {
      expect(DomainIdSchema.safeParse("fin").success).toBe(false); // lowercase
      expect(DomainIdSchema.safeParse("F").success).toBe(false); // too short
      expect(DomainIdSchema.safeParse("TOOLONGDOMAIN").success).toBe(false); // too long
      expect(DomainIdSchema.safeParse("FIN1").success).toBe(false); // numbers
    });
  });

  describe("EntityIdSchema", () => {
    it("accepts valid entity IDs", () => {
      expect(EntityIdSchema.safeParse("FIN-APP-001").success).toBe(true);
      expect(EntityIdSchema.safeParse("HR-ACR-042").success).toBe(true);
      expect(EntityIdSchema.safeParse("CORE-ENT-001").success).toBe(true);
      expect(EntityIdSchema.safeParse("SALES-CAP-123").success).toBe(true);
    });

    it("rejects invalid entity IDs", () => {
      expect(EntityIdSchema.safeParse("FIN-XXX-001").success).toBe(false); // bad type
      expect(EntityIdSchema.safeParse("fin-APP-001").success).toBe(false); // lowercase domain
      expect(EntityIdSchema.safeParse("FIN-APP-01").success).toBe(false); // too few digits
      expect(EntityIdSchema.safeParse("FIN-APP").success).toBe(false); // missing sequence
    });
  });

  describe("type-specific ID schemas", () => {
    it("ApplicationIdSchema accepts APP type only", () => {
      expect(ApplicationIdSchema.safeParse("FIN-APP-001").success).toBe(true);
      expect(ApplicationIdSchema.safeParse("FIN-ACR-001").success).toBe(false);
    });

    it("ChangeRequestIdSchema accepts ACR type only", () => {
      expect(ChangeRequestIdSchema.safeParse("FIN-ACR-001").success).toBe(true);
      expect(ChangeRequestIdSchema.safeParse("FIN-APP-001").success).toBe(false);
    });

    it("DataEntityIdSchema accepts ENT type only", () => {
      expect(DataEntityIdSchema.safeParse("CORE-ENT-001").success).toBe(true);
      expect(DataEntityIdSchema.safeParse("CORE-APP-001").success).toBe(false);
    });

    it("CapabilityIdSchema accepts CAP type only", () => {
      expect(CapabilityIdSchema.safeParse("FIN-CAP-001").success).toBe(true);
      expect(CapabilityIdSchema.safeParse("FIN-ENT-001").success).toBe(false);
    });
  });
});

describe("parseId", () => {
  it("parses a valid ID into components", () => {
    const result = parseId("FIN-APP-001");
    expect(result).toEqual({ domain: "FIN", type: "APP", sequence: 1 });
  });

  it("parses multi-digit sequences", () => {
    const result = parseId("HR-ACR-042");
    expect(result).toEqual({ domain: "HR", type: "ACR", sequence: 42 });
  });

  it("throws on invalid format", () => {
    expect(() => parseId("invalid")).toThrow("Invalid ID format");
    expect(() => parseId("FIN-XXX-001")).toThrow("Invalid ID format");
  });
});

describe("formatId", () => {
  it("formats ID with zero-padded sequence", () => {
    expect(formatId("FIN", "APP", 1)).toBe("FIN-APP-001");
    expect(formatId("HR", "ACR", 42)).toBe("HR-ACR-042");
    expect(formatId("CORE", "ENT", 100)).toBe("CORE-ENT-100");
  });

  it("preserves sequences longer than 3 digits", () => {
    expect(formatId("FIN", "APP", 1234)).toBe("FIN-APP-1234");
  });
});
