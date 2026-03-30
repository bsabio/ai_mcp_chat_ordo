import type { Metadata } from "next";
import { cookies } from "next/headers";
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
import { UserPreferencesDataMapper } from "@/adapters/UserPreferencesDataMapper";
import { AppShell } from "@/components/AppShell";
import { ChatSurface } from "@/frameworks/ui/ChatSurface";
import { getSessionUser } from "@/lib/auth";
import { getInstanceIdentity, getInstancePrompts } from "@/lib/config/instance";
import { InstanceConfigProvider } from "@/lib/config/InstanceConfigContext";
import { getDb } from "@/lib/db";
import { searchAction } from "@/lib/search/global-search-actions";
import {
  DEFAULT_THEME_STATE,
  THEME_COOKIE_KEYS,
  buildThemeBootstrapScript,
  getThemeDocumentState,
  mergeThemeStateSnapshots,
  parseThemeStateFromCookies,
  parseThemeStateFromPreferences,
} from "@/lib/theme/theme-state";

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
  const cookieStore = await cookies();

  const cookieThemeState = parseThemeStateFromCookies({
    theme: cookieStore.get(THEME_COOKIE_KEYS.theme)?.value,
    dark: cookieStore.get(THEME_COOKIE_KEYS.dark)?.value,
    fontSize: cookieStore.get(THEME_COOKIE_KEYS.fontSize)?.value,
    lineHeight: cookieStore.get(THEME_COOKIE_KEYS.lineHeight)?.value,
    letterSpacing: cookieStore.get(THEME_COOKIE_KEYS.letterSpacing)?.value,
    density: cookieStore.get(THEME_COOKIE_KEYS.density)?.value,
    colorBlindMode: cookieStore.get(THEME_COOKIE_KEYS.colorBlindMode)?.value,
  });

  const preferenceThemeState = user.roles.includes("ANONYMOUS")
    ? null
    : parseThemeStateFromPreferences(
        await new UserPreferencesDataMapper(getDb()).getAll(user.id),
      );

  const initialThemeState = mergeThemeStateSnapshots(
    DEFAULT_THEME_STATE,
    preferenceThemeState,
    cookieThemeState,
  );
  const themeDocumentState = getThemeDocumentState(initialThemeState);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={themeDocumentState.className}
      data-theme={themeDocumentState.attributes["data-theme"]}
      data-theme-mode={themeDocumentState.attributes["data-theme-mode"]}
      data-theme-transition={themeDocumentState.attributes["data-theme-transition"]}
      data-density={themeDocumentState.attributes["data-density"]}
      data-color-blind={themeDocumentState.attributes["data-color-blind"]}
      style={themeDocumentState.style}
    >
      <head>
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {buildThemeBootstrapScript({ respectSystemDarkMode })}
        </Script>
      </head>
      <body
        className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${fraunces.variable} antialiased`}
      >
        <ThemeProvider
          respectSystemDarkMode={respectSystemDarkMode}
          initialThemeState={initialThemeState}
        >
          <InstanceConfigProvider identity={identity} prompts={prompts}>
            <ChatProvider initialRole={user.roles[0]}>
              <AppShell user={user} searchAction={searchAction}>{children}</AppShell>
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
