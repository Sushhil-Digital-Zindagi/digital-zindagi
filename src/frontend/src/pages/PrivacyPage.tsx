import Footer from "../components/Footer";
import Header from "../components/Header";
import { useLanguage } from "../contexts/LanguageContext";

export default function PrivacyPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="bg-emerald-header text-white px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-heading font-bold text-3xl">{t("privacy")}</h1>
          <p className="text-white/70 text-sm mt-2">
            Digital Zindagi aapki privacy ko lekar serious hai.
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-3xl mx-auto px-4 py-10 w-full">
        <div className="space-y-8">
          <section>
            <h2 className="font-heading font-bold text-xl text-foreground mb-3">
              1. Hamara Data Policy
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Digital Zindagi aapka koi bhi personal data — jaise naam, mobile
              number, ya address — kisi bhi third party ko nahi bechta. Aapka
              data sirf platform ke operation ke liye use hota hai, jaise
              profile dikhana ya payment verify karna.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground mb-3">
              2. Kya Data Collect Hota Hai
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Hum collect karte hain: aapka naam, mobile number, role
              (customer/provider), shop details (agar provider hain), aur
              payment screenshots (subscription ke liye). Ye sab data securely
              store hota hai Internet Computer blockchain pe.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground mb-3">
              3. Data Security
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Aapka data Internet Computer (ICP) blockchain pe store hota hai jo
              ki highly secure aur decentralized hai. Passwords SHA-256
              encryption se hash hote hain. Koi bhi plain text password store
              nahi hota.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground mb-3">
              4. Humare Se Contact Karein
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Agar aapko apna data delete karwana ho ya koi privacy concern ho,
              toh hamare support email pe likhein:{" "}
              <a
                href="mailto:support@digitalzindagi.in"
                className="text-primary hover:underline font-medium"
              >
                support@digitalzindagi.in
              </a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
