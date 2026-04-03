-- Zone rules table
create table if not exists zone_rules (
  zone_code text primary key,
  zone_name text not null,
  zone_category text not null,              -- 'residential' | 'commercial' | 'industrial' | 'mixed'
  max_height_m numeric,
  max_storeys integer,
  max_site_coverage_pct integer,
  min_permeability_pct integer,
  front_setback_m numeric,
  side_setback_m numeric,
  rear_setback_m numeric,
  secondary_dwelling_permitted text,        -- 'yes' | 'permit_required' | 'no'
  short_term_accom_permitted text,          -- 'yes' | 'permit_required' | 'no'
  home_business_permitted text,             -- 'yes' | 'permit_required' | 'no'
  subdivision_min_lot_size_m2 integer,
  key_rules text[] not null default '{}',   -- plain-English rule strings, array
  permitted_uses text[] not null default '{}',
  requires_permit_uses text[] not null default '{}',
  prohibited_uses text[] not null default '{}',
  source_url text,
  last_verified date,
  notes text
);

-- Query log (for analytics, understanding demand)
create table if not exists lookup_log (
  id uuid primary key default gen_random_uuid(),
  address_input text,
  lat numeric,
  lng numeric,
  zone_code text,
  created_at timestamptz default now(),
  user_agent text,
  origin text
);
