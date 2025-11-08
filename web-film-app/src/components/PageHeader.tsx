import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20">
      <div>
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-slate-300">{description}</p>
        )}
      </div>
      {actions}
    </div>
  );
}
