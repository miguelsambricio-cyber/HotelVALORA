import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TransactionHotelGalleryItem } from "@/lib/report/transactions-data";

export interface TransactionHotelCardProps {
  item: TransactionHotelGalleryItem;
  className?: string;
}

/**
 * 4:3 image card for the bottom "Interactive Gallery" of the Transactions
 * page. Image fills cover; a top-down dark gradient anchors a white headline
 * caption (bottom-left) and a glass arrow button (bottom-right). Soft hover
 * zoom on the image; arrow inverts to dark-on-white on hover.
 */
export function TransactionHotelCard({ item, className }: TransactionHotelCardProps) {
  return (
    <div
      className={cn(
        "relative group aspect-[4/3] rounded-xl overflow-hidden shadow-sm border border-slate-200 print:shadow-none",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.imageSrc}
        alt={item.alt}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-between items-end">
        <span className="text-white font-headline font-bold text-sm tracking-tight drop-shadow">
          {item.hotelName}
        </span>
        <button
          type="button"
          aria-label={`View ${item.hotelName}`}
          className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-forest-900 transition-all print:hidden"
        >
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
