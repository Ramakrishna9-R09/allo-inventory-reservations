"use client";

import { useTheme } from "@/components/ThemeContext";
import { Sun, Moon, Cpu, ShieldCheck } from "lucide-react";

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-md dark:border-slate-800/40 dark:bg-slate-950/60 sticky top-0 z-50 transition-colors duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20 dark:bg-indigo-500">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-800 dark:text-white sm:text-xl">
              Allo Inventory Reservations
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Concurrency Lab & Checkout Hub
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Status Badge */}
          <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200/50 bg-emerald-50/50 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:border-emerald-950/40 dark:bg-emerald-950/20 dark:text-emerald-400 sm:flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Postgres Lock Protection Active</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-all hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Toggle dark mode"
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
