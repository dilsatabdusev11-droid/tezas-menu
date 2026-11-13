-- Заказы TEZAS. Персональные данные гостей (имя, телефон, адрес, данные карты)
-- здесь НЕ хранятся: только номер столика, позиции, сумма и статус оплаты.
-- Доступ к таблицам — только у серверной функции (service_role). RLS включён без политик.

create table public.order_counters (
  day  date primary key,
  last int  not null default 0
);

create sequence public.halyk_invoice_seq start 100001;

create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  day           date not null default (now() at time zone 'Asia/Oral')::date,
  number        int  not null,
  mode          text not null check (mode in ('table', 'pickup')),
  table_no      int  check (table_no between 1 and 200),
  items         jsonb not null,
  total         int  not null check (total > 0),
  gift          boolean not null default false,
  provider      text not null check (provider in ('halyk', 'kaspi')),
  status        text not null default 'awaiting_payment'
                check (status in ('awaiting_payment', 'paid', 'cooking', 'ready', 'done', 'cancelled', 'failed')),
  lang          text not null default 'ru' check (lang in ('ru', 'kk')),
  invoice_id    text unique,
  secret_hash   text,
  provider_ref  text,
  created_at    timestamptz not null default now(),
  paid_at       timestamptz,
  updated_at    timestamptz not null default now(),
  last_check_at timestamptz,
  unique (day, number),
  check (mode <> 'table' or table_no is not null)
);

create index orders_kitchen_idx on public.orders (day, status);

alter table public.orders enable row level security;
alter table public.order_counters enable row level security;

-- Атомарно: следующий номер заказа за день (по времени Уральска) + вставка.
create or replace function public.create_order(
  p_mode text, p_table_no int, p_items jsonb, p_total int, p_gift boolean,
  p_provider text, p_lang text, p_secret_hash text
) returns public.orders
language plpgsql
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'Asia/Oral')::date;
  v_num int;
  v_invoice text;
  v_row public.orders;
begin
  insert into public.order_counters as c (day, last) values (v_day, 1)
  on conflict (day) do update set last = c.last + 1
  returning last into v_num;

  if p_provider = 'halyk' then
    v_invoice := lpad(nextval('public.halyk_invoice_seq')::text, 9, '0');
  end if;

  insert into public.orders (day, number, mode, table_no, items, total, gift, provider, lang, invoice_id, secret_hash)
  values (v_day, v_num, p_mode, p_table_no, p_items, p_total, p_gift, p_provider, p_lang, v_invoice, p_secret_hash)
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.create_order(text, int, jsonb, int, boolean, text, text, text) from public, anon, authenticated;
grant execute on function public.create_order(text, int, jsonb, int, boolean, text, text, text) to service_role;
revoke all on sequence public.halyk_invoice_seq from public, anon, authenticated;
