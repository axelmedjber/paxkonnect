import { getRequestConfig } from "next-intl/server";

const locales = ["fr", "en", "nl", "de"] as const;
const defaultLocale = "fr";

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale =
    typeof requestedLocale === "string" &&
    locales.some((supportedLocale) => supportedLocale === requestedLocale)
      ? requestedLocale
      : defaultLocale;
  const messages = (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
  };
});
