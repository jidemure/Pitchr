import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;
let currentConfigKey = '';

export function getSupabaseClient(customUrl?: string, customAnonKey?: string): SupabaseClient | null {
  const url = customUrl || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : '');
  const key = customAnonKey || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : '');

  if (!url || !key) {
    return null;
  }

  const configKey = `${url}:${key}`;
  if (cachedClient && currentConfigKey === configKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: false,
      },
    });
    currentConfigKey = configKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export const SUPABASE_SQL_SCHEMA = `-- Execute this in your Supabase SQL Editor to enable cloud sync:

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  company_name text not null,
  industry text default 'General Business',
  contact_email text,
  status text default 'audited',
  overall_score integer default 0,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_audited_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  url text not null,
  company_name text not null,
  industry text,
  scores jsonb not null,
  issues jsonb not null,
  tech_stack jsonb default '[]'::jsonb,
  visual_critique text,
  redesign_suggestion text,
  raw_metrics jsonb,
  analyzed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.email_sequences (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  url text not null,
  company_name text not null,
  tone text default 'boutique_agency',
  touches jsonb not null,
  personalization_summary text,
  custom_redesign_pitch text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable public read/write for demo simplicity (or configure custom RLS):
alter table public.leads enable row level security;
alter table public.audits enable row level security;
alter table public.email_sequences enable row level security;

create policy "Allow all operations for anon" on public.leads for all using (true) with check (true);
create policy "Allow all operations for anon" on public.audits for all using (true) with check (true);
create policy "Allow all operations for anon" on public.email_sequences for all using (true) with check (true);
`;
