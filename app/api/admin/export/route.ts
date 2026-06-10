import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Matching, Opportunity, Profile } from "@/lib/types";

type ExportType = "applications" | "opportunities" | "profiles";

type ApplicationExportRow = Matching & {
  opportunity: Pick<Opportunity, "title"> | null;
  profile: Pick<Profile, "full_name" | "stage_name"> | null;
};

function isExportType(value: string | null): value is ExportType {
  return value === "applications" || value === "opportunities" || value === "profiles";
}

function csvEscape(value: string | number | boolean | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function buildCsv(headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>) {
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ].join("\n");
}

async function assertAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey || serviceRoleKey === "your_service_role_key") {
    return false;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.role === "admin";
}

export async function GET(request: NextRequest) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const type = request.nextUrl.searchParams.get("type");

  if (!isExportType(type)) {
    return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  let csv = "";

  if (type === "profiles") {
    const [{ data: profiles }, authUsersResponse] = await Promise.all([
      adminSupabase.from("profiles").select("*").order("created_at", { ascending: false }),
      adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    const emailByUserId = new Map(
      (authUsersResponse.data?.users ?? []).map((authUser) => [authUser.id, authUser.email ?? ""]),
    );
    csv = buildCsv(
      ["id", "email", "full_name", "stage_name", "city", "role", "is_member", "disciplines", "created_at"],
      (profiles ?? []).map((profile) => [
        profile.id,
        emailByUserId.get(profile.id) ?? "",
        profile.full_name,
        profile.stage_name,
        profile.city,
        profile.role,
        profile.is_member,
        profile.artistic_disciplines?.join("; "),
        profile.created_at,
      ]),
    );
  }

  if (type === "opportunities") {
    const { data: opportunities } = await adminSupabase
      .from("opportunities")
      .select("*")
      .order("created_at", { ascending: false });
    csv = buildCsv(
      [
        "id",
        "title",
        "category",
        "organizer",
        "location",
        "contact_email",
        "deadline",
        "is_active",
        "operator_id",
        "created_at",
      ],
      (opportunities ?? []).map((opportunity) => [
        opportunity.id,
        opportunity.title,
        opportunity.category,
        opportunity.organizer,
        opportunity.location,
        opportunity.contact_email,
        opportunity.deadline,
        opportunity.is_active,
        opportunity.operator_id,
        opportunity.created_at,
      ]),
    );
  }

  if (type === "applications") {
    const { data: applications } = await adminSupabase
      .from("matchings")
      .select("*, profile:profiles(full_name,stage_name), opportunity:opportunities(title)")
      .order("applied_at", { ascending: false });
    csv = buildCsv(
      ["id", "artist", "opportunity", "status", "message", "applied_at"],
      ((applications ?? []) as ApplicationExportRow[]).map((application) => [
        application.id,
        application.profile?.stage_name || application.profile?.full_name || "",
        application.opportunity?.title || "",
        application.status,
        application.message,
        application.applied_at,
      ]),
    );
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="paxkonnect-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
