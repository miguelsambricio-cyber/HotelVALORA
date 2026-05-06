export default function DetailRow({ label, value, last = false }) {
  return (
    <div
      className={[
        "grid h-10 grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-1.5",
        last ? "" : "border-b border-slate-100",
      ].join(" ")}
    >
      <span className="text-sm font-semibold uppercase tracking-wider leading-[1.1] text-slate-500">
        {label}
      </span>
      <span className="w-12" aria-hidden="true" />
      <span className="justify-self-end text-right text-base font-bold leading-[1.1] text-[#0E4B31]">
        {value}
      </span>
    </div>
  );
}
