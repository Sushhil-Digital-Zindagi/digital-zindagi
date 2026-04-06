import { Facebook, Instagram, Mail, MapPin, Phone, Send } from "lucide-react";
import { useCallback, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { Link } from "../lib/router";
import { useSettingsListener } from "../utils/settingsSync";

function getSocialLinks() {
  try {
    const stored = localStorage.getItem("dz_social_links");
    if (stored)
      return JSON.parse(stored) as {
        instagram?: string;
        facebook?: string;
        telegram?: string;
      };
  } catch {
    // ignore
  }
  return { instagram: "", facebook: "", telegram: "" };
}

function getFounder(): { name?: string; photo?: string } {
  try {
    return JSON.parse(localStorage.getItem("dz_founder") ?? "{}");
  } catch {
    return {};
  }
}

function readContactInfo() {
  return {
    phone: localStorage.getItem("dz_contact_phone") ?? "+91 98765 43210",
    email:
      localStorage.getItem("dz_contact_email") ?? "support@digitalzindagi.in",
    address: localStorage.getItem("dz_contact_address") ?? "Bharat, India",
    copyright: localStorage.getItem("dz_footer_copyright") ?? "",
  };
}

export default function Footer() {
  const { t } = useLanguage();
  const [social, setSocial] = useState(getSocialLinks);
  const [founder, setFounder] = useState(getFounder);
  const [contactInfo, setContactInfo] = useState(readContactInfo);

  const reloadSettings = useCallback(() => {
    setSocial(getSocialLinks());
    setFounder(getFounder());
    setContactInfo(readContactInfo());
  }, []);

  useSettingsListener(reloadSettings);

  const hasSocial = social.instagram || social.facebook || social.telegram;
  const hasFounder = founder.name || founder.photo;
  const year = new Date().getFullYear();
  const copyrightText = contactInfo.copyright
    ? contactInfo.copyright
    : `\u00a9 ${year} Digital Zindagi`;

  return (
    <footer className="bg-emerald-footer mt-12">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="font-heading font-bold text-white text-xl mb-3">
              Digital Zindagi
            </h3>
            <p className="text-white/70 text-sm leading-relaxed">
              Apke local area ka sabse trusted digital marketplace. Providers
              aur customers ko jodta hai.
            </p>
            {hasSocial && (
              <div className="flex gap-3 mt-4">
                {social.instagram && (
                  <a
                    href={social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-ocid="footer.link"
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram size={16} />
                  </a>
                )}
                {social.facebook && (
                  <a
                    href={social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-ocid="footer.link"
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook size={16} />
                  </a>
                )}
                {social.telegram && (
                  <a
                    href={social.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-ocid="footer.link"
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                    aria-label="Telegram"
                  >
                    <Send size={16} />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-3">{t("quickLinks")}</h4>
            <ul className="space-y-2">
              {[
                { to: "/", label: t("home") },
                { to: "/login", label: t("loginBtn") },
                { to: "/signup", label: t("signupBtn") },
                { to: "/signup?role=provider", label: t("providerSignup") },
                { to: "/about", label: t("aboutUs") },
                { to: "/privacy", label: t("privacy") },
                { to: "/terms", label: t("terms") },
                { to: "/delivery-register", label: "🚴 Delivery Boy? Join Us" },
              ].map((l) => (
                <li key={l.to + l.label}>
                  <Link
                    to={l.to}
                    data-ocid="footer.link"
                    className="text-white/70 hover:text-white text-sm transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-3">{t("aboutUs")}</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <Phone size={14} className="flex-shrink-0" />
                <span>{contactInfo.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <Mail size={14} className="flex-shrink-0" />
                <span>{contactInfo.email}</span>
              </div>
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <MapPin size={14} className="flex-shrink-0" />
                <span>{contactInfo.address}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 text-center">
          <p className="text-white/50 text-sm">{copyrightText}</p>
          <div className="mt-3">
            <Link
              to="/manager-login"
              data-ocid="footer.staff_login"
              className="text-white/30 hover:text-white/60 text-xs underline underline-offset-2 transition-colors"
            >
              Staff Login
            </Link>
          </div>
        </div>

        {/* Founder Row */}
        {hasFounder && (
          <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-white/10">
            {founder.photo && (
              <img
                src={founder.photo}
                alt="Founder"
                className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
              />
            )}
            <div className="text-center sm:text-left">
              <p className="text-white/40 text-xs">Founder</p>
              <p className="text-white/70 text-sm font-semibold">
                {founder.name}
              </p>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
