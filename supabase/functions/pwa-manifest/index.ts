import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch branding settings
    const { data: settings } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["app_name", "app_subtitle", "pwa_icon_url", "primary_color"]);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => {
      settingsMap[s.key] = s.value;
    });

    const appName = settingsMap["app_name"] || "Launch Pocket";
    const appSubtitle = settingsMap["app_subtitle"] || "Seu lançamento no bolso";
    const pwaIconUrl = settingsMap["pwa_icon_url"] || null;

    // Build icons array
    const icons = pwaIconUrl
      ? [
          { src: pwaIconUrl, sizes: "192x192", type: "image/png" },
          { src: pwaIconUrl, sizes: "512x512", type: "image/png" },
          { src: pwaIconUrl, sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ]
      : [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ];

    const manifest = {
      name: appName,
      short_name: appName,
      description: appSubtitle,
      theme_color: "#00B37E",
      background_color: "#0A0A0A",
      display: "standalone",
      start_url: "/",
      icons,
    };

    console.log("Serving dynamic manifest", { appName, hasCustomIcon: !!pwaIconUrl });

    return new Response(JSON.stringify(manifest), {
      headers: { ...corsHeaders, "Cache-Control": "public, max-age=3600" },
    });
  } catch (error) {
    console.error("Error generating manifest:", error);
    return new Response(JSON.stringify({ error: "Failed to generate manifest" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
