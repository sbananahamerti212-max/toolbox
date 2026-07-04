import * as Camera from "expo-camera";
import * as Contacts from "expo-contacts";
import * as LocalAuthentication from "expo-local-authentication";
import * as Location from "expo-location";
import * as MediaLibrary from "expo-media-library";
import * as Notifications from "expo-notifications";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";

export interface PermissionItem {
  key: string;
  label: string;
  description: string;
  status: "granted" | "denied" | "undetermined" | "unavailable";
  canAskAgain: boolean;
}

interface PermissionsContextValue {
  permissions: PermissionItem[];
  loading: boolean;
  requestPermission: (key: string) => Promise<void>;
  requestAll: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

const PERMISSION_KEYS = [
  "camera",
  "microphone",
  "location",
  "locationBackground",
  "mediaLibrary",
  "notifications",
  "contacts",
  "biometric",
];

async function checkStatus(key: string): Promise<Omit<PermissionItem, "key" | "label" | "description">> {
  try {
    switch (key) {
      case "camera": {
        const res = await Camera.getCameraPermissionsAsync();
        return { status: res.granted ? "granted" : res.status === "undetermined" ? "undetermined" : "denied", canAskAgain: res.canAskAgain };
      }
      case "microphone": {
        const res = await Camera.getMicrophonePermissionsAsync();
        return { status: res.granted ? "granted" : res.status === "undetermined" ? "undetermined" : "denied", canAskAgain: res.canAskAgain };
      }
      case "location": {
        const res = await Location.getForegroundPermissionsAsync();
        return { status: res.granted ? "granted" : res.status === "undetermined" ? "undetermined" : "denied", canAskAgain: res.canAskAgain };
      }
      case "locationBackground": {
        if (Platform.OS === "web") return { status: "unavailable", canAskAgain: false };
        const res = await Location.getBackgroundPermissionsAsync();
        return { status: res.granted ? "granted" : res.status === "undetermined" ? "undetermined" : "denied", canAskAgain: res.canAskAgain };
      }
      case "mediaLibrary": {
        const res = await MediaLibrary.getPermissionsAsync();
        return { status: res.granted ? "granted" : res.status === "undetermined" ? "undetermined" : "denied", canAskAgain: res.canAskAgain };
      }
      case "notifications": {
        const res = await Notifications.getPermissionsAsync();
        return { status: res.granted ? "granted" : res.status === "undetermined" ? "undetermined" : "denied", canAskAgain: res.canAskAgain };
      }
      case "contacts": {
        if (Platform.OS === "web") return { status: "unavailable", canAskAgain: false };
        const res = await Contacts.getPermissionsAsync();
        return { status: res.granted ? "granted" : res.status === "undetermined" ? "undetermined" : "denied", canAskAgain: res.canAskAgain };
      }
      case "biometric": {
        if (Platform.OS === "web") return { status: "unavailable", canAskAgain: false };
        const avail = await LocalAuthentication.hasHardwareAsync();
        if (!avail) return { status: "unavailable", canAskAgain: false };
        return { status: "undetermined", canAskAgain: true };
      }
      default:
        return { status: "undetermined", canAskAgain: true };
    }
  } catch {
    return { status: "undetermined", canAskAgain: true };
  }
}

async function requestPerm(key: string): Promise<void> {
  try {
    switch (key) {
      case "camera":
        await Camera.requestCameraPermissionsAsync();
        break;
      case "microphone":
        await Camera.requestMicrophonePermissionsAsync();
        break;
      case "location":
        await Location.requestForegroundPermissionsAsync();
        break;
      case "locationBackground":
        if (Platform.OS !== "web") await Location.requestBackgroundPermissionsAsync();
        break;
      case "mediaLibrary":
        await MediaLibrary.requestPermissionsAsync();
        break;
      case "notifications":
        await Notifications.requestPermissionsAsync();
        break;
      case "contacts":
        if (Platform.OS !== "web") await Contacts.requestPermissionsAsync();
        break;
      case "biometric":
        if (Platform.OS !== "web") await LocalAuthentication.authenticateAsync();
        break;
    }
  } catch {}
}

const LABELS: Record<string, { label: string; description: string }> = {
  camera: { label: "Câmera", description: "Acesso à câmera do dispositivo" },
  microphone: { label: "Microfone", description: "Gravação de áudio" },
  location: { label: "Localização", description: "GPS e localização em primeiro plano" },
  locationBackground: { label: "Local. em 2° plano", description: "Localização enquanto o app está fechado" },
  mediaLibrary: { label: "Galeria/Mídia", description: "Leitura e escrita na galeria" },
  notifications: { label: "Notificações", description: "Enviar notificações ao sistema" },
  contacts: { label: "Contatos", description: "Leitura da agenda de contatos" },
  biometric: { label: "Biometria", description: "Impressão digital / Face ID" },
};

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const buildPermissions = useCallback(async (): Promise<PermissionItem[]> => {
    const results = await Promise.all(
      PERMISSION_KEYS.map(async (key) => {
        const st = await checkStatus(key);
        return {
          key,
          label: LABELS[key]?.label ?? key,
          description: LABELS[key]?.description ?? "",
          ...st,
        };
      })
    );
    return results;
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    const result = await buildPermissions();
    setPermissions(result);
    setLoading(false);
  }, [buildPermissions]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const requestPermission = useCallback(
    async (key: string) => {
      await requestPerm(key);
      const updated = await buildPermissions();
      setPermissions(updated);
    },
    [buildPermissions]
  );

  const requestAll = useCallback(async () => {
    for (const key of PERMISSION_KEYS) {
      await requestPerm(key);
    }
    const updated = await buildPermissions();
    setPermissions(updated);
  }, [buildPermissions]);

  return (
    <PermissionsContext.Provider
      value={{ permissions, loading, requestPermission, requestAll, refreshAll }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions must be used within PermissionsProvider");
  return ctx;
}
