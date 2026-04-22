/**
 * MessageScheduler — Schedule a message to be sent at a future date/time.
 * Shows pending scheduled messages with cancel option.
 */

import { Calendar, Clock, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useCancelScheduledMessage,
  useScheduleMessage,
  useScheduledMessages,
} from "../../hooks/useChatQueries";
import type { ScheduledMessage } from "../../types/chatTypes";
import { MessageType } from "../../types/chatTypes";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

interface MessageSchedulerProps {
  conversationId: string;
  onClose?: () => void;
}

function ScheduledItem({ msg }: { msg: ScheduledMessage }) {
  const cancel = useCancelScheduledMessage();
  return (
    <div
      className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl"
      data-ocid="scheduler.scheduled_item"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground line-clamp-2">{msg.content}</p>
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <Clock size={11} />
          <span>
            {new Date(msg.scheduledAt).toLocaleString("hi-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {msg.isSent && <span className="text-primary ml-2">✓ भेजा गया</span>}
        </div>
      </div>
      {!msg.isSent && (
        <button
          type="button"
          onClick={() => cancel.mutate(msg.id)}
          disabled={cancel.isPending}
          className="text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Cancel"
          data-ocid="scheduler.cancel_button"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export default function MessageScheduler({
  conversationId,
  onClose,
}: MessageSchedulerProps) {
  const [content, setContent] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");

  const scheduleMsg = useScheduleMessage();
  const { data: scheduled = [] } = useScheduledMessages();

  const pending = scheduled.filter(
    (s) => !s.isSent && !s.cancelledAt && s.conversationId === conversationId,
  );

  const handleSchedule = async () => {
    if (!content.trim() || !dateStr || !timeStr) {
      toast.error("Message, date और time सब भरें");
      return;
    }
    const scheduledAt = new Date(`${dateStr}T${timeStr}`).getTime();
    if (scheduledAt <= Date.now()) {
      toast.error("भविष्य का समय चुनें");
      return;
    }
    try {
      await scheduleMsg.mutateAsync({
        conversationId,
        type: MessageType.text,
        content: content.trim(),
        scheduledAt,
      });
      toast.success("Message schedule हो गया!");
      setContent("");
      setDateStr("");
      setTimeStr("");
    } catch {
      toast.error("Schedule नहीं हो सका, दोबारा try करें");
    }
  };

  return (
    <div
      className="bg-card rounded-2xl border border-border overflow-hidden"
      data-ocid="scheduler.panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-primary" />
          <h3 className="font-semibold text-foreground text-sm">
            Message Schedule करें
          </h3>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            data-ocid="scheduler.close_button"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Message input */}
        <div className="space-y-1.5">
          <Label className="text-xs">Message</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="यहाँ message लिखें..."
            rows={3}
            className="resize-none text-sm"
            data-ocid="scheduler.message_input"
          />
        </div>

        {/* Date + Time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Calendar size={11} /> Date
            </Label>
            <Input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="text-sm"
              data-ocid="scheduler.date_input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Clock size={11} /> Time
            </Label>
            <Input
              type="time"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              className="text-sm"
              data-ocid="scheduler.time_input"
            />
          </div>
        </div>

        <Button
          onClick={() => {
            void handleSchedule();
          }}
          disabled={
            scheduleMsg.isPending || !content.trim() || !dateStr || !timeStr
          }
          className="w-full"
          data-ocid="scheduler.submit_button"
        >
          {scheduleMsg.isPending ? "Schedule हो रहा है..." : "Schedule करें"}
        </Button>

        {/* Pending list */}
        {pending.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Pending ({pending.length})
            </p>
            {pending.map((msg) => (
              <ScheduledItem key={msg.id} msg={msg} />
            ))}
          </div>
        )}

        {pending.length === 0 && (
          <div className="text-center py-2" data-ocid="scheduler.empty_state">
            <p className="text-xs text-muted-foreground">
              कोई pending message नहीं
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
