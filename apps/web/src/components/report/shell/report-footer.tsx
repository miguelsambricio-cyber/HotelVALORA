import Link from "next/link";

export function ReportFooter() {
  return (
    <footer className="bg-slate-950 text-slate-400 px-8 py-10 print:hidden">
      <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <p className="text-white font-bold tracking-tighter text-lg mb-1">HotelVALORA</p>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} HotelVALORA Institutional. All rights reserved.
          </p>
        </div>

        <nav className="flex flex-wrap gap-6 text-xs font-medium text-slate-400">
          <Link href="#" className="hover:text-white transition-colors">
            Términos de uso
          </Link>
          <Link href="#" className="hover:text-white transition-colors">
            Privacidad
          </Link>
          <Link href="#" className="hover:text-white transition-colors">
            Metodología
          </Link>
          <Link href="#" className="hover:text-white transition-colors">
            Contacto
          </Link>
        </nav>
      </div>
    </footer>
  );
}
