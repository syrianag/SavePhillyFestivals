import { NavBar } from "@/components/shared/NavBar";
import { Footer } from "@/components/shared/Footer";

export function RootLayout({ children, isStaff }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-white px-4 py-2 font-ui font-bold text-black shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-black"
      >
        Skip to main content
      </a>
      <NavBar />
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 pb-16">
        {children}
      </main>
      {!isStaff && <Footer />}
    </div>
  );
}
