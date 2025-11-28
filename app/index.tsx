// app/index.tsx
import { router, Stack } from "expo-router";
import { Clock, Link2, Search, Shield } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVerification } from "../contexts/VerificationContext";
import type { VerificationType } from "../types/verification";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState("");
  const [verificationType, setVerificationType] =
    useState<VerificationType>("link");
  const { runVerification, isVerifying } = useVerification();

  const handleVerify = async () => {
    if (!inputText.trim()) return;
    try {
      await runVerification(inputText.trim(), verificationType);
      router.push("/verify");
    } catch (err) {
      console.error("Verification failed:", err);
    }
  };

  const isLink = (text: string) => {
    return text.startsWith("http://") || text.startsWith("https://") || text.includes("www.");
  };

  const handleTextChange = (text: string) => {
    setInputText(text);
    if (isLink(text)) setVerificationType("link");
    else setVerificationType("text");
  };

  const isLoading = isVerifying;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Factify",
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push("/history")} style={styles.headerButton}>
              <Clock size={24} color="#3B82F6" />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Shield size={48} color="#3B82F6" strokeWidth={2.5} />
            </View>
            <Text style={styles.appTitle}>Factify</Text>
            <Text style={styles.appSubtitle}>Verify links, text, and content for authenticity</Text>
          </View>

          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[styles.typeButton, verificationType === "link" && styles.typeButtonActive]}
              onPress={() => setVerificationType("link")}
              activeOpacity={0.7}
            >
              <Link2 size={20} color={verificationType === "link" ? "#3B82F6" : "#6B7280"} />
              <Text style={[styles.typeButtonText, verificationType === "link" && styles.typeButtonTextActive]}>Link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeButton, verificationType === "text" && styles.typeButtonActive]}
              onPress={() => setVerificationType("text")}
              activeOpacity={0.7}
            >
              <Search size={20} color={verificationType === "text" ? "#3B82F6" : "#6B7280"} />
              <Text style={[styles.typeButtonText, verificationType === "text" && styles.typeButtonTextActive]}>Text</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>
              {verificationType === "link" ? "Paste a link to verify" : "Enter text or claim to fact-check"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={verificationType === "link" ? "https://example.com/article" : "Enter text to verify..."}
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={handleTextChange}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isLoading}
            />

            <TouchableOpacity
              style={[styles.verifyButton, (!inputText.trim() || isLoading) && styles.verifyButtonDisabled]}
              onPress={handleVerify}
              disabled={!inputText.trim() || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Shield size={20} color="#FFFFFF" />
                  <Text style={styles.verifyButtonText}>Verify Now</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>How it works</Text>
            <View style={styles.infoItem}>
              <Text style={styles.infoNumber}>1</Text>
              <Text style={styles.infoText}>Paste a link or text you want to verify</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoNumber}>2</Text>
              <Text style={styles.infoText}>Our AI analyzes the content for authenticity</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoNumber}>3</Text>
              <Text style={styles.infoText}>Get instant results with confidence score</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingTop: 20 },
  headerButton: { marginRight: 4 },
  header: { alignItems: "center", marginBottom: 32 },
  logoContainer: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  appTitle: { fontSize: 32, fontWeight: "700" as const, color: "#111827", marginBottom: 8 },
  appSubtitle: { fontSize: 16, color: "#6B7280", textAlign: "center", paddingHorizontal: 20 },
  typeSelector: { flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 12, padding: 4, marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  typeButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, gap: 8 },
  typeButtonActive: { backgroundColor: "#EFF6FF" },
  typeButtonText: { fontSize: 15, fontWeight: "600" as const, color: "#6B7280" },
  typeButtonTextActive: { color: "#3B82F6" },
  inputCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  inputLabel: { fontSize: 16, fontWeight: "600" as const, color: "#111827", marginBottom: 12 },
  input: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: 16, fontSize: 15, color: "#111827", minHeight: 120, marginBottom: 16, borderWidth: 1, borderColor: "#E5E7EB" },
  verifyButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#3B82F6", paddingVertical: 16, borderRadius: 12, gap: 8, shadowColor: "#3B82F6", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  verifyButtonDisabled: { backgroundColor: "#9CA3AF", shadowOpacity: 0, elevation: 0 },
  verifyButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" as const },
  infoCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  infoTitle: { fontSize: 18, fontWeight: "700" as const, color: "#111827", marginBottom: 16 },
  infoItem: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  infoNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#EFF6FF", color: "#3B82F6", fontSize: 14, fontWeight: "700" as const, textAlign: "center", lineHeight: 28, marginRight: 12 },
  infoText: { flex: 1, fontSize: 15, color: "#4B5563", lineHeight: 20 },
});
