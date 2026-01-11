import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Stargazer",
  description:
    "Find the best stargazing spots near you based on light pollution data.",
  manifest: "/manifest.json",
  themeColor: "#1e3a5f",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Stargazer",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icons/icon-192.png",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
