import { cn } from "@/lib/utils";

interface SubSectionHeadingProps {
  title: string;
  className?: string;
}

export function SubSectionHeading({ title, className }: SubSectionHeadingProps) {
  return (
    <h3
      className={cn(
        "font-display font-bold text-lg mb-4 border-b-2 border-forest-900 inline-block",
        "text-forest-900 tracking-tight leading-snug print:text-xs print:mb-1",
        className
      )}
    >
      {title}
    </h3>
  );
}
