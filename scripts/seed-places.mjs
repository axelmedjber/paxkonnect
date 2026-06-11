// Geocoded, verified seed of Belgian cultural places across all regions.
// Coordinates are resolved from real street addresses via the Mapbox
// Geocoding API (never hand-typed), then sanity-checked against the
// expected postal code / city. Venues that fail verification are reported
// and NOT inserted, so the map never gets a wrong marker.
//
// Run with: node scripts/seed-places.mjs            (dry run, geocode + report)
//           node scripts/seed-places.mjs --write    (also upsert to Supabase)
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

const MAPBOX_TOKEN = env.NEXT_PUBLIC_MAPBOX_TOKEN;
const WRITE = process.argv.includes("--write");

// region is for reporting only (the places table has no region column);
// it is appended to the French description so operators see the area.
// type ∈ radio | cultural_center | concert_bar | venue | gallery | festival | studio | other
// geocode: "address" (precise street) or "place" (town-level, for festivals)
const venues = [
  // ---- Bruxelles-Capitale ----
  { name: "Ancienne Belgique", type: "venue", address: "Boulevard Anspach 110", postal: "1000", city: "Bruxelles", region: "Bruxelles-Capitale", website: "https://www.abconcerts.be", description: "Salle de concert emblématique au cœur de Bruxelles." },
  { name: "Bozar", type: "venue", address: "Rue Ravenstein 23", postal: "1000", city: "Bruxelles", region: "Bruxelles-Capitale", website: "https://www.bozar.be", description: "Palais des Beaux-Arts, scène pluridisciplinaire majeure." },
  { name: "Botanique", type: "cultural_center", address: "Rue Royale 236", postal: "1210", city: "Saint-Josse-ten-Noode", region: "Bruxelles-Capitale", website: "https://www.botanique.be", description: "Centre culturel et salles de concert dans l'ancien jardin botanique." },
  { name: "Flagey", type: "cultural_center", address: "Place Sainte-Croix", postal: "1050", city: "Ixelles", region: "Bruxelles-Capitale", website: "https://www.flagey.be", description: "Maison de la musique et des arts dans l'iconique « paquebot »." },
  { name: "Cirque Royal", type: "venue", address: "Rue de l'Enseignement 81", postal: "1000", city: "Bruxelles", region: "Bruxelles-Capitale", website: "https://www.cirque-royal.brussels", description: "Salle de spectacle historique au centre de Bruxelles." },
  { name: "Les Halles de Schaerbeek", type: "cultural_center", address: "Rue Royale-Sainte-Marie 22", postal: "1030", city: "Schaerbeek", region: "Bruxelles-Capitale", website: "https://www.halles.be", description: "Centre culturel européen dans une halle du XIXe siècle." },
  { name: "Beursschouwburg", type: "cultural_center", address: "Rue Auguste Orts 20", postal: "1000", city: "Bruxelles", region: "Bruxelles-Capitale", website: "https://www.beursschouwburg.be", description: "Maison des arts urbaine et multidisciplinaire." },
  { name: "Kaaitheater", type: "venue", address: "Square Sainctelette 20", postal: "1000", city: "Bruxelles", region: "Bruxelles-Capitale", website: "https://www.kaaitheater.be", description: "Scène des arts vivants et de la performance contemporaine." },
  { name: "Théâtre National Wallonie-Bruxelles", type: "venue", address: "Boulevard Emile Jacqmain 111", postal: "1000", city: "Bruxelles", region: "Bruxelles-Capitale", website: "https://www.theatrenational.be", description: "Théâtre de la Fédération Wallonie-Bruxelles." },
  { name: "VK Concerts", type: "concert_bar", address: "Rue de l'École 76", postal: "1080", city: "Molenbeek-Saint-Jean", region: "Bruxelles-Capitale", website: "https://www.vkconcerts.be", description: "Club de concerts dédié aux scènes alternatives et émergentes." },
  { name: "Pianofabriek", type: "cultural_center", address: "Rue du Fort 35", postal: "1060", city: "Saint-Gilles", region: "Bruxelles-Capitale", website: "https://www.pianofabriek.be", description: "Centre artistique de quartier à Saint-Gilles." },
  { name: "Forest National", type: "venue", address: "Avenue Victor Rousseau 208", postal: "1190", city: "Forest", region: "Bruxelles-Capitale", website: "https://www.forest-national.be", description: "Grande salle de concerts et de spectacles de Bruxelles." },
  { name: "Recyclart", type: "cultural_center", address: "Rue de Manchester 13", postal: "1080", city: "Molenbeek-Saint-Jean", region: "Bruxelles-Capitale", website: "https://www.recyclart.be", description: "Centre d'art et de musique aux croisements sociaux et urbains." },
  { name: "La Madeleine", type: "venue", address: "Rue Duquesnoy 14", postal: "1000", city: "Bruxelles", region: "Bruxelles-Capitale", website: "https://www.lamadeleine.be", description: "Salle de spectacle polyvalente du centre de Bruxelles." },
  { name: "Radio Panik", type: "radio", address: "Rue Saint-Josse 49", postal: "1210", city: "Saint-Josse-ten-Noode", region: "Bruxelles-Capitale", website: "https://www.radiopanik.org", description: "Radio associative bruxelloise ouverte aux scènes indépendantes." },
  { name: "Radio Campus Bruxelles", type: "radio", address: "Avenue Paul Héger 22", postal: "1000", city: "Bruxelles", region: "Bruxelles-Capitale", website: "https://www.radiocampus.be", description: "Radio étudiante de l'ULB, défricheuse de musiques actuelles." },

  // ---- Wallonie : Hainaut (région de Mons en priorité) ----
  { name: "Arsonic", type: "venue", address: "Rue de Nimy 138", postal: "7000", city: "Mons", region: "Wallonie — Hainaut", website: "https://surmars.be", description: "Maison de l'écoute de MARS, dédiée à la musique, à Mons." },
  { name: "Théâtre le Manège Mons", type: "venue", address: "Rue des Passages 1", postal: "7000", city: "Mons", region: "Wallonie — Hainaut", website: "https://surmars.be", description: "Salle de spectacle du réseau MARS — Mons Arts de la Scène." },
  { name: "Maison Folie de Mons", type: "cultural_center", address: "Rue des Arbalestriers 8", postal: "7000", city: "Mons", region: "Wallonie — Hainaut", website: "https://surmars.be", description: "Lieu de création et de fête ouvert aux projets participatifs montois." },
  { name: "BAM — Beaux-Arts Mons", type: "gallery", address: "Rue Neuve 8", postal: "7000", city: "Mons", region: "Wallonie — Hainaut", website: "https://www.bam.mons.be", description: "Musée des Beaux-Arts de Mons, expositions temporaires." },
  { name: "Théâtre Royal de Mons", type: "venue", address: "Grand-Place 22", postal: "7000", city: "Mons", region: "Wallonie — Hainaut", website: "https://surmars.be", description: "Théâtre à l'italienne sur la Grand-Place de Mons." },
  { name: "Le Vecteur", type: "concert_bar", address: "Rue de Marcinelle 30", postal: "6000", city: "Charleroi", region: "Wallonie — Hainaut", website: "https://www.vecteur.be", description: "Lieu culturel hybride et scène émergente de Charleroi." },
  { name: "Rockerill", type: "concert_bar", address: "Rue de la Providence 134", postal: "6030", city: "Marchienne-au-Pont", region: "Wallonie — Hainaut", website: "https://www.rockerill.com", description: "Friche industrielle devenue temple des musiques électroniques et live." },
  { name: "Eden — Centre culturel de Charleroi", type: "cultural_center", address: "Boulevard Jacques Bertrand 1", postal: "6000", city: "Charleroi", region: "Wallonie — Hainaut", website: "https://www.eden-charleroi.be", description: "Centre culturel pluridisciplinaire de Charleroi." },
  { name: "Palais des Beaux-Arts de Charleroi", type: "venue", address: "Place du Manège 1", postal: "6000", city: "Charleroi", region: "Wallonie — Hainaut", website: "https://www.charleroi-bonheur.be", description: "Grande scène classique et contemporaine de Charleroi." },
  { name: "Maison de la Culture de Tournai", type: "cultural_center", address: "Boulevard des Frères Rimbaut", postal: "7500", city: "Tournai", region: "Wallonie — Hainaut", website: "https://www.maisonculturetournai.com", description: "Centre culturel régional de Wallonie picarde." },
  { name: "Central — La Louvière", type: "cultural_center", address: "Place Jules Mansart 17", postal: "7100", city: "La Louvière", region: "Wallonie — Hainaut", website: "https://www.cestcentral.be", description: "Centre culturel de La Louvière, arts de la scène." },

  // ---- Wallonie : Liège ----
  { name: "Le Forum de Liège", type: "venue", address: "Rue Pont d'Avroy 14", postal: "4000", city: "Liège", region: "Wallonie — Liège", website: "https://www.leforum.be", description: "Salle de spectacle Art déco au cœur de Liège." },
  { name: "Reflektor", type: "concert_bar", address: "Liège", postal: "4000", city: "Liège", region: "Wallonie — Liège", website: "https://www.reflektor.be", description: "Club de concerts liégeois dédié aux musiques actuelles.", geocode: "place" },
  { name: "Théâtre de Liège", type: "venue", address: "Place du Vingt Août 16", postal: "4000", city: "Liège", region: "Wallonie — Liège", website: "https://www.theatredeliege.be", description: "Centre dramatique et scène internationale à Liège." },
  { name: "Opéra Royal de Wallonie", type: "venue", address: "Rue des Dominicains 1", postal: "4000", city: "Liège", region: "Wallonie — Liège", website: "https://www.operaliege.be", description: "Maison d'opéra de la Fédération Wallonie-Bruxelles." },
  { name: "KulturA", type: "concert_bar", address: "Rue Roture 19", postal: "4020", city: "Liège", region: "Wallonie — Liège", website: "https://www.kultura.be", description: "Lieu associatif et scène alternative en Outremeuse." },

  // ---- Wallonie : Namur ----
  { name: "Théâtre de Namur", type: "venue", address: "Place du Théâtre 2", postal: "5000", city: "Namur", region: "Wallonie — Namur", website: "https://www.theatredenamur.be", description: "Scène majeure de la capitale wallonne." },
  { name: "Le Delta", type: "cultural_center", address: "Avenue Fernand Golenvaux 18", postal: "5000", city: "Namur", region: "Wallonie — Namur", website: "https://www.ledelta.be", description: "Pôle culturel de la Province de Namur." },

  // ---- Wallonie : Brabant wallon ----
  { name: "Ferme du Biéreau", type: "venue", address: "Avenue du Jardin Botanique 3", postal: "1348", city: "Louvain-la-Neuve", region: "Wallonie — Brabant wallon", website: "https://www.fermedubiereau.be", description: "Salle de musique dans une ferme brabançonne du XVIIIe siècle." },
  { name: "Aula Magna", type: "venue", address: "Place Raymond Lemaire 1", postal: "1348", city: "Louvain-la-Neuve", region: "Wallonie — Brabant wallon", website: "https://www.aulamagna.be", description: "Grand auditoire et salle de spectacle de Louvain-la-Neuve." },

  // ---- Wallonie : Luxembourg ----
  { name: "Maison de la Culture d'Arlon", type: "cultural_center", address: "Parc des Expositions 1", postal: "6700", city: "Arlon", region: "Wallonie — Luxembourg", website: "https://www.maison-culture-arlon.be", description: "Centre culturel du sud de la province de Luxembourg." },

  // ---- Communauté germanophone ----
  { name: "Kulturzentrum Alter Schlachthof", type: "cultural_center", address: "Rotenberg 16", postal: "4700", city: "Eupen", region: "Communauté germanophone", website: "https://www.alter-schlachthof.be", description: "Centre culturel phare de la Communauté germanophone, à Eupen." },
  { name: "IKOB", type: "gallery", address: "Rotenberg 12", postal: "4700", city: "Eupen", region: "Communauté germanophone", website: "https://www.ikob.be", description: "Musée d'art contemporain de la Communauté germanophone." },
  { name: "Triangel", type: "venue", address: "Vennbahnstraße 2", postal: "4780", city: "Sankt Vith", region: "Communauté germanophone", website: "https://www.triangel.be", description: "Centre culturel et de congrès de Saint-Vith." },
  { name: "Chudoscnik Sunergia", type: "cultural_center", address: "Rotenberg 27", postal: "4700", city: "Eupen", region: "Communauté germanophone", website: "https://www.kpvds.com", description: "Espace artistique et associatif germanophone à Eupen." },

  // ---- Flandre : Anvers ----
  { name: "Trix", type: "concert_bar", address: "Noordersingel 28", postal: "2140", city: "Antwerpen", region: "Flandre — Anvers", website: "https://www.trixonline.be", description: "Club de concerts et lieu de répétition anversois." },
  { name: "De Roma", type: "venue", address: "Turnhoutsebaan 286", postal: "2140", city: "Borgerhout", region: "Flandre — Anvers", website: "https://www.deroma.be", description: "Salle Art déco restaurée par les bénévoles, à Borgerhout." },
  { name: "deSingel", type: "venue", address: "Desguinlei 25", postal: "2018", city: "Antwerpen", region: "Flandre — Anvers", website: "https://www.desingel.be", description: "Campus international des arts à Anvers." },
  { name: "Het Bos", type: "concert_bar", address: "Ankerrui 5", postal: "2000", city: "Antwerpen", region: "Flandre — Anvers", website: "https://www.hetbos.be", description: "Lieu indépendant pour la musique et les arts à Anvers." },
  { name: "Kavka Oudaan", type: "concert_bar", address: "Oudaan 14", postal: "2000", city: "Antwerpen", region: "Flandre — Anvers", website: "https://www.kavka.be", description: "Centre jeunesse et scène alternative anversoise." },

  // ---- Flandre : Flandre-Orientale (Gand) ----
  { name: "Viernulvier", type: "cultural_center", address: "Sint-Pietersnieuwstraat 23", postal: "9000", city: "Gent", region: "Flandre — Flandre-Orientale", website: "https://www.viernulvier.gent", description: "Ex-Vooruit, centre des arts emblématique de Gand." },
  { name: "Handelsbeurs Concertzaal", type: "venue", address: "Kouter 29", postal: "9000", city: "Gent", region: "Flandre — Flandre-Orientale", website: "https://www.handelsbeurs.be", description: "Salle de concerts au cœur de Gand." },
  { name: "De Centrale", type: "cultural_center", address: "Kraankindersstraat 2", postal: "9000", city: "Gent", region: "Flandre — Flandre-Orientale", website: "https://www.decentrale.be", description: "Centre des musiques du monde et des cultures à Gand." },
  { name: "Urgent.fm", type: "radio", address: "Sint-Pietersnieuwstraat 45", postal: "9000", city: "Gent", region: "Flandre — Flandre-Orientale", website: "https://www.urgent.fm", description: "Radio étudiante gantoise, tremplin des nouveaux talents." },

  // ---- Flandre : Flandre-Occidentale ----
  { name: "Concertgebouw Brugge", type: "venue", address: "'t Zand 34", postal: "8000", city: "Brugge", region: "Flandre — Flandre-Occidentale", website: "https://www.concertgebouw.be", description: "Salle de concerts contemporaine de Bruges." },
  { name: "Cactus Muziekcentrum", type: "concert_bar", address: "Magdalenastraat 27", postal: "8200", city: "Brugge", region: "Flandre — Flandre-Occidentale", website: "https://www.cactusmusic.be", description: "Centre musical brugeois et organisateur du Cactusfestival." },
  { name: "De Kreun", type: "concert_bar", address: "Conservatoriumplein 1", postal: "8500", city: "Kortrijk", region: "Flandre — Flandre-Occidentale", website: "https://www.dekreun.be", description: "Club de musiques actuelles à Courtrai." },
  { name: "De Grote Post", type: "cultural_center", address: "Hendrik Serruyslaan 18", postal: "8400", city: "Oostende", region: "Flandre — Flandre-Occidentale", website: "https://www.degrotepost.be", description: "Centre culturel d'Ostende dans l'ancienne poste." },

  // ---- Flandre : Brabant flamand (Louvain) ----
  { name: "Het Depot", type: "venue", address: "Martelarenplein 12", postal: "3000", city: "Leuven", region: "Flandre — Brabant flamand", website: "https://www.hetdepot.be", description: "Salle de concerts de référence à Louvain." },
  { name: "STUK", type: "cultural_center", address: "Naamsestraat 96", postal: "3000", city: "Leuven", region: "Flandre — Brabant flamand", website: "https://www.stuk.be", description: "Maison des arts, danse, image et son à Louvain." },

  // ---- Flandre : Limbourg ----
  { name: "Muziekodroom", type: "concert_bar", address: "Bootstraat 9", postal: "3500", city: "Hasselt", region: "Flandre — Limbourg", website: "https://www.muziekodroom.be", description: "Club de musiques actuelles à Hasselt." },
  { name: "Z33", type: "gallery", address: "Bonnefantenstraat 1", postal: "3500", city: "Hasselt", region: "Flandre — Limbourg", website: "https://www.z33.be", description: "Maison des arts contemporains, du design et de l'architecture." },
  { name: "C-mine", type: "cultural_center", address: "C-mine 10", postal: "3600", city: "Genk", region: "Flandre — Limbourg", website: "https://www.c-mine.be", description: "Site minier reconverti en pôle créatif et culturel à Genk." },

  // ---- Flandre : Anvers (province) ----
  { name: "Het Predikheren / Nona", type: "cultural_center", address: "Begijnenstraat 19", postal: "2800", city: "Mechelen", region: "Flandre — Anvers", website: "https://www.nona.be", description: "Maison des arts vivants et de la musique à Malines." },

  // ---- Festivals (géocodage au niveau de la commune) ----
  { name: "Dour Festival", type: "festival", address: "Rue de la Machine à Feu", postal: "7370", city: "Dour", region: "Wallonie — Hainaut", website: "https://www.dourfestival.eu", description: "Festival majeur des musiques alternatives, à 15 km de Mons.", geocode: "place" },
  { name: "Esperanzah!", type: "festival", address: "Abbaye de Floreffe", postal: "5150", city: "Floreffe", region: "Wallonie — Namur", website: "https://www.esperanzah.be", description: "Festival de musiques du monde à l'abbaye de Floreffe.", geocode: "place" },
  { name: "Les Ardentes", type: "festival", address: "Rocourt", postal: "4000", city: "Liège", region: "Wallonie — Liège", website: "https://www.lesardentes.be", description: "Grand festival urbain hip-hop et électro à Liège.", geocode: "place" },
  { name: "Les Francofolies de Spa", type: "festival", address: "Spa", postal: "4900", city: "Spa", region: "Wallonie — Liège", website: "https://www.francofolies.be", description: "Festival de la chanson et des musiques francophones.", geocode: "place" },
  { name: "Ronquières Festival", type: "festival", address: "Plan incliné de Ronquières", postal: "7090", city: "Ronquières", region: "Wallonie — Hainaut", website: "https://www.ronquieresfestival.be", description: "Festival pop-rock au pied du plan incliné de Ronquières.", geocode: "place" },
  { name: "Rock Werchter", type: "festival", address: "Werchter", postal: "3118", city: "Werchter", region: "Flandre — Brabant flamand", website: "https://www.rockwerchter.be", description: "Festival rock international de renommée mondiale.", geocode: "place" },
  { name: "Pukkelpop", type: "festival", address: "Kiewit", postal: "3500", city: "Hasselt", region: "Flandre — Limbourg", website: "https://www.pukkelpop.be", description: "Festival des musiques alternatives à Hasselt.", geocode: "place" },
  { name: "Tomorrowland", type: "festival", address: "De Schorre", postal: "2850", city: "Boom", region: "Flandre — Anvers", website: "https://www.tomorrowland.com", description: "Festival électronique mondial au domaine De Schorre.", geocode: "place" },
  { name: "Gentse Feesten", type: "festival", address: "Centre-ville", postal: "9000", city: "Gent", region: "Flandre — Flandre-Orientale", website: "https://gentsefeesten.stad.gent", description: "Dix jours de fête et de scènes ouvertes dans tout Gand.", geocode: "place" },
];

