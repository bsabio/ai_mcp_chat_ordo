import type { Metadata } from "next";
import Script from "next/script";
import {
  Fraunces,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
} from "next/font/google";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

import { ThemeProvider } from "@/components/ThemeProvider";
import { AppShell } from "@/components/AppShell";
import { ChatSurface } from "@/frameworks/ui/ChatSurface";
import { getSessionUser } from "@/lib/auth";
import { getInstanceIdentity, getInstancePrompts } from "@/lib/config/instance";
import { InstanceConfigProvider } from "@/lib/config/InstanceConfigContext";

export async function generateMetadata(): Promise<Metadata> {
  const identity = getInstanceIdentity();
  const canonicalUrl = `https://${identity.domain}`;

  return {
    metadataBase: new URL(canonicalUrl),
    title: `${identity.name} | ${identity.tagline}`,
    description: identity.description,
    alternates: { canonical: "/" },
    openGraph: {
      title: `${identity.name} | ${identity.tagline}`,
      description: identity.description,
      url: canonicalUrl,
      siteName: identity.name,
      type: "website",
      images: [{ url: identity.logoPath }],
    },
  };
}

import { ChatProvider } from "@/hooks/useGlobalChat";
import { Suspense } from "react";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const identity = getInstanceIdentity();
  const prompts = getInstancePrompts();
  const user = await getSessionUser();
  const respectSystemDarkMode = !user.roles.includes("ANONYMOUS");

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${fraunces.variable} antialiased`}
      >
        <ThemeProvider respectSystemDarkMode={respectSystemDarkMode}>
          <InstanceConfigProvider identity={identity} prompts={prompts}>
            <ChatProvider initialRole={user.roles[0]}>
              <AppShell user={user}>{children}</AppShell>
              <Suspense fallback={null}>
                <ChatSurface mode="floating" />
              </Suspense>

            </ChatProvider>
          </InstanceConfigProvider>
        </ThemeProvider>
        {identity.analytics?.plausibleDomain && (
          <Script
            defer
            data-domain={identity.analytics.plausibleDomain}
            src={identity.analytics.plausibleSrc ?? "https://plausible.io/js/script.js"}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
