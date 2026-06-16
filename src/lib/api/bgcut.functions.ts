import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  uploadPath: z.string().min(1), // storage path of uploaded original
  filename: z.string().min(1),
  bytes: z.number().int().nonnegative(),
});

/**
 * Removes the background from an uploaded image using Lovable AI (Gemini image edit).
 * Reads the original from the user's storage folder, calls the AI gateway,
 * writes the transparent PNG result back to storage, records an `uploads` row,
 * and decrements daily credits.
 */
export const removeBackground = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1) check + reset credits
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("plan, daily_credits, credits_used_today, credits_reset_at")
      .eq("id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile) throw new Error("Profile not found");

    const today = new Date().toISOString().slice(0, 10);
    let used = profile.credits_used_today;
    if (profile.credits_reset_at !== today) {
      used = 0;
      await supabase.from("profiles").update({ credits_used_today: 0, credits_reset_at: today }).eq("id", userId);
    }
    const isUnlimited = profile.plan !== "free";
    if (!isUnlimited && used >= profile.daily_credits) {
      throw new Error(`Daily limit reached (${profile.daily_credits}/day). Upgrade to Pro for unlimited.`);
    }

    // 2) fetch original from storage as base64
    const { data: blob, error: dErr } = await supabase.storage.from("bgcut").download(data.uploadPath);
    if (dErr || !blob) throw new Error(dErr?.message ?? "Could not load uploaded image");
    const buf = Buffer.from(await blob.arrayBuffer());
    const mime = blob.type || "image/png";
    const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;

    // 3) call Lovable AI for background removal
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        modalities: ["image", "text"],
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Remove the background from this image completely. Return only the foreground subject with a fully transparent background. Preserve fine edges, hair, and details. Output as a PNG with alpha channel.",
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (aiRes.status === 429) throw new Error("AI service is rate-limited. Try again shortly.");
    if (aiRes.status === 402) throw new Error("AI credits exhausted. Please contact support.");
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      throw new Error(`AI request failed: ${txt.slice(0, 200)}`);
    }

    const aiJson = (await aiRes.json()) as {
      choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
    };
    const resultUrl = aiJson.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!resultUrl || !resultUrl.startsWith("data:")) {
      throw new Error("AI did not return an image");
    }

    // 4) decode and upload result PNG
    const [, b64] = resultUrl.split(",", 2);
    const resultBuf = Buffer.from(b64, "base64");
    const resultPath = `${userId}/results/${crypto.randomUUID()}.png`;
    const { error: upErr } = await supabase.storage
      .from("bgcut")
      .upload(resultPath, resultBuf, { contentType: "image/png", upsert: false });
    if (upErr) throw new Error(upErr.message);

    // 5) signed URL for download (1 hour)
    const { data: signed } = await supabase.storage.from("bgcut").createSignedUrl(resultPath, 60 * 60);

    // 6) insert history row + bump credits
    await supabase.from("uploads").insert({
      user_id: userId,
      original_filename: data.filename,
      original_path: data.uploadPath,
      result_path: resultPath,
      status: "done",
      bytes: data.bytes,
    });
    if (!isUnlimited) {
      await supabase.from("profiles").update({ credits_used_today: used + 1 }).eq("id", userId);
    }

    return {
      resultPath,
      downloadUrl: signed?.signedUrl ?? null,
      creditsLeft: isUnlimited ? null : profile.daily_credits - (used + 1),
    };
  });
