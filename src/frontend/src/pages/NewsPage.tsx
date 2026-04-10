import { ArrowLeft, Newspaper } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import SafeWebView from "../components/SafeWebView";
import { useNews } from "../hooks/useQueries";
import { useNavigate } from "../lib/router";
import type { NewsItem } from "../types/appTypes";

export function readNews(): NewsItem[] {
  try {
    return JSON.parse(localStorage.getItem("dz_news") ?? "[]");
  } catch {
    return [];
  }
}

export function saveNews(items: NewsItem[]): void {
  localStorage.setItem("dz_news", JSON.stringify(items));
}

export default function NewsPage() {
  const navigate = useNavigate();
  const { data: rawNews = [] } = useNews();
  const news = rawNews.filter((n) => n.enabled !== false);
  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
  const [webViewTitle, setWebViewTitle] = useState<string>("");

  const openSafeLink = (url: string, title: string) => {
    setWebViewUrl(url);
    setWebViewTitle(title);
  };

  if (webViewUrl) {
    return (
      <SafeWebView
        url={webViewUrl}
        title={webViewTitle}
        onClose={() => setWebViewUrl(null)}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
        >
          <ArrowLeft size={16} /> Home
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Newspaper size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">
              Latest News
            </h1>
            <p className="text-xs text-muted-foreground">
              {news.length} articles
            </p>
          </div>
        </div>

        {news.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <span className="text-5xl mb-4 block">📰</span>
            <p className="font-semibold">Abhi koi news nahi hai</p>
            <p className="text-sm mt-1">Admin Panel se news add karein</p>
          </div>
        ) : (
          <div className="space-y-4">
            {news.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-44 object-cover"
                    loading="lazy"
                  />
                )}
                <div className="p-4">
                  {item.category && (
                    <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full mb-2">
                      {item.category}
                    </span>
                  )}
                  <h2 className="font-heading font-bold text-base text-foreground leading-snug mb-1">
                    {item.title}
                  </h2>
                  {item.summary && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {item.summary}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString("hi-IN")}
                    </span>
                    {item.link && (
                      <button
                        type="button"
                        onClick={() => openSafeLink(item.link, item.title)}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                      >
                        🔒 Read More (Safe)
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
