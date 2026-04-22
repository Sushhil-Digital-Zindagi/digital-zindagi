/**
 * AISummaryModal — Summarize recent chat messages using AI.
 * Supports "Last 50 messages" and "Last 24 hours" modes.
 */
import { Button } from "@/components/ui/button";
import { Bot, Check, Clipboard, Clock, MessageSquare, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSummarizeChatMessages } from "../../hooks/useChatQueries";

interface Props {
  conversationId: string;
  onClose: () => void;
}

type SummaryMode = "last50" | "last24h";

const MODE_OPTIONS: {
  value: SummaryMode;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "last50",
    label: "Last 50 Messages",
    icon: <MessageSquare size={15} />,
  },
  {
    value: "last24h",
    label: "Last 24 Hours",
    icon: <Clock size={15} />,
  },
];

export default function AISummaryModal({ conversationId, onClose }: Props) {
  const [mode, setMode] = useState<SummaryMode>("last50");
  const [summary, setSummary] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const summarize = useSummarizeChatMessages();

  async function handleSummarize() {
    setSummary(null);
    try {
      const result = (await summarize.mutateAsync({
        conversationId,
        mode,
      })) as { summary?: string; error?: string };

      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setSummary(result?.summary ?? "Summary generate नहीं हुई।");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes("not configured") ||
        msg.toLowerCase().includes("api key")
      ) {
        toast.error("AI Summary not configured by admin");
      } else {
        toast.error("Summary नहीं बन पाई। दोबारा try करें।");
      }
    }
  }

  async function handleCopy() {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied!");
    } catch {
      toast.error("Copy नहीं हुई");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      data-ocid="chat.ai_summary_modal"
    >
      <div className="bg-card w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot size={16} className="text-primary" />
            </div>
            <h2 className="font-bold text-foreground text-sm">
              🤖 AI Chat Summary
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
            aria-label="Close"
            data-ocid="chat.ai_summary_modal.close_button"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Mode selector */}
          <div className="grid grid-cols-2 gap-2">
            {MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMode(opt.value)}
                data-ocid={`chat.ai_summary_mode_${opt.value}`}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  mode === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>

          {/* Summarize button */}
          <Button
            className="w-full"
            onClick={handleSummarize}
            disabled={summarize.isPending}
            data-ocid="chat.ai_summary_submit_button"
          >
            {summarize.isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                AI सोच रही है...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Bot size={14} /> Summary बनाएं
              </span>
            )}
          </Button>

          {/* Loading placeholder */}
          {summarize.isPending && (
            <div
              className="space-y-2 animate-pulse"
              data-ocid="chat.ai_summary_loading_state"
            >
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-5/6" />
              <div className="h-3 bg-muted rounded w-4/6" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </div>
          )}

          {/* Summary result */}
          {summary && !summarize.isPending && (
            <div
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
              data-ocid="chat.ai_summary_result"
            >
              <div className="bg-muted/50 border border-border rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Summary
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors"
                    data-ocid="chat.ai_summary_copy_button"
                  >
                    {copied ? <Check size={11} /> : <Clipboard size={11} />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {summary}
                </p>
              </div>
            </div>
          )}

          {/* Error state if AI not configured */}
          {summarize.isError && (
            <div
              className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2.5"
              data-ocid="chat.ai_summary_error_state"
            >
              <Bot size={14} className="text-destructive flex-shrink-0" />
              <p className="text-xs text-destructive">
                AI Summary not configured by admin
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
