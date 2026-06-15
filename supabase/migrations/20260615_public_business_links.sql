-- ============================================================
-- Public Business Links — slug + RPC get_public_business
-- ============================================================

-- 1. Add slug column to businesses
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS businesses_slug_key
  ON public.businesses (slug)
  WHERE slug IS NOT NULL;

-- 2. slugify(): lowercase + strip accents + dash-separate + deduplicate
CREATE OR REPLACE FUNCTION public.slugify(text_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  result    TEXT;
  counter   INT := 2;
  candidate TEXT;
BEGIN
  result := lower(text_input);
  result := translate(
    result,
    'áàäâãåéèëêíìïîóòöôõúùüûñç',
    'aaaaaaeeeeiiiioooooouuuunc'
  );
  result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
  result := trim(both '-' from result);

  candidate := result;
  WHILE EXISTS (
    SELECT 1 FROM public.businesses WHERE slug = candidate
  ) LOOP
    candidate := result || '-' || counter;
    counter   := counter + 1;
  END LOOP;

  RETURN candidate;
END;
$$;

-- 3. Trigger function: auto-populate slug on insert / name update
CREATE OR REPLACE FUNCTION public.businesses_set_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.slugify(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_businesses_set_slug ON public.businesses;
CREATE TRIGGER tg_businesses_set_slug
  BEFORE INSERT OR UPDATE OF name
  ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.businesses_set_slug();

-- 4. Backfill existing rows (runs once; skips rows that already have a slug)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, name FROM public.businesses WHERE slug IS NULL ORDER BY created_at
  LOOP
    UPDATE public.businesses
    SET slug = public.slugify(r.name)
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- 5. Public RPC — returns only what the landing page needs, never owner PII
CREATE OR REPLACE FUNCTION public.get_public_business(p_slug TEXT)
RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'business',      to_jsonb(b) - 'owner_id',
    'services',      COALESCE(s.services, '[]'::JSONB),
    'workers',       COALESCE(w.workers,  '[]'::JSONB),
    'rating',        COALESCE(r.avg_score, 0),
    'reviews_count', COALESCE(r.cnt, 0)
  )
  FROM businesses b
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'id',           id,
      'name',         name,
      'price',        price,
      'duration_min', duration_min
    )) AS services
    FROM business_services
    WHERE business_id = b.id
      AND is_active = true
  ) s ON TRUE
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'id',         id,
      'name',       name,
      'avatar_url', avatar_url
    )) AS workers
    FROM workers
    WHERE business_id = b.id
  ) w ON TRUE
  LEFT JOIN LATERAL (
    SELECT ROUND(AVG(score)::NUMERIC, 1) AS avg_score, COUNT(*) AS cnt
    FROM reviews
    WHERE business_id = b.id
  ) r ON TRUE
  WHERE b.slug = p_slug
    AND b.status = 'approved';
$$;

GRANT EXECUTE ON FUNCTION public.get_public_business(TEXT) TO anon, authenticated;
