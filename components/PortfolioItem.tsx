import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioItem as PortfolioItemType } from "@/lib/types";

import { EmbedPlayer } from "./EmbedPlayer";

export function PortfolioItem({ item }: { item: PortfolioItemType }) {
  const t = useTranslations("portfolio_item");

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{item.title}</CardTitle>
          <Badge variant="secondary">{item.type}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {item.url ? <EmbedPlayer url={item.url} title={item.title} /> : null}
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="break-all text-sm font-medium text-primary hover:underline"
          >
            {t("open_link")}
          </a>
        ) : null}
        {item.description ? (
          <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
