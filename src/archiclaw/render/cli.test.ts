import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";

const TMP_DIR = join(import.meta.dirname ?? ".", "..", "..", "..", ".tmp-test-cli");

beforeAll(() => mkdirSync(TMP_DIR, { recursive: true }));
afterAll(() => rmSync(TMP_DIR, { recursive: true, force: true }));

describe("render CLI", () => {
  it("renders a .mmd file to SVG", () => {
    const mmdPath = join(TMP_DIR, "simple.mmd");
    writeFileSync(mmdPath, "graph TD\n  A[Start] --> B[End]", "utf-8");

    const cliPath = join("src", "archiclaw", "render", "cli.ts");
    const result = execFileSync("bun", [cliPath, "render", mmdPath], {
      encoding: "utf-8",
      timeout: 30_000,
    }).trim();

    expect(result).toContain(".svg");
    expect(existsSync(result)).toBe(true);
  });
});
