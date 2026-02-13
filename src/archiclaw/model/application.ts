import { z } from "zod";
import { ApplicationIdSchema, DomainIdSchema } from "./ids.js";

export const AppStatusSchema = z.enum(["plan", "build", "run", "retire"]);

export const TogafLayerSchema = z.enum(["business", "application", "technology"]);

export const HostingModelSchema = z.enum(["on-premise", "cloud", "hybrid", "saas"]);

export const DataClassificationSchema = z.enum([
  "public",
  "internal",
  "confidential",
  "restricted",
]);

export const IntegrationTypeSchema = z.enum(["api", "file", "event", "database", "manual"]);

export const IntegrationDirectionSchema = z.enum(["inbound", "outbound", "bidirectional"]);

export const ApplicationIntegrationSchema = z
  .object({
    target: ApplicationIdSchema,
    type: IntegrationTypeSchema,
    direction: IntegrationDirectionSchema,
    protocol: z.string(),
  })
  .strict();

export type ApplicationIntegration = z.infer<typeof ApplicationIntegrationSchema>;

export const SlaSchema = z
  .object({
    availability: z.string(),
    rpo: z.string(),
    rto: z.string(),
  })
  .strict();

export const ApplicationPassportSchema = z
  .object({
    id: ApplicationIdSchema,
    name: z.string().min(1),
    domain: DomainIdSchema,
    status: AppStatusSchema,
    togaf_layer: TogafLayerSchema,
    owners: z
      .object({
        business: z.string(),
        technical: z.string(),
      })
      .strict(),
    technology: z
      .object({
        stack: z.array(z.string()),
        hosting: HostingModelSchema,
        data_classification: DataClassificationSchema,
      })
      .strict(),
    integrations: z.array(ApplicationIntegrationSchema),
    compliance: z.array(z.string()),
    sla: SlaSchema,
    created: z.string(), // ISO date string
    updated: z.string(),
  })
  .strict();

export type ApplicationPassport = z.infer<typeof ApplicationPassportSchema>;

export const ApplicationRegistryEntrySchema = z
  .object({
    id: ApplicationIdSchema,
    name: z.string().min(1),
    domain: DomainIdSchema,
  })
  .strict();

export const ApplicationRegistrySchema = z
  .object({
    applications: z.array(ApplicationRegistryEntrySchema),
  })
  .strict();

export type ApplicationRegistry = z.infer<typeof ApplicationRegistrySchema>;
