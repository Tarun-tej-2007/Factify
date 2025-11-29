// app/_layout.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { VerificationProvider, useVerification } from "../contexts/VerificationContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { runVerification } = useVerification();
  const router = useRouter();

  useEffect(() => {
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl != null) {
        handleIncomingURL(initialUrl);
      }
    };

    const handleIncomingURL = async (url: string) => {
      if (!url) return;

      // If the incoming URL is a direct http(s) link (sent by Android as a VIEW intent), use it directly.
      // Otherwise, look for a `url` query param (used by some deep-linking flows).
      const parsed = Linking.parse(url);
      const candidateUrl =
        url.startsWith("http://") || url.startsWith("https://")
          ? url
          : (parsed.queryParams?.url as string) ?? null;

      // Only verify if the URL is not the app's own scheme
      if (candidateUrl && !candidateUrl.includes("localhost") && !candidateUrl.includes("10.")) {
        if (candidateUrl.startsWith("http://") || candidateUrl.startsWith("https://")) {
          try {
            await runVerification(candidateUrl, "link");
            // After verification starts/completes, navigate to the result screen.
            router.push("/verify");
          } catch (error) {
            console.error("[Linking] Error verifying URL:", error);
          }
        }
      }
    };

    handleInitialURL();

    const subscription = Linking.addEventListener("url", (event) => {
      handleIncomingURL(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [runVerification, router]);

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: true }} />
      <Stack.Screen name="verify" options={{ headerShown: false }} />
      <Stack.Screen name="history" options={{ headerShown: true }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <VerificationProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootLayoutNav />
        </GestureHandlerRootView>
      </VerificationProvider>
    </QueryClientProvider>
  );
}
