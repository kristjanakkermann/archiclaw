#!/usr/bin/env node
/**
 * Thin CLI wrapper around the ArchiClaw Mermaid rendering utilities.
 *
 * Usage:
 *   bun src/archiclaw/render/cli.ts render <input.mmd> [--theme archimate|light|dark|nord|github]
 *   bun src/archiclaw/render/cli.ts c4 --app "App Name" --integrations integrations.yaml --out context.svg
 *   bun src/archiclaw/render/cli.ts current-vs-target --title "Title" --current current.yaml --target target.yaml --out compare.svg
 */

import { readFileSync } from "node:fs";
import { parse } from "yaml";
import {
  renderFile,
  renderToSvg,
  c4ContextTemplate,
  currentVsTargetTemplate,
  type PresetTheme,
} from "./mermaid.js";

function usage(): never {
  console.error(`Usage:
  render <input.mmd> [--theme archimate|light|dark|nord|github]
  c4 --app <name> --integrations <yaml> --out <output.svg>
  current-vs-target --title <title> --current <yaml> --target <yaml> --out <output.svg>`);
  process.exit(1);
}

function flag(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) usage();

  if (command === "render") {
    const input = args[1];
    if (!input) usage();
    const theme = (flag(args, "--theme") ?? "archimate") as PresetTheme;
    const svgPath = await renderFile(input, theme);
    console.log(svgPath);
  } else if (command === "c4") {
    const app = flag(args, "--app");
    const integrationsFile = flag(args, "--integrations");
    const out = flag(args, "--out");
    if (!app || !integrationsFile || !out) usage();

    const raw = parse(readFileSync(integrationsFile, "utf-8")) as {
      integrations: Array<{ target: string; direction: string }>;
    };
    const integrations = (raw.integrations ?? []).map((i) => ({
      name: i.target,
      direction: i.direction,
    }));

    const mmd = c4ContextTemplate(app, integrations);
    const theme = (flag(args, "--theme") ?? "archimate") as PresetTheme;
    const { svgPath } = await renderToSvg(mmd, out, theme);
    console.log(svgPath);
  } else if (command === "current-vs-target") {
    const title = flag(args, "--title");
    const currentFile = flag(args, "--current");
    const targetFile = flag(args, "--target");
    const out = flag(args, "--out");
    if (!title || !currentFile || !targetFile || !out) usage();

    const current = parse(readFileSync(currentFile, "utf-8")) as Array<{
      id: string;
      label: string;
    }>;
    const target = parse(readFileSync(targetFile, "utf-8")) as Array<{
      id: string;
      label: string;
    }>;

    const mmd = currentVsTargetTemplate(title, current, target);
    const theme = (flag(args, "--theme") ?? "archimate") as PresetTheme;
    const { svgPath } = await renderToSvg(mmd, out, theme);
    console.log(svgPath);
  } else {
    usage();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
