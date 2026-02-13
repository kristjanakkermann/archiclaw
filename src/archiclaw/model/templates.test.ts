import { describe, it, expect } from "vitest";
import { expandTemplate } from "./templates.js";

describe("expandTemplate", () => {
  it("replaces known placeholders", () => {
    const result = expandTemplate("{DOMAIN}-{TYPE}-{NNN}", {
      DOMAIN: "FIN",
      TYPE: "APP",
      NNN: "001",
    });
    expect(result).toBe("FIN-APP-001");
  });

  it("replaces all known ArchiClaw placeholders", () => {
    const tpl = "{DOMAIN} {NNN} {DATE} {TITLE} {CHANGE_ID} {APP_NAME}";
    const result = expandTemplate(tpl, {
      DOMAIN: "HR",
      NNN: "042",
      DATE: "2025-06-01",
      TITLE: "Migrate payroll",
      CHANGE_ID: "HR-ACR-001",
      APP_NAME: "Workday",
    });
    expect(result).toBe("HR 042 2025-06-01 Migrate payroll HR-ACR-001 Workday");
  });

  it("leaves missing placeholders as-is", () => {
    const result = expandTemplate("{DOMAIN}-{UNKNOWN}", { DOMAIN: "FIN" });
    expect(result).toBe("FIN-{UNKNOWN}");
  });

  it("replaces multiple occurrences of the same placeholder", () => {
    const result = expandTemplate("{DOMAIN}/{DOMAIN}/{DOMAIN}", { DOMAIN: "IT" });
    expect(result).toBe("IT/IT/IT");
  });

  it("returns input unchanged when no placeholders present", () => {
    expect(expandTemplate("no placeholders here", {})).toBe("no placeholders here");
  });
});
