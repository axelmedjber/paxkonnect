import { CalendarIcon, MapPinIcon } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { localizedPath } from "@/lib/routes";
import type { Opportunity } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type OpportunityCardProps = {
  opportunity: Opportunity;
};

function isClosingSoon(deadline: string | null) {
  if (!deadline) {
    return false;
  }

  const deadlineTime = new Date(deadline).getTime();
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  return deadlineTime >= now && deadlineTime - now < sevenDays;
}

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const locale = useLocale();
  const t = useTranslations("opportunities");
  const common = useTranslations("common");
  const closingSoon = isClosingSoon(opportunity.deadline);

  return (
    <Card
      className={cn(
        "flex h-full flex-col border-purple-100 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800",
        closingSoon && "border-l-4 border-l-accent",
      )}
    >
      <CardHeader className="gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{opportunity.category}</Badge>
          {closingSoon ? <Badge variant="gold">{t("closing_soon")}</Badge> : null}
        </div>
        <CardTitle className="leading-6">{opportunity.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 text-sm text-muted-foreground">
        {opportunity.organizer ? <p>{opportunity.organizer}</p> : null}
        <p className="flex items-center gap-2">
          <MapPinIcon data-icon="inline-start" />
          {opportunity.location || common("belgium")}
        </p>
        <p className="flex items-center gap-2">
          <CalendarIcon data-icon="inline-start" />
          {formatDate(opportunity.deadline, common("no_deadline"), locale)}
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href={localizedPath(locale, `/opportunities/${opportunity.id}`)}>{t("view")}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
