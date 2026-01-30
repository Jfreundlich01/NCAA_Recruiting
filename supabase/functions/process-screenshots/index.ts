import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EXTRACT_PROMPT = `You are an OCR and structured data extraction system. Your task is to extract only explicitly visible text and numbers from screenshots of NCAA football recruit profiles.

IMPORTANT RULES:
- Do NOT infer, guess, or analyze anything.
- Do NOT summarize or add commentary.
- If a field is not visible, return null.
- Use exactly the field names provided.
- Return valid JSON only.
- Numbers must be numbers, not strings.
- Height must be returned as total inches.
- Weight must be returned in pounds.

STAR RATING INSTRUCTIONS (CRITICAL - count carefully):
- Stars appear as a row of star icons near the player's name
- COUNT EACH INDIVIDUAL STAR CAREFULLY - there can be 1, 2, 3, 4, or 5 stars
- 5-star recruits have FIVE filled/gold stars in a row
- 4-star recruits have FOUR filled/gold stars in a row
- Look for the actual count of star symbols, do not guess based on other factors
- If you see 5 stars, return 5. If you see 4 stars, return 4.

GEM COLOR INSTRUCTIONS:
- Look for a small gem/diamond icon near the player info
- The gem can be GREEN (positive indicator) or RED (negative indicator)
- If you see a green gem, return "green"
- If you see a red gem, return "red"
- If no gem is visible or you cannot determine the color, return null

POSITION-SPECIFIC ATTRIBUTES:
Different positions have different stats shown. Extract ONLY the attributes visible on the screen.

For QB recruits, look for: awareness, throw_power, short_accuracy, medium_accuracy, deep_accuracy, throw_on_run, under_pressure, break_sack, speed, acceleration

For CB recruits, look for: awareness, speed, acceleration, change_of_direction, agility, man_coverage, zone_coverage, press, catching, tackle

Extract the following fields:
{
  "name": string,
  "star_rating": number (1-5, count the stars carefully),
  "gem_color": string or null ("green", "red", or null if not visible),
  "position": string (e.g., "QB", "CB"),
  "archetype": string,
  "class": string,
  "hometown": string,
  "state": string,
  "height_inches": number,
  "weight_lbs": number,
  "attributes": { ... stats visible on screen using snake_case keys ... },
  "abilities": string[],
  "mentals": string[],
  "development_trait": string
}

If an attribute or mental trait is not visible, set it to null or an empty array. Return ONLY the JSON object. No explanations.`;

