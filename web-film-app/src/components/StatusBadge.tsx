interface StatusBadgeProps {
  label: string;
  tone?: "success" | "warning" | "info";
}

const toneClasses: Record<Required<StatusBadgeProps>["tone"], string> = {
  success: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  warning: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  info: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
};

export function StatusBadge({ label, tone = "info" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}
