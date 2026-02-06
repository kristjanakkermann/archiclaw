/**
 * Mermaid diagram rendering for the Control UI.
 *
 * Uses post-render progressive enhancement: after the markdown pipeline
 * produces <code class="language-mermaid"> blocks, this module finds them
 * in the DOM and replaces with beautifully rendered SVG diagrams.
 *
 * Mermaid is loaded lazily via dynamic import to keep the initial bundle small.
 */

// Lazy-loaded mermaid instance
let mermaidReady: Promise<void> | null = null;
let renderCounter = 0;

// Track rendered containers to avoid duplicate processing
const processedContainers = new WeakSet<Element>();

type ResolvedTheme = "light" | "dark";

// --- EA-optimized Mermaid theme variables ---

const darkThemeVars = {
  primaryColor: "#ff5c5c",
  primaryBorderColor: "#3f3f46",
  primaryTextColor: "#e4e4e7",
  secondaryColor: "#14b8a6",
  secondaryBorderColor: "#27272a",
  secondaryTextColor: "#e4e4e7",
  tertiaryColor: "#1a1d25",
  tertiaryBorderColor: "#27272a",
  tertiaryTextColor: "#e4e4e7",
  lineColor: "#52525b",
  textColor: "#e4e4e7",
  mainBkg: "#181b22",
  nodeBorder: "#3f3f46",
  clusterBkg: "rgba(255,255,255,0.04)",
  clusterBorder: "#27272a",
  titleColor: "#fafafa",
  edgeLabelBackground: "#12141a",
  nodeTextColor: "#e4e4e7",
  // Sequence diagram
  actorBkg: "#181b22",
  actorBorder: "#3f3f46",
  actorTextColor: "#e4e4e7",
  actorLineColor: "#52525b",
  signalColor: "#e4e4e7",
  signalTextColor: "#e4e4e7",
  labelBoxBkgColor: "#181b22",
  labelBoxBorderColor: "#3f3f46",
  labelTextColor: "#e4e4e7",
  loopTextColor: "#e4e4e7",
  activationBorderColor: "#ff5c5c",
  activationBkgColor: "rgba(255,92,92,0.15)",
  sequenceNumberColor: "#12141a",
  // C4 diagram - professional EA palette
  personBkg: "#ff5c5c",
  personBorder: "#cc4a4a",
  // Class diagram
  classText: "#e4e4e7",
  // Pie
  pie1: "#ff5c5c",
  pie2: "#14b8a6",
  pie3: "#3b82f6",
  pie4: "#f59e0b",
  pie5: "#a855f7",
  pie6: "#22c55e",
  pie7: "#ec4899",
  // Font
  fontFamily: '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const lightThemeVars = {
  primaryColor: "#dc2626",
  primaryBorderColor: "#d4d4d8",
  primaryTextColor: "#3f3f46",
  secondaryColor: "#0d9488",
  secondaryBorderColor: "#e4e4e7",
  secondaryTextColor: "#3f3f46",
  tertiaryColor: "#f5f5f5",
  tertiaryBorderColor: "#e4e4e7",
  tertiaryTextColor: "#3f3f46",
  lineColor: "#a1a1aa",
  textColor: "#3f3f46",
  mainBkg: "#ffffff",
  nodeBorder: "#d4d4d8",
  clusterBkg: "rgba(0,0,0,0.03)",
  clusterBorder: "#e4e4e7",
  titleColor: "#18181b",
  edgeLabelBackground: "#fafafa",
  nodeTextColor: "#3f3f46",
  // Sequence diagram
  actorBkg: "#ffffff",
  actorBorder: "#d4d4d8",
  actorTextColor: "#3f3f46",
  actorLineColor: "#a1a1aa",
  signalColor: "#3f3f46",
  signalTextColor: "#3f3f46",
  labelBoxBkgColor: "#ffffff",
  labelBoxBorderColor: "#d4d4d8",
  labelTextColor: "#3f3f46",
  loopTextColor: "#3f3f46",
  activationBorderColor: "#dc2626",
  activationBkgColor: "rgba(220,38,38,0.12)",
  sequenceNumberColor: "#ffffff",
  // C4
  personBkg: "#dc2626",
  personBorder: "#b91c1c",
  // Class
  classText: "#3f3f46",
  // Pie
  pie1: "#dc2626",
  pie2: "#0d9488",
  pie3: "#2563eb",
  pie4: "#d97706",
  pie5: "#7c3aed",
  pie6: "#16a34a",
  pie7: "#db2777",
  // Font
  fontFamily: '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

function getTheme(): ResolvedTheme {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" ? "light" : "dark";
}

async function ensureMermaid(): Promise<void> {
  if (mermaidReady) {
    return mermaidReady;
  }
  mermaidReady = (async () => {
    const { default: mermaid } = await import("mermaid");
    const theme = getTheme();
    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      themeVariables: theme === "dark" ? darkThemeVars : lightThemeVars,
      securityLevel: "strict",
      fontFamily:
        '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      flowchart: { htmlLabels: true, curve: "basis", padding: 15 },
      sequence: {
        diagramMarginX: 16,
        diagramMarginY: 16,
        actorMargin: 60,
        mirrorActors: true,
      },
    });
  })();
  return mermaidReady;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- SVG export ---

