import Footer from "../components/Footer";
import Header from "../components/Header";
import { useLanguage } from "../contexts/LanguageContext";

export default function TermsPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="bg-emerald-header text-white px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-heading font-bold text-3xl">{t("terms")}</h1>
          <p className="text-white/70 text-sm mt-2">
            Upyog Ki Sharten / Terms of Use
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-3xl mx-auto px-4 py-10 w-full">
        <div className="space-y-8">
          <section>
            <h2 className="font-heading font-bold text-xl text-foreground mb-3">
              1. Platform Ka Use
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Digital Zindagi ek marketplace platform hai jo providers aur
              customers ko connect karta hai. Platform ka use karke aap in terms
              se agree karte hain. 18 saal se kam ke users parents ki permission
              ke saath hi use kar sakte hain.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground mb-3">
              2. Provider Ki Zimmedari
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Jo bhi provider apni services list karta hai, woh apni service ki
              quality ka khud zimmedar hai. Galat ya misleading information dena
              account ban ka karan ban sakta hai. Provider ko subscription
              payment sahi tarike se karna zaroori hai.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground mb-3">
              3. Payment Terms
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Subscription payment UPI ke through hota hai. Payment ke baad
              screenshot upload karna zaroori hai. Admin 24-48 ghante mein
              verify karta hai. Payment refund sirf technical failure par hi
              possible hai. Galat payment ka screenshot upload karna account
              suspend kar sakta hai.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-xl text-foreground mb-3">
              4. Prohibited Activities
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Platform par spam, fraud, harassment ya illegal services list
              karna strictly prohibited hai. Aisa karne par account permanently
              ban ho sakta hai aur legal action bhi ho sakta hai. Platform ka
              misuse report karne ke liye hamare support email pe contact
              karein.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
