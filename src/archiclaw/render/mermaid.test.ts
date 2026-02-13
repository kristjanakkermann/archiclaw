import { existsSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  archimateInit,
  archimateStyles,
  wrapWithTheme,
  c4ContextTemplate,
  currentVsTargetTemplate,
  loadArchimateColors,
  renderSvgString,
  renderToSvg,
  renderFile,
  writeMermaidFile,
  ARCHIMATE_COLORS,
  ARCHIMATE_THEME,
  PRESET_THEMES,
} from "./mermaid.js";

const LANDSCAPE_PATH = join(import.meta.dirname ?? ".", "..", "..", "..", "landscape");

const TMP_DIR = join(import.meta.dirname ?? ".", "..", "..", "..", ".tmp-test-render");

describe("mermaid render", () => {
  describe("archimate theming", () => {
    it("generates init directives with archimate colors", () => {
      const init = archimateInit();
      expect(init).toContain("%%{init:");
      expect(init).toContain(ARCHIMATE_COLORS.application.fill);
      expect(init).toContain(ARCHIMATE_COLORS.business.fill);
    });

    it("generates style class definitions for all layers", () => {
      const styles = archimateStyles();
      expect(styles).toContain("classDef business");
      expect(styles).toContain("classDef application");
      expect(styles).toContain("classDef technology");
      expect(styles).toContain("classDef impacted");
    });

    it("wraps diagram body with theme", () => {
      const body = "graph TD\n  A --> B";
      const themed = wrapWithTheme(body);
      expect(themed).toContain("%%{init:");
      expect(themed).toContain("graph TD");
    });
  });

  describe("ARCHIMATE_THEME", () => {
    it("has all required fields for beautiful-mermaid", () => {
      expect(ARCHIMATE_THEME.bg).toBeDefined();
      expect(ARCHIMATE_THEME.fg).toBeDefined();
      expect(ARCHIMATE_THEME.line).toBeDefined();
      expect(ARCHIMATE_THEME.accent).toBeDefined();
    });
  });

  describe("PRESET_THEMES", () => {
    it("has archimate, light, dark, nord, github", () => {
      expect(PRESET_THEMES.archimate).toBeDefined();
      expect(PRESET_THEMES.light).toBeDefined();
      expect(PRESET_THEMES.dark).toBeDefined();
      expect(PRESET_THEMES.nord).toBeDefined();
      expect(PRESET_THEMES.github).toBeDefined();
    });
  });

  describe("loadArchimateColors", () => {
    it("loads colors from the seeded landscape config", () => {
      const colors = loadArchimateColors(LANDSCAPE_PATH);
      expect(colors.application.fill).toBe("#B5D8FF");
      expect(colors.business.fill).toBe("#FFFFB5");
      expect(colors.technology.fill).toBe("#C9E7B7");
      // Supplementary colors remain from defaults
      expect(colors.current.fill).toBe("#E8E8E8");
      expect(colors.target.fill).toBe("#D4EDDA");
    });

    it("returns defaults for missing config", () => {
      const colors = loadArchimateColors("/nonexistent/path");
      expect(colors).toEqual(ARCHIMATE_COLORS);
    });
  });

  describe("template generators", () => {
    it("generates C4 context diagram", () => {
      const diagram = c4ContextTemplate("SAP ERP", [
        { name: "Workday HR", direction: "bidirectional" },
        { name: "SAP BPC", direction: "outbound" },
      ]);
      expect(diagram).toContain("C4Context");
      expect(diagram).toContain("SAP ERP");
      expect(diagram).toContain("System_Ext(workday_hr");
      expect(diagram).toContain("BiRel(target, workday_hr");
      expect(diagram).toContain("Rel(target, sap_bpc");
      expect(diagram).not.toContain("%%{init:");
      expect(diagram).toContain("UpdateElementStyle(target");
      expect(diagram).toContain("UpdateElementStyle(workday_hr");
    });

    it("generates current-vs-target diagram", () => {
      const diagram = currentVsTargetTemplate(
        "Migration",
        [{ id: "sap_ecc", label: "SAP ECC 6.0" }],
        [{ id: "s4hana", label: "S/4HANA Cloud" }],
      );
      expect(diagram).toContain("title: Migration");
      expect(diagram).toContain("flowchart LR");
      expect(diagram).toContain("Current State");
      expect(diagram).toContain("Target State");
      expect(diagram).toContain("SAP ECC 6.0");
      expect(diagram).toContain("S/4HANA Cloud");
    });
  });

  describe("renderSvgString", () => {
    it("renders a simple flowchart to SVG string", async () => {
      const svg = await renderSvgString("graph TD\n  A[Start] --> B[End]");
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
    });

    it("renders with archimate theme by default", async () => {
      const svg = await renderSvgString("graph TD\n  A --> B");
      expect(svg).toContain("<svg");
    });

    it("renders with a named preset theme", async () => {
      const svg = await renderSvgString("graph TD\n  A --> B", "dark");
      expect(svg).toContain("<svg");
    });
  });

  describe("renderToSvg", () => {
    const outPath = join(TMP_DIR, "test-render.svg");

    it("writes both .mmd and .svg files", async () => {
      mkdirSync(TMP_DIR, { recursive: true });
      const { mmdPath, svgPath } = await renderToSvg("graph TD\n  A[Start] --> B[End]", outPath);

      expect(existsSync(mmdPath)).toBe(true);
      expect(existsSync(svgPath)).toBe(true);

      const mmdContent = readFileSync(mmdPath, "utf-8");
      expect(mmdContent).toContain("graph TD");

      const svgContent = readFileSync(svgPath, "utf-8");
      expect(svgContent).toContain("<svg");

      // Cleanup
      rmSync(TMP_DIR, { recursive: true, force: true });
    });
  });

  describe("renderFile", () => {
    it("renders an existing .mmd file to .svg", async () => {
      mkdirSync(TMP_DIR, { recursive: true });
      const mmdPath = join(TMP_DIR, "test.mmd");
      writeMermaidFile(mmdPath, "graph LR\n  X --> Y");

      const svgPath = await renderFile(mmdPath);
      expect(existsSync(svgPath)).toBe(true);
      expect(svgPath).toContain(".svg");

      const svgContent = readFileSync(svgPath, "utf-8");
      expect(svgContent).toContain("<svg");

      rmSync(TMP_DIR, { recursive: true, force: true });
    });
  });
});
