import { describe, expect, it } from "vitest";
import { cleanInput, dispatch, stripHtml, stripMentionTags } from "./teams-dispatcher.js";

describe("stripHtml", () => {
  it("strips simple tags", () => {
    expect(stripHtml("<p>hello</p>")).toBe("hello");
  });

  it("strips nested tags", () => {
    expect(stripHtml("<div><p>hello</p></div>")).toBe("hello");
  });

  it("returns plain text unchanged", () => {
    expect(stripHtml("just text")).toBe("just text");
  });
});

describe("stripMentionTags", () => {
  it("strips <at> tags", () => {
    expect(stripMentionTags("<at>ArchiClaw</at> help")).toBe("help");
  });

  it("strips <at> tags with attributes", () => {
    expect(stripMentionTags('<at id="123">ArchiClaw</at> apps in FIN')).toBe("apps in FIN");
  });

  it("handles multiple mentions", () => {
    expect(stripMentionTags("<at>Bot</at> <at>User</at> help")).toBe("help");
  });
});

describe("cleanInput", () => {
  it("strips mentions and HTML", () => {
    expect(cleanInput("<p><at>ArchiClaw</at> apps in FIN</p>")).toBe("apps in FIN");
  });

  it("normalizes whitespace", () => {
    expect(cleanInput("  apps   in   FIN  ")).toBe("apps in FIN");
  });
});

