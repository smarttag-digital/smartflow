import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.103.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { name, phone, email, interest, source } = body;

    if (!name || !phone) {
      return new Response(
        JSON.stringify({ error: "name and phone are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find any user to assign (in production, use API key mapping)
    // For now, we'll need a user_id passed or use a default
    const userId = body.user_id;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "user_id is required to assign the lead" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabase.from("leads").insert({
      user_id: userId,
      name: String(name).slice(0, 255),
      phone: String(phone).replace(/\D/g, "").slice(0, 20),
      email: email ? String(email).slice(0, 255) : "",
      interest: interest ? String(interest).slice(0, 500) : "",
      source: source || "webhook",
      score: "cold",
      stage: "novo",
    }).select().single();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, lead: data }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
