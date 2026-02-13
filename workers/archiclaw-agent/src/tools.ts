/**
 * ArchiClaw AI tools for the Cloudflare Worker agent.
 * Each tool queries the bundled landscape data and returns structured results.
 * Mermaid diagram tools return raw source text (rendered client-side).
 */

import { tool } from "ai";
import { z } from "zod";
import {
  getApplication,
  getApplicationsByDomain,
  getIntegrationsForApp,
  getIntegrationsBetween,
  getDataEntitiesByDomain,
  getDataEntitiesForApp,
  getCapabilitiesByDomain,
  landscape,
  searchLandscape as doSearch,
} from "./landscape-loader.js";

// Reuse the Archimate color + template logic inline (pure functions, no fs deps)
function archimateInit(): string {
  return `%%{init: {'theme': 'base', 'themeVariables': {
  'primaryColor': '#B5D8FF',
  'primaryBorderColor': '#4A90D9',
  'primaryTextColor': '#333333',
  'secondaryColor': '#FFFFB5',
  'tertiaryColor': '#C9E7B7',
  'lineColor': '#666666',
  'fontSize': '14px'
}}}%%`;
}

function archimateStyles(): string {
  const colors: Record<string, { fill: string; stroke: string; text: string }> = {
    business: { fill: "#FFFFB5", stroke: "#C8C800", text: "#333333" },
    application: { fill: "#B5D8FF", stroke: "#4A90D9", text: "#333333" },
    technology: { fill: "#C9E7B7", stroke: "#5B9A3C", text: "#333333" },
    current: { fill: "#E8E8E8", stroke: "#999999", text: "#333333" },
    target: { fill: "#D4EDDA", stroke: "#28A745", text: "#333333" },
    impacted: { fill: "#FFD6D6", stroke: "#DC3545", text: "#333333" },
  };
  return Object.entries(colors)
    .map(([layer, c]) => `classDef ${layer} fill:${c.fill},stroke:${c.stroke},color:${c.text}`)
    .join("\n  ");
}

