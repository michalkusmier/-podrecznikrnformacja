-- Funkcja do pingowania bazy z GitHub Actions (.github/workflows/
-- supabase-keepalive.yml), żeby darmowy projekt nie został zapauzowany.
-- Wklej całość w Supabase Dashboard -> SQL Editor -> Run (jednorazowo).
--
-- Dlaczego osobna funkcja: główny endpoint /rest/v1/ przy nowych kluczach
-- (sb_publishable_...) wymaga klucza secret i zwraca 401, a tabele mają
-- RLS. Ta funkcja nic nie czyta ani nie zapisuje - tylko robi "select 1",
-- ale to wystarcza, żeby zapytanie realnie przeszło przez Postgresa.
create or replace function public.keepalive()
returns int
language sql
stable
as $$
  select 1;
$$;

grant execute on function public.keepalive() to anon;
