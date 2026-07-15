import { NavBar } from "@/components/shared/NavBar";
import { Footer } from "@/components/shared/Footer";

export function RootLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
