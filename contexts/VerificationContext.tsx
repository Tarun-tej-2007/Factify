// contexts/VerificationContext.tsx
import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  VerificationResult,
  VerificationResponse,
  VerificationType,
} from "../types/verification";
import { verifyContent } from "../services/verification";

const STORAGE_KEY = "factify_verification_history";
const MAX_HISTORY_ITEMS = 50;

function makeId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

export const [VerificationProvider, useVerification] = createContextHook(() => {
  const [history, setHistory] = useState<VerificationResult[]>([]);
  const [currentVerification, setCurrentVerification] =
    useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const historyQuery = useQuery({
    queryKey: ["verification-history"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as VerificationResult[]) : [];
    },
  });

  const { mutate: saveToStorage } = useMutation({
    mutationFn: async (newHistory: VerificationResult[]) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      return newHistory;
    },
  });

  useEffect(() => {
    if (historyQuery.data) {
      setHistory(historyQuery.data);
    }
  }, [historyQuery.data]);

  const addVerification = useCallback(
    (verification: VerificationResult) => {
      const updated = [verification, ...history].slice(0, MAX_HISTORY_ITEMS);
      setHistory(updated);
      setCurrentVerification(verification);
      saveToStorage(updated);
    },
    [history, saveToStorage]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveToStorage([]);
  }, [saveToStorage]);

  const removeVerification = useCallback(
    (id: string) => {
      const updated = history.filter((item) => item.id !== id);
      setHistory(updated);
      saveToStorage(updated);
    },
    [history, saveToStorage]
  );

  const runVerification = useCallback(
    async (input: string, type: VerificationType) => {
      setIsVerifying(true);

      const placeholder: VerificationResult = {
        id: makeId(),
        input,
        type,
        result: { status: "unknown", reason: "Verifying...", confidence: 0 },
        createdAt: Date.now(),
      };

      addVerification(placeholder);

      try {
        const aiResult = await verifyContent(input, type);

        const final: VerificationResult = {
          id: placeholder.id,
          input,
          type,
          result: aiResult,
          createdAt: Date.now(),
        };

        setHistory((prev) => {
          const updated = [final, ...prev.filter((p) => p.id !== final.id)].slice(
            0,
            MAX_HISTORY_ITEMS
          );
          saveToStorage(updated);
          return updated;
        });

        setCurrentVerification(final);
        setIsVerifying(false);
        return final;
      } catch (err) {
        console.error("runVerification error", err);

        const errorResult: VerificationResult = {
          id: placeholder.id,
          input,
          type,
          result: {
            status: "unknown",
            reason: "Verification failed due to a technical error",
            confidence: 0,
          },
          createdAt: Date.now(),
        };

        setHistory((prev) => {
          const updated = [errorResult, ...prev.filter((p) => p.id !== errorResult.id)].slice(
            0,
            MAX_HISTORY_ITEMS
          );
          saveToStorage(updated);
          return updated;
        });

        setCurrentVerification(errorResult);
        setIsVerifying(false);
        return errorResult;
      }
    },
    [addVerification, saveToStorage]
  );

  return useMemo(
    () => ({
      history,
      currentVerification,
      setCurrentVerification,
      addVerification,
      clearHistory,
      removeVerification,
      isLoading: historyQuery.isLoading,
      isVerifying,
      runVerification,
    }),
    [
      history,
      currentVerification,
      addVerification,
      clearHistory,
      removeVerification,
      historyQuery.isLoading,
      isVerifying,
      runVerification,
    ]
  );
});
