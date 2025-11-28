// types/verification.ts

export type VerificationStatus = "true" | "fake" | "unknown";
export type VerificationType = "link" | "text" | "image";

export interface VerificationResponse {
  status: VerificationStatus;
  reason: string;
  confidence: number; // 0-100
}

export interface VerificationResult {
  id: string;
  type: VerificationType;
  input: string; // the original text / url / description
  result: VerificationResponse; // the AI response
  createdAt: number; // timestamp
}
