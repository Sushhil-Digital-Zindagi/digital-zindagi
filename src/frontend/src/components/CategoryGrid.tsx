import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link } from "../lib/router";

export const ALL_CATEGORIES = [
  {
    name: "Scrap",
    hinglish: "Kabadiwala",
    emoji: "♻️",
    color: "from-green-400 to-green-600",
  },
  {
    name: "Doctor",
    hinglish: "Online Doctor",
    emoji: "🏥",
    color: "from-red-400 to-red-600",
  },
  {
    name: "Market",
    hinglish: "Local Market",
    emoji: "🛒",
    color: "from-orange-400 to-orange-600",
  },
  {
    name: "Labor",
    hinglish: "Expert Labor",
    emoji: "👷",
    color: "from-yellow-400 to-yellow-600",
  },
  {
    name: "Electronics",
    hinglish: "Electronics",
    emoji: "📱",
    color: "from-blue-400 to-blue-600",
  },
  {
    name: "Plumber",
    hinglish: "Plumber",
    emoji: "🔧",
    color: "from-cyan-400 to-cyan-600",
  },
  {
    name: "Carpenter",
    hinglish: "Carpenter",
    emoji: "🪚",
    color: "from-amber-400 to-amber-600",
  },
  {
    name: "Tutor",
    hinglish: "Online Tutor",
    emoji: "📚",
    color: "from-purple-400 to-purple-600",
  },
  {
    name: "Electrician",
    hinglish: "Electrician",
    emoji: "⚡",
    color: "from-yellow-300 to-yellow-500",
  },
  {
    name: "Painter",
    hinglish: "Painter",
    emoji: "🎨",
    color: "from-pink-400 to-pink-600",
  },
  {
    name: "Tailor",
    hinglish: "Darzi",
    emoji: "✂️",
    color: "from-violet-400 to-violet-600",
  },
  {
    name: "Salon",
    hinglish: "Salon",
    emoji: "💇",
    color: "from-rose-400 to-rose-600",
  },
];

interface AdminCategory {
  id: string | number;
  name: string;
  emoji?: string;
  color?: string;
  enabled?: boolean;
  hinglish?: string;
}

function readAdminCategories(): AdminCategory[] {
  try {
    // Prefer dz_categories_list (admin-managed list with add/edit/remove support)
    const list = localStorage.getItem("dz_categories_list");
    if (list) return JSON.parse(list);
    // Fallback to legacy dz_categories key
    return JSON.parse(localStorage.getItem("dz_categories") ?? "[]");
  } catch {
    return [];
  }
}

function mergeCategories(adminCats: AdminCategory[]) {
  const existingNames = new Set(ALL_CATEGORIES.map((c) => c.name));
  const filtered = adminCats
    .filter((c) => c.enabled !== false)
    .filter((c) => !existingNames.has(c.name))
    .map((c) => ({
      name: c.name,
      hinglish: c.hinglish || c.name,
      emoji: c.emoji || "🏪",
      color: c.color || "from-emerald-400 to-emerald-600",
    }));
  return [...ALL_CATEGORIES, ...filtered];
}

interface Props {
  toggles?: [string, boolean][];
  loading?: boolean;
}

export default function CategoryGrid({ toggles, loading }: Props) {
  const [adminCats, setAdminCats] =
    useState<AdminCategory[]>(readAdminCategories);

  // Re-read admin categories when the window regains focus or settings broadcast fires
  useEffect(() => {
    const onRefresh = () => setAdminCats(readAdminCategories());
    window.addEventListener("focus", onRefresh);
    window.addEventListener("dz-settings-changed", onRefresh);
    return () => {
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("dz-settings-changed", onRefresh);
    };
  }, []);

  const merged = mergeCategories(adminCats);

  const enabledNames = toggles
    ? new Set(toggles.filter(([, v]) => v).map(([k]) => k))
    : null;

  const visible = enabledNames
    ? merged.filter((c) => enabledNames.has(c.name) || enabledNames.size === 0)
    : merged;

  const displayCats = visible.length > 0 ? visible : merged;

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
          <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {displayCats.map((cat, i) => (
        <motion.div
          key={cat.name}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
        >
          <Link
            to={`/category/${encodeURIComponent(cat.name)}`}
            data-ocid={`categories.item.${i + 1}`}
            className="flex items-center gap-3 bg-white rounded-2xl border border-border shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 p-3"
          >
            <div
              className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-xl flex-shrink-0 shadow-sm`}
            >
              {cat.emoji}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm leading-tight truncate">
                {cat.hinglish}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {cat.name}
              </p>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
