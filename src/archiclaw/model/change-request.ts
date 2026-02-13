import { z } from "zod";
import { DataClassificationSchema } from "./application.js";
import {
  ApplicationIdSchema,
  CapabilityIdSchema,
  ChangeRequestIdSchema,
  DomainIdSchema,
} from "./ids.js";

export const ChangeStatusSchema = z.enum([
  "draft",
  "review",
  "approved",
  "rejected",
  "implemented",
]);

export const CostLevelSchema = z.enum(["low", "medium", "high"]);

export const RiskLevelSchema = z.enum(["low", "medium", "high"]);

export const DecisionTierSchema = z.enum(["eac", "peer", "individual"]);

export const DiagramTypeSchema = z.enum([
  "arch-change",
  "context-c4",
  "capability-impact",
  "data-flow",
  "current-vs-target",
]);

export const DiagramArtifactSchema = z
  .object({
    type: DiagramTypeSchema,
    file: z.string(), // relative path to .mmd file
  })
  .strict();

export const ImpactSchema = z
  .object({
    cost: CostLevelSchema,
    risk: RiskLevelSchema,
    data_sensitivity: DataClassificationSchema,
    affected_systems_count: z.number().int().nonnegative(),
    recommended_tier: DecisionTierSchema,
  })
  .strict();

export type Impact = z.infer<typeof ImpactSchema>;

export const PushTargetsSchema = z
  .object({
    jira_issue: z.string(),
    confluence_page: z.string(),
  })
  .strict();

export const ChangeRequestSchema = z
  .object({
    id: ChangeRequestIdSchema,
    title: z.string().min(1),
    domain: DomainIdSchema,
    status: ChangeStatusSchema,
    created: z.string(),
    author: z.string(),
    applications: z
      .object({
        primary: ApplicationIdSchema,
        affected: z.array(ApplicationIdSchema),
      })
      .strict(),
    capabilities_affected: z.array(CapabilityIdSchema),
    impact: ImpactSchema,
    decision_tier: DecisionTierSchema,
    artifacts: z
      .object({
        diagrams: z.array(DiagramArtifactSchema),
        data_matrix: z.string(),
        adr: z.string(),
      })
      .strict(),
    push: PushTargetsSchema,
  })
  .strict();

export type ChangeRequest = z.infer<typeof ChangeRequestSchema>;
