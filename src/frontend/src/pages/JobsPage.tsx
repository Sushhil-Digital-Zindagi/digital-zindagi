import { ArrowLeft, Briefcase, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import SafeWebView from "../components/SafeWebView";
import { useNavigate } from "../lib/router";

export interface JobItem {
  id: string;
  title: string;
  department: string;
  location: string;
  imageUrl: string;
  link: string;
  lastDate: string;
  description: string;
  createdAt: string;
}

export function readJobs(): JobItem[] {
  try {
    return JSON.parse(localStorage.getItem("dz_jobs") ?? "[]");
  } catch {
    return [];
  }
}

export function saveJobs(items: JobItem[]): void {
  localStorage.setItem("dz_jobs", JSON.stringify(items));
}

export default function JobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobItem[]>(readJobs);
  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
  const [webViewTitle, setWebViewTitle] = useState<string>("");

  useEffect(() => {
    const handler = () => setJobs(readJobs());
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, []);

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
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Briefcase size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">
              Sarkari Jobs
            </h1>
            <p className="text-xs text-muted-foreground">
              {jobs.length} vacancies
            </p>
          </div>
        </div>

        {/* Safe WebView notice */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
          <span className="text-base">🔒</span>
          <p className="text-xs text-emerald-700 font-medium">
            Apply Now links ऐप के अंदर खुलेंगे — form data safe rahega
          </p>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <span className="text-5xl mb-4 block">💼</span>
            <p className="font-semibold">Abhi koi job nahi hai</p>
            <p className="text-sm mt-1">Admin Panel se jobs add karein</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
              >
                {job.imageUrl && (
                  <img
                    src={job.imageUrl}
                    alt={job.title}
                    className="w-full h-40 object-cover"
                    loading="lazy"
                  />
                )}
                <div className="p-4">
                  {job.department && (
                    <span className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-0.5 rounded-full mb-2">
                      {job.department}
                    </span>
                  )}
                  <h2 className="font-heading font-bold text-base text-foreground leading-snug mb-1">
                    {job.title}
                  </h2>
                  {job.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {job.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 flex-wrap">
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} /> {job.location}
                      </span>
                    )}
                    {job.lastDate && (
                      <span className="bg-red-50 text-red-600 font-semibold px-2 py-0.5 rounded-lg">
                        Last Date: {job.lastDate}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(job.createdAt).toLocaleDateString("hi-IN")}
                    </span>
                    {job.link && (
                      <button
                        type="button"
                        onClick={() => openSafeLink(job.link, job.title)}
                        className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                      >
                        🔒 Apply Now (Safe)
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
