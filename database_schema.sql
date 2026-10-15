-- Skema pengganti untuk permintaan aplikasi pembayaran SIMULASI.
-- Jalankan sekali pada proyek Supabase BARU. Bukan migrasi skema tahap sebelumnya.
begin;
create table public.staff_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('cashier','barista','manager'))
);
create table public.products (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 150),
 category text not null check(category in ('Kopi','Non-Kopi','Makanan')),
 price integer not null check(price between 1 and 1000000),
 is_available boolean not null default true
);
create table public.orders (
 id uuid primary key,
 cashier_id uuid not null references auth.users(id),
 customer_name text not null check(length(trim(customer_name)) between 1 and 100),
 total_amount integer not null check(total_amount between 1 and 100000000),
 status text not null default 'pending' check(status in ('pending','cooking','completed')),
 payment_status text not null default 'unpaid' check(payment_status in ('unpaid','paid')),
 request_payload jsonb not null,
 created_at timestamptz not null default now()
);
create table public.order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 product_id uuid not null references public.products(id),
 quantity integer not null check(quantity between 1 and 100),
 product_name text not null,
 unit_price integer not null check(unit_price between 1 and 1000000),
 unique(order_id,product_id)
);
create index orders_created_idx on public.orders(created_at desc);
create index orders_cashier_idx on public.orders(cashier_id);
create index orders_active_idx on public.orders(status,created_at) where payment_status='paid';
create index items_product_idx on public.order_items(product_id);
create function public.has_role(allowed text[]) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.staff_profiles where id=(select auth.uid()) and role=any(allowed));
$$;
revoke all on function public.has_role(text[]) from public,anon;
grant execute on function public.has_role(text[]) to authenticated;
alter table public.staff_profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
revoke all on public.staff_profiles,public.products,public.orders,public.order_items from anon,authenticated;
grant select on public.staff_profiles,public.products,public.orders,public.order_items to authenticated;
grant insert,update on public.products to authenticated;
grant all on public.staff_profiles,public.products,public.orders,public.order_items to service_role;
create policy profile_self on public.staff_profiles for select to authenticated using(id=(select auth.uid()));
create policy products_read on public.products for select to authenticated using(public.has_role(array['cashier','barista','manager']));
create policy products_add on public.products for insert to authenticated with check(public.has_role(array['manager']));
create policy products_edit on public.products for update to authenticated using(public.has_role(array['manager'])) with check(public.has_role(array['manager']));
create policy orders_read on public.orders for select to authenticated using(public.has_role(array['cashier','manager']) or (payment_status='paid' and public.has_role(array['barista'])));
create policy items_read on public.order_items for select to authenticated using(exists(select 1 from public.orders where id=order_id));

