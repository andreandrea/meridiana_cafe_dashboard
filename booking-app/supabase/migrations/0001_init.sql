-- Meridiana Cafè — schema iniziale sistema di prenotazioni
-- Applicare tramite: Supabase Dashboard > SQL Editor, oppure `supabase db push` con la CLI.

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- ============================================================
-- booking_settings — regole di prenotazione globali (singleton)
-- ============================================================
create table booking_settings (
  id smallint primary key default 1 check (id = 1),
  min_advance_minutes int not null default 30,
  form_open_time time not null default '06:00',
  max_advance_days int not null default 30,
  slot_duration_minutes int not null default 90,
  restaurant_name text not null default 'Meridiana Cafè',
  restaurant_whatsapp_number text,
  updated_at timestamptz not null default now()
);

insert into booking_settings (id) values (1);

-- ============================================================
-- opening_hours — orari settimanali ricorrenti, editabili da admin
-- ============================================================
create table opening_hours (
  id uuid primary key default gen_random_uuid(),
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = domenica
  shift_label text not null default 'servizio',
  open_time time not null,
  close_time time not null,
  is_closed boolean not null default false,
  unique (day_of_week, shift_label),
  check (close_time > open_time)
);

-- ============================================================
-- special_closures — chiusure straordinarie (ferie, singoli giorni)
-- ============================================================
create table special_closures (
  id uuid primary key default gen_random_uuid(),
  date_start date not null,
  date_end date not null, -- lato app: default a date_start se non specificata
  all_day boolean not null default true,
  closed_from time,
  closed_to time,
  reason text,
  created_at timestamptz not null default now(),
  check (date_end >= date_start)
);

-- ============================================================
-- tables — tavoli e mappa sala
-- ============================================================
create table tables (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  seats_min smallint not null default 1,
  seats_max smallint not null,
  pos_x numeric(5, 2) not null default 50, -- percentuale 0-100 sul canvas mappa
  pos_y numeric(5, 2) not null default 50,
  shape text not null default 'round' check (shape in ('round', 'rect')),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  check (seats_max >= seats_min)
);

-- ============================================================
-- daily_menus / menu_items — menu del giorno (nuova fonte di verità
-- per l'app; gli script crea-menu restano invariati e continuano a
-- leggere menu.csv)
-- ============================================================
create table daily_menus (
  id uuid primary key default gen_random_uuid(),
  menu_date date not null unique,
  is_published boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  daily_menu_id uuid not null references daily_menus(id) on delete cascade,
  category text not null check (
    category in ('primo', 'secondo', 'zuppa', 'insalata', 'altro')
  ),
  name text not null,
  sort_order int not null default 0,
  is_available boolean not null default true
);

create index menu_items_daily_menu_id_idx on menu_items (daily_menu_id);

-- ============================================================
-- bookings — cuore del sistema
-- ============================================================
create table bookings (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references tables(id),
  party_size smallint not null check (party_size > 0),
  customer_name text not null,
  customer_phone text not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'rejected', 'cancelled')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  decision_channel text check (decision_channel in ('admin_panel', 'telegram')),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  staff_note text,
  source text not null default 'web',
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

-- Rete di sicurezza atomica anti-doppia-prenotazione: un tavolo non può
-- avere due prenotazioni pending/confirmed che si sovrappongono nello
-- stesso intervallo di tempo. Vale anche sotto richieste concorrenti.
alter table bookings
  add constraint bookings_no_overlap
  exclude using gist (
    table_id with =,
    tstzrange(start_at, end_at) with &&
  )
  where (status in ('pending', 'confirmed'));

create index bookings_start_at_idx on bookings (start_at);
create index bookings_status_idx on bookings (status);

-- ============================================================
-- staff_profiles — collegato a Supabase Auth (login staff)
-- ============================================================
create table staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- telegram_recipients — chat_id dello staff che riceve gli alert
-- ============================================================
create table telegram_recipients (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null unique,
  label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security — deny-by-default su tutte le tabelle.
-- Nessuna policy pubblica: tutte le letture/scritture (anche quelle
-- "pubbliche", es. creare una prenotazione o leggere il menu del
-- giorno) passano da Route Handler/Server Action lato server con la
-- service role key, mai esposta al browser. L'anon key lato client
-- serve solo per login/sessione staff (Supabase Auth).
-- ============================================================
alter table booking_settings enable row level security;
alter table opening_hours enable row level security;
alter table special_closures enable row level security;
alter table tables enable row level security;
alter table daily_menus enable row level security;
alter table menu_items enable row level security;
alter table bookings enable row level security;
alter table staff_profiles enable row level security;
alter table telegram_recipients enable row level security;
