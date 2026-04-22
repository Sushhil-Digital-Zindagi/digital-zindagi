/**
 * ChatContext — provides shared state for the Likeup chat module.
 * Wraps chat routes; provides ghost mode, study mode, auto-reply, and admin settings.
 */

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useChatAdminSettings, useChatProfile } from "../hooks/useChatQueries";
import type { ChatAdminSettings, ChatUserProfile } from "../types/chatTypes";

// ---- Default admin settings (used before canister loads) ----
const DEFAULT_ADMIN_SETTINGS: ChatAdminSettings = {
  chatEnabled: true,
  storiesEnabled: true,
  marketplaceEnabled: true,
  rewardsEnabled: true,
  premiumEnabled: true,
  maxFileSizeMb: 20,
  pointsPerMessage: 1,
  pointsPerDailyLogin: 10,
  pointsPerStory: 5,
  pointsPerReferral: 50,
  premiumPriceMonthly: 49,
  premiumPriceYearly: 399,
};

// ---- Context Shape ----

interface ChatContextType {
  /** Current user's chat profile (null if not loaded yet) */
  chatProfile: ChatUserProfile | null;
  chatProfileLoading: boolean;

  /** Ghost mode: when ON, read receipts are suppressed */
  ghostMode: boolean;
  setGhostMode: (enabled: boolean) => void;

  /** Study mode: only selected chats notify, starred messages go to Notes */
  studyMode: boolean;
  setStudyMode: (enabled: boolean) => void;

  /**
   * Conversations allowed to notify in study mode.
   * Empty = all muted. '*' = all allowed.
   */
  studyModeChats: string[];
  setStudyModeChats: (ids: string[]) => void;

  /** Returns true if a conversation is muted in study mode */
  isMuted: (conversationId: string) => boolean;

  /** Auto-reply toggle and message */
  autoReplyEnabled: boolean;
  setAutoReplyEnabled: (enabled: boolean) => void;
  autoReplyText: string;
  setAutoReplyText: (text: string) => void;

  /** Admin settings controlling feature visibility */
  adminSettings: ChatAdminSettings;
  adminSettingsLoading: boolean;

  /** Currently active conversation id (for URL-less navigation state) */
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
}

// ---- Context ----

const ChatContext = createContext<ChatContextType>({
  chatProfile: null,
  chatProfileLoading: true,
  ghostMode: false,
  setGhostMode: () => {},
  studyMode: false,
  setStudyMode: () => {},
  studyModeChats: [],
  setStudyModeChats: () => {},
  isMuted: () => false,
  autoReplyEnabled: false,
  setAutoReplyEnabled: () => {},
  autoReplyText: "Abhi busy hoon, baad mein reply karunga 🙏",
  setAutoReplyText: () => {},
  adminSettings: DEFAULT_ADMIN_SETTINGS,
  adminSettingsLoading: true,
  activeConversationId: null,
  setActiveConversationId: () => {},
});

// ---- Local Storage Helpers ----

function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === "true";
  } catch {
    return fallback;
  }
}

function readStr(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ---- Provider ----

export function ChatProvider({ children }: { children: ReactNode }) {
  const { data: chatProfile, isLoading: chatProfileLoading } = useChatProfile();
  const { data: adminSettingsData, isLoading: adminSettingsLoading } =
    useChatAdminSettings();

  // Ghost mode — persisted to localStorage, synced with chat profile
  const [ghostMode, setGhostModeState] = useState<boolean>(() =>
    readBool("dz_chat_ghost_mode", false),
  );

  // Study mode state
  const [studyMode, setStudyModeState] = useState<boolean>(() =>
    readBool("dz_chat_study_mode", false),
  );
  const [studyModeChats, setStudyModeChatsState] = useState<string[]>(() =>
    readJson<string[]>("dz_chat_study_chats", []),
  );

  // Auto-reply state
  const [autoReplyEnabled, setAutoReplyEnabledState] = useState<boolean>(() =>
    readBool("dz_chat_auto_reply", false),
  );
  const [autoReplyText, setAutoReplyTextState] = useState<string>(() =>
    readStr(
      "dz_chat_auto_reply_text",
      "Abhi busy hoon, baad mein reply karunga 🙏",
    ),
  );

  // Active conversation id
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  // Sync settings from profile when it first loads (one-time hydration)
  useEffect(() => {
    if (!chatProfile) return;
    setGhostModeState(chatProfile.ghostModeEnabled);
    setStudyModeState(chatProfile.studyModeEnabled);
    setStudyModeChatsState(chatProfile.studyModeChats);
    setAutoReplyEnabledState(chatProfile.autoReplyEnabled);
    setAutoReplyTextState(chatProfile.autoReplyText);
  }, [
    chatProfile,
    chatProfile?.ghostModeEnabled,
    chatProfile?.studyModeEnabled,
    chatProfile?.studyModeChats,
    chatProfile?.autoReplyEnabled,
    chatProfile?.autoReplyText,
  ]);

  const setGhostMode = useCallback((enabled: boolean) => {
    setGhostModeState(enabled);
    localStorage.setItem("dz_chat_ghost_mode", String(enabled));
  }, []);

  const setStudyMode = useCallback((enabled: boolean) => {
    setStudyModeState(enabled);
    localStorage.setItem("dz_chat_study_mode", String(enabled));
  }, []);

  const setStudyModeChats = useCallback((ids: string[]) => {
    setStudyModeChatsState(ids);
    localStorage.setItem("dz_chat_study_chats", JSON.stringify(ids));
  }, []);

  const setAutoReplyEnabled = useCallback((enabled: boolean) => {
    setAutoReplyEnabledState(enabled);
    localStorage.setItem("dz_chat_auto_reply", String(enabled));
  }, []);

  const setAutoReplyText = useCallback((text: string) => {
    setAutoReplyTextState(text);
    localStorage.setItem("dz_chat_auto_reply_text", text);
  }, []);

  /** Returns true if the conversation should be muted in study mode. */
  const isMuted = useCallback(
    (conversationId: string): boolean => {
      if (!studyMode) return false;
      if (studyModeChats.length === 0) return true;
      return !studyModeChats.includes(conversationId);
    },
    [studyMode, studyModeChats],
  );

  const adminSettings: ChatAdminSettings =
    adminSettingsData ?? DEFAULT_ADMIN_SETTINGS;

  return (
    <ChatContext.Provider
      value={{
        chatProfile: chatProfile ?? null,
        chatProfileLoading,
        ghostMode,
        setGhostMode,
        studyMode,
        setStudyMode,
        studyModeChats,
        setStudyModeChats,
        isMuted,
        autoReplyEnabled,
        setAutoReplyEnabled,
        autoReplyText,
        setAutoReplyText,
        adminSettings,
        adminSettingsLoading,
        activeConversationId,
        setActiveConversationId,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  return useContext(ChatContext);
}
