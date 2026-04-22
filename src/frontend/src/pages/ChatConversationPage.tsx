/**
 * ChatConversationPage — Individual chat screen.
 * Supports text, image, voice-to-text, vanish mode, reactions, YouTube preview, group @mention.
 */

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Copy,
  Forward,
  Ghost,
  Hourglass,
  Image as ImageIcon,
  Lock,
  Mic,
  MicOff,
  MoreVertical,
  Reply,
  Send,
  SmilePlus,
  Timer,
  Trash2,
  Users,
  X,
  Youtube,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// ---- SpeechRecognition types (local to this file only) ----
interface ConvSpeechResultItem {
  readonly transcript: string;
  readonly confidence: number;
}
interface ConvSpeechResult {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [idx: number]: ConvSpeechResultItem;
}
interface ConvSpeechResultList {
  readonly length: number;
  readonly [idx: number]: ConvSpeechResult;
}
interface ConvSpeechEvent extends Event {
  readonly results: ConvSpeechResultList;
  readonly resultIndex: number;
}
interface ConvSpeechInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onresult: ((e: ConvSpeechEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
}

import AISummaryModal from "../components/chat/AISummaryModal";
import LockedMessageBubble from "../components/chat/LockedMessageBubble";
import PayToUnlockModal from "../components/chat/PayToUnlockModal";
import SendLockedFileModal from "../components/chat/SendLockedFileModal";
import { ChatProvider, useChatContext } from "../contexts/ChatContext";
import {
  useConversationMessages,
  useDeleteMessage,
  useMarkConversationRead,
  useMyConversations,
  useReactToMessage,
  useSendMessage,
} from "../hooks/useChatQueries";
import { useLocation, useNavigate } from "../lib/router";
import type { ChatMessage, Conversation } from "../types/chatTypes";
import {
  ConversationType,
  LockType,
  MessageStatus,
  MessageType,
} from "../types/chatTypes";

// ---- Helpers ----
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
  let s = 0;
  for (let i = 0; i < name.length; i++) s += name.charCodeAt(i);
  return AVATAR_COLORS[s % AVATAR_COLORS.length];
}
function formatMsgTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("hi-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
function extractYouTubeId(url: string): string | null {
  const re =
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
  const m = url.match(re);
  return m ? m[1] : null;
}
function isYouTubeUrl(url: string): boolean {
  return url.includes("youtube.com") || url.includes("youtu.be");
}

// ---- Status ticks ----
function StatusTick({ status }: { status: MessageStatus }) {
  if (status === MessageStatus.sending)
    return <Clock size={11} className="text-white/60" />;
  if (status === MessageStatus.sent)
    return <Check size={11} className="text-white/70" />;
  if (status === MessageStatus.delivered)
    return <CheckCheck size={11} className="text-white/70" />;
  if (status === MessageStatus.read)
    return <CheckCheck size={11} className="text-blue-300" />;
  return null;
}

// ---- YouTube inline card ----
function YouTubeCard({ url }: { url: string }) {
  const id = extractYouTubeId(url);
  if (!id)
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-blue-300 underline text-sm break-all"
      >
        {url}
      </a>
    );
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block rounded-xl overflow-hidden border border-white/20 mt-1 max-w-[240px]"
    >
      <img
        src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
        alt="YouTube video"
        className="w-full aspect-video object-cover"
      />
      <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1.5">
        <Youtube size={14} className="text-red-400" />
        <span className="text-white text-xs font-medium">Watch on YouTube</span>
      </div>
    </a>
  );
}

// ---- Emoji reaction strip ----
const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

