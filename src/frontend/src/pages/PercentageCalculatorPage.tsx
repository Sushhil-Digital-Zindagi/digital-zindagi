import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { useNavigate } from "../lib/router";

type CalcMode = "marks" | "whatpct" | "change";

export default function PercentageCalculatorPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<CalcMode>("marks");

  // Mode 1: Marks percentage
  const [marks, setMarks] = useState("");
  const [total, setTotal] = useState("");

  // Mode 2: What % of
  const [partOf, setPartOf] = useState("");
  const [wholeOf, setWholeOf] = useState("");

  // Mode 3: % change
  const [oldVal, setOldVal] = useState("");
  const [newVal, setNewVal] = useState("");

  const modeButtons: { id: CalcMode; label: string; emoji: string }[] = [
    { id: "marks", label: "Marks %", emoji: "📊" },
    { id: "whatpct", label: "Kitna %?", emoji: "❓" },
    { id: "change", label: "% Badlav", emoji: "📈" },
  ];

  function calcMarks() {
    const m = Number.parseFloat(marks);
    const t = Number.parseFloat(total);
    if (Number.isNaN(m) || Number.isNaN(t) || t === 0) return null;
    return ((m / t) * 100).toFixed(2);
  }

  function calcWhatPct() {
    const p = Number.parseFloat(partOf);
    const w = Number.parseFloat(wholeOf);
    if (Number.isNaN(p) || Number.isNaN(w) || w === 0) return null;
    return ((p / w) * 100).toFixed(2);
  }

  function calcChange() {
    const o = Number.parseFloat(oldVal);
    const n = Number.parseFloat(newVal);
    if (Number.isNaN(o) || Number.isNaN(n) || o === 0) return null;
    const pct = ((n - o) / o) * 100;
    return { pct: Math.abs(pct).toFixed(2), increased: pct >= 0 };
  }

  function getGrade(pct: number) {
    if (pct >= 90)
      return { grade: "A+", color: "text-emerald-600", label: "Excellent" };
    if (pct >= 80)
      return { grade: "A", color: "text-green-600", label: "Very Good" };
    if (pct >= 70)
      return { grade: "B+", color: "text-blue-600", label: "Good" };
    if (pct >= 60)
      return { grade: "B", color: "text-indigo-500", label: "Above Average" };
    if (pct >= 50)
      return { grade: "C", color: "text-yellow-600", label: "Average" };
    if (pct >= 33)
      return { grade: "D", color: "text-orange-500", label: "Pass" };
    return { grade: "F", color: "text-red-600", label: "Fail" };
  }

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
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-xl">%</span>
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">
              Percentage Calculator
            </h1>
            <p className="text-xs text-muted-foreground">
              Marks, comparison, increase/decrease
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-2 mb-5">
          {modeButtons.map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setMode(btn.id)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === btn.id
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-white border border-border text-muted-foreground hover:border-indigo-300"
              }`}
            >
              {btn.emoji} {btn.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 space-y-4">
          {mode === "marks" && (
            <>
              <h2 className="font-heading font-semibold text-foreground">
                📊 Marks Percentage Nikalen
              </h2>
              <div>
                <label
                  htmlFor="marks"
                  className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
                >
                  Prapt Ank (Obtained Marks)
                </label>
                <input
                  id="marks"
                  type="number"
                  value={marks}
                  onChange={(e) => setMarks(e.target.value)}
                  placeholder="e.g. 450"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label
                  htmlFor="total"
                  className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
                >
                  Poorn Ank (Total Marks)
                </label>
                <input
                  id="total"
                  type="number"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  placeholder="e.g. 600"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {calcMarks() !== null && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 text-center">
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">
                    Aapka Percentage
                  </p>
                  <p className="font-heading font-bold text-5xl text-indigo-700">
                    {calcMarks()}%
                  </p>
                  {(() => {
                    const g = getGrade(Number.parseFloat(calcMarks()!));
                    return (
                      <div className="mt-3 flex items-center justify-center gap-3">
                        <span className={`font-bold text-2xl ${g.color}`}>
                          Grade: {g.grade}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({g.label})
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}

          {mode === "whatpct" && (
            <>
              <h2 className="font-heading font-semibold text-foreground">
                ❓ Kitna Percent Hai?
              </h2>
              <div>
                <label
                  htmlFor="partOf"
                  className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
                >
                  Pehli Sankhya (Number)
                </label>
                <input
                  id="partOf"
                  type="number"
                  value={partOf}
                  onChange={(e) => setPartOf(e.target.value)}
                  placeholder="e.g. 25"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label
                  htmlFor="wholeOf"
                  className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
                >
                  Doosri Sankhya (of Number)
                </label>
                <input
                  id="wholeOf"
                  type="number"
                  value={wholeOf}
                  onChange={(e) => setWholeOf(e.target.value)}
                  placeholder="e.g. 200"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {calcWhatPct() !== null && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 text-center">
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">
                    {partOf} kitna percent hai {wholeOf} ka?
                  </p>
                  <p className="font-heading font-bold text-5xl text-indigo-700">
                    {calcWhatPct()}%
                  </p>
                </div>
              )}
            </>
          )}

          {mode === "change" && (
            <>
              <h2 className="font-heading font-semibold text-foreground">
                📈 Percentage Badlav (Change)
              </h2>
              <div>
                <label
                  htmlFor="oldVal"
                  className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
                >
                  Purana Mulya (Old Value)
                </label>
                <input
                  id="oldVal"
                  type="number"
                  value={oldVal}
                  onChange={(e) => setOldVal(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label
                  htmlFor="newVal"
                  className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5"
                >
                  Naya Mulya (New Value)
                </label>
                <input
                  id="newVal"
                  type="number"
                  value={newVal}
                  onChange={(e) => setNewVal(e.target.value)}
                  placeholder="e.g. 600"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {calcChange() !== null && (
                <div
                  className={`border rounded-2xl p-5 text-center ${
                    calcChange()!.increased
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <p
                    className={`text-xs font-semibold uppercase tracking-wide mb-2 ${
                      calcChange()!.increased
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    Percentage {calcChange()!.increased ? "Badha" : "Ghata"}
                  </p>
                  <p
                    className={`font-heading font-bold text-5xl ${
                      calcChange()!.increased
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {calcChange()!.increased ? "+" : "-"}
                    {calcChange()!.pct}%
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-xs text-blue-700 font-medium">
            💡 <strong>Exam Tip:</strong> Marks percentage se grade aur division
            pata chalti hai. 33% se upar = Pass, 60%+ = First Division.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
