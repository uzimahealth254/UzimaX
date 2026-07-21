import "@supabase/functions-js/edge-runtime.d.ts";
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function signHmac(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return hex(digest);
}

async function verifySignature(secret: string, rawBody: string, signature: string, timestamp: string) {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() - ts) > 5 * 60 * 1000) return false;
  const expected = await signHmac(secret, `${timestamp}.${rawBody}`);
  return expected === signature.replace(/^sha256=/, "");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const webhookSecret = Deno.env.get("AFYAX_WEBHOOK_SECRET");
  const apiBaseUrl = Deno.env.get("IOUX_API_URL");
  const apiKey = Deno.env.get("AFYAX_API_KEY");
  if (!webhookSecret || !apiBaseUrl || !apiKey) {
    return json(503, {
      error: "misconfigured",
      message: "Missing AFYAX_WEBHOOK_SECRET, IOUX_API_URL, or AFYAX_API_KEY",
    });
  }

  const signature = req.headers.get("x-afyax-signature") ?? "";
  const timestamp = req.headers.get("x-afyax-timestamp") ?? "";
  const rawBody = await req.text();
  if (!signature || !timestamp) {
    return json(401, { error: "invalid_signature", message: "Missing webhook signature headers" });
  }

  const valid = await verifySignature(webhookSecret, rawBody, signature, timestamp);
  if (!valid) return json(401, { error: "invalid_signature", message: "Signature check failed" });

  const upstream = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/v1/webhooks/payment-update`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "x-afyax-signature": signature,
      "x-afyax-timestamp": timestamp,
    },
    body: rawBody,
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") || "application/json" },
  });
});