-- Atomik, idempoten dan menghitung harga di database, bukan dari browser.
-- Flag paid adalah pembayaran SIMULASI, bukan bukti penagihan gateway.
create function public.checkout_order(request_id uuid,customer text,items jsonb,paid boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare
 payload jsonb; existing public.orders%rowtype; item jsonb; p public.products%rowtype;
 qty integer; amount bigint:=0; seen uuid[]:='{}'; product_uuid uuid;
begin
 if not public.has_role(array['cashier','manager']) then raise exception 'Akses ditolak' using errcode='42501'; end if;
 if request_id is null or paid is null or customer is null or length(trim(customer)) not between 1 and 100 then raise exception 'Data pesanan tidak valid'; end if;
 if items is null or jsonb_typeof(items)<>'array' then raise exception 'Keranjang tidak valid'; end if;
 if jsonb_array_length(items) not between 1 and 100 then raise exception 'Keranjang tidak valid'; end if;
 payload:=jsonb_build_object('customer',trim(customer),'items',items,'paid',paid);
 perform pg_advisory_xact_lock(hashtextextended(request_id::text,0));
 select * into existing from public.orders where id=request_id;
 if found then
  if existing.cashier_id<>auth.uid() or existing.request_payload<>payload then raise exception 'ID pesanan telah digunakan'; end if;
  return existing.id;
 end if;
 -- Lock products in a consistent order to avoid deadlocks across checkouts.
 perform id from public.products where id in (select (v->>'product_id')::uuid from jsonb_array_elements(items) v) order by id for share;
 for item in select value from jsonb_array_elements(items) loop
  if jsonb_typeof(item)<>'object' or jsonb_typeof(item->'quantity') is distinct from 'number' or (item->>'quantity') !~ '^[0-9]+$' then raise exception 'Kuantitas tidak valid'; end if;
  qty:=(item->>'quantity')::integer;
  product_uuid:=(item->>'product_id')::uuid;
  if product_uuid is null or product_uuid=any(seen) or qty not between 1 and 100 then raise exception 'Item tidak valid'; end if;
  seen:=array_append(seen,product_uuid);
  select * into p from public.products where id=product_uuid and is_available;
  if not found then raise exception 'Menu tidak tersedia'; end if;
  amount:=amount+p.price::bigint*qty;
 end loop;
 if amount not between 1 and 100000000 then raise exception 'Total pesanan tidak valid'; end if;
 insert into public.orders(id,cashier_id,customer_name,total_amount,payment_status,request_payload)
 values(request_id,auth.uid(),trim(customer),amount,case when paid then 'paid' else 'unpaid' end,payload);
 insert into public.order_items(order_id,product_id,quantity,product_name,unit_price)
 select request_id,menu.id,(v->>'quantity')::integer,menu.name,menu.price from jsonb_array_elements(items) v join public.products menu on menu.id=(v->>'product_id')::uuid;
 return request_id;
end;
$$;
create function public.pay_order(target_order uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.has_role(array['cashier','manager']) then raise exception 'Akses ditolak' using errcode='42501'; end if;
 update public.orders set payment_status='paid' where id=target_order;
 if not found then raise exception 'Pesanan tidak ditemukan'; end if;
end;
$$;
create function public.set_order_status(target_order uuid,next_status text) returns void
language plpgsql security definer set search_path='' as $$
declare previous text;
begin
 if not public.has_role(array['barista','manager']) then raise exception 'Akses ditolak' using errcode='42501'; end if;
 select status into previous from public.orders where id=target_order and payment_status='paid' for update;
 if not found then raise exception 'Pesanan berbayar tidak ditemukan'; end if;
 if previous=next_status then return; end if;
 if next_status is null or not ((previous='pending' and next_status='cooking') or (previous='cooking' and next_status='completed')) then raise exception 'Transisi status tidak valid'; end if;
 update public.orders set status=next_status where id=target_order;
end;
$$;
create function public.delete_product(target_product uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.has_role(array['manager']) then raise exception 'Akses ditolak' using errcode='42501'; end if;
 delete from public.products where id=target_product;
 if not found then raise exception 'Menu tidak ditemukan'; end if;
end;
$$;
revoke all on function public.checkout_order(uuid,text,jsonb,boolean), public.pay_order(uuid), public.set_order_status(uuid,text), public.delete_product(uuid) from public,anon;
grant execute on function public.checkout_order(uuid,text,jsonb,boolean), public.pay_order(uuid), public.set_order_status(uuid,text), public.delete_product(uuid) to authenticated;
alter table public.orders replica identity full;
do $$
begin
 if not exists(select 1 from pg_publication where pubname='supabase_realtime') then create publication supabase_realtime; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='orders') then alter publication supabase_realtime add table public.orders; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='products') then alter publication supabase_realtime add table public.products; end if;
end;
$$;
insert into public.products(name,category,price) values
('Kopi Susu Gula Aren','Kopi',24000),('Caffè Latte','Kopi',28000),('Americano','Kopi',22000),('Cappuccino','Kopi',28000),
('Matcha Latte','Non-Kopi',32000),('Cokelat Klasik','Non-Kopi',26000),('Croissant Mentega','Makanan',25000),('Roti Panggang','Makanan',20000);
commit;
