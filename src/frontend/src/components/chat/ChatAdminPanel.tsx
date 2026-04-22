/**
 * ChatAdminPanel — Admin control section for the Likeup chat module.
 * Embedded into AdminDashboardPage under "💬 Chat Module".
 */
import {
  CheckCircle,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  ShoppingBag,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useActor } from "../../hooks/useActor";
import {
  useChatAdminSettings,
  useChatShortcuts,
  useUpdateChatAdminSettings,
} from "../../hooks/useChatQueries";
import {
  useAdminAddNews,
  useAdminDeleteNews,
  useFeatureListing,
  useListings,
  useNewsItems,
} from "../../hooks/useMarketplaceQueries";
import {
  useAdminApprovePremium,
  useAdminRejectPremium,
  useAdminSetPremiumPrices,
  useAdminUpiPremiumRequests,
} from "../../hooks/usePremiumQueries";
import type { ChatAdminSettings, ChatShortcut } from "../../types/chatTypes";

// ---- Helpers ----
function asChatActor(
  actor: unknown,
): Record<string, (...args: unknown[]) => Promise<unknown>> {
  return actor as Record<string, (...args: unknown[]) => Promise<unknown>>;
}

// ---- Toggle Row ----
function ToggleRow({
  label,
  value,
  onChange,
  loading,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <button
        type="button"
        data-ocid="chat_admin.toggle"
        onClick={() => onChange(!value)}
        disabled={loading}
        className={`w-12 h-6 rounded-full transition-all duration-200 flex-shrink-0 ${
          value ? "bg-primary" : "bg-muted border border-border"
        } disabled:opacity-60`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white shadow-sm mt-0.5 transition-all duration-200 ${
            value ? "translate-x-6 ml-0.5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

// ---- Points Config Field ----
function PointsField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground flex-1">{label}</span>
      <input
        data-ocid="chat_admin.input"
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 border border-border rounded-xl px-3 py-2 text-sm text-right outline-none focus:ring-2 focus:ring-ring bg-background"
      />
    </div>
  );
}

// ---- Shortcut Row ----
function ShortcutRow({
  shortcut,
  onDelete,
}: {
  shortcut: ChatShortcut;
  onDelete: () => void;
}) {
  return (
    <div
      data-ocid={`chat_admin.item.${shortcut.id}`}
      className="flex items-start gap-3 p-3 bg-muted/40 rounded-xl border border-border"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
            {shortcut.trigger}
          </span>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md capitalize">
            {shortcut.category}
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground mt-1">
          {shortcut.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {shortcut.content}
        </p>
      </div>
      <button
        type="button"
        data-ocid="chat_admin.delete_button"
        onClick={onDelete}
        className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg flex-shrink-0"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function ChatAdminPanel() {
  const { data: adminSettings, isLoading: settingsLoading } =
    useChatAdminSettings();
  const { data: shortcuts, isLoading: shortcutsLoading } = useChatShortcuts();
  const updateSettings = useUpdateChatAdminSettings();
  const { actor } = useActor();

  // Local editable settings
  const [localSettings, setLocalSettings] = useState<
    Partial<ChatAdminSettings>
  >({});
  const [saving, setSaving] = useState(false);

  // Broadcast message
  const [broadcast, setBroadcast] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);

  // New shortcut form
  const [newTrigger, setNewTrigger] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] =
    useState<ChatShortcut["category"]>("greet");
  const [addingShortcut, setAddingShortcut] = useState(false);

  const merged: ChatAdminSettings = {
    ...(adminSettings ?? {
      chatEnabled: true,
      storiesEnabled: true,
      marketplaceEnabled: true,
      rewardsEnabled: true,
      premiumEnabled: true,
      maxFileSizeMb: 20,
      pointsPerMessage: 1,
      pointsPerDailyLogin: 10,
      pointsPerStory: 5,
      pointsPerReferral: 50,
      premiumPriceMonthly: 49,
      premiumPriceYearly: 399,
    }),
    ...localSettings,
  };

  const updateField = <K extends keyof ChatAdminSettings>(
    key: K,
    value: ChatAdminSettings[K],
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings.mutateAsync(localSettings);
      setLocalSettings({});
      toast.success("Chat settings save ho gayi! ✅");
    } catch {
      toast.error("Save nahi ho saka. Dobara try karein.");
    } finally {
      setSaving(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcast.trim() || !actor) return;
    setBroadcasting(true);
    try {
      await asChatActor(actor).broadcastChatMessage(broadcast.trim());
      toast.success("Broadcast message bhej diya gaya! 📢");
      setBroadcast("");
    } catch {
      toast.error("Broadcast nahi ho saka.");
    } finally {
      setBroadcasting(false);
    }
  };

  const handleAddShortcut = async () => {
    if (!newTrigger.trim() || !newContent.trim() || !actor) return;
    setAddingShortcut(true);
    try {
      await asChatActor(actor).addChatShortcut({
        trigger: newTrigger.trim().startsWith("@")
          ? newTrigger.trim()
          : `@${newTrigger.trim()}`,
        title: newTitle.trim() || newTrigger.trim(),
        content: newContent.trim(),
        category: newCategory,
        isGlobal: true,
      });
      toast.success("Shortcut add ho gaya! ✅");
      setNewTrigger("");
      setNewTitle("");
      setNewContent("");
    } catch {
      toast.error("Shortcut add nahi ho saka.");
    } finally {
      setAddingShortcut(false);
    }
  };

  const handleDeleteShortcut = async (id: string) => {
    if (!actor) return;
    try {
      await asChatActor(actor).deleteChatShortcut(id);
      toast.success("Shortcut delete ho gaya.");
    } catch {
      toast.error("Delete nahi ho saca.");
    }
  };

  const handleSeedDemo = async () => {
    if (!actor) return;
    try {
      await asChatActor(actor).adminSeedChatDemoData();
      toast.success("Demo data seed ho gaya! 🌱");
    } catch {
      toast.error("Seed nahi ho saka (shayad pehle se hai).");
    }
  };

  if (settingsLoading) {
    return (
      <div
        data-ocid="chat_admin.loading_state"
        className="flex justify-center py-16"
      >
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Feature Toggles */}
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <MessageCircle size={16} className="text-primary" />
          <h3 className="font-semibold text-foreground text-sm">
            Feature Toggles
          </h3>
        </div>
        {(
          [
            { key: "chatEnabled", label: "💬 Chat (Master Switch)" },
            { key: "storiesEnabled", label: "📸 Stories" },
            { key: "marketplaceEnabled", label: "🛒 Marketplace" },
            { key: "rewardsEnabled", label: "🪙 Reward Points" },
            { key: "premiumEnabled", label: "⭐ Premium System" },
          ] as { key: keyof ChatAdminSettings; label: string }[]
        ).map(({ key, label }) => (
          <ToggleRow
            key={key}
            label={label}
            value={merged[key] as boolean}
            onChange={(v) =>
              updateField(key, v as ChatAdminSettings[typeof key])
            }
            loading={saving}
          />
        ))}
      </div>

      {/* Extended Toggles */}
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <h3 className="font-semibold text-foreground text-sm">
            Advanced Feature Toggles
          </h3>
        </div>
        {[
          {
            key: "ghostModeEnabled" as keyof ChatAdminSettings,
            label: "👻 Ghost Mode (Users ke liye)",
          },
          {
            key: "vanishModeEnabled" as keyof ChatAdminSettings,
            label: "💨 Vanish Mode (10s Auto-Delete)",
          },
          {
            key: "schedulingEnabled" as keyof ChatAdminSettings,
            label: "⏰ Message Scheduling",
          },
          {
            key: "autoReplyEnabled" as keyof ChatAdminSettings,
            label: "🤖 Auto-Reply",
          },
          {
            key: "voiceToTextEnabled" as keyof ChatAdminSettings,
            label: "🎙️ Voice-to-Text",
          },
          {
            key: "shortcutsEnabled" as keyof ChatAdminSettings,
            label: "⚡ @Shortcuts",
          },
          {
            key: "studyModeEnabled" as keyof ChatAdminSettings,
            label: "📚 Study Mode",
          },
          {
            key: "referralEnabled" as keyof ChatAdminSettings,
            label: "👥 Referral Program",
          },
        ].map(({ key, label }) => (
          <ToggleRow
            key={key}
            label={label}
            value={(merged[key] as boolean | undefined) ?? true}
            onChange={(v) =>
              updateField(key, v as ChatAdminSettings[typeof key])
            }
            loading={saving}
          />
        ))}
      </div>

      {/* Points Configuration */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
        <h3 className="font-semibold text-foreground text-sm">
          🪙 Points Configuration
        </h3>
        <PointsField
          label="Points per Message"
          value={merged.pointsPerMessage}
          onChange={(v) => updateField("pointsPerMessage", v)}
        />
        <PointsField
          label="Points per Daily Login"
          value={merged.pointsPerDailyLogin}
          onChange={(v) => updateField("pointsPerDailyLogin", v)}
        />
        <PointsField
          label="Points per Story Post"
          value={merged.pointsPerStory}
          onChange={(v) => updateField("pointsPerStory", v)}
        />
        <PointsField
          label="Points per Referral"
          value={merged.pointsPerReferral}
          onChange={(v) => updateField("pointsPerReferral", v)}
        />
      </div>

      {/* Save Button */}
      <button
        type="button"
        data-ocid="chat_admin.save_button"
        onClick={handleSave}
        disabled={saving || Object.keys(localSettings).length === 0}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition-opacity"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : null}
        {saving ? "Saving..." : "💾 Settings Save Karein"}
      </button>

      {/* Broadcast Message */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-3">
        <h3 className="font-semibold text-foreground text-sm">
          📢 Broadcast Message
        </h3>
        <textarea
          data-ocid="chat_admin.textarea"
          value={broadcast}
          onChange={(e) => setBroadcast(e.target.value)}
          placeholder="Sabhi users ko message likhein..."
          rows={3}
          className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background resize-none"
        />
        <button
          type="button"
          data-ocid="chat_admin.primary_button"
          onClick={handleBroadcast}
          disabled={!broadcast.trim() || broadcasting}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-60 w-full"
        >
          {broadcasting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          Broadcast Bhejein
        </button>
      </div>

      {/* @Shortcuts Manager */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
        <h3 className="font-semibold text-foreground text-sm">
          ⚡ @Shortcuts Manage Karein
        </h3>

        {/* Add form */}
        <div className="space-y-3 bg-muted/40 rounded-xl p-3 border border-border">
          <div className="grid grid-cols-2 gap-2">
            <input
              data-ocid="chat_admin.input"
              type="text"
              value={newTrigger}
              onChange={(e) => setNewTrigger(e.target.value)}
              placeholder="@trigger (e.g. @greet)"
              className="border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
            />
            <input
              data-ocid="chat_admin.input"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title"
              className="border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
            />
          </div>
          <textarea
            data-ocid="chat_admin.textarea"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Shortcut content (message body)"
            rows={2}
            className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-background resize-none"
          />
          <div className="flex items-center gap-2">
            <select
              data-ocid="chat_admin.select"
              value={newCategory}
              onChange={(e) =>
                setNewCategory(e.target.value as ChatShortcut["category"])
              }
              className="border border-border rounded-xl px-3 py-2 text-sm outline-none bg-background flex-1"
            >
              <option value="greet">Greet</option>
              <option value="business">Business</option>
              <option value="formula">Formula</option>
              <option value="custom">Custom</option>
            </select>
            <button
              type="button"
              data-ocid="chat_admin.primary_button"
              onClick={handleAddShortcut}
              disabled={
                !newTrigger.trim() || !newContent.trim() || addingShortcut
              }
              className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 disabled:opacity-60"
            >
              {addingShortcut ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Plus size={13} />
              )}
              Add
            </button>
          </div>
        </div>

        {/* Existing shortcuts */}
        {shortcutsLoading ? (
          <div
            data-ocid="chat_admin.loading_state"
            className="flex justify-center py-4"
          >
            <Loader2 size={20} className="animate-spin text-primary" />
          </div>
        ) : !shortcuts || shortcuts.length === 0 ? (
          <div
            data-ocid="chat_admin.empty_state"
            className="text-center py-6 text-muted-foreground text-sm"
          >
            Koi shortcut nahi hai. Upar se add karein!
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {shortcuts
              .filter((s) => s.isGlobal)
              .map((s) => (
                <ShortcutRow
                  key={s.id}
                  shortcut={s}
                  onDelete={() => handleDeleteShortcut(s.id)}
                />
              ))}
          </div>
        )}
      </div>

      {/* Seed Demo Data */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5">
        <h3 className="font-semibold text-foreground text-sm mb-2">
          🌱 Demo Data
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          First launch ke liye demo users, chats, aur marketplace listings seed
          karein (sirf ek baar kaam karega).
        </p>
        <button
          type="button"
          data-ocid="chat_admin.button"
          onClick={handleSeedDemo}
          className="flex items-center gap-2 border border-border text-foreground text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-muted transition-colors"
        >
          🌱 Seed Demo Data
        </button>
      </div>

      {/* Marketplace Admin */}
      <MarketplaceAdminSection />

      {/* Premium Admin */}
      <PremiumAdminSection />
    </div>
  );
}

// ---- Marketplace Admin Section ----
function MarketplaceAdminSection() {
  const { data: listings = [] } = useListings();
  const { data: news = [] } = useNewsItems();
  const featureListing = useFeatureListing();
  const addNews = useAdminAddNews();
  const deleteNews = useAdminDeleteNews();

  const [newsTitle, setNewsTitle] = useState("");
  const [newsContent, setNewsContent] = useState("");
  const [addingNews, setAddingNews] = useState(false);

  const handleFeature = async (listingId: string, featured: boolean) => {
    try {
      await featureListing.mutateAsync({ listingId, featured });
      toast.success(
        featured ? "Featured mark ho gaya ⭐" : "Feature hata diya",
      );
    } catch {
      toast.error("Update nahi ho saka.");
    }
  };

  const handleAddNews = async () => {
    if (!newsTitle.trim() || !newsContent.trim()) return;
    setAddingNews(true);
    try {
      await addNews.mutateAsync({
        title: newsTitle.trim(),
        content: newsContent.trim(),
      });
      toast.success("News add ho gayi! ✅");
      setNewsTitle("");
      setNewsContent("");
    } catch {
      toast.error("News add nahi ho saki.");
    } finally {
      setAddingNews(false);
    }
  };

  const handleDeleteNews = async (newsId: string) => {
    try {
      await deleteNews.mutateAsync(newsId);
      toast.success("News delete ho gayi.");
    } catch {
      toast.error("Delete nahi ho saka.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Marketplace Listings */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShoppingBag size={16} className="text-primary" />
          <h3 className="font-semibold text-foreground text-sm">
            🛒 Marketplace Admin
          </h3>
        </div>
        {listings.length === 0 ? (
          <p
            className="text-xs text-muted-foreground"
            data-ocid="chat_admin.market_empty_state"
          >
            Koi listing nahi hai.
          </p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {listings.slice(0, 20).map((listing, idx) => (
              <div
                key={listing.id}
                data-ocid={`chat_admin.market.item.${idx + 1}`}
                className="flex items-center gap-2 py-2 border-b border-border last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {listing.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ₹{listing.price} · {listing.city}
                  </p>
                </div>
                <button
                  type="button"
                  data-ocid={`chat_admin.market.feature_button.${idx + 1}`}
                  onClick={() => handleFeature(listing.id, !listing.isFeatured)}
                  className={`text-xs px-2 py-1 rounded-lg font-semibold flex-shrink-0 ${
                    listing.isFeatured
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-muted text-muted-foreground hover:bg-yellow-50"
                  }`}
                >
                  {listing.isFeatured ? "⭐ Featured" : "Feature"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Local News Manager */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-3">
        <h3 className="font-semibold text-foreground text-sm">
          📰 Local News Add Karein
        </h3>
        <input
          data-ocid="chat_admin.news_title_input"
          type="text"
          value={newsTitle}
          onChange={(e) => setNewsTitle(e.target.value)}
          placeholder="News title..."
          className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
        />
        <textarea
          data-ocid="chat_admin.news_content_textarea"
          value={newsContent}
          onChange={(e) => setNewsContent(e.target.value)}
          placeholder="News content..."
          rows={2}
          className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-background resize-none"
        />
        <button
          type="button"
          data-ocid="chat_admin.add_news_button"
          onClick={handleAddNews}
          disabled={!newsTitle.trim() || !newsContent.trim() || addingNews}
          className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-60"
        >
          {addingNews ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Plus size={13} />
          )}
          News Add Karein
        </button>

        {news.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto border-t border-border pt-3">
            {news.map((item, idx) => (
              <div
                key={item.id}
                data-ocid={`chat_admin.news.item.${idx + 1}`}
                className="flex items-start gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.title}
                  </p>
                </div>
                <button
                  type="button"
                  data-ocid={`chat_admin.news.delete_button.${idx + 1}`}
                  onClick={() => handleDeleteNews(item.id)}
                  className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg flex-shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Premium Admin Section ----
function PremiumAdminSection() {
  const { data: requests = [] } = useAdminUpiPremiumRequests();
  const approvePremium = useAdminApprovePremium();
  const rejectPremium = useAdminRejectPremium();
  const setPrices = useAdminSetPremiumPrices();

  const [monthly, setMonthly] = useState(99);
  const [quarterly, setQuarterly] = useState(249);
  const [annual, setAnnual] = useState(799);
  const [savingPrices, setSavingPrices] = useState(false);
  const [stripeKey, setStripeKey] = useState("");
  const [aiKey, setAiKey] = useState("");
  const { actor } = useActor();

  function asChatActor(
    a: unknown,
  ): Record<string, (...args: unknown[]) => Promise<unknown>> {
    return a as Record<string, (...args: unknown[]) => Promise<unknown>>;
  }

  const handleSavePrices = async () => {
    setSavingPrices(true);
    try {
      await setPrices.mutateAsync({ monthly, quarterly, annual });
      toast.success("Premium prices save ho gayi! ✅");
    } catch {
      toast.error("Save nahi ho saka.");
    } finally {
      setSavingPrices(false);
    }
  };

  const handleApprove = async (requestId: string, planKey: string) => {
    try {
      await approvePremium.mutateAsync({ requestId, planKey });
      toast.success("Premium approve ho gaya! ✅");
    } catch {
      toast.error("Approve nahi ho saka.");
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectPremium.mutateAsync(requestId);
      toast.success("Request reject ho gayi.");
    } catch {
      toast.error("Reject nahi ho saka.");
    }
  };

  const handleSaveStripe = async () => {
    if (!actor || !stripeKey.trim()) return;
    try {
      await asChatActor(actor).saveChatStripeConfig({
        publishableKey: stripeKey.trim(),
      });
      toast.success("Stripe key save ho gayi! ✅");
    } catch {
      toast.error("Save nahi ho saka.");
    }
  };

  const handleSaveAiKey = async () => {
    if (!actor || !aiKey.trim()) return;
    try {
      await asChatActor(actor).saveChatAiConfig({ openaiApiKey: aiKey.trim() });
      toast.success("AI key save ho gayi! ✅");
    } catch {
      toast.error("Save nahi ho saka.");
    }
  };

  const pending = requests.filter((r) => r.status === "pending");

  return (
    <div className="space-y-4">
      {/* Premium Requests */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Star size={16} className="text-yellow-500 fill-yellow-500" />
          <h3 className="font-semibold text-foreground text-sm">
            ⭐ Premium Requests (UPI)
          </h3>
        </div>
        {pending.length === 0 ? (
          <p
            className="text-xs text-muted-foreground"
            data-ocid="chat_admin.premium_requests_empty_state"
          >
            Koi pending request nahi hai.
          </p>
        ) : (
          <div className="space-y-3">
            {pending.map((req, idx) => (
              <div
                key={req.id}
                data-ocid={`chat_admin.premium_request.item.${idx + 1}`}
                className="bg-muted/40 rounded-xl border border-border p-3"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {req.userName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {req.planKey} · ₹{req.amount}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      UTR: {req.upiTransactionRef}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    data-ocid={`chat_admin.premium_request.confirm_button.${idx + 1}`}
                    onClick={() => handleApprove(req.id, req.planKey)}
                    className="flex-1 flex items-center justify-center gap-1 bg-green-500 text-white text-xs font-bold py-2 rounded-xl hover:bg-green-600 transition-colors"
                  >
                    <CheckCircle size={12} /> Approve
                  </button>
                  <button
                    type="button"
                    data-ocid={`chat_admin.premium_request.cancel_button.${idx + 1}`}
                    onClick={() => handleReject(req.id)}
                    className="flex-1 flex items-center justify-center gap-1 bg-destructive/10 text-destructive text-xs font-bold py-2 rounded-xl hover:bg-destructive/20 transition-colors"
                  >
                    <XCircle size={12} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Premium Prices */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
        <h3 className="font-semibold text-foreground text-sm">
          💰 Premium Plan Prices
        </h3>
        {[
          { label: "Monthly (₹)", value: monthly, onChange: setMonthly },
          { label: "Quarterly (₹)", value: quarterly, onChange: setQuarterly },
          { label: "Annual (₹)", value: annual, onChange: setAnnual },
        ].map(({ label, value, onChange }) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <span className="text-sm text-foreground">{label}</span>
            <input
              data-ocid="chat_admin.premium_price_input"
              type="number"
              min="0"
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              className="w-24 border border-border rounded-xl px-3 py-2 text-sm text-right outline-none focus:ring-2 focus:ring-ring bg-background"
            />
          </div>
        ))}
        <button
          type="button"
          data-ocid="chat_admin.premium_prices_save_button"
          onClick={handleSavePrices}
          disabled={savingPrices}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60"
        >
          {savingPrices ? <Loader2 size={14} className="animate-spin" /> : null}
          {savingPrices ? "Saving..." : "💾 Prices Save Karein"}
        </button>
      </div>

      {/* Stripe Config */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-3">
        <h3 className="font-semibold text-foreground text-sm">
          💳 Stripe Config
        </h3>
        <input
          data-ocid="chat_admin.stripe_key_input"
          type="password"
          value={stripeKey}
          onChange={(e) => setStripeKey(e.target.value)}
          placeholder="Stripe Publishable Key (pk_live_...)"
          className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
        />
        <button
          type="button"
          data-ocid="chat_admin.stripe_save_button"
          onClick={handleSaveStripe}
          disabled={!stripeKey.trim()}
          className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-60"
        >
          Save Stripe Key
        </button>
      </div>

      {/* AI Summary Config */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-3">
        <h3 className="font-semibold text-foreground text-sm">
          🤖 AI Summary Config
        </h3>
        <input
          data-ocid="chat_admin.ai_key_input"
          type="password"
          value={aiKey}
          onChange={(e) => setAiKey(e.target.value)}
          placeholder="OpenAI API Key (sk-...)"
          className="w-full border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
        />
        <button
          type="button"
          data-ocid="chat_admin.ai_key_save_button"
          onClick={handleSaveAiKey}
          disabled={!aiKey.trim()}
          className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-60"
        >
          Save AI Key
        </button>
      </div>
    </div>
  );
}
