// services/verification.ts
import { z } from "zod";
import type {
  VerificationResponse,
  VerificationStatus,
  VerificationType,
} from "../types/verification";

const GEMINI_API_KEY =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY ?? "";

const verificationSchema = z.object({
  status: z.enum(["true", "fake", "unknown"]),
  reason: z.string(),
  confidence: z.number().min(0).max(100),
});

export async function verifyContent(
  content: string,
  type: VerificationType
): Promise<VerificationResponse> {
  console.log(`[Verification] Using Gemini to verify ${type}:`, content);

  if (!GEMINI_API_KEY) {
    console.warn(
      "[Verification] GEMINI API key not found. Set EXPO_PUBLIC_GEMINI_API_KEY or GEMINI_API_KEY."
    );
    return {
      status: "unknown" as VerificationStatus,
      reason: "Gemini API key not configured.",
      confidence: 0, 
    };
  }

  let prompt = "";
  if (type === "link") {
    prompt = `You are an expert fact-checker and security analyst. Analyze the link or URL below for legitimacy, phishing risk, or misinformation.
Return EXACTLY a JSON object with three fields: status, reason, confidence
- status: one of "true", "fake", or "unknown"
- reason: a short explanation (1-3 sentences)
- confidence: integer from 0 to 100

URL:
${content}

Return only JSON — nothing else.`;
  } else if (type === "text") {
    prompt = `You are an expert fact-checker. Fact-check the following claim or text.
Return EXACTLY a JSON object with three fields: status, reason, confidence
- status: one of "true", "fake", or "unknown"
- reason: a short explanation (1-3 sentences)
- confidence: integer from 0 to 100

Text:
"${content}"

Return only JSON — nothing else.`;
  } else {
    prompt = `You are an image forensics expert. Evaluate whether the described image appears authentic, manipulated, or AI-generated.
Return EXACTLY a JSON object with three fields: status, reason, confidence
- status: one of "true", "fake", or "unknown"
- reason: a short explanation (1-3 sentences)
- confidence: integer from 0 to 100

Image description / context:
${content}

Return only JSON — nothing else.`;
  }

  try {
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
      encodeURIComponent(GEMINI_API_KEY);

    const body = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      maxOutputTokens: 512,
      temperature: 0.0,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error(`[Verification] Gemini HTTP ${res.status}:`, t);
      return {
        status: "unknown" as VerificationStatus,
        reason: `Gemini API HTTP ${res.status}`,
        confidence: 0,
      };
    }

    const json = await res.json();

    const aiTextCandidates = [
      json?.candidates?.[0]?.content?.parts?.[0]?.text,
      json?.candidates?.[0]?.content?.[0]?.text,
      json?.candidates?.[0]?.output,
      json?.result?.content?.[0]?.text,
      json?.candidates?.[0]?.content,
    ];

    const aiText =
      aiTextCandidates.find((c) => typeof c === "string" && c.trim().length > 0) ??
      "";

    console.log("[Gemini Raw]:", aiText);

    if (!aiText) {
      return {
        status: "unknown" as VerificationStatus,
        reason: "Empty response from Gemini.",
        confidence: 0,
      };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(aiText);
    } catch (err) {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (err2) {
          console.error("Failed to parse JSON from Gemini:", err2);
        }
      }
      if (!parsed) {
        console.error("Gemini response was not valid JSON", err);
        return {
          status: "unknown",
          reason: "AI response invalid format",
          confidence: 0,
        };
      }
    }

    const validated = verificationSchema.safeParse(parsed);
    if (!validated.success) {
      console.warn("[Verification] Gemini JSON schema mismatch:", validated.error);
      return {
        status: "unknown" as VerificationStatus,
        reason: "AI returned unexpected JSON structure",
        confidence: 0,
      };
    }

    return validated.data as VerificationResponse;
  } catch (error) {
    console.error(`[Verification] Gemini API ERROR:`, error);
    return {
      status: "unknown" as VerificationStatus,
      reason: "Unable to verify due to a technical error. Please try again later.",
      confidence: 0,
    };
  }
}
