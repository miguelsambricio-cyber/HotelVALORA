import { cn } from "@/lib/utils";

export interface SettingsHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

/**
 * Page-level header for any settings sub-page. Sits at the top of the
 * main content area, paired (on desktop) with the floating completion
 * widget. Typography mirrors the login hero scale, tightened down so it
 * reads as a section header rather than a marketing title.
 */
export function SettingsHeader({
  title,
  subtitle,
  className,
}: SettingsHeaderProps) {
  return (
    <header className={cn("min-w-0", className)}>
      <h1 className="font-headline text-2xl font-extrabold tracking-tight text-forest-900 md:text-3xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 max-w-xl text-sm text-slate-500">{subtitle}</p>
      )}
    </header>
  );
}
