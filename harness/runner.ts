/**
 * ArchiClaw Skill Evaluation Harness Runner
 *
 * Runs evaluations for individual skills or all skills.
 * Tracks scores over time to measure quality improvements.
 *
 * Usage:
 *   bun harness/runner.ts                    # Run all skill evals
 *   bun harness/runner.ts --skill interview  # Run specific skill
 *   bun harness/runner.ts --report           # Print score summary
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const HARNESS_DIR = import.meta.dirname ?? new URL(".", import.meta.url).pathname;
const EVALS_DIR = join(HARNESS_DIR, "evals");
const SCORES_DIR = join(HARNESS_DIR, ".scores");

export interface EvalCriterion {
  name: string;
  description: string;
  weight: number;
}

export interface EvalDefinition {
  skill: string;
  criteria: EvalCriterion[];
}

export interface EvalScore {
  skill: string;
  example: string;
  timestamp: string;
  scores: Record<string, number>; // criterion name → 0-1 score
  weighted_total: number;
  pass: boolean;
}

export interface EvalReport {
  timestamp: string;
  skills: Record<
    string,
    {
      examples_run: number;
      examples_passed: number;
      average_score: number;
      criterion_averages: Record<string, number>;
    }
  >;
}

/** Load an eval definition from eval.yaml */
export function loadEvalDefinition(skillName: string): EvalDefinition {
  const evalPath = join(EVALS_DIR, skillName, "eval.yaml");
  const raw = readFileSync(evalPath, "utf-8");
  const parsed = parse(raw) as { criteria: EvalCriterion[] };
  return { skill: skillName, criteria: parsed.criteria };
}

/** List all skills that have eval definitions */
export function listEvalSkills(): string[] {
  if (!existsSync(EVALS_DIR)) return [];
  return readdirSync(EVALS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => existsSync(join(EVALS_DIR, d.name, "eval.yaml")))
    .map((d) => d.name);
}

/** List example scenarios for a skill */
export function listExamples(skillName: string): string[] {
  const examplesDir = join(EVALS_DIR, skillName, "examples");
  if (!existsSync(examplesDir)) return [];
  return readdirSync(examplesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

/** Compute weighted score from individual criterion scores */
export function computeWeightedScore(
  criteria: EvalCriterion[],
  scores: Record<string, number>,
): number {
  let total = 0;
  let weightSum = 0;
  for (const c of criteria) {
    const score = scores[c.name] ?? 0;
    total += score * c.weight;
    weightSum += c.weight;
  }
  return weightSum > 0 ? total / weightSum : 0;
}

/** Save a score result */
export function saveScore(score: EvalScore): void {
  mkdirSync(SCORES_DIR, { recursive: true });
  const filePath = join(SCORES_DIR, `${score.skill}.jsonl`);
  const line = JSON.stringify(score) + "\n";
  writeFileSync(filePath, line, { flag: "a" });
}

/** Load historical scores for a skill */
export function loadScores(skillName: string): EvalScore[] {
  const filePath = join(SCORES_DIR, `${skillName}.jsonl`);
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, "utf-8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as EvalScore);
}

/** Generate a summary report across all skills */
export function generateReport(): EvalReport {
  const skills = listEvalSkills();
  const report: EvalReport = {
    timestamp: new Date().toISOString(),
    skills: {},
  };

  for (const skill of skills) {
    const scores = loadScores(skill);
    if (scores.length === 0) {
      report.skills[skill] = {
        examples_run: 0,
        examples_passed: 0,
        average_score: 0,
        criterion_averages: {},
      };
      continue;
    }

    // Use only the latest run for each example
    const latestByExample = new Map<string, EvalScore>();
    for (const score of scores) {
      const existing = latestByExample.get(score.example);
      if (!existing || score.timestamp > existing.timestamp) {
        latestByExample.set(score.example, score);
      }
    }

    const latest = [...latestByExample.values()];
    const criterionTotals: Record<string, { sum: number; count: number }> = {};

    for (const score of latest) {
      for (const [name, value] of Object.entries(score.scores)) {
        if (!criterionTotals[name]) criterionTotals[name] = { sum: 0, count: 0 };
        criterionTotals[name].sum += value;
        criterionTotals[name].count++;
      }
    }

    const criterionAverages: Record<string, number> = {};
    for (const [name, totals] of Object.entries(criterionTotals)) {
      criterionAverages[name] = totals.count > 0 ? totals.sum / totals.count : 0;
    }

    report.skills[skill] = {
      examples_run: latest.length,
      examples_passed: latest.filter((s) => s.pass).length,
      average_score: latest.reduce((sum, s) => sum + s.weighted_total, 0) / latest.length,
      criterion_averages: criterionAverages,
    };
  }

  return report;
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("runner.ts")) {
  const args = process.argv.slice(2);
  const skillFlag = args.indexOf("--skill");
  const reportFlag = args.includes("--report");

  if (reportFlag) {
    const report = generateReport();
    console.log(JSON.stringify(report, null, 2));
  } else if (skillFlag !== -1 && args[skillFlag + 1]) {
    const skill = args[skillFlag + 1];
    console.log(`Run evaluations for skill: ${skill}`);
    console.log(`Examples: ${listExamples(skill).join(", ") || "(none)"}`);
    console.log(`\nUse 'pnpm test harness/evals/${skill}/eval.test.ts' to run the eval tests.`);
  } else {
    const skills = listEvalSkills();
    console.log(`ArchiClaw Skill Evaluation Harness`);
    console.log(`Skills with evals: ${skills.join(", ") || "(none)"}`);
    console.log(`\nRun all eval tests: pnpm test harness/`);
    console.log(`Run specific skill: bun harness/runner.ts --skill <name>`);
    console.log(`Show report: bun harness/runner.ts --report`);
  }
}