Deno.serve(async (req) => {
  console.log("=== EDGE FUNCTION START ===");
  console.log("Method:", req.method);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Step 1: Reading environment variables...");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    console.log("ENV CHECK - SUPABASE_URL:", supabaseUrl ? "SET" : "MISSING");
    console.log("ENV CHECK - SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "SET (length: " + supabaseServiceKey.length + ")" : "MISSING");
    console.log("ENV CHECK - SUPABASE_ANON_KEY:", supabaseAnonKey ? "SET" : "MISSING");
    console.log("ENV CHECK - ANTHROPIC_API_KEY:", anthropicApiKey ? "SET (length: " + anthropicApiKey.length + ")" : "MISSING");

    if (!supabaseUrl || !supabaseServiceKey || !anthropicApiKey) {
      const missing = [];
      if (!supabaseUrl) missing.push("SUPABASE_URL");
      if (!supabaseServiceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
      if (!anthropicApiKey) missing.push("ANTHROPIC_API_KEY");
      throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }

    console.log("Step 2: Creating Supabase client...");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("Supabase client created");

    console.log("Step 3: Creating Anthropic client...");
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });
    console.log("Anthropic client created");

    console.log("Step 4: Parsing request body...");
    const bodyText = await req.text();
    console.log("Raw body:", bodyText);

    let batch_id: string;
    try {
      const parsed = JSON.parse(bodyText);
      batch_id = parsed.batch_id;
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error(`Invalid JSON in request body: ${bodyText}`);
    }

    console.log("Parsed batch_id:", batch_id);

    if (!batch_id) {
      return new Response(
        JSON.stringify({ error: "batch_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all pending screenshots for this batch
    const { data: screenshots, error: fetchError } = await supabase
      .from("screenshots")
      .select("*")
      .eq("batch_id", batch_id)
      .eq("status", "pending");

    console.log("Fetching screenshots for batch:", batch_id);
    console.log("Screenshots found:", screenshots?.length || 0);
    console.log("Fetch error:", fetchError);

    if (fetchError) {
      throw fetchError;
    }

    if (!screenshots || screenshots.length === 0) {
      // Also check all screenshots for this batch regardless of status
      const { data: allScreenshots } = await supabase
        .from("screenshots")
        .select("*")
        .eq("batch_id", batch_id);

      return new Response(
        JSON.stringify({
          message: "No pending screenshots to process",
          debug: {
            batch_id,
            total_screenshots_in_batch: allScreenshots?.length || 0,
            all_statuses: allScreenshots?.map(s => s.status) || []
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update batch status to processing
    await supabase
      .from("screenshot_batches")
      .update({ status: "processing" })
      .eq("id", batch_id);

    const results = [];

    for (const screenshot of screenshots) {
      try {
        // Update screenshot status to processing
        await supabase
          .from("screenshots")
          .update({ status: "processing" })
          .eq("id", screenshot.id);

        // Download the image from storage
        const { data: imageData, error: downloadError } = await supabase
          .storage
          .from("screenshots")
          .download(screenshot.storage_path);

        if (downloadError) {
          console.error("Download error:", downloadError);
          throw downloadError;
        }

        // Convert to base64 using Deno's standard library encoding
        const arrayBuffer = await imageData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        console.log("Image size:", uint8Array.length, "bytes");

        if (uint8Array.length === 0) {
          throw new Error("Downloaded image is empty");
        }

        // Detect image type from magic bytes
        let mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp" = "image/jpeg";
        if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
          mediaType = "image/png";
        } else if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF) {
          mediaType = "image/jpeg";
        } else if (uint8Array[0] === 0x47 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46) {
          mediaType = "image/gif";
        } else if (uint8Array[0] === 0x52 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46 && uint8Array[3] === 0x46) {
          mediaType = "image/webp";
        }

        console.log("Detected media type:", mediaType);

        // Use Deno's standard library for efficient base64 encoding
        const base64 = encodeBase64(uint8Array);

        console.log("Base64 length:", base64.length);

        // Send to Claude Vision
        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mediaType,
                    data: base64,
                  },
                },
                {
                  type: "text",
                  text: EXTRACT_PROMPT,
                },
              ],
            },
          ],
        });

        // Parse the response
        const responseText = message.content[0].type === "text"
          ? message.content[0].text
          : "";

        // Try to extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No valid JSON found in Claude response");
        }

        const extractedData = JSON.parse(jsonMatch[0]);

        // Convert total height_inches to feet and inches
        const totalInches = extractedData.height_inches || 72; // default 6'0"
        const heightFeet = Math.floor(totalInches / 12);
        const heightInches = totalInches % 12;

        // Parse hometown and state - handle formats like "River Rouge, MI" or separate fields
        let hometown = extractedData.hometown || "";
        let state = extractedData.state || "";

        // If hometown contains ", ST" format, parse it
        if (hometown && !state && hometown.includes(", ")) {
          const parts = hometown.split(", ");
          hometown = parts[0];
          state = parts[1] || "";
        }

        // Insert the recruit
        const { data: recruit, error: insertError } = await supabase
          .from("recruits")
          .insert({
            user_id: screenshot.user_id,
            game_version: "ncaa_26",
            game_year: 2026,
            name: extractedData.name,
            position: extractedData.position || "QB",
            archetype: extractedData.archetype || "Unknown",
            star_rating: extractedData.star_rating || 3,
            height_feet: heightFeet,
            height_inches: heightInches,
            weight_lbs: extractedData.weight_lbs || 200,
            hometown: hometown,
            state: state,
            stats: extractedData.attributes || {},
            class: extractedData.class || null,
            abilities: extractedData.abilities || [],
            mentals: extractedData.mentals || [],
            ocr_dev_trait: extractedData["Development Trait"] || extractedData.development_trait || null,
            gem_color: extractedData.gem_color || null,
            screenshot_url: screenshot.storage_path,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error inserting recruit:", insertError);
          throw insertError;
        }

        console.log("Successfully inserted recruit:", recruit.id, recruit.name);

        // Update screenshot as completed
        await supabase
          .from("screenshots")
          .update({
            status: "completed",
            extracted_data: extractedData,
            recruit_id: recruit.id,
            processed_at: new Date().toISOString(),
          })
          .eq("id", screenshot.id);

        // Update batch progress
        await supabase
          .from("screenshot_batches")
          .update({
            processed_screenshots: supabase.rpc("increment_processed", { batch_id }),
          })
          .eq("id", batch_id);

        results.push({ screenshot_id: screenshot.id, status: "success", recruit_id: recruit.id });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("Error processing screenshot:", screenshot.id, errorMessage);

        // Update screenshot as failed
        await supabase
          .from("screenshots")
          .update({
            status: "failed",
            error_message: errorMessage,
            processed_at: new Date().toISOString(),
          })
          .eq("id", screenshot.id);

        results.push({ screenshot_id: screenshot.id, status: "failed", error: errorMessage });
      }
    }

    // Check if batch is complete
    const { data: remainingScreenshots } = await supabase
      .from("screenshots")
      .select("id")
      .eq("batch_id", batch_id)
      .in("status", ["pending", "processing"]);

    if (!remainingScreenshots || remainingScreenshots.length === 0) {
      await supabase
        .from("screenshot_batches")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", batch_id);
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("=== FATAL ERROR ===");
    console.error("Error type:", typeof err);
    console.error("Error:", err);

    let errorDetails: Record<string, unknown> = {};

    if (err instanceof Error) {
      errorDetails = {
        message: err.message,
        name: err.name,
        stack: err.stack,
      };
    } else if (typeof err === 'object' && err !== null) {
      errorDetails = {
        message: JSON.stringify(err),
        type: typeof err,
      };
    } else {
      errorDetails = {
        message: String(err),
        type: typeof err,
      };
    }

    console.error("Error details:", JSON.stringify(errorDetails));

    return new Response(
      JSON.stringify({ error: errorDetails.message, details: errorDetails }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
