import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type GuestInsightTone = "positive" | "negative";

export interface GuestInsightsCardProps {
  tone: GuestInsightTone;
  title: string;
  body: string;
  className?: string;
}

const TONE_STYLES: Record<
  GuestInsightTone,
  { Icon: typeof ThumbsUp; color: string }
> = {
  positive: { Icon: ThumbsUp, color: "text-emerald-600" },
  negative: { Icon: ThumbsDown, color: "text-rose-600" },
};

/**
 * Slate-tinted card showing what guests like / dislike. The icon and accent
 * colour change with the tone (emerald for positive, rose for negative).
 */
export function GuestInsightsCard({
  tone,
  title,
  body,
  className,
}: GuestInsightsCardProps) {
  const { Icon, color } = TONE_STYLES[tone];

  return (
    <div
      className={cn(
        "bg-slate-50 border border-slate-200 rounded-lg p-6 flex flex-col h-full print:shadow-none",
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={18} className={color} fill="currentColor" strokeWidth={1.5} />
        <h4 className="text-[11px] font-medium uppercase tracking-widest text-slate-500">
          {title}
        </h4>
      </div>
      <p className="text-sm leading-snug text-slate-500">{body}</p>
    </div>
  );
}
