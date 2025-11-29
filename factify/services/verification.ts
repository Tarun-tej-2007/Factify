// services/verification.ts
import { z } from "zod";
import { Platform } from "react-native";
import type {
  VerificationResponse,
  VerificationStatus,
  VerificationType,
} from "../types/verification";

/**
 * Client calls a backend proxy that forwards to OpenAI.
 * - For web use:    VERIFICATION_PROXY_URL=http://localhost:3000/api/verify
 * - Android emulator: use http://10.0.2.2:3000/api/verify
 * - Physical device: use http://<your_machine_ip>:3000/api/verify
 */

// Determine the correct proxy URL based on platform
let PROXY_URL: string = process.env.VERIFICATION_PROXY_URL || "";

if (!PROXY_URL) {
  if (Platform.OS === "web") {
    PROXY_URL = "http://localhost:3000/api/verify";
  } else if (Platform.OS === "android") {
    // For Android emulator
    PROXY_URL = "http://10.0.2.2:3000/api/verify";
    // For physical device, you need to set VERIFICATION_PROXY_URL env var to http://<your_machine_ip>:3000/api/verify
  } else if (Platform.OS === "ios") {
    PROXY_URL = "http://localhost:3000/api/verify";
  } else {
    PROXY_URL = "http://localhost:3000/api/verify";
  }
}

console.log(`[Verification] Using PROXY_URL: ${PROXY_URL}`);

const verificationSchema = z.object({
  status: z.enum(["true", "fake", "unknown"]),
  reason: z.string(),
  confidence: z.number().min(0).max(100),
});

function makeUnknownResponse(message: string): VerificationResponse {
  return {
    status: "unknown" as VerificationStatus,
    reason: message,
    confidence: 0,
  };
}

function extractJsonFromText(aiText: string | undefined): any | null {
  if (!aiText || typeof aiText !== "string") return null;

  // Try direct JSON
  try {
    return JSON.parse(aiText);
  } catch (e) {}

  // Try code block with ```json ... ```
  const triple = aiText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (triple && triple[1]) {
    try {
      return JSON.parse(triple[1]);
    } catch (e) {}
  }

  // Try first { ... } substring
  const firstBraced = aiText.match(/\{[\s\S]*\}/);
  if (firstBraced && firstBraced[0]) {
    try {
      return JSON.parse(firstBraced[0]);
    } catch (e) {}
  }

  // Nothing parsed
  return null;
}

export async function verifyContent(
  content: string,
  type: VerificationType
): Promise<VerificationResponse> {
  console.log(`[Verification] Starting verification for type=${type}`);
  console.log(`[Verification] Calling proxy at: ${PROXY_URL}`);
  console.log(`[Verification] Content preview: ${content.slice(0, 100)}`);
  // Strict prompts with exact example and instruction to ONLY return JSON
  const prompt =
    type === "link"
      ? `You are an expert fact-checker and security analyst. Analyze the link or URL below for legitimacy, phishing risk, or misinformation.

Return ONLY a single JSON object (no explanation, no code fences). The object MUST have these fields:
- "status": one of "true", "fake", or "unknown"
- "reason": a short (1-2 sentence) explanation
- "confidence": integer 0-100

Example (exact format):
{"status":"fake","reason":"Domain is suspicious and contains phishing indicators","confidence":78}

URL:
${content}

Return exactly one JSON object and nothing else.`
      : type === "text"
      ? `You are an expert fact-checker. Fact-check the following claim or text.

Return ONLY a single JSON object (no explanation, no code fences). The object MUST have these fields:
- "status": one of "true", "fake", or "unknown"
- "reason": a short (1-2 sentence) explanation
- "confidence": integer 0-100

Example (exact format):
{"status":"true","reason":"Claim matches reliable public records and government sources","confidence":92}

Text:
"${content}"

Return exactly one JSON object and nothing else.`
      : `You are an image forensics expert. Evaluate whether the described image appears authentic, manipulated, or AI-generated.

Return ONLY a single JSON object (no explanation, no code fences). The object MUST have these fields:
- "status": one of "true", "fake", or "unknown"
- "reason": a short (1-2 sentence) explanation
- "confidence": integer 0-100

Example (exact format):
{"status":"fake","reason":"Image shows clear AI generation artifacts and inconsistent lighting","confidence":85}

Image description / context:
${content}

Return exactly one JSON object and nothing else.`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const res = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, type, content }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const rawText = await res.text().catch(() => "");
      let proxyJson: any = null;
      try {
        proxyJson = rawText ? JSON.parse(rawText) : null;
      } catch (e) {
        proxyJson = null;
      }

      console.log("[Verification] proxy status:", res.status);
      console.log("[Verification] proxy body (raw):", rawText);
      if (proxyJson) console.log("[Verification] proxy body (parsed):", proxyJson);

    if (!res.ok) {
      const bodyMessage =
        (proxyJson && (proxyJson.error || proxyJson.message)) ||
        rawText ||
        `HTTP ${res.status}`;
      return makeUnknownResponse(`Verification proxy HTTP ${res.status}: ${bodyMessage}`);
    }

    // Best-case: proxy returned { result: { status, reason, confidence } }
    if (proxyJson?.result && proxyJson.result.status) {
      const validated = verificationSchema.safeParse(proxyJson.result);
      if (validated.success) {
        return validated.data as VerificationResponse;
      } else {
        console.warn("[Verification] proxy.result failed schema:", validated.error);
      }
    }

    // If proxy returned raw Gemini body, try to extract model text
    const aiText =
      proxyJson?.outputText ??
      proxyJson?.aiText ??
      proxyJson?.generatedText ??
      proxyJson?.candidates?.[0]?.content?.parts?.[0]?.text ??
      proxyJson?.candidates?.[0]?.content?.[0]?.text ??
      proxyJson?.candidates?.[0]?.output ??
      rawText ??
      "";

    console.log("[Verification] aiText preview:", String(aiText).slice(0, 500));

    // Try to extract JSON object from model text
    const parsedModelOutput = extractJsonFromText(aiText);

    if (parsedModelOutput && parsedModelOutput.status) {
      const v = verificationSchema.safeParse(parsedModelOutput);
      if (v.success) return v.data as VerificationResponse;
      console.warn("[Verification] parsedModelOutput failed schema:", v.error);
    }

    // If we can't parse a correct JSON, return a helpful fallback that includes the raw aiText (trimmed)
    const preview = (typeof aiText === "string" ? aiText.trim() : String(aiText)).slice(0, 1500);
    const fallbackReason =
      preview.length > 0
        ? `Unable to parse AI output. Model returned: ${preview}`
        : "Unable to parse AI output. See proxy logs for details.";

    return makeUnknownResponse(fallbackReason);
    } catch (timeoutErr: any) {
      console.error("[Verification] Timeout or fetch error:", timeoutErr.message);
      if (timeoutErr.name === "AbortError") {
        return makeUnknownResponse("Verification timeout - request took too long. Please try again.");
      }
      return makeUnknownResponse(timeoutErr?.message ?? "Network request failed");
    }
  } catch (err: any) {
    console.error("[Verification] network/proxy error:", err);
    return makeUnknownResponse(err?.message ?? "Network/proxy error");
  }
}
