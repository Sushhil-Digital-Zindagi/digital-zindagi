/**
 * ChatProfilePage — Full user chat profile with edit, points, badges, toggles, and referral.
 */
import {
  Award,
  Bell,
  BookOpen,
  Calendar,
  ChevronRight,
  ClipboardCopy,
  Clock,
  DollarSign,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Lock,
  LogOut,
  Share2,
  ShoppingBag,
  Sparkles,
  Star,
  User,
  Vault,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import CreatorEarningsDashboard from "../components/chat/CreatorEarningsDashboard";
import { ChatProvider, useChatContext } from "../contexts/ChatContext";
import {
  useChatProfile,
  useMyPoints,
  useUpdateChatProfile,
} from "../hooks/useChatQueries";
import { useNavigate } from "../lib/router";
import { Badge as BadgeEnum } from "../types/chatTypes";

// ---- Badge Styling ----
const BADGE_CONFIG: Record<
  BadgeEnum,
  { icon: string; label: string; gradient: string; border: string }
> = {
  [BadgeEnum.bronze]: {
    icon: "🥉",
    label: "Bronze",
    gradient: "from-amber-700 via-amber-500 to-amber-700",
    border: "border-amber-600",
  },
  [BadgeEnum.silver]: {
    icon: "🥈",
    label: "Silver",
    gradient: "from-slate-400 via-slate-200 to-slate-500",
    border: "border-slate-400",
  },
  [BadgeEnum.gold]: {
    icon: "🥇",
    label: "Gold",
    gradient: "from-yellow-500 via-yellow-300 to-yellow-600",
    border: "border-yellow-500",
  },
  [BadgeEnum.diamond]: {
    icon: "💎",
    label: "Diamond",
    gradient: "from-cyan-400 via-blue-200 to-purple-400",
    border: "border-cyan-400",
  },
};

function BadgeDisplay({ badge }: { badge: BadgeEnum }) {
  const cfg = BADGE_CONFIG[badge];
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border bg-gradient-to-r ${cfg.gradient} ${cfg.border} text-white shadow-sm`}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ---- Inline Toggle ----
function InlineToggle({
  label,
  description,
  icon,
  value,
  onChange,
  loading,
}: {
  label: string;
  description?: string;
  icon: React.ReactNode;
  value: boolean;
  onChange: (v: boolean) => void;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      data-ocid="chat_profile.toggle"
      onClick={() => onChange(!value)}
      disabled={loading}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors rounded-xl"
    >
      <span className="text-primary flex-shrink-0">{icon}</span>
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {description}
          </p>
        )}
      </div>
      {loading ? (
        <Loader2 size={18} className="animate-spin text-muted-foreground" />
      ) : (
        <div
          className={`w-12 h-6 rounded-full transition-all duration-200 flex-shrink-0 ${
            value ? "bg-primary" : "bg-muted border border-border"
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow-sm mt-0.5 transition-all duration-200 ${
              value ? "translate-x-6 ml-0.5" : "translate-x-0.5"
            }`}
          />
        </div>
      )}
    </button>
  );
}

// ---- Quick Link Row ----
function QuickLink({
  icon,
  label,
  ocid,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  ocid: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-ocid={ocid}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors rounded-xl"
    >
      <span className="text-primary flex-shrink-0">{icon}</span>
      <span className="flex-1 text-sm font-medium text-foreground text-left">
        {label}
      </span>
      <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
    </button>
  );
}

function ChatProfilePageInner() {
  const { ghostMode, setGhostMode, studyMode, setStudyMode } = useChatContext();
  const { data: profile, isLoading } = useChatProfile();
  const { data: points } = useMyPoints();
  const updateProfile = useUpdateChatProfile();
  const navigate = useNavigate();

  // Edit form state
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [isPublicMode, setIsPublicMode] = useState(false);
  const [autoReply, setAutoReply] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showEarnings, setShowEarnings] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hydrate from profile
  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    setBio(profile.bio ?? "");
    setCity(profile.city ?? "");
    setUsername(profile.username ?? "");
    setIsPublicMode(profile.isPublicMode ?? false);
    setAutoReply(profile.autoReplyEnabled ?? false);
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        name: name.trim() || profile?.name,
        bio: bio.trim() || profile?.bio,
        city: city.trim() || profile?.city,
        username: username.trim() || profile?.username,
      });
      toast.success("Profile update ho gaya! ✅");
      setEditMode(false);
    } catch {
      toast.error("Update nahi ho saka. Dobara try karein.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (
    field:
      | "ghostModeEnabled"
      | "studyModeEnabled"
      | "isPublicMode"
      | "autoReplyEnabled",
    value: boolean,
  ) => {
    setToggling(field);
    try {
      await updateProfile.mutateAsync({ [field]: value });
      if (field === "ghostModeEnabled") setGhostMode(value);
      if (field === "studyModeEnabled") setStudyMode(value);
      if (field === "isPublicMode") setIsPublicMode(value);
      if (field === "autoReplyEnabled") setAutoReply(value);
    } catch {
      toast.error("Setting save nahi ho saki.");
    } finally {
      setToggling(null);
    }
  };

  const handleCopyReferral = () => {
    const code = profile?.referralCode ?? "";
    navigator.clipboard
      .writeText(code)
      .then(() => toast.success("Referral code copy ho gaya!"));
  };

  const handleShareReferral = async () => {
    const link = `${window.location.origin}?ref=${profile?.referralCode ?? ""}`;
    if (navigator.share) {
      await navigator.share({
        title: "Likeup पर Join करें",
        text: "Likeup chat app join karo!",
        url: link,
      });
    } else {
      navigator.clipboard
        .writeText(link)
        .then(() => toast.success("Referral link copy ho gaya!"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const totalPoints = points?.total ?? profile?.points ?? 0;

  return (
    <div className="flex-1 flex flex-col bg-background pb-20 overflow-y-auto">
      {/* Profile Header */}
      <div className="bg-card border-b border-border px-4 pt-6 pb-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              data-ocid="chat_profile.upload_button"
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary shadow-md bg-muted flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              {profile?.photoUrl ? (
                <img
                  src={profile.photoUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={32} className="text-muted-foreground" />
              )}
            </button>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-card">
              <span className="text-[10px] text-white font-bold">✏️</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="font-heading font-bold text-xl text-foreground truncate">
              {profile?.name ?? "Aapka Naam"}
            </h2>
            {profile?.username && (
              <p className="text-sm text-muted-foreground">
                @{profile.username}
              </p>
            )}
            {profile?.city && (
              <p className="text-xs text-muted-foreground mt-0.5">
                📍 {profile.city}
              </p>
            )}
            {profile?.bio && (
              <p className="text-sm text-foreground mt-1 line-clamp-2">
                {profile.bio}
              </p>
            )}
            {profile?.badge && (
              <div className="mt-2">
                <BadgeDisplay badge={profile.badge} />
              </div>
            )}
          </div>

          <button
            type="button"
            data-ocid="chat_profile.edit_button"
            onClick={() => setEditMode(!editMode)}
            className="px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors flex-shrink-0"
          >
            {editMode ? "Cancel" : "Edit"}
          </button>
        </div>

        {/* Points Balance */}
        <div className="mt-4 bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">
            🪙
          </div>
          <div>
            <p className="text-white/80 text-xs font-medium">Aapke Points</p>
            <p className="text-white text-2xl font-bold font-heading">
              {totalPoints.toLocaleString("en-IN")}
            </p>
          </div>
          {profile?.isPremium && (
            <span className="ml-auto bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
              ⭐ Premium
            </span>
          )}
        </div>
      </div>

      {/* Edit Form */}
      {editMode && (
        <div
          data-ocid="chat_profile.edit_button"
          className="bg-card border-b border-border px-4 py-4 space-y-3"
        >
          <h3 className="font-semibold text-foreground text-sm">
            Profile Edit Karein
          </h3>
          <input
            data-ocid="chat_profile.input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Aapka naam"
            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
          />
          <input
            data-ocid="chat_profile.input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@username (optional)"
            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
          />
          <input
            data-ocid="chat_profile.input"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Aapka sheher"
            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
          />
          <textarea
            data-ocid="chat_profile.textarea"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Bio likhein..."
            rows={2}
            className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring bg-background resize-none"
          />
          <button
            type="button"
            data-ocid="chat_profile.save_button"
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      {/* Referral Section */}
      <div className="px-4 pt-4">
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
            <Award size={16} className="text-primary" /> Referral Code
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-lg font-mono font-bold text-primary tracking-widest text-center">
              {profile?.referralCode ?? "—"}
            </div>
            <button
              type="button"
              data-ocid="chat_profile.button"
              onClick={handleCopyReferral}
              className="p-2.5 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
            >
              <ClipboardCopy size={18} />
            </button>
            <button
              type="button"
              data-ocid="chat_profile.button"
              onClick={handleShareReferral}
              className="p-2.5 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors"
            >
              <Share2 size={18} />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Dosto ko refer karein aur 50 points kamayein! 🎉
          </p>
        </div>
      </div>

      {/* Settings Toggles */}
      <div className="px-4 pt-3">
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <h3 className="font-semibold text-foreground text-sm px-4 pt-4 pb-2">
            Privacy & Mode Settings
          </h3>
          <div className="divide-y divide-border">
            <InlineToggle
              label="Ghost Mode"
              description="Blue tick nahi aayega"
              icon={<EyeOff size={18} />}
              value={ghostMode}
              onChange={(v) => handleToggle("ghostModeEnabled", v)}
              loading={toggling === "ghostModeEnabled"}
            />
            <InlineToggle
              label="Study Mode"
              description="Sirf selected chats notify karenge"
              icon={<BookOpen size={18} />}
              value={studyMode}
              onChange={(v) => handleToggle("studyModeEnabled", v)}
              loading={toggling === "studyModeEnabled"}
            />
            <InlineToggle
              label="Public Mode"
              description="Sab log aapki profile dekh sakenge"
              icon={<Globe size={18} />}
              value={isPublicMode}
              onChange={(v) => handleToggle("isPublicMode", v)}
              loading={toggling === "isPublicMode"}
            />
            <InlineToggle
              label="Auto-Reply"
              description="Busy hone par auto response bhejein"
              icon={<Bell size={18} />}
              value={autoReply}
              onChange={(v) => handleToggle("autoReplyEnabled", v)}
              loading={toggling === "autoReplyEnabled"}
            />
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="px-4 pt-3">
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <h3 className="font-semibold text-foreground text-sm px-4 pt-4 pb-2">
            Features
          </h3>
          <div className="divide-y divide-border">
            {/* Premium upgrade row */}
            {!profile?.isPremium ? (
              <button
                type="button"
                data-ocid="chat_profile.premium_button"
                onClick={() => navigate("/chat/premium")}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors rounded-xl bg-gradient-to-r from-yellow-50 to-amber-50"
              >
                <span className="text-yellow-500 flex-shrink-0">
                  <Star size={18} className="fill-yellow-400" />
                </span>
                <span className="flex-1 text-sm font-semibold text-yellow-700 text-left">
                  ⭐ Go Premium
                </span>
                <span className="text-xs bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded-full">
                  Upgrade
                </span>
              </button>
            ) : (
              <button
                type="button"
                data-ocid="chat_profile.premium_status"
                onClick={() => navigate("/chat/premium")}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors rounded-xl"
              >
                <span className="text-yellow-500 flex-shrink-0">
                  <Star size={18} className="fill-yellow-400" />
                </span>
                <span className="flex-1 text-sm font-semibold text-foreground text-left">
                  Premium Active ✓
                </span>
                {profile.premiumTill && (
                  <span className="text-xs text-muted-foreground">
                    {Math.max(
                      0,
                      Math.ceil(
                        (profile.premiumTill - Date.now()) / 86_400_000,
                      ),
                    )}{" "}
                    days left
                  </span>
                )}
              </button>
            )}
            <QuickLink
              icon={<ShoppingBag size={18} />}
              label="Marketplace"
              ocid="chat_profile.market_link"
              onClick={() => navigate("/chat/market")}
            />
            <QuickLink
              icon={<Calendar size={18} />}
              label="Scheduled Messages"
              ocid="chat_profile.link"
              onClick={() => navigate("/chat/scheduled")}
            />
            <QuickLink
              icon={<Zap size={18} />}
              label="Auto-Reply Settings"
              ocid="chat_profile.link"
              onClick={() => navigate("/chat/auto-reply")}
            />
            <QuickLink
              icon={<Lock size={18} />}
              label="Media Vault"
              ocid="chat_profile.link"
              onClick={() => navigate("/chat/vault")}
            />
            <QuickLink
              icon={<BookOpen size={18} />}
              label="My Notes"
              ocid="chat_profile.link"
              onClick={() => navigate("/chat/notes")}
            />
            <QuickLink
              icon={<Sparkles size={18} />}
              label="@Shortcuts"
              ocid="chat_profile.link"
              onClick={() => navigate("/chat/shortcuts")}
            />
            <QuickLink
              icon={<Eye size={18} />}
              label="Rewards & Points"
              ocid="chat_profile.link"
              onClick={() => navigate("/chat/rewards")}
            />
            <QuickLink
              icon={<DollarSign size={18} />}
              label="💰 Creator Earnings"
              ocid="chat_profile.earnings_button"
              onClick={() => setShowEarnings((v) => !v)}
            />
          </div>
        </div>
      </div>

      {/* Creator Earnings Dashboard */}
      {showEarnings && (
        <div className="px-4 pt-3" data-ocid="chat_profile.earnings_dashboard">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <CreatorEarningsDashboard />
          </div>
        </div>
      )}

      {/* Sign Out */}
      <div className="px-4 pt-3 pb-4">
        <button
          type="button"
          data-ocid="chat_profile.button"
          onClick={() => navigate("/chat")}
          className="w-full flex items-center justify-center gap-2 bg-muted border border-border text-foreground py-3 rounded-xl text-sm font-semibold hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
        >
          <LogOut size={16} /> Chat Se Bahar Jaayein
        </button>
      </div>
    </div>
  );
}

export default function ChatProfilePage() {
  return (
    <ChatProvider>
      <ChatProfilePageInner />
    </ChatProvider>
  );
}
