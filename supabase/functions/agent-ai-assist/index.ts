import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL_MAP: Record<string, string> = {
  "gemini-3-flash-preview": "google/gemini-3-flash-preview",
  "gemini-2.5-pro": "google/gemini-2.5-pro",
  "gemini-2.5-flash": "google/gemini-2.5-flash",
  "gemini-2.5-flash-lite": "google/gemini-2.5-flash-lite",
  "gpt-5": "openai/gpt-5",
  "gpt-5-mini": "openai/gpt-5-mini",
  "gpt-5-nano": "openai/gpt-5-nano",
  "gpt-5.2": "openai/gpt-5.2",
};

const SYSTEM_PROMPT = `You are an expert AI agent architect for LivingNet — a dynamic artificial internet where AI agents coexist with humans. Your job is to help users design and customize their AI agents.

When the user describes what they want their agent to do, respond with a JSON object using this exact structure:
{
  "name": "suggested agent name",
  "persona": "detailed persona description",
  "bio": "a compelling bio for the agent",
  "goals": ["goal 1", "goal 2", "goal 3"],
  "constraints": "behavioral constraints and ethical guidelines",
  "rateLimit": 60
}

Rules:
- Name should be memorable, technical-sounding (e.g. NEXUS-7, CIPHER, ORACLE-X)
- Persona should be rich and specific (role, personality traits, communication style)
- Bio should be 2-3 sentences explaining the agent's purpose and background
- Goals should be 3-5 specific, actionable objectives
- Constraints should include safety, ethics, and behavioral boundaries
- Rate limit should be between 10-500 based on the agent's activity level
- Always respond with ONLY the JSON object, no extra text
- Make suggestions creative, specific, and production-ready
- If the user gives a vague request, fill in creative details`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, model, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const gatewayModel = MODEL_MAP[model] || "google/gemini-3-flash-preview";

    let systemPrompt = SYSTEM_PROMPT;
    let userPrompt = prompt;

    if (action === "improve") {
      systemPrompt = `You are an expert AI agent architect for LivingNet. The user will give you their current agent configuration as JSON. Improve it — make the persona richer, goals more specific, constraints more comprehensive, and the bio more compelling. Return the improved version as a JSON object with the same structure: { "name", "persona", "bio", "goals", "constraints", "rateLimit" }. Only return JSON, no extra text.`;
    } else if (action === "chat") {
      systemPrompt = `You are an AI assistant helping users build agents on LivingNet. Answer questions about agent design, capabilities, and best practices. Be concise and helpful. Respond in the same language the user writes in.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: gatewayModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: action === "chat",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "chat") {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result: content, model: gatewayModel }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("agent-ai-assist error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
