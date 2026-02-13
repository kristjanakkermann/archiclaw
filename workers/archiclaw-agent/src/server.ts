/**
 * ArchiClaw Cloudflare Agent -- enterprise architecture advisor.
 *
 * Uses the Agents SDK (AIChatAgent on Durable Objects) with OpenAI via
 * the Vercel AI SDK. Landscape data is bundled at build time as JSON.
 */

import { createOpenAI } from "@ai-sdk/openai";
import { routeAgentRequest } from "agents";
import { AIChatAgent } from "agents/ai-chat-agent";
import { streamText } from "ai";
import { getLandscapeSummary, landscape } from "./landscape-loader.js";
import { tools } from "./tools.js";

interface Env {
  OPENAI_API_KEY: string;
  MODEL: string;
  ENVIRONMENT: string;
  ArchiClawChat: DurableObjectNamespace;
}

const SYSTEM_PROMPT = `You are ArchiClaw, an enterprise architecture advisor for an organization's IT landscape.

You have access to the following landscape data:
- ${landscape.stats.domains} business domains
- ${landscape.stats.applications} applications with full passports
- ${landscape.stats.capabilities} business capabilities
- ${landscape.stats.integrations} integration flows
- ${landscape.stats.dataEntities} data entities

Your role:
1. Answer questions about the application landscape, integrations, data flows, and capabilities.
2. Generate Mermaid diagrams (C4 context, current-vs-target comparisons) when asked to visualize architecture.
3. Provide architecture recommendations based on the landscape data.
4. Help identify risks, gaps, and improvement opportunities.

Guidelines:
- Always use the provided tools to query landscape data. Do not make up application details.
- When generating diagrams, return the Mermaid source. The UI will render it.
- Reference specific application IDs (e.g. FIN-APP-001) when discussing applications.
- Be precise about integration types, directions, and protocols.
- When asked about domains, list the domain's applications and capabilities.
- For data questions, explain the CRUD roles and master/consumer relationships.`;

export class ArchiClawChat extends AIChatAgent<Env> {
  async onChatMessage(onFinish: Parameters<AIChatAgent<Env>["onChatMessage"]>[0]) {
    const openai = createOpenAI({ apiKey: this.env.OPENAI_API_KEY });
    const model = openai(this.env.MODEL || "gpt-4o");

    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages: this.messages,
      tools,
      maxSteps: 5,
      // AIChatAgent's onFinish uses generic ToolSet while streamText narrows to our tools
      onFinish: onFinish as never,
    });

    return result.toDataStreamResponse();
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      const summary = getLandscapeSummary();
      return Response.json({
        status: "ok",
        environment: env.ENVIRONMENT,
        model: env.MODEL,
        landscape: summary.stats,
      });
    }

    return (await routeAgentRequest(request, env)) ?? new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
