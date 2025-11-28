// app/_layout.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { VerificationProvider, useVerification } from "../contexts/VerificationContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { runVerification } = useVerification();

  useEffect(() => {
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleIncomingURL(initialUrl);
      }
    };

    const handleIncomingURL = async (url: string) => {
      const parsed = Linking.parse(url);
      const fullUrl = parsed.queryParams?.url as string;

      if (fullUrl && (fullUrl.startsWith("http://") || fullUrl.startsWith("https://"))) {
        try {
          await runVerification(fullUrl, "link");
        } catch (error) {
          console.error("[Linking] Error verifying URL:", error);
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
  }, [runVerification]);

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
