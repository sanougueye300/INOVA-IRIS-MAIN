-- Normalise les numéros sénégalais enregistrés sans indicatif (+221)
UPDATE public.profiles
SET phone = '+221' || regexp_replace(phone, '\D', '', 'g')
WHERE phone IS NOT NULL
  AND phone !~ '^\+'
  AND length(regexp_replace(phone, '\D', '', 'g')) = 9;

-- Cas 0775994942 → +221775994942
UPDATE public.profiles
SET phone = '+221' || substring(regexp_replace(phone, '\D', '', 'g') from 2)
WHERE phone IS NOT NULL
  AND phone !~ '^\+'
  AND length(regexp_replace(phone, '\D', '', 'g')) = 10
  AND regexp_replace(phone, '\D', '', 'g') LIKE '0%';
