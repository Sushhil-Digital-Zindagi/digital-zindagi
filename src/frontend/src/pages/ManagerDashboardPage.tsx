import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut, Users } from "lucide-react";
import { motion } from "motion/react";
import { ApprovalStatus } from "../backend";
import { useAuth } from "../contexts/AuthContext";
import {
  useActiveProviders,
  useProvidersPendingApproval,
} from "../hooks/useQueries";
import { useNavigate } from "../lib/router";

export default function ManagerDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: activeProviders, isLoading: loadingActive } =
    useActiveProviders();
  const { data: pendingProviders, isLoading: loadingPending } =
    useProvidersPendingApproval();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isLoading = loadingActive || loadingPending;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header
        className="bg-emerald-header text-white px-4 py-4 sticky top-0 z-20"
        data-ocid="manager.section"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2">
              <Users size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-base leading-tight">
                Manager Dashboard
              </h1>
              <p className="text-white/70 text-xs">{user?.name}</p>
            </div>
          </div>
          <button
            type="button"
            data-ocid="manager.secondary_button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 w-full flex-1 space-y-8">
        {isLoading ? (
          <div
            data-ocid="manager.loading_state"
            className="flex items-center justify-center py-24"
          >
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Pending Providers */}
            <section data-ocid="manager.section">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading font-bold text-lg text-foreground">
                  Pending Approval
                </h2>
                <Badge variant="secondary" className="text-xs">
                  {pendingProviders?.length ?? 0}
                </Badge>
              </div>
              {pendingProviders && pendingProviders.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3"
                >
                  {pendingProviders.map((p, i) => (
                    <div
                      key={p.userId.toString()}
                      data-ocid={`manager.item.${i + 1}`}
                      className="bg-white rounded-2xl border border-amber-200 shadow-xs p-4 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {p.shopName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {p.category} &bull; {p.address}
                        </p>
                      </div>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs flex-shrink-0">
                        Pending
                      </Badge>
                    </div>
                  ))}
                </motion.div>
              ) : (
                <div
                  data-ocid="manager.empty_state"
                  className="text-center py-10 text-muted-foreground bg-white rounded-2xl border border-border"
                >
                  <p className="text-sm">Koi pending provider nahi hai</p>
                </div>
              )}
            </section>

            {/* Active Providers */}
            <section data-ocid="manager.section">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading font-bold text-lg text-foreground">
                  Active Providers
                </h2>
                <Badge variant="secondary" className="text-xs">
                  {activeProviders?.length ?? 0}
                </Badge>
              </div>
              {activeProviders && activeProviders.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3"
                >
                  {activeProviders.map((p, i) => (
                    <div
                      key={p.userId.toString()}
                      data-ocid={`manager.item.${i + 1}`}
                      className="bg-white rounded-2xl border border-border shadow-xs p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {p.shopName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {p.category} &bull; {p.address}
                          </p>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs flex-shrink-0">
                          Active
                        </Badge>
                      </div>
                      {p.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {p.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-3">
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg"
                          style={{
                            background:
                              p.approvalStatus === ApprovalStatus.approved
                                ? "oklch(0.92 0.1 155)"
                                : "oklch(0.96 0.03 80)",
                            color:
                              p.approvalStatus === ApprovalStatus.approved
                                ? "oklch(0.3 0.12 155)"
                                : "oklch(0.5 0.1 80)",
                          }}
                        >
                          {p.approvalStatus === ApprovalStatus.approved
                            ? "✓ Approved"
                            : p.approvalStatus}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Sub: {p.subscriptionStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : (
                <div
                  data-ocid="manager.empty_state"
                  className="text-center py-10 text-muted-foreground bg-white rounded-2xl border border-border"
                >
                  <p className="text-sm">Koi active provider nahi hai</p>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="bg-emerald-footer text-white/60 text-xs text-center py-4">
        © {new Date().getFullYear()} Digital Zindagi
      </footer>
    </div>
  );
}
