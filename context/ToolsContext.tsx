import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface Tool {
  id: string;
  name: string;
  fileName: string;
  createdAt: number;
  size: number;
  filePath: string;
}

interface ToolsContextValue {
  tools: Tool[];
  loading: boolean;
  addTool: (name: string, content: string, fileName: string) => Promise<Tool>;
  deleteTool: (id: string) => Promise<void>;
  renameTool: (id: string, newName: string) => Promise<void>;
  getToolContent: (tool: Tool) => Promise<string>;
  exportTool: (tool: Tool) => Promise<string>;
  refreshTools: () => Promise<void>;
}

const ToolsContext = createContext<ToolsContextValue | null>(null);

const TOOLS_DIR = `${FileSystem.documentDirectory}tools/`;
const TOOLS_INDEX_KEY = "toolbox_tools_index";

export function ToolsProvider({ children }: { children: React.ReactNode }) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  const ensureToolsDir = async () => {
    const info = await FileSystem.getInfoAsync(TOOLS_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(TOOLS_DIR, { intermediates: true });
    }
  };

  const saveIndex = async (list: Tool[]) => {
    await AsyncStorage.setItem(TOOLS_INDEX_KEY, JSON.stringify(list));
  };

  const loadTools = useCallback(async () => {
    try {
      await ensureToolsDir();
      const raw = await AsyncStorage.getItem(TOOLS_INDEX_KEY);
      if (raw) {
        const parsed: Tool[] = JSON.parse(raw);
        setTools(parsed);
      }
    } catch {
      setTools([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  const addTool = useCallback(
    async (name: string, content: string, fileName: string): Promise<Tool> => {
      await ensureToolsDir();
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const safeFileName = fileName.endsWith(".html") ? fileName : `${fileName}.html`;
      const filePath = `${TOOLS_DIR}${id}_${safeFileName}`;

      await FileSystem.writeAsStringAsync(filePath, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const info = await FileSystem.getInfoAsync(filePath);
      const size = info.exists && "size" in info ? (info.size ?? 0) : 0;

      const tool: Tool = {
        id,
        name,
        fileName: safeFileName,
        createdAt: Date.now(),
        size,
        filePath,
      };

      const updated = [...tools, tool];
      setTools(updated);
      await saveIndex(updated);
      return tool;
    },
    [tools]
  );

  const deleteTool = useCallback(
    async (id: string) => {
      const tool = tools.find((t) => t.id === id);
      if (tool) {
        try {
          await FileSystem.deleteAsync(tool.filePath, { idempotent: true });
        } catch {}
      }
      const updated = tools.filter((t) => t.id !== id);
      setTools(updated);
      await saveIndex(updated);
    },
    [tools]
  );

  const renameTool = useCallback(
    async (id: string, newName: string) => {
      const updated = tools.map((t) =>
        t.id === id ? { ...t, name: newName } : t
      );
      setTools(updated);
      await saveIndex(updated);
    },
    [tools]
  );

  const getToolContent = useCallback(async (tool: Tool): Promise<string> => {
    return await FileSystem.readAsStringAsync(tool.filePath, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }, []);

  const exportTool = useCallback(async (tool: Tool): Promise<string> => {
    return tool.filePath;
  }, []);

  const refreshTools = useCallback(async () => {
    setLoading(true);
    await loadTools();
  }, [loadTools]);

  return (
    <ToolsContext.Provider
      value={{
        tools,
        loading,
        addTool,
        deleteTool,
        renameTool,
        getToolContent,
        exportTool,
        refreshTools,
      }}
    >
      {children}
    </ToolsContext.Provider>
  );
}

export function useTools() {
  const ctx = useContext(ToolsContext);
  if (!ctx) throw new Error("useTools must be used within ToolsProvider");
  return ctx;
}
