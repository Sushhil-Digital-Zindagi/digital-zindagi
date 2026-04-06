import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import type { Banner } from "../backend";

const FALLBACK_BANNERS: Banner[] = [
  {
    id: 1n,
    title: "Apna Business Badhaao!",
    subtitle:
      "Digital Zindagi par register karein aur lakho customers tak pahuncho. Abhi shuru karein!",
    imageUrl: "/assets/generated/hero-banner-1.dim_1200x400.jpg",
    linkUrl: "/signup",
    active: true,
    displayOrder: 1n,
  },
  {
    id: 2n,
    title: "Local Services, Digital Tarike Se",
    subtitle:
      "Plumber, Carpenter, Doctor — sab ek jagah. Apne nagar ke best providers dhundein!",
    imageUrl: "/assets/generated/hero-banner-2.dim_1200x400.jpg",
    linkUrl: "/search",
    active: true,
    displayOrder: 2n,
  },
  {
    id: 3n,
    title: "Provider Bano, Kamaao!",
    subtitle:
      "Sirf ₹199/maah mein apna digital shop kholein. Lakho logo tak pahuncho.",
    imageUrl: "/assets/generated/hero-banner-3.dim_1200x400.jpg",
    linkUrl: "/signup",
    active: true,
    displayOrder: 3n,
  },
];

interface Props {
  banners?: Banner[];
  loading?: boolean;
}

export default function HeroCarousel({ banners, loading }: Props) {
  const items = banners && banners.length > 0 ? banners : FALLBACK_BANNERS;
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState(1);

  const prev = useCallback(() => {
    setDir(-1);
    setCurrent((c) => (c - 1 + items.length) % items.length);
  }, [items.length]);

  const next = useCallback(() => {
    setDir(1);
    setCurrent((c) => (c + 1) % items.length);
  }, [items.length]);

  useEffect(() => {
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [next]);

  if (loading) {
    return (
      <div className="w-full h-48 md:h-72 bg-gradient-to-r from-emerald-800 to-emerald-900 animate-pulse rounded-2xl" />
    );
  }

  const slide = items[current];

  return (
    <div
      className="relative w-full max-w-full overflow-hidden rounded-2xl shadow-emerald"
      style={{ minHeight: "200px" }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current}
          initial={{ x: dir * 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: dir * -60, opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="relative w-full max-w-full"
        >
          <div
            className="w-full max-w-full h-48 md:h-72 bg-cover bg-center"
            style={{ backgroundImage: `url(${slide.imageUrl})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
            <div className="absolute inset-0 flex items-center">
              <div className="px-6 md:px-12 max-w-lg">
                <motion.h2
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-xl md:text-3xl font-heading font-bold text-white mb-2 leading-tight"
                >
                  {slide.title}
                </motion.h2>
                <motion.p
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-white/85 text-sm md:text-base mb-4 line-clamp-2"
                >
                  {slide.subtitle}
                </motion.p>
                {slide.linkUrl && (
                  <motion.a
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    href={slide.linkUrl}
                    className="inline-block bg-white text-emerald-800 font-semibold text-sm px-5 py-2 rounded-full hover:bg-emerald-50 transition-colors"
                    data-ocid="carousel.button"
                  >
                    Dekhein &rarr;
                  </motion.a>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <button
        type="button"
        onClick={prev}
        data-ocid="carousel.pagination_prev"
        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
        aria-label="Pehla slide"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={next}
        data-ocid="carousel.pagination_next"
        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
        aria-label="Agla slide"
      >
        <ChevronRight size={18} />
      </button>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {items.map((item, i) => (
          <button
            type="button"
            key={item.id.toString()}
            onClick={() => {
              setDir(i > current ? 1 : -1);
              setCurrent(i);
            }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? "w-5 bg-white" : "w-1.5 bg-white/50"
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
