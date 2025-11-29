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
      try {
        const initialUrl = await Linking.getInitialURL();
        console.log('[Linking] Initial URL:', initialUrl);
        if (initialUrl) {
          handleIncomingURL(initialUrl);
        }
      } catch (error) {
        console.error('[Linking] Error getting initial URL:', error);
      }
    };

    const handleIncomingURL = async (url: string) => {
      console.log('[Linking] Handling URL:', url);
      
      try {
        // Handle direct http/https URLs (when app is set as default browser)
        if (url.startsWith("http://") || url.startsWith("https://")) {
          console.log('[Linking] Direct web URL detected:', url);
          await runVerification(url, "link");
          return;
        }

        // Handle factify:// scheme URLs
        const parsed = Linking.parse(url);
        console.log('[Linking] Parsed URL:', parsed);
        
        const fullUrl = parsed.queryParams?.url as string;
        if (fullUrl && (fullUrl.startsWith("http://") || fullUrl.startsWith("https://"))) {
          console.log('[Linking] Factify scheme URL with web link:', fullUrl);
          await runVerification(fullUrl, "link");
        }
      } catch (error) {
        console.error("[Linking] Error handling URL:", error);
      }
    };

    handleInitialURL();

    const subscription = Linking.addEventListener("url", (event) => {
      console.log('[Linking] URL event received:', event.url);
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