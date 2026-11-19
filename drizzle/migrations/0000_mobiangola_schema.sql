-- ===== Roles =====
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ===== updated_at helper =====
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ===== Provinces / cities =====
CREATE TABLE public.provinces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id uuid NOT NULL REFERENCES public.provinces(id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  center_lat double precision NOT NULL,
  center_lng double precision NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== Stops =====
CREATE TABLE public.stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE RESTRICT,
  name text NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}',
  lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  boarding_notes text,
  verified boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city_id, name)
);
CREATE TRIGGER stops_updated_at BEFORE UPDATE ON public.stops FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Transport types =====
CREATE TABLE public.transport_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== Routes =====
CREATE TABLE public.routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE RESTRICT,
  transport_type_id uuid NOT NULL REFERENCES public.transport_types(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  vehicle_destination text NOT NULL,
  operator text,
  notes text,
  is_demo boolean NOT NULL DEFAULT false,
  verified boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city_id, code)
);
CREATE TRIGGER routes_updated_at BEFORE UPDATE ON public.routes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  stop_id uuid NOT NULL REFERENCES public.stops(id) ON DELETE RESTRICT,
  seq integer NOT NULL CHECK (seq >= 1),
  minutes_from_start integer CHECK (minutes_from_start IS NULL OR minutes_from_start >= 0),
  can_board boolean NOT NULL DEFAULT true,
  can_alight boolean NOT NULL DEFAULT true,
  boarding_notes text,
  UNIQUE (route_id, seq),
  UNIQUE (route_id, stop_id)
);
CREATE INDEX route_stops_stop_idx ON public.route_stops(stop_id);

-- ===== Fares =====
CREATE TABLE public.fares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  from_stop_id uuid REFERENCES public.stops(id) ON DELETE CASCADE,
  to_stop_id uuid REFERENCES public.stops(id) ON DELETE CASCADE,
  amount_kz numeric(10,2) NOT NULL CHECK (amount_kz >= 0),
  is_demo boolean NOT NULL DEFAULT false,
  verified boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((from_stop_id IS NULL) = (to_stop_id IS NULL))
);
CREATE INDEX fares_route_idx ON public.fares(route_id);

-- ===== Verifications =====
CREATE TABLE public.verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('route','stop','fare')),
  entity_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('verificado','nao_verificado','rejeitado')),
  notes text,
  verified_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== Trip searches (stats) =====
