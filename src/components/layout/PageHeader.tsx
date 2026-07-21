interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="page-hero flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between relative z-[1]">
      <div className="min-w-0 relative z-[1] flex items-start gap-2.5">
        <span className="mt-1.5 h-4 w-1 shrink-0 rounded-full bg-[#D3F36B]" aria-hidden />
        <div className="min-w-0">
          <h1 className="font-display text-base sm:text-lg font-bold text-white break-words tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs mt-0.5 font-medium text-white/65 max-w-3xl leading-snug">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0 relative z-[1] pl-3.5 sm:pl-0">
          {actions}
        </div>
      )}
    </div>
  );
}
