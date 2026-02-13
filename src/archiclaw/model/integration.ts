import { z } from "zod";
import { IntegrationDirectionSchema, IntegrationTypeSchema } from "./application.js";
import { ApplicationIdSchema } from "./ids.js";

export const IntegrationEntrySchema = z
  .object({
    source: ApplicationIdSchema,
    target: ApplicationIdSchema,
    type: IntegrationTypeSchema,
    direction: IntegrationDirectionSchema,
    protocol: z.string(),
    description: z.string(),
  })
  .strict();

export type IntegrationEntry = z.infer<typeof IntegrationEntrySchema>;

export const IntegrationRegistrySchema = z
  .object({
    integrations: z.array(IntegrationEntrySchema),
  })
  .strict();

export type IntegrationRegistry = z.infer<typeof IntegrationRegistrySchema>;
