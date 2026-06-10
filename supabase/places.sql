CREATE TABLE IF NOT EXISTS places (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN (
    'radio', 'cultural_center', 'concert_bar',
    'venue', 'gallery', 'festival', 'studio', 'other'
  )) NOT NULL,
  address TEXT,
  city TEXT,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  website TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS places_name_key ON places(name);

ALTER TABLE places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Places visible to everyone" ON places;
CREATE POLICY "Places visible to everyone"
ON places FOR SELECT USING (is_active = true);

INSERT INTO places (name, type, address, city, latitude, longitude, website, description) VALUES
('Ancienne Belgique', 'venue', 'Boulevard Anspach 110', 'Brussels', 50.8476, 4.3497, 'https://www.abconcerts.be', 'Salle de concert emblématique de Bruxelles'),
('Botanique', 'venue', 'Rue Royale 236', 'Brussels', 50.8584, 4.3641, 'https://www.botanique.be', 'Centre culturel et salle de spectacle'),
('Le Vecteur', 'cultural_center', 'Rue de Dampremy 17', 'Charleroi', 50.4051, 4.4444, 'https://www.vecteur.be', 'Centre culturel de Charleroi'),
('Reflektor', 'venue', 'Rue de la Rotonde 12', 'Liège', 50.6292, 5.5797, 'https://www.reflektor.be', 'Salle de concert à Liège'),
('Trix', 'venue', 'Noordersingel 28', 'Antwerp', 51.2194, 4.4025, 'https://www.trixonline.be', 'Concert venue in Antwerp'),
('La Madeleine', 'venue', 'Rue de la Madeleine 51', 'Brussels', 50.8462, 4.3539, 'https://www.lamadeleine.be', 'Historic concert hall Brussels'),
('Muziekcentrum Track', 'cultural_center', 'Vlasmarkt 21', 'Ghent', 51.0543, 3.7174, 'https://www.muziekcentrumtrack.be', 'Music center Ghent'),
('Radio 21', 'radio', 'Avenue Georgin 2', 'Brussels', 50.8756, 4.3547, 'https://www.radio21.be', 'Radio belge francophone'),
('Studio L Arbre', 'studio', 'Rue de Liverpool 24', 'Brussels', 50.8312, 4.3701, null, 'Studio d enregistrement indépendant'),
('Recyclart', 'cultural_center', 'Rue des Ursulines 25', 'Brussels', 50.8403, 4.3478, 'https://www.recyclart.be', 'Arts center and concert venue')
ON CONFLICT (name) DO NOTHING;