async function geocode(venue) {
  const types = venue.geocode === "place" ? "place,locality,address,poi" : "address";
  const query = venue.geocode === "place" ? `${venue.city}, Belgique` : `${venue.address}, ${venue.postal} ${venue.city}`;
  // No language override: keep the local place names (e.g. "Gent", not
  // "Gand") so the city sanity-check below matches the expected value.
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=be&limit=1&types=${types}&access_token=${MAPBOX_TOKEN}`;
  const response = await fetch(url);
  const json = await response.json();
  const feature = json.features?.[0];
  if (!feature) return { ok: false, reason: "no result" };

  const [longitude, latitude] = feature.center;
  const placeName = feature.place_name ?? "";
  const stripAccents = (value) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  // Sanity check: the resolved address must mention the expected postal code
  // (precise) or the expected city name (town-level), accent-insensitive.
  const matchesPostal = placeName.includes(venue.postal);
  const matchesCity = stripAccents(placeName).includes(stripAccents(venue.city));
  const verified = venue.geocode === "place" ? matchesCity : matchesPostal || matchesCity;

  return { ok: true, latitude, longitude, placeName, relevance: feature.relevance, verified, matchesPostal, matchesCity };
}

async function main() {
  const accepted = [];
  const flagged = [];

  for (const venue of venues) {
    const result = await geocode(venue);
    if (!result.ok) {
      flagged.push({ venue, reason: result.reason });
      console.log(`✗ ${venue.name} (${venue.city}) — ${result.reason}`);
      continue;
    }
    const precision = result.matchesPostal ? "postal" : result.matchesCity ? "city" : "none";
    if (!result.verified) {
      flagged.push({ venue, result, reason: `unverified (${precision}) -> ${result.placeName}` });
      console.log(`✗ ${venue.name} (${venue.city}) — UNVERIFIED -> ${result.placeName}`);
      continue;
    }
    accepted.push({
      name: venue.name,
      type: venue.type,
      address: venue.address,
      city: venue.city,
      latitude: Number(result.latitude.toFixed(7)),
      longitude: Number(result.longitude.toFixed(7)),
      website: venue.website ?? null,
      description: `${venue.description} (${venue.region})`,
      is_active: true,
    });
    console.log(`✓ ${venue.name} (${venue.city}) [${precision}] ${result.latitude.toFixed(5)}, ${result.longitude.toFixed(5)}`);
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  console.log(`\n${accepted.length} verified, ${flagged.length} flagged out of ${venues.length}.`);

  if (!WRITE) {
    console.log("\nDry run (no DB write). Re-run with --write to upsert.");
    return;
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await supabase.from("places").upsert(accepted, { onConflict: "name" });
  console.log(`\nUpsert ${accepted.length} places: ${error ? error.message : "OK"}`);

  // Remove rows from the earlier hand-estimated seed that this geocoded run
  // supersedes under a more precise name (avoids near-duplicate markers).
  const superseded = ["Théâtre le Manège", "Maison Folie", "YouFM"];
  const { error: cleanupError, count: removed } = await supabase
    .from("places")
    .delete({ count: "exact" })
    .in("name", superseded);
  console.log(`Cleanup superseded rows: ${cleanupError ? cleanupError.message : `${removed ?? 0} removed`}`);

  const { count } = await supabase.from("places").select("id", { count: "exact", head: true });
  console.log(`places total in DB: ${count}`);
}

await main();