CREATE TABLE public.trip_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_stop_id uuid REFERENCES public.stops(id) ON DELETE SET NULL,
  destination_stop_id uuid REFERENCES public.stops(id) ON DELETE SET NULL,
  max_transfers integer NOT NULL CHECK (max_transfers BETWEEN 0 AND 5),
  results_count integer NOT NULL CHECK (results_count BETWEEN 0 AND 1000),
  source text NOT NULL DEFAULT 'web' CHECK (source IN ('web','api','android')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX trip_searches_created_idx ON public.trip_searches(created_at DESC);

-- ===== Grants =====
GRANT SELECT ON public.provinces, public.cities, public.stops, public.transport_types, public.routes, public.route_stops, public.fares TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provinces, public.cities, public.stops, public.transport_types, public.routes, public.route_stops, public.fares, public.verifications TO authenticated;
GRANT INSERT ON public.trip_searches TO anon;
GRANT SELECT, INSERT ON public.trip_searches TO authenticated;
GRANT ALL ON public.provinces, public.cities, public.stops, public.transport_types, public.routes, public.route_stops, public.fares, public.verifications, public.trip_searches TO service_role;

-- ===== RLS =====
ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_searches ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public read provinces" ON public.provinces FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read cities" ON public.cities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read stops" ON public.stops FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read transport types" ON public.transport_types FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read active routes" ON public.routes FOR SELECT TO anon, authenticated
  USING (active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public read route stops" ON public.route_stops FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read fares" ON public.fares FOR SELECT TO anon, authenticated USING (true);

-- Admin write
CREATE POLICY "Admin write provinces" ON public.provinces FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin write cities" ON public.cities FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin write stops" ON public.stops FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin write transport types" ON public.transport_types FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin write routes" ON public.routes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin write route stops" ON public.route_stops FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin write fares" ON public.fares FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manage verifications" ON public.verifications FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Searches: anyone may log, only admins read
CREATE POLICY "Anyone logs searches" ON public.trip_searches FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read searches" ON public.trip_searches FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ===== Seed: reference data =====
INSERT INTO public.provinces (name) VALUES ('Luanda');
INSERT INTO public.cities (province_id, name, slug, center_lat, center_lng)
  SELECT id, 'Luanda', 'luanda', -8.8390, 13.2894 FROM public.provinces WHERE name = 'Luanda';
INSERT INTO public.transport_types (code, name) VALUES
  ('taxi_colectivo', 'Táxi colectivo (candongueiro)'),
  ('autocarro', 'Autocarro');

-- Stops: real place names, APPROXIMATE coordinates, not verified
INSERT INTO public.stops (city_id, name, lat, lng, boarding_notes, verified, is_demo)
SELECT c.id, v.name, v.lat, v.lng, v.notes, false, false
FROM public.cities c,
(VALUES
  ('Kilamba', -8.9960, 13.2720, 'Coordenadas aproximadas — local exato por confirmar.'),
  ('Rotunda do Camama', -8.9400, 13.2440, 'Coordenadas aproximadas — local exato por confirmar.'),
  ('Golfe 2', -8.8990, 13.2560, 'Coordenadas aproximadas — local exato por confirmar.'),
  ('Rocha Pinto', -8.8740, 13.2420, 'Coordenadas aproximadas — local exato por confirmar.'),
  ('Aeroporto 4 de Fevereiro', -8.8560, 13.2340, 'Coordenadas aproximadas — local exato por confirmar.'),
  ('Congolenses', -8.8380, 13.2520, 'Coordenadas aproximadas — local exato por confirmar.'),
  ('São Paulo', -8.8255, 13.2470, 'Coordenadas aproximadas — local exato por confirmar.'),
  ('Largo 1º de Maio', -8.8235, 13.2395, 'Coordenadas aproximadas — local exato por confirmar.'),
  ('Mutamba', -8.8150, 13.2345, 'Coordenadas aproximadas — local exato por confirmar.'),
  ('Benfica', -8.9590, 13.1460, 'Coordenadas aproximadas — ainda sem rotas cadastradas.')
) AS v(name, lat, lng, notes)
WHERE c.slug = 'luanda';

-- Routes: FICTITIOUS demo routes
INSERT INTO public.routes (city_id, transport_type_id, code, name, vehicle_destination, notes, is_demo, verified)
SELECT c.id, t.id, v.code, v.name, v.dest, 'DADOS FICTÍCIOS de demonstração — substituir por dados reais verificados.', true, false
FROM public.cities c
CROSS JOIN (VALUES
  ('TXD-01', 'taxi_colectivo', 'Kilamba – Congolenses (demo)', 'Congolenses'),
  ('TXD-01R', 'taxi_colectivo', 'Congolenses – Kilamba (demo)', 'Kilamba'),
  ('TXD-02', 'taxi_colectivo', 'Congolenses – Mutamba (demo)', 'Mutamba'),
  ('TXD-02R', 'taxi_colectivo', 'Mutamba – Congolenses (demo)', 'Congolenses'),
  ('TXD-03', 'taxi_colectivo', 'Kilamba – Camama (demo)', 'Camama'),
  ('TXD-04', 'taxi_colectivo', '1º de Maio – Mutamba (demo)', 'Mutamba'),
  ('TXD-05', 'taxi_colectivo', 'Golfe 2 – São Paulo (demo)', 'São Paulo'),
  ('ABD-01', 'autocarro', 'Kilamba – Mutamba (demo)', 'Mutamba'),
  ('ABD-01R', 'autocarro', 'Mutamba – Kilamba (demo)', 'Kilamba'),
  ('ABD-02', 'autocarro', 'Camama – 1º de Maio (demo)', '1º de Maio')
) AS v(code, type, name, dest)
JOIN public.transport_types t ON t.code = v.type
WHERE c.slug = 'luanda';

INSERT INTO public.route_stops (route_id, stop_id, seq, minutes_from_start)
SELECT r.id, s.id, v.seq, v.mins
FROM (VALUES
  ('TXD-01','Kilamba',1,0),('TXD-01','Rotunda do Camama',2,12),('TXD-01','Golfe 2',3,25),('TXD-01','Congolenses',4,45),
  ('TXD-01R','Congolenses',1,0),('TXD-01R','Golfe 2',2,20),('TXD-01R','Rotunda do Camama',3,33),('TXD-01R','Kilamba',4,45),
  ('TXD-02','Congolenses',1,0),('TXD-02','São Paulo',2,8),('TXD-02','Mutamba',3,18),
  ('TXD-02R','Mutamba',1,0),('TXD-02R','São Paulo',2,10),('TXD-02R','Congolenses',3,18),
  ('TXD-03','Kilamba',1,0),('TXD-03','Rotunda do Camama',2,10),
  ('TXD-04','Largo 1º de Maio',1,0),('TXD-04','Mutamba',2,8),
  ('TXD-05','Golfe 2',1,0),('TXD-05','Aeroporto 4 de Fevereiro',2,15),('TXD-05','São Paulo',3,30),
  ('ABD-01','Kilamba',1,0),('ABD-01','Rotunda do Camama',2,15),('ABD-01','Rocha Pinto',3,35),('ABD-01','Aeroporto 4 de Fevereiro',4,45),('ABD-01','Largo 1º de Maio',5,60),('ABD-01','Mutamba',6,70),
  ('ABD-01R','Mutamba',1,0),('ABD-01R','Largo 1º de Maio',2,10),('ABD-01R','Aeroporto 4 de Fevereiro',3,25),('ABD-01R','Rocha Pinto',4,35),('ABD-01R','Rotunda do Camama',5,55),('ABD-01R','Kilamba',6,70),
  ('ABD-02','Rotunda do Camama',1,0),('ABD-02','Golfe 2',2,12),('ABD-02','Rocha Pinto',3,22),('ABD-02','Aeroporto 4 de Fevereiro',4,30),('ABD-02','Largo 1º de Maio',5,45)
) AS v(code, stop, seq, mins)
JOIN public.routes r ON r.code = v.code
JOIN public.stops s ON s.name = v.stop AND s.city_id = r.city_id;

-- Fares: FICTITIOUS demo fares (TXD-04 intentionally has no fare registered)
INSERT INTO public.fares (route_id, amount_kz, is_demo, verified, notes)
SELECT r.id, v.amount, true, false, 'Tarifa FICTÍCIA de demonstração.'
FROM (VALUES
  ('TXD-01',300),('TXD-01R',300),('TXD-02',200),('TXD-02R',200),('TXD-03',150),
  ('TXD-05',250),('ABD-01',200),('ABD-01R',200),('ABD-02',150)
) AS v(code, amount)
JOIN public.routes r ON r.code = v.code;

INSERT INTO public.fares (route_id, from_stop_id, to_stop_id, amount_kz, is_demo, verified, notes)
SELECT r.id, f.id, t.id, 150, true, false, 'Tarifa FICTÍCIA de troço (demonstração).'
FROM public.routes r
JOIN public.stops f ON f.name = 'Kilamba' AND f.city_id = r.city_id
JOIN public.stops t ON t.name = 'Rotunda do Camama' AND t.city_id = r.city_id
WHERE r.code = 'TXD-01';
