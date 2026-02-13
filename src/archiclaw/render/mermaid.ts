import type { RenderOptions } from "beautiful-mermaid";
import { renderMermaid, THEMES } from "beautiful-mermaid";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { parse } from "yaml";

/**
 * Archimate-aligned color palette for Mermaid diagrams.
 * Based on the ArchiMate 3.x specification color conventions.
 */
export const ARCHIMATE_COLORS = {
  business: { fill: "#FFFFB5", stroke: "#C8C800", text: "#333333" },
  application: { fill: "#B5D8FF", stroke: "#4A90D9", text: "#333333" },
  technology: { fill: "#C9E7B7", stroke: "#5B9A3C", text: "#333333" },
  motivation: { fill: "#CCCCFF", stroke: "#7B68EE", text: "#333333" },
  strategy: { fill: "#F5DEAA", stroke: "#D4A843", text: "#333333" },
  // Supplementary colors for diagrams
  current: { fill: "#E8E8E8", stroke: "#999999", text: "#333333" },
  target: { fill: "#D4EDDA", stroke: "#28A745", text: "#333333" },
  impacted: { fill: "#FFD6D6", stroke: "#DC3545", text: "#333333" },
  neutral: { fill: "#F8F9FA", stroke: "#6C757D", text: "#333333" },
} as const;

export type ArchimateLayer = keyof typeof ARCHIMATE_COLORS;

export type ArchimateColorEntry = { fill: string; stroke: string; text: string };
export type ArchimateColorPalette = Record<string, ArchimateColorEntry>;

