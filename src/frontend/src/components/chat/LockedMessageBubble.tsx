/**
 * LockedMessageBubble — Renders a locked file message inside the chat stream.
 * Shows lock UI based on lockType; reveals download link on successful unlock.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Download, FileKey, Lock, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useGetLockedFileUrl,
  useUnlockMessage,
} from "../../hooks/useChatQueries";
import type { ChatMessage } from "../../types/chatTypes";
import { LockType } from "../../types/chatTypes";

interface Props {
  message: ChatMessage;
  isMine: boolean;
}

export default function LockedMessageBubble({ message, isMine }: Props) {
  const locked = message.lockedFile;
  const [attempt, setAttempt] = useState("");
  const [unlocked, setUnlocked] = useState(locked?.isUnlocked ?? false);
  const [error, setError] = useState("");

  const unlockMutation = useUnlockMessage();
  const fileUrlQuery = useGetLockedFileUrl(
    unlocked ? message.id : null,
    message.conversationId,
  );

  if (!locked) return null;

  const taskData = (() => {
    if (locked.lockType !== LockType.task) return null;
    try {
      return JSON.parse(locked.lockValue) as { question: string };
    } catch {
      return { question: locked.lockValue };
    }
  })();

  async function handleUnlock() {
    if (!attempt.trim()) return;
    setError("");
    try {
      const result = (await unlockMutation.mutateAsync({
        messageId: message.id,
        conversationId: message.conversationId,
        attempt: attempt.trim(),
      })) as { success: boolean };
      if (result?.success) {
        setUnlocked(true);
        toast.success("File unlock हो गई! 🎉");
      } else {
        setError("Incorrect — try again");
      }
    } catch {
      setError("Unlock नहीं हुआ। दोबारा try करें।");
    }
  }

  const bubbleBase = isMine
    ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
    : "bg-card border border-border text-foreground rounded-2xl rounded-tl-sm";

  return (
    <div
      className={`max-w-[78%] px-3 py-2.5 shadow-sm ${bubbleBase}`}
      data-ocid="chat.locked_message_bubble"
    >
      {/* File header */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            unlocked
              ? "bg-emerald-500/20"
              : isMine
                ? "bg-white/20"
                : "bg-primary/10"
          }`}
        >
          {unlocked ? (
            <CheckCircle
              size={16}
              className={isMine ? "text-white" : "text-emerald-600"}
            />
          ) : (
            <Lock
              size={16}
              className={isMine ? "text-white/80" : "text-primary"}
            />
          )}
        </div>
        <div className="min-w-0">
          <p
            className={`text-xs font-semibold truncate ${isMine ? "text-white/90" : "text-foreground"}`}
          >
            {locked.fileName || "Locked File"}
          </p>
          <p
            className={`text-[10px] ${isMine ? "text-white/60" : "text-muted-foreground"}`}
          >
            {locked.lockType === LockType.password
              ? "🔑 Password protected"
              : locked.lockType === LockType.task
                ? "📋 Task required"
                : "🔓 Unlocked"}
          </p>
        </div>
        <FileKey
          size={14}
          className={`ml-auto flex-shrink-0 ${isMine ? "text-white/60" : "text-muted-foreground"}`}
        />
      </div>

      {/* Unlocked state — show download */}
      {unlocked && (
        <div className="mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {fileUrlQuery.data ? (
            <a
              href={fileUrlQuery.data as string}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1.5 text-xs font-semibold underline underline-offset-2 ${
                isMine ? "text-white" : "text-primary"
              }`}
              data-ocid="chat.locked_file_download_link"
            >
              <Download size={13} /> Download करें
            </a>
          ) : (
            <span
              className={`text-xs ${isMine ? "text-white/70" : "text-muted-foreground"}`}
            >
              {fileUrlQuery.isLoading ? "Loading URL..." : "File ready ✓"}
            </span>
          )}
        </div>
      )}

      {/* Lock UI — only show to receiver (not sender in isMine mode when already rendered for preview) */}
      {!unlocked && !isMine && (
        <div className="mt-2 space-y-2">
          {locked.lockType === LockType.task && taskData && (
            <div className="bg-muted/60 rounded-lg px-2.5 py-1.5">
              <p className="text-xs text-foreground font-medium">
                ❓ {taskData.question}
              </p>
            </div>
          )}

          <div className="flex gap-1.5">
            <Input
              value={attempt}
              onChange={(e) => setAttempt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              placeholder={
                locked.lockType === LockType.password
                  ? "Password डालें..."
                  : "Answer दें..."
              }
              className="h-8 text-xs flex-1"
              data-ocid="chat.locked_message_attempt_input"
            />
            <Button
              size="sm"
              className="h-8 px-2.5 text-xs"
              onClick={handleUnlock}
              disabled={!attempt.trim() || unlockMutation.isPending}
              data-ocid="chat.locked_message_unlock_button"
            >
              {unlockMutation.isPending ? (
                <span className="w-3.5 h-3.5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                "Unlock"
              )}
            </Button>
          </div>

          {error && (
            <div
              className="flex items-center gap-1 text-[11px] text-destructive"
              data-ocid="chat.locked_message_error_state"
            >
              <XCircle size={11} /> {error}
            </div>
          )}
        </div>
      )}

      {/* Sender sees it's locked but can't unlock their own */}
      {!unlocked && isMine && (
        <p className="text-[11px] text-white/60 mt-1">
          Receiver को unlock करना होगा
        </p>
      )}
    </div>
  );
}
