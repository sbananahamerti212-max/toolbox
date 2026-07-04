import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Linking, Platform } from "react-native";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { PermissionItem, usePermissions } from "@/context/PermissionsContext";

function statusColor(
  status: PermissionItem["status"],
  colors: ReturnType<typeof useColors>
) {
  switch (status) {
    case "granted":
      return colors.primary;
    case "denied":
      return colors.destructive;
    case "unavailable":
      return colors.mutedForeground;
    default:
      return "#f59e0b";
  }
}

function statusLabel(status: PermissionItem["status"]) {
  switch (status) {
    case "granted":
      return "Concedido";
    case "denied":
      return "Negado";
    case "unavailable":
      return "Indisponivel";
    default:
      return "Pendente";
  }
}

function statusIcon(status: PermissionItem["status"]) {
  switch (status) {
    case "granted":
      return "check-circle";
    case "denied":
      return "x-circle";
    case "unavailable":
      return "minus-circle";
    default:
      return "clock";
  }
}

function PermissionRow({
  item,
  onRequest,
  colors,
}: {
  item: PermissionItem;
  onRequest: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const iconColor = statusColor(item.status, colors);
  const isGranted = item.status === "granted";
  const isUnavailable = item.status === "unavailable";

  const handlePress = async () => {
    if (isGranted || isUnavailable) return;
    if (!item.canAskAgain && Platform.OS !== "web") {
      Linking.openSettings().catch(() => {});
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRequest();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isGranted || isUnavailable}
      style={[
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      activeOpacity={isGranted || isUnavailable ? 1 : 0.7}
    >
      <View style={[styles.statusDot, { backgroundColor: iconColor + "22" }]}>
        <Feather name={statusIcon(item.status) as any} size={18} color={iconColor} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>
          {item.label}
        </Text>
        <Text style={[styles.rowDesc, { color: colors.mutedForeground }]}>
          {item.description}
        </Text>
      </View>
      <View
        style={[
          styles.badge,
          { backgroundColor: iconColor + "22" },
        ]}
      >
        <Text style={[styles.badgeText, { color: iconColor }]}>
          {statusLabel(item.status)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { permissions, loading, requestPermission, requestAll } = usePermissions();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 84 : insets.bottom + 80;

  const granted = permissions.filter((p) => p.status === "granted").length;
  const total = permissions.filter((p) => p.status !== "unavailable").length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Permissoes
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {granted}/{total} concedidas
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.requestAllBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            requestAll();
          }}
        >
          <Feather name="shield" size={16} color={colors.primaryForeground} />
          <Text style={[styles.requestAllText, { color: colors.primaryForeground }]}>
            Todas
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={permissions}
          keyExtractor={(p) => p.key}
          contentContainerStyle={{ padding: 16, paddingBottom: botPad }}
          renderItem={({ item }) => (
            <PermissionRow
              item={item}
              colors={colors}
              onRequest={() => requestPermission(item.key)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListHeaderComponent={
            <View
              style={[
                styles.infoBox,
                { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" },
              ]}
            >
              <Feather name="info" size={16} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.primary }]}>
                As permissoes sao necessarias para que as ferramentas HTML acessem o hardware do dispositivo via WebView.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  requestAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  requestAllText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBox: {
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
  },
  statusDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: { flex: 1, gap: 2 },
  rowLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  rowDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
