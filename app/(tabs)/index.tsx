import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { Tool, useTools } from "@/context/ToolsContext";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function ToolCard({
  tool,
  onPress,
  onDelete,
  onRename,
  onExport,
  colors,
}: {
  tool: Tool;
  onPress: () => void;
  onDelete: () => void;
  onRename: () => void;
  onExport: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const [menuOpen, setMenuOpen] = useState(false);

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setMenuOpen(true);
        }}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.cardIcon}>
          <MaterialCommunityIcons
            name="language-html5"
            size={32}
            color={colors.primary}
          />
        </View>
        <View style={styles.cardBody}>
          <Text
            style={[styles.cardTitle, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {tool.name}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
            {tool.fileName} · {formatSize(tool.size)} · {formatDate(tool.createdAt)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setMenuOpen(true)}
          hitSlop={12}
          style={styles.moreBtn}
        >
          <Feather name="more-vertical" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </Pressable>

      <Modal
        transparent
        visible={menuOpen}
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMenuOpen(false)}
        >
          <View
            style={[
              styles.menu,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text
              style={[styles.menuTitle, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {tool.name}
            </Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                onPress();
              }}
            >
              <Feather name="play" size={18} color={colors.primary} />
              <Text style={[styles.menuText, { color: colors.foreground }]}>
                Executar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                onRename();
              }}
            >
              <Feather name="edit-2" size={18} color={colors.foreground} />
              <Text style={[styles.menuText, { color: colors.foreground }]}>
                Renomear
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                onExport();
              }}
            >
              <Feather name="share" size={18} color={colors.foreground} />
              <Text style={[styles.menuText, { color: colors.foreground }]}>
                Exportar / Compartilhar
              </Text>
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                onDelete();
              }}
            >
              <Feather name="trash-2" size={18} color={colors.destructive} />
              <Text style={[styles.menuText, { color: colors.destructive }]}>
                Deletar
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </Animated.View>
  );
}

export default function ToolsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tools, loading, addTool, deleteTool, renameTool, exportTool } = useTools();

  const [renameModal, setRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Tool | null>(null);
  const [renameName, setRenameName] = useState("");
  const [importing, setImporting] = useState(false);

  const handleImport = useCallback(async () => {
    try {
      setImporting(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/html", "application/octet-stream", "*/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const content = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const baseName = asset.name.replace(/\.[^/.]+$/, "") || "tool";
      await addTool(baseName, content, asset.name);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Erro", "Não foi possível importar o arquivo.");
    } finally {
      setImporting(false);
    }
  }, [addTool]);

  const handleRun = useCallback((tool: Tool) => {
    router.push({ pathname: "/run/[id]", params: { id: tool.id } });
  }, []);

  const handleDelete = useCallback(
    (tool: Tool) => {
      Alert.alert(
        "Deletar ferramenta",
        `Deseja deletar "${tool.name}"?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Deletar",
            style: "destructive",
            onPress: async () => {
              await deleteTool(tool.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            },
          },
        ]
      );
    },
    [deleteTool]
  );

  const handleRenameOpen = useCallback((tool: Tool) => {
    setRenameTarget(tool);
    setRenameName(tool.name);
    setRenameModal(true);
  }, []);

  const handleRenameSave = useCallback(async () => {
    if (!renameTarget || !renameName.trim()) return;
    await renameTool(renameTarget.id, renameName.trim());
    setRenameModal(false);
    setRenameTarget(null);
  }, [renameTarget, renameName, renameTool]);

  const handleExport = useCallback(
    async (tool: Tool) => {
      if (Platform.OS === "web") {
        Alert.alert("Info", "Exportação disponível apenas no dispositivo Android.");
        return;
      }
      try {
        const { Sharing } = await import("expo-sharing");
        const available = await Sharing.isAvailableAsync();
        if (!available) {
          Alert.alert("Info", "Compartilhamento não disponível neste dispositivo.");
          return;
        }
        const path = await exportTool(tool);
        await Sharing.shareAsync(path, {
          dialogTitle: `Exportar ${tool.fileName}`,
          mimeType: "text/html",
          UTI: "public.html",
        });
      } catch {
        Alert.alert("Erro", "Não foi possível exportar.");
      }
    },
    [exportTool]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 84 : insets.bottom + 80;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
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
            ToolBox
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {tools.length} {tools.length === 1 ? "ferramenta" : "ferramentas"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.importBtn, { backgroundColor: colors.primary }]}
          onPress={handleImport}
          disabled={importing}
        >
          {importing ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Feather name="plus" size={20} color={colors.primaryForeground} />
          )}
        </TouchableOpacity>
      </View>

      {/* Tool list */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : tools.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons
            name="toolbox-outline"
            size={64}
            color={colors.mutedForeground}
          />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Nenhuma ferramenta
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Toque no + para importar um arquivo HTML
          </Text>
        </View>
      ) : (
        <FlatList
          data={tools}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 16, paddingBottom: botPad }}
          renderItem={({ item }) => (
            <ToolCard
              tool={item}
              colors={colors}
              onPress={() => handleRun(item)}
              onDelete={() => handleDelete(item)}
              onRename={() => handleRenameOpen(item)}
              onExport={() => handleExport(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* Rename modal */}
      <Modal
        transparent
        visible={renameModal}
        animationType="fade"
        onRequestClose={() => setRenameModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setRenameModal(false)}
        >
          <Pressable
            style={[
              styles.renameBox,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.renameTitle, { color: colors.foreground }]}>
              Renomear ferramenta
            </Text>
            <TextInput
              style={[
                styles.renameInput,
                {
                  backgroundColor: colors.muted,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
              value={renameName}
              onChangeText={setRenameName}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={handleRenameSave}
            />
            <View style={styles.renameButtons}>
              <TouchableOpacity
                style={[styles.renameCancel, { borderColor: colors.border }]}
                onPress={() => setRenameModal(false)}
              >
                <Text style={[styles.renameBtnText, { color: colors.mutedForeground }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.renameSave, { backgroundColor: colors.primary }]}
                onPress={handleRenameSave}
              >
                <Text style={[styles.renameBtnText, { color: colors.primaryForeground }]}>
                  Salvar
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  importBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
  },
  cardIcon: { width: 44, alignItems: "center" },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  cardMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  moreBtn: { padding: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  menu: {
    width: 260,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    padding: 8,
  },
  menuTitle: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  menuText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  menuDivider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  renameBox: {
    width: 300,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 16,
  },
  renameTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  renameInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  renameButtons: {
    flexDirection: "row",
    gap: 10,
  },
  renameCancel: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  renameSave: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  renameBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
