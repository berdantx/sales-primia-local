/**
 * Shared webhook security utilities for payload validation and token auth.
 */

const MAX_PAYLOAD_SIZE = 1_000_000; // 1MB

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Validates payload size from Content-Length header.
 * Returns an error Response if too large, or null if OK.
 */
export function checkPayloadSize(req: Request): Response | null {
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
    return new Response(
      JSON.stringify({ error: "Payload too large" }),
      { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  return null;
}

/**
 * Truncates a string to a max length to prevent oversized data storage.
 */
export function sanitizeString(value: string | null | undefined, maxLength = 500): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  return trimmed.length > maxLength ? trimmed.substring(0, maxLength) : trimmed;
}

/**
 * Validates a webhook token from query params against a stored token.
 * Returns an error Response if invalid, or null if OK.
 * If no WEBHOOK_SECRET is configured, skips validation (backwards compat).
 */
export function validateWebhookToken(req: Request): Response | null {
  const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
  if (!webhookSecret) {
    // No secret configured - skip validation for backwards compatibility
    return null;
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token || token !== webhookSecret) {
    console.warn("Webhook request rejected: invalid or missing token");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return null;
}
