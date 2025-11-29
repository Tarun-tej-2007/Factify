import { Link, Stack } from "expo-router";
import { Shield } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View style={styles.container}>
        <Shield size={64} color="#D1D5DB" strokeWidth={1.5} />
        <Text style={styles.title}>Page Not Found</Text>
        <Text style={styles.subtitle}>
          This screen doesn&apos;t exist in Factify.
        </Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to Home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "#F9FAFB",
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  link: {
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  linkText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600" as const,
  },
});
