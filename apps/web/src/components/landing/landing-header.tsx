"use client";

import Link from "next/link";
import { useState } from "react";
import { User, Menu, X } from "lucide-react";

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="w-full sticky top-0 z-50 backdrop-blur-md bg-white/60 border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6 md:px-20 py-5">
        {/* Logo */}
        <Link
          href="/"
          className="font-display font-bold text-2xl text-forest-900 tracking-tight"
        >
          HotelVALORA
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-10">
          <Link
            href="#"
            className="text-sm font-semibold text-slate-500 hover:text-forest-900 transition-colors tracking-wide uppercase"
          >
            Biblioteca
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-500 hover:text-forest-900 transition-colors tracking-wide uppercase"
          >
            Login
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-forest-900 text-white rounded-lg text-sm font-bold shadow-sm hover:shadow-md transition-all"
          >
            <User size={18} />
            USUARIO
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-forest-900"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 px-6 py-4 flex flex-col gap-4">
          <Link
            href="#"
            className="text-sm font-semibold text-slate-500 uppercase tracking-wide hover:text-forest-900 transition-colors"
          >
            Biblioteca
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-500 uppercase tracking-wide hover:text-forest-900 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-forest-900 text-white rounded-lg text-sm font-bold w-fit"
          >
            <User size={16} />
            USUARIO
          </Link>
        </div>
      )}
    </header>
  );
}
