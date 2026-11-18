import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({
  title,
  description,
  action,
  children,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B] tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-[#64748B] mt-1 text-sm">{description}</p>
        )}
      </div>
      {(action || children) && (
        <div>
          {action}
          {children}
        </div>
      )}
    </div>
  );
}
