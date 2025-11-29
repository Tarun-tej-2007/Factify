// server/index.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.MODEL_NAME || "gemini-1.5-flash";

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY missing in server/.env");
  process.exit(1);
}

console.log(`✅ Using model: ${GEMINI_MODEL}`);

function extractJsonFromText(text) {
  if (!text || typeof text !== "string") {
    console.log("[Parser] No text to extract");
    return null;
  }
  
  // Try direct JSON parse
  try {
    const parsed = JSON.parse(text);
    console.log("[Parser] Successfully parsed direct JSON");
    return parsed;
  } catch (e) {
    console.log("[Parser] Direct parse failed, trying alternatives");
  }
  
  // Try code block with ```json ... ```
  const triple = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (triple && triple[1]) {
    try {
      const parsed = JSON.parse(triple[1]);
      console.log("[Parser] Successfully parsed code block");
      return parsed;
    } catch (e) {
      console.log("[Parser] Code block parse failed");
    }
  }
  
  // Try first { ... } substring
  const first = text.match(/\{[\s\S]*\}/);
  if (first && first[0]) {
    try {
      const parsed = JSON.parse(first[0]);
      console.log("[Parser] Successfully parsed braced substring");
      return parsed;
    } catch (e) {
      console.log("[Parser] Braced parse failed, text:", first[0].slice(0, 100));
    }
  }
  
  console.log("[Parser] No JSON found, raw text:", text.slice(0, 200));
  return null;
}

async function callGemini(prompt, generationConfig = {}) {
  // Build request following docs: "contents" with parts array.
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=` +
    encodeURIComponent(GEMINI_API_KEY);

  const body = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  };

  // Attach generationConfig only if provided (avoid unknown fields)
  if (Object.keys(generationConfig).length > 0) {
    body.generationConfig = generationConfig;
  }

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let raw = null;
  try {
    raw = await r.json();
  } catch (e) {
    console.error("[Gemini] Failed to parse JSON response:", e.message);
    const text = await r.text().catch(() => "");
    console.error("[Gemini] Raw response text:", text.slice(0, 500));
    raw = { error: "Failed to parse response", rawText: text };
  }

  if (!r.ok) {
    console.error("[Gemini] API error status:", r.status, "body:", JSON.stringify(raw).slice(0, 300));
  }

  return { ok: r.ok, status: r.status, raw };
}

app.post("/api/verify", async (req, res) => {
  try {
    const { prompt: clientPrompt, type, content } = req.body ?? {};
    if (!clientPrompt && !content) {
      return res.status(400).json({ error: "Missing prompt or content" });
    }

    const basePrompt =
      clientPrompt ??
      (type === "link"
        ? `You are an expert fact-checker and security analyst. Analyze this link for legitimacy, phishing risk, or misinformation. Return only a JSON object with fields: status, reason, confidence. URL: ${content}`
        : type === "text"
        ? `You are an expert fact-checker. Fact-check the claim: "${content}". Return only a JSON object with fields: status, reason, confidence.`
        : `You are an image forensics expert. Evaluate the described image authenticity. Return only a JSON object with fields: status, reason, confidence. Context: ${content}`);

    console.log("[Proxy] incoming verify, type:", type, "contentPreview:", String(content ?? "").slice(0, 300));
    console.log("[Proxy] base prompt preview:", basePrompt.slice(0, 300));

    // First call: ask Gemini to return application/json candidates (helps with parsing)
    const genConfig = {
      // ask for JSON mime; docs: responseMimeType supports "application/json"
      responseMimeType: "application/json",
      // candidateCount is supported in generationConfig
      candidateCount: 1,
    };

    const first = await callGemini(basePrompt, genConfig);
    console.log("[Proxy] Gemini first call status:", first.status);
    console.log("[Proxy] Gemini first call raw keys:", first.raw ? Object.keys(first.raw).join(", ") : "null");

    // Handle API errors (e.g., quota, authentication)
    if (!first.ok && first.raw?.error) {
      console.error("[Proxy] API error:", first.raw.error);
      return res.status(500).json({
        result: {
          status: "unknown",
          reason: `API Error: ${first.raw.error.message || JSON.stringify(first.raw.error)}`,
          confidence: 0,
        },
        raw: first.raw,
      });
    }

    const aiTextFirst =
      first.raw?.candidates?.[0]?.content?.parts?.[0]?.text ??
      first.raw?.candidates?.[0]?.content?.[0]?.text ??
      first.raw?.candidates?.[0]?.output ??
      first.raw?.outputText ??
      first.raw?.generatedText ??
      (typeof first.raw === "string" ? first.raw : "") ??
      first.raw?.rawText ??
      "";

    console.log("[Proxy] model text (first) preview:", String(aiTextFirst).slice(0, 1000));

    // Try parse JSON from model text
    let parsed = extractJsonFromText(aiTextFirst);
    if (parsed && parsed.status) {
      console.log("[Proxy] parsed JSON from first:", parsed);
      return res.json({ result: parsed, raw: first.raw });
    }

    // Retry with stricter instruction if first didn't parse
    const retryPrompt = `${basePrompt}

IMPORTANT: Return EXACTLY one JSON object and NOTHING ELSE (no explanation, no code fences). The JSON must be like:
{"status":"true","reason":"brief explanation","confidence":85}
Do not include any text besides the JSON object.`;

    console.log("[Proxy] retrying with strict prompt preview:", retryPrompt.slice(0, 400));
    const second = await callGemini(retryPrompt, genConfig);
    console.log("[Proxy] Gemini retry status:", second.status);

    const aiTextSecond =
      second.raw?.candidates?.[0]?.content?.parts?.[0]?.text ??
      second.raw?.candidates?.[0]?.content?.[0]?.text ??
      second.raw?.candidates?.[0]?.output ??
      second.raw?.outputText ??
      second.raw?.generatedText ??
      (typeof second.raw === "string" ? second.raw : "") ??
      "";

    console.log("[Proxy] model text (retry) preview:", String(aiTextSecond).slice(0, 1000));

    parsed = extractJsonFromText(aiTextSecond);
    if (parsed && parsed.status) {
      console.log("[Proxy] parsed JSON from retry:", parsed);
      return res.json({ result: parsed, raw: second.raw });
    }

    // Fallback: if server-side "result" exists in raw, return it
    if (second.raw?.result && second.raw.result.status) {
      return res.json({ result: second.raw.result, raw: second.raw });
    }
    if (first.raw?.result && first.raw.result.status) {
      return res.json({ result: first.raw.result, raw: first.raw });
    }

    // Final fallback: include model text in reason for debugging
    const aiPreview = (aiTextSecond || aiTextFirst || "").toString().trim().slice(0, 2000);
    console.warn("[Proxy] Could not parse model JSON. Returning fallback. preview:", aiPreview.slice(0, 500));
    const fallback = {
      status: "unknown",
      reason: aiPreview.length > 0 ? `Unable to parse AI output. Model returned: ${aiPreview}` : "Unable to parse AI output. See raw payload.",
      confidence: 0,
    };

    return res.json({ result: fallback, raw: second.raw ?? first.raw ?? null });
  } catch (err) {
    console.error("[Proxy] error:", err);
    return res.status(500).json({ error: "Proxy error", details: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Proxy Server Running on http://localhost:${PORT}`);
});
