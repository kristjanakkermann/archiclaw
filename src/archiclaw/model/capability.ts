import { z } from "zod";
import { CapabilityIdSchema, DomainIdSchema } from "./ids.js";

export const CapabilitySchema = z
  .object({
    id: CapabilityIdSchema,
    name: z.string().min(1),
    domain: DomainIdSchema,
    description: z.string(),
    parent: CapabilityIdSchema.optional(),
    level: z.number().int().min(0).max(4), // 0=L0 strategic, 4=L4 atomic
    children: z.array(CapabilityIdSchema),
  })
  .strict();

export type Capability = z.infer<typeof CapabilitySchema>;

export const CapabilityRegistrySchema = z
  .object({
    capabilities: z.array(CapabilitySchema),
  })
  .strict();

export type CapabilityRegistry = z.infer<typeof CapabilityRegistrySchema>;
