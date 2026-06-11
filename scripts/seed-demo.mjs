// Idempotent demo seed for the live Supabase project.
// Run with: node scripts/seed-demo.mjs
// Reads SUPABASE credentials from .env.local (service role, server only).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const envPath = fileURLToPath(new URL("../.env.local", import.meta.url));
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const today = new Date();
const inDays = (days) => {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

async function count(table) {
  const { count: value, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) return `error: ${error.message}`;
  return value;
}

async function report(label) {
  const tables = ["profiles", "opportunities", "partners", "places", "portfolio_items", "performances", "matchings"];
  console.log(`\n=== ${label} ===`);
  for (const table of tables) {
    console.log(`  ${table}: ${await count(table)}`);
  }
}

const places = [
  // Mons & alentours
  ["Arsonic", "venue", "Rue de Nimy 138", "Mons", 50.4578, 3.9505, "https://surmars.be", "Maison de l'écoute de MARS — Mons Arts de la Scène, dédiée à la musique."],
  ["Théâtre le Manège", "venue", "Rue des Passages 1", "Mons", 50.4561, 3.9495, "https://surmars.be", "Salle de spectacle du réseau MARS — Mons Arts de la Scène."],
  ["Maison Folie", "cultural_center", "Rue des Arbalestriers 8", "Mons", 50.4528, 3.9482, "https://surmars.be", "Lieu de création et de fête ouvert aux projets participatifs montois."],
  ["BAM — Beaux-Arts Mons", "gallery", "Rue Neuve 8", "Mons", 50.4536, 3.9509, "https://www.bam.mons.be", "Musée des Beaux-Arts de Mons, expositions temporaires."],
  ["Théâtre Royal de Mons", "venue", "Grand-Place 22", "Mons", 50.4549, 3.9519, "https://surmars.be", "Théâtre à l'italienne sur la Grand-Place de Mons."],
  ["YouFM", "radio", "Avenue Maistriau 15", "Mons", 50.4585, 3.9555, "https://youfm.be", "Radio universitaire montoise, ouverte aux sessions d'artistes émergents."],
  ["Dour Festival", "festival", "Plaine de la Machine à Feu", "Dour", 50.3996, 3.7773, "https://www.dourfestival.eu", "Festival majeur des musiques alternatives, à 15 km de Mons."],
  // Wallonie & Bruxelles
  ["Rockerill", "concert_bar", "Rue de la Providence 136", "Charleroi", 50.4046, 4.3934, "https://www.rockerill.com", "Friche industrielle devenue lieu de concerts et de création."],
  ["Eden — Centre culturel de Charleroi", "cultural_center", "Boulevard Jacques Bertrand 1-3", "Charleroi", 50.4124, 4.4396, "https://www.eden-charleroi.be", "Centre culturel pluridisciplinaire de Charleroi."],
  ["Le Forum de Liège", "venue", "Rue Pont d'Avroy 14", "Liège", 50.6412, 5.5718, "https://www.leforum.be", "Salle de spectacle historique du centre de Liège."],
  ["Radio Panik", "radio", "Rue Saint-Josse 49", "Brussels", 50.8538, 4.3713, "https://www.radiopanik.org", "Radio associative bruxelloise ouverte aux scènes indépendantes."],
  ["Esperanzah!", "festival", "Abbaye de Floreffe", "Floreffe", 50.4346, 4.7593, "https://www.esperanzah.be", "Festival de musiques du monde à l'abbaye de Floreffe."],
];

const opportunities = [
  {
    id: "11111111-aaaa-4aaa-8aaa-111111111111",
    title: "Scène ouverte — Maison Folie de Mons",
    category: "event",
    description:
      "La Maison Folie ouvre sa scène aux artistes montois pour une soirée pluridisciplinaire : musique, slam, danse et formes courtes. Conditions techniques de base fournies, captation vidéo offerte aux artistes retenus.",
    location: "Mons",
    organizer: "MonsPax ASBL",
    contact_email: "contact@monspax.be",
    external_url: null,
    deadline: inDays(21),
    is_active: true,
  },
  {
    id: "22222222-bbbb-4bbb-8bbb-222222222222",
    title: "Tremplin jeunes artistes Cœur du Hainaut",
    category: "contest",
    description:
      "Concours pour artistes de moins de 30 ans de la région de Mons-Borinage. À la clé : une première partie de concert, un accompagnement EPK et une session radio.",
    location: "Mons-Borinage",
    organizer: "MonsPax ASBL",
    contact_email: "contact@monspax.be",
    external_url: null,
    deadline: inDays(45),
    is_active: true,
  },
  {
    id: "33333333-cccc-4ccc-8ccc-333333333333",
    title: "Session live YouFM — artistes émergents",
    category: "radio",
    description:
      "La radio universitaire montoise enregistre des sessions live de 20 minutes avec interview, diffusées en FM et en podcast.",
    location: "Mons",
    organizer: "YouFM",
    contact_email: "contact@monspax.be",
    external_url: "https://youfm.be",
    deadline: inDays(30),
    is_active: true,
  },
];

const partners = [
  {
    id: "44444444-dddd-4ddd-8ddd-444444444444",
    name: "YouFM",
    type: "radio",
    website: "https://youfm.be",
    contact_email: "contact@monspax.be",
    description: "Radio universitaire de Mons, partenaire des sessions live PaxKonnect.",
    logo_url: null,
    is_active: true,
  },
  {
    id: "55555555-eeee-4eee-8eee-555555555555",
    name: "Maison Folie de Mons",
    type: "venue",
    website: "https://surmars.be",
    contact_email: "contact@monspax.be",
    description: "Lieu montois de création partagée accueillant les scènes ouvertes PaxKonnect.",
    logo_url: null,
    is_active: true,
  },
];

const demoProfileSlugs = [
  ["11111111-1111-1111-1111-111111111111", "amina-l"],
  ["22222222-2222-2222-2222-222222222222", "noah-v"],
  ["33333333-3333-3333-3333-333333333333", "lina-m"],
];

const demoPerformances = [
  {
    profile_id: "11111111-1111-1111-1111-111111111111",
    event_name: "Fête de la Musique",
    venue_name: "Place du Béguinage",
    city: "Brussels",
    performance_date: "2025-06-21",
    audience_size: "200-500",
    event_type: "festival",
    is_public: true,
  },
  {
    profile_id: "11111111-1111-1111-1111-111111111111",
    event_name: "Session acoustique hivernale",
    venue_name: "Botanique",
    city: "Brussels",
    performance_date: "2025-12-05",
    audience_size: "50-200",
    event_type: "showcase",
    is_public: true,
  },
];

async function main() {
  await report("Avant seed");

  const { error: placesError } = await supabase.from("places").upsert(
    places.map(([name, type, address, city, latitude, longitude, website, description]) => ({
      name,
      type,
      address,
      city,
      latitude,
      longitude,
      website,
      description,
      is_active: true,
    })),
    { onConflict: "name" },
  );
  console.log(`\nplaces upsert: ${placesError ? placesError.message : "OK"}`);

  const { error: oppError } = await supabase.from("opportunities").upsert(opportunities, { onConflict: "id" });
  console.log(`opportunities upsert: ${oppError ? oppError.message : "OK"}`);

  const { error: partnersError } = await supabase.from("partners").upsert(partners, { onConflict: "id" });
  console.log(`partners upsert: ${partnersError ? partnersError.message : "OK"}`);

  // Give the demo artists a slug so their public EPK resolves.
  for (const [id, slug] of demoProfileSlugs) {
    const { data: existing } = await supabase.from("profiles").select("id,slug").eq("id", id).maybeSingle();
    if (!existing) {
      console.log(`profile ${slug}: absent (seed.sql non appliqué pour ce profil), ignoré`);
      continue;
    }
    if (existing.slug) {
      console.log(`profile ${slug}: slug déjà défini (${existing.slug})`);
      continue;
    }
    const { error } = await supabase.from("profiles").update({ slug }).eq("id", id);
    console.log(`profile ${slug}: ${error ? error.message : "slug ajouté"}`);
  }

  // Demo stage experience for the EPK (skip if already present).
  for (const performance of demoPerformances) {
    const { data: existing } = await supabase
      .from("performances")
      .select("id")
      .eq("profile_id", performance.profile_id)
      .eq("event_name", performance.event_name)
      .maybeSingle();
    if (existing) {
      console.log(`performance "${performance.event_name}": déjà présente`);
      continue;
    }
    const { error } = await supabase.from("performances").insert(performance);
    console.log(`performance "${performance.event_name}": ${error ? error.message : "ajoutée"}`);
  }

  await report("Après seed");
}

await main();