function EmojiReactionPicker({
  onPick,
  onClose,
}: { onPick: (e: string) => void; onClose: () => void }) {
  return (
    <div
      className="absolute bottom-full mb-1 left-0 z-40 bg-card border border-border rounded-2xl shadow-xl flex gap-1 p-2"
      data-ocid="chat.reaction_picker"
    >
      {REACTION_EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => {
            onPick(e);
            onClose();
          }}
          className="text-lg hover:scale-125 transition-transform"
          aria-label={e}
        >
          {e}
        </button>
      ))}
      <button
        type="button"
        onClick={onClose}
        className="ml-1 text-muted-foreground hover:text-foreground"
        aria-label="Close reactions"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ---- Context Menu ----
interface CtxMenuProps {
  msg: ChatMessage;
  isMine: boolean;
  onReply: () => void;
  onReact: () => void;
  onCopy: () => void;
  onDeleteMe: () => void;
  onDeleteAll: () => void;
  onClose: () => void;
}
function MessageContextMenu({
  msg: _msg,
  isMine,
  onReply,
  onReact,
  onCopy,
  onDeleteMe,
  onDeleteAll,
  onClose,
}: CtxMenuProps) {
  return (
    <div
      className={`absolute z-40 bg-card border border-border rounded-2xl shadow-xl py-1 min-w-[160px] ${isMine ? "right-0" : "left-0"} bottom-full mb-1`}
      data-ocid="chat.context_menu"
    >
      {[
        {
          icon: <Reply size={14} />,
          label: "Reply",
          action: onReply,
          ocid: "chat.context_reply",
        },
        {
          icon: <SmilePlus size={14} />,
          label: "React",
          action: onReact,
          ocid: "chat.context_react",
        },
        {
          icon: <Copy size={14} />,
          label: "Copy",
          action: onCopy,
          ocid: "chat.context_copy",
        },
        {
          icon: <Forward size={14} />,
          label: "Forward",
          action: () => toast.info("Forward coming soon"),
          ocid: "chat.context_forward",
        },
      ].map((item) => (
        <button
          key={item.label}
          type="button"
          data-ocid={item.ocid}
          onClick={() => {
            item.action();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-foreground"
        >
          {item.icon} {item.label}
        </button>
      ))}
      <div className="border-t border-border my-1" />
      <button
        type="button"
        data-ocid="chat.delete_me_button"
        onClick={() => {
          onDeleteMe();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted text-muted-foreground"
      >
        <Trash2 size={14} /> Delete for me
      </button>
      {isMine && (
        <button
          type="button"
          data-ocid="chat.delete_all_button"
          onClick={() => {
            onDeleteAll();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-destructive/10 text-destructive"
        >
          <Trash2 size={14} /> Delete for everyone
        </button>
      )}
    </div>
  );
}

// ---- Message Bubble ----
function MessageBubble({
  msg,
  isMine,
  conversationId,
  onReplyTo,
}: {
  msg: ChatMessage;
  isMine: boolean;
  conversationId: string;
  onReplyTo: (m: ChatMessage) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReact, setShowReact] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteMutation = useDeleteMessage();
  const reactMutation = useReactToMessage();

  function startPress() {
    pressTimer.current = setTimeout(() => setShowMenu(true), 500);
  }
  function endPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }

  function handleCopy() {
    navigator.clipboard.writeText(msg.content).catch(() => {});
    toast.success("Copied");
  }

  function handleDeleteMe() {
    deleteMutation.mutate({
      messageId: msg.id,
      conversationId,
      forEveryone: false,
    });
  }

  function handleDeleteAll() {
    deleteMutation.mutate({
      messageId: msg.id,
      conversationId,
      forEveryone: true,
    });
  }

  function handleReact(emoji: string) {
    reactMutation.mutate({ messageId: msg.id, conversationId, emoji });
  }

  if (msg.isDeleted) {
    return (
      <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}>
        <span className="text-xs italic text-muted-foreground px-3 py-1.5 rounded-xl bg-muted/50">
          🚫 This message was deleted
        </span>
      </div>
    );
  }

  const hasYouTube = isYouTubeUrl(msg.content);

  return (
    <div
      className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1.5 group`}
      data-ocid="chat.message_item"
    >
      <div
        className="relative max-w-[75%]"
        onMouseDown={startPress}
        onMouseUp={endPress}
        onTouchStart={startPress}
        onTouchEnd={endPress}
      >
        {/* Reply preview */}
        {msg.replyToId && msg.replyToContent && (
          <div
            className={`text-xs px-2 py-1 rounded-t-xl mb-0.5 border-l-2 ${isMine ? "bg-primary/30 border-white/40 text-white/80" : "bg-muted border-primary text-muted-foreground"}`}
          >
            ↩ {msg.replyToContent.slice(0, 60)}
            {msg.replyToContent.length > 60 ? "..." : ""}
          </div>
        )}

        <div
          className={`px-3 py-2 ${isMine ? "chat-bubble-sender" : "chat-bubble-receiver"}`}
        >
          {/* Sender name in groups */}
          {!isMine && msg.senderName && (
            <p className="text-[11px] font-semibold text-primary mb-0.5">
              {msg.senderName}
            </p>
          )}

          {/* Content */}
          {msg.type === MessageType.image && msg.mediaUrl ? (
            <img
              src={msg.mediaUrl}
              alt="shared"
              className="rounded-xl max-w-full max-h-52 object-cover mb-1"
            />
          ) : hasYouTube ? (
            <YouTubeCard url={msg.content} />
          ) : (
            <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">
              {msg.content}
            </p>
          )}

          {/* Vanish timer badge */}
          {msg.isVanish && (
            <span className="flex items-center gap-1 text-[10px] mt-1 opacity-80">
              <Hourglass size={10} /> 10s
            </span>
          )}

          {/* Footer: time + status */}
          <div
            className={`flex items-center gap-1 justify-end mt-1 ${isMine ? "opacity-80" : ""}`}
          >
            <span className="text-[10px] opacity-70">
              {formatMsgTime(msg.createdAt)}
            </span>
            {isMine && <StatusTick status={msg.status} />}
          </div>
        </div>

        {/* Reactions */}
        {msg.reactions.length > 0 && (
          <div
            className={`flex gap-0.5 flex-wrap mt-0.5 ${isMine ? "justify-end" : "justify-start"}`}
          >
            {Object.entries(
              msg.reactions.reduce<Record<string, number>>((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {}),
            ).map(([emoji, count]) => (
              <span
                key={emoji}
                className="bg-card border border-border rounded-full px-1.5 py-0.5 text-xs shadow-sm"
              >
                {emoji} {count > 1 && count}
              </span>
            ))}
          </div>
        )}

        {/* Context / Reaction overlays */}
        {showReact && (
          <EmojiReactionPicker
            onPick={handleReact}
            onClose={() => setShowReact(false)}
          />
        )}
        {showMenu && (
          <MessageContextMenu
            msg={msg}
            isMine={isMine}
            onReply={() => onReplyTo(msg)}
            onReact={() => {
              setShowMenu(false);
              setShowReact(true);
            }}
            onCopy={handleCopy}
            onDeleteMe={handleDeleteMe}
            onDeleteAll={handleDeleteAll}
            onClose={() => setShowMenu(false)}
          />
        )}
      </div>
    </div>
  );
}

// ---- Input Area ----
interface InputAreaProps {
  conversationId: string;
  vanishMode: boolean;
  replyTo: ChatMessage | null;
  onClearReply: () => void;
  members: { userId: string; name: string }[];
  isGroup: boolean;
  onOpenLockFile: () => void;
}
function InputArea({
  conversationId,
  vanishMode,
  replyTo,
  onClearReply,
  members,
  isGroup,
  onOpenLockFile,
}: InputAreaProps) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const sendMsg = useSendMessage();
  const recognitionRef = useRef<ConvSpeechInstance | null>(null);

  const filteredMembers = useMemo(
    () =>
      members
        .filter((m) =>
          m.name.toLowerCase().includes(mentionQuery.toLowerCase()),
        )
        .slice(0, 6),
    [members, mentionQuery],
  );

  function handleTextChange(val: string) {
    setText(val);
    if (isGroup) {
      const atIdx = val.lastIndexOf("@");
      if (atIdx !== -1 && atIdx === val.length - 1) {
        setShowMentions(true);
        setMentionQuery("");
      } else if (atIdx !== -1 && !val.slice(atIdx + 1).includes(" ")) {
        setShowMentions(true);
        setMentionQuery(val.slice(atIdx + 1));
      } else {
        setShowMentions(false);
      }
    }
  }

  function insertMention(name: string) {
    const atIdx = text.lastIndexOf("@");
    setText(`${text.slice(0, atIdx)}@${name} `);
    setShowMentions(false);
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await sendMsg.mutateAsync({
        conversationId,
        type: MessageType.text,
        content: trimmed,
        isVanish: vanishMode,
        replyToId: replyTo?.id,
      });
      setText("");
      onClearReply();
    } catch {
      toast.error("Message send नहीं हुआ, दोबारा try करें");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function startVoice() {
    type SpeechCtor = new () => ConvSpeechInstance;
    const w = window as unknown as {
      SpeechRecognition?: SpeechCtor;
      webkitSpeechRecognition?: SpeechCtor;
    };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      toast.error("इस browser में voice नहीं चलता");
      return;
    }
    const rec = new SR();
    rec.lang = "hi-IN";
    rec.interimResults = false;
    rec.onresult = (e: ConvSpeechEvent) => {
      const transcript = e.results[0][0].transcript;
      setText((prev) => prev + transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      toast.error("Voice recognition error");
    };
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  }

  function stopVoice() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function handleImageAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Max 20MB allowed");
      return;
    }
    // In production, upload to object-storage first
    toast.info("Image upload coming soon — paste an image URL for now");
  }

  return (
    <div className="sticky bottom-0 z-20 bg-card border-t border-border">
      {/* Reply quote */}
      {replyTo && (
        <div
          className="flex items-center gap-2 px-4 py-2 bg-muted/60 border-b border-border"
          data-ocid="chat.reply_preview"
        >
          <div className="flex-1 border-l-2 border-primary pl-2">
            <p className="text-xs text-primary font-medium">↩ Reply to</p>
            <p className="text-xs text-muted-foreground truncate">
              {replyTo.content.slice(0, 80)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClearReply}
            aria-label="Cancel reply"
            className="p-1 hover:bg-muted rounded-full"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Vanish mode indicator */}
      {vanishMode && (
        <div
          className="flex items-center gap-1 px-4 py-1 bg-amber-500/10 text-amber-600 text-xs"
          data-ocid="chat.vanish_mode_indicator"
        >
          <Timer size={11} /> Vanish Mode ON — messages self-destruct in 10s
        </div>
      )}

      {/* @mention popup */}
      {showMentions && filteredMembers.length > 0 && (
        <div
          className="absolute bottom-full mb-1 left-2 right-2 bg-card border border-border rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto"
          data-ocid="chat.mention_popup"
        >
          {filteredMembers.map((m) => (
            <button
              key={m.userId}
              type="button"
              onClick={() => insertMention(m.name)}
              className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-muted transition-colors text-left"
              data-ocid="chat.mention_item"
            >
              <div
                className={`w-7 h-7 rounded-full ${avatarColor(m.name)} flex items-center justify-center text-white text-xs font-bold`}
              >
                {m.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm">{m.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-2">
        {/* Image attach */}
        <label
          className="flex-shrink-0 cursor-pointer p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Attach image"
          data-ocid="chat.attach_button"
        >
          <ImageIcon size={20} className="text-muted-foreground" />
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleImageAttach}
          />
        </label>

        {/* Lock file */}
        <button
          type="button"
          onClick={onOpenLockFile}
          aria-label="Send locked file"
          data-ocid="chat.lock_file_button"
          className="flex-shrink-0 p-2 rounded-full hover:bg-muted transition-colors"
        >
          <Lock size={20} className="text-muted-foreground" />
        </button>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            data-ocid="chat.message_input"
            className="w-full resize-none bg-muted/50 border border-input rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 max-h-28 min-h-[40px] leading-relaxed"
            style={{ overflowY: "auto" }}
          />
        </div>

        {/* Voice / Send */}
        {text.trim() ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={sendMsg.isPending}
            data-ocid="chat.send_button"
            aria-label="Send message"
            className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60"
          >
            <Send size={16} className="text-primary-foreground" />
          </button>
        ) : (
          <button
            type="button"
            onClick={listening ? stopVoice : startVoice}
            data-ocid="chat.voice_button"
            aria-label={listening ? "Stop recording" : "Voice input"}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${listening ? "bg-destructive text-white animate-pulse" : "bg-muted hover:bg-muted/80"}`}
          >
            {listening ? (
              <MicOff size={16} />
            ) : (
              <Mic size={16} className="text-muted-foreground" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ---- Main page inner ----
function ChatConversationPageInner() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { ghostMode } = useChatContext();

  // Extract conversationId from hash path: /chat/:id
  const conversationId = pathname.split("/chat/")[1] ?? null;

  const { data: conversations = [] } = useMyConversations();
  const conv: Conversation | undefined = conversations.find(
    (c) => c.id === conversationId,
  );

  const { data: messages = [], isLoading } =
    useConversationMessages(conversationId);
  const markRead = useMarkConversationRead();

  const [vanishMode, setVanishMode] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showAISummary, setShowAISummary] = useState(false);
  const [showLockFile, setShowLockFile] = useState(false);
  const [payToUnlockMsg, setPayToUnlockMsg] = useState<ChatMessage | null>(
    null,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Mark read on open
  const markReadMutate = markRead.mutate;
  useEffect(() => {
    if (conversationId) markReadMutate(conversationId);
  }, [conversationId, markReadMutate]);

  // Scroll to bottom whenever message count changes
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional scroll on new message
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom, messages.length]);

  // Vanish mode: visual timer for self-destructing messages
  useEffect(() => {
    if (!vanishMode) return;
    const vanishMsgs = messages.filter((m) => m.isVanish && !m.isDeleted);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const m of vanishMsgs) {
      const age = Date.now() - m.createdAt;
      if (age < 10_000) {
        timers.push(setTimeout(() => {}, 10_000 - age));
      }
    }
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [messages, vanishMode]);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setShowScrollBtn(!nearBottom);
  }, []);

  const myId = "self"; // placeholder
  const isGroup = conv?.type === ConversationType.group;
  const members = conv?.participants ?? [];

  const displayName = conv
    ? (conv.name ??
      conv.participants.find((p) => p.userId !== myId)?.name ??
      "Chat")
    : "Chat";

  const memberCount = members.length;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="bg-emerald-header text-white flex-shrink-0 z-30 shadow-md">
        <div className="flex items-center gap-3 px-3 py-3">
          <button
            type="button"
            onClick={() => navigate("/chat")}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Back"
            data-ocid="chat_conversation.back_button"
          >
            <ArrowLeft size={20} />
          </button>

          {/* Avatar */}
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${avatarColor(displayName)}`}
          >
            {isGroup ? (
              <Users size={16} />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>

          {/* Name */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-white truncate">
              {displayName}
            </p>
            {isGroup && (
              <p className="text-[11px] text-white/70">{memberCount} members</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {ghostMode && (
              <Ghost
                size={16}
                className="text-white/70"
                data-ocid="chat_conversation.ghost_icon"
              />
            )}
            <button
              type="button"
              onClick={() => setShowOptions((s) => !s)}
              aria-label="Options"
              data-ocid="chat_conversation.options_button"
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <MoreVertical size={18} />
            </button>
          </div>
        </div>

        {/* Options dropdown */}
        {showOptions && (
          <div
            className="absolute top-14 right-2 bg-card border border-border rounded-xl shadow-xl z-50 min-w-[180px] py-1"
            data-ocid="chat_conversation.options_menu"
          >
            <button
              type="button"
              data-ocid="chat_conversation.vanish_toggle"
              onClick={() => {
                setVanishMode((v) => !v);
                setShowOptions(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted text-foreground text-sm"
            >
              <Hourglass size={14} />
              {vanishMode ? "Vanish Mode OFF करें" : "Vanish Mode ON करें"}
            </button>
            <button
              type="button"
              data-ocid="chat_conversation.ai_summary_button"
              onClick={() => {
                setShowAISummary(true);
                setShowOptions(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted text-foreground text-sm"
            >
              🤖 Summarize Chat
            </button>
          </div>
        )}
      </header>

      {/* Messages */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 pt-4 pb-2"
        data-ocid="chat_conversation.messages_list"
      >
        {isLoading ? (
          <div
            className="space-y-3"
            data-ocid="chat_conversation.loading_state"
          >
            {["m1", "m2", "m3", "m4", "m5"].map((k, i) => (
              <div
                key={k}
                className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
              >
                <Skeleton className="h-10 w-44 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full gap-3 py-16"
            data-ocid="chat_conversation.empty_state"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Send size={22} className="text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              पहला message भेजें और conversation शुरू करें!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            // Render locked file messages with LockedMessageBubble
            if (msg.lockedFile && msg.lockedFile.lockType !== LockType.none) {
              return (
                <LockedMessageBubble
                  key={msg.id}
                  message={msg}
                  isMine={msg.senderId === myId || msg.senderId === "self"}
                />
              );
            }
            // Render pay-to-unlock (monetized) messages
            if (msg.isMoneytized && msg.unlockPrice && !msg.isUnlocked) {
              return (
                <LockedMessageBubble
                  key={msg.id}
                  message={msg}
                  isMine={msg.senderId === myId || msg.senderId === "self"}
                />
              );
            }
            return (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isMine={msg.senderId === myId || msg.senderId === "self"}
                conversationId={conversationId ?? ""}
                onReplyTo={(m) => setReplyTo(m)}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          type="button"
          onClick={() =>
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
          }
          data-ocid="chat_conversation.scroll_bottom"
          aria-label="Scroll to bottom"
          className="absolute bottom-24 right-4 w-9 h-9 rounded-full bg-primary shadow-lg flex items-center justify-center z-20"
        >
          <ChevronDown size={16} className="text-white" />
        </button>
      )}

      {/* Input */}
      <InputArea
        conversationId={conversationId ?? ""}
        vanishMode={vanishMode}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        members={members.map((p) => ({ userId: p.userId, name: p.name }))}
        isGroup={isGroup}
        onOpenLockFile={() => setShowLockFile(true)}
      />

      {/* AI Summary Modal */}
      {showAISummary && conversationId && (
        <AISummaryModal
          conversationId={conversationId}
          onClose={() => setShowAISummary(false)}
        />
      )}

      {/* Send Locked File Modal */}
      {showLockFile && conversationId && (
        <SendLockedFileModal
          conversationId={conversationId}
          onClose={() => setShowLockFile(false)}
          onSent={() => setShowLockFile(false)}
        />
      )}

      {/* Pay-to-Unlock Modal */}
      {payToUnlockMsg && (
        <PayToUnlockModal
          message={payToUnlockMsg}
          onClose={() => setPayToUnlockMsg(null)}
          onUnlocked={() => setPayToUnlockMsg(null)}
        />
      )}
    </div>
  );
}

export default function ChatConversationPage() {
  return (
    <ChatProvider>
      <ChatConversationPageInner />
    </ChatProvider>
  );
}
