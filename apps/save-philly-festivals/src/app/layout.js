import "./globals.css";

import { Albert_Sans, Maven_Pro, Nunito, Montaga, Inter, DM_Sans } from "next/font/google";
import { ScheduleProvider } from "@/features/schedule/schedule-context";
import Providers from "@/components/layouts/Providers";

const albertSans = Albert_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "600", "700"],
});

const mavenPro = Maven_Pro({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "700"],
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-logo",
  weight: ["700"],
});

const montaga = Montaga({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
  weight: ["400", "500", "700"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-footer",
  weight: ["400", "500", "700"],
});

export const metadata = {
  title: "Save Philly Festivals",
  description: "Discover and manage Philadelphia festivals",
};

/**
 * The document shell only: fonts, providers, and <body>.
 *
 * Navigation, footer, and the main landmark belong to each route group's own layout — see
 * `(public)/layout.jsx`, `admin/layout.jsx`, `producer/layout.jsx`, and `(auth)/layout.jsx`.
 * Keeping chrome out of here also keeps `auth()` off the public request path: this layout runs
 * for every page, and it previously resolved a session on purely public routes just to decide
 * whether to draw a footer.
 */
export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${albertSans.variable} ${mavenPro.variable} ${nunito.variable} ${montaga.variable} ${inter.variable} ${dmSans.variable}`}
    >
      <body className="antialiased">
        <Providers>
          <ScheduleProvider>
            {children}
          </ScheduleProvider>
        </Providers>
      </body>
    </html>
  );
}
