import { useState } from "react";

export default function ImageCarousel({ title, images }) {
  const [index, setIndex] = useState(0);

  return (
    <div>
      <div className="relative mb-1 flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm">
        <img
          alt={title}
          className="h-full w-full object-cover"
          src={images[index]}
        />

        <button
          type="button"
          aria-label={`Cambiar imagen ${title}`}
          className="absolute bottom-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-sm backdrop-blur-sm transition-transform hover:scale-110"
          onClick={() => setIndex((current) => (current + 1) % images.length)}
        >
          <span className="material-symbols-outlined text-sm text-slate-700">
            arrow_forward
          </span>
        </button>
      </div>

      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </span>
    </div>
  );
}
