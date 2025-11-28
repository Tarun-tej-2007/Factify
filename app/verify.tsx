// components/VerificationResultScreen.tsx
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
} from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVerification } from "../contexts/VerificationContext";

export default function VerificationResultScreen() {
  const { currentVerification } = useVerification();
  const result = currentVerification;
  const insets = useSafeAreaInsets();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, fadeAnim]);

  if (!result) {
    return null;
  }

  const status = result.result.status;
  const reason = result.result.reason;
  const confidence = result.result.confidence;

  const getStatusConfig = () => {
    switch (status) {
      case "true":
        return {
          icon: CheckCircle2,
          color: "#10B981",
          backgroundColor: "#ECFDF5",
          title: "✅ Verified Content",
          subtitle: "This appears to be legitimate",
        };
      case "fake":
        return {
          icon: AlertCircle,
          color: "#EF4444",
          backgroundColor: "#FEF2F2",
          title: "❌ Suspicious Content",
          subtitle: "This may be fake or misleading",
        };
      default:
        return {
          icon: HelpCircle,
          color: "#F59E0B",
          backgroundColor: "#FEF3C7",
          title: "⚠️ Unable to Verify",
          subtitle: "Proceed with caution",
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  const handleOpenLink = async () => {
    if (result.type === "link") {
      try {
        await WebBrowser.openBrowserAsync(result.input);
      } catch (error) {
        await Linking.openURL(result.input);
      }
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
      >
        <Animated.View
          style={[
            styles.statusCard,
            { backgroundColor: config.backgroundColor },
            { transform: [{ scale: scaleAnim }], opacity: fadeAnim },
          ]}
        >
          <View style={styles.iconContainer}>
            <StatusIcon size={64} color={config.color} strokeWidth={2.5} />
          </View>

          <Text style={[styles.title, { color: config.color }]}>{config.title}</Text>
          <Text style={styles.subtitle}>{config.subtitle}</Text>

          <View style={styles.confidenceContainer}>
            <Text style={styles.confidenceLabel}>Confidence</Text>
            <View style={styles.confidenceBar}>
              <View style={[styles.confidenceFill, { width: `${confidence}%`, backgroundColor: config.color }]} />
            </View>
            <Text style={[styles.confidenceText, { color: config.color }]}>{confidence}%</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.detailsCard, { opacity: fadeAnim }]}>
          <Text style={styles.detailsTitle}>Analysis</Text>
          <Text style={styles.detailsText}>{reason}</Text>

          {result.type === "link" && (
            <>
              <Text style={styles.detailsTitle}>Source</Text>
              <Text style={styles.linkText} numberOfLines={3}>
                {result.input}
              </Text>
            </>
          )}

          {result.type === "text" && (
            <>
              <Text style={styles.detailsTitle}>Verified Text</Text>
              <View style={styles.textContainer}>
                <Text style={styles.contentText}>{result.input}</Text>
              </View>
            </>
          )}
        </Animated.View>

        <Animated.View style={[styles.actions, { opacity: fadeAnim }]}>
          {result.type === "link" && (
            <TouchableOpacity style={styles.openButton} onPress={handleOpenLink} activeOpacity={0.8}>
              <ExternalLink size={20} color="#FFFFFF" />
              <Text style={styles.openButtonText}>Open Anyway</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.8}>
            <Text style={styles.backButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingTop: 40 },
  statusCard: { borderRadius: 24, padding: 32, alignItems: "center", marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  iconContainer: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "700" as const, textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#6B7280", textAlign: "center", marginBottom: 24 },
  confidenceContainer: { width: "100%", alignItems: "center" },
  confidenceLabel: { fontSize: 14, color: "#6B7280", marginBottom: 8, fontWeight: "600" as const },
  confidenceBar: { width: "100%", height: 8, backgroundColor: "#E5E7EB", borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  confidenceFill: { height: "100%", borderRadius: 4 },
  confidenceText: { fontSize: 20, fontWeight: "700" as const },
  detailsCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  detailsTitle: { fontSize: 16, fontWeight: "700" as const, color: "#111827", marginBottom: 8, marginTop: 16 },
  detailsText: { fontSize: 15, color: "#4B5563", lineHeight: 22 },
  linkText: { fontSize: 14, color: "#3B82F6", lineHeight: 20 },
  textContainer: { backgroundColor: "#F9FAFB", borderRadius: 8, padding: 12 },
  contentText: { fontSize: 14, color: "#374151", lineHeight: 20 },
  actions: { gap: 12, marginBottom: 20 },
  openButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#3B82F6", paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, gap: 8, shadowColor: "#3B82F6", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  openButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" as const },
  backButton: { alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  backButtonText: { color: "#374151", fontSize: 16, fontWeight: "600" as const },
});
