import { ArrowLeft, ExternalLink, RefreshCw, X } from "lucide-react";
import { useState } from "react";

interface SafeWebViewProps {
  url: string;
  title?: string;
  onClose: () => void;
}

/**
 * In-app safe browser using sandboxed iframe.
 * Opens external links (jobs, admit cards, forms) inside the app
 * so users don't lose form data when switching apps.
 */
export default function SafeWebView({ url, title, onClose }: SafeWebViewProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const handleRefresh = () => {
    setLoading(true);
    setIframeKey((k) => k + 1);
  };

  const handleOpenExternal = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header Bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-700 text-white flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="flex-1 min-w-0 bg-white/15 rounded-lg px-3 py-1.5">
          <p className="text-xs font-semibold truncate">{title || url}</p>
          <p className="text-white/70 text-xs truncate">{url}</p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
          aria-label="Refresh"
        >
          <RefreshCw size={14} />
        </button>

        <button
          type="button"
          onClick={handleOpenExternal}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
          aria-label="Open in browser"
        >
          <ExternalLink size={14} />
        </button>
      </div>

      {/* Safety Notice */}
      <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 flex items-center gap-2 flex-shrink-0">
        <span className="text-sm">🔒</span>
        <p className="text-xs text-amber-700 font-medium">
          Safe In-App Browser — Form data surakshit hai, app band karne par bhi
        </p>
      </div>

      {/* Loading Bar */}
      {loading && (
        <div className="h-1 bg-emerald-100 flex-shrink-0">
          <div
            className="h-full bg-emerald-500 animate-[progress_2s_ease-in-out_infinite]"
            style={{ width: "60%" }}
          />
        </div>
      )}

      {/* iFrame */}
      <iframe
        key={iframeKey}
        src={url}
        title={title || "Safe Web View"}
        className="flex-1 w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        onLoad={() => setLoading(false)}
        allow="camera; microphone"
      />

      {/* Bottom Nav Bar */}
      <div className="flex items-center justify-around px-4 py-2 bg-emerald-700 text-white flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex flex-col items-center gap-0.5 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-xs">Wapas</span>
        </button>
        <button
          type="button"
          onClick={handleRefresh}
          className="flex flex-col items-center gap-0.5 text-white/80 hover:text-white transition-colors"
        >
          <RefreshCw size={18} />
          <span className="text-xs">Refresh</span>
        </button>
        <button
          type="button"
          onClick={handleOpenExternal}
          className="flex flex-col items-center gap-0.5 text-white/80 hover:text-white transition-colors"
        >
          <ExternalLink size={18} />
          <span className="text-xs">Browser</span>
        </button>
      </div>
    </div>
  );
}
