export default function Sidebar({ sections }) {
  return (
    <aside className="sticky top-28 hidden max-h-[calc(100vh-8rem)] w-64 shrink-0 self-start overflow-y-auto rounded-2xl border border-slate-200 bg-slate-100/80 p-5 shadow-sm no-print lg:block">
      <div className="mb-4 px-2 text-xs font-bold uppercase tracking-widest text-slate-400">
        Navigation
      </div>

      <nav className="space-y-2">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            <a
              href="#"
              className={[
                "flex items-center rounded-lg px-3 py-2 text-sm font-bold font-headline transition-colors",
                section.active
                  ? "bg-emerald-100/50 text-emerald-900 shadow-sm"
                  : "text-slate-600 hover:bg-slate-200/50 hover:text-emerald-900",
              ].join(" ")}
            >
              {section.title}
            </a>

            {section.children ? (
              <div className="ml-3 flex flex-col gap-1.5 border-l-2 border-slate-200 pl-4">
                {section.children.map((child) => (
                  <a
                    key={child.title}
                    href="#"
                    className={[
                      "text-xs transition-colors",
                      child.active
                        ? "font-bold text-emerald-900"
                        : "font-semibold text-slate-500 hover:text-emerald-800",
                    ].join(" ")}
                  >
                    {child.title}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </nav>
    </aside>
  );
}
