import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, WebViewMessageEvent } from "react-native-webview";

import { useColors } from "@/hooks/useColors";
import { Tool, useTools } from "@/context/ToolsContext";

const INJECTED_JS = `
(function() {
  // Inject a native bridge
  window.NativeBridge = {
    postMessage: function(data) {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      } catch(e) {}
    }
  };

  // Override console for debugging
  const _log = console.log;
  console.log = function(...args) {
    _log.apply(console, args);
    try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', data: args.map(String).join(' ') })); } catch(e) {}
  };

  true;
})();
`;

export default function RunScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tools, getToolContent } = useTools();
  const webViewRef = useRef<WebView>(null);

  const [tool, setTool] = useState<Tool | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [webLoading, setWebLoading] = useState(true);

  useEffect(() => {
    const found = tools.find((t) => t.id === id);
    if (!found) {
      setLoadError(true);
      return;
    }
    setTool(found);
    getToolContent(found)
      .then((content) => {
        setHtmlContent(content);
      })
      .catch(() => setLoadError(true));
  }, [id, tools, getToolContent]);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "log") {
        // console log from WebView
      }
    } catch {}
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: topPad + 8,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text
          style={[styles.topTitle, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {tool?.name ?? "Ferramenta"}
        </Text>
        <TouchableOpacity
          style={styles.reloadBtn}
          onPress={() => {
            if (webViewRef.current) {
              webViewRef.current.reload();
            }
          }}
        >
          <Feather name="refresh-cw" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loadError ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color={colors.destructive} />
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>
            Erro ao carregar
          </Text>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Nao foi possivel ler o arquivo HTML.
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.retryText, { color: colors.primaryForeground }]}>
              Voltar
            </Text>
          </TouchableOpacity>
        </View>
      ) : htmlContent === null ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Carregando ferramenta...
          </Text>
        </View>
      ) : (
        <View style={styles.webContainer}>
          {webLoading && (
            <View
              style={[styles.webLoadingOverlay, { backgroundColor: colors.background }]}
            >
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
          <WebView
            ref={webViewRef}
            source={{
              html: htmlContent,
              baseUrl: tool?.filePath
                ? `file://${tool.filePath.replace(/\/[^/]+$/, "/")}`
                : undefined,
            }}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            geolocationEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            allowFileAccess={true}
            allowUniversalAccessFromFileURLs={true}
            allowFileAccessFromFileURLs={true}
            mixedContentMode="always"
            originWhitelist={["*"]}
            injectedJavaScript={INJECTED_JS}
            onMessage={handleMessage}
            onLoadEnd={() => setWebLoading(false)}
            onError={() => {
              setWebLoading(false);
              setLoadError(true);
            }}
            onPermissionRequest={(request) => {
              // Auto-grant all WebView permission requests on Android
              if (Platform.OS === "android") {
                request.grant(request.resources);
              }
            }}
            setSupportMultipleWindows={false}
            scalesPageToFit={true}
            startInLoadingState={false}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  reloadBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  webContainer: { flex: 1 },
  webView: { flex: 1 },
  webLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
  },
});
