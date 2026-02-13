import { describe, expect, it } from "vitest";
import { handleTeamsWebhook } from "./teams-webhook.js";

const SECRET = btoa("test-secret-key-for-hmac-validation");

async function computeHmac(body: string, secret: string): Promise<string> {
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
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function makeRequest(body: string, authHeader?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authHeader !== undefined) {
    headers.Authorization = authHeader;
  }
  return new Request("https://example.com/api/teams/webhook", {
    method: "POST",
    headers,
    body,
  });
}

const env = { TEAMS_WEBHOOK_SECRET: SECRET };

describe("handleTeamsWebhook", () => {
  describe("HMAC validation", () => {
    it("rejects missing Authorization header with 401", async () => {
      const body = JSON.stringify({ text: "help" });
      const request = makeRequest(body);
      const response = await handleTeamsWebhook(request, env);
      expect(response.status).toBe(401);
    });

    it("rejects invalid HMAC with 401", async () => {
      const body = JSON.stringify({ text: "help" });
      const request = makeRequest(body, "HMAC invaliddigest");
      const response = await handleTeamsWebhook(request, env);
      expect(response.status).toBe(401);
    });

    it("rejects non-HMAC auth scheme with 401", async () => {
      const body = JSON.stringify({ text: "help" });
      const request = makeRequest(body, "Bearer some-token");
      const response = await handleTeamsWebhook(request, env);
      expect(response.status).toBe(401);
    });

    it("accepts valid HMAC", async () => {
      const body = JSON.stringify({ text: "help" });
      const hmac = await computeHmac(body, SECRET);
      const request = makeRequest(body, `HMAC ${hmac}`);
      const response = await handleTeamsWebhook(request, env);
      expect(response.status).toBe(200);
    });
  });

  describe("request validation", () => {
    it("rejects non-POST with 405", async () => {
      const request = new Request("https://example.com/api/teams/webhook", { method: "GET" });
      const response = await handleTeamsWebhook(request, env);
      expect(response.status).toBe(405);
    });

    it("rejects malformed JSON with 400", async () => {
      const body = "not json";
      const hmac = await computeHmac(body, SECRET);
      const request = makeRequest(body, `HMAC ${hmac}`);
      const response = await handleTeamsWebhook(request, env);
      expect(response.status).toBe(400);
    });
  });

  describe("query handling", () => {
    async function query(text: string): Promise<Record<string, unknown>> {
      const body = JSON.stringify({ text });
      const hmac = await computeHmac(body, SECRET);
      const request = makeRequest(body, `HMAC ${hmac}`);
      const response = await handleTeamsWebhook(request, env);
      expect(response.status).toBe(200);
      return response.json();
    }

    it("returns help card", async () => {
      const json = await query("help");
      expect(json.type).toBe("message");
      expect(json.attachments).toBeDefined();
    });

    it("strips mention tags before dispatch", async () => {
      const json = await query("<at>ArchiClaw</at> help");
      expect(json.type).toBe("message");
      expect(json.attachments).toBeDefined();
    });

    it("returns app list card for 'apps in FIN'", async () => {
      const json = await query("apps in FIN");
      expect(json.type).toBe("message");
      expect(json.attachments).toBeDefined();
    });

    it("returns passport card for app ID", async () => {
      const json = await query("FIN-APP-001");
      expect(json.type).toBe("message");
      expect(json.attachments).toBeDefined();
    });

    it("returns text for validation", async () => {
      const json = await query("validate");
      expect(json.type).toBe("message");
      expect(json.text).toBeDefined();
    });

    it("returns error for empty text", async () => {
      const body = JSON.stringify({ text: "" });
      const hmac = await computeHmac(body, SECRET);
      const request = makeRequest(body, `HMAC ${hmac}`);
      const response = await handleTeamsWebhook(request, env);
      expect(response.status).toBe(200);
      const json: Record<string, unknown> = await response.json();
      expect(json.text).toContain("No query text");
    });

    it("returns not-found text for unknown query", async () => {
      const json = await query("xyzzy12345gibberish");
      expect(json.type).toBe("message");
      expect(json.text).toContain("No results found");
    });
  });
});
