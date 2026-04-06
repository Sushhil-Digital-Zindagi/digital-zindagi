import { RefreshCw, Share2, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { syncFromSheet } from "../utils/googleSheetsSync";
import { useSettingsListener } from "../utils/settingsSync";

function readNotificationText(): string {
  return localStorage.getItem("dz_notification_bar") ?? "";
}

function readNotificationEnabled(): boolean {
  const val = localStorage.getItem("dz_notification_bar_enabled");
  return val === null ? false : val === "true";
}

export default function NotificationBar() {
  const [text, setText] = useState(readNotificationText);
  const [enabled, setEnabled] = useState(readNotificationEnabled);
  const [syncing, setSyncing] = useState(false);

  useSettingsListener(() => {
    setText(readNotificationText());
    setEnabled(readNotificationEnabled());
  });

  const handleSync = async () => {
    setSyncing(true);
    const result = await syncFromSheet();
    setSyncing(false);
    if (result.error) {
      toast.error(`Sync failed: ${result.error}`);
    } else {
      toast.success(`Google Sheet sync ho gaya! ${result.added} rows mile.`);
    }
  };

  const handleShare = () => {
    const appUrl = window.location.origin;
    if (navigator.share) {
      navigator
        .share({
          title: "Digital Zindagi",
          text: "Digital Zindagi — Apka Local Digital Marketplace! Download karein:",
          url: appUrl,
        })
        .catch(() => {});
    } else {
      navigator.clipboard
        .writeText(appUrl)
        .then(() => {
          toast.success("App link copy ho gaya!");
        })
        .catch(() => {
          toast.info(`App link: ${appUrl}`);
        });
    }
  };

  if (!enabled && !text) return null;
  if (!enabled) return null;
  if (!text.trim()) return null;

  return (
    <div
      className="sticky top-0 z-50 w-full flex items-center"
      style={{ background: "#d4af37", minHeight: "36px" }}
      data-ocid="notification.bar"
    >
      {/* Scrolling text */}
      <div className="flex-1 overflow-hidden">
        <div
          className="whitespace-nowrap text-sm font-semibold"
          style={{
            color: "#064420",
            animation: "dz-marquee 18s linear infinite",
            display: "inline-block",
            paddingLeft: "100%",
          }}
        >
          {text}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 px-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          title="Google Sheet Se Sync Karein"
          className="p-1 rounded-full hover:bg-black/10 transition-colors disabled:opacity-60"
          style={{ color: "#064420" }}
          data-ocid="notification.sync_button"
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
        </button>
        <button
          type="button"
          onClick={handleShare}
          title="App Share Karein"
          className="p-1 rounded-full hover:bg-black/10 transition-colors"
          style={{ color: "#064420" }}
          data-ocid="notification.share_button"
        >
          <Share2 size={14} />
        </button>
      </div>

      {/* Marquee CSS */}
      <style>{`
        @keyframes dz-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
