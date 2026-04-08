import { ArrowLeft, Gamepad2 } from "lucide-react";
import { useNavigate } from "../lib/router";

export default function GameComingSoonPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "linear-gradient(160deg, #0a2e1a 0%, #0d1f0e 40%, #051208 100%)",
      }}
      data-ocid="game.coming_soon_page"
    >
      {/* Back button */}
      <div className="p-4 flex items-center" style={{ flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => navigate("/")}
          data-ocid="game.back_button"
          className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors text-sm font-medium py-2 px-3 rounded-xl hover:bg-white/5"
          aria-label="Go back to home"
        >
          <ArrowLeft size={18} />
          <span>Wapas Jaao</span>
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16 text-center">
        {/* Animated icon */}
        <div
          className="mb-8 relative"
          style={{ animation: "dzGlow 3s ease-in-out infinite" }}
        >
          <div
            className="w-28 h-28 rounded-3xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #065f46, #047857)",
              boxShadow:
                "0 0 40px rgba(16, 185, 129, 0.35), 0 0 80px rgba(16, 185, 129, 0.15)",
            }}
          >
            <Gamepad2 size={56} className="text-emerald-300" />
          </div>
          {/* Pulse ring */}
          <div
            className="absolute inset-0 rounded-3xl"
            style={{
              border: "2px solid rgba(52,211,153,0.4)",
              animation: "dzPulseRing 2s ease-out infinite",
            }}
          />
        </div>

        {/* Title */}
        <h1
          className="text-white font-bold text-4xl mb-3 tracking-tight"
          style={{ animation: "dzFadeUp 0.6s ease-out forwards", opacity: 0 }}
        >
          Game
        </h1>

        {/* Hindi subtitle */}
        <p
          className="text-emerald-300 text-2xl font-semibold mb-4"
          style={{
            animation: "dzFadeUp 0.7s ease-out 0.1s forwards",
            opacity: 0,
          }}
        >
          जल्द आ रहा है...
        </p>

        {/* English tagline */}
        <p
          className="text-white/60 text-base max-w-xs leading-relaxed mb-10"
          style={{
            animation: "dzFadeUp 0.7s ease-out 0.2s forwards",
            opacity: 0,
          }}
        >
          Something exciting is being crafted for you. Stay tuned!
        </p>

        {/* Animated progress/dots */}
        <div
          className="flex items-center gap-3 mb-10"
          style={{
            animation: "dzFadeUp 0.7s ease-out 0.3s forwards",
            opacity: 0,
          }}
          aria-hidden="true"
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: i === 1 || i === 2 ? "10px" : "8px",
                height: i === 1 || i === 2 ? "10px" : "8px",
                background: "linear-gradient(135deg, #10b981, #34d399)",
                animation: `dzDotPulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                boxShadow: "0 0 8px rgba(52,211,153,0.5)",
              }}
            />
          ))}
        </div>

        {/* Decorative progress bar */}
        <div
          className="w-64 h-1.5 rounded-full overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.08)",
            animation: "dzFadeUp 0.7s ease-out 0.4s forwards",
            opacity: 0,
          }}
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #065f46, #10b981, #34d399)",
              animation: "dzProgressSlide 2.5s ease-in-out infinite",
              width: "40%",
            }}
          />
        </div>
      </div>

      {/* Branding footer */}
      <div className="pb-8 text-center" style={{ flexShrink: 0 }}>
        <p
          className="text-emerald-500 text-sm font-semibold tracking-wide"
          style={{
            animation: "dzFadeUp 0.7s ease-out 0.5s forwards",
            opacity: 0,
          }}
        >
          Digital Zindagi
        </p>
        <p className="text-white/25 text-xs mt-1">
          &copy; {new Date().getFullYear()} Digital Zindagi
        </p>
      </div>

      {/* Keyframe animations injected via style tag */}
      <style>{`
        @keyframes dzGlow {
          0%, 100% { filter: drop-shadow(0 0 12px rgba(16,185,129,0.4)); transform: translateY(0); }
          50% { filter: drop-shadow(0 0 24px rgba(16,185,129,0.7)); transform: translateY(-6px); }
        }
        @keyframes dzPulseRing {
          0% { transform: scale(1); opacity: 0.8; }
          70% { transform: scale(1.25); opacity: 0; }
          100% { transform: scale(1.25); opacity: 0; }
        }
        @keyframes dzFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dzDotPulse {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1.3); opacity: 1; }
        }
        @keyframes dzProgressSlide {
          0% { margin-left: -40%; }
          100% { margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
