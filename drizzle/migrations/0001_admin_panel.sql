CREATE TABLE public.admin_allowlist (
  email text PRIMARY KEY CHECK (email = lower(email) AND position('@' in email) > 1),
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_allowlist TO authenticated;
GRANT ALL ON public.admin_allowlist TO service_role;
ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read allowlist" ON public.admin_allowlist FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Grant admin when an allowlisted email confirms its account (or signs in with a confirmed provider).
CREATE OR REPLACE FUNCTION public.grant_admin_if_allowlisted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.admin_allowlist a WHERE a.email = lower(NEW.email)) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.grant_admin_if_allowlisted() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_grant_admin
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_admin_if_allowlisted();

CREATE OR REPLACE FUNCTION public.admin_add_email(_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e text := lower(trim(_email));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501'; END IF;
  IF e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Email inválido' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.admin_allowlist (email, added_by) VALUES (e, auth.uid()) ON CONFLICT (email) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
    SELECT u.id, 'admin' FROM auth.users u WHERE lower(u.email) = e AND u.email_confirmed_at IS NOT NULL
    ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.admin_remove_email(_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e text := lower(trim(_email));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501'; END IF;
  IF EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND lower(u.email) = e) THEN
    RAISE EXCEPTION 'Não pode remover o seu próprio acesso' USING ERRCODE = '22023';
  END IF;
  DELETE FROM public.admin_allowlist WHERE email = e;
  DELETE FROM public.user_roles r USING auth.users u
    WHERE r.user_id = u.id AND lower(u.email) = e AND r.role = 'admin';
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_admins()
RETURNS TABLE (email text, added_at timestamptz, has_account boolean, is_admin boolean, last_sign_in_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
    SELECT a.email, a.created_at, (u.id IS NOT NULL),
      EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin'),
      u.last_sign_in_at
    FROM public.admin_allowlist a
    LEFT JOIN auth.users u ON lower(u.email) = a.email
    ORDER BY a.created_at;
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_add_email(text), public.admin_remove_email(text), public.admin_list_admins() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_add_email(text), public.admin_remove_email(text), public.admin_list_admins() TO authenticated;

-- Usage statistics (runs as the caller; trip_searches RLS only lets admins read).
CREATE OR REPLACE FUNCTION public.admin_usage_stats(_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE since timestamptz := now() - make_interval(days => greatest(1, least(_days, 365)));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object(
    'total', (SELECT count(*) FROM trip_searches WHERE created_at >= since),
    'sem_resultados', (SELECT count(*) FROM trip_searches WHERE created_at >= since AND results_count = 0),
    'por_dia', COALESCE((SELECT jsonb_agg(jsonb_build_object('dia', d, 'total', n) ORDER BY d)
       FROM (SELECT date_trunc('day', created_at)::date d, count(*) n FROM trip_searches WHERE created_at >= since GROUP BY 1) x), '[]'::jsonb),
    'por_fonte', COALESCE((SELECT jsonb_agg(jsonb_build_object('fonte', source, 'total', n) ORDER BY n DESC)
       FROM (SELECT source, count(*) n FROM trip_searches WHERE created_at >= since GROUP BY 1) x), '[]'::jsonb),
    'principais', COALESCE((SELECT jsonb_agg(jsonb_build_object('origem', o.name, 'destino', d.name, 'total', n, 'sem_resultados', z) ORDER BY n DESC)
       FROM (SELECT origin_stop_id, destination_stop_id, count(*) n, count(*) FILTER (WHERE results_count = 0) z
             FROM trip_searches WHERE created_at >= since GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 10) x
       LEFT JOIN stops o ON o.id = x.origin_stop_id LEFT JOIN stops d ON d.id = x.destination_stop_id), '[]'::jsonb)
  );
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_usage_stats(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_usage_stats(integer) TO authenticated;

-- Replace a route's ordered stop list atomically (runs as the caller; RLS requires admin).
CREATE OR REPLACE FUNCTION public.admin_save_route_stops(_route_id uuid, _stops jsonb)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501'; END IF;
  DELETE FROM route_stops WHERE route_id = _route_id;
  INSERT INTO route_stops (route_id, stop_id, seq, minutes_from_start, can_board, can_alight, boarding_notes)
    SELECT _route_id, s.stop_id, s.seq, s.minutes_from_start, s.can_board, s.can_alight, NULLIF(trim(s.boarding_notes), '')
    FROM jsonb_to_recordset(_stops) AS s(stop_id uuid, seq integer, minutes_from_start integer, can_board boolean, can_alight boolean, boarding_notes text);
  UPDATE routes SET updated_at = now() WHERE id = _route_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_save_route_stops(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_route_stops(uuid, jsonb) TO authenticated;