function exportSvg(svgContent: string, name: string): void {
  const blob = new Blob([svgContent], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- Fullscreen viewer ---

function showFullscreen(svgContent: string): void {
  const overlay = document.createElement("div");
  overlay.className = "mermaid-fullscreen-overlay";
  overlay.innerHTML = [
    '<div class="mermaid-fullscreen-content">',
    '  <button class="mermaid-fullscreen-close" title="Close (Esc)">',
    '    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    "  </button>",
    `  <div class="mermaid-fullscreen-diagram">${svgContent}</div>`,
    "</div>",
  ].join("\n");

  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      close();
    }
  };

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      close();
    }
  });
  overlay.querySelector(".mermaid-fullscreen-close")?.addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  document.body.appendChild(overlay);
}

// --- Core rendering ---

async function renderDiagram(code: string, container: HTMLElement): Promise<void> {
  try {
    await ensureMermaid();
    const { default: mermaid } = await import("mermaid");

    // Re-initialize if theme changed since last init
    const theme = getTheme();
    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      themeVariables: theme === "dark" ? darkThemeVars : lightThemeVars,
      securityLevel: "strict",
    });

    const id = `mermaid-${++renderCounter}`;
    const { svg } = await mermaid.render(id, code.trim());

    container.innerHTML = [
      '<div class="mermaid-rendered">',
      `  <div class="mermaid-svg-wrap">${svg}</div>`,
      '  <div class="mermaid-actions">',
      '    <button class="mermaid-action-btn mermaid-export-svg" title="Export as SVG">',
      '      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
      "      SVG",
      "    </button>",
      '    <button class="mermaid-action-btn mermaid-fullscreen-btn" title="View fullscreen">',
      '      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
      "    </button>",
      "  </div>",
      "</div>",
    ].join("\n");

    container
      .querySelector(".mermaid-export-svg")
      ?.addEventListener("click", () => exportSvg(svg, id));
    container
      .querySelector(".mermaid-fullscreen-btn")
      ?.addEventListener("click", () => showFullscreen(svg));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to render diagram";
    container.innerHTML = [
      '<div class="mermaid-error">',
      '  <div class="mermaid-error-label">Diagram rendering error</div>',
      `  <div class="mermaid-error-message">${escapeHtml(msg)}</div>`,
      `  <pre class="mermaid-error-source"><code>${escapeHtml(code.trim())}</code></pre>`,
      "</div>",
    ].join("\n");
  }
}

// --- Public API ---

/**
 * Scan a container for <code class="language-mermaid"> blocks
 * and replace them with rendered Mermaid SVG diagrams.
 *
 * Safe to call repeatedly; already-processed containers are skipped.
 */
export function processMermaidInContainer(container: HTMLElement): void {
  if (processedContainers.has(container)) {
    return;
  }

  const codeBlocks = container.querySelectorAll("code.language-mermaid");
  if (codeBlocks.length === 0) {
    return;
  }

  processedContainers.add(container);

  for (const codeEl of codeBlocks) {
    const pre = codeEl.parentElement;
    if (!pre || pre.tagName !== "PRE") {
      continue;
    }

    const code = codeEl.textContent || "";
    if (!code.trim()) {
      continue;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "mermaid-container";
    wrapper.innerHTML = [
      '<div class="mermaid-loading">',
      '  <div class="mermaid-loading-spinner"></div>',
      "  <span>Rendering diagram\u2026</span>",
      "</div>",
    ].join("\n");

    pre.replaceWith(wrapper);
    renderDiagram(code, wrapper);
  }
}

/** Quick check whether markdown text contains any mermaid fenced blocks. */
export function containsMermaid(text: string): boolean {
  return /```mermaid\b/i.test(text);
}