/** Darken a hex color by a percentage (0-1). */
function darkenHex(hex: string, amount = 0.3): string {
  const h = hex.replace("#", "");
  const r = Math.max(0, Math.round(Number.parseInt(h.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(Number.parseInt(h.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(Number.parseInt(h.slice(4, 6), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Load archimate colors from landscape config.yaml, merged with defaults.
 * Config provides layer fill colors; stroke is derived by darkening ~30%.
 */
export function loadArchimateColors(landscapePath: string): ArchimateColorPalette {
  const configPath = join(landscapePath, ".archiclaw", "config.yaml");
  const palette: ArchimateColorPalette = { ...ARCHIMATE_COLORS };

  if (!existsSync(configPath)) {
    return palette;
  }

  try {
    const config = parse(readFileSync(configPath, "utf-8")) as {
      archimate_colors?: Record<string, string>;
    };
    if (!config.archimate_colors) {
      return palette;
    }

    for (const [layer, fill] of Object.entries(config.archimate_colors)) {
      palette[layer] = {
        fill,
        stroke: darkenHex(fill),
        text: "#333333",
      };
    }
  } catch {
    // Fall back to defaults on parse error
  }

  return palette;
}

/**
 * Archimate-inspired theme for beautiful-mermaid.
 * Uses the application layer blue as the primary surface color
 * with dark foreground for readability.
 */
export const ARCHIMATE_THEME: RenderOptions = {
  bg: "#FFFFFF",
  fg: "#333333",
  line: "#666666",
  accent: ARCHIMATE_COLORS.application.stroke,
  muted: "#6C757D",
  surface: ARCHIMATE_COLORS.application.fill,
  border: ARCHIMATE_COLORS.application.stroke,
  font: "Inter",
};

/** Available preset themes for rendering. */
export const PRESET_THEMES = {
  archimate: ARCHIMATE_THEME,
  light: THEMES["github-light"],
  dark: THEMES["zinc-dark"],
  nord: THEMES["nord"],
  github: THEMES["github-light"],
} as const;

export type PresetTheme = keyof typeof PRESET_THEMES;

/**
 * Generate Mermaid theme directives for Archimate-style diagrams.
 * Embeds theme variables directly in the .mmd source for standalone rendering.
 */
export function archimateInit(colors: ArchimateColorPalette = ARCHIMATE_COLORS): string {
  return `%%{init: {'theme': 'base', 'themeVariables': {
  'primaryColor': '${colors.application.fill}',
  'primaryBorderColor': '${colors.application.stroke}',
  'primaryTextColor': '${colors.application.text}',
  'secondaryColor': '${colors.business.fill}',
  'tertiaryColor': '${colors.technology.fill}',
  'lineColor': '#666666',
  'fontSize': '14px'
}}}%%`;
}

/**
 * Generate Mermaid style class definitions for Archimate layers.
 */
export function archimateStyles(colors: ArchimateColorPalette = ARCHIMATE_COLORS): string {
  const lines: string[] = [];
  for (const [layer, layerColors] of Object.entries(colors)) {
    lines.push(
      `classDef ${layer} fill:${layerColors.fill},stroke:${layerColors.stroke},color:${layerColors.text}`,
    );
  }
  return lines.join("\n  ");
}

/** Wrap a Mermaid diagram body with Archimate theming. */
export function wrapWithTheme(diagramBody: string): string {
  return `${archimateInit()}\n${diagramBody}`;
}

/**
 * Read a .mmd file and return its contents.
 */
export function readMermaidFile(filePath: string): string {
  return readFileSync(filePath, "utf-8");
}

/**
 * Write Mermaid diagram content to a .mmd file.
 */
export function writeMermaidFile(filePath: string, content: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf-8");
}

/**
 * Render Mermaid source to an SVG string using beautiful-mermaid.
 */
export async function renderSvgString(
  mmdContent: string,
  theme: PresetTheme | RenderOptions = "archimate",
): Promise<string> {
  const options = typeof theme === "string" ? PRESET_THEMES[theme] : theme;
  return renderMermaid(mmdContent, options);
}

/**
 * Render a Mermaid diagram to SVG file. Also writes the .mmd source alongside it.
 *
 * @param mmdContent - Mermaid diagram source
 * @param outputPath - Destination path (with .svg extension)
 * @param theme - Theme preset name or custom RenderOptions
 * @returns Paths to both the .mmd source and rendered .svg
 */
export async function renderToSvg(
  mmdContent: string,
  outputPath: string,
  theme: PresetTheme | RenderOptions = "archimate",
): Promise<{ mmdPath: string; svgPath: string }> {
  const mmdPath = outputPath.replace(/\.svg$/, ".mmd");
  const svgPath = outputPath.endsWith(".svg") ? outputPath : `${outputPath}.svg`;

  // Write .mmd source
  writeMermaidFile(mmdPath, mmdContent);

  // Render to SVG via beautiful-mermaid
  const svg = await renderSvgString(mmdContent, theme);
  mkdirSync(dirname(svgPath), { recursive: true });
  writeFileSync(svgPath, svg, "utf-8");

  return { mmdPath, svgPath };
}

/**
 * Render a .mmd file to SVG. Reads the source, renders, writes .svg next to it.
 */
export async function renderFile(
  mmdFilePath: string,
  theme: PresetTheme | RenderOptions = "archimate",
): Promise<string> {
  const mmdContent = readMermaidFile(mmdFilePath);
  const svgPath = mmdFilePath.replace(/\.mmd$/, ".svg");
  const svg = await renderSvgString(mmdContent, theme);
  mkdirSync(dirname(svgPath), { recursive: true });
  writeFileSync(svgPath, svg, "utf-8");
  return svgPath;
}

// Diagram template generators

/** Generate a C4 context diagram for an application. */
export function c4ContextTemplate(
  appName: string,
  integrations: Array<{ name: string; direction: string }>,
  colors: ArchimateColorPalette = ARCHIMATE_COLORS,
): string {
  const app = colors.application;
  const lines = [
    "C4Context",
    `  title System Context - ${appName}`,
    "",
    `  System(target, "${appName}", "Target system")`,
  ];

  for (const int of integrations) {
    const id = int.name.replace(/\s+/g, "_").toLowerCase();
    lines.push(`  System_Ext(${id}, "${int.name}", "External system")`);
  }

  lines.push("");
  for (const int of integrations) {
    const id = int.name.replace(/\s+/g, "_").toLowerCase();
    if (int.direction === "inbound") {
      lines.push(`  Rel(${id}, target, "sends data")`);
    } else if (int.direction === "outbound") {
      lines.push(`  Rel(target, ${id}, "sends data")`);
    } else {
      lines.push(`  BiRel(target, ${id}, "exchanges data")`);
    }
  }

  // C4-specific styling (%%{init:} base theme has no effect on C4 diagrams)
  lines.push("");
  lines.push(
    `  UpdateElementStyle(target, $bgColor="${app.fill}", $fontColor="${app.text}", $borderColor="${app.stroke}")`,
  );
  for (const int of integrations) {
    const id = int.name.replace(/\s+/g, "_").toLowerCase();
    lines.push(
      `  UpdateElementStyle(${id}, $bgColor="${colors.neutral.fill}", $fontColor="${colors.neutral.text}", $borderColor="${colors.neutral.stroke}")`,
    );
  }

  return lines.join("\n");
}

/** Generate a current-vs-target state comparison diagram. */
export function currentVsTargetTemplate(
  title: string,
  currentNodes: Array<{ id: string; label: string }>,
  targetNodes: Array<{ id: string; label: string }>,
  colors: ArchimateColorPalette = ARCHIMATE_COLORS,
): string {
  const lines = [
    "---",
    `title: ${title}`,
    "---",
    archimateInit(colors),
    "flowchart LR",
    `  subgraph current["Current State"]`,
  ];

  for (const node of currentNodes) {
    lines.push(`    ${node.id}_cur["${node.label}"]:::current`);
  }
  lines.push("  end");
  lines.push(`  subgraph target_state["Target State"]`);

  for (const node of targetNodes) {
    lines.push(`    ${node.id}_tgt["${node.label}"]:::target`);
  }
  lines.push("  end");
  lines.push("");
  lines.push(`  ${archimateStyles(colors)}`);

  return lines.join("\n");
}
