// supabase/functions/cancel-subscription/index.ts
// Deploy: npx supabase functions deploy cancel-subscription --project-ref euowjomqcemtuomhekwm
// Segredo: npx supabase secrets set WHOP_API_KEY=apik_... --project-ref euowjomqcemtuomhekwm
//   (chave da Whop só com as permissões membership:cancel, member:email:read e member:basic:read)
//
// A usuária logada cancela a PRÓPRIA assinatura. O id da assinatura vem sempre do banco,
// nunca do app, para ninguém conseguir cancelar a assinatura de outra pessoa.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const apiKey = Deno.env.get("WHOP_API_KEY")?.trim();
  if (!apiKey) return json({ error: "not_configured" }, 500);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "unauthorized" }, 401);

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
  const userId = userData.user.id;

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("whop_membership_id, subscription_status, cancel_at_period_end")
    .eq("id", userId)
    .single();
  if (profErr || !profile) return json({ error: "profile_not_found" }, 404);

  if (!profile.whop_membership_id || profile.subscription_status !== "active") {
    return json({ error: "no_active_subscription" }, 400);
  }
  if (profile.cancel_at_period_end) return json({ ok: true, already: true });

  const res = await fetch(
    `https://api.whop.com/api/v1/memberships/${encodeURIComponent(profile.whop_membership_id)}/cancel`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ cancellation_mode: "at_period_end" }),
    },
  );
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    console.error("whop cancel failed", res.status, JSON.stringify(body));
    return json({ error: "whop_failed" }, 502);
  }

  const accessUntil: string | null = body?.renewal_period_end ?? null;
  const { error: upErr } = await supabase
    .from("profiles")
    .update({ cancel_at_period_end: true, access_until: accessUntil })
    .eq("id", userId);
  if (upErr) console.error("profile update after cancel failed", upErr);

  return json({ ok: true, access_until: accessUntil });
});
