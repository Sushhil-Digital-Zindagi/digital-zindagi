import { Search } from "lucide-react";
import { motion } from "motion/react";
import {
  ApprovalStatus,
  PlanType,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../backend";
import Footer from "../components/Footer";
import Header from "../components/Header";
import ProviderCard from "../components/ProviderCard";
import { useSearchUsers } from "../hooks/useQueries";
import { useSearchParams } from "../lib/router";

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const { data: users, isLoading } = useSearchUsers(q);

  const providers = users?.filter((u) => u.role === "provider") ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Search size={20} className="text-muted-foreground" />
            <h1 className="font-heading font-bold text-2xl text-foreground">
              &ldquo;{q}&rdquo; ke liye results
            </h1>
          </div>

          {isLoading ? (
            <div
              data-ocid="search.loading_state"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {Array.from({ length: 6 }, (_, i) => `skel-${i}`).map((sk) => (
                <div
                  key={sk}
                  className="h-40 bg-gray-100 animate-pulse rounded-2xl"
                />
              ))}
            </div>
          ) : providers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.map((u, i) => (
                <ProviderCard
                  key={u.id.toString()}
                  profile={{
                    userId: u.id,
                    shopName: u.name,
                    description: "",
                    address: "",
                    category: "",
                    serviceRates: [],
                    subscriptionStatus: SubscriptionStatus.active,
                    subscriptionPlan: SubscriptionPlan.oneMonth,
                    approvalStatus: ApprovalStatus.approved,
                    photos: [],
                    upiId: "",
                    planType: PlanType.pending,
                  }}
                  user={u}
                  index={i + 1}
                />
              ))}
            </div>
          ) : (
            <div
              data-ocid="search.empty_state"
              className="text-center py-20 text-muted-foreground"
            >
              <Search size={48} className="mx-auto mb-4 opacity-30" />
              <p className="font-semibold text-lg">Koi result nahi mila</p>
              <p className="text-sm mt-1">
                &ldquo;{q}&rdquo; ke liye koi provider nahi mila
              </p>
            </div>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
