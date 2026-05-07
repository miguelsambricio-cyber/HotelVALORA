import Link from "next/link";
import { BookOpen, CircleUser } from "lucide-react";

// Matches the Stitch fixed top navigation bar exactly.
export function ReportTopNav() {
  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md shadow-sm print:hidden">
      <div className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto">

        {/* Logo */}
        <Link href="/" className="text-2xl font-bold tracking-tighter text-emerald-950 hover:opacity-80 transition-opacity">
          HotelVALORA
        </Link>

        {/* Nav links + account */}
        <nav className="flex items-center gap-8">
          <div className="flex gap-6 items-center">
            <Link
              href="#"
              className="font-headline font-medium text-sm tracking-tight text-slate-600 hover:text-emerald-900 transition-colors flex items-center gap-2"
            >
              <BookOpen size={18} aria-hidden />
              Biblioteca
            </Link>
            <Link
              href="#"
              className="font-headline font-medium text-sm tracking-tight text-slate-600 hover:text-emerald-900 transition-colors"
            >
              Login
            </Link>
          </div>

          <div className="h-8 w-px bg-slate-200" />

          <button
            type="button"
            aria-label="Mi cuenta"
            className="text-emerald-950 hover:bg-slate-50 p-2 rounded-full transition-colors"
          >
            <CircleUser size={24} />
          </button>
        </nav>
      </div>
    </header>
  );
}
