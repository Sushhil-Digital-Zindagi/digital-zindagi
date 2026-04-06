import { type ReactNode, createContext, useContext, useState } from "react";

type Lang = "hinglish" | "hindi" | "english";

type TranslationKey =
  | "home"
  | "search"
  | "searchBtn"
  | "popularServices"
  | "featuredProviders"
  | "viewAll"
  | "registerBusiness"
  | "registerNow"
  | "loginBtn"
  | "signupBtn"
  | "providerSignup"
  | "adminPanel"
  | "myOrders"
  | "logout"
  | "callNow"
  | "whatsapp"
  | "navigateMaps"
  | "aboutUs"
  | "privacy"
  | "terms"
  | "quickLinks"
  | "myShop"
  | "noProvider"
  | "backHome"
  | "loading"
  | "ordersTitle"
  | "ordersComing"
  | "language";

type Translations = Record<TranslationKey, string>;

const TRANSLATIONS: Record<Lang, Translations> = {
  hinglish: {
    home: "Home",
    search: "Kya dhundh rahe ho?",
    searchBtn: "Dhundo",
    popularServices: "Humare Popular Services",
    featuredProviders: "Featured Providers",
    viewAll: "Sab Dekhein",
    registerBusiness: "Apna Business Online Lao!",
    registerNow: "Abhi Register Karein",
    loginBtn: "Login Karein",
    signupBtn: "Account Banao",
    providerSignup: "Provider Ban-o",
    adminPanel: "Admin Panel",
    myOrders: "My Orders",
    logout: "Logout Karein",
    callNow: "Call Karein",
    whatsapp: "WhatsApp",
    navigateMaps: "Maps Pe Dekhein",
    aboutUs: "Hamare Baare Mein",
    privacy: "Privacy Policy",
    terms: "Terms of Use",
    quickLinks: "Quick Links",
    myShop: "Apna Shop Dekhein",
    noProvider: "Provider nahi mila",
    backHome: "Home pe wapas jao",
    loading: "Load Ho Raha Hai...",
    ordersTitle: "Mera Orders",
    ordersComing: "Yeh feature jald aa raha hai!",
    language: "Bhasha",
  },
  hindi: {
    home: "होम",
    search: "आप क्या ढूंढ रहे हैं?",
    searchBtn: "खोजें",
    popularServices: "हमारी लोकप्रिय सेवाएं",
    featuredProviders: "विशेष प्रदाता",
    viewAll: "सभी देखें",
    registerBusiness: "अपना व्यवसाय ऑनलाइन लाएं!",
    registerNow: "अभी पंजीकरण करें",
    loginBtn: "लॉगिन करें",
    signupBtn: "खाता बनाएं",
    providerSignup: "प्रदाता बनें",
    adminPanel: "एडमिन पैनल",
    myOrders: "मेरे ऑर्डर",
    logout: "लॉगआउट करें",
    callNow: "अभी कॉल करें",
    whatsapp: "व्हाट्सएप",
    navigateMaps: "मैप पर देखें",
    aboutUs: "हमारे बारे में",
    privacy: "गोपनीयता नीति",
    terms: "उपयोग की शर्तें",
    quickLinks: "त्वरित लिंक",
    myShop: "अपनी दुकान देखें",
    noProvider: "प्रदाता नहीं मिला",
    backHome: "होम पर वापस जाएं",
    loading: "लोड हो रहा है...",
    ordersTitle: "मेरे ऑर्डर",
    ordersComing: "यह सुविधा जल्द आ रही है!",
    language: "भाषा",
  },
  english: {
    home: "Home",
    search: "What are you looking for?",
    searchBtn: "Search",
    popularServices: "Our Popular Services",
    featuredProviders: "Featured Providers",
    viewAll: "View All",
    registerBusiness: "Bring Your Business Online!",
    registerNow: "Register Now",
    loginBtn: "Login",
    signupBtn: "Create Account",
    providerSignup: "Become a Provider",
    adminPanel: "Admin Panel",
    myOrders: "My Orders",
    logout: "Logout",
    callNow: "Call Now",
    whatsapp: "WhatsApp",
    navigateMaps: "Navigate on Maps",
    aboutUs: "About Us",
    privacy: "Privacy Policy",
    terms: "Terms of Use",
    quickLinks: "Quick Links",
    myShop: "My Shop Dashboard",
    noProvider: "Provider not found",
    backHome: "Back to Home",
    loading: "Loading...",
    ordersTitle: "My Orders",
    ordersComing: "This feature is coming soon!",
    language: "Language",
  },
};

const LANG_KEY = "dz_lang";

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "hinglish",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem(LANG_KEY) as Lang | null;
    return stored && ["hinglish", "hindi", "english"].includes(stored)
      ? stored
      : "hinglish";
  });

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem(LANG_KEY, newLang);
  };

  const t = (key: TranslationKey): string => {
    return TRANSLATIONS[lang][key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
