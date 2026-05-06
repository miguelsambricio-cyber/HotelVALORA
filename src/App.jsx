import { useState } from "react";
import Sidebar from "./components/Sidebar";
import DetailRow from "./components/DetailRow";
import ImageCarousel from "./components/ImageCarousel";
import {
  assetDetails,
  facilities,
  galleryItems,
  guestNotes,
  heroImages,
  roomMix,
  sidebarSections,
} from "./data/reportData";

export default function App() {
  const [hotelEnabled, setHotelEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState("catastro");

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-body text-on-background antialiased">
      <header className="fixed top-0 z-50 w-full bg-white/80 shadow-sm backdrop-blur-md no-print">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-8 py-4">
          <div className="text-2xl font-bold tracking-tighter text-emerald-950">
            HotelVALORA
          </div>

          <nav className="flex items-center gap-8">
            <div className="flex items-center gap-6">
              <a
                className="flex items-center gap-2 text-sm font-medium tracking-tight text-slate-600 transition-colors hover:text-emerald-900"
                href="#"
              >
                <span className="material-symbols-outlined text-lg">local_library</span>
                Biblioteca
              </a>
              <a
                className="text-sm font-medium tracking-tight text-slate-600 transition-colors hover:text-emerald-900"
                href="#"
              >
                Login
              </a>
            </div>

            <div className="h-8 w-px bg-slate-200" />

            <button
              aria-label="Perfil"
              className="rounded-full p-2 text-emerald-950 transition-colors hover:bg-slate-50"
              type="button"
            >
              <span className="material-symbols-outlined">account_circle</span>
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-grow gap-8 px-4 pt-24 md:px-8">
        <Sidebar sections={sidebarSections} />

        <main className="mx-auto w-full max-w-5xl flex-grow pb-16 print-container">
          <div className="graph-paper overflow-hidden rounded-xl border-x border-y border-blue-100 bg-white shadow-2xl">
            <div className="border-b border-blue-200 bg-white/95 p-8">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex w-full flex-col items-end gap-2 text-right">
                  <button
                    className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-on-secondary shadow-md transition-all hover:brightness-110 active:scale-95 no-print"
                    onClick={() => window.print()}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-base">print</span>
                    Exportar PDF
                  </button>
                </div>
              </div>

              <div className="mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  hotel valuation
                </span>

                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <h2 className="font-headline text-4xl font-extrabold tracking-tighter text-primary">
                    Asset Analysis
                  </h2>

                  <div className="flex items-center gap-4">
                    <span className="font-headline text-xl font-bold text-slate-700">
                      Hotel personalizado
                    </span>

                    <button
                      aria-checked={hotelEnabled}
                      className={[
                        "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                        hotelEnabled ? "bg-emerald-700" : "bg-slate-300",
                      ].join(" ")}
                      onClick={() => setHotelEnabled((value) => !value)}
                      role="switch"
                      type="button"
                    >
                      <span className="sr-only">Toggle hotel status</span>
                      <span
                        aria-hidden="true"
                        className={[
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          hotelEnabled ? "translate-x-5" : "translate-x-0",
                        ].join(" ")}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 py-6">
              <section>
                <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-10">
                  <div className="flex flex-col md:col-span-6">
                    {assetDetails.map((item, index) => (
                      <DetailRow
                        key={item.label}
                        label={item.label}
                        last={index === assetDetails.length - 1}
                        value={item.value}
                      />
                    ))}

                    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h4 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                          Facilities
                        </h4>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] text-slate-700">
                          {facilities.map((item) => (
                            <div key={item.label} className="flex items-center gap-2">
                              <span
                                className={[
                                  "material-symbols-outlined text-[16px] font-bold",
                                  item.available ? "text-emerald-600" : "text-slate-400",
                                ].join(" ")}
                              >
                                {item.available ? "check" : "horizontal_rule"}
                              </span>
                              {item.label}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex justify-between">
                          <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                            Room Mix
                          </h4>
                        </div>

                        <div className="flex flex-col text-[13px]">
                          <div className="grid h-[28px] grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-slate-100">
                            <span className="text-[11px] font-medium uppercase text-slate-500">
                              Type
                            </span>
                            <span className="w-12 text-right text-[10px] font-medium uppercase text-slate-400">
                              Units
                            </span>
                            <span className="w-12 text-right text-[10px] font-medium uppercase text-slate-400">
                              Avg size (m²)
                            </span>
                          </div>

                          {roomMix.map((item, index) => (
                            <div
                              key={item.type}
                              className={[
                                "grid h-[42px] grid-cols-[1fr_auto_auto] items-center gap-4",
                                index === roomMix.length - 1 ? "" : "border-b border-slate-100",
                              ].join(" ")}
                            >
                              <span className="text-[11px] font-medium text-slate-500">
                                {item.type}
                              </span>
                              <span className="w-12 text-right text-sm font-bold text-[#0E4B31]">
                                {item.units}
                              </span>
                              <span className="w-12 text-right text-[11px] font-medium text-slate-400">
                                {item.avgSize}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                      {guestNotes.map((item) => (
                        <div
                          key={item.title}
                          className="flex h-full flex-col rounded-lg border border-slate-200 bg-slate-50 p-6"
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <span
                              className={[
                                "material-symbols-outlined text-[18px] font-bold",
                                item.iconColor,
                              ].join(" ")}
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              {item.icon}
                            </span>
                            <h4 className="text-[11px] font-medium uppercase tracking-widest text-slate-500">
                              {item.title}
                            </h4>
                          </div>
                          <p className="text-sm leading-snug text-slate-500">{item.text}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 border-t border-slate-200 pt-3">
                      <p className="border-l-4 border-emerald-500 pl-3 text-[11px] font-medium leading-tight text-slate-500">
                        <strong className="mb-0.5 block text-primary">Nota metodológica</strong>
                        Valoración realizada con modelo dinámico v1.1 basado en parámetros operativos del
                        activo y transacciones hoteleras del submercado. Cálculos en USD y estándar
                        accounting USALI. El Cap Rate se calcula sobre EBITDA neto (operaciones). Esta
                        valoración no sustituye un informe RICS-certified appraisal.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 md:col-span-4">
                    <div className="aspect-square w-full overflow-hidden rounded-lg border border-slate-200 bg-[#f6f8f7] shadow-sm">
                      <img
                        alt="Property Overview"
                        className="h-full w-full object-cover"
                        src={heroImages[activeTab]}
                      />
                    </div>

                    <div className="flex justify-center gap-6">
                      {[
                        ["catastro", "Catastro"],
                        ["planos", "Ver Planos"],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          className={[
                            "border-b-2 pb-1 text-xs font-bold uppercase tracking-widest transition-colors",
                            activeTab === key
                              ? "border-[#0E4B31] text-[#0E4B31]"
                              : "border-transparent text-slate-400 hover:text-[#0E4B31]",
                          ].join(" ")}
                          onClick={() => setActiveTab(key)}
                          type="button"
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="mt-8">
                      <h4 className="mb-4 border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                        GRAFICOS: MYPRORERTY
                      </h4>

                      <div className="flex flex-col gap-4">
                        {galleryItems.map((item) => (
                          <ImageCarousel
                            key={item.title}
                            images={item.images}
                            title={item.title}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="mt-6 grid h-16 grid-cols-3 gap-1 overflow-hidden rounded-xl border border-slate-200 shadow-lg no-print">
            <button
              className="flex flex-col items-center justify-center border-r border-black/10 bg-white text-xs font-bold uppercase tracking-widest text-black transition-colors hover:bg-slate-50"
              type="button"
            >
              FAVORITOS
            </button>
            <button
              className="flex flex-col items-center justify-center border-r border-black/10 bg-white text-xs font-bold uppercase tracking-widest text-black transition-colors hover:bg-slate-50"
              type="button"
            >
              GUARDAR
              <span className="text-[8px] opacity-60">Página 1 de 1</span>
            </button>
            <button
              className="flex flex-col items-center justify-center bg-secondary text-xs font-bold uppercase tracking-widest text-on-secondary transition-colors hover:bg-slate-50 hover:text-black"
              type="button"
            >
              UPGRADE
            </button>
          </div>
        </main>
      </div>

      <footer className="mt-12 w-full bg-slate-950 py-8 no-print">
        <div className="flex flex-col items-center justify-between gap-4 px-12 md:flex-row">
          <div className="text-xs uppercase tracking-widest text-slate-400">
            © 2024 HotelVALORA Institutional. All rights reserved.
          </div>
          <div className="flex gap-8">
            <a
              className="text-xs uppercase tracking-widest text-slate-500 transition-colors hover:text-white hover:underline"
              href="#"
            >
              Privacy Policy
            </a>
            <a
              className="text-xs uppercase tracking-widest text-slate-500 transition-colors hover:text-white hover:underline"
              href="#"
            >
              Terms of Service
            </a>
            <a
              className="text-xs uppercase tracking-widest text-slate-500 transition-colors hover:text-white hover:underline"
              href="#"
            >
              Compliance
            </a>
            <a
              className="text-xs uppercase tracking-widest text-slate-500 transition-colors hover:text-white hover:underline"
              href="#"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