describe("dispatch", () => {
  describe("help", () => {
    it("returns help for 'help'", () => {
      expect(dispatch("help")).toEqual({ type: "help" });
    });

    it("returns help case-insensitively", () => {
      expect(dispatch("HELP")).toEqual({ type: "help" });
    });

    it("returns help with whitespace", () => {
      expect(dispatch("  help  ")).toEqual({ type: "help" });
    });
  });

  describe("apps in domain", () => {
    it("matches 'apps in FIN'", () => {
      const result = dispatch("apps in FIN");
      expect(result.type).toBe("app-list");
      if (result.type === "app-list") {
        expect(result.domain).toBe("FIN");
        expect(result.apps.length).toBeGreaterThan(0);
      }
    });

    it("matches 'applications in HR'", () => {
      const result = dispatch("applications in HR");
      expect(result.type).toBe("app-list");
      if (result.type === "app-list") {
        expect(result.domain).toBe("HR");
      }
    });

    it("matches 'app for fin' (lowercase)", () => {
      const result = dispatch("app for fin");
      expect(result.type).toBe("app-list");
      if (result.type === "app-list") {
        expect(result.domain).toBe("FIN");
      }
    });

    it("returns not-found for unknown domain", () => {
      const result = dispatch("apps in NONEXISTENT");
      expect(result.type).toBe("not-found");
    });
  });

  describe("passport", () => {
    it("matches 'passport FIN-APP-001'", () => {
      const result = dispatch("passport FIN-APP-001");
      expect(result.type).toBe("passport");
      if (result.type === "passport") {
        expect(result.app.id).toBe("FIN-APP-001");
      }
    });

    it("matches 'details HR-APP-001'", () => {
      const result = dispatch("details HR-APP-001");
      expect(result.type).toBe("passport");
      if (result.type === "passport") {
        expect(result.app.id).toBe("HR-APP-001");
      }
    });

    it("normalizes lowercase app IDs", () => {
      const result = dispatch("passport fin-app-001");
      expect(result.type).toBe("passport");
      if (result.type === "passport") {
        expect(result.app.id).toBe("FIN-APP-001");
      }
    });

    it("returns not-found for unknown app", () => {
      const result = dispatch("passport FAKE-APP-999");
      expect(result.type).toBe("not-found");
    });
  });

  describe("integrations between", () => {
    it("matches 'integrations between HR-APP-001 and FIN-APP-001'", () => {
      const result = dispatch("integrations between HR-APP-001 and FIN-APP-001");
      expect(result.type).toBe("integrations");
      if (result.type === "integrations") {
        expect(result.integrations.length).toBeGreaterThan(0);
      }
    });

    it("returns not-found when none exist", () => {
      const result = dispatch("integrations between IT-APP-001 and SALES-APP-001");
      expect(result.type).toBe("not-found");
    });
  });

  describe("integrations for", () => {
    it("matches 'integrations for HR-APP-001'", () => {
      const result = dispatch("integrations for HR-APP-001");
      expect(result.type).toBe("integrations");
      if (result.type === "integrations") {
        expect(result.integrations.length).toBeGreaterThan(0);
        expect(result.label).toBe("HR-APP-001");
      }
    });

    it("matches 'integration of FIN-APP-001'", () => {
      const result = dispatch("integration of FIN-APP-001");
      expect(result.type).toBe("integrations");
    });
  });

  describe("data entities", () => {
    it("matches 'data entities in CORE'", () => {
      const result = dispatch("data entities in CORE");
      expect(result.type).toBe("data-entities");
      if (result.type === "data-entities") {
        expect(result.entities.length).toBeGreaterThan(0);
      }
    });

    it("matches 'entities for FIN-APP-001' (app lookup)", () => {
      const result = dispatch("entities for FIN-APP-001");
      expect(result.type).toBe("data-entities");
    });

    it("matches 'data entity in CORE'", () => {
      const result = dispatch("data entity in CORE");
      expect(result.type).toBe("data-entities");
    });

    it("returns not-found for domain with no data entities", () => {
      const result = dispatch("data entities in FIN");
      expect(result.type).toBe("not-found");
    });
  });

  describe("capabilities", () => {
    it("matches 'capabilities in FIN'", () => {
      const result = dispatch("capabilities in FIN");
      expect(result.type).toBe("capabilities");
      if (result.type === "capabilities") {
        expect(result.domain).toBe("FIN");
        expect(result.capabilities.length).toBeGreaterThan(0);
      }
    });

    it("matches 'capability for SALES'", () => {
      const result = dispatch("capability for SALES");
      expect(result.type).toBe("capabilities");
    });
  });

  describe("summary / domains", () => {
    it("matches 'domains'", () => {
      const result = dispatch("domains");
      expect(result.type).toBe("summary");
      if (result.type === "summary") {
        expect(result.domains.length).toBeGreaterThan(0);
      }
    });

    it("matches 'summary'", () => {
      expect(dispatch("summary").type).toBe("summary");
    });

    it("matches 'landscape'", () => {
      expect(dispatch("landscape").type).toBe("summary");
    });

    it("matches 'stats'", () => {
      expect(dispatch("stats").type).toBe("summary");
    });

    it("matches 'overview'", () => {
      expect(dispatch("overview").type).toBe("summary");
    });
  });

  describe("validation", () => {
    it("matches 'validate'", () => {
      expect(dispatch("validate").type).toBe("validation");
    });

    it("matches 'check'", () => {
      expect(dispatch("check").type).toBe("validation");
    });

    it("matches 'health'", () => {
      expect(dispatch("health").type).toBe("validation");
    });
  });

  describe("raw app ID", () => {
    it("matches a bare app ID", () => {
      const result = dispatch("FIN-APP-001");
      expect(result.type).toBe("passport");
      if (result.type === "passport") {
        expect(result.app.id).toBe("FIN-APP-001");
      }
    });

    it("returns not-found for unknown bare ID", () => {
      const result = dispatch("ZZ-APP-999");
      expect(result.type).toBe("not-found");
    });
  });

  describe("fallback search", () => {
    it("searches for 'SAP'", () => {
      const result = dispatch("SAP");
      expect(result.type).toBe("search");
      if (result.type === "search") {
        expect(result.query).toBe("SAP");
      }
    });

    it("returns not-found for gibberish", () => {
      const result = dispatch("xyzzy12345gibberish");
      expect(result.type).toBe("not-found");
    });
  });

  describe("HTML in Teams input", () => {
    it("strips <p> tags before dispatching", () => {
      const result = dispatch("<p>apps in FIN</p>");
      expect(result.type).toBe("app-list");
    });

    it("strips <at> mention tags before dispatching", () => {
      const result = dispatch("<at>ArchiClaw</at> help");
      expect(result.type).toBe("help");
    });

    it("handles combined HTML and mentions", () => {
      const result = dispatch("<p><at>ArchiClaw</at> passport FIN-APP-001</p>");
      expect(result.type).toBe("passport");
    });
  });
});
