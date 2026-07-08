import "./globals.css";

export const metadata = {
  title: "Save Philly Festivals",
  description: "Discover and manage Philadelphia festivals",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
