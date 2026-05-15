interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}

export function StatCard({ label, value, hint, accent = false }: StatCardProps) {
  return (
    <div
      className={`rounded-xl border p-5 shadow-sm ${
        accent ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"
      }`}
    >
      <p className={`text-xs font-medium uppercase tracking-wider ${accent ? "text-slate-300" : "text-slate-500"}`}>
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold ${accent ? "text-white" : "text-slate-900"}`}>{value}</p>
      {hint && <p className={`mt-1 text-xs ${accent ? "text-slate-300" : "text-slate-500"}`}>{hint}</p>}
    </div>
  );
}
