import { z } from "zod";
import { ApplicationIdSchema, DataEntityIdSchema, DomainIdSchema } from "./ids.js";

// CRUD + Master + Store operations
export const DataOperationSchema = z.enum(["M", "C", "R", "U", "D", "S"]);

export const DataRoleSchema = z.enum(["master", "consumer", "producer", "store"]);

export const AppDataMappingSchema = z
  .object({
    operations: z.array(DataOperationSchema),
    role: DataRoleSchema,
  })
  .strict();

export type AppDataMapping = z.infer<typeof AppDataMappingSchema>;

export const DataEntitySchema = z
  .object({
    id: DataEntityIdSchema,
    name: z.string().min(1),
    domain: DomainIdSchema,
    description: z.string(),
    applications: z.record(ApplicationIdSchema, AppDataMappingSchema),
  })
  .strict();

export type DataEntity = z.infer<typeof DataEntitySchema>;

export const DataEntityRegistrySchema = z
  .object({
    entities: z.array(
      z
        .object({
          id: DataEntityIdSchema,
          name: z.string().min(1),
          domain: DomainIdSchema,
        })
        .strict(),
    ),
  })
  .strict();

export type DataEntityRegistry = z.infer<typeof DataEntityRegistrySchema>;
