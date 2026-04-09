import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Calculator,
  CheckCircle,
  CheckSquare,
  DollarSign,
  Facebook,
  Image,
  Instagram,
  Layout,
  Loader2,
  LogOut,
  MessageCircle,
  MessageSquare,
  Palette,
  Pencil,
  Plus,
  Search,
  Send,
  Settings,
  Share2,
  Shield,
  Star,
  ToggleLeft,
  ToggleRight,
  Trash2,
  TrendingUp,
  UserCog,
  Users,
  XCircle,
  Youtube,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import DeliveryAdminPanel from "../components/DeliveryAdminPanel";
import EarningDashboardComponent from "../components/EarningDashboard";
import VideoPlayer from "../components/VideoPlayer";
import { hashPassword, useAuth } from "../contexts/AuthContext";
import { useActor } from "../hooks/useActor";
import {
  useActiveBanners,
  useAddCategory,
  useAddCustomCode,
  useAddJob,
  useAddNews,
  useAddScrapRate,
  useAddVideo,
  useAdminConfig,
  useAllProviders,
  useAllToggles,
  useAppSettings,
  useApproveProvider,
  useCategories,
  useCustomCodes,
  useDeleteCategory,
  useDeleteCustomCode,
  useDeleteJob,
  useDeleteNews,
  useDeleteScrapRate,
  useDeleteVideo,
  useGetAllLudoRedemptionRequests,
  useGetFirebaseConfigLink,
  useJobs,
  useNews,
  useProvidersPendingApproval,
  useRecentUsers,
  useRejectProvider,
  useScrapRates,
  useSearchUsers,
  useSetFirebaseConfigLink,
  useSubscriptionPricing,
  useUpdateAppSettings,
  useUpdateCategory,
  useUpdateCustomCode,
  useUpdateJob,
  useUpdateLudoRedemptionStatus,
  useUpdateNews,
  useUpdateScrapRate,
  useUpdateToggle,
  useUsersByRole,
} from "../hooks/useQueries";
import { useNavigate } from "../lib/router";
import type {
  Banner,
  LudoRedemptionRequest,
  ProviderProfile,
  SubscriptionPlan,
  User,
} from "../types/appTypes";
import {
  type SheetRow,
  addManualRow,
  deleteSheetRow,
  getLastSyncTime,
  getSheetCsvUrl,
  getSheetData,
  setSheetCsvUrl,
  syncFromSheet,
} from "../utils/googleSheetsSync";
import { useRegisterQueryClient } from "../utils/settingsSync";
import { broadcastSettingsChange } from "../utils/settingsSync";

type AdminSection =
  | "founder"
  | "categoryManager"
  | "users"
  | "search"
  | "approvals"
  | "controls"
  | "banners"
  | "settings"
  | "pricing"
  | "staff"
  | "ads"
  | "ebookManager"
  | "appSettings"
  | "scrapRates"
  | "homepageControls"
  | "announcements"
  | "delivery"
  | "googleSheets"
  | "notificationBar"
  | "newsManager"
  | "jobsManager"
  | "masterToggles"
  | "earningDashboard"
  | "customCode"
  | "udhaarBook"
  | "ludoSettings";

const DEFAULT_EMERALD = "#059669";

// ---- Save Confirmation Banner ----
function SaveConfirmation({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-green-500 text-white px-5 py-3 rounded-2xl shadow-lg font-semibold text-sm"
    >
      <CheckCircle size={18} className="text-white" />
      Settings Saved!
    </motion.div>
  );
}

// ---- Provider Quick Action Modal ----
interface ProviderQuickActionModalProps {
  user: User;
  profile?: ProviderProfile;
  onClose: () => void;
}

