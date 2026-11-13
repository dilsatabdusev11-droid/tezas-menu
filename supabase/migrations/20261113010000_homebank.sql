-- Оплата в приложении Homebank (Halyk QR API): ссылка с суммой и QR-код.
-- qr_token — токен Halyk для проверки статуса (живёт 20 минут), не персональные данные.
alter table public.orders drop constraint orders_provider_check;
alter table public.orders add constraint orders_provider_check check (provider in ('halyk', 'kaspi', 'homebank'));
alter table public.orders add column qr_token text, add column qr_link text, add column qr_code text;

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

  if p_provider in ('halyk', 'homebank') then
    v_invoice := lpad(nextval('public.halyk_invoice_seq')::text, 9, '0');
  end if;

  insert into public.orders (day, number, mode, table_no, items, total, gift, provider, lang, invoice_id, secret_hash)
  values (v_day, v_num, p_mode, p_table_no, p_items, p_total, p_gift, p_provider, p_lang, v_invoice, p_secret_hash)
  returning * into v_row;
  return v_row;
end;
$$;
