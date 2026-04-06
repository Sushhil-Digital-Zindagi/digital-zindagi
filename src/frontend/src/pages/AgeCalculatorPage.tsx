import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { useNavigate } from "../lib/router";

export default function AgeCalculatorPage() {
  const navigate = useNavigate();
  const [dob, setDob] = useState("");
  const [asOf, setAsOf] = useState("");

  const targetDate = asOf || new Date().toISOString().split("T")[0];

  function calcAgeCustom(dobStr: string, toStr: string) {
    if (!dobStr) return null;
    const birthDate = new Date(dobStr);
    const toDate = new Date(toStr);
    if (birthDate > toDate) return null;

    let years = toDate.getFullYear() - birthDate.getFullYear();
    let months = toDate.getMonth() - birthDate.getMonth();
    let days = toDate.getDate() - birthDate.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(toDate.getFullYear(), toDate.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    return { years, months, days };
  }

  const result = dob ? calcAgeCustom(dob, targetDate) : null;

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
        >
          <ArrowLeft size={16} /> Home
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-xl">🎂</span>
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">
              Age Calculator
            </h1>
            <p className="text-xs text-muted-foreground">
              Apni sahi umra janein — Saal, Mahine, Din mein
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 space-y-4">
          <div>
            <label
              htmlFor="dob"
              className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
            >
              Janm Tithi (Date of Birth) *
            </label>
            <input
              id="dob"
              type="date"
              value={dob}
              max={todayStr}
              onChange={(e) => setDob(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-white"
            />
          </div>

          <div>
            <label
              htmlFor="asOf"
              className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
            >
              Kis Tarikh Ko Umra Janein? (optional)
            </label>
            <input
              id="asOf"
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-white"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Khaali chhodo to aaj ki tarikh use hogi
            </p>
          </div>

          {result ? (
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl p-5">
              <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-4 text-center">
                🎉 Aapki Umra
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-teal-100">
                  <p className="font-heading font-bold text-3xl text-teal-700">
                    {result.years}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium mt-1">
                    Saal
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-teal-100">
                  <p className="font-heading font-bold text-3xl text-emerald-600">
                    {result.months}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium mt-1">
                    Mahine
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-teal-100">
                  <p className="font-heading font-bold text-3xl text-green-600">
                    {result.days}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium mt-1">
                    Din
                  </p>
                </div>
              </div>
              <p className="text-center text-sm text-teal-600 font-medium mt-4">
                Aap {result.years} saal {result.months} mahine {result.days} din
                ke hain
              </p>
            </div>
          ) : dob ? (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center text-sm text-red-600 font-medium">
              Galat tarikh! Janm tithi aaj se pehle honi chahiye.
            </div>
          ) : (
            <div className="bg-muted rounded-xl px-4 py-6 text-center text-muted-foreground text-sm">
              <span className="text-3xl block mb-2">📅</span>
              Apni janm tithi dalein — umra turant pata chalegi
            </div>
          )}
        </div>

        {/* Quick Info */}
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-xs text-amber-700 font-medium">
            💡 <strong>Sarkari Form ke liye:</strong> Aaj ki tarikh mein apni
            date of birth dalein — age certificate ke liye sahi umra milegi.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
