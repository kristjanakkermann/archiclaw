import { z } from "zod";
import { ApplicationIdSchema, CapabilityIdSchema, ChangeRequestIdSchema } from "./ids.js";

export const AdrStatusSchema = z.enum(["proposed", "accepted", "deprecated", "superseded"]);

export const AdrMetadataSchema = z
  .object({
    change_id: ChangeRequestIdSchema,
    title: z.string().min(1),
    date: z.string(),
    status: AdrStatusSchema,
    applications_affected: z.array(ApplicationIdSchema),
    capabilities_affected: z.array(CapabilityIdSchema),
    supersedes: ChangeRequestIdSchema.optional(),
    superseded_by: ChangeRequestIdSchema.optional(),
  })
  .strict();

export type AdrMetadata = z.infer<typeof AdrMetadataSchema>;
