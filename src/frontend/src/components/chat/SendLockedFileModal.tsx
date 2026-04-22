/**
 * SendLockedFileModal — Attach a file to a chat message with an optional lock.
 * Lock types: none | password | task (question + answer).
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileKey, Lock, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSendLockedMessage } from "../../hooks/useChatQueries";
import { LockType } from "../../types/chatTypes";

interface Props {
  conversationId: string;
  onClose: () => void;
  onSent?: () => void;
}

type LockChoice = "none" | "password" | "task";

const LOCK_OPTIONS: { value: LockChoice; label: string; icon: string }[] = [
  { value: "none", label: "No Lock", icon: "🔓" },
  { value: "password", label: "Password Lock", icon: "🔑" },
  { value: "task", label: "Task Lock", icon: "📋" },
];

export default function SendLockedFileModal({
  conversationId,
  onClose,
  onSent,
}: Props) {
  const [lockChoice, setLockChoice] = useState<LockChoice>("none");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [password, setPassword] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const sendLocked = useSendLockedMessage();

  const isValid = (() => {
    if (!fileUrl.trim() || !fileName.trim()) return false;
    if (lockChoice === "password" && !password.trim()) return false;
    if (lockChoice === "task" && (!question.trim() || !answer.trim()))
      return false;
    return true;
  })();

  async function handleSend() {
    if (!isValid) return;
    const lockType =
      lockChoice === "password"
        ? LockType.password
        : lockChoice === "task"
          ? LockType.task
          : LockType.none;

    try {
      await sendLocked.mutateAsync({
        conversationId,
        fileUrl: fileUrl.trim(),
        fileName: fileName.trim(),
        lockType,
        lockValue:
          lockChoice === "password"
            ? password
            : lockChoice === "task"
              ? JSON.stringify({ question, answer })
              : "",
      });
      toast.success("Locked file भेजा गया!");
      onSent?.();
      onClose();
    } catch {
      toast.error("File send नहीं हुई। दोबारा try करें।");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      data-ocid="chat.send_locked_file_modal"
    >
      <div className="bg-card w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <FileKey size={16} className="text-primary" />
            </div>
            <h2 className="font-bold text-foreground text-sm">
              🔒 Lock File भेजें
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
            aria-label="Close"
            data-ocid="chat.send_locked_file_modal.close_button"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* File URL */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              File URL (Cloudinary या कोई link)
            </Label>
            <Input
              placeholder="https://res.cloudinary.com/..."
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              className="text-sm"
              data-ocid="chat.locked_file_url_input"
            />
            <p className="text-[10px] text-muted-foreground">
              Max 20MB — Cloudinary upload करके URL paste करें
            </p>
          </div>

          {/* File name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              File का नाम
            </Label>
            <Input
              placeholder="document.pdf"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="text-sm"
              data-ocid="chat.locked_file_name_input"
            />
          </div>

          {/* Lock type selection */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Lock Type
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {LOCK_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLockChoice(opt.value)}
                  data-ocid={`chat.lock_type_${opt.value}`}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-center transition-all text-xs font-medium ${
                    lockChoice === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  <span className="text-lg">{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Password lock fields */}
          {lockChoice === "password" && (
            <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
              <Label className="text-xs font-semibold text-foreground">
                Password (receiver को बताएं)
              </Label>
              <Input
                type="text"
                placeholder="कोई भी password सेट करें"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-sm"
                data-ocid="chat.locked_file_password_input"
              />
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Lock size={10} /> यह password receiver को अलग से share करें
              </p>
            </div>
          )}

          {/* Task lock fields */}
          {lockChoice === "task" && (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Question (receiver को answer करना होगा)
                </Label>
                <Textarea
                  placeholder="जैसे: मेरे pet का क्या नाम है?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="text-sm resize-none"
                  rows={2}
                  data-ocid="chat.locked_file_question_input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  सही Answer
                </Label>
                <Input
                  placeholder="सही answer यहाँ लिखें"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="text-sm"
                  data-ocid="chat.locked_file_answer_input"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-2 border-t border-border">
          <Button
            className="w-full"
            disabled={!isValid || sendLocked.isPending}
            onClick={handleSend}
            data-ocid="chat.send_locked_file_submit_button"
          >
            {sendLocked.isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                भेज रहे हैं...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Lock size={14} /> 🔒 Send Locked File
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
