import type { ReactNode } from "react";

type Tone = "neutral" | "green" | "yellow" | "blue" | "red";

const tones: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  blue: "bg-blue-100 text-blue-800",
  red: "bg-red-100 text-red-800",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
