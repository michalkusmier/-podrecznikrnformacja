-- Kody dostępu do appki (rejestracja z zaproszeniem) + walidacja przy
-- zakładaniu konta. Wklej całość w Supabase Dashboard -> SQL Editor -> Run
-- (jednorazowo, w Twoim projekcie).

-- Tabela kodów - Ty ręcznie dopisujesz tu wiersze (kolumna "code") i
-- przekazujesz kod danej osobie. "note" to tylko Twoja notatka (np. "dla
-- Kasi"), appka jej nie pokazuje nikomu.
create table if not exists public.access_codes (
  id           uuid primary key default gen_random_uuid(),
  code         text unique not null,
  note         text,
  created_at   timestamptz not null default now(),
  redeemed_at  timestamptz,
  redeemed_by  uuid references auth.users (id)
);

-- RLS włączone i BEZ żadnych policy dla anon/authenticated - z appki (kluczem
-- publishable) nie da się tej tabeli ani odczytać, ani zapisać wprost.
-- Jedyny dostęp do niej ma funkcja walidująca poniżej (SECURITY DEFINER),
-- uruchamiana automatycznie przy rejestracji.
alter table public.access_codes enable row level security;

-- Uruchamia się automatycznie zaraz PO utworzeniu nowego użytkownika
-- (supabase.auth.signUp) - zanim rejestracja się w ogóle powiedzie. Appka
-- przy signUp przekazuje kod w options.data.invite_code (patrz
-- src/context/AuthContext.tsx). Jeśli kod jest nieprawidłowy albo już
-- użyty, funkcja rzuca wyjątkiem - CAŁA rejestracja (insert do auth.users)
-- jest wtedy wycofywana i supabase.auth.signUp() zwraca błąd do appki.
create or replace function public.handle_new_user_access_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_updated int;
begin
  v_code := new.raw_user_meta_data ->> 'invite_code';

  if v_code is null or length(trim(v_code)) = 0 then
    raise exception 'Brak kodu dostępu.';
  end if;

  update public.access_codes
  set redeemed_at = now(), redeemed_by = new.id
  where code = v_code and redeemed_at is null;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'Nieprawidłowy albo już wykorzystany kod dostępu.';
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_check_code on auth.users;
create trigger on_auth_user_created_check_code
  after insert on auth.users
  for each row execute function public.handle_new_user_access_code();

-- Przykładowy kod testowy - podmień na swój, albo dodaj więcej takich
-- insertów dla kolejnych osób. Kod może być dowolnym tekstem - poniżej
-- prosty, czytelny wzór.
insert into public.access_codes (code, note) values
  ('ADORACJA-TEST01', 'kod testowy - podmień/usuń po sprawdzeniu');