function ProviderQuickActionModal({
  user,
  profile,
  onClose,
}: ProviderQuickActionModalProps) {
  const approveM = useApproveProvider();
  const rejectM = useRejectProvider();

  const handleApprove = async () => {
    await approveM.mutateAsync({
      userId: user.id,
      plan: "oneMonth" as SubscriptionPlan,
    });
    toast.success(`${user.name} ko approve kar diya!`);
    onClose();
  };

  const handleReject = async () => {
    await rejectM.mutateAsync(user.id);
    toast.success(`${user.name} ko reject kar diya.`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      data-ocid="admin.modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 12 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
      >
        {/* Header */}
        <div className="bg-emerald-header text-white px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-heading font-bold text-lg">{user.name}</p>
            <p className="text-white/70 text-sm">{user.mobile}</p>
          </div>
          <button
            type="button"
            data-ocid="admin.close_button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <XCircle size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Profile Info */}
          {profile && (
            <div className="bg-muted rounded-xl px-4 py-3 space-y-1">
              {profile.shopName && (
                <p className="text-sm font-semibold text-foreground">
                  🏪 {profile.shopName}
                </p>
              )}
              {profile.category && (
                <p className="text-xs text-muted-foreground">
                  Category: {profile.category}
                </p>
              )}
              <span
                className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                  getPlanLabel(profile.planType) === "premium"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {getPlanLabel(profile.planType) === "premium"
                  ? "⭐ Premium"
                  : "🆓 Free"}
              </span>
            </div>
          )}

          {/* Payment Screenshot */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Payment Screenshot
            </p>
            {profile?.paymentScreenshotBlobId ? (
              <img
                src={profile.paymentScreenshotBlobId}
                alt="Payment Screenshot"
                className="w-40 h-40 object-contain border border-border rounded-xl mx-auto block"
              />
            ) : (
              <div className="w-full h-24 bg-muted rounded-xl flex items-center justify-center">
                <p className="text-xs text-muted-foreground text-center px-4">
                  📷 Payment screenshot nahi hai
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              data-ocid="admin.confirm_button"
              onClick={handleApprove}
              disabled={approveM.isPending || rejectM.isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
            >
              {approveM.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle size={14} />
              )}
              Approve
            </button>
            <button
              type="button"
              data-ocid="admin.delete_button"
              onClick={handleReject}
              disabled={approveM.isPending || rejectM.isPending}
              className="flex-1 flex items-center justify-center gap-2 border-2 border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-60 font-bold py-2.5 rounded-xl transition-colors text-sm"
            >
              {rejectM.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <XCircle size={14} />
              )}
              Reject
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Helper: convert Motoko variant to readable string
function getRoleLabel(role: unknown): string {
  if (!role || typeof role !== "object") return String(role ?? "");
  const keys = Object.keys(role as object);
  return keys[0] ?? String(role);
}

function getPlanLabel(plan: unknown): string {
  if (!plan || typeof plan !== "object") return String(plan ?? "pending");
  const keys = Object.keys(plan as object);
  return keys[0] ?? "pending";
}

// ---- User Management Section ----
type UserMgmtTab =
  | "recent"
  | "customers"
  | "providers"
  | "nayeProviders"
  | "puraneProviders";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function UserManagement() {
  const [activeTab, setActiveTab] = useState<UserMgmtTab>("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<bigint | null>(null);

  const { data: recentUsers, isLoading: r } = useRecentUsers();
  const { data: customers, isLoading: c } = useUsersByRole("customer");
  const { data: providers, isLoading: p } = useUsersByRole("provider");
  const { data: allProviders } = useAllProviders();

  const isProviderTab =
    activeTab === "providers" ||
    activeTab === "nayeProviders" ||
    activeTab === "puraneProviders";

  const baseUsers = (() => {
    switch (activeTab) {
      case "recent":
        return recentUsers ?? [];
      case "customers":
        return customers ?? [];
      case "providers":
        return providers ?? [];
      case "nayeProviders": {
        const now = Date.now();
        return (providers ?? []).filter(
          (u) => now - Number(u.createdAt) <= SEVEN_DAYS_MS,
        );
      }
      case "puraneProviders": {
        const now = Date.now();
        return (providers ?? []).filter(
          (u) => now - Number(u.createdAt) > THIRTY_DAYS_MS,
        );
      }
      default:
        return [];
    }
  })();

  const loading =
    activeTab === "recent" ? r : activeTab === "customers" ? c : p;

  // Client-side search filter
  const users = searchQuery.trim()
    ? baseUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (u.mobile ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : baseUsers;

  const selectedUser =
    selectedUserId != null
      ? (users.find((u) => u.id === selectedUserId) ?? null)
      : null;
  const selectedProfile =
    selectedUserId != null
      ? (allProviders ?? []).find((p) => p.userId === selectedUserId)
      : undefined;

  const TAB_CONFIG: { key: UserMgmtTab; label: string }[] = [
    { key: "recent", label: "Naye Users (48h)" },
    { key: "customers", label: "All Customers" },
    { key: "providers", label: "All Providers" },
    { key: "nayeProviders", label: "Naye Providers (7d)" },
    { key: "puraneProviders", label: "Purane Providers (30d+)" },
  ];

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          data-ocid="admin.search_input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Naam ya Mobile Number se search karein..."
          className="w-full border border-border rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-white"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 overflow-x-auto">
        {TAB_CONFIG.map((t) => (
          <button
            key={t.key}
            type="button"
            data-ocid="admin.tab"
            onClick={() => setActiveTab(t.key)}
            className={`flex-shrink-0 py-2 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === t.key
                ? "bg-white text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div
          data-ocid="admin.loading_state"
          className="flex justify-center py-8"
        >
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-card">
          <table className="w-full text-sm" data-ocid="admin.table">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-foreground">
                  Naam
                </th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">
                  Mobile
                </th>
                <th className="text-left px-4 py-3 font-semibold text-foreground hidden sm:table-cell">
                  Reg. Date
                </th>
                <th className="text-left px-4 py-3 font-semibold text-foreground hidden md:table-cell">
                  Role
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr
                  key={u.id.toString()}
                  data-ocid={`admin.row.${i + 1}`}
                  className="border-t border-border hover:bg-muted/50"
                >
                  <td className="px-4 py-3 font-medium">
                    {isProviderTab ? (
                      <button
                        type="button"
                        data-ocid={`admin.button.${i + 1}`}
                        onClick={() =>
                          setSelectedUserId(
                            selectedUserId === u.id ? null : u.id,
                          )
                        }
                        className="text-primary underline-offset-2 hover:underline font-semibold text-left"
                      >
                        {u.name}
                      </button>
                    ) : (
                      u.name
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {u.mobile}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell text-xs">
                    {new Date(Number(u.createdAt)).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="capitalize text-xs">
                      {getRoleLabel(u.role)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div
              data-ocid="admin.empty_state"
              className="text-center py-8 text-muted-foreground"
            >
              {searchQuery.trim()
                ? "Koi user search results mein nahi mila"
                : "Koi user nahi mila"}
            </div>
          )}
        </div>
      )}

      {/* Provider Quick Action Modal */}
      {selectedUser && isProviderTab && (
        <ProviderQuickActionModal
          user={selectedUser}
          profile={selectedProfile}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}

// ---- Global Search Section ----
function GlobalSearch() {
  const [text, setText] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<bigint | null>(null);
  const { data: users, isLoading } = useSearchUsers(text);
  const { data: allProviders } = useAllProviders();

  const selectedUser =
    selectedUserId != null
      ? ((users ?? []).find((u) => u.id === selectedUserId) ?? null)
      : null;
  const selectedProfile =
    selectedUserId != null
      ? (allProviders ?? []).find((p) => p.userId === selectedUserId)
      : undefined;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          data-ocid="admin.search_input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Naam ya mobile se search karein..."
          className="w-full border border-border rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {isLoading && (
        <div
          data-ocid="admin.loading_state"
          className="flex justify-center py-4"
        >
          <Loader2 size={20} className="animate-spin text-primary" />
        </div>
      )}
      {users && users.length > 0 && (
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-card">
          <table className="w-full text-sm" data-ocid="admin.table">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Naam</th>
                <th className="text-left px-4 py-3 font-semibold">Mobile</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">
                  Reg. Date
                </th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">
                  Role
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr
                  key={u.id.toString()}
                  data-ocid={`admin.row.${i + 1}`}
                  className="border-t border-border hover:bg-muted/50"
                >
                  <td className="px-4 py-3 font-medium">
                    {getRoleLabel(u.role).toLowerCase() === "provider" ? (
                      <button
                        type="button"
                        data-ocid={`admin.button.${i + 1}`}
                        onClick={() =>
                          setSelectedUserId(
                            selectedUserId === u.id ? null : u.id,
                          )
                        }
                        className="text-primary underline-offset-2 hover:underline font-semibold text-left"
                      >
                        {u.name}
                      </button>
                    ) : (
                      u.name
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {u.mobile}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell text-xs">
                    {new Date(Number(u.createdAt)).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="capitalize text-xs">
                      {getRoleLabel(u.role)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {users && users.length === 0 && text.trim() && (
        <div
          data-ocid="admin.empty_state"
          className="text-center py-8 text-muted-foreground"
        >
          Koi result nahi mila
        </div>
      )}

      {/* Provider Quick Action Modal for search results */}
      {selectedUser &&
        getRoleLabel(selectedUser.role).toLowerCase() === "provider" && (
          <ProviderQuickActionModal
            user={selectedUser}
            profile={selectedProfile}
            onClose={() => setSelectedUserId(null)}
          />
        )}
    </div>
  );
}

// ---- Provider Approvals Section ----
function ProviderApprovals() {
  const { data: pending, isLoading } = useProvidersPendingApproval();
  const approveM = useApproveProvider();
  const rejectM = useRejectProvider();
  const [approveMap, setApproveMap] = useState<Record<string, string>>({});

  // Local providers from localStorage (dz_providers)
  const [localProviders, setLocalProviders] = useState<
    {
      id: string;
      name: string;
      mobile: string;
      category: string;
      planType: string;
      status: string;
      createdAt: string;
    }[]
  >(() => {
    try {
      const all = JSON.parse(localStorage.getItem("dz_providers") ?? "[]");
      return all.filter((p: { status: string }) => p.status === "pending");
    } catch {
      return [];
    }
  });

  const handleApproveLocal = (id: string) => {
    try {
      const all = JSON.parse(localStorage.getItem("dz_providers") ?? "[]");
      const updated = all.map((p: { id: string; status: string }) =>
        p.id === id ? { ...p, status: "approved" } : p,
      );
      localStorage.setItem("dz_providers", JSON.stringify(updated));
      setLocalProviders(
        updated.filter((p: { status: string }) => p.status === "pending"),
      );
      toast.success("Provider approve ho gaya!");
    } catch {
      toast.error("Error ho gaya");
    }
  };

  const handleRejectLocal = (id: string) => {
    try {
      const all = JSON.parse(localStorage.getItem("dz_providers") ?? "[]");
      const updated = all.filter((p: { id: string }) => p.id !== id);
      localStorage.setItem("dz_providers", JSON.stringify(updated));
      setLocalProviders(
        updated.filter((p: { status: string }) => p.status === "pending"),
      );
      toast.success("Provider reject ho gaya.");
    } catch {
      toast.error("Error ho gaya");
    }
  };

  // Also show pending categories from managers
  const pendingCategories: { name: string; icon: string; status: string }[] =
    (() => {
      try {
        return JSON.parse(
          localStorage.getItem("dz_pending_categories") ?? "[]",
        );
      } catch {
        return [];
      }
    })();

  const handleApproveCategory = (name: string) => {
    const cats: { name: string; icon: string; status: string }[] = (() => {
      try {
        return JSON.parse(
          localStorage.getItem("dz_pending_categories") ?? "[]",
        );
      } catch {
        return [];
      }
    })();
    const updated = cats.map((c) =>
      c.name === name ? { ...c, status: "approved" } : c,
    );
    localStorage.setItem("dz_pending_categories", JSON.stringify(updated));
    toast.success(`Category "${name}" approve ho gayi!`);
  };

  const handleRejectCategory = (name: string) => {
    const cats: { name: string; icon: string; status: string }[] = (() => {
      try {
        return JSON.parse(
          localStorage.getItem("dz_pending_categories") ?? "[]",
        );
      } catch {
        return [];
      }
    })();
    localStorage.setItem(
      "dz_pending_categories",
      JSON.stringify(cats.filter((c) => c.name !== name)),
    );
    toast.success(`Category "${name}" reject ho gayi.`);
  };

  const handleApprove = async (userId: bigint) => {
    const planKey = approveMap[userId.toString()] ?? "oneMonth";
    await approveM.mutateAsync({ userId, plan: planKey as SubscriptionPlan });
    toast.success("Provider approve ho gaya!");
  };

  const handleReject = async (userId: bigint) => {
    await rejectM.mutateAsync(userId);
    toast.success("Provider reject ho gaya.");
  };

  if (isLoading)
    return (
      <div data-ocid="admin.loading_state" className="flex justify-center py-8">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );

  const pendingCats = pendingCategories.filter((c) => c.status === "pending");

  return (
    <div className="space-y-6">
      {/* eBook Purchase Requests */}
      <EbookPurchaseNotifications />

      {/* Pending Categories from Managers */}
      {pendingCats.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-heading font-semibold text-foreground">
            Manager ki Pending Categories
          </h3>
          {pendingCats.map((cat, i) => (
            <div
              key={cat.name}
              data-ocid={`admin.item.${i + 1}`}
              className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{cat.icon}</span>
                <div>
                  <p className="font-semibold text-foreground">{cat.name}</p>
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                    Manager ka request
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-ocid={`admin.confirm_button.${i + 1}`}
                  onClick={() => handleApproveCategory(cat.name)}
                  className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl"
                >
                  <CheckCircle size={13} /> Approve
                </button>
                <button
                  type="button"
                  data-ocid={`admin.delete_button.${i + 1}`}
                  onClick={() => handleRejectCategory(cat.name)}
                  className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-bold px-3 py-1.5 rounded-xl"
                >
                  <XCircle size={13} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Local Providers from Registration Form */}
      {localProviders.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-heading font-semibold text-foreground">
            Naye Registrations (Pending Approval)
          </h3>
          {localProviders.map((lp, i) => (
            <div
              key={lp.id}
              data-ocid={`admin.item.local.${i + 1}`}
              className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {lp.name || "Name nahi diya"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    📱 {lp.mobile}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    📂 {lp.category}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Plan:{" "}
                    {lp.planType === "pending_premium"
                      ? "⭐ Premium (Payment Pending)"
                      : "🆓 Free (Ads)"}
                  </p>
                  {lp.createdAt && (
                    <p className="text-xs text-muted-foreground">
                      Registered:{" "}
                      {new Date(lp.createdAt).toLocaleDateString("hi-IN")}
                    </p>
                  )}
                </div>
                <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">
                  Pending
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-ocid={`admin.confirm_button.local.${i + 1}`}
                  onClick={() => handleApproveLocal(lp.id)}
                  className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl"
                >
                  <CheckCircle size={15} /> Approve
                </button>
                <button
                  type="button"
                  data-ocid={`admin.delete_button.local.${i + 1}`}
                  onClick={() => handleRejectLocal(lp.id)}
                  className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 text-sm font-semibold px-4 py-2 rounded-xl"
                >
                  <XCircle size={15} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Provider Approvals */}
      <div className="space-y-4">
        {!pending || pending.length === 0 ? (
          <div
            data-ocid="admin.empty_state"
            className="text-center py-16 text-muted-foreground"
          >
            <CheckCircle size={40} className="mx-auto mb-3 text-green-400" />
            <p className="font-medium">Sab approve ho gaye!</p>
            <p className="text-sm">Abhi koi pending approval nahi hai</p>
          </div>
        ) : (
          pending.map((p, i) => (
            <div
              key={p.userId.toString()}
              data-ocid={`admin.item.${i + 1}`}
              className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">
                      {p.shopName || "Shop Name Set Nahi"}
                    </h3>
                    {getPlanLabel(p.planType) === "premium" && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-semibold">
                        Premium ⭐
                      </span>
                    )}
                    {getPlanLabel(p.planType) === "free" && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
                        Free
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{p.category}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ID: {p.userId.toString()}
                  </p>
                </div>
                <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full">
                  Pending
                </span>
              </div>

              {p.paymentScreenshotBlobId && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Payment Screenshot:
                  </p>
                  <img
                    src={p.paymentScreenshotBlobId}
                    alt="Payment Screenshot"
                    className="w-40 h-40 object-contain border border-border rounded-xl"
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <select
                  data-ocid="admin.select"
                  value={approveMap[p.userId.toString()] ?? "oneMonth"}
                  onChange={(e) =>
                    setApproveMap((prev) => ({
                      ...prev,
                      [p.userId.toString()]: e.target.value,
                    }))
                  }
                  className="border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-white"
                >
                  <option value="oneMonth">1 Maah</option>
                  <option value="threeMonths">3 Maah</option>
                  <option value="twelveMonths">12 Maah</option>
                </select>
                <button
                  type="button"
                  data-ocid={`admin.confirm_button.${i + 1}`}
                  onClick={() => handleApprove(p.userId)}
                  disabled={approveM.isPending}
                  className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
                >
                  <CheckCircle size={15} /> Approve Karein
                </button>
                <button
                  type="button"
                  data-ocid={`admin.delete_button.${i + 1}`}
                  onClick={() => handleReject(p.userId)}
                  disabled={rejectM.isPending}
                  className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60 border border-red-200"
                >
                  <XCircle size={15} /> Reject Karein
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---- Homepage Controls Section ----
function HomepageControls() {
  const { data: toggles, isLoading } = useAllToggles();
  const updateToggle = useUpdateToggle();
  const { user } = useAuth();
  const isManager = user?.role === "manager";

  // Category prices from localStorage
  const [prices, setPrices] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem("dz_category_prices") ?? "{}");
    } catch {
      return {};
    }
  });

  const handlePriceChange = (name: string, val: string) => {
    const updated = { ...prices, [name]: val };
    setPrices(updated);
    localStorage.setItem("dz_category_prices", JSON.stringify(updated));
  };

  // Manager: add pending category
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("🏪");

  const handleManagerAddCategory = () => {
    if (!newCatName.trim()) {
      toast.error("Category naam likhein");
      return;
    }
    const cats: { name: string; icon: string; status: string }[] = (() => {
      try {
        return JSON.parse(
          localStorage.getItem("dz_pending_categories") ?? "[]",
        );
      } catch {
        return [];
      }
    })();
    cats.push({ name: newCatName.trim(), icon: newCatIcon, status: "pending" });
    localStorage.setItem("dz_pending_categories", JSON.stringify(cats));
    toast.success(
      `Category "${newCatName}" pending approval mein add ho gayi!`,
    );
    setNewCatName("");
    setNewCatIcon("🏪");
  };

  if (isLoading)
    return (
      <div data-ocid="admin.loading_state" className="flex justify-center py-8">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-6">
      {isManager && (
        <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-3">
          <h3 className="font-semibold text-foreground">
            Naya Category Request Bhejein (Pending)
          </h3>
          <div className="flex gap-2">
            <input
              data-ocid="admin.input"
              type="text"
              value={newCatIcon}
              onChange={(e) => setNewCatIcon(e.target.value)}
              placeholder="Icon"
              className="w-16 border border-border rounded-xl px-3 py-2.5 text-sm text-center outline-none"
            />
            <input
              data-ocid="admin.input"
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Category naam"
              className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              data-ocid="admin.primary_button"
              onClick={handleManagerAddCategory}
              className="bg-primary text-primary-foreground text-sm font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 hover:opacity-90"
            >
              <Plus size={14} /> Add
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Manager ki categories Admin se approve hone ke baad hi live hongi.
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        {!toggles || toggles.length === 0 ? (
          <div
            data-ocid="admin.empty_state"
            className="text-center py-12 text-muted-foreground"
          >
            Koi toggle nahi mila
          </div>
        ) : (
          toggles.map(([name, value], i) => (
            <div
              key={name}
              data-ocid={`admin.item.${i + 1}`}
              className="flex items-center justify-between px-5 py-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1">
                <span className="font-medium text-foreground text-sm">
                  {name}
                </span>
                {!isManager && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      Price: ₹
                    </span>
                    <input
                      data-ocid="admin.input"
                      type="number"
                      value={prices[name] ?? ""}
                      onChange={(e) => handlePriceChange(name, e.target.value)}
                      placeholder="Set price"
                      className="w-24 border border-border rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                )}
              </div>
              <button
                type="button"
                data-ocid={`admin.toggle.${i + 1}`}
                onClick={() =>
                  !isManager && updateToggle.mutate({ name, value: !value })
                }
                disabled={isManager}
                className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  value
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {value ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                {value ? "ON" : "OFF"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---- Ads Banner Manager ----
function BannerManager() {
  const { data: banners, isLoading } = useActiveBanners();
  const { actor } = useActor();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!title || !actor) return;
    setAdding(true);
    try {
      await actor.addBanner(
        title,
        subtitle,
        imageUrl,
        linkUrl,
        BigInt(banners?.length ?? 0),
      );
      toast.success("Banner add ho gaya!");
      setTitle("");
      setSubtitle("");
      setImageUrl("");
      setLinkUrl("");
      qc.invalidateQueries({ queryKey: ["activeBanners"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Add nahi ho saka");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: bigint) => {
    if (!actor) return;
    try {
      await actor.deleteBanner(id);
      toast.success("Banner delete ho gaya");
      qc.invalidateQueries({ queryKey: ["activeBanners"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Delete nahi ho saca");
    }
  };

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-3">
        <h3 className="font-semibold text-foreground">
          Naya Banner Add Karein
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            data-ocid="admin.input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Banner Title"
            className="border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            data-ocid="admin.input"
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Subtitle"
            className="border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            data-ocid="admin.input"
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Image URL"
            className="border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            data-ocid="admin.input"
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Link URL"
            className="border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="button"
          data-ocid="admin.primary_button"
          onClick={handleAdd}
          disabled={!title || adding}
          className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 disabled:opacity-60"
        >
          {adding ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Plus size={14} />
          )}
          Banner Add Karein
        </button>
      </div>

      {/* Banners list */}
      {isLoading ? (
        <div
          data-ocid="admin.loading_state"
          className="flex justify-center py-8"
        >
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : banners && banners.length > 0 ? (
        <div className="space-y-3">
          {banners.map((b, i) => (
            <div
              key={b.id.toString()}
              data-ocid={`admin.item.${i + 1}`}
              className="bg-white rounded-2xl border border-border shadow-card p-4 flex items-center gap-4"
            >
              {b.imageUrl && (
                <img
                  src={b.imageUrl}
                  alt={b.title}
                  className="w-16 h-12 object-cover rounded-lg flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">
                  {b.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {b.subtitle}
                </p>
              </div>
              <button
                type="button"
                data-ocid={`admin.delete_button.${i + 1}`}
                onClick={() => handleDelete(b.id)}
                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg flex-shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div
          data-ocid="admin.empty_state"
          className="text-center py-8 text-muted-foreground"
        >
          Abhi koi banner nahi hai
        </div>
      )}
    </div>
  );
}

// ---- Founder Settings Section ----
function FounderSettingsSection() {
  const { data: appSettings } = useAppSettings();
  const updateAppSettingsMutation = useUpdateAppSettings();

  const [founderName, setFounderName] = useState<string>(() => {
    try {
      return JSON.parse(localStorage.getItem("dz_founder") ?? "{}").name ?? "";
    } catch {
      return "";
    }
  });
  const [founderPhoto, setFounderPhoto] = useState<string>(() => {
    try {
      return JSON.parse(localStorage.getItem("dz_founder") ?? "{}").photo ?? "";
    } catch {
      return "";
    }
  });
  const [appLogoUrl, setAppLogoUrl] = useState<string>(
    () => localStorage.getItem("dz_app_logo") ?? "",
  );
  const [splashLogoUrl, setSplashLogoUrl] = useState<string>(
    () => localStorage.getItem("dz_splash_logo") ?? "",
  );
  const [showSaved, setShowSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const splashLogoInputRef = useRef<HTMLInputElement>(null);

  // Sync from canister when data arrives
  useEffect(() => {
    if (!appSettings) return;
    if (appSettings.founderName !== undefined && appSettings.founderName !== "")
      setFounderName(appSettings.founderName);
    if (
      appSettings.founderPhoto !== undefined &&
      appSettings.founderPhoto !== ""
    )
      setFounderPhoto(appSettings.founderPhoto);
    if (appSettings.appLogoUrl) setAppLogoUrl(appSettings.appLogoUrl);
    if (appSettings.splashLogoUrl) setSplashLogoUrl(appSettings.splashLogoUrl);
  }, [appSettings]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Sirf image file upload karein (JPG/PNG)");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Photo 2MB se chhota hona chahiye");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFounderPhoto(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Sirf image file upload karein");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo 2MB se chhota hona chahiye");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAppLogoUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSplashLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Sirf image file upload karein");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo 2MB se chhota hona chahiye");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSplashLogoUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAppSettingsMutation.mutateAsync({
        founderName,
        founderPhoto,
        appLogoUrl: appLogoUrl || undefined,
        splashLogoUrl: splashLogoUrl || undefined,
      });
      broadcastSettingsChange();
      setShowSaved(true);
      toast.success("Founder settings save ho gayi!");
      setTimeout(() => setShowSaved(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save nahi ho saca";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SaveConfirmation show={showSaved} />

      {/* Founder Info */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
          <Star size={18} className="text-primary" /> Founder Branding
        </h3>
        <p className="text-sm text-muted-foreground">
          Footer mein dikhne wala founder ka naam aur photo yahan set karein.
        </p>
        <div>
          <label
            htmlFor="fs-name"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Founder Ka Naam
          </label>
          <input
            id="fs-name"
            data-ocid="admin.input"
            type="text"
            value={founderName}
            onChange={(e) => setFounderName(e.target.value)}
            placeholder="Aapka naam likhein"
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label
            htmlFor="fs-photo-upload"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Founder Photo
          </label>
          <div className="flex gap-3 items-center">
            {founderPhoto && (
              <img
                src={founderPhoto}
                alt="Founder"
                className="w-14 h-14 rounded-full object-cover border-2 border-primary flex-shrink-0"
              />
            )}
            <div className="flex-1 space-y-2">
              <button
                type="button"
                data-ocid="admin.upload_button"
                onClick={() => photoInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary/40 rounded-xl py-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
              >
                <Image size={16} /> Gallery se Photo Upload Karen
              </button>
              <input
                id="fs-photo-upload"
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <input
                data-ocid="admin.input"
                type="url"
                value={founderPhoto.startsWith("data:") ? "" : founderPhoto}
                onChange={(e) => setFounderPhoto(e.target.value)}
                placeholder="ya URL paste karein..."
                className="w-full border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>
        {(founderName || founderPhoto) && (
          <div className="bg-muted rounded-xl p-4 flex items-center gap-3">
            {founderPhoto && (
              <img
                src={founderPhoto}
                alt="Founder"
                className="w-12 h-12 rounded-full object-cover border-2 border-primary"
              />
            )}
            <div>
              <p className="text-xs text-muted-foreground">Preview</p>
              <p className="font-semibold text-foreground">
                {founderName || "Founder naam"}
              </p>
              <p className="text-xs text-muted-foreground">
                Founder, Digital Zindagi
              </p>
            </div>
          </div>
        )}
      </div>

      {/* App Logo (Header) */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
          <Palette size={18} className="text-primary" /> Header Logo Change
          Karen
        </h3>
        <p className="text-sm text-muted-foreground">
          App ke upar header mein dikhne wala logo yahan se change karein.
        </p>
        <div className="flex gap-3 items-center">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary flex-shrink-0 bg-emerald-900 flex items-center justify-center">
            <img
              src={
                appLogoUrl ||
                "/assets/generated/dz-logo-premium.dim_512x512.png"
              }
              alt="Logo Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/logo.png";
              }}
            />
          </div>
          <div className="flex-1 space-y-2">
            <button
              type="button"
              data-ocid="admin.upload_button"
              onClick={() => logoInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary/40 rounded-xl py-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
            >
              <Image size={16} /> Gallery se Header Logo Upload Karen
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>
        </div>
        {appLogoUrl && (
          <button
            type="button"
            onClick={() => {
              setAppLogoUrl("");
              localStorage.removeItem("dz_app_logo");
            }}
            className="text-xs text-red-500 hover:underline"
          >
            Default logo wapas lagaen
          </button>
        )}
      </div>

      {/* Splash Screen Logo */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
          <Star size={18} className="text-amber-500" /> Splash/Open Screen Logo
          Change Karen
        </h3>
        <p className="text-sm text-muted-foreground">
          App kholne par jo logo dikhta hai woh yahan se change karein.
        </p>
        <div className="flex gap-3 items-center">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400 flex-shrink-0 bg-emerald-900 flex items-center justify-center">
            <img
              src={
                splashLogoUrl ||
                "/assets/generated/dz-logo-premium.dim_512x512.png"
              }
              alt="Splash Logo Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/logo.png";
              }}
            />
          </div>
          <div className="flex-1 space-y-2">
            <button
              type="button"
              data-ocid="admin.upload_button"
              onClick={() => splashLogoInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-amber-400/60 rounded-xl py-3 text-sm font-medium text-amber-600 hover:bg-amber-50 transition-colors"
            >
              <Image size={16} /> Gallery se Splash Logo Upload Karen
            </button>
            <input
              ref={splashLogoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleSplashLogoUpload}
            />
          </div>
        </div>
        {splashLogoUrl && (
          <button
            type="button"
            onClick={() => {
              setSplashLogoUrl("");
              localStorage.removeItem("dz_splash_logo");
            }}
            className="text-xs text-red-500 hover:underline"
          >
            Default logo wapas lagaen
          </button>
        )}
      </div>

      <button
        type="button"
        data-ocid="admin.save_button"
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-60"
      >
        {saving ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <CheckCircle size={16} />
        )}
        Founder Settings Save Karein
      </button>
    </div>
  );
}

// ---- Category Manager Section ----

// Default categories matching CategoryGrid
const DEFAULT_CATEGORIES = [
  { name: "Scrap", hinglish: "Kabadiwala", emoji: "♻️" },
  { name: "Doctor", hinglish: "Online Doctor", emoji: "🏥" },
  { name: "Market", hinglish: "Local Market", emoji: "🛒" },
  { name: "Labor", hinglish: "Expert Labor", emoji: "👷" },
  { name: "Electronics", hinglish: "Electronics", emoji: "📱" },
  { name: "Plumber", hinglish: "Plumber", emoji: "🔧" },
  { name: "Carpenter", hinglish: "Carpenter", emoji: "🪚" },
  { name: "Tutor", hinglish: "Online Tutor", emoji: "📚" },
  { name: "Electrician", hinglish: "Electrician", emoji: "⚡" },
  { name: "Painter", hinglish: "Painter", emoji: "🎨" },
  { name: "Tailor", hinglish: "Darzi", emoji: "✂️" },
  { name: "Salon", hinglish: "Salon", emoji: "💇" },
];

// Emoji picker options for category icon selection
const EMOJI_OPTIONS = [
  "🗑️",
  "🩺",
  "🛒",
  "👷",
  "📱",
  "🔧",
  "🪚",
  "📚",
  "⚡",
  "🎨",
  "✂️",
  "💇",
  "🏪",
  "🚿",
  "🍕",
  "🚗",
  "🏠",
  "🌿",
  "💊",
  "🔌",
  "🪣",
  "🛠️",
  "🌾",
  "🎭",
  "👗",
  "🐄",
  "🌻",
  "🏋️",
  "🧹",
  "🍽️",
  "♻️",
  "🏥",
  "💼",
  "🎓",
  "🏗️",
  "🚜",
  "🧴",
  "🪴",
  "🎯",
  "🛵",
];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        data-ocid="admin.toggle"
        onClick={() => setOpen((p) => !p)}
        className="w-12 h-10 border border-border rounded-xl text-xl flex items-center justify-center hover:bg-accent transition-colors"
        title="Icon chunein"
      >
        {value}
      </button>
      {open && (
        <div className="absolute top-12 left-0 z-50 bg-white border border-border rounded-2xl shadow-xl p-3 w-64">
          <p className="text-xs text-muted-foreground mb-2 font-medium">
            Icon select karein:
          </p>
          <div className="grid grid-cols-8 gap-1">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onChange(emoji);
                  setOpen(false);
                }}
                className={`w-7 h-7 text-base rounded-lg hover:bg-accent flex items-center justify-center transition-colors ${emoji === value ? "bg-primary/20 ring-1 ring-primary" : ""}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryManagerSection() {
  const { data: toggles, isLoading } = useAllToggles();
  const updateToggle = useUpdateToggle();
  const { user } = useAuth();
  const isManager = user?.role === "manager";
  const [showSaved, setShowSaved] = useState(false);
  const [triggerSaveAll, setTriggerSaveAll] = useState(0);

  // Canister hooks
  const { data: canisterCategories } = useCategories();
  const addCategoryMutation = useAddCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();

  // Build merged category list: defaults + user-added (state-driven for edit/remove)
  const buildInitialCategories = () => {
    // Try loading from dz_categories_list first (persisted list with edits/removes)
    try {
      const stored = localStorage.getItem("dz_categories_list");
      if (stored) {
        return JSON.parse(stored) as {
          name: string;
          hinglish: string;
          emoji: string;
        }[];
      }
    } catch {}
    // Fallback: defaults + approved extras
    const extra: { name: string; hinglish: string; emoji: string }[] = (() => {
      try {
        const stored = JSON.parse(
          localStorage.getItem("dz_approved_categories") ?? "[]",
        ) as { name: string; icon: string; status: string }[];
        const defaultNames = new Set(
          DEFAULT_CATEGORIES.map((c) => c.name.toLowerCase()),
        );
        return stored
          .filter((c) => !defaultNames.has(c.name.toLowerCase()))
          .map((c) => ({
            name: c.name,
            hinglish: c.name,
            emoji: c.icon ?? "🏪",
          }));
      } catch {
        return [];
      }
    })();
    return [...DEFAULT_CATEGORIES, ...extra];
  };

  const [categories, setCategories] = useState<
    { name: string; hinglish: string; emoji: string }[]
  >(buildInitialCategories);

  // Sync canister categories into local state when they arrive
  useEffect(() => {
    if (canisterCategories && canisterCategories.length > 0) {
      const mapped = canisterCategories.map((c) => ({
        name: c.name,
        hinglish: c.name,
        emoji: c.emoji,
      }));
      setCategories(mapped);
      persistCategories(mapped);
    }
  }, [canisterCategories]);

  const persistCategories = (
    cats: { name: string; hinglish: string; emoji: string }[],
  ) => {
    localStorage.setItem("dz_categories_list", JSON.stringify(cats));
  };

  const handleRemoveCategory = async (catName: string) => {
    const found = canisterCategories?.find((c) => c.name === catName);
    if (found) {
      try {
        await deleteCategoryMutation.mutateAsync(found.id);
      } catch {
        // fallback: remove from local state
        setCategories((prev) => {
          const updated = prev.filter((c) => c.name !== catName);
          persistCategories(updated);
          return updated;
        });
      }
    } else {
      setCategories((prev) => {
        const updated = prev.filter((c) => c.name !== catName);
        persistCategories(updated);
        return updated;
      });
    }
    broadcastSettingsChange();
    toast.success(`"${catName}" category remove ho gayi!`);
  };

  const handleEditCategory = async (
    oldName: string,
    newName: string,
    newEmoji: string,
  ) => {
    const found = canisterCategories?.find((c) => c.name === oldName);
    if (found) {
      try {
        await updateCategoryMutation.mutateAsync({
          id: found.id,
          name: newName,
          emoji: newEmoji,
          color: found.color,
          enabled: found.enabled,
        });
      } catch {
        setCategories((prev) => {
          const updated = prev.map((c) =>
            c.name === oldName
              ? { ...c, name: newName, hinglish: newName, emoji: newEmoji }
              : c,
          );
          persistCategories(updated);
          return updated;
        });
      }
    } else {
      setCategories((prev) => {
        const updated = prev.map((c) =>
          c.name === oldName
            ? { ...c, name: newName, hinglish: newName, emoji: newEmoji }
            : c,
        );
        persistCategories(updated);
        return updated;
      });
    }
    broadcastSettingsChange();
    toast.success("Category update ho gayi!");
  };

  // Get toggle value for a category (from backend or localStorage)
  const getToggleValue = (name: string): boolean => {
    if (toggles) {
      const found = toggles.find(([k]) => k === name);
      if (found !== undefined) return found[1];
    }
    try {
      const statusMap = JSON.parse(
        localStorage.getItem("dz_category_status") ?? "{}",
      );
      return statusMap[name] ?? true;
    } catch {
      return true;
    }
  };

  const handleSaveAll = () => {
    setTriggerSaveAll((n) => n + 1);
    setShowSaved(true);
    toast.success("Saari categories save ho gayi!");
    setTimeout(() => setShowSaved(false), 3000);
  };

  // New category add (admin)
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("🏪");

  const handleAdminAddCategory = async () => {
    if (!newCatName.trim()) {
      toast.error("Category naam likhein");
      return;
    }
    const name = newCatName.trim();
    // Try canister first, fall back to localStorage
    try {
      await addCategoryMutation.mutateAsync({
        name,
        emoji: newCatIcon,
        color: DEFAULT_EMERALD,
      });
    } catch {
      const cats: { name: string; icon: string; status: string }[] = (() => {
        try {
          return JSON.parse(
            localStorage.getItem("dz_approved_categories") ?? "[]",
          );
        } catch {
          return [];
        }
      })();
      cats.push({ name, icon: newCatIcon, status: "approved" });
      localStorage.setItem("dz_approved_categories", JSON.stringify(cats));
      setCategories((prev) => {
        const newCat = { name, hinglish: name, emoji: newCatIcon };
        const updated = [...prev, newCat];
        persistCategories(updated);
        return updated;
      });
    }
    broadcastSettingsChange();
    setShowSaved(true);
    toast.success(`Category "${name}" add ho gayi!`);
    setTimeout(() => setShowSaved(false), 3000);
    setNewCatName("");
    setNewCatIcon("🏪");
  };

  // Manager: add pending category
  const handleManagerAddCategory = () => {
    if (!newCatName.trim()) {
      toast.error("Category naam likhein");
      return;
    }
    const cats: { name: string; icon: string; status: string }[] = (() => {
      try {
        return JSON.parse(
          localStorage.getItem("dz_pending_categories") ?? "[]",
        );
      } catch {
        return [];
      }
    })();
    cats.push({ name: newCatName.trim(), icon: newCatIcon, status: "pending" });
    localStorage.setItem("dz_pending_categories", JSON.stringify(cats));
    toast.success(
      `Category "${newCatName}" pending approval mein add ho gayi!`,
    );
    setNewCatName("");
    setNewCatIcon("🏪");
  };

  if (isLoading)
    return (
      <div data-ocid="admin.loading_state" className="flex justify-center py-8">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-6">
      <SaveConfirmation show={showSaved} />

      {/* Add Category */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-3">
        <h3 className="font-semibold text-foreground">
          {isManager
            ? "Naya Category Request Bhejein (Pending)"
            : "Naya Category Add Karein"}
        </h3>
        <div className="flex gap-2 items-center">
          <EmojiPicker value={newCatIcon} onChange={setNewCatIcon} />
          <input
            data-ocid="admin.input"
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Category naam"
            className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            data-ocid="admin.primary_button"
            onClick={
              isManager ? handleManagerAddCategory : handleAdminAddCategory
            }
            className="bg-primary text-primary-foreground text-sm font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 hover:opacity-90"
          >
            <Plus size={14} /> Add
          </button>
        </div>
        {isManager && (
          <p className="text-xs text-muted-foreground">
            Manager ki categories Admin se approve hone ke baad hi live hongi.
          </p>
        )}
      </div>

      {/* Category List with Full Subscription Row */}
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">
            Categories — Price (4 Plans), Status &amp; AdMob
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Har category mein 4 plan prices set karein, ON/OFF karein, phir
            "Save" dabayein.
          </p>
        </div>
        {categories.length === 0 ? (
          <div
            data-ocid="admin.empty_state"
            className="text-center py-12 text-muted-foreground"
          >
            Koi category nahi mila
          </div>
        ) : (
          categories.map((cat, i) => (
            <CategoryRow
              key={cat.name}
              index={i}
              name={cat.name}
              emoji={cat.emoji}
              isOn={getToggleValue(cat.name)}
              isManager={isManager}
              triggerSaveAll={triggerSaveAll}
              onSave={(data) => {
                if (!isManager) {
                  updateToggle.mutate({ name: cat.name, value: data.isOn });
                }
                // Persist status map
                const statusMap: Record<string, boolean> = (() => {
                  try {
                    return JSON.parse(
                      localStorage.getItem("dz_category_status") ?? "{}",
                    );
                  } catch {
                    return {};
                  }
                })();
                statusMap[cat.name] = data.isOn;
                localStorage.setItem(
                  "dz_category_status",
                  JSON.stringify(statusMap),
                );
                setShowSaved(true);
                toast.success(`"${cat.name}" save ho gayi!`);
                setTimeout(() => setShowSaved(false), 3000);
              }}
              onToggle={(val) => {
                if (!isManager)
                  updateToggle.mutate({ name: cat.name, value: val });
              }}
              onRemove={() => handleRemoveCategory(cat.name)}
              onEditNameEmoji={(newName, newEmoji) =>
                handleEditCategory(cat.name, newName, newEmoji)
              }
            />
          ))
        )}
      </div>

      {/* Global Save All Button */}
      {!isManager && (
        <div className="pt-2">
          <button
            type="button"
            data-ocid="admin.save_button"
            onClick={handleSaveAll}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2 transition-colors shadow-md"
          >
            <CheckCircle size={20} />
            Save All Changes — Saari Categories Save Karein
          </button>
        </div>
      )}
    </div>
  );
}

interface CategoryRowData {
  m1: string;
  m2: string;
  m6: string;
  m12: string;
  adMob: boolean;
  isOn: boolean;
  adInterval: string; // Ad interval in minutes, default "5"
}

interface CategoryRowProps {
  index: number;
  name: string;
  emoji: string;
  isOn: boolean;
  isManager: boolean;
  triggerSaveAll: number;
  onSave: (data: CategoryRowData) => void;
  onToggle: (val: boolean) => void;
  onRemove?: () => void;
  onEditNameEmoji?: (newName: string, newEmoji: string) => void;
}

function CategoryRow({
  index,
  name,
  emoji,
  isOn,
  isManager,
  triggerSaveAll,
  onSave,
  onToggle,
  onRemove,
  onEditNameEmoji,
}: CategoryRowProps) {
  const storageKey = `dz_cat_row_${name}`;

  const loadStored = (): CategoryRowData => {
    try {
      const d = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
      return {
        m1: d.m1 ?? "",
        m2: d.m2 ?? "",
        m6: d.m6 ?? "",
        m12: d.m12 ?? "",
        adMob: d.adMob ?? false,
        isOn: d.isOn ?? isOn,
        adInterval: d.adInterval ?? "5",
      };
    } catch {
      return {
        m1: "",
        m2: "",
        m6: "",
        m12: "",
        adMob: false,
        isOn,
        adInterval: "5",
      };
    }
  };

  const initial = loadStored();
  const [m1, setM1] = useState(initial.m1);
  const [m2, setM2] = useState(initial.m2);
  const [m6, setM6] = useState(initial.m6);
  const [m12, setM12] = useState(initial.m12);
  const [adMob, setAdMob] = useState(initial.adMob);
  const [localOn, setLocalOn] = useState(initial.isOn);
  const [adInterval, setAdInterval] = useState(initial.adInterval);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editEmoji, setEditEmoji] = useState(emoji);

  const handleSave = () => {
    const data: CategoryRowData = {
      m1,
      m2,
      m6,
      m12,
      adMob,
      isOn: localOn,
      adInterval: adInterval || "5",
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
    onSave(data);
  };

  const handleConfirmEdit = () => {
    if (!editName.trim()) return;
    onEditNameEmoji?.(editName.trim(), editEmoji);
    setEditMode(false);
  };

  const handleCancelEdit = () => {
    setEditName(name);
    setEditEmoji(emoji);
    setEditMode(false);
  };

  const handleRemoveClick = () => {
    if (
      window.confirm(
        `"${name}" category delete karein? Yeh action undo nahi hoga.`,
      )
    ) {
      onRemove?.();
    }
  };

  // Listen to global Save All trigger
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — only re-runs on triggerSaveAll change
  useEffect(() => {
    if (triggerSaveAll > 0) {
      const data: CategoryRowData = {
        m1,
        m2,
        m6,
        m12,
        adMob,
        isOn: localOn,
        adInterval: adInterval || "5",
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
      onSave(data);
    }
  }, [triggerSaveAll]);

  return (
    <div
      data-ocid={`admin.item.${index + 1}`}
      className="border-b border-border last:border-0 px-5 py-4 space-y-3"
    >
      {/* Row Header: Name + Edit/Remove + ON/OFF */}
      <div className="flex items-center justify-between gap-2">
        {editMode ? (
          /* Inline Edit Form */
          <div className="flex items-center gap-2 flex-1">
            <EmojiPicker value={editEmoji} onChange={setEditEmoji} />
            <input
              data-ocid="admin.input"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Category naam"
              className="flex-1 border border-emerald-400 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400 min-w-0"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirmEdit();
                if (e.key === "Escape") handleCancelEdit();
              }}
            />
            <button
              type="button"
              data-ocid="admin.save_button"
              onClick={handleConfirmEdit}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors text-xs font-bold flex-shrink-0"
              title="Confirm"
            >
              ✓
            </button>
            <button
              type="button"
              data-ocid="admin.cancel_button"
              onClick={handleCancelEdit}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors text-xs font-bold flex-shrink-0"
              title="Cancel"
            >
              ✗
            </button>
          </div>
        ) : (
          /* Normal Name Display */
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xl flex-shrink-0">{emoji}</span>
            <span className="font-semibold text-foreground text-sm truncate">
              {name}
            </span>
            {!isManager && (
              <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                <button
                  type="button"
                  data-ocid="admin.edit_button"
                  onClick={() => {
                    setEditName(name);
                    setEditEmoji(emoji);
                    setEditMode(true);
                  }}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-blue-500 hover:bg-blue-50 transition-colors"
                  title="Edit karo"
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  data-ocid="admin.delete_button"
                  onClick={handleRemoveClick}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-red-400 hover:bg-red-50 transition-colors"
                  title="Remove karo"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          data-ocid={`admin.toggle.${index + 1}`}
          onClick={() => {
            const next = !localOn;
            setLocalOn(next);
            onToggle(next);
          }}
          disabled={isManager}
          className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all flex-shrink-0 ${
            localOn
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {localOn ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          {localOn ? "ON" : "OFF"}
        </button>
      </div>

      {/* 4 Price Inputs */}
      {!isManager && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "1 Month", value: m1, set: setM1 },
            { label: "2 Month", value: m2, set: setM2 },
            { label: "6 Month", value: m6, set: setM6 },
            { label: "12 Month", value: m12, set: setM12 },
          ].map(({ label, value, set }) => (
            <div key={label} className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">
                {label} ₹
              </span>
              <input
                data-ocid="admin.input"
                type="number"
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder="Price"
                className="w-full border border-border rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          ))}
        </div>
      )}

      {/* AdMob Toggle + Ad Interval + Save Button */}
      {!isManager && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">
                AdMob Ads:
              </span>
              <button
                type="button"
                data-ocid={`admin.toggle.${index + 1}`}
                onClick={() => setAdMob((v) => !v)}
                className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
                  adMob
                    ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {adMob ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                {adMob ? "ON" : "OFF"}
              </button>
            </div>
            {/* Ad Interval input — only visible when AdMob is ON */}
            {adMob && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                  Ad Interval (Min):
                </span>
                <input
                  data-ocid="admin.input"
                  type="number"
                  min={1}
                  value={adInterval}
                  onChange={(e) => setAdInterval(e.target.value)}
                  placeholder="5"
                  className="w-16 border border-border rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring text-center"
                />
              </div>
            )}
          </div>
          <button
            type="button"
            data-ocid="admin.save_button"
            onClick={handleSave}
            className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors flex-shrink-0"
          >
            <CheckCircle size={13} />
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Settings Section ----
function AdminSettings() {
  const { data: config, isLoading } = useAdminConfig();
  const { data: toggles } = useAllToggles();
  const updateToggle = useUpdateToggle();
  const { actor } = useActor();
  const [adminName, setAdminName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [upiId, setUpiId] = useState("");
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Theme color state
  const [themeColor, setThemeColor] = useState<string>(
    () => localStorage.getItem("dz_theme_color") ?? DEFAULT_EMERALD,
  );

  // PIN Change State
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinSaving, setPinSaving] = useState(false);

  // Security Settings — Email, Password, Mobile
  const [adminEmail, setAdminEmail] = useState(
    () => localStorage.getItem("dz_admin_email") ?? "sushhilkumar651@gmail.com",
  );
  const [emailSaving, setEmailSaving] = useState(false);
  const [currentAdminPassword, setCurrentAdminPassword] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [confirmAdminPassword, setConfirmAdminPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [adminMobileProfile, setAdminMobileProfile] = useState(
    () => localStorage.getItem("dz_admin_mobile") ?? "",
  );
  const [mobileSaving, setMobileSaving] = useState(false);

  // Social Links State
  const [socialLinks, setSocialLinks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("dz_social_links") ?? "{}") as {
        instagram?: string;
        facebook?: string;
        telegram?: string;
      };
    } catch {
      return { instagram: "", facebook: "", telegram: "" };
    }
  });
  const [socialSaving, setSocialSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // Admin QR toggle
  const [showRegQr, setShowRegQr] = useState<boolean>(() => {
    const val = localStorage.getItem("dz_show_registration_qr");
    return val === null ? true : val === "true";
  });

  const toggleMap = Object.fromEntries(toggles ?? []);
  const mobileVisible = toggleMap.contactMobileVisible ?? true;
  const emailVisible = toggleMap.contactEmailVisible ?? true;

  const handleSave = async () => {
    if (!actor) return;
    setSaving(true);
    try {
      let qrBlob = config?.qrCodeBlobId ?? ExternalBlob.fromURL("");
      if (qrFile) {
        const bytes = new Uint8Array(await qrFile.arrayBuffer());
        qrBlob = ExternalBlob.fromBytes(bytes);
      }
      await actor.updateAdminConfig({
        adminName: adminName || config?.adminName || "",
        mobile: mobile || config?.mobile || "",
        email: email || config?.email || "",
        upiId: upiId || config?.upiId || "",
        qrCodeBlobId: qrBlob,
      });
      toast.success("Settings save ho gayi!");
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    } catch (err: any) {
      toast.error(err?.message ?? "Save nahi ho saka");
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (color: string) => {
    setThemeColor(color);
    localStorage.setItem("dz_theme_color", color);
    document.documentElement.style.setProperty("--color-primary", color);
    document.documentElement.style.setProperty("--dz-accent", color);
  };

  const handleThemeReset = () => {
    setThemeColor(DEFAULT_EMERALD);
    localStorage.removeItem("dz_theme_color");
    document.documentElement.style.removeProperty("--color-primary");
    document.documentElement.style.removeProperty("--dz-accent");
    toast.success("Theme reset ho gaya!");
  };

  const handlePinChange = async () => {
    if (!currentPin || !newPin || !confirmPin) {
      toast.error("Sab PIN fields bharen");
      return;
    }
    if (newPin.length !== 5 || !/^\d{5}$/.test(newPin)) {
      toast.error("Naya PIN exactly 5 digits hona chahiye");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("Naya PIN aur Confirm PIN match nahi kar rahe");
      return;
    }
    setPinSaving(true);
    try {
      const currentHash = await hashPassword(currentPin);
      const storedHash = localStorage.getItem("dz_admin_pin");
      if (storedHash && currentHash !== storedHash) {
        toast.error("Current PIN galat hai");
        return;
      }
      const newHash = await hashPassword(newPin);
      localStorage.setItem("dz_admin_pin", newHash);
      toast.success("PIN successfully change ho gaya!");
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (err: any) {
      toast.error(err?.message ?? "PIN change nahi ho saka");
    } finally {
      setPinSaving(false);
    }
  };

  const handleSocialSave = () => {
    setSocialSaving(true);
    localStorage.setItem("dz_social_links", JSON.stringify(socialLinks));
    setTimeout(() => {
      setSocialSaving(false);
      toast.success("Social links save ho gayi!");
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    }, 300);
  };

  const handleRegQrToggle = () => {
    const newVal = !showRegQr;
    setShowRegQr(newVal);
    localStorage.setItem("dz_show_registration_qr", String(newVal));
    toast.success(
      newVal ? "Registration QR ON kar diya" : "Registration QR OFF kar diya",
    );
  };

  if (isLoading)
    return (
      <div data-ocid="admin.loading_state" className="flex justify-center py-8">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-6">
      <SaveConfirmation show={showSaved} />
      {/* Main Settings Card */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
        <h3 className="font-heading font-semibold text-foreground">
          Admin Info &amp; UPI Settings
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="as-adminname"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Admin Naam
            </label>
            <input
              id="as-adminname"
              data-ocid="admin.input"
              type="text"
              value={adminName || config?.adminName || ""}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Admin naam"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label
              htmlFor="as-mobile"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Mobile
            </label>
            <input
              id="as-mobile"
              data-ocid="admin.input"
              type="tel"
              value={mobile || config?.mobile || ""}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="Mobile number"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label
              htmlFor="as-email"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Email
            </label>
            <input
              id="as-email"
              data-ocid="admin.input"
              type="email"
              value={email || config?.email || ""}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label
              htmlFor="as-upiid"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              UPI ID
            </label>
            <input
              id="as-upiid"
              data-ocid="admin.input"
              type="text"
              value={upiId || config?.upiId || ""}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="UPI ID (e.g. admin@upi)"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div>
          <p className="block text-sm font-medium text-foreground mb-1.5">
            QR Code Image
          </p>
          <label
            data-ocid="admin.upload_button"
            className="flex items-center gap-2 border-2 border-dashed border-border rounded-xl p-4 cursor-pointer hover:border-primary/50 transition-all"
          >
            <span className="text-sm text-muted-foreground">
              {qrFile ? qrFile.name : "QR code image upload karein"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setQrFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <button
          type="button"
          data-ocid="admin.save_button"
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-xl hover:opacity-90 flex items-center gap-2 disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : null}
          Settings Save Karein
        </button>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-6">
        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
          <Shield size={18} className="text-primary" />
          Security Settings
        </h3>

        {/* a) Edit Email */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            ✉️ Email Badlein
          </h4>
          <div>
            <label
              htmlFor="sec-admin-email"
              className="block text-xs font-medium text-muted-foreground mb-1"
            >
              Admin Email Address
            </label>
            <input
              id="sec-admin-email"
              data-ocid="admin.input"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="Admin email"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Naya email login mein use hoga
            </p>
          </div>
          <button
            type="button"
            data-ocid="admin.save_button"
            disabled={emailSaving}
            onClick={() => {
              setEmailSaving(true);
              setTimeout(() => {
                localStorage.setItem("dz_admin_email", adminEmail);
                toast.success("Email save ho gaya!");
                setEmailSaving(false);
              }, 300);
            }}
            className="bg-primary text-primary-foreground font-bold px-5 py-2.5 rounded-xl hover:opacity-90 flex items-center gap-2 text-sm disabled:opacity-60"
          >
            {emailSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : null}
            Email Save Karein
          </button>
        </div>

        <div className="border-t border-border pt-6 space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            🔒 Password Badlein
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="sec-cur-pwd"
                className="block text-xs font-medium text-muted-foreground mb-1"
              >
                Current Password
              </label>
              <input
                id="sec-cur-pwd"
                data-ocid="admin.input"
                type="password"
                value={currentAdminPassword}
                onChange={(e) => setCurrentAdminPassword(e.target.value)}
                placeholder="Current password"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label
                htmlFor="sec-new-pwd"
                className="block text-xs font-medium text-muted-foreground mb-1"
              >
                Naya Password
              </label>
              <input
                id="sec-new-pwd"
                data-ocid="admin.input"
                type="password"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                placeholder="Naya password"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label
                htmlFor="sec-conf-pwd"
                className="block text-xs font-medium text-muted-foreground mb-1"
              >
                Confirm Password
              </label>
              <input
                id="sec-conf-pwd"
                data-ocid="admin.input"
                type="password"
                value={confirmAdminPassword}
                onChange={(e) => setConfirmAdminPassword(e.target.value)}
                placeholder="Dobara daalein"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <button
            type="button"
            data-ocid="admin.save_button"
            disabled={passwordSaving}
            onClick={async () => {
              if (
                !currentAdminPassword ||
                !newAdminPassword ||
                !confirmAdminPassword
              ) {
                toast.error("Sab password fields bharen");
                return;
              }
              const storedPwd =
                localStorage.getItem("dz_admin_password") ?? "Admin@2024";
              if (currentAdminPassword !== storedPwd) {
                toast.error("Current password galat hai");
                return;
              }
              if (newAdminPassword !== confirmAdminPassword) {
                toast.error("Naya password aur confirm match nahi kar rahe");
                return;
              }
              if (newAdminPassword.length < 6) {
                toast.error("Password kam se kam 6 characters ka hona chahiye");
                return;
              }
              setPasswordSaving(true);
              setTimeout(() => {
                localStorage.setItem("dz_admin_password", newAdminPassword);
                toast.success("Password change ho gaya!");
                setCurrentAdminPassword("");
                setNewAdminPassword("");
                setConfirmAdminPassword("");
                setPasswordSaving(false);
              }, 300);
            }}
            className="bg-primary text-primary-foreground font-bold px-5 py-2.5 rounded-xl hover:opacity-90 flex items-center gap-2 text-sm disabled:opacity-60"
          >
            {passwordSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : null}
            Password Save Karein
          </button>
        </div>

        {/* c) Edit Secret PIN (5-digit) */}
        <div className="border-t border-border pt-6 space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            🔑 Secret PIN Badlein (5 Digits)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="cur-pin"
                className="block text-xs font-medium text-muted-foreground mb-1"
              >
                Current PIN
              </label>
              <input
                id="cur-pin"
                data-ocid="admin.input"
                type="password"
                inputMode="numeric"
                maxLength={5}
                value={currentPin}
                onChange={(e) =>
                  setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 5))
                }
                placeholder="12345"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label
                htmlFor="new-pin"
                className="block text-xs font-medium text-muted-foreground mb-1"
              >
                Naya PIN
              </label>
              <input
                id="new-pin"
                data-ocid="admin.input"
                type="password"
                inputMode="numeric"
                maxLength={5}
                value={newPin}
                onChange={(e) =>
                  setNewPin(e.target.value.replace(/\D/g, "").slice(0, 5))
                }
                placeholder="5 digits"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label
                htmlFor="confirm-pin"
                className="block text-xs font-medium text-muted-foreground mb-1"
              >
                Confirm PIN
              </label>
              <input
                id="confirm-pin"
                data-ocid="admin.input"
                type="password"
                inputMode="numeric"
                maxLength={5}
                value={confirmPin}
                onChange={(e) =>
                  setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 5))
                }
                placeholder="Dobara daalein"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <button
            type="button"
            data-ocid="admin.save_button"
            onClick={handlePinChange}
            disabled={pinSaving}
            className="bg-primary text-primary-foreground font-bold px-5 py-2.5 rounded-xl hover:opacity-90 flex items-center gap-2 text-sm disabled:opacity-60"
          >
            {pinSaving ? <Loader2 size={14} className="animate-spin" /> : null}
            PIN Change Karein
          </button>
        </div>

        {/* d) Add/Edit Mobile */}
        <div className="border-t border-border pt-6 space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            📱 Mobile Number Jodein / Badlein
          </h4>
          <div>
            <label
              htmlFor="sec-admin-mobile"
              className="block text-xs font-medium text-muted-foreground mb-1"
            >
              Admin Mobile Number
            </label>
            <input
              id="sec-admin-mobile"
              data-ocid="admin.input"
              type="tel"
              value={adminMobileProfile}
              onChange={(e) => setAdminMobileProfile(e.target.value)}
              placeholder="Apna mobile number daalein"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Yeh aapka personal contact number hai
            </p>
          </div>
          <button
            type="button"
            data-ocid="admin.save_button"
            disabled={mobileSaving}
            onClick={() => {
              setMobileSaving(true);
              setTimeout(() => {
                localStorage.setItem("dz_admin_mobile", adminMobileProfile);
                toast.success("Mobile number save ho gaya!");
                setMobileSaving(false);
              }, 300);
            }}
            className="bg-primary text-primary-foreground font-bold px-5 py-2.5 rounded-xl hover:opacity-90 flex items-center gap-2 text-sm disabled:opacity-60"
          >
            {mobileSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : null}
            Mobile Save Karein
          </button>
        </div>
      </div>

      {/* Social Links */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
        <h3 className="font-heading font-semibold text-foreground">
          Social Links
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Instagram size={18} className="text-pink-500 flex-shrink-0" />
            <input
              data-ocid="admin.input"
              type="url"
              value={socialLinks.instagram ?? ""}
              onChange={(e) =>
                setSocialLinks((prev) => ({
                  ...prev,
                  instagram: e.target.value,
                }))
              }
              placeholder="Instagram URL"
              className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-3">
            <Facebook size={18} className="text-blue-600 flex-shrink-0" />
            <input
              data-ocid="admin.input"
              type="url"
              value={socialLinks.facebook ?? ""}
              onChange={(e) =>
                setSocialLinks((prev) => ({
                  ...prev,
                  facebook: e.target.value,
                }))
              }
              placeholder="Facebook URL"
              className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-3">
            <Send size={18} className="text-sky-500 flex-shrink-0" />
            <input
              data-ocid="admin.input"
              type="url"
              value={socialLinks.telegram ?? ""}
              onChange={(e) =>
                setSocialLinks((prev) => ({
                  ...prev,
                  telegram: e.target.value,
                }))
              }
              placeholder="Telegram URL"
              className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <button
          type="button"
          data-ocid="admin.save_button"
          onClick={handleSocialSave}
          disabled={socialSaving}
          className="bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-xl hover:opacity-90 flex items-center gap-2 disabled:opacity-60"
        >
          {socialSaving ? <Loader2 size={15} className="animate-spin" /> : null}
          Social Links Save Karein
        </button>
      </div>

      {/* Admin QR Toggle on Registration */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6">
        <h3 className="font-heading font-semibold text-foreground mb-3">
          Registration QR Code
        </h3>
        <div className="flex items-center justify-between py-3 px-4 bg-muted/40 rounded-xl">
          <div>
            <p className="text-sm font-medium text-foreground">
              Registration pe QR Code Dikhao
            </p>
            <p className="text-xs text-muted-foreground">
              Provider registration form mein Admin QR code dikhana ON/OFF
              karein
            </p>
          </div>
          <button
            type="button"
            data-ocid="admin.toggle"
            onClick={handleRegQrToggle}
            className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all ${
              showRegQr
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {showRegQr ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            {showRegQr ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* Contact Visibility Toggles */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-3">
        <h3 className="font-heading font-semibold text-foreground">
          Contact Visibility
        </h3>
        <div className="flex items-center justify-between py-3 px-4 bg-muted/40 rounded-xl">
          <div>
            <p className="text-sm font-medium text-foreground">
              Mobile Visible
            </p>
            <p className="text-xs text-muted-foreground">
              Contact mobile number dikhao
            </p>
          </div>
          <button
            type="button"
            data-ocid="admin.toggle"
            onClick={() =>
              updateToggle.mutate({
                name: "contactMobileVisible",
                value: !mobileVisible,
              })
            }
            className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all ${
              mobileVisible
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {mobileVisible ? (
              <ToggleRight size={18} />
            ) : (
              <ToggleLeft size={18} />
            )}
            {mobileVisible ? "ON" : "OFF"}
          </button>
        </div>
        <div className="flex items-center justify-between py-3 px-4 bg-muted/40 rounded-xl">
          <div>
            <p className="text-sm font-medium text-foreground">Email Visible</p>
            <p className="text-xs text-muted-foreground">
              Contact email section dikhao
            </p>
          </div>
          <button
            type="button"
            data-ocid="admin.toggle"
            onClick={() =>
              updateToggle.mutate({
                name: "contactEmailVisible",
                value: !emailVisible,
              })
            }
            className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all ${
              emailVisible
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {emailVisible ? (
              <ToggleRight size={18} />
            ) : (
              <ToggleLeft size={18} />
            )}
            {emailVisible ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* Theme Color Picker */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
          <Palette size={18} className="text-primary" />
          Theme Color
        </h3>
        <p className="text-xs text-muted-foreground">
          App ka primary color change karein.
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <label
              htmlFor="theme-color-picker"
              className="text-sm font-medium text-foreground"
            >
              Primary Theme Color:
            </label>
            <input
              id="theme-color-picker"
              data-ocid="admin.input"
              type="color"
              value={themeColor}
              onChange={(e) => handleThemeChange(e.target.value)}
              className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5"
            />
            <span className="text-sm text-muted-foreground font-mono">
              {themeColor}
            </span>
          </div>
          <button
            type="button"
            data-ocid="admin.secondary_button"
            onClick={handleThemeReset}
            className="text-sm text-muted-foreground hover:text-foreground border border-border rounded-xl px-4 py-2 hover:bg-muted transition-colors"
          >
            Reset to Default
          </button>
        </div>
        <div
          className="h-8 rounded-lg"
          style={{ backgroundColor: themeColor }}
        />
      </div>
    </div>
  );
}

// ---- Subscription Pricing Section ----
function SubscriptionPricingSection() {
  const { data: pricing, isLoading } = useSubscriptionPricing();
  const { actor } = useActor();
  const [oneMonth, setOneMonth] = useState("");
  const [threeMonths, setThreeMonths] = useState("");
  const [twelveMonths, setTwelveMonths] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!actor) return;
    setSaving(true);
    try {
      await actor.updateSubscriptionPricing({
        oneMonthPrice:
          Number.parseInt(oneMonth) ||
          Number.parseInt((pricing?.oneMonthPrice ?? 199).toString()) ||
          199,
        threeMonthPrice:
          Number.parseInt(threeMonths) ||
          Number.parseInt((pricing?.threeMonthPrice ?? 499).toString()) ||
          499,
        twelveMonthPrice:
          Number.parseInt(twelveMonths) ||
          Number.parseInt((pricing?.twelveMonthPrice ?? 1499).toString()) ||
          1499,
      });
      toast.success("Pricing update ho gayi!");
    } catch (err: any) {
      toast.error(err?.message ?? "Update nahi ho saca");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading)
    return (
      <div data-ocid="admin.loading_state" className="flex justify-center py-8">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
      <h3 className="font-heading font-semibold text-foreground mb-2">
        Subscription Plans Ki Prices (INR)
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "1 Maah",
            val: oneMonth,
            set: setOneMonth,
            cur: pricing?.oneMonthPrice,
          },
          {
            label: "3 Maah",
            val: threeMonths,
            set: setThreeMonths,
            cur: pricing?.threeMonthPrice,
          },
          {
            label: "12 Maah",
            val: twelveMonths,
            set: setTwelveMonths,
            cur: pricing?.twelveMonthPrice,
          },
        ].map((item) => (
          <div key={item.label}>
            <label
              htmlFor={`sp-${item.label}`}
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              {item.label}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                ₹
              </span>
              <input
                id={`sp-${item.label}`}
                data-ocid="admin.input"
                type="number"
                value={item.val || item.cur?.toString() || ""}
                onChange={(e) => item.set(e.target.value)}
                placeholder={item.cur?.toString() ?? "0"}
                className="w-full border border-border rounded-xl pl-7 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        data-ocid="admin.save_button"
        onClick={handleSave}
        disabled={saving}
        className="bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-xl hover:opacity-90 flex items-center gap-2 disabled:opacity-60"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : null}
        Pricing Save Karein
      </button>
    </div>
  );
}

// ---- Staff Management Section ----
interface Manager {
  id: string;
  name: string;
  mobile: string;
  password: string;
  createdAt: string;
}

function StaffManagement() {
  const [managers, setManagers] = useState<Manager[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("dz_managers") ?? "[]");
    } catch {
      return [];
    }
  });
  const [name, setName] = useState("");
  const [mgMobile, setMgMobile] = useState("");
  const [password, setPassword] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || !mgMobile.trim() || !password.trim()) {
      toast.error("Sab fields bharna zaroori hai");
      return;
    }
    setAdding(true);
    try {
      const hash = await hashPassword(password);
      const newManager: Manager = {
        id: `mgr-${Date.now()}`,
        name: name.trim(),
        mobile: mgMobile.trim(),
        password: hash,
        createdAt: new Date().toISOString(),
      };
      const updated = [...managers, newManager];
      localStorage.setItem("dz_managers", JSON.stringify(updated));
      setManagers(updated);
      toast.success(`Manager ${name} add ho gaya!`);
      setName("");
      setMgMobile("");
      setPassword("");
    } catch (err: any) {
      toast.error(err?.message ?? "Add nahi ho saka");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (id: string) => {
    const updated = managers.filter((m) => m.id !== id);
    localStorage.setItem("dz_managers", JSON.stringify(updated));
    setManagers(updated);
    toast.success("Manager remove ho gaya");
  };

  return (
    <div className="space-y-6">
      {/* Add Manager Form */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
          <UserCog size={18} className="text-primary" />
          Naya Manager Add Karein
        </h3>
        <p className="text-xs text-muted-foreground">
          Manager sirf Approvals aur Chat dekh sakta hai. Categories add kar
          sakta hai lekin Admin approve karta hai.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            data-ocid="admin.input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Manager ka naam"
            className="border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            data-ocid="admin.input"
            type="tel"
            value={mgMobile}
            onChange={(e) => setMgMobile(e.target.value)}
            placeholder="Mobile number"
            className="border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            data-ocid="admin.input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="button"
          data-ocid="admin.primary_button"
          onClick={handleAdd}
          disabled={adding}
          className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-60"
        >
          {adding ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Plus size={14} />
          )}
          Manager Add Karein
        </button>
      </div>

      {/* Managers List */}
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">
            Sab Managers ({managers.length})
          </h3>
        </div>
        {managers.length === 0 ? (
          <div
            data-ocid="admin.empty_state"
            className="text-center py-12 text-muted-foreground"
          >
            <UserCog size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Koi manager nahi hai</p>
            <p className="text-sm">Upar form se manager add karein</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {managers.map((m, i) => (
              <div
                key={m.id}
                data-ocid={`admin.item.${i + 1}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-primary font-bold text-sm">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      {m.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.mobile}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                    Manager
                  </span>
                  <button
                    type="button"
                    data-ocid={`admin.delete_button.${i + 1}`}
                    onClick={() => handleDelete(m.id)}
                    className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Chat Section (Manager Only placeholder) ----
function ChatSection() {
  return (
    <div
      data-ocid="admin.card"
      className="bg-white rounded-2xl border border-border shadow-card p-10 text-center"
    >
      <MessageCircle
        size={48}
        className="mx-auto mb-4 text-primary opacity-60"
      />
      <h3 className="font-heading font-bold text-xl text-foreground mb-2">
        Chat Support
      </h3>
      <p className="text-muted-foreground">
        Real-time chat feature jald aa raha hai!
      </p>
    </div>
  );
}

// ---- Ads Manager Section ----
function AdsManager() {
  const [config, setConfig] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("dz_admob_config") ?? "{}");
    } catch {
      return {};
    }
  });
  const [customAds, setCustomAds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("dz_custom_internal_ads") ?? "[]");
    } catch {
      return [];
    }
  });
  const [adPlacements, setAdPlacements] = useState<{
    header: boolean;
    middle: boolean;
    footer: boolean;
  }>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("dz_ad_placements") ??
          '{"header":false,"middle":true,"footer":false}',
      );
    } catch {
      return { header: false, middle: true, footer: false };
    }
  });
  const [newAdUrl, setNewAdUrl] = useState("");

  const save = (key: string, val: string | boolean) => {
    const updated = { ...config, [key]: val };
    setConfig(updated);
    localStorage.setItem("dz_admob_config", JSON.stringify(updated));
    broadcastSettingsChange();
  };

  const savePlacements = (updated: {
    header: boolean;
    middle: boolean;
    footer: boolean;
  }) => {
    setAdPlacements(updated);
    localStorage.setItem("dz_ad_placements", JSON.stringify(updated));
    broadcastSettingsChange();
  };

  const saveCustomAds = (ads: string[]) => {
    setCustomAds(ads);
    localStorage.setItem("dz_custom_internal_ads", JSON.stringify(ads));
    broadcastSettingsChange();
  };

  const addCustomAd = () => {
    if (!newAdUrl.trim()) return;
    saveCustomAds([...customAds, newAdUrl.trim()]);
    setNewAdUrl("");
  };

  const removeCustomAd = (i: number) => {
    saveCustomAds(customAds.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-5">
      {/* MASTER ON/OFF SWITCH */}
      <div
        className={`bg-white rounded-2xl border-2 shadow-card p-5 ${config.masterEnabled === false ? "border-red-300" : "border-emerald-400"}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-foreground text-base">
              🔴 AdMob Master Switch
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ek click mein saari ads ON ya OFF karein
            </p>
          </div>
          <button
            type="button"
            data-ocid="admin.toggle_button"
            onClick={() =>
              save("masterEnabled", config.masterEnabled === false)
            }
            className={`relative w-14 h-7 rounded-full transition-colors ${config.masterEnabled !== false ? "bg-emerald-500" : "bg-red-400"}`}
          >
            <span
              className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.masterEnabled !== false ? "translate-x-8" : "translate-x-1"}`}
            />
          </button>
        </div>
        <p
          className={`text-xs font-semibold mt-2 ${config.masterEnabled !== false ? "text-emerald-600" : "text-red-500"}`}
        >
          {config.masterEnabled !== false
            ? "✅ Ads ACTIVE hain"
            : "⛔ Saari Ads BAND hain"}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
        <h3 className="font-heading font-semibold text-foreground">
          AdMob Configuration
        </h3>
        <p className="text-sm text-muted-foreground">
          Apni AdMob IDs yahan daalo. Ads app mein automatically show honge.
        </p>
        {[
          {
            key: "appId",
            label: "AdMob App ID",
            placeholder: "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX",
          },
          {
            key: "bannerId",
            label: "Banner Ad Unit ID",
            placeholder: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX",
          },
          {
            key: "interstitialId",
            label: "Interstitial Ad Unit ID (Video ke aage/peeche)",
            placeholder: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX",
          },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label
              htmlFor={`admob-${key}`}
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              {label}
            </label>
            <input
              id={`admob-${key}`}
              data-ocid="admin.input"
              type="text"
              value={config[key] ?? ""}
              onChange={(e) => save(key, e.target.value)}
              placeholder={placeholder}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring font-mono"
            />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
        <h3 className="font-heading font-semibold text-foreground">
          Ads Control
        </h3>
        {[
          {
            key: "bannerEnabled",
            label: "Banner Ads",
            desc: "Homepage aur pages par banner ads dikhaao",
          },
          {
            key: "interstitialEnabled",
            label: "Interstitial Ads (Video se pehle/baad)",
            desc: "Video play karne se pehle aur khatam hone ke baad full-screen ad",
          },
        ].map(({ key, label, desc }) => (
          <div
            key={key}
            className="flex items-center justify-between py-3 border-b border-border last:border-0"
          >
            <div>
              <p className="font-medium text-foreground text-sm">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <button
              type="button"
              data-ocid="admin.toggle_button"
              onClick={() => save(key, !config[key])}
              className={`relative w-12 h-6 rounded-full transition-colors ${config[key] ? "bg-primary" : "bg-gray-300"}`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${config[key] ? "translate-x-7" : "translate-x-1"}`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Custom Internal Ads (AdBlock Bypass) */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
        <div>
          <h3 className="font-heading font-semibold text-foreground">
            🛡️ Custom Internal Ads (AdBlock Bypass)
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Agar user ka AdBlocker AdMob ko block kare, tab yeh apni custom
            banner images dikhao. Revenue kabhi band nahi hogi.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="url"
            value={newAdUrl}
            onChange={(e) => setNewAdUrl(e.target.value)}
            placeholder="Banner image URL (https://...)"
            className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={addCustomAd}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90"
          >
            Add
          </button>
        </div>
        {customAds.length > 0 ? (
          <div className="space-y-2">
            {customAds.map((url, i) => (
              <div
                key={url}
                className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"
              >
                <img
                  src={url}
                  alt="ad"
                  className="w-12 h-8 object-cover rounded"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
                  }}
                />
                <span className="flex-1 text-xs text-muted-foreground truncate">
                  {url}
                </span>
                <button
                  type="button"
                  onClick={() => removeCustomAd(i)}
                  className="text-red-400 hover:text-red-600 text-xs px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Abhi koi custom ad nahi hai. Upar URL add karein — yeh tab dikhengi
            jab AdMob block ho.
          </p>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <p className="text-sm font-medium text-amber-800">
          AdMob Integration Note
        </p>
        <p className="text-xs text-amber-700 mt-1">
          AdMob IDs save ho gayi hain. Real ads ke liye Google AdMob account se
          actual ad units create karein aur IDs yahan daalo. Ads status app mein
          reflect hoga.
        </p>
      </div>

      {/* Ad Placement Controls */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
        <h3 className="font-heading font-semibold text-foreground">
          📍 Ad Placement — Kahan Dikhein Ads
        </h3>
        <p className="text-xs text-muted-foreground">
          Custom internal ads / banners Homepage par kahan dikhenge — choose
          karein.
        </p>
        {(["header", "middle", "footer"] as const).map((pos) => {
          const labels = {
            header: "Header (Top) — Notification bar ke neeche",
            middle: "Middle (Content) — Category aur Provider ke beech",
            footer: "Footer (Bottom) — Page ke bilkul end mein",
          };
          return (
            <div
              key={pos}
              className="flex items-center justify-between py-3 border-b border-border last:border-0"
            >
              <div>
                <p className="font-medium text-foreground text-sm">
                  {labels[pos]}
                </p>
              </div>
              <button
                type="button"
                data-ocid="admin.toggle_button"
                onClick={() =>
                  savePlacements({ ...adPlacements, [pos]: !adPlacements[pos] })
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${adPlacements[pos] ? "bg-primary" : "bg-gray-300"}`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${adPlacements[pos] ? "translate-x-7" : "translate-x-1"}`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Social Media Section ----
function SocialMediaSection() {
  const updateAppSettingsMutation = useUpdateAppSettings();
  const [settings, setSettings] = useState<Record<string, unknown>>(() => {
    try {
      return JSON.parse(localStorage.getItem("dz_social_settings") ?? "{}");
    } catch {
      return {};
    }
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newPlatformName, setNewPlatformName] = useState("");
  const [newPlatformEmoji, setNewPlatformEmoji] = useState("🔗");

  const DEFAULT_PLATFORMS = [
    { key: "facebook", label: "Facebook", icon: "📘" },
    { key: "instagram", label: "Instagram", icon: "📸" },
    { key: "whatsapp", label: "WhatsApp", icon: "💬" },
    { key: "youtube", label: "YouTube", icon: "▶️" },
  ];

  const customPlatforms: { key: string; label: string; icon: string }[] =
    (settings._customPlatforms as {
      key: string;
      label: string;
      icon: string;
    }[]) ?? [];

  const allPlatforms = [...DEFAULT_PLATFORMS, ...customPlatforms];

  const handleToggle = (key: string) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleUrl = (key: string, val: string) => {
    setSettings((prev) => ({ ...prev, [`${key}Url`]: val }));
  };

  const handleAddCustom = () => {
    if (!newPlatformName.trim()) {
      toast.error("Platform ka naam likhein");
      return;
    }
    const key = `custom_${Date.now()}`;
    const newPlatform = {
      key,
      label: newPlatformName.trim(),
      icon: newPlatformEmoji,
    };
    const updated = [...customPlatforms, newPlatform];
    setSettings((prev) => ({ ...prev, _customPlatforms: updated }));
    setNewPlatformName("");
    setNewPlatformEmoji("🔗");
    toast.success(`${newPlatformName} add ho gaya!`);
  };

  const handleRemoveCustom = (key: string) => {
    const updated = customPlatforms.filter((p) => p.key !== key);
    setSettings((prev) => {
      const next = { ...prev, _customPlatforms: updated };
      delete next[key];
      delete next[`${key}Url`];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAppSettingsMutation.mutateAsync({ socialSettings: settings });
      broadcastSettingsChange();
      setSaved(true);
      toast.success("Social Media settings save ho gayi!");
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save nahi ho saca";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
        <h3 className="font-heading font-semibold text-foreground">
          Social Media Links ON/OFF
        </h3>
        <p className="text-sm text-muted-foreground">
          Jab aap kisi platform ko ON karenge, woh icon homepage par dikhega.
        </p>
        {allPlatforms.map((p) => (
          <div
            key={p.key}
            className="border border-border rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <span>{p.icon}</span> {p.label}
                {customPlatforms.some((c) => c.key === p.key) && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCustom(p.key)}
                    className="ml-2 text-red-400 hover:text-red-600 text-xs"
                  >
                    ✕ हटाएं
                  </button>
                )}
              </div>
              <button
                type="button"
                data-ocid="admin.toggle"
                onClick={() => handleToggle(p.key)}
                className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all ${settings[p.key] ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
              >
                {settings[p.key] ? (
                  <ToggleRight size={18} />
                ) : (
                  <ToggleLeft size={18} />
                )}
                {settings[p.key] ? "ON" : "OFF"}
              </button>
            </div>
            {!!settings[p.key] && (
              <input
                data-ocid="admin.input"
                type="url"
                placeholder={`${p.label} profile URL (optional)`}
                value={(settings[`${p.key}Url`] as string) ?? ""}
                onChange={(e) => handleUrl(p.key, e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            )}
          </div>
        ))}

        {/* Add New Platform */}
        <div className="border-2 border-dashed border-primary/30 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">
            + Naya Platform Add Karen
          </p>
          <div className="flex gap-2">
            <input
              data-ocid="admin.input"
              type="text"
              placeholder="Platform naam (e.g. Telegram)"
              value={newPlatformName}
              onChange={(e) => setNewPlatformName(e.target.value)}
              className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              data-ocid="admin.input"
              type="text"
              placeholder="Emoji"
              value={newPlatformEmoji}
              onChange={(e) => setNewPlatformEmoji(e.target.value)}
              className="w-16 border border-border rounded-xl px-2 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring text-center"
              maxLength={4}
            />
          </div>
          <button
            type="button"
            data-ocid="admin.button"
            onClick={handleAddCustom}
            className="w-full flex items-center justify-center gap-2 bg-primary/10 text-primary font-semibold py-2.5 rounded-xl hover:bg-primary/20 transition-colors text-sm"
          >
            <Plus size={16} /> Platform Add Karen
          </button>
        </div>

        <button
          type="button"
          data-ocid="admin.primary_button"
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${saved ? "bg-green-500 text-white" : "bg-primary text-primary-foreground hover:opacity-90"}`}
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : null}
          {saved ? "✓ Saved!" : "Save Social Media Settings"}
        </button>
      </div>
    </div>
  );
}

// ---- Affiliate Marketing Section ----
interface AffiliateLink {
  id: string;
  title: string;
  url: string;
  emoji: string;
}

function AffiliateMarketingSection() {
  const updateAppSettingsMutation = useUpdateAppSettings();
  const [settings, setSettings] = useState<{
    enabled: boolean;
    title: string;
    description: string;
    link: string;
    affiliateLinks: AffiliateLink[];
  }>(() => {
    try {
      const raw = localStorage.getItem("dz_affiliate_settings");
      if (!raw)
        return {
          enabled: false,
          title: "Affiliate Marketing",
          description: "Paisa kamao Digital Zindagi se!",
          link: "",
          affiliateLinks: [],
        };
      const parsed = JSON.parse(raw);
      if (!parsed.affiliateLinks) parsed.affiliateLinks = [];
      return parsed;
    } catch {
      return {
        enabled: false,
        title: "Affiliate Marketing",
        description: "Paisa kamao Digital Zindagi se!",
        link: "",
        affiliateLinks: [],
      };
    }
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkEmoji, setNewLinkEmoji] = useState("🛒");

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAppSettingsMutation.mutateAsync({
        affiliateSettings: settings as unknown as Record<string, unknown>,
      });
      broadcastSettingsChange();
      setSaved(true);
      toast.success("Affiliate Marketing settings save ho gayi!");
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save nahi ho saca";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAddLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) {
      toast.error("Title aur URL dono likhein");
      return;
    }
    const newLink: AffiliateLink = {
      id: Date.now().toString(),
      title: newLinkTitle.trim(),
      url: newLinkUrl.trim(),
      emoji: newLinkEmoji,
    };
    setSettings((prev) => ({
      ...prev,
      affiliateLinks: [...prev.affiliateLinks, newLink],
    }));
    setNewLinkTitle("");
    setNewLinkUrl("");
    setNewLinkEmoji("🛒");
    toast.success("Link add ho gaya!");
  };

  const handleRemoveLink = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      affiliateLinks: prev.affiliateLinks.filter((l) => l.id !== id),
    }));
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold text-foreground">
            Affiliate Marketing
          </h3>
          <button
            type="button"
            data-ocid="admin.toggle"
            onClick={() =>
              setSettings((prev) => ({ ...prev, enabled: !prev.enabled }))
            }
            className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all ${settings.enabled ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
          >
            {settings.enabled ? (
              <ToggleRight size={18} />
            ) : (
              <ToggleLeft size={18} />
            )}
            {settings.enabled ? "ON (Homepage par dikhega)" : "OFF"}
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          ON karne par homepage par ek promotional banner dikhega jahan users
          affiliate links dekh sakte hain.
        </p>
        <div className="space-y-3">
          <div>
            <label
              htmlFor="aff-title"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block"
            >
              Banner Title
            </label>
            <input
              id="aff-title"
              data-ocid="admin.input"
              type="text"
              placeholder="Affiliate Marketing"
              value={settings.title}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label
              htmlFor="aff-desc"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block"
            >
              Description
            </label>
            <textarea
              id="aff-desc"
              data-ocid="admin.input"
              placeholder="Paisa kamao Digital Zindagi se!"
              value={settings.description}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={2}
              className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>
      </div>

      {/* Multiple Affiliate Links */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
        <h3 className="font-heading font-semibold text-foreground">
          🛒 Affiliate Links (Flipkart, Amazon etc.)
        </h3>
        <p className="text-sm text-muted-foreground">
          Apne affiliate links yahan add karein — homepage par buttons ban
          jaayenge.
        </p>

        {settings.affiliateLinks.length > 0 && (
          <div className="space-y-2">
            {settings.affiliateLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between bg-muted/40 rounded-xl px-4 py-3 gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span>{link.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {link.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {link.url}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveLink(link.id)}
                  className="flex-shrink-0 text-red-400 hover:text-red-600 text-xs font-medium px-2 py-1 hover:bg-red-50 rounded-lg transition-colors"
                >
                  ✕ हटाएं
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new link */}
        <div className="border-2 border-dashed border-primary/30 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">
            + Naya Link Add Karen
          </p>
          <div className="flex gap-2">
            <input
              data-ocid="admin.input"
              type="text"
              placeholder="Title (e.g. Flipkart)"
              value={newLinkTitle}
              onChange={(e) => setNewLinkTitle(e.target.value)}
              className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              data-ocid="admin.input"
              type="text"
              placeholder="Emoji"
              value={newLinkEmoji}
              onChange={(e) => setNewLinkEmoji(e.target.value)}
              className="w-16 border border-border rounded-xl px-2 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring text-center"
              maxLength={4}
            />
          </div>
          <input
            data-ocid="admin.input"
            type="url"
            placeholder="https://flipkart.com/affiliate/..."
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            data-ocid="admin.button"
            onClick={handleAddLink}
            className="w-full flex items-center justify-center gap-2 bg-primary/10 text-primary font-semibold py-2.5 rounded-xl hover:bg-primary/20 transition-colors text-sm"
          >
            <Plus size={16} /> Link Add Karen
          </button>
        </div>

        {settings.enabled && settings.affiliateLinks.length > 0 && (
          <div className="bg-gradient-to-r from-emerald-600 to-green-500 rounded-2xl p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-1">
              Preview (Homepage par aise dikhega)
            </p>
            <p className="font-bold text-lg">
              {settings.title || "Affiliate Marketing"}
            </p>
            <p className="text-sm opacity-90 mt-1">{settings.description}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {settings.affiliateLinks.slice(0, 4).map((link) => (
                <span
                  key={link.id}
                  className="bg-white text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-xl"
                >
                  {link.emoji} {link.title}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          data-ocid="admin.primary_button"
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${saved ? "bg-green-500 text-white" : "bg-primary text-primary-foreground hover:opacity-90"}`}
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : null}
          {saved ? "✓ Saved!" : "Save Affiliate Settings"}
        </button>
      </div>
    </div>
  );
}

// ---- eBook Types ----
interface EBook {
  id: string;
  title: string;
  coverUrl: string;
  price: string;
  downloadLink: string;
  description: string;
  createdAt: string;
}

interface EBookPurchase {
  id: string;
  bookId: string;
  bookTitle: string;
  buyerName: string;
  buyerMobile: string;
  screenshotBase64: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
}

function readEbooks(): EBook[] {
  try {
    return JSON.parse(localStorage.getItem("dz_ebooks") ?? "[]");
  } catch {
    return [];
  }
}

function saveEbooks(books: EBook[]) {
  localStorage.setItem("dz_ebooks", JSON.stringify(books));
}

function readEbookPurchases(): EBookPurchase[] {
  try {
    return JSON.parse(localStorage.getItem("dz_ebook_purchases") ?? "[]");
  } catch {
    return [];
  }
}

function saveEbookPurchases(purchases: EBookPurchase[]) {
  localStorage.setItem("dz_ebook_purchases", JSON.stringify(purchases));
}

// ---- eBook Purchase Notifications (inside ProviderApprovals) ----
function EbookPurchaseNotifications() {
  const [purchases, setPurchases] = useState<EBookPurchase[]>(() =>
    readEbookPurchases().filter((p) => p.status === "pending"),
  );

  const handleApprove = (id: string) => {
    const all = readEbookPurchases();
    const updated = all.map((p) =>
      p.id === id ? { ...p, status: "approved" as const } : p,
    );
    saveEbookPurchases(updated);
    setPurchases(updated.filter((p) => p.status === "pending"));
    toast.success("Book approved! Download unlock ho gaya 📚");
  };

  const handleReject = (id: string) => {
    const all = readEbookPurchases();
    const updated = all.filter((p) => p.id !== id);
    saveEbookPurchases(updated);
    setPurchases(updated.filter((p) => p.status === "pending"));
    toast.success("eBook request reject ho gaya.");
  };

  if (purchases.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-heading font-semibold text-foreground">
          📚 eBook Purchase Requests
        </h3>
        <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
          {purchases.length} Pending
        </span>
      </div>
      {purchases.map((purchase, i) => (
        <div
          key={purchase.id}
          data-ocid={`ebook.item.${i + 1}`}
          className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  📚 {purchase.bookTitle}
                </span>
                <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  Payment Pending
                </span>
              </div>
              <p className="font-semibold text-foreground">
                {purchase.buyerName}
              </p>
              <p className="text-sm text-muted-foreground">
                📱 {purchase.buyerMobile}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(purchase.submittedAt).toLocaleDateString("hi-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            {purchase.screenshotBase64 && (
              <img
                src={purchase.screenshotBase64}
                alt="Payment screenshot"
                className="w-16 h-16 object-cover rounded-xl border border-border flex-shrink-0"
              />
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              data-ocid={`ebook.confirm_button.${i + 1}`}
              onClick={() => handleApprove(purchase.id)}
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <CheckCircle size={15} /> Approve
            </button>
            <button
              type="button"
              data-ocid={`ebook.delete_button.${i + 1}`}
              onClick={() => handleReject(purchase.id)}
              className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold px-4 py-2 rounded-xl transition-colors border border-red-200"
            >
              <XCircle size={15} /> Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- eBook Manager Section ----
function EbookManagerSection() {
  const [books, setBooks] = useState<EBook[]>(readEbooks);
  const [storeEnabled, setStoreEnabled] = useState<boolean>(() => {
    return localStorage.getItem("dz_ebook_store_enabled") === "true";
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const emptyForm = {
    title: "",
    coverUrl: "",
    price: "",
    downloadLink: "",
    description: "",
  };
  const [formData, setFormData] = useState(emptyForm);
  const [editFormData, setEditFormData] = useState(emptyForm);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const editPdfInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [editUploadingPdf, setEditUploadingPdf] = useState(false);

  const handleToggleStore = () => {
    const next = !storeEnabled;
    setStoreEnabled(next);
    localStorage.setItem("dz_ebook_store_enabled", next ? "true" : "false");
    broadcastSettingsChange();
    toast.success(
      next ? "eBook Store ON ho gaya! 📚" : "eBook Store OFF ho gaya.",
    );
  };

  const handleAddBook = () => {
    if (!formData.title.trim()) {
      toast.error("Book Title zaroor bharein");
      return;
    }
    const newBook: EBook = {
      id: Date.now().toString(),
      title: formData.title.trim(),
      coverUrl: formData.coverUrl.trim(),
      price: formData.price.trim(),
      downloadLink: formData.downloadLink.trim(),
      description: formData.description.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...books, newBook];
    setBooks(updated);
    saveEbooks(updated);
    setFormData(emptyForm);
    setShowAddForm(false);
    toast.success(`"${newBook.title}" add ho gayi! 📚`);
  };

  const handleDeleteBook = (id: string) => {
    const book = books.find((b) => b.id === id);
    const updated = books.filter((b) => b.id !== id);
    setBooks(updated);
    saveEbooks(updated);
    toast.success(`${book?.title ?? "Book"} delete ho gayi.`);
  };

  const handleStartEdit = (book: EBook) => {
    setEditingId(book.id);
    setEditFormData({
      title: book.title,
      coverUrl: book.coverUrl,
      price: book.price,
      downloadLink: book.downloadLink,
      description: book.description,
    });
  };

  const handleSaveEdit = (id: string) => {
    if (!editFormData.title.trim()) {
      toast.error("Book Title zaroor bharein");
      return;
    }
    const updated = books.map((b) =>
      b.id === id
        ? {
            ...b,
            title: editFormData.title.trim(),
            coverUrl: editFormData.coverUrl.trim(),
            price: editFormData.price.trim(),
            downloadLink: editFormData.downloadLink.trim(),
            description: editFormData.description.trim(),
          }
        : b,
    );
    setBooks(updated);
    saveEbooks(updated);
    setEditingId(null);
    toast.success("Book update ho gayi! ✅");
  };

  const handlePdfSelect = (
    file: File,
    setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>,
    setUploading: React.Dispatch<React.SetStateAction<boolean>>,
  ) => {
    if (file.type !== "application/pdf") {
      toast.error("Sirf PDF file hi upload karein");
      return;
    }
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(
        `PDF size 10MB se zyada hai (${(file.size / 1024 / 1024).toFixed(1)}MB). Chhoti file choose karein.`,
      );
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setForm((prev) => ({ ...prev, downloadLink: dataUrl }));
      setUploading(false);
      toast.success(
        `PDF upload ho gaya! (${(file.size / 1024).toFixed(0)}KB) ✅`,
      );
    };
    reader.onerror = () => {
      toast.error("PDF read nahi ho saca");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Store ON/OFF Toggle Card */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-heading font-bold text-foreground text-lg">
              📚 eBook Store
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {storeEnabled
                ? "Store ON hai — Homepage par dikh raha hai"
                : "Store OFF hai — Homepage par nahi dikhega"}
            </p>
          </div>
          <button
            type="button"
            data-ocid="ebook.toggle"
            onClick={handleToggleStore}
            className={`relative w-14 h-7 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${storeEnabled ? "bg-emerald-500" : "bg-gray-300"}`}
            aria-label="Store toggle"
          >
            <span
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${storeEnabled ? "translate-x-7" : "translate-x-0.5"}`}
            />
          </button>
        </div>
      </div>

      {/* Add New eBook Button + Form */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold text-foreground">
            eBook Collection ({books.length})
          </h3>
          <button
            type="button"
            data-ocid="ebook.primary_button"
            onClick={() => {
              setShowAddForm((v) => !v);
              setFormData(emptyForm);
            }}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            Add New eBook
          </button>
        </div>

        {/* Inline Add Form */}
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3"
          >
            <h4 className="font-semibold text-emerald-800 text-sm">
              Nayi eBook Add Karein
            </h4>
            <div className="space-y-2">
              <input
                data-ocid="ebook.input"
                type="text"
                placeholder="Book Title *"
                value={formData.title}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, title: e.target.value }))
                }
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring bg-white"
              />
              <input
                data-ocid="ebook.input"
                type="url"
                placeholder="Book Cover Image URL"
                value={formData.coverUrl}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, coverUrl: e.target.value }))
                }
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring bg-white"
              />
              <input
                data-ocid="ebook.input"
                type="number"
                placeholder="Price (₹)"
                value={formData.price}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, price: e.target.value }))
                }
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring bg-white"
              />
              {/* PDF Upload button + fallback URL input */}
              <div className="space-y-1">
                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={uploadingPdf}
                    className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60"
                  >
                    {uploadingPdf ? (
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="text-sm">📄</span>
                    )}
                    Upload PDF
                  </button>
                  {formData.downloadLink.startsWith("data:application/pdf") && (
                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-lg">
                      📄 PDF Ready
                    </span>
                  )}
                </div>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      handlePdfSelect(file, setFormData, setUploadingPdf);
                    e.target.value = "";
                  }}
                />
                <input
                  data-ocid="ebook.input"
                  type="url"
                  placeholder="Ya yahan PDF URL paste karein"
                  value={
                    formData.downloadLink.startsWith("data:application/pdf")
                      ? "(PDF Uploaded ✅)"
                      : formData.downloadLink
                  }
                  readOnly={formData.downloadLink.startsWith(
                    "data:application/pdf",
                  )}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, downloadLink: e.target.value }))
                  }
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring bg-white"
                />
              </div>
              <textarea
                data-ocid="ebook.textarea"
                placeholder="Description (kitaab ke baare mein)"
                value={formData.description}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, description: e.target.value }))
                }
                rows={3}
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring bg-white resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                data-ocid="ebook.save_button"
                onClick={handleAddBook}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2 rounded-xl hover:opacity-90 transition-opacity"
              >
                <CheckCircle size={15} /> Save
              </button>
              <button
                type="button"
                data-ocid="ebook.cancel_button"
                onClick={() => setShowAddForm(false)}
                className="text-sm font-medium px-5 py-2 rounded-xl border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* eBook List */}
        {books.length === 0 ? (
          <div
            data-ocid="ebook.empty_state"
            className="text-center py-10 text-muted-foreground"
          >
            <p className="text-4xl mb-2">📚</p>
            <p className="font-medium">Abhi koi eBook nahi hai</p>
            <p className="text-sm">Upar se "Add New eBook" dabao</p>
          </div>
        ) : (
          <div className="space-y-3">
            {books.map((book, i) => (
              <div
                key={book.id}
                data-ocid={`ebook.item.${i + 1}`}
                className="bg-white border border-border rounded-2xl p-4"
              >
                {editingId === book.id ? (
                  /* Edit Mode */
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-foreground mb-2">
                      Edit: {book.title}
                    </h4>
                    <input
                      data-ocid="ebook.input"
                      type="text"
                      placeholder="Book Title *"
                      value={editFormData.title}
                      onChange={(e) =>
                        setEditFormData((p) => ({
                          ...p,
                          title: e.target.value,
                        }))
                      }
                      className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      data-ocid="ebook.input"
                      type="url"
                      placeholder="Cover Image URL"
                      value={editFormData.coverUrl}
                      onChange={(e) =>
                        setEditFormData((p) => ({
                          ...p,
                          coverUrl: e.target.value,
                        }))
                      }
                      className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      data-ocid="ebook.input"
                      type="number"
                      placeholder="Price (₹)"
                      value={editFormData.price}
                      onChange={(e) =>
                        setEditFormData((p) => ({
                          ...p,
                          price: e.target.value,
                        }))
                      }
                      className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    {/* PDF Upload for edit */}
                    <div className="space-y-1">
                      <div className="flex gap-2 items-center">
                        <button
                          type="button"
                          onClick={() => editPdfInputRef.current?.click()}
                          disabled={editUploadingPdf}
                          className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60"
                        >
                          {editUploadingPdf ? (
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span className="text-sm">📄</span>
                          )}
                          Upload PDF
                        </button>
                        {editFormData.downloadLink.startsWith(
                          "data:application/pdf",
                        ) && (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-lg">
                            📄 PDF Ready
                          </span>
                        )}
                      </div>
                      <input
                        ref={editPdfInputRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            handlePdfSelect(
                              file,
                              setEditFormData,
                              setEditUploadingPdf,
                            );
                          e.target.value = "";
                        }}
                      />
                      <input
                        data-ocid="ebook.input"
                        type="url"
                        placeholder="Ya yahan PDF URL paste karein"
                        value={
                          editFormData.downloadLink.startsWith(
                            "data:application/pdf",
                          )
                            ? "(PDF Uploaded ✅)"
                            : editFormData.downloadLink
                        }
                        readOnly={editFormData.downloadLink.startsWith(
                          "data:application/pdf",
                        )}
                        onChange={(e) =>
                          setEditFormData((p) => ({
                            ...p,
                            downloadLink: e.target.value,
                          }))
                        }
                        className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <textarea
                      data-ocid="ebook.textarea"
                      placeholder="Description"
                      value={editFormData.description}
                      onChange={(e) =>
                        setEditFormData((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                      rows={2}
                      className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        data-ocid={`ebook.save_button.${i + 1}`}
                        onClick={() => handleSaveEdit(book.id)}
                        className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90"
                      >
                        <CheckCircle size={14} /> Save
                      </button>
                      <button
                        type="button"
                        data-ocid={`ebook.cancel_button.${i + 1}`}
                        onClick={() => setEditingId(null)}
                        className="text-sm font-medium px-4 py-2 rounded-xl border border-border hover:bg-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display Mode */
                  <div className="flex gap-3">
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-14 h-18 object-cover rounded-xl flex-shrink-0 border border-border"
                        style={{ height: "72px" }}
                      />
                    ) : (
                      <div
                        className="w-14 h-18 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ height: "72px" }}
                      >
                        <span className="text-2xl">📚</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">
                            {book.title}
                          </p>
                          {(book.downloadLink.startsWith(
                            "data:application/pdf",
                          ) ||
                            book.downloadLink
                              .toLowerCase()
                              .includes(".pdf")) && (
                            <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5">
                              📄 PDF
                            </span>
                          )}
                          {book.price && (
                            <span className="inline-block bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full mt-0.5">
                              ₹{book.price}
                            </span>
                          )}
                          {book.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {book.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            data-ocid={`ebook.edit_button.${i + 1}`}
                            onClick={() => handleStartEdit(book)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                            aria-label="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            data-ocid={`ebook.delete_button.${i + 1}`}
                            onClick={() => handleDeleteBook(book.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                            aria-label="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- App Settings Section ----
function AppSettingsSection() {
  const { data: appSettings } = useAppSettings();
  const updateAppSettingsMutation = useUpdateAppSettings();

  const [welcomeMessage, setWelcomeMessage] = useState(
    () =>
      localStorage.getItem("dz_welcome_message") ??
      "Digital Zindagi में आपका स्वागत है",
  );
  const [tagline, setTagline] = useState(
    () =>
      localStorage.getItem("dz_app_tagline") ??
      "डिजिटल जिंदगी से जुड़ो और लोकल सर्विस का फायदा उठाओ",
  );
  const [footerCopyright, setFooterCopyright] = useState(
    () => localStorage.getItem("dz_footer_copyright") ?? "",
  );
  const [contactPhone, setContactPhone] = useState(
    () => localStorage.getItem("dz_contact_phone") ?? "+91 98765 43210",
  );
  const [contactEmail, setContactEmail] = useState(
    () =>
      localStorage.getItem("dz_contact_email") ?? "support@digitalzindagi.in",
  );
  const [contactAddress, setContactAddress] = useState(
    () => localStorage.getItem("dz_contact_address") ?? "Bharat, India",
  );
  const [showInstallBtn, setShowInstallBtn] = useState(
    () => localStorage.getItem("dz_show_install_btn") !== "false",
  );
  const [splashEnabled, setSplashEnabled] = useState(
    () => localStorage.getItem("dz_splash_enabled") !== "false",
  );
  const [savedField, setSavedField] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);

  // Sync from canister when data arrives
  useEffect(() => {
    if (!appSettings) return;
    if (appSettings.welcomeMessage)
      setWelcomeMessage(appSettings.welcomeMessage);
    if (appSettings.tagline) setTagline(appSettings.tagline);
    if (appSettings.footerCopyright !== undefined)
      setFooterCopyright(appSettings.footerCopyright);
    if (appSettings.contactPhone) setContactPhone(appSettings.contactPhone);
    if (appSettings.contactEmail) setContactEmail(appSettings.contactEmail);
    if (appSettings.contactAddress)
      setContactAddress(appSettings.contactAddress);
    if (appSettings.showInstallBtn !== undefined)
      setShowInstallBtn(appSettings.showInstallBtn);
    if (appSettings.splashEnabled !== undefined)
      setSplashEnabled(appSettings.splashEnabled);
  }, [appSettings]);

  const saveField = async (
    partialSettings: Record<string, string | boolean>,
    label: string,
  ) => {
    setSavingField(label);
    try {
      await updateAppSettingsMutation.mutateAsync(partialSettings);
      broadcastSettingsChange();
      setSavedField(label);
      toast.success(`${label} save ho gaya!`);
      setTimeout(() => setSavedField(null), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save nahi ho saka";
      toast.error(msg);
    } finally {
      setSavingField(null);
    }
  };

  const saveToggle = async (
    partialSettings: Record<string, boolean>,
    label: string,
    value: boolean,
  ) => {
    setSavingField(label);
    try {
      await updateAppSettingsMutation.mutateAsync(partialSettings);
      broadcastSettingsChange();
      toast.success(`${label} ${value ? "ON" : "OFF"} ho gaya!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save nahi ho saka";
      toast.error(msg);
    } finally {
      setSavingField(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Welcome Message */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-3">
        <h3 className="font-heading font-semibold text-foreground">
          स्वागत संदेश (Welcome Message)
        </h3>
        <p className="text-sm text-muted-foreground">
          Login/Signup page पर दिखने वाला संदेश।
        </p>
        <input
          data-ocid="admin.input"
          type="text"
          value={welcomeMessage}
          onChange={(e) => setWelcomeMessage(e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          data-ocid="admin.save_button"
          onClick={() => saveField({ welcomeMessage }, "Welcome Message")}
          disabled={savingField === "Welcome Message"}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-5 py-2 rounded-xl text-sm disabled:opacity-60"
        >
          {savingField === "Welcome Message" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : null}
          {savedField === "Welcome Message" ? "✅ Saved!" : "Save"}
        </button>
      </div>

      {/* App Tagline */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-3">
        <h3 className="font-heading font-semibold text-foreground">
          App Tagline
        </h3>
        <p className="text-sm text-muted-foreground">
          Homepage पर hero के नीचे दिखने वाली tagline।
        </p>
        <input
          data-ocid="admin.input"
          type="text"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          data-ocid="admin.save_button"
          onClick={() => saveField({ tagline }, "App Tagline")}
          disabled={savingField === "App Tagline"}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-5 py-2 rounded-xl text-sm disabled:opacity-60"
        >
          {savingField === "App Tagline" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : null}
          {savedField === "App Tagline" ? "✅ Saved!" : "Save"}
        </button>
      </div>

      {/* Footer Copyright */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-3">
        <h3 className="font-heading font-semibold text-foreground">
          Footer Copyright Text
        </h3>
        <p className="text-sm text-muted-foreground">
          Footer में copyright text। खाली छोड़ने पर default "© Year Digital Zindagi"
          दिखेगा।
        </p>
        <input
          data-ocid="admin.input"
          type="text"
          value={footerCopyright}
          onChange={(e) => setFooterCopyright(e.target.value)}
          placeholder="© 2026 Digital Zindagi"
          className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          data-ocid="admin.save_button"
          onClick={() => saveField({ footerCopyright }, "Footer Copyright")}
          disabled={savingField === "Footer Copyright"}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-5 py-2 rounded-xl text-sm disabled:opacity-60"
        >
          {savingField === "Footer Copyright" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : null}
          {savedField === "Footer Copyright" ? "✅ Saved!" : "Save"}
        </button>
      </div>

      {/* Contact Info */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
        <h3 className="font-heading font-semibold text-foreground">
          Contact Information
        </h3>
        <div className="space-y-3">
          <div>
            <label
              htmlFor="contact-phone"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block"
            >
              Phone Number
            </label>
            <div className="flex gap-2">
              <input
                id="contact-phone"
                data-ocid="admin.input"
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                data-ocid="admin.save_button"
                onClick={() => saveField({ contactPhone }, "Phone")}
                disabled={savingField === "Phone"}
                className="bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm whitespace-nowrap disabled:opacity-60"
              >
                {savingField === "Phone" ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : savedField === "Phone" ? (
                  "✅"
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
          <div>
            <label
              htmlFor="contact-email"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block"
            >
              Email Address
            </label>
            <div className="flex gap-2">
              <input
                id="contact-email"
                data-ocid="admin.input"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                data-ocid="admin.save_button"
                onClick={() => saveField({ contactEmail }, "Email")}
                disabled={savingField === "Email"}
                className="bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm whitespace-nowrap disabled:opacity-60"
              >
                {savingField === "Email" ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : savedField === "Email" ? (
                  "✅"
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
          <div>
            <label
              htmlFor="contact-address"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block"
            >
              Address
            </label>
            <div className="flex gap-2">
              <input
                id="contact-address"
                data-ocid="admin.input"
                type="text"
                value={contactAddress}
                onChange={(e) => setContactAddress(e.target.value)}
                className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                data-ocid="admin.save_button"
                onClick={() => saveField({ contactAddress }, "Address")}
                disabled={savingField === "Address"}
                className="bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm whitespace-nowrap disabled:opacity-60"
              >
                {savingField === "Address" ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : savedField === "Address" ? (
                  "✅"
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* App Toggles */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-3">
        <h3 className="font-heading font-semibold text-foreground">
          App Toggles
        </h3>
        {[
          {
            label: "Install Button (Browser में दिखाएं)",
            value: showInstallBtn,
            settingsKey: "showInstallBtn",
            set: setShowInstallBtn,
          },
          {
            label: "Splash Screen (Pehli baar dikhe)",
            value: splashEnabled,
            settingsKey: "splashEnabled",
            set: setSplashEnabled,
          },
        ].map(({ label, value, settingsKey, set }) => (
          <div
            key={label}
            className="flex items-center justify-between py-2 border-b border-border last:border-0"
          >
            <p className="font-medium text-foreground text-sm">{label}</p>
            <button
              type="button"
              data-ocid="admin.toggle"
              onClick={() => {
                const next = !value;
                set(next);
                saveToggle({ [settingsKey]: next }, label, next);
              }}
              className={`relative w-12 h-6 rounded-full transition-colors ${value ? "bg-primary" : "bg-gray-300"}`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? "translate-x-7" : "translate-x-1"}`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Scrap Rates Section ----
function ScrapRatesSection() {
  const readRates = () => {
    try {
      return JSON.parse(localStorage.getItem("dz_scrap_rates") ?? "{}");
    } catch {
      return {};
    }
  };

  const [rates, setRates] = useState<Record<string, string>>(readRates);
  const [saved, setSaved] = useState(false);

  // Canister hooks
  const { data: canisterRates } = useScrapRates();
  const addScrapRateMutation = useAddScrapRate();
  const updateScrapRateMutation = useUpdateScrapRate();
  const deleteScrapRateMutation = useDeleteScrapRate();

  // Suppress unused lint — hooks are called for canister wiring; mutations used in handleSave
  void deleteScrapRateMutation;

  const DEFAULT_ITEMS = [
    { key: "lohaa", label: "लोहा (Iron)", placeholder: "₹/kg rate" },
    { key: "kaagaz", label: "कागज (Paper)", placeholder: "₹/kg rate" },
    { key: "taamba", label: "तांबा (Copper)", placeholder: "₹/kg rate" },
  ];

  const handleSave = async () => {
    // Try canister upsert for each default item
    for (const item of DEFAULT_ITEMS) {
      const rateVal = Number(rates[item.key] ?? 0);
      if (rateVal > 0) {
        const existing = canisterRates?.find((r) => r.itemName === item.key);
        try {
          if (existing) {
            await updateScrapRateMutation.mutateAsync({
              id: existing.id,
              itemName: item.key,
              ratePerKg: rateVal,
              ratePerGram: rateVal / 1000,
              enabled: true,
            });
          } else {
            await addScrapRateMutation.mutateAsync({
              itemName: item.key,
              ratePerKg: rateVal,
              ratePerGram: rateVal / 1000,
            });
          }
        } catch {
          // canister not available — fall through to localStorage
        }
      }
    }
    localStorage.setItem("dz_scrap_rates", JSON.stringify(rates));
    broadcastSettingsChange();
    setSaved(true);
    toast.success("Scrap rates save ho gaye! ♻️");
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
        <h3 className="font-heading font-semibold text-foreground">
          Default Scrap Rates
        </h3>
        <p className="text-sm text-muted-foreground">
          यहां rates set करें — ये Homepage के Rate Calculator में automatically sync
          हो जाएंगे।
        </p>
        <div className="space-y-3">
          {DEFAULT_ITEMS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label
                htmlFor={`scrap-${key}`}
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block"
              >
                {label}
              </label>
              <input
                id={`scrap-${key}`}
                data-ocid="admin.input"
                type="number"
                value={rates[key] ?? ""}
                onChange={(e) =>
                  setRates((prev) => ({ ...prev, [key]: e.target.value }))
                }
                placeholder={placeholder}
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="font-semibold text-foreground text-sm mb-3">
            Custom Items (3 aur)
          </h4>
          <div className="space-y-3">
            {[1, 2, 3].map((num) => (
              <div key={num} className="grid grid-cols-2 gap-2">
                <input
                  data-ocid="admin.input"
                  type="text"
                  value={rates[`custom${num}name`] ?? ""}
                  onChange={(e) =>
                    setRates((prev) => ({
                      ...prev,
                      [`custom${num}name`]: e.target.value,
                    }))
                  }
                  placeholder={`Item ${num} naam`}
                  className="border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  data-ocid="admin.input"
                  type="number"
                  value={rates[`custom${num}rate`] ?? ""}
                  onChange={(e) =>
                    setRates((prev) => ({
                      ...prev,
                      [`custom${num}rate`]: e.target.value,
                    }))
                  }
                  placeholder="₹/kg rate"
                  className="border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          data-ocid="admin.save_button"
          onClick={handleSave}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
            saved
              ? "bg-green-500 text-white"
              : "bg-primary text-primary-foreground hover:opacity-90"
          }`}
        >
          {saved ? "✅ Rates Saved!" : "♻️ Save All Rates"}
        </button>
      </div>
    </div>
  );
}

// ---- Homepage Controls (Extended) Section ----
function HomepageControlsExtendedSection() {
  const readToggles = () => ({
    dz_show_rate_calculator:
      localStorage.getItem("dz_show_rate_calculator") !== "false",
    dz_ebook_store_enabled:
      localStorage.getItem("dz_ebook_store_enabled") === "true",
    dz_show_hero_carousel:
      localStorage.getItem("dz_show_hero_carousel") !== "false",
    dz_show_category_grid:
      localStorage.getItem("dz_show_category_grid") !== "false",
    dz_show_providers: localStorage.getItem("dz_show_providers") !== "false",
    dz_show_register_banner:
      localStorage.getItem("dz_show_register_banner") !== "false",
  });

  const [toggles, setToggles] = useState(readToggles);

  const CONTROLS = [
    {
      key: "dz_show_rate_calculator",
      label: "⚖️ Rate Calculator Button",
      desc: "Homepage पर Rate Calculator button दिखाएं",
    },
    {
      key: "dz_ebook_store_enabled",
      label: "📚 eBook Store",
      desc: "Homepage पर eBook store section दिखाएं",
    },
    {
      key: "dz_show_hero_carousel",
      label: "🖼️ Hero Carousel/Slider",
      desc: "Top पर image slider/banner दिखाएं",
    },
    {
      key: "dz_show_category_grid",
      label: "🗂️ Category Grid",
      desc: "Service categories grid दिखाएं",
    },
    {
      key: "dz_show_providers",
      label: "🏪 Providers Section",
      desc: "Featured providers list दिखाएं",
    },
    {
      key: "dz_show_register_banner",
      label: "📝 Registration Banner",
      desc: "Business register करने का banner दिखाएं",
    },
  ];

  const handleToggle = (key: string) => {
    const newVal = !toggles[key as keyof typeof toggles];
    localStorage.setItem(key, newVal ? "true" : "false");
    setToggles((prev) => ({ ...prev, [key]: newVal }));
    broadcastSettingsChange();
    toast.success("Setting update ho gayi!");
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <h3 className="font-heading font-semibold text-foreground">
            Homepage Sections ON/OFF
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Toggle किसी भी section को instantly hide/show करें।
          </p>
        </div>
        {CONTROLS.map(({ key, label, desc }) => (
          <div
            key={key}
            className="flex items-center justify-between px-5 py-4 border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
          >
            <div>
              <p className="font-medium text-foreground text-sm">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <button
              type="button"
              data-ocid="admin.toggle"
              onClick={() => handleToggle(key)}
              className={`relative w-12 h-6 rounded-full transition-colors ${toggles[key as keyof typeof toggles] ? "bg-primary" : "bg-gray-300"}`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${toggles[key as keyof typeof toggles] ? "translate-x-7" : "translate-x-1"}`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Announcements Section ----
function AnnouncementsSection() {
  const [text, setText] = useState(
    () => localStorage.getItem("dz_announcement") ?? "",
  );
  const [enabled, setEnabled] = useState(
    () => localStorage.getItem("dz_announcement_enabled") === "true",
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem("dz_announcement", text);
    localStorage.setItem("dz_announcement_enabled", enabled ? "true" : "false");
    broadcastSettingsChange();
    setSaved(true);
    toast.success("Announcement save ho gaya!");
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold text-foreground">
            📢 Announcement Banner
          </h3>
          <button
            type="button"
            data-ocid="admin.toggle"
            onClick={() => setEnabled((v) => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-gray-300"}`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`}
            />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          {enabled
            ? "✅ ON — Homepage पर scrolling marquee bar दिख रहा है।"
            : "Homepage पर एक scrolling notice/announcement दिखाएं।"}
        </p>
        <div>
          <label
            htmlFor="announcement-text"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block"
          >
            Announcement Text
          </label>
          <textarea
            id="announcement-text"
            data-ocid="admin.textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="App update ho gaya! Naye features check karein..."
            rows={3}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
        {text && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 overflow-hidden">
            <p className="text-xs text-amber-600 font-semibold mb-1">
              Preview:
            </p>
            <p className="text-amber-800 text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
              📢 {text}
            </p>
          </div>
        )}
        <button
          type="button"
          data-ocid="admin.save_button"
          onClick={handleSave}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
            saved
              ? "bg-green-500 text-white"
              : "bg-primary text-primary-foreground hover:opacity-90"
          }`}
        >
          {saved ? "✅ Saved!" : "Save Announcement"}
        </button>
      </div>
    </div>
  );
}

// ---- Main Admin Dashboard ----

// ---- Google Sheets Section ----
function GoogleSheetsSection() {
  const [csvUrl, setCsvUrl] = useState(getSheetCsvUrl);
  const [rows, setRows] = useState<SheetRow[]>(getSheetData);
  const [lastSync, setLastSync] = useState(getLastSyncTime);
  const [syncing, setSyncing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Canister video hooks
  const addVideoMutation = useAddVideo();
  const deleteVideoMutation = useDeleteVideo();

  const [formData, setFormData] = useState({
    platform: "",
    category: "",
    videoLink: "",
    status: "active",
    adLink: "",
    affiliateLink: "",
  });

  const handleSaveUrl = () => {
    setSheetCsvUrl(csvUrl);
    toast.success("CSV URL save ho gayi!");
    broadcastSettingsChange();
  };

  const handleSync = async () => {
    setSyncing(true);
    const result = await syncFromSheet();
    setSyncing(false);
    if (result.error) {
      toast.error(`Sync failed: ${result.error}`);
    } else {
      toast.success(`${result.added} rows sync ho gaye!`);
      setRows(getSheetData());
      setLastSync(getLastSyncTime());
    }
  };

  const handleAddManual = async () => {
    if (!formData.platform && !formData.category) {
      toast.error("Platform ya Category bharna zaroori hai");
      return;
    }
    // Also save to canister if video link provided
    if (formData.videoLink.trim()) {
      try {
        await addVideoMutation.mutateAsync({
          title: formData.category || formData.platform,
          videoUrl: formData.videoLink.trim(),
          thumbnailUrl: "",
          platform: formData.platform,
          category: formData.category,
        });
      } catch {
        // Canister not available — continue with localStorage
      }
    }
    addManualRow(formData);
    setRows(getSheetData());
    setFormData({
      platform: "",
      category: "",
      videoLink: "",
      status: "active",
      adLink: "",
      affiliateLink: "",
    });
    setShowAddForm(false);
    broadcastSettingsChange();
    toast.success("Row manually add ho gayi!");
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVideoMutation.mutateAsync(Number(id));
    } catch {
      // Canister not available — continue
    }
    deleteSheetRow(id);
    setRows(getSheetData());
    broadcastSettingsChange();
    toast.success("Row delete ho gayi");
  };

  return (
    <div className="space-y-6">
      {/* CSV URL Setup */}
      <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
        <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
          📊 Google Sheet CSV Link
        </h3>
        <p className="text-xs text-muted-foreground">
          Google Sheet ko publish karein (File &gt; Share &gt; Publish to Web
          &gt; CSV format) aur neeche URL paste karein.
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            value={csvUrl}
            onChange={(e) => setCsvUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={handleSaveUrl}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90"
          >
            Save
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || !csvUrl}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {syncing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <span>🔄</span>
            )}
            {syncing ? "Sync Ho Raha Hai..." : "Sheet Se Sync Karein"}
          </button>
          {lastSync && (
            <p className="text-xs text-muted-foreground">
              Last sync: {new Date(lastSync).toLocaleString("hi-IN")}
            </p>
          )}
        </div>
      </div>

      {/* Manual Entry */}
      <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-base text-foreground">
            ✍️ Manual Entry (Backup)
          </h3>
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90"
          >
            <Plus size={14} /> Row Jodein
          </button>
        </div>

        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-accent rounded-xl p-4 space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              {/* Platform Dropdown */}
              <div>
                <span className="block text-xs font-medium text-foreground mb-1">
                  Platform (YT/FB/IG)
                </span>
                <select
                  value={formData.platform}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, platform: e.target.value }))
                  }
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-white"
                >
                  <option value="">-- Select Platform --</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                </select>
              </div>
              {/* Category */}
              <div>
                <span className="block text-xs font-medium text-foreground mb-1">
                  Category
                </span>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, category: e.target.value }))
                  }
                  placeholder="Motivational, Comedy..."
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-white"
                />
              </div>
              {/* Video Link */}
              <div className="col-span-2">
                <span className="block text-xs font-medium text-foreground mb-1">
                  Video Link
                </span>
                <input
                  type="text"
                  value={formData.videoLink}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, videoLink: e.target.value }))
                  }
                  placeholder="https://youtu.be/... ya FB/IG link"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-white"
                />
              </div>
              {/* Ad Link */}
              <div>
                <span className="block text-xs font-medium text-foreground mb-1">
                  Ad Link
                </span>
                <input
                  type="text"
                  value={formData.adLink}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, adLink: e.target.value }))
                  }
                  placeholder="https://ad-link.com"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-white"
                />
              </div>
              {/* Affiliate Link */}
              <div>
                <span className="block text-xs font-medium text-foreground mb-1">
                  Affiliate Link
                </span>
                <input
                  type="text"
                  value={formData.affiliateLink}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      affiliateLink: e.target.value,
                    }))
                  }
                  placeholder="https://amzn.in/..."
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-white"
                />
              </div>
              <div>
                <span className="block text-xs font-medium text-foreground mb-1">
                  Status
                </span>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, status: e.target.value }))
                  }
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddManual}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90"
              >
                Save Row
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted/50"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-heading font-bold text-sm text-foreground">
            📋 Sheet Data ({rows.length} rows)
          </h3>
          <button
            type="button"
            onClick={() => setRows(getSheetData())}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Refresh
          </button>
        </div>
        {rows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Koi data nahi hai. Sheet sync karein ya manually row add karein.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr>
                  {[
                    "Platform",
                    "Category",
                    "Video",
                    "Status",
                    "Ad",
                    "Affiliate",
                    "Source",
                    "Action",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-border hover:bg-muted/20"
                  >
                    <td className="px-3 py-2.5 font-medium">
                      {row.platform || "—"}
                    </td>
                    <td className="px-3 py-2.5">{row.category || "—"}</td>
                    <td className="px-3 py-2.5">
                      {row.videoLink ? (
                        <button
                          type="button"
                          onClick={() => setVideoUrl(row.videoLink)}
                          className="text-blue-600 underline truncate max-w-[80px] block hover:text-blue-800"
                          title={row.videoLink}
                        >
                          ▶ Play
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${row.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 truncate max-w-[60px]">
                      {row.adLink ? (
                        <a
                          href={row.adLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline"
                        >
                          Link
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5 truncate max-w-[60px]">
                      {row.affiliateLink ? (
                        <a
                          href={row.affiliateLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline"
                        >
                          Link
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs ${row.source === "manual" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}
                      >
                        {row.source === "manual" ? "Manual" : "Sheet"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Video Player modal */}
      {videoUrl && (
        <VideoPlayer
          url={videoUrl}
          title="Sheet Video"
          onClose={() => setVideoUrl(null)}
        />
      )}
    </div>
  );
}

// ---- Notification Bar Section ----
function NotificationBarSection() {
  const { data: appSettings } = useAppSettings();
  const updateAppSettingsMutation = useUpdateAppSettings();

  const [text, setText] = useState(
    () => localStorage.getItem("dz_notification_bar") ?? "",
  );
  const [enabled, setEnabled] = useState(() => {
    const val = localStorage.getItem("dz_notification_bar_enabled");
    return val === null ? false : val === "true";
  });
  const [saving, setSaving] = useState(false);

  // Sync from canister when data arrives
  useEffect(() => {
    if (appSettings?.notificationBarText !== undefined) {
      setText(appSettings.notificationBarText);
    }
    if (appSettings?.notificationBarEnabled !== undefined) {
      setEnabled(appSettings.notificationBarEnabled);
    }
  }, [appSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAppSettingsMutation.mutateAsync({
        notificationBarText: text,
        notificationBarEnabled: enabled,
      });
      broadcastSettingsChange();
      toast.success("Notification bar update ho gaya!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save nahi ho saka";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
        <h3 className="font-heading font-bold text-base text-foreground">
          🔔 Top Notification Bar
        </h3>
        <p className="text-xs text-muted-foreground">
          Yeh text app ke bilkul top par golden bar mein scroll karke dikhega.
        </p>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">
            Bar ON/OFF:
          </span>
          <button
            type="button"
            onClick={() => setEnabled((v) => !v)}
            className="flex items-center gap-2 text-sm font-semibold"
          >
            {enabled ? (
              <>
                <ToggleRight size={28} className="text-primary" />{" "}
                <span className="text-primary">ON</span>
              </>
            ) : (
              <>
                <ToggleLeft size={28} className="text-muted-foreground" />{" "}
                <span className="text-muted-foreground">OFF</span>
              </>
            )}
          </button>
        </div>

        <div>
          <p className="block text-sm font-medium text-foreground mb-2">
            Notification Text (Scrolling)
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Koi announcement, offer, ya news likhein..."
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Yeh text baar baar scroll hota rahega jab bar ON ho.
          </p>
        </div>

        {text && enabled && (
          <div className="rounded-xl overflow-hidden border border-amber-300">
            <div className="bg-amber-400 px-3 py-1.5 text-xs font-semibold text-emerald-900">
              Preview:
            </div>
            <div
              className="bg-amber-300 px-3 py-2 overflow-hidden"
              style={{ minHeight: "36px" }}
            >
              <span
                className="text-sm font-semibold text-emerald-900 whitespace-nowrap inline-block"
                style={{ animation: "dz-marquee 12s linear infinite" }}
              >
                {text}
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          Save Karein
        </button>
      </div>
    </div>
  );
}

// ============================================================
// NEWS MANAGER SECTION
// ============================================================
function NewsManagerSection() {
  type LocalNewsItem = {
    id: string;
    title: string;
    summary: string;
    imageUrl: string;
    link: string;
    category: string;
    createdAt: string;
  };
  function readNewsLocal(): LocalNewsItem[] {
    try {
      return JSON.parse(localStorage.getItem("dz_news") ?? "[]");
    } catch {
      return [];
    }
  }
  function saveNewsLocal(items: LocalNewsItem[]) {
    localStorage.setItem("dz_news", JSON.stringify(items));
  }

  // Canister hooks — used when canister has the method; graceful fallback otherwise
  const { data: canisterNews } = useNews();
  const addNewsMutation = useAddNews();
  const updateNewsMutation = useUpdateNews();
  const deleteNewsMutation = useDeleteNews();

  // Local state as fast cache / fallback
  const [items, setItems] = useState<LocalNewsItem[]>(readNewsLocal);
  const [editing, setEditing] = useState<LocalNewsItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const emptyItem = (): LocalNewsItem => ({
    id: Date.now().toString(),
    title: "",
    summary: "",
    imageUrl: "",
    link: "",
    category: "",
    createdAt: new Date().toISOString(),
  });
  const [form, setForm] = useState<LocalNewsItem>(emptyItem());

  // Sync canister data into local state when it arrives
  // biome-ignore lint/correctness/useExhaustiveDependencies: saveNewsLocal is stable
  useEffect(() => {
    if (canisterNews && canisterNews.length > 0) {
      const mapped: LocalNewsItem[] = canisterNews.map((n) => ({
        id: String(n.id),
        title: n.title,
        summary: n.summary,
        imageUrl: n.imageUrl,
        link: n.link,
        category: n.category,
        createdAt: new Date(n.createdAt).toISOString(),
      }));
      setItems(mapped);
      saveNewsLocal(mapped);
    }
  }, [canisterNews]);

  const handleEdit = (item: LocalNewsItem) => {
    setForm({ ...item });
    setEditing(item);
    setShowForm(true);
  };
  const handleNew = () => {
    setForm(emptyItem());
    setEditing(null);
    setShowForm(true);
  };
  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title zaroori hai");
      return;
    }
    // Try canister first, fall back to localStorage
    try {
      if (editing) {
        await updateNewsMutation.mutateAsync({
          id: Number(editing.id),
          title: form.title,
          summary: form.summary,
          imageUrl: form.imageUrl,
          link: form.link,
          category: form.category,
          enabled: true,
        });
      } else {
        await addNewsMutation.mutateAsync({
          title: form.title,
          summary: form.summary,
          imageUrl: form.imageUrl,
          link: form.link,
          category: form.category,
        });
      }
    } catch {
      // Canister method not available yet — use localStorage only
      const updated = editing
        ? items.map((i) => (i.id === editing.id ? { ...form } : i))
        : [
            {
              ...form,
              id: Date.now().toString(),
              createdAt: new Date().toISOString(),
            },
            ...items,
          ];
      setItems(updated);
      saveNewsLocal(updated);
    }
    broadcastSettingsChange();
    setShowForm(false);
    toast.success("News save ho gayi!");
  };
  const handleDelete = async (id: string) => {
    try {
      await deleteNewsMutation.mutateAsync(Number(id));
    } catch {
      // Canister method not available yet — use localStorage only
      const updated = items.filter((i) => i.id !== id);
      setItems(updated);
      saveNewsLocal(updated);
    }
    broadcastSettingsChange();
    toast.success("News delete ho gayi");
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      setForm((f) => ({ ...f, imageUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold text-base text-foreground">
          📰 News Manager
        </h3>
        <button
          type="button"
          onClick={handleNew}
          className="flex items-center gap-2 bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} /> Add News
        </button>
      </div>
      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-200 p-5 space-y-4">
          <h4 className="font-semibold text-sm">
            {editing ? "News Edit Karein" : "Nayi News Add Karein"}
          </h4>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Title *"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="text"
              placeholder="Category (e.g. Politics, Tech)"
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <textarea
              placeholder="Summary / Description"
              value={form.summary}
              onChange={(e) =>
                setForm((f) => ({ ...f, summary: e.target.value }))
              }
              rows={3}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <input
              type="url"
              placeholder="Link (Read More URL)"
              value={form.link}
              onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div>
              <label
                htmlFor="news-img-admin"
                className="text-xs text-muted-foreground block mb-1"
              >
                Thumbnail Image
              </label>
              {form.imageUrl && (
                <img
                  src={form.imageUrl}
                  alt="thumb"
                  className="w-full h-28 object-cover rounded-xl mb-2"
                />
              )}
              <label
                htmlFor="news-img-admin"
                className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-blue-300 rounded-xl px-4 py-3 hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <span className="text-xs text-blue-600 font-semibold">
                  Gallery se image choose karein
                </span>
                <input
                  id="news-img-admin"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
              <input
                type="url"
                placeholder="Ya image URL paste karein"
                value={form.imageUrl.startsWith("data:") ? "" : form.imageUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, imageUrl: e.target.value }))
                }
                className="w-full mt-2 border border-border rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl text-sm hover:bg-blue-700"
            >
              Save News
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-border">
          <span className="text-4xl block mb-2">📰</span>
          <p className="text-sm text-muted-foreground">
            Koi news nahi hai. Add News karein.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-border p-4 flex gap-3"
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{item.title}</p>
                {item.category && (
                  <span className="text-xs text-blue-600">{item.category}</span>
                )}
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {item.summary}
                </p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleEdit(item)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// JOBS MANAGER SECTION
// ============================================================
function JobsManagerSection() {
  type LocalJobItem = {
    id: string;
    title: string;
    department: string;
    location: string;
    imageUrl: string;
    link: string;
    lastDate: string;
    description: string;
    createdAt: string;
  };
  function readJobsLocal(): LocalJobItem[] {
    try {
      return JSON.parse(localStorage.getItem("dz_jobs") ?? "[]");
    } catch {
      return [];
    }
  }
  function saveJobsLocal(items: LocalJobItem[]) {
    localStorage.setItem("dz_jobs", JSON.stringify(items));
  }

  // Canister hooks
  const { data: canisterJobs } = useJobs();
  const addJobMutation = useAddJob();
  const updateJobMutation = useUpdateJob();
  const deleteJobMutation = useDeleteJob();

  const [items, setItems] = useState<LocalJobItem[]>(readJobsLocal);
  const [editing, setEditing] = useState<LocalJobItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const emptyItem = (): LocalJobItem => ({
    id: Date.now().toString(),
    title: "",
    department: "",
    location: "",
    imageUrl: "",
    link: "",
    lastDate: "",
    description: "",
    createdAt: new Date().toISOString(),
  });
  const [form, setForm] = useState<LocalJobItem>(emptyItem());

  // Sync canister data into local state when it arrives
  // biome-ignore lint/correctness/useExhaustiveDependencies: saveJobsLocal is stable
  useEffect(() => {
    if (canisterJobs && canisterJobs.length > 0) {
      const mapped: LocalJobItem[] = canisterJobs.map((j) => ({
        id: String(j.id),
        title: j.title,
        department: j.department,
        location: j.location,
        imageUrl: "",
        link: j.applyLink,
        lastDate: j.lastDate,
        description: "",
        createdAt: new Date(j.createdAt).toISOString(),
      }));
      setItems(mapped);
      saveJobsLocal(mapped);
    }
  }, [canisterJobs]);

  const handleEdit = (item: LocalJobItem) => {
    setForm({ ...item });
    setEditing(item);
    setShowForm(true);
  };
  const handleNew = () => {
    setForm(emptyItem());
    setEditing(null);
    setShowForm(true);
  };
  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title zaroori hai");
      return;
    }
    try {
      if (editing) {
        await updateJobMutation.mutateAsync({
          id: Number(editing.id),
          title: form.title,
          department: form.department,
          location: form.location,
          lastDate: form.lastDate,
          applyLink: form.link,
          category: form.department,
          enabled: true,
        });
      } else {
        await addJobMutation.mutateAsync({
          title: form.title,
          department: form.department,
          location: form.location,
          lastDate: form.lastDate,
          applyLink: form.link,
          category: form.department,
        });
      }
    } catch {
      // Canister method not available yet — use localStorage only
      const updated = editing
        ? items.map((i) => (i.id === editing.id ? { ...form } : i))
        : [
            {
              ...form,
              id: Date.now().toString(),
              createdAt: new Date().toISOString(),
            },
            ...items,
          ];
      setItems(updated);
      saveJobsLocal(updated);
    }
    broadcastSettingsChange();
    setShowForm(false);
    toast.success("Job save ho gayi!");
  };
  const handleDelete = async (id: string) => {
    try {
      await deleteJobMutation.mutateAsync(Number(id));
    } catch {
      const updated = items.filter((i) => i.id !== id);
      setItems(updated);
      saveJobsLocal(updated);
    }
    broadcastSettingsChange();
    toast.success("Job delete ho gayi");
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      setForm((f) => ({ ...f, imageUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold text-base text-foreground">
          💼 Sarkari Jobs Manager
        </h3>
        <button
          type="button"
          onClick={handleNew}
          className="flex items-center gap-2 bg-orange-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-orange-600"
        >
          <Plus size={14} /> Add Job
        </button>
      </div>
      {showForm && (
        <div className="bg-white rounded-2xl border border-orange-200 p-5 space-y-4">
          <h4 className="font-semibold text-sm">
            {editing ? "Job Edit Karein" : "Nayi Job Add Karein"}
          </h4>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Job Title *"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Department (e.g. Railway)"
                value={form.department}
                onChange={(e) =>
                  setForm((f) => ({ ...f, department: e.target.value }))
                }
                className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="text"
                placeholder="Location (e.g. Delhi)"
                value={form.location}
                onChange={(e) =>
                  setForm((f) => ({ ...f, location: e.target.value }))
                }
                className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <input
              type="text"
              placeholder="Last Date (e.g. 31 Jan 2026)"
              value={form.lastDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, lastDate: e.target.value }))
              }
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <textarea
              placeholder="Job Description / Qualification"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={3}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <input
              type="url"
              placeholder="Apply Link (official URL)"
              value={form.link}
              onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div>
              <label
                htmlFor="job-img-admin"
                className="text-xs text-muted-foreground block mb-1"
              >
                Thumbnail Image (optional)
              </label>
              {form.imageUrl && (
                <img
                  src={form.imageUrl}
                  alt="thumb"
                  className="w-full h-24 object-cover rounded-xl mb-2"
                />
              )}
              <label
                htmlFor="job-img-admin"
                className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-orange-300 rounded-xl px-4 py-3 hover:border-orange-500 hover:bg-orange-50"
              >
                <span className="text-xs text-orange-600 font-semibold">
                  Gallery se image choose karein
                </span>
                <input
                  id="job-img-admin"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl text-sm"
            >
              Save Job
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-border">
          <span className="text-4xl block mb-2">💼</span>
          <p className="text-sm text-muted-foreground">
            Koi job nahi hai. Add Job karein.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-border p-4 flex gap-3"
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{item.title}</p>
                {item.department && (
                  <span className="text-xs text-orange-600">
                    {item.department}
                  </span>
                )}
                {item.lastDate && (
                  <p className="text-xs text-red-600 font-medium">
                    Last Date: {item.lastDate}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleEdit(item)}
                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-xl"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MASTER SECTION TOGGLES + AD FREQUENCY + MANAGER LOGIN
// ============================================================
const SECTION_TOGGLE_KEYS_LIST = [
  { key: "dz_section_news", label: "📰 News Section", defaultOn: true },
  { key: "dz_section_jobs", label: "💼 Sarkari Jobs", defaultOn: true },
  {
    key: "dz_section_image_resizer",
    label: "🖼️ Image Resizer Tool",
    defaultOn: true,
  },
  {
    key: "dz_section_ai_enhancer",
    label: "✨ AI Image Enhancer",
    defaultOn: true,
  },
  {
    key: "dz_section_age_calculator",
    label: "🎂 Age Calculator",
    defaultOn: true,
  },
  {
    key: "dz_section_percentage_calculator",
    label: "% Percentage Calculator",
    defaultOn: true,
  },
  { key: "dz_section_youtube", label: "▶️ YouTube Videos", defaultOn: true },
  { key: "dz_section_facebook", label: "📘 Facebook Videos", defaultOn: true },
  {
    key: "dz_section_instagram",
    label: "📸 Instagram Videos",
    defaultOn: true,
  },
  {
    key: "dz_game_visible",
    label: "🎮 Show Game in Menu",
    defaultOn: true,
  },
];

export function readSectionToggles(): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const s of SECTION_TOGGLE_KEYS_LIST) {
    const val = localStorage.getItem(s.key);
    result[s.key] = val === null ? s.defaultOn : val === "true";
  }
  return result;
}

function MasterSectionTogglesSection() {
  const [toggles, setToggles] =
    useState<Record<string, boolean>>(readSectionToggles);
  const toggle = (key: string) => {
    const newVal = !toggles[key];
    localStorage.setItem(key, newVal ? "true" : "false");
    setToggles((prev) => ({ ...prev, [key]: newVal }));
    broadcastSettingsChange();
    toast.success(`Section ${newVal ? "ON" : "OFF"} kar diya!`);
  };
  const [adInterval, setAdInterval] = useState(
    () => localStorage.getItem("dz_ad_interval_hours") ?? "4",
  );
  const saveAdInterval = () => {
    localStorage.setItem("dz_ad_interval_hours", adInterval);
    broadcastSettingsChange();
    toast.success(`Ad frequency: har ${adInterval}h baad ads`);
  };
  const [managerEnabled, setManagerEnabled] = useState(
    () => localStorage.getItem("dz_manager_login_enabled") !== "false",
  );
  const toggleManagerLogin = () => {
    const newVal = !managerEnabled;
    localStorage.setItem("dz_manager_login_enabled", newVal ? "true" : "false");
    setManagerEnabled(newVal);
    broadcastSettingsChange();
    toast.success(`Manager Login ${newVal ? "Enabled" : "DISABLED"}!`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
        <h3 className="font-heading font-bold text-base">
          🎛️ Section ON/OFF Controls
        </h3>
        <p className="text-xs text-muted-foreground">
          Koi section OFF karo — woh app menu se gayab ho jaayega.
        </p>
        <div className="space-y-1">
          {SECTION_TOGGLE_KEYS_LIST.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between py-3 border-b border-border last:border-0"
            >
              <span className="text-sm font-medium">{s.label}</span>
              <button
                type="button"
                onClick={() => toggle(s.key)}
                className="flex items-center gap-2 text-sm font-semibold"
              >
                {toggles[s.key] ? (
                  <>
                    <ToggleRight size={28} className="text-emerald-600" />
                    <span className="text-emerald-600 text-xs">ON</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft size={28} className="text-muted-foreground" />
                    <span className="text-muted-foreground text-xs">OFF</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
        <h3 className="font-heading font-bold text-base">
          ⏰ Ad Frequency Timer
        </h3>
        <p className="text-xs text-muted-foreground">
          User ko kitne ghante baad dobara ads dikhenge.
        </p>
        <div className="flex gap-3 items-center">
          <input
            type="number"
            min="1"
            max="72"
            value={adInterval}
            onChange={(e) => setAdInterval(e.target.value)}
            className="w-24 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-sm text-muted-foreground">Ghante</span>
          <button
            type="button"
            onClick={saveAdInterval}
            className="flex-1 bg-primary text-primary-foreground font-bold py-3 rounded-xl text-sm"
          >
            Save Timer
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {["2", "4", "8", "12", "24"].map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => {
                setAdInterval(h);
                localStorage.setItem("dz_ad_interval_hours", h);
                toast.success(`${h}h set`);
              }}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${adInterval === h ? "bg-primary text-white border-primary" : "bg-white border-border text-foreground"}`}
            >
              {h}h
            </button>
          ))}
        </div>
      </div>
      <div
        className={`bg-white rounded-2xl border-2 p-5 space-y-4 ${managerEnabled ? "border-emerald-300" : "border-red-300"}`}
      >
        <h3 className="font-heading font-bold text-base">
          👨‍💼 Manager Login Control
        </h3>
        <p className="text-xs text-muted-foreground">
          Instantly disable/enable manager login.
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">
              Manager Login: {managerEnabled ? "Enabled ✅" : "DISABLED 🔴"}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleManagerLogin}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm ${managerEnabled ? "bg-red-100 text-red-700 border border-red-300" : "bg-emerald-100 text-emerald-700 border border-emerald-300"}`}
          >
            {managerEnabled ? "🔴 Disable" : "✅ Enable"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// UDHAAR BOOK SETTINGS SECTION
// ============================================================
function UdhaarBookSettingsSection() {
  const [udhaarEnabled, setUdhaarEnabled] = useState<boolean>(() => {
    const val = localStorage.getItem("dz_udhaar_enabled");
    return val === null || val === "true";
  });
  const [admobUdhaarBannerId, setAdmobUdhaarBannerId] = useState(() =>
    (() => {
      try {
        return (
          JSON.parse(localStorage.getItem("dz_admob_config") ?? "{}")
            .udhaarBannerId ?? ""
        );
      } catch {
        return "";
      }
    })(),
  );
  const [admobUdhaarInterstitialId, setAdmobUdhaarInterstitialId] = useState(
    () =>
      (() => {
        try {
          return (
            JSON.parse(localStorage.getItem("dz_admob_config") ?? "{}")
              .udhaarInterstitialId ?? ""
          );
        } catch {
          return "";
        }
      })(),
  );

  const toggleUdhaar = () => {
    const newVal = !udhaarEnabled;
    localStorage.setItem("dz_udhaar_enabled", newVal ? "true" : "false");
    setUdhaarEnabled(newVal);
    broadcastSettingsChange();
    toast.success(`Udhaar Book ${newVal ? "ON ✅" : "OFF 🔴"} kar diya!`);
  };

  const saveAdmobIds = () => {
    try {
      const existing = JSON.parse(
        localStorage.getItem("dz_admob_config") ?? "{}",
      );
      const updated = {
        ...existing,
        udhaarBannerId: admobUdhaarBannerId.trim(),
        udhaarInterstitialId: admobUdhaarInterstitialId.trim(),
      };
      localStorage.setItem("dz_admob_config", JSON.stringify(updated));
    } catch {
      localStorage.setItem(
        "dz_admob_config",
        JSON.stringify({
          udhaarBannerId: admobUdhaarBannerId.trim(),
          udhaarInterstitialId: admobUdhaarInterstitialId.trim(),
        }),
      );
    }
    broadcastSettingsChange();
    toast.success("Udhaar AdMob IDs save ho gayi!");
  };

  return (
    <div className="space-y-6">
      {/* Enable/Disable Toggle */}
      <div
        className={`bg-white rounded-2xl border-2 p-5 space-y-4 ${udhaarEnabled ? "border-emerald-300" : "border-slate-200"}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-heading font-bold text-base">📒 Udhaar Book</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Homepage par "उधार खाता" card aur /udhaar-book page dikhana ya
              chhupaana. Providers apne customers ka ledger manage kar sakte
              hain.
            </p>
          </div>
          <button
            type="button"
            data-ocid="admin.udhaar_toggle"
            onClick={toggleUdhaar}
            className="flex items-center gap-2 flex-shrink-0"
          >
            {udhaarEnabled ? (
              <>
                <ToggleRight size={32} className="text-emerald-600" />
                <span className="text-emerald-600 text-xs font-bold">ON</span>
              </>
            ) : (
              <>
                <ToggleLeft size={32} className="text-muted-foreground" />
                <span className="text-muted-foreground text-xs font-bold">
                  OFF
                </span>
              </>
            )}
          </button>
        </div>
        <div
          className={`text-xs font-semibold px-3 py-2 rounded-xl ${udhaarEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-500"}`}
        >
          {udhaarEnabled
            ? "✅ Udhaar Book homepage par dikh raha hai"
            : "🔴 Udhaar Book homepage se chhupi hui hai"}
        </div>
      </div>

      {/* AdMob Unit IDs for Udhaar */}
      <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
        <h3 className="font-heading font-bold text-base">
          💰 AdMob — Udhaar Book
        </h3>
        <p className="text-xs text-muted-foreground">
          Udhaar Book page ke liye alag AdMob Unit IDs set karein. Agar khaali
          chhodein to global Banner/Interstitial ID use hogi.
        </p>
        <div>
          <label
            htmlFor="admob-udhaar-banner"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Udhaar Banner Unit ID{" "}
            <span className="text-xs text-muted-foreground font-normal">
              (udhaarBannerId)
            </span>
          </label>
          <input
            id="admob-udhaar-banner"
            type="text"
            placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
            value={admobUdhaarBannerId}
            onChange={(e) => setAdmobUdhaarBannerId(e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring font-mono"
            data-ocid="admin.udhaar_admob_banner_input"
          />
        </div>
        <div>
          <label
            htmlFor="admob-udhaar-interstitial"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Udhaar Interstitial Unit ID{" "}
            <span className="text-xs text-muted-foreground font-normal">
              (udhaarInterstitialId)
            </span>
          </label>
          <input
            id="admob-udhaar-interstitial"
            type="text"
            placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
            value={admobUdhaarInterstitialId}
            onChange={(e) => setAdmobUdhaarInterstitialId(e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring font-mono"
            data-ocid="admin.udhaar_admob_interstitial_input"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            यह Interstitial Ad transaction save hone ke baad aur WhatsApp share
            ke baad show hogi.
          </p>
        </div>
        <button
          type="button"
          onClick={saveAdmobIds}
          className="bg-primary text-primary-foreground font-bold px-5 py-3 rounded-xl text-sm hover:opacity-90 transition-opacity"
          data-ocid="admin.udhaar_admob_save"
        >
          Udhaar AdMob IDs Save Karein
        </button>
        {(admobUdhaarBannerId || admobUdhaarInterstitialId) && (
          <div className="text-xs text-muted-foreground break-all bg-muted rounded-lg px-3 py-2 space-y-1">
            {admobUdhaarBannerId && (
              <p>
                Banner: <span className="font-mono">{admobUdhaarBannerId}</span>
              </p>
            )}
            {admobUdhaarInterstitialId && (
              <p>
                Interstitial:{" "}
                <span className="font-mono">{admobUdhaarInterstitialId}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// EARNING DASHBOARD SECTION WRAPPER
// ============================================================
function EarningDashboardSection() {
  return <EarningDashboardComponent />;
}

// ============================================================
// CUSTOM CODE MANAGER SECTION
// ============================================================
interface CustomCodeEntry {
  id: string;
  btnLabel: string;
  code: string;
  placement: "top" | "middle" | "bottom";
  enabled: boolean;
  createdAt: number;
}

function CustomCodeManagerSection() {
  const { data: canisterCodes } = useCustomCodes();
  const addCustomCodeMutation = useAddCustomCode();
  const updateCustomCodeMutation = useUpdateCustomCode();
  const deleteCustomCodeMutation = useDeleteCustomCode();

  const readLocal = (): CustomCodeEntry[] => {
    try {
      return JSON.parse(localStorage.getItem("dz_custom_codes") ?? "[]");
    } catch {
      return [];
    }
  };

  const [entries, setEntries] = useState<CustomCodeEntry[]>(readLocal);
  const [btnLabel, setBtnLabel] = useState("");
  const [code, setCode] = useState("");
  const [placement, setPlacement] = useState<"top" | "middle" | "bottom">(
    "middle",
  );
  const [editingId, setEditingId] = useState<string | null>(null);

  // Sync canister data into local state when it arrives
  useEffect(() => {
    if (canisterCodes && canisterCodes.length > 0) {
      const mapped: CustomCodeEntry[] = canisterCodes.map((c) => ({
        id: String(c.id),
        btnLabel: c.btnLabel,
        code: c.code,
        placement: (c.placement as "top" | "middle" | "bottom") ?? "middle",
        enabled: c.enabled,
        createdAt: c.id,
      }));
      setEntries(mapped);
      localStorage.setItem("dz_custom_codes", JSON.stringify(mapped));
    }
  }, [canisterCodes]);

  const saveEntries = (updated: CustomCodeEntry[]) => {
    setEntries(updated);
    localStorage.setItem("dz_custom_codes", JSON.stringify(updated));
    broadcastSettingsChange();
  };

  const handleSave = async () => {
    if (!btnLabel.trim()) {
      toast.error("Label/naam dena zaroori hai");
      return;
    }
    if (!code.trim()) {
      toast.error("Code dena zaroori hai");
      return;
    }
    try {
      if (editingId) {
        await updateCustomCodeMutation.mutateAsync({
          id: Number(editingId),
          name: btnLabel.trim(),
          code: code.trim(),
          btnLabel: btnLabel.trim(),
          icon: "⚡",
          placement,
          enabled: true,
        });
        saveEntries(
          entries.map((e) =>
            e.id === editingId
              ? {
                  ...e,
                  btnLabel: btnLabel.trim(),
                  code: code.trim(),
                  placement,
                }
              : e,
          ),
        );
        toast.success("Code update ho gaya!");
        setEditingId(null);
      } else {
        await addCustomCodeMutation.mutateAsync({
          name: btnLabel.trim(),
          code: code.trim(),
          btnLabel: btnLabel.trim(),
          icon: "⚡",
          placement,
        });
        toast.success("Custom code add ho gaya! Homepage par dikh raha hai.");
      }
    } catch {
      // Canister not available — localStorage only
      if (editingId) {
        saveEntries(
          entries.map((e) =>
            e.id === editingId
              ? {
                  ...e,
                  btnLabel: btnLabel.trim(),
                  code: code.trim(),
                  placement,
                }
              : e,
          ),
        );
        toast.success("Code update ho gaya!");
        setEditingId(null);
      } else {
        const newEntry: CustomCodeEntry = {
          id: Date.now().toString(),
          btnLabel: btnLabel.trim(),
          code: code.trim(),
          placement,
          enabled: true,
          createdAt: Date.now(),
        };
        saveEntries([...entries, newEntry]);
        toast.success("Custom code add ho gaya! Homepage par dikh raha hai.");
      }
    }
    setBtnLabel("");
    setCode("");
    setPlacement("middle");
  };

  const handleEdit = (entry: CustomCodeEntry) => {
    setEditingId(entry.id);
    setBtnLabel(entry.btnLabel);
    setCode(entry.code);
    setPlacement(entry.placement);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomCodeMutation.mutateAsync(Number(id));
    } catch {
      saveEntries(entries.filter((e) => e.id !== id));
    }
    broadcastSettingsChange();
    toast.success("Code delete ho gaya.");
  };

  const handleToggle = async (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    try {
      await updateCustomCodeMutation.mutateAsync({
        id: Number(id),
        name: entry.btnLabel,
        code: entry.code,
        btnLabel: entry.btnLabel,
        icon: "⚡",
        placement: entry.placement,
        enabled: !entry.enabled,
      });
    } catch {
      saveEntries(
        entries.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e)),
      );
    }
    broadcastSettingsChange();
  };

  const handleCancel = () => {
    setEditingId(null);
    setBtnLabel("");
    setCode("");
    setPlacement("middle");
  };

  const placementLabels = {
    top: "Top (Hero ke upar)",
    middle: "Middle (Category ke baad)",
    bottom: "Bottom (Footer ke pehle)",
  };

  return (
    <div className="space-y-5">
      {/* Add / Edit Form */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
        <h3 className="font-heading font-bold text-foreground text-base">
          {editingId ? "✏️ Code Edit Karein" : "➕ Naya Custom Code Add Karein"}
        </h3>
        <p className="text-xs text-muted-foreground">
          Koi bhi HTML, JS, ya CSS code paste karein — Homepage par
          automatically button ban jaayega.
        </p>
        <div>
          <label
            htmlFor="cc-label"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Label / Button Naam *
          </label>
          <input
            id="cc-label"
            data-ocid="admin.input"
            type="text"
            value={btnLabel}
            onChange={(e) => setBtnLabel(e.target.value)}
            placeholder="jaise: WhatsApp Float Button"
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label
            htmlFor="cc-placement"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Placement — Kahan Dikhega *
          </label>
          <select
            id="cc-placement"
            data-ocid="admin.input"
            value={placement}
            onChange={(e) =>
              setPlacement(e.target.value as "top" | "middle" | "bottom")
            }
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-white"
          >
            <option value="top">Top — Hero Carousel ke pehle</option>
            <option value="middle">Middle — Category Grid ke baad</option>
            <option value="bottom">Bottom — Footer ke pehle</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="cc-code"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            HTML / JS / CSS Code *
          </label>
          <textarea
            id="cc-code"
            data-ocid="admin.input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={
              "<a href='https://wa.me/...' style='position:fixed;bottom:20px;right:20px;z-index:9999'>💬 WhatsApp</a>"
            }
            rows={6}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring font-mono resize-y"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            data-ocid="admin.button"
            onClick={handleSave}
            className="flex-1 bg-primary text-primary-foreground font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity"
          >
            {editingId ? "✅ Update Code" : "💾 Save & Add to Homepage"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Saved Entries */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-3">
        <h3 className="font-heading font-bold text-foreground text-base">
          📋 Saved Custom Codes ({entries.length})
        </h3>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            Abhi koi custom code nahi hai. Upar form se add karein.
          </p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                data-ocid="admin.list_item"
                className={`rounded-xl border p-4 space-y-2 ${entry.enabled ? "border-emerald-200 bg-emerald-50/30" : "border-gray-200 bg-gray-50 opacity-60"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {entry.btnLabel}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      📍 {placementLabels[entry.placement]} &nbsp;|&nbsp;{" "}
                      {entry.enabled ? "✅ ON" : "⛔ OFF"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      data-ocid="admin.toggle_button"
                      onClick={() => handleToggle(entry.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${entry.enabled ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
                    >
                      {entry.enabled ? "OFF" : "ON"}
                    </button>
                    <button
                      type="button"
                      data-ocid="admin.button"
                      onClick={() => handleEdit(entry)}
                      className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                      aria-label="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      data-ocid="admin.button"
                      onClick={() => handleDelete(entry.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <pre className="text-xs text-muted-foreground bg-white border border-border rounded-lg px-3 py-2 overflow-x-auto max-h-20 whitespace-pre-wrap break-all">
                  {entry.code.slice(0, 200)}
                  {entry.code.length > 200 ? "..." : ""}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info card */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <p className="text-sm font-medium text-blue-800">
          💡 Custom Code Kaise Kaam Karta Hai
        </p>
        <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc list-inside">
          <li>
            Koi bhi HTML tag (button, link, image, etc.) yahan paste karein
          </li>
          <li>
            JS code bhi kaam karta hai — popup, floating button, timer, sab kuch
          </li>
          <li>CSS inject karna ho to &lt;style&gt; tag mein wrap karein</li>
          <li>Placement choose karein — top, middle, ya bottom</li>
          <li>ON/OFF toggle se turant Homepage par show/hide hoga</li>
        </ul>
      </div>
    </div>
  );
}

// ---- Ludo & Game Settings Section ----
function LudoSettingsSection() {
  const [ludoEnabled, setLudoEnabled] = useState<boolean>(
    () => localStorage.getItem("dz_ludo_enabled") !== "false",
  );
  const [rewardsEnabled, setRewardsEnabled] = useState<boolean>(
    () => localStorage.getItem("dz_ludo_rewards_enabled") !== "false",
  );
  const [firebaseUrl, setFirebaseUrl] = useState<string>(
    () => localStorage.getItem("dz_firebase_config_url") ?? "",
  );
  const [admobConfig, setAdmobConfig] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("dz_admob_config") ?? "{}",
      ) as Record<string, string>;
    } catch {
      return {};
    }
  });
  const [fbSaving, setFbSaving] = useState(false);

  // Dynamic Reward Controls
  const [pointsPerAd, setPointsPerAd] = useState<string>(
    () => localStorage.getItem("dz_ludo_points_per_ad") ?? "10",
  );
  const [redemptionRate, setRedemptionRate] = useState<string>(
    () => localStorage.getItem("dz_ludo_redemption_rate") ?? "100",
  );
  const [minWithdrawal, setMinWithdrawal] = useState<string>(
    () => localStorage.getItem("dz_ludo_min_withdrawal") ?? "100",
  );
  const [rewardCtrlSaving, setRewardCtrlSaving] = useState(false);

  const { data: allRequests, isLoading: reqLoading } =
    useGetAllLudoRedemptionRequests();
  const { data: firebaseLinkData } = useGetFirebaseConfigLink();
  const setFirebaseLink = useSetFirebaseConfigLink();
  const updateStatus = useUpdateLudoRedemptionStatus();

  useEffect(() => {
    if (firebaseLinkData) setFirebaseUrl(firebaseLinkData);
  }, [firebaseLinkData]);

  const handleLudoToggle = (val: boolean) => {
    setLudoEnabled(val);
    localStorage.setItem("dz_ludo_enabled", val ? "true" : "false");
    broadcastSettingsChange();
    toast.success(`Ludo Game ${val ? "ON" : "OFF"} ho gaya!`);
  };

  const handleRewardsToggle = (val: boolean) => {
    setRewardsEnabled(val);
    localStorage.setItem("dz_ludo_rewards_enabled", val ? "true" : "false");
    broadcastSettingsChange();
    toast.success(`Reward System ${val ? "ON" : "OFF"} ho gaya!`);
  };

  const handleAdmobSave = (key: string, val: string) => {
    const updated = { ...admobConfig, [key]: val };
    setAdmobConfig(updated);
    localStorage.setItem("dz_admob_config", JSON.stringify(updated));
    broadcastSettingsChange();
  };

  const handleRewardCtrlSave = () => {
    setRewardCtrlSaving(true);
    const ppe = Number.parseInt(pointsPerAd, 10);
    const rr = Number.parseInt(redemptionRate, 10);
    const mw = Number.parseInt(minWithdrawal, 10);
    if (Number.isNaN(ppe) || ppe < 1) {
      toast.error("Points Per Ad valid number hona chahiye (min 1)");
      setRewardCtrlSaving(false);
      return;
    }
    if (Number.isNaN(rr) || rr < 1) {
      toast.error("Redemption Rate valid number hona chahiye (min 1)");
      setRewardCtrlSaving(false);
      return;
    }
    if (Number.isNaN(mw) || mw < 1) {
      toast.error("Minimum Withdrawal valid number hona chahiye (min 1)");
      setRewardCtrlSaving(false);
      return;
    }
    localStorage.setItem("dz_ludo_points_per_ad", String(ppe));
    localStorage.setItem("dz_ludo_redemption_rate", String(rr));
    localStorage.setItem("dz_ludo_min_withdrawal", String(mw));
    broadcastSettingsChange();
    setTimeout(() => {
      setRewardCtrlSaving(false);
      toast.success("Dynamic Reward Controls save ho gaye!");
    }, 300);
  };

  const handleFirebaseSave = async () => {
    setFbSaving(true);
    try {
      await setFirebaseLink.mutateAsync(firebaseUrl);
      toast.success("Firebase Config Link save ho gaya!");
      broadcastSettingsChange();
    } catch {
      localStorage.setItem("dz_firebase_config_url", firebaseUrl);
      toast.success("Firebase Config Link save ho gaya (local)!");
    } finally {
      setFbSaving(false);
    }
  };

  const handleApprove = async (req: LudoRedemptionRequest) => {
    try {
      await updateStatus.mutateAsync({ requestId: req.id, status: "approved" });
      toast.success(`${req.userName} ki request approve ho gayi!`);
    } catch {
      toast.error("Status update nahi ho saca");
    }
  };

  const handleReject = async (req: LudoRedemptionRequest) => {
    try {
      await updateStatus.mutateAsync({ requestId: req.id, status: "rejected" });
      toast.success("Request reject ho gayi.");
    } catch {
      toast.error("Status update nahi ho saca");
    }
  };

  const statusBadge = (status: LudoRedemptionRequest["status"]) => {
    if (status === "approved")
      return (
        <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
          ✅ Approved
        </span>
      );
    if (status === "rejected")
      return (
        <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
          ❌ Rejected
        </span>
      );
    return (
      <span className="text-xs bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded-full">
        🕐 Pending
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Toggle 1: Enable/Disable Ludo Game */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-heading font-bold text-foreground text-base">
              🎲 Ludo Game Enable/Disable
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ludoEnabled
                ? "Ludo Game ON hai — Sidebar mein dikh raha hai"
                : "Ludo Game OFF hai — Sidebar mein nahi dikhega"}
            </p>
          </div>
          <button
            type="button"
            data-ocid="admin.ludo_toggle"
            onClick={() => handleLudoToggle(!ludoEnabled)}
            className={`relative w-14 h-7 rounded-full transition-colors focus:outline-none ${
              ludoEnabled ? "bg-emerald-500" : "bg-gray-300"
            }`}
            aria-label="Ludo game toggle"
          >
            <span
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                ludoEnabled ? "translate-x-7" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Toggle 2: Enable/Disable Reward System */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-heading font-bold text-foreground text-base">
              🎁 Reward System Enable/Disable
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {rewardsEnabled
                ? "Rewards ON hain — Points earn aur redeem ho sakte hain"
                : "Rewards OFF hain — Wallet aur points band hain"}
            </p>
          </div>
          <button
            type="button"
            data-ocid="admin.rewards_toggle"
            onClick={() => handleRewardsToggle(!rewardsEnabled)}
            className={`relative w-14 h-7 rounded-full transition-colors focus:outline-none ${
              rewardsEnabled ? "bg-emerald-500" : "bg-gray-300"
            }`}
            aria-label="Reward system toggle"
          >
            <span
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                rewardsEnabled ? "translate-x-7" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Dynamic Reward Controls */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
        <div>
          <h3 className="font-heading font-bold text-foreground text-base flex items-center gap-2">
            🎯 Dynamic Reward Controls
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Yahan se rewards ke values control karein — users ke app mein 1-2
            seconds mein update ho jaayenge.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label
              htmlFor="ppa-input"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Points Per Ad (Har rewarded ad par kitne points milenge)
            </label>
            <input
              id="ppa-input"
              data-ocid="admin.points_per_ad_input"
              type="number"
              min={1}
              value={pointsPerAd}
              onChange={(e) => setPointsPerAd(e.target.value)}
              placeholder="10"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Default: 10 — User ko har ad dekhne par itne points milenge
            </p>
          </div>
          <div>
            <label
              htmlFor="rr-input"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Redemption Rate (Kitne Points = ₹1)
            </label>
            <input
              id="rr-input"
              data-ocid="admin.redemption_rate_input"
              type="number"
              min={1}
              value={redemptionRate}
              onChange={(e) => setRedemptionRate(e.target.value)}
              placeholder="100"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Default: 100 — Matlab 100 points = ₹1 milenge
            </p>
          </div>
          <div>
            <label
              htmlFor="mw-input"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Minimum Withdrawal (Redeem karne ke liye minimum points)
            </label>
            <input
              id="mw-input"
              data-ocid="admin.min_withdrawal_input"
              type="number"
              min={1}
              value={minWithdrawal}
              onChange={(e) => setMinWithdrawal(e.target.value)}
              placeholder="100"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Default: 100 — Users ko kam se kam itne points chahiye redeem
              karne ke liye
            </p>
          </div>
        </div>
        <button
          type="button"
          data-ocid="admin.reward_ctrl_save_btn"
          onClick={handleRewardCtrlSave}
          disabled={rewardCtrlSaving}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-60 transition-colors"
        >
          {rewardCtrlSaving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <CheckCircle size={14} />
          )}
          Reward Controls Save Karein
        </button>
      </div>

      {/* Firebase Config Link */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
          🔥 Firebase Config Link
        </h3>
        <p className="text-xs text-muted-foreground">
          Apna Firebase config URL yahan paste karein. Isse app ko database se
          connect kiya jaayega bina code change kiye.
        </p>
        <div>
          <label
            htmlFor="fb-config-url"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Firebase Config URL
          </label>
          <input
            id="fb-config-url"
            data-ocid="admin.firebase_config_input"
            type="url"
            value={firebaseUrl}
            onChange={(e) => setFirebaseUrl(e.target.value)}
            placeholder="https://your-project.firebaseio.com/..."
            className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="button"
          data-ocid="admin.firebase_save_btn"
          onClick={handleFirebaseSave}
          disabled={fbSaving}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-60"
        >
          {fbSaving ? <Loader2 size={14} className="animate-spin" /> : null}🔥
          Firebase Config Save Karein
        </button>
      </div>

      {/* Ludo AdMob IDs */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
        <h3 className="font-heading font-semibold text-foreground">
          📱 Ludo AdMob Configuration
        </h3>
        <div className="space-y-3">
          <div>
            <label
              htmlFor="ludo-banner-id"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Ludo Banner Ad Unit ID
            </label>
            <input
              id="ludo-banner-id"
              data-ocid="admin.ludo_banner_id_input"
              type="text"
              value={admobConfig.ludoBannerId ?? ""}
              onChange={(e) => handleAdmobSave("ludoBannerId", e.target.value)}
              placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Game screen ke bottom mein banner ad ke liye
            </p>
          </div>
          <div>
            <label
              htmlFor="ludo-interstitial-id"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Ludo Interstitial Ad Unit ID
            </label>
            <input
              id="ludo-interstitial-id"
              data-ocid="admin.ludo_interstitial_id_input"
              type="text"
              value={admobConfig.ludoInterstitialId ?? ""}
              onChange={(e) =>
                handleAdmobSave("ludoInterstitialId", e.target.value)
              }
              placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Match khatam hone ke baad interstitial ad ke liye
            </p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-700 font-medium">
            💡 IDs save hote hi automatically apply ho jaati hain. Baad mein
            real Google AdMob account se actual IDs replace karein.
          </p>
        </div>
      </div>

      {/* Payout Requests */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
          💸 Payout Requests (UPI Withdrawal)
          {allRequests &&
            allRequests.filter((r) => r.status === "pending").length > 0 && (
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {allRequests.filter((r) => r.status === "pending").length}{" "}
                Pending
              </span>
            )}
        </h3>

        {reqLoading ? (
          <div
            data-ocid="admin.loading_state"
            className="flex justify-center py-6"
          >
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : !allRequests || allRequests.length === 0 ? (
          <div
            data-ocid="admin.empty_state"
            className="text-center py-10 text-muted-foreground"
          >
            <p className="text-3xl mb-2">💸</p>
            <p className="font-medium">Koi payout request nahi hai abhi</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allRequests.map((req, i) => (
              <div
                key={req.id}
                data-ocid={`admin.payout_item.${i + 1}`}
                className="border border-border rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">
                      {req.userName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      UPI:{" "}
                      <span className="font-mono font-medium">{req.upiId}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {req.pointsRequested} pts → ₹{req.amountInr}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(req.createdAt).toLocaleDateString("hi-IN")}
                    </p>
                  </div>
                  <div className="flex-shrink-0">{statusBadge(req.status)}</div>
                </div>
                {req.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      data-ocid={`admin.approve_payout.${i + 1}`}
                      onClick={() => handleApprove(req)}
                      disabled={updateStatus.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-2 rounded-xl disabled:opacity-60"
                    >
                      <CheckCircle size={13} /> Approve &amp; Pay
                    </button>
                    <button
                      type="button"
                      data-ocid={`admin.reject_payout.${i + 1}`}
                      onClick={() => handleReject(req)}
                      disabled={updateStatus.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-bold px-3 py-2 rounded-xl hover:bg-red-100 disabled:opacity-60"
                    >
                      <XCircle size={13} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";
  // Register queryClient so broadcastSettingsChange can invalidate React Query caches
  useRegisterQueryClient();

  // Manager sees only approvals & chat
  const ALL_NAV_ITEMS: {
    key: AdminSection;
    label: string;
    icon: React.ReactNode;
    managerVisible?: boolean;
  }[] = [
    {
      key: "founder",
      label: "Founder Settings",
      icon: <Star size={18} />,
    },
    {
      key: "categoryManager",
      label: "Category Manager",
      icon: <Layout size={18} />,
      managerVisible: true,
    },
    {
      key: "users",
      label: "User Management",
      icon: <Users size={18} />,
    },
    {
      key: "search",
      label: "Global Search",
      icon: <Search size={18} />,
    },
    {
      key: "approvals",
      label: "Provider Approvals",
      icon: <CheckSquare size={18} />,
      managerVisible: true,
    },
    {
      key: "controls",
      label: "Homepage Controls",
      icon: <Layout size={18} />,
      managerVisible: true,
    },
    {
      key: "banners",
      label: "Ads Banner Manager",
      icon: <Image size={18} />,
    },
    {
      key: "settings",
      label: "Settings",
      icon: <Settings size={18} />,
    },
    {
      key: "pricing",
      label: "Subscription Pricing",
      icon: <DollarSign size={18} />,
    },
    {
      key: "staff",
      label: "Staff Management",
      icon: <UserCog size={18} />,
    },
    {
      key: "ads",
      label: "Ads Manager",
      icon: <DollarSign size={18} />,
    },
    {
      key: "chat" as AdminSection,
      label: "Chat",
      icon: <MessageCircle size={18} />,
      managerVisible: true,
    },
    {
      key: "socialMedia" as AdminSection,
      label: "Social Media",
      icon: <Share2 size={18} />,
    },
    {
      key: "affiliateMarketing" as AdminSection,
      label: "Affiliate Marketing",
      icon: <TrendingUp size={18} />,
    },
    {
      key: "ebookManager" as AdminSection,
      label: "📚 eBook Store",
      icon: <BookOpen size={18} />,
    },
    {
      key: "appSettings" as AdminSection,
      label: "⚙️ App Settings",
      icon: <Settings size={18} />,
    },
    {
      key: "scrapRates" as AdminSection,
      label: "♻️ Scrap Rates",
      icon: <Calculator size={18} />,
    },
    {
      key: "homepageControls" as AdminSection,
      label: "🏠 Homepage Controls",
      icon: <Layout size={18} />,
    },
    {
      key: "announcements" as AdminSection,
      label: "📢 Announcements",
      icon: <MessageSquare size={18} />,
    },
    {
      key: "delivery" as AdminSection,
      label: "🚴 Delivery Module",
      icon: <span>🚴</span>,
    },
    {
      key: "googleSheets" as AdminSection,
      label: "📊 Google Sheets",
      icon: <span>📊</span>,
    },
    {
      key: "notificationBar" as AdminSection,
      label: "🔔 Notification Bar",
      icon: <span>🔔</span>,
    },
    {
      key: "newsManager" as AdminSection,
      label: "📰 News Manager",
      icon: <span>📰</span>,
      managerVisible: true,
    },
    {
      key: "jobsManager" as AdminSection,
      label: "💼 Jobs Manager",
      icon: <span>💼</span>,
      managerVisible: true,
    },
    {
      key: "masterToggles" as AdminSection,
      label: "🎛️ Master Controls",
      icon: <span>🎛️</span>,
    },
    {
      key: "udhaarBook" as AdminSection,
      label: "📔 Udhaar Book Settings",
      icon: <span>📔</span>,
    },
    {
      key: "earningDashboard" as AdminSection,
      label: "📊 Earning Dashboard",
      icon: <span>📊</span>,
    },
    {
      key: "customCode" as AdminSection,
      label: "⚡ Custom Code",
      icon: <span>⚡</span>,
    },
    {
      key: "ludoSettings" as AdminSection,
      label: "🎲 Ludo & Game Settings",
      icon: <span>🎲</span>,
    },
  ];

  const NAV_ITEMS = isManager
    ? ALL_NAV_ITEMS.filter((n) => n.managerVisible)
    : ALL_NAV_ITEMS;

  const searchParams = new URLSearchParams(window.location.search);
  const initialSection =
    (searchParams.get("section") as AdminSection) || "categoryManager";
  const [section, setSection] = useState<AdminSection>(
    isManager ? "approvals" : initialSection,
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem("adminVerified");
    navigate("/login");
  };

  const currentNav = ALL_NAV_ITEMS.find((n) => n.key === section);

  const renderSection = () => {
    switch (section) {
      case "founder":
        return <FounderSettingsSection />;
      case "categoryManager":
        return <CategoryManagerSection />;
      case "users":
        return <UserManagement />;
      case "search":
        return <GlobalSearch />;
      case "approvals":
        return <ProviderApprovals />;
      case "controls":
        return <HomepageControls />;
      case "banners":
        return <BannerManager />;
      case "settings":
        return <AdminSettings />;
      case "pricing":
        return <SubscriptionPricingSection />;
      case "staff":
        return <StaffManagement />;
      case "ads":
        return <AdsManager />;
      case "chat" as AdminSection:
        return <ChatSection />;
      case "socialMedia" as AdminSection:
        return <SocialMediaSection />;
      case "affiliateMarketing" as AdminSection:
        return <AffiliateMarketingSection />;
      case "ebookManager" as AdminSection:
        return <EbookManagerSection />;
      case "appSettings" as AdminSection:
        return <AppSettingsSection />;
      case "scrapRates" as AdminSection:
        return <ScrapRatesSection />;
      case "homepageControls" as AdminSection:
        return <HomepageControlsExtendedSection />;
      case "announcements" as AdminSection:
        return <AnnouncementsSection />;
      case "delivery" as AdminSection:
        return <DeliveryAdminPanel />;
      case "googleSheets" as AdminSection:
        return <GoogleSheetsSection />;
      case "notificationBar" as AdminSection:
        return <NotificationBarSection />;
      case "newsManager" as AdminSection:
        return <NewsManagerSection />;
      case "jobsManager" as AdminSection:
        return <JobsManagerSection />;
      case "masterToggles" as AdminSection:
        return <MasterSectionTogglesSection />;
      case "udhaarBook" as AdminSection:
        return <UdhaarBookSettingsSection />;
      case "earningDashboard" as AdminSection:
        return <EarningDashboardSection />;
      case "customCode" as AdminSection:
        return <CustomCodeManagerSection />;
      case "ludoSettings" as AdminSection:
        return <LudoSettingsSection />;
      default:
        return <UserManagement />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-emerald-header shadow-emerald">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-ocid="admin.open_modal_button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
            >
              <Layout size={20} />
            </button>
            <span className="font-heading font-bold text-white text-lg">
              Digital Zindagi Admin
            </span>
            {isManager && (
              <span className="text-xs bg-blue-500/80 text-white px-2 py-0.5 rounded-full font-semibold">
                Manager
              </span>
            )}
          </div>
          <button
            type="button"
            data-ocid="admin.button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        {/* Sidebar Nav */}
        <aside
          className={`${
            mobileNavOpen ? "fixed inset-0 z-50 bg-black/50" : "hidden"
          } md:static md:block md:z-auto md:bg-transparent`}
        >
          {mobileNavOpen && (
            <button
              type="button"
              className="absolute inset-0 w-full h-full cursor-default"
              onClick={() => setMobileNavOpen(false)}
              onKeyDown={(e) => e.key === "Escape" && setMobileNavOpen(false)}
              aria-label="Close menu"
            />
          )}
          <nav
            className={`${
              mobileNavOpen ? "absolute left-0 top-0 h-full" : ""
            } w-60 bg-white border-r border-border flex flex-col shadow-lg md:shadow-none overflow-y-auto`}
            data-ocid="admin.panel"
          >
            {NAV_ITEMS.map((item) => (
              <button
                type="button"
                key={item.key}
                data-ocid="admin.link"
                onClick={() => {
                  setSection(item.key);
                  setMobileNavOpen(false);
                }}
                className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors text-left ${
                  section === item.key
                    ? "bg-accent text-accent-foreground border-r-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 min-w-0">
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="mb-6">
              <h2 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
                {currentNav?.icon} {currentNav?.label}
              </h2>
            </div>
            {renderSection()}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
