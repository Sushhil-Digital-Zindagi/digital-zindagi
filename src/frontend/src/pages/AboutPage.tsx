import { Mail, MapPin, Phone } from "lucide-react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { useLanguage } from "../contexts/LanguageContext";

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="bg-emerald-header text-white px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-heading font-bold text-3xl">{t("aboutUs")}</h1>
          <p className="text-white/70 text-sm mt-2">
            Hamare Baare Mein / About Digital Zindagi
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-3xl mx-auto px-4 py-10 w-full">
        <div className="space-y-8">
          <section>
            <h2 className="font-heading font-bold text-xl text-foreground mb-3">
              Hamara Mission
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Digital Zindagi ka mission hai India ke har local business ko
              digital duniya se jodna. Hum chahte hain ki chota dukandaar,
              doctor, electrician, plumber — sabko ek platform mile jahan se woh
              hazaron customers tak pahunch sakein.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground mb-3">
              Hum Kya Karte Hain
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Digital Zindagi ek multi-vendor marketplace hai jahan:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">•</span>
                Customers apne area ke top providers dhundh sakte hain
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">•</span>
                Providers apna digital shop setup kar sakte hain
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">•</span>
                Direct call ya WhatsApp pe connect ho sakte hain
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">•</span>
                Maps pe navigate karke physically bhi mil sakte hain
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground mb-3">
              Technology
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Ye platform Internet Computer (ICP) blockchain pe bana hai, jo
              isko highly secure, decentralized aur censorship-resistant banata
              hai. Aapka data humari nahi, aapki khud ki hai.
            </p>
          </section>

          <section className="bg-white rounded-2xl border border-border shadow-card p-6">
            <h2 className="font-heading font-bold text-xl text-foreground mb-4">
              Humse Sampark Karein
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Phone size={16} className="text-primary flex-shrink-0" />
                <span className="text-foreground">+91 98765 43210</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail size={16} className="text-primary flex-shrink-0" />
                <a
                  href="mailto:support@digitalzindagi.in"
                  className="text-primary hover:underline"
                >
                  support@digitalzindagi.in
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin size={16} className="text-primary flex-shrink-0" />
                <span className="text-foreground">Bharat, India</span>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
