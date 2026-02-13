/**
 * Teams outgoing webhook handler with HMAC-SHA256 validation.
 * Uses CF Workers Web Crypto API — no Node.js deps.
 */

import {
  buildApplicationListCard,
  buildCapabilityListCard,
  buildDataEntityListCard,
  buildErrorCard,
  buildHelpCard,
  buildIntegrationListCard,
  buildLandscapeSummaryCard,
  buildNotFoundCard,
  buildPassportCard,
  buildSearchResultsCard,
  buildValidationCard,
  type TeamsResponse,
} from "./teams-cards.js";
import { dispatch } from "./teams-dispatcher.js";

interface TeamsWebhookEnv {
  TEAMS_WEBHOOK_SECRET: string;
}

/** Validate HMAC-SHA256 from the Teams `Authorization: HMAC <base64>` header. */
async function validateHmac(
  body: string,
  authHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!authHeader) return false;

  const match = authHeader.match(/^HMAC\s+(.+)$/i);
  if (!match) return false;

  const receivedDigest = match[1]!;

  // Decode the base64 shared secret to raw bytes
  const keyBytes = Uint8Array.from(atob(secret), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const bodyBytes = new TextEncoder().encode(body);
  const signature = await crypto.subtle.sign("HMAC", key, bodyBytes);
  const computedDigest = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return computedDigest === receivedDigest;
}

function resultToCard(result: ReturnType<typeof dispatch>): TeamsResponse {
  switch (result.type) {
    case "help":
      return buildHelpCard();
    case "app-list":
      return buildApplicationListCard(result.domain, result.apps);
    case "passport":
      return buildPassportCard(result.app);
    case "integrations":
      return buildIntegrationListCard(result.label, result.integrations);
    case "data-entities":
      return buildDataEntityListCard(result.label, result.entities);
    case "capabilities":
      return buildCapabilityListCard(result.domain, result.capabilities);
    case "summary":
      return buildLandscapeSummaryCard(result.stats, result.domains);
    case "validation":
      return buildValidationCard(result.result);
    case "search":
      return buildSearchResultsCard(result.query, result.results);
    case "not-found":
      return buildNotFoundCard(result.message);
  }
}

export async function handleTeamsWebhook(
  request: Request,
  env: TeamsWebhookEnv,
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await request.text();

  // HMAC validation
  const authHeader = request.headers.get("Authorization");
  const valid = await validateHmac(body, authHeader, env.TEAMS_WEBHOOK_SECRET);
  if (!valid) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: { text?: string };
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const text = payload.text ?? "";
  if (!text.trim()) {
    return Response.json(buildErrorCard("No query text provided."));
  }

  const result = dispatch(text);
  const response = resultToCard(result);

  return Response.json(response);
}
