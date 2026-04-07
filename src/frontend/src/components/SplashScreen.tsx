import { AnimatePresence, motion } from "motion/react";
import React, { useEffect, useState } from "react";

const SPLASH_KEY = "dz_splash_shown";

function SplashLogoImg() {
  // Use admin-customized splash logo if set, otherwise /logo.png
  const logoSrc = localStorage.getItem("dz_splash_logo") || "/logo.png";
  const [failed, setFailed] = React.useState(false);
  if (failed) return <span style={{ fontSize: "52px" }}>🌿</span>;
  return (
    <img
      src={logoSrc}
      alt="Digital Zindagi"
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        borderRadius: "50%",
        padding: "4px",
      }}
      onError={() => {
        setFailed(true);
      }}
    />
  );
}

export default function SplashScreen({
  children,
}: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(() => {
    const splashEnabled = localStorage.getItem("dz_splash_enabled");
    if (splashEnabled === "false") return false;
    return !sessionStorage.getItem(SPLASH_KEY);
  });

  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => {
      sessionStorage.setItem(SPLASH_KEY, "true");
      setShowSplash(false);
    }, 2800);
    return () => clearTimeout(timer);
  }, [showSplash]);

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
            style={{ backgroundColor: "#064420" }}
            data-ocid="splash.card"
          >
            {/* Background decorative circles */}
            <div
              style={{
                position: "absolute",
                top: "10%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "300px",
                height: "300px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "5%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "420px",
                height: "420px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.015)",
                border: "1px solid rgba(255,255,255,0.04)",
              }}
            />

            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{
                delay: 0.15,
                duration: 0.6,
                type: "spring",
                bounce: 0.35,
              }}
              className="flex flex-col items-center gap-6"
              style={{ position: "relative", zIndex: 1 }}
            >
              {/* Logo — round, glowing ring */}
              <div
                style={{
                  position: "relative",
                  width: "150px",
                  height: "150px",
                }}
              >
                {/* Animated gold outer ring */}
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 8,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                  style={{
                    position: "absolute",
                    inset: "-4px",
                    borderRadius: "50%",
                    background:
                      "conic-gradient(from 0deg, #d4af37, #f0d060, #fff8dc, #d4af37, #a07820, #d4af37)",
                    padding: "3px",
                  }}
                />
                {/* Logo container */}
                <div
                  style={{
                    position: "absolute",
                    inset: "3px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "#064420",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow:
                      "0 8px 40px rgba(0,0,0,0.4), 0 0 60px rgba(212,175,55,0.15)",
                  }}
                >
                  <SplashLogoImg />
                </div>
              </div>

              {/* Text */}
              <div className="text-center">
                <h1
                  className="text-white font-bold tracking-wide"
                  style={{ fontSize: "30px", letterSpacing: "0.5px" }}
                >
                  Digital Zindagi
                </h1>
                <p
                  style={{
                    color: "rgba(212,175,55,0.9)",
                    fontSize: "13px",
                    marginTop: "6px",
                    letterSpacing: "0.3px",
                  }}
                >
                  डिजिटल जिंदगी में आपका स्वागत है!
                </p>
              </div>

              {/* Progress bar */}
              <motion.div
                style={{
                  height: "3px",
                  width: "180px",
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: "9999px",
                  overflow: "hidden",
                }}
              >
                <motion.div
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.5, duration: 2.0, ease: "easeInOut" }}
                  style={{
                    height: "100%",
                    background:
                      "linear-gradient(90deg, #d4af37, #f0d060, #d4af37)",
                    borderRadius: "9999px",
                    transformOrigin: "left",
                  }}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {!showSplash && children}
    </>
  );
}
