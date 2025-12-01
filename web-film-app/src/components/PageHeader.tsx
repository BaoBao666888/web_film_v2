import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
        {description && (
          <p className="max-w-2xl text-sm text-slate-300 sm:mt-1">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="w-full sm:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
