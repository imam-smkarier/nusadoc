"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LOGOS } from "@/components/ui/logo-clouds-utils/logos";

export type LogoEntry = {
  icon: React.ReactNode;
  name?: string;
  id?: string;
};

export type LogoCloudSwapProps = {
  logos?: LogoEntry[];
  title?: string;
  subtitle?: string;
  interval?: number;
  stagger?: number;
  className?: string;
};

const WIPE_DURATION = 0.92;
const WIPE_TIMES = [0, 0.4, 1];

const DEFAULT_LOGOS: LogoEntry[] = LOGOS.map((l) => ({
  icon: (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={l.src}
      alt={l.name}
      loading="lazy"
      className="max-h-6 w-auto max-w-[88px] object-contain sm:max-h-7 sm:max-w-[104px]"
      style={{ color: l.color }}
      aria-hidden="true"
      draggable={false}
    />
  ),
  name: l.name,
  id: l.name,
}));

function LogoItem({
  logo,
  index,
  isWaving,
  stagger,
  totalCount,
  onDone,
}: {
  logo: LogoEntry;
  index: number;
  isWaving: boolean;
  stagger: number;
  totalCount: number;
  onDone: () => void;
}) {
  return (
    <motion.div
      aria-label={logo.name ?? "Logo"}
      animate={
        isWaving
          ? {
              clipPath: [
                "inset(0 0% 0 0)",
                "inset(0 100% 0 0)",
                "inset(0 0% 0 0)",
              ],
              filter: ["blur(0px)", "blur(8px)", "blur(0px)"],
              opacity: [1, 0.2, 1],
            }
          : {
              clipPath: "inset(0 0% 0 0)",
              filter: "blur(0px)",
              opacity: 1,
            }
      }
      transition={
        isWaving
          ? {
              clipPath: {
                duration: WIPE_DURATION,
                times: WIPE_TIMES,
                ease: ["easeIn", [0.16, 1, 0.3, 1]],
                delay: index * stagger,
              },
              filter: {
                duration: WIPE_DURATION * 0.9,
                times: WIPE_TIMES,
                ease: "easeInOut" as const,
                delay: index * stagger,
              },
              opacity: {
                duration: WIPE_DURATION * 0.85,
                times: WIPE_TIMES,
                ease: "easeInOut" as const,
                delay: index * stagger,
              },
            }
          : {
              duration: 0.3,
              ease: "easeOut",
            }
      }
      onAnimationComplete={() => {
        if (isWaving && index === totalCount - 1) onDone();
      }}
      whileHover={{
        scale: 1.07,
        opacity: 1,
        filter: "blur(0px)",
        transition: { type: "spring", stiffness: 340, damping: 24 },
      }}
      className="flex w-24 shrink-0 cursor-default flex-col items-center gap-2 sm:w-28"
    >
      <span className="flex h-8 w-full items-center justify-center sm:h-9">
        {logo.icon}
      </span>
      {logo.name && (
        <span className="select-none whitespace-nowrap text-[10px] font-medium tracking-wide text-slate-400 sm:text-[11px]">
          {logo.name}
        </span>
      )}
    </motion.div>
  );
}

/**
 * Logo cloud channel pembayaran Midtrans (adaptasi 21st.dev "LogoCloudSwap").
 * Dipakai di Landing page section #harga — menggantikan daftar metode statis di CheckoutModal.
 */
export default function LogoCloudSwap({
  logos = DEFAULT_LOGOS,
  title = "Metode pembayaran didukung Midtrans",
  subtitle = "Bayar via QRIS, e-wallet, transfer bank, atau kartu kredit — terverifikasi otomatis.",
  interval = 3200,
  stagger = 0.11,
  className,
}: LogoCloudSwapProps) {
  const [waving, setWaving] = React.useState(false);

  React.useEffect(() => {
    const id = setInterval(() => setWaving(true), interval);
    return () => clearInterval(id);
  }, [interval]);

  return (
    <section className={cn("w-full bg-white px-4 py-12 sm:py-16", className)}>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight text-navy sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-3 text-sm text-slate-500">{subtitle}</p>}
      </div>

      <div className="mx-auto mt-10 max-w-5xl sm:mt-12">
        <div className="hidden items-center justify-center gap-4 sm:flex sm:flex-wrap sm:gap-6 md:gap-8 lg:gap-10">
          {logos.map((logo, i) => (
            <LogoItem
              key={logo.id ?? i}
              logo={logo}
              index={i}
              isWaving={waving}
              stagger={stagger}
              totalCount={logos.length}
              onDone={() => setWaving(false)}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 place-items-center gap-y-6 sm:hidden">
          {logos.map((logo, i) => (
            <LogoItem
              key={logo.id ?? i}
              logo={logo}
              index={i}
              isWaving={waving}
              stagger={stagger}
              totalCount={logos.length}
              onDone={() => setWaving(false)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
