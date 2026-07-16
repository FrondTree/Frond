import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function methodColor(method: string) {
  const m = method.toUpperCase();
  if (m === "GET")
    return "bg-sky-100 text-sky-800 ring-1 ring-sky-200/80 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30";
  if (m === "POST")
    return "bg-blue-100 text-blue-800 ring-1 ring-blue-200/80 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30";
  if (m === "PUT" || m === "PATCH")
    return "bg-amber-100 text-amber-900 ring-1 ring-amber-200/80 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30";
  if (m === "DELETE")
    return "bg-rose-100 text-rose-800 ring-1 ring-rose-200/80 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30";
  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/30";
}
