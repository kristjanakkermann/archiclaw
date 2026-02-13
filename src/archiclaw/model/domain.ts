import { z } from "zod";
import { ApplicationIdSchema, CapabilityIdSchema, DomainIdSchema } from "./ids.js";

export const DomainDefinitionSchema = z
  .object({
    id: DomainIdSchema,
    name: z.string().min(1),
    description: z.string(),
    lead: z.string(),
    capabilities: z.array(CapabilityIdSchema),
    applications: z.array(ApplicationIdSchema),
  })
  .strict();

export type DomainDefinition = z.infer<typeof DomainDefinitionSchema>;

export const DomainRegistryEntrySchema = z
  .object({
    id: DomainIdSchema,
    name: z.string().min(1),
    lead: z.string(),
  })
  .strict();

export const DomainRegistrySchema = z
  .object({
    domains: z.array(DomainRegistryEntrySchema),
  })
  .strict();

export type DomainRegistry = z.infer<typeof DomainRegistrySchema>;
