import type { Route } from "next";

export function localizedPath(locale: string, path = ""): Route {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const suffix = normalizedPath === "/" ? "" : normalizedPath;

  return `/${locale}${suffix}` as Route;
}
