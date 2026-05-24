"use client";

import { useState } from "react";
import { Play, Terminal, HelpCircle, RotateCcw } from "lucide-react";
import type { ProductWithAvailability } from "@/lib/inventory";
import type { ApiError } from "@/lib/errors";

type ConcurrencyLabProps = {
  products: ProductWithAvailability[];
  onRaceComplete: () => void;
};

type LogEntry = {
  timestamp: string;
  type: "info" | "success" | "error" | "warning";
  message: string;
};

export function ConcurrencyLab({ products, onRaceComplete }: ConcurrencyLabProps) {
  const raceDemoProduct = products.find(p => p.sku === "ALLO-RACE-ONE") || products[0];
  
  const [selectedProductId, setSelectedProductId] = useState(raceDemoProduct?.id || "");
  const [concurrencyCount, setConcurrencyCount] = useState(4);
  const [sameKey, setSameKey] = useState(false);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const addLog = (type: LogEntry["type"], message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp: time, type, message }]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const runRace = async () => {
    if (!selectedProduct) return;
    setRunning(true);
    clearLogs();
    
    addLog("info", `🚀 Starting concurrency race with ${concurrencyCount} parallel checkouts...`);
    addLog("info", `📦 Target Product: ${selectedProduct.name} (SKU: ${selectedProduct.sku})`);
    
    const warehouse = selectedProduct.warehouses[0];
    if (!warehouse) {
      addLog("error", "❌ No warehouses available for this product.");
      setRunning(false);
      return;
    }

    addLog("info", `🏢 Warehouse: ${warehouse.name} (Available stock before race: ${warehouse.availableStock})`);
    addLog("warning", "⚡ Triggering parallel requests via Promise.all at the exact same millisecond...");

    const commonKey = crypto.randomUUID();
    
    // Build parallel fetches
    const requests = Array.from({ length: concurrencyCount }).map((_, index) => {
      const idempotencyKey = sameKey ? commonKey : crypto.randomUUID();
      const requestId = index + 1;
      
      addLog("info", `⏳ Request #${requestId} dispatched (Idempotency Key: ${idempotencyKey.slice(0, 8)}...)`);
      
      const startTime = performance.now();
      return fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          warehouseId: warehouse.id,
          quantity: 1,
          idempotencyKey,
        }),
      }).then(async (res) => {
        const duration = Math.round(performance.now() - startTime);
        const data = await res.json();
        return { requestId, status: res.status, data, duration };
      });
    });

    try {
      const results = await Promise.all(requests);
      
      let successes = 0;
      let conflicts = 0;

      results.forEach((result) => {
        const { requestId, status, data, duration } = result;
        if (status === 201) {
          successes++;
          addLog("success", `✅ Request #${requestId}: HTTP 201 Created (Reserved successfully!) [${duration}ms]`);
        } else if (status === 200) {
          successes++;
          addLog("success", `🔄 Request #${requestId}: HTTP 200 OK (Served from Idempotency Cache) [${duration}ms]`);
        } else if (status === 409) {
          conflicts++;
          const err = data as ApiError;
          addLog("error", `❌ Request #${requestId}: HTTP 409 Conflict (${err.code}: ${err.error}) [${duration}ms]`);
        } else {
          addLog("error", `⚠️ Request #${requestId}: HTTP ${status} Error [${duration}ms]`);
        }
      });

      addLog("info", "🏁 Concurrency race complete.");
      if (sameKey) {
        addLog("success", `📊 Summary: ${successes} requests served successfully (handled idempotently by unique index).`);
      } else {
        addLog("warning", `📊 Summary: ${successes} reserved successfully, ${conflicts} lock conflicts caught. Row lock handled safely by PostgreSQL/SQLite!`);
      }

      onRaceComplete();
    } catch (err: unknown) {
      addLog("error", `❌ Fatal error running race: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 glow-blue transition-all duration-300">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">
            Interactive Concurrency Lab
          </h2>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Simulate a high-traffic checkout race condition. Dispatches multiple requests simultaneously to verify database locking behavior.
        </p>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[280px_1fr]">
        {/* Controls */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Product to Target
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            >
              {products.map((p) => {
                const stock = p.warehouses[0]?.availableStock ?? 0;
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} ({stock} avail)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Concurrent Users
              </label>
              <span className="text-sm font-bold text-indigo-500">{concurrencyCount}</span>
            </div>
            <input
              type="range"
              min="2"
              max="5"
              value={concurrencyCount}
              onChange={(e) => setConcurrencyCount(Number(e.target.value))}
              className="h-2 w-full accent-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200/60 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Shared Idempotency Key
              </span>
              <span className="text-[10px] text-slate-500">
                Tests cache vs new holds
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSameKey(!sameKey)}
              aria-checked={sameKey}
              role="checkbox"
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                sameKey ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  sameKey ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={runRace}
            disabled={running || !selectedProductId}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 font-semibold text-white transition hover:bg-indigo-500 active:scale-95 disabled:pointer-events-none disabled:bg-slate-300 dark:disabled:bg-slate-800"
          >
            <Play className="h-4 w-4" />
            {running ? "Simulating Race..." : "Trigger Checkout Race"}
          </button>
        </div>

        {/* Console Log */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs dark:border-slate-800">
          <div className="mb-2.5 flex items-center justify-between border-b border-slate-800 pb-2 text-[10px] uppercase tracking-wider text-slate-500">
            <span>Transaction Logs Console</span>
            <button
              type="button"
              onClick={clearLogs}
              className="flex items-center gap-1 text-slate-500 hover:text-white"
            >
              <RotateCcw className="h-3 w-3" />
              Clear Console
            </button>
          </div>
          <div className="flex-1 overflow-y-auto max-h-56 min-h-40 flex flex-col gap-1 text-slate-300">
            {logs.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-600 py-10">
                <HelpCircle className="h-8 w-8 opacity-40 animate-pulse" />
                <span>Console idle. Select users and trigger checkout race.</span>
              </div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`flex gap-2 items-start py-0.5 leading-normal ${
                    log.type === "success"
                      ? "text-emerald-400"
                      : log.type === "error"
                      ? "text-rose-400"
                      : log.type === "warning"
                      ? "text-amber-400"
                      : "text-slate-300"
                  }`}
                >
                  <span className="text-slate-600 select-none">[{log.timestamp}]</span>
                  <span className="break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
