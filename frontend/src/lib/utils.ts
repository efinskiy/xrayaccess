import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n);
}

export function shortHost(host: string): string {
  try {
    const url = new URL("https://" + host);
    return url.hostname;
  } catch {
    return host;
  }
}
