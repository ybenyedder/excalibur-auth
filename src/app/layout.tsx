import type { Metadata, Viewport } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const roboto = Roboto({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Excalibur — Authenticator",
  description:
    "Self-hosted, zero-knowledge TOTP authenticator. Codes are encrypted in your browser; the server never sees your secrets.",
  applicationName: "Excalibur",
  authors: [{ name: "Excalibur" }],
  keywords: ["TOTP", "2FA", "authenticator", "OTP", "self-hosted", "zero-knowledge"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Excalibur",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      {
        url:
          "data:image/svg+xml," +
          encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%231a73e8'/><g transform='rotate(-90 16 16)'><circle cx='16' cy='16' r='9' fill='none' stroke='%23ffffff' stroke-width='3' stroke-linecap='round' stroke-dasharray='42 57'/></g><circle cx='16' cy='16' r='2.4' fill='%23ffffff'/></svg>`
          ),
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1b1f" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${roboto.variable} ${robotoMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
