/**
 * AutoReplySettings — Configure automatic reply messages.
 * Toggle on/off, manage preset messages, set custom reply text.
 */

import { Bot, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useChatContext } from "../../contexts/ChatContext";
import { useUpdateChatProfile } from "../../hooks/useChatQueries";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";

const PRESETS = [
  "अभी busy हूं, बाद में reply करूंगा 🙏",
  "Meeting में हूं, 1 घंटे में call करता हूं",
  "Driving कर रहा हूं, safe होने पर reply करूंगा",
  "सो रहा हूं, सुबह reply करूंगा 😴",
  "इस वक्त उपलब्ध नहीं हूं",
];

export default function AutoReplySettings() {
  const {
    autoReplyEnabled,
    setAutoReplyEnabled,
    autoReplyText,
    setAutoReplyText,
    chatProfile,
  } = useChatContext();
  const updateProfile = useUpdateChatProfile();

  const [customText, setCustomText] = useState(autoReplyText);
  const [newPreset, setNewPreset] = useState("");

  const [presets, setPresets] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("dz_chat_auto_presets");
      return raw ? (JSON.parse(raw) as string[]) : PRESETS;
    } catch {
      return PRESETS;
    }
  });

  const savePresets = (updated: string[]) => {
    setPresets(updated);
    localStorage.setItem("dz_chat_auto_presets", JSON.stringify(updated));
  };

  const handleToggle = (enabled: boolean) => {
    setAutoReplyEnabled(enabled);
    if (chatProfile) {
      updateProfile.mutate({ autoReplyEnabled: enabled });
    }
  };

  const handleSave = () => {
    setAutoReplyText(customText);
    if (chatProfile) {
      updateProfile.mutate({ autoReplyText: customText });
    }
    toast.success("Auto-reply text save हो गया");
  };

  const selectPreset = (text: string) => {
    setCustomText(text);
  };

  const addPreset = () => {
    if (!newPreset.trim()) return;
    savePresets([...presets, newPreset.trim()]);
    setNewPreset("");
  };

  const deletePreset = (idx: number) => {
    savePresets(presets.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4" data-ocid="auto_reply.panel">
      {/* Toggle */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">
                Auto-Reply
              </p>
              <p className="text-xs text-muted-foreground">
                {autoReplyEnabled ? "चालू है" : "बंद है"}
              </p>
            </div>
          </div>
          <Switch
            checked={autoReplyEnabled}
            onCheckedChange={handleToggle}
            data-ocid="auto_reply.toggle"
          />
        </div>
        {autoReplyEnabled && (
          <div className="mt-3 bg-primary/10 rounded-xl px-3 py-2 text-xs text-primary">
            ✓ नया message आने पर automatically यह reply जाएगा:
            <p className="mt-1 font-medium text-foreground">
              "{autoReplyText}"
            </p>
          </div>
        )}
      </div>

      {/* Current reply text */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <Label className="text-sm font-semibold">Reply Message</Label>
        <textarea
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          maxLength={200}
          rows={3}
          placeholder="Auto-reply message लिखें..."
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          data-ocid="auto_reply.text_input"
        />
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!customText.trim() || updateProfile.isPending}
          className="w-full"
          data-ocid="auto_reply.save_button"
        >
          Save करें
        </Button>
      </div>

      {/* Preset messages */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Preset Messages</p>
        <div className="space-y-2">
          {presets.map((preset, i) => (
            <div
              key={preset}
              className="flex items-center gap-2 group"
              data-ocid={`auto_reply.preset.${i + 1}`}
            >
              <button
                type="button"
                onClick={() => selectPreset(preset)}
                className={`flex-1 text-left text-sm px-3 py-2 rounded-xl border transition-colors ${
                  customText === preset
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-muted/50 border-transparent text-foreground hover:border-border"
                }`}
              >
                {preset}
              </button>
              <button
                type="button"
                onClick={() => deletePreset(i)}
                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete preset"
                data-ocid={`auto_reply.delete_preset.${i + 1}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Add new preset */}
        <div className="flex gap-2 pt-1">
          <Input
            value={newPreset}
            onChange={(e) => setNewPreset(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPreset()}
            placeholder="नया preset add करें..."
            className="text-sm"
            data-ocid="auto_reply.new_preset_input"
          />
          <Button
            size="icon"
            variant="outline"
            onClick={addPreset}
            disabled={!newPreset.trim()}
            data-ocid="auto_reply.add_preset_button"
          >
            <Plus size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
