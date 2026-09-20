// supabase/functions/whop-webhook/index.ts
// Deploy: supabase functions deploy whop-webhook --no-verify-jwt --project-ref euowjomqcemtuomhekwm
// Secret:  supabase secrets set WHOP_WEBHOOK_SECRET=ws_...   (SUPABASE_URL e SERVICE_ROLE_KEY já vêm prontos)

import { createClient } from "npm:@supabase/supabase-js@2";

// ───────────────────────── AJUSTE AQUI (alinhar com o ticto-webhook) ─────────────────────────
const PLAN_MAP: Record<string, string> = {
  plan_xJiM0HL4kpJYc: "monthly",
  plan_5z4UKJYI2lsgG: "annual",
};

// Valores gravados em profiles.subscription_status (use os mesmos que a Ticto grava)
const STATUS = {
  active: "active",
  pastDue: "past_due",
  canceled: "canceled",
  refunded: "refunded",
  chargeback: "chargeback",
};

// Coluna de e-mail em profiles usada para casar a compradora
const PROFILE_EMAIL_COLUMN = "email";
// ─────────────────────────────────────────────────────────────────────────────────────────────

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const enc = new TextEncoder();

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Standard Webhooks: assina `${id}.${timestamp}.${rawBody}` com HMAC-SHA256, header "v1,<base64>"
async function verifySignature(
  rawBody: string,
  headers: Headers,
  secret: string,
): Promise<boolean> {
  const id = headers.get("webhook-id");
  const ts = headers.get("webhook-timestamp");
  const sigHeader = headers.get("webhook-signature");
  if (!id || !ts || !sigHeader) return false;

  // Rejeita se o timestamp estiver a mais de 5 min (anti-replay)
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > 300) return false;

  const signedContent = enc.encode(`${id}.${ts}.${rawBody}`);

  // A doc diz que a chave é o segredo `ws_...`. Por segurança tentamos também a variante
  // "base64 do que vem depois do prefixo" (padrão Standard Webhooks). As duas exigem HMAC válido.
  const keyCandidates: Uint8Array[] = [enc.encode(secret)];
  try {
    keyCandidates.push(b64ToBytes(secret.replace(/^ws_/, "")));
  } catch { /* ignora */ }

  const sigs = sigHeader
    .split(" ")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("v1,"))
    .map((s) => s.slice(3));

  for (const keyBytes of keyCandidates) {
    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    for (const sig of sigs) {
      try {
        // subtle.verify compara em tempo constante
        const ok = await crypto.subtle.verify("HMAC", key, b64ToBytes(sig), signedContent);
        if (ok) return true;
      } catch { /* assinatura mal formada */ }
    }
  }
  return false;
}

// Pega o primeiro valor string encontrado entre vários caminhos possíveis do payload
function pick(obj: any, paths: string[]): string | null {
  for (const p of paths) {
    const v = p.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

const secret = Deno.env.get("WHOP_WEBHOOK_SECRET")?.trim();
  if (!secret) return json({ error: "secret_not_configured" }, 500);

  const rawBody = await req.text(); // corpo CRU: não parsear antes de verificar
  const valid = await verifySignature(rawBody, req.headers, secret);
  if (!valid) {
  const ts = req.headers.get("webhook-timestamp");
  console.error("invalid_signature", JSON.stringify({
    hasId: !!req.headers.get("webhook-id"),
    hasTs: !!ts,
    ageSec: ts ? Math.round(Date.now() / 1000 - Number(ts)) : null,
    sigHeaderStart: (req.headers.get("webhook-signature") ?? "").slice(0, 8),
    secretLen: secret.length,
    secretStart: secret.slice(0, 3),
    headerNames: [...req.headers.keys()].filter((k) => k.startsWith("webhook") || k.startsWith("x-")),
  }));
  return json({ error: "invalid_signature" }, 401);
}

  const event = JSON.parse(rawBody);
  const webhookId: string = req.headers.get("webhook-id")!;
  const type: string = event.type;
  const data = event.data ?? {};

  const email = pick(data, [
    "user.email",
    "member.user.email",
    "member.email",
    "email",
    "customer.email",
    "billing_email",
  ])?.trim().toLowerCase() ?? null;

  // Idempotência: mesmo webhook-id = mesmo evento reenviado
  const { error: insertErr } = await supabase.from("webhook_events").insert({
    id: webhookId,
    provider: "whop",
    event_type: type,
    payload: event,
    email,
  });
  if (insertErr) {
    if (insertErr.code === "23505") return json({ ok: true, duplicate: true });
    console.error("webhook_events insert failed", insertErr);
    return json({ error: "log_failed" }, 500); // Whop tenta de novo
  }

  const setResult = (result: string) =>
    supabase.from("webhook_events").update({ result }).eq("id", webhookId);

  // Evento → novo status
  let status: string | null = null;
  switch (type) {
    case "membership.activated":
    case "payment.succeeded":
      status = STATUS.active;
      break;
    case "payment.failed":
      status = STATUS.pastDue;
      break;
    case "membership.deactivated":
      status = STATUS.canceled;
      break;
    case "refund.created":
      status = STATUS.refunded;
      break;
    case "dispute.created":
      status = STATUS.chargeback;
      break;
  }

  if (!status) {
    await setResult("ignored");
    return json({ ok: true, ignored: type });
  }
  if (!email) {
    await setResult("email_not_found"); // payload fica salvo em webhook_events para ajustarmos o pick()
    return json({ ok: true, warning: "email_not_found" });
  }

  const planId = pick(data, ["plan.id", "plan_id", "membership.plan.id"]);
  const update: Record<string, unknown> = {
    subscription_status: status,
    subscription_updated_at: new Date().toISOString(),
    payment_provider: "whop",
  };
  if (planId && PLAN_MAP[planId]) update.subscription_plan = PLAN_MAP[planId];

  const { data: rows, error: upErr } = await supabase
    .from("profiles")
    .update(update)
    .ilike(PROFILE_EMAIL_COLUMN, email)
    .select("id");

  if (upErr) {
    console.error("profiles update failed", upErr);
    await setResult("error");
    return json({ error: "update_failed" }, 500);
  }

  await setResult(rows && rows.length > 0 ? "updated" : "user_not_found");
  return json({ ok: true, type, updated: rows?.length ?? 0 });
});