import "./globals.css";

import { Albert_Sans, Maven_Pro, Nunito, Montaga, Inter, DM_Sans } from "next/font/google";
import { RootLayout as LayoutShell } from "@/components/layouts/RootLayout";
import { ScheduleProvider } from "@/features/schedule/schedule-context";

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

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${albertSans.variable} ${mavenPro.variable} ${nunito.variable} ${montaga.variable} ${inter.variable} ${dmSans.variable}`}
    >
      <body className="antialiased">
        <ScheduleProvider>
          <LayoutShell>{children}</LayoutShell>
        </ScheduleProvider>
      </body>
    </html>
  );
}
