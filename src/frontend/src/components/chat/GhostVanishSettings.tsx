/**
 * GhostVanishSettings — Toggle Ghost Mode and learn about Vanish Mode.
 * Used inside the Chat Profile / Settings page.
 */

import { Eye, EyeOff, Flame, Trash2 } from "lucide-react";
import { useChatContext } from "../../contexts/ChatContext";
import { useUpdateChatProfile } from "../../hooks/useChatQueries";
import { Switch } from "../ui/switch";

export default function GhostVanishSettings() {
  const { ghostMode, setGhostMode, chatProfile } = useChatContext();
  const updateProfile = useUpdateChatProfile();

  const handleGhostToggle = (enabled: boolean) => {
    setGhostMode(enabled);
    if (chatProfile) {
      updateProfile.mutate({ ghostModeEnabled: enabled });
    }
  };

  return (
    <div className="space-y-3" data-ocid="ghost_vanish.panel">
      {/* Ghost Mode */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            {ghostMode ? (
              <EyeOff size={20} className="text-primary" />
            ) : (
              <Eye size={20} className="text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground text-sm">
                  Ghost Mode
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {ghostMode
                    ? "चालू है — कोई भी आपके Read receipts नहीं देख सकता"
                    : "बंद है — Blue ticks दिखेंगे जब आप message पढ़ेंगे"}
                </p>
              </div>
              <Switch
                checked={ghostMode}
                onCheckedChange={handleGhostToggle}
                disabled={updateProfile.isPending}
                data-ocid="ghost_vanish.ghost_toggle"
              />
            </div>
            <div
              className={`mt-3 rounded-xl p-3 text-xs ${ghostMode ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
            >
              {ghostMode
                ? "✓ आप messages पढ़ सकते हैं — sender को Blue Ticks नहीं दिखेंगे।"
                : "ℹ️ Ghost Mode OFF करने पर भी Blue Ticks आएंगे जब आप message पढ़ेंगे।"}
            </div>
          </div>
        </div>
      </div>

      {/* Vanish Mode info */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
            <Flame size={20} className="text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm">Vanish Mode</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Message भेजते समय{" "}
              <span className="text-foreground font-medium">Vanish</span> option
              choose करें — Receiver की screen पर{" "}
              <span className="text-orange-500 font-semibold">
                10 seconds बाद
              </span>{" "}
              message automatically delete हो जाएगा, कोई निशान नहीं रहेगा।
            </p>
            <div className="mt-2 bg-orange-500/10 rounded-lg px-3 py-2 text-xs text-orange-600">
              💡 Chat input में 🔥 icon tap करें Vanish Mode activate करने के लिए।
            </div>
          </div>
        </div>
      </div>

      {/* Delete for Everyone info */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <Trash2 size={20} className="text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm">
              Delete for Everyone
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              कोई भी message delete करने पर दूसरे को{" "}
              <span className="text-foreground font-medium">
                "This message was deleted"
              </span>{" "}
              notice{" "}
              <span className="text-destructive font-semibold">नहीं दिखेगा।</span>{" "}
              Message बिना trace के हट जाएगा।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
