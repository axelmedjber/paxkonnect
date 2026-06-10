import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

const locales = ["fr", "en", "nl", "de"] as const;
type Locale = (typeof locales)[number];

const handleI18nRouting = createMiddleware({
  locales,
  defaultLocale: "fr",
  localeDetection: false,
});

function isLocale(value: string | undefined): value is Locale {
  return locales.some((locale) => locale === value);
}

function localeFromAcceptLanguage(header: string | null): Locale {
  const languageTags = header
    ?.split(",")
    .map((entry) => entry.trim().split(";")[0]?.toLowerCase())
    .filter(Boolean);

  for (const tag of languageTags ?? []) {
    const primaryLanguage = tag.split("-")[0];
    if (isLocale(primaryLanguage)) {
      return primaryLanguage;
    }
  }

  return "fr";
}

function detectLocale(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;

  if (isLocale(cookieLocale)) {
    return cookieLocale;
  }

  return localeFromAcceptLanguage(request.headers.get("accept-language"));
}

export function proxy(request: NextRequest) {
  const pathnameLocale = request.nextUrl.pathname.split("/")[1];

  if (!isLocale(pathnameLocale)) {
    const locale = detectLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${request.nextUrl.pathname}`;

    return NextResponse.redirect(url);
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: ["/((?!api|_next|auth|epk|.*\\..*).*)"],
};