export const tools = {
  queryApplicationsByDomain: tool({
    description:
      "List all applications in a given business domain (e.g. FIN, HR, SALES). Returns ID, name, status, hosting model, and tech stack for each.",
    parameters: z.object({
      domainId: z.string().describe("Domain ID (e.g. FIN, HR, SALES, CORE, IT)"),
    }),
    execute: async ({ domainId }) => {
      const apps = getApplicationsByDomain(domainId);
      if (apps.length === 0) {
        return { found: false, message: `No applications found in domain '${domainId}'.` };
      }
      return {
        found: true,
        domain: domainId.toUpperCase(),
        count: apps.length,
        applications: apps.map((app) => ({
          id: app.id,
          name: app.name,
          status: app.status,
          hosting: app.technology.hosting,
          stack: app.technology.stack,
        })),
      };
    },
  }),

  getApplicationPassport: tool({
    description:
      "Get the full passport (detailed profile) for a specific application by ID. Includes owners, technology stack, integrations, compliance, and SLA.",
    parameters: z.object({
      applicationId: z.string().describe("Application ID (e.g. FIN-APP-001)"),
    }),
    execute: async ({ applicationId }) => {
      const app = getApplication(applicationId);
      if (!app) {
        return { found: false, message: `Application '${applicationId}' not found.` };
      }
      return { found: true, passport: app };
    },
  }),

  queryIntegrations: tool({
    description:
      "Find integrations for a specific application, or between two applications. Returns source, target, type, direction, protocol, and description.",
    parameters: z.object({
      applicationId: z.string().describe("Primary application ID"),
      targetApplicationId: z
        .string()
        .optional()
        .describe("Optional second application ID to find integrations between the two"),
    }),
    execute: async ({ applicationId, targetApplicationId }) => {
      const integrations = targetApplicationId
        ? getIntegrationsBetween(applicationId, targetApplicationId)
        : getIntegrationsForApp(applicationId);

      if (integrations.length === 0) {
        const scope = targetApplicationId
          ? `between '${applicationId}' and '${targetApplicationId}'`
          : `for '${applicationId}'`;
        return { found: false, message: `No integrations found ${scope}.` };
      }
      return { found: true, count: integrations.length, integrations };
    },
  }),

  queryDataEntities: tool({
    description:
      "Find data entities by domain or by application. Returns entity details including which applications use them and their CRUD roles.",
    parameters: z.object({
      domainId: z.string().optional().describe("Domain ID to filter by"),
      applicationId: z.string().optional().describe("Application ID to find entities used by"),
    }),
    execute: async ({ domainId, applicationId }) => {
      let entities;
      if (applicationId) {
        entities = getDataEntitiesForApp(applicationId);
      } else if (domainId) {
        entities = getDataEntitiesByDomain(domainId);
      } else {
        entities = landscape.dataEntities;
      }

      if (entities.length === 0) {
        return { found: false, message: "No data entities found for the given criteria." };
      }
      return { found: true, count: entities.length, entities };
    },
  }),

  queryCapabilities: tool({
    description:
      "List business capabilities for a given domain. Returns ID, name, description, and level.",
    parameters: z.object({
      domainId: z.string().describe("Domain ID (e.g. FIN, HR, SALES, CORE, IT)"),
    }),
    execute: async ({ domainId }) => {
      const caps = getCapabilitiesByDomain(domainId);
      if (caps.length === 0) {
        return { found: false, message: `No capabilities found in domain '${domainId}'.` };
      }
      return {
        found: true,
        domain: domainId.toUpperCase(),
        count: caps.length,
        capabilities: caps,
      };
    },
  }),

  generateMermaidDiagram: tool({
    description:
      "Generate a Mermaid diagram for an application. Supports 'c4context' (system context with integrations) and 'comparison' (current vs target state). Returns raw Mermaid source text for client-side rendering.",
    parameters: z.object({
      applicationId: z.string().describe("Application ID for the diagram"),
      diagramType: z
        .enum(["c4context", "comparison"])
        .describe(
          "Type of diagram: 'c4context' for system context, 'comparison' for current vs target",
        ),
      targetNodes: z
        .array(z.object({ id: z.string(), label: z.string() }))
        .optional()
        .describe("Target state nodes (only for comparison diagrams)"),
    }),
    execute: async ({ applicationId, diagramType, targetNodes }) => {
      const app = getApplication(applicationId);
      if (!app) {
        return { error: `Application '${applicationId}' not found.` };
      }

      if (diagramType === "c4context") {
        const integrations = getIntegrationsForApp(applicationId);
        const extSystems = integrations.map((i) => {
          const otherId = i.source === applicationId ? i.target : i.source;
          const otherApp = getApplication(otherId);
          // Direction is relative to source→target in the integration entry.
          // When queried app is the target, flip the perspective.
          const dir = (() => {
            if (i.direction === "bidirectional") return "bidirectional";
            if (i.source === applicationId) {
              return i.direction === "outbound" ? "outbound" : "inbound";
            }
            return i.direction === "outbound" ? "inbound" : "outbound";
          })();
          return { name: otherApp?.name ?? otherId, direction: dir };
        });

        const lines = [
          archimateInit(),
          "C4Context",
          `  title System Context - ${app.name}`,
          "",
          `  System(target, "${app.name}", "${app.technology.stack.join(", ")}")`,
        ];
        for (const ext of extSystems) {
          const id = ext.name.replace(/\s+/g, "_").toLowerCase();
          lines.push(`  System_Ext(${id}, "${ext.name}", "External system")`);
        }
        lines.push("");
        for (const ext of extSystems) {
          const id = ext.name.replace(/\s+/g, "_").toLowerCase();
          if (ext.direction === "inbound") {
            lines.push(`  Rel(${id}, target, "sends data")`);
          } else if (ext.direction === "outbound") {
            lines.push(`  Rel(target, ${id}, "sends data")`);
          } else {
            lines.push(`  BiRel(target, ${id}, "exchanges data")`);
          }
        }

        return { diagramType: "c4context", mermaid: lines.join("\n") };
      }

      // comparison diagram
      const currentNodes = app.integrations.map((i) => ({
        id: i.target.replace(/-/g, "_"),
        label: getApplication(i.target)?.name ?? i.target,
      }));

      const tgtNodes = targetNodes ?? currentNodes;

      const lines = [
        archimateInit(),
        "flowchart LR",
        `  subgraph current["Current State - ${app.name}"]`,
      ];
      for (const node of currentNodes) {
        lines.push(`    ${node.id}_cur["${node.label}"]:::current`);
      }
      lines.push("  end");
      lines.push(`  subgraph target_state["Target State - ${app.name}"]`);
      for (const node of tgtNodes) {
        lines.push(`    ${node.id}_tgt["${node.label}"]:::target`);
      }
      lines.push("  end");
      lines.push("");

      // Edges: connect current nodes to their matching target nodes
      for (const curNode of currentNodes) {
        const matchingTarget = tgtNodes.find((t) => t.id === curNode.id);
        if (matchingTarget) {
          lines.push(`  ${curNode.id}_cur -.->|"evolves to"| ${curNode.id}_tgt`);
        }
      }
      // Highlight nodes that only exist in the target (new additions)
      for (const tgtNode of tgtNodes) {
        if (!currentNodes.some((c) => c.id === tgtNode.id)) {
          lines.push(`  new_${tgtNode.id}(("NEW")):::impacted -.-> ${tgtNode.id}_tgt`);
        }
      }
      lines.push("");
      lines.push(`  ${archimateStyles()}`);

      return { diagramType: "comparison", mermaid: lines.join("\n") };
    },
  }),

  validateLandscape: tool({
    description:
      "Run schema validation on the bundled landscape data. Returns whether the data is valid and any issues found.",
    parameters: z.object({}),
    execute: async () => {
      return {
        ...landscape.validationResult,
        stats: landscape.stats,
      };
    },
  }),

  searchLandscape: tool({
    description:
      "Full-text search across all landscape entities (applications, domains, capabilities, data entities, integrations). Case-insensitive.",
    parameters: z.object({
      query: z.string().describe("Search query (searches names, IDs, descriptions, tech stacks)"),
    }),
    execute: async ({ query }) => {
      const results = doSearch(query);
      const totalHits =
        results.applications.length +
        results.domains.length +
        results.capabilities.length +
        results.dataEntities.length +
        results.integrations.length;

      if (totalHits === 0) {
        return { found: false, message: `No results for '${query}'.` };
      }
      return {
        found: true,
        totalHits,
        results: {
          applications: results.applications.map((a) => ({
            id: a.id,
            name: a.name,
            domain: a.domain,
          })),
          domains: results.domains.map((d) => ({ id: d.id, name: d.name })),
          capabilities: results.capabilities.map((c) => ({
            id: c.id,
            name: c.name,
            domain: c.domain,
          })),
          dataEntities: results.dataEntities.map((e) => ({
            id: e.id,
            name: e.name,
            domain: e.domain,
          })),
          integrations: results.integrations.map((i) => ({
            source: i.source,
            target: i.target,
            description: i.description,
          })),
        },
      };
    },
  }),
};
