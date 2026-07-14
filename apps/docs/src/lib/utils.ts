import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function methodColor(method: string) {
  const m = method.toUpperCase();
  if (m === "GET") return "bg-emerald-500/20 text-emerald-400";
  if (m === "POST") return "bg-blue-500/20 text-blue-400";
  if (m === "PUT" || m === "PATCH") return "bg-amber-500/20 text-amber-400";
  if (m === "DELETE") return "bg-red-500/20 text-red-400";
  return "bg-zinc-500/20 text-zinc-400";
}
