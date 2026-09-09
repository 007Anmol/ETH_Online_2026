"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const INTRO_KEY = "verichain-intro-seen";

export function IntroOverlay() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const seen = localStorage.getItem(INTRO_KEY);

    if (!seen) {
      setVisible(true);
    }
  }, []);

  const completeIntro = () => {
    localStorage.setItem(INTRO_KEY, "true");
    setVisible(false);
  };

  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      completeIntro();
    }, 2800);

    return () => clearTimeout(timer);
  }, [visible]);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111111] text-[#f5f5f3]"
        >
          <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:64px_64px]" />

          <div className="relative flex w-full max-w-xl flex-col items-center px-6 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20"
            >
              <div className="h-2 w-2 rounded-full bg-white" />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-8 text-[10px] uppercase tracking-[0.3em] text-white/40"
            >
              Physical trust infrastructure
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="mt-6 text-4xl font-medium tracking-[-0.06em] sm:text-5xl"
            >
              Every product.
              <br />
              <span className="text-white/40">Verifiable.</span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              className="mt-12 w-full max-w-[240px]"
            >
              <div className="h-px w-full overflow-hidden bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.2, ease: "easeInOut" }}
                  className="h-full bg-white"
                />
              </div>

              <div className="mt-3 flex justify-between text-[10px] uppercase tracking-[0.15em] text-white/30">
                <span>Initializing</span>
                <span>VeriChain</span>
              </div>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8 }}
              onClick={completeIntro}
              className="mt-12 flex items-center gap-2 text-xs text-white/50 transition-colors hover:text-white"
            >
              Enter platform
              <ArrowUpRight size={13} />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}