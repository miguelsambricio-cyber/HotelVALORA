import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartPlaceholderProps {
  label?: string;
  className?: string;
}

export function ChartPlaceholder({
  label = "Gráfico pendiente de datos",
  className,
}: ChartPlaceholderProps) {
  return (
    <div
      className={cn(
        "w-full h-full flex flex-col items-center justify-center gap-2 text-slate-300",
        className
      )}
    >
      <BarChart3 size={32} />
      <p className="text-xs font-medium">{label}</p>
    </div>
  );
}
