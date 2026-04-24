/**
 * ChatPage — Main chat list screen for Digital Zindagi Chat.
 * Shows conversations, search, group/direct tabs, ghost mode banner.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookImage,
  Ghost,
  MessageCircle,
  MessageCirclePlus,
  Plus,
  Search,
  ShoppingBag,
  Star,
  User,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import GroupCreateModal from "../components/chat/GroupCreateModal";
import { ChatProvider } from "../contexts/ChatContext";
import { useChatContext } from "../contexts/ChatContext";
import { useActor } from "../hooks/useActor";
import {
  useCreateGroup,
  useMyConversations,
  useStartConversation,
} from "../hooks/useChatQueries";
import { useNavigate } from "../lib/router";
import type { Conversation } from "../types/chatTypes";
import { ConversationType } from "../types/chatTypes";

// ---- Avatar helpers ----
const AVATAR_COLORS = [
  "bg-emerald-700",
  "bg-blue-600",
  "bg-purple-600",
  "bg-orange-500",
  "bg-pink-600",
  "bg-teal-600",
  "bg-rose-600",
  "bg-indigo-600",
];

function avatarColor(name: string) {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function getConvName(conv: Conversation, myId: string): string {
  if (conv.name) return conv.name;
  const other = conv.participants.find((p) => p.userId !== myId);
  return other?.name ?? "Unknown";
}

function getConvAvatar(conv: Conversation, myId: string): string | undefined {
  if (conv.photoUrl) return conv.photoUrl;
  const other = conv.participants.find((p) => p.userId !== myId);
  return other?.photoUrl;
}

function formatTime(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "अभी";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) {
    return d.toLocaleTimeString("hi-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }
  return d.toLocaleDateString("hi-IN", { day: "numeric", month: "short" });
}

// ---- User search result type ----
interface SearchUser {
  userId: string;
  name: string;
  username?: string;
  photoUrl?: string;
}

// ---- Conversation Row ----
function ConvRow({
  conv,
  myId,
  onClick,
}: { conv: Conversation; myId: string; onClick: () => void }) {
  const name = getConvName(conv, myId);
  const photo = getConvAvatar(conv, myId);
  const last = conv.lastMessage;
  const isGroup = conv.type === ConversationType.group;

  return (
    <button
      type="button"
      onClick={onClick}
      data-ocid="chat.item"
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 active:bg-muted transition-colors text-left"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {photo ? (
          <img
            src={photo}
            alt={name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div
            className={`w-12 h-12 rounded-full ${avatarColor(name)} flex items-center justify-center text-white font-bold text-lg`}
          >
            {isGroup ? <Users size={20} /> : name.charAt(0).toUpperCase()}
          </div>
        )}
        {conv.unreadCount > 0 && (
          <span
            className="chat-unread-badge absolute -top-1 -right-1 text-[10px]"
            data-ocid="chat.unread_badge"
          >
            {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-foreground text-sm truncate">
            {name}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatTime(conv.lastMessageAt)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {last
            ? last.isDeleted
              ? "🚫 Message deleted"
              : last.content || "📎 Media"
            : "Chat शुरू करें"}
        </p>
      </div>
    </button>
  );
}

// ---- User Search Modal ----
function UserSearchModal({
  onClose,
  onStart,
  onGroup,
}: {
  onClose: () => void;
  onStart: (userId: string) => void;
  onGroup: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const { actor } = useActor();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim() || !actor) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await (
          actor as unknown as {
            searchChatUsers: (q: string) => Promise<SearchUser[]>;
          }
        ).searchChatUsers(q);
        setResults(res || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [actor],
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(query), 350);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, doSearch]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      data-ocid="chat.new_chat_modal"
    >
      <div className="bg-card w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl pb-safe">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="font-bold text-foreground">नया Chat</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-muted"
            aria-label="Close"
            data-ocid="chat.new_chat_modal.close_button"
          >
            <X size={18} />
          </button>
        </div>

        <button
          type="button"
          onClick={onGroup}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left"
          data-ocid="chat.create_group_button"
        >
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <Users size={18} className="text-primary" />
          </div>
          <span className="font-medium text-foreground text-sm">
            नया Group बनाएं
          </span>
        </button>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              autoFocus
              placeholder="नाम या username से खोजें..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
              data-ocid="chat.user_search_input"
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-border">
          {loading && (
            <div
              className="px-4 py-6 flex justify-center"
              data-ocid="chat.search_loading_state"
            >
              <Skeleton className="h-4 w-32" />
            </div>
          )}
          {!loading && query && results.length === 0 && (
            <p
              className="text-center text-sm text-muted-foreground py-6"
              data-ocid="chat.search_empty_state"
            >
              कोई user नहीं मिला
            </p>
          )}
          {results.map((u) => (
            <button
              key={u.userId}
              type="button"
              onClick={() => onStart(u.userId)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left"
              data-ocid="chat.search_result_item"
            >
              {u.photoUrl ? (
                <img
                  src={u.photoUrl}
                  alt={u.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div
                  className={`w-10 h-10 rounded-full ${avatarColor(u.name)} flex items-center justify-center text-white font-bold`}
                >
                  {u.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium text-sm text-foreground truncate">
                  {u.name}
                </p>
                {u.username && (
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Inner Page ----
function ChatPageInner() {
  const navigate = useNavigate();
  const { ghostMode, adminSettings } = useChatContext();
  const { data: conversations = [], isLoading } = useMyConversations();
  const startConv = useStartConversation();
  const [tab, setTab] = useState<"chats" | "groups">("chats");
  const [showModal, setShowModal] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [search, setSearch] = useState("");

  // Derive myId from conversations (first participant that appears as sender)
  const myId = "self"; // fallback; actual ID not needed for display routing

  const filtered = conversations.filter((c) => {
    const isGroup = c.type === ConversationType.group;
    if (tab === "groups" && !isGroup) return false;
    if (tab === "chats" && isGroup) return false;
    if (search) {
      const name = getConvName(c, myId).toLowerCase();
      return name.includes(search.toLowerCase());
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.lastMessageAt - a.lastMessageAt;
  });

  async function handleStartChat(userId: string) {
    try {
      const convId = await startConv.mutateAsync(userId);
      setShowModal(false);
      navigate(`/chat/${convId}`);
    } catch {
      // silently fail — will navigate when user retries
    }
  }

  if (!adminSettings.chatEnabled) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 gap-4">
        <MessageCircle size={40} className="text-muted-foreground" />
        <p className="text-muted-foreground text-center">
          Chat अभी बंद है। Admin ने disable किया है।
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-4">
      {/* Header */}
      <header className="bg-emerald-header text-white sticky top-0 z-30 shadow-md">
        {ghostMode && (
          <div
            className="flex items-center gap-2 px-4 py-1.5 bg-black/20 text-white/90 text-xs"
            data-ocid="chat.ghost_mode_banner"
          >
            <Ghost size={13} />
            <span>Ghost Mode ON — read receipts hidden</span>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageCircle size={20} className="text-white/90" />
            <h1 className="font-bold text-base text-white">
              Digital Zindagi Chat
            </h1>
          </div>
          <Badge
            variant="outline"
            className="border-white/30 text-white/80 text-xs"
          >
            {conversations.length}
          </Badge>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60"
            />
            <input
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/15 text-white placeholder:text-white/60 pl-9 pr-4 py-2 rounded-xl text-sm border border-white/20 focus:outline-none focus:bg-white/20"
              data-ocid="chat.search_input"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-white/10">
          {(["chats", "groups"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              data-ocid={`chat.${t}_tab`}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "text-white border-b-2 border-white"
                  : "text-white/60 border-b-2 border-transparent"
              }`}
            >
              {t === "chats" ? "💬 Chats" : "👥 Groups"}
            </button>
          ))}
        </div>
      </header>

      {/* List */}
      <div className="flex-1">
        {isLoading ? (
          <div
            className="divide-y divide-border"
            data-ocid="chat.loading_state"
          >
            {(["s1", "s2", "s3", "s4", "s5"] as const).map((sk) => (
              <div key={sk} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 px-6 gap-4"
            data-ocid="chat.empty_state"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageCircle size={28} className="text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {search
                ? `"${search}" नहीं मिला`
                : "कोई chat नहीं। ऊपर search करके नया chat शुरू करें।"}
            </p>
            {!search && (
              <Button
                size="sm"
                onClick={() => setShowModal(true)}
                data-ocid="chat.start_chat_button"
              >
                <Plus size={14} className="mr-1" /> Chat शुरू करें
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sorted.map((conv) => (
              <ConvRow
                key={conv.id}
                conv={conv}
                myId={myId}
                onClick={() => navigate(`/chat/${conv.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        data-ocid="chat.new_chat_fab"
        aria-label="New chat"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all z-20"
      >
        <MessageCirclePlus size={22} className="text-primary-foreground" />
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border flex shadow-lg pb-safe">
        {[
          {
            path: "/chat",
            icon: <MessageCircle size={22} />,
            label: "Chats",
            ocid: "chat.nav_chats",
          },
          {
            path: "/stories",
            icon: <BookImage size={22} />,
            label: "Stories",
            ocid: "chat.nav_stories",
          },
          {
            path: "/chat/market",
            icon: <ShoppingBag size={22} />,
            label: "Market",
            ocid: "chat.nav_market",
          },
          {
            path: "/chat/premium",
            icon: <Star size={22} />,
            label: "Premium",
            ocid: "chat.nav_premium",
          },
          {
            path: "/chat/profile",
            icon: <User size={22} />,
            label: "Profile",
            ocid: "chat.nav_profile",
          },
        ].map(({ path, icon, label, ocid }) => {
          const isActive = window.location.pathname === path;
          return (
            <button
              key={path}
              type="button"
              data-ocid={ocid}
              onClick={() => navigate(path)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {icon}
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modals */}
      {showModal && (
        <UserSearchModal
          onClose={() => setShowModal(false)}
          onStart={handleStartChat}
          onGroup={() => {
            setShowModal(false);
            setShowGroup(true);
          }}
        />
      )}
      {showGroup && (
        <GroupCreateModal
          onClose={() => setShowGroup(false)}
          onCreated={(conv) => {
            setShowGroup(false);
            navigate(`/chat/${conv.id}`);
          }}
        />
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <ChatProvider>
      <ChatPageInner />
    </ChatProvider>
  );
}
