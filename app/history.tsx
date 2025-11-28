// app/history.tsx
import { router, Stack } from "expo-router";
import { Clock, Trash2 } from "lucide-react-native";
import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVerification } from "../contexts/VerificationContext";
import type { VerificationResult } from "../types/verification";

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { history, removeVerification, setCurrentVerification } = useVerification();

  const formatDate = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const minutes = Math.max(1, Math.floor(diffInHours * 60));
      return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case "true":
        return "✅";
      case "fake":
        return "❌";
      case "unknown":
        return "⚠️";
      default:
        return "❓";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "true":
        return "#10B981";
      case "fake":
        return "#EF4444";
      case "unknown":
        return "#F59E0B";
      default:
        return "#6B7280";
    }
  };

  const handleItemPress = (item: VerificationResult) => {
    setCurrentVerification(item);
    router.push("/verify");
  };

  const renderItem = ({ item }: { item: VerificationResult }) => {
    const status = item.result.status;
    return (
      <TouchableOpacity style={styles.card} onPress={() => handleItemPress(item)} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusEmoji}>{getStatusEmoji(status)}</Text>
            <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
              {status === "true" ? "Verified" : status === "fake" ? "Suspicious" : "Unknown"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              removeVerification(item.id);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.contentText} numberOfLines={2}>
          {item.input}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.typeTag}>
            <Text style={styles.typeText}>{item.type}</Text>
          </View>
          <View style={styles.timeContainer}>
            <Clock size={14} color="#9CA3AF" />
            <Text style={styles.timeText}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "History", headerLargeTitle: false }} />
      <View style={styles.container}>
        {history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Clock size={64} color="#D1D5DB" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No History Yet</Text>
            <Text style={styles.emptyText}>Your verification history will appear here</Text>
          </View>
        ) : (
          <FlatList
            data={history}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  list: { padding: 16 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusEmoji: { fontSize: 16 },
  statusText: { fontSize: 14, fontWeight: "600" as const },
  contentText: { fontSize: 15, color: "#374151", lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  typeTag: { backgroundColor: "#F3F4F6", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  typeText: { fontSize: 12, color: "#6B7280", fontWeight: "500" as const, textTransform: "capitalize" as const },
  timeContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
  timeText: { fontSize: 12, color: "#9CA3AF" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: "700" as const, color: "#111827", marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 15, color: "#6B7280", textAlign: "center" },
});
