import type { Metadata } from "next";
import { Poppins } from "next/font/google";

import { Toaster } from "@/components/ui/toaster";
import { I18nProvider } from "@/infrastructure/i18n/I18nProvider";
import { ActorSessionProvider } from "@/modules/access-control/presentation/context/ActorSessionContext";

import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Simple POS",
  description: "Tablet-first POS MVP for kiosk operations",
  applicationName: "Simple POS",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={poppins.className}>
        <I18nProvider>
          <ActorSessionProvider>
            {children}
            <Toaster />
          </ActorSessionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
