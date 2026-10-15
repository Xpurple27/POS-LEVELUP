-- Jalankan sekali pada proyek Supabase baru melalui SQL Editor.
begin;
create type public.staff_role as enum ('cashier', 'barista', 'manager');
create type public.payment_status as enum ('unpaid', 'paid', 'failed');
create type public.order_status as enum ('pending', 'cooking', 'completed');
create type public.payment_method as enum ('cash', 'qris', 'bank_transfer');

create table public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.staff_role not null,
  created_at timestamptz not null default now()
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 150),
  category text not null check (length(trim(category)) between 1 and 80),
  price integer not null check (price between 1 and 100000000),
  image_url text check (image_url is null or image_url ~ '^https://'),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  cashier_id uuid not null references auth.users(id),
  table_number integer check (table_number between 1 and 9999),
  total_amount integer not null check (total_amount between 1 and 100000000),
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'unpaid',
  order_status public.order_status not null default 'pending',
  midtrans_order_id text unique,
  snap_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity between 1 and 100),
  -- Snapshot mempertahankan laporan ketika menu berubah harga atau nama.
  product_name text not null check (length(trim(product_name)) between 1 and 150),
  unit_price integer not null check (unit_price between 1 and 100000000),
  unique (order_id, product_id)
);
create index orders_kds_idx on public.orders (order_status, created_at) where payment_status = 'paid';
create index orders_created_at_idx on public.orders (created_at);
create index orders_cashier_idx on public.orders (cashier_id);
create index order_items_product_idx on public.order_items (product_id);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger products_updated before update on public.products
for each row execute function public.touch_updated_at();
create trigger orders_updated before update on public.orders
for each row execute function public.touch_updated_at();

create function public.has_staff_role(allowed public.staff_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.staff_profiles where id = (select auth.uid()) and role = any(allowed));
$$;
revoke all on function public.has_staff_role(public.staff_role[]) from public, anon;
grant execute on function public.has_staff_role(public.staff_role[]) to authenticated;

alter table public.staff_profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
revoke all on public.staff_profiles, public.products, public.orders, public.order_items from anon, authenticated;
grant select on public.staff_profiles, public.products, public.orders, public.order_items to authenticated;
grant insert, update on public.products to authenticated;
grant all on public.staff_profiles, public.products, public.orders, public.order_items to service_role;
create policy staff_read_self on public.staff_profiles for select to authenticated
using (id = (select auth.uid()) or public.has_staff_role(array['manager']::public.staff_role[]));
create policy products_read on public.products for select to authenticated
using (public.has_staff_role(array['cashier','barista','manager']::public.staff_role[]));
create policy products_create on public.products for insert to authenticated
with check (public.has_staff_role(array['manager']::public.staff_role[]));
create policy products_update on public.products for update to authenticated
using (public.has_staff_role(array['manager']::public.staff_role[]))
with check (public.has_staff_role(array['manager']::public.staff_role[]));
create policy orders_read on public.orders for select to authenticated
using (public.has_staff_role(array['cashier','manager']::public.staff_role[]) or
  (payment_status = 'paid' and public.has_staff_role(array['barista']::public.staff_role[])));
create policy items_read on public.order_items for select to authenticated
using (exists (select 1 from public.orders where orders.id = order_items.order_id));

-- Browser hanya dapat mengubah status dapur melalui fungsi terbatas ini.
-- Pembuatan pesanan dan perubahan pembayaran wajib melalui backend terautentikasi.
create function public.set_order_status(target_order uuid, next_status public.order_status)
returns void language plpgsql security definer set search_path = '' as $$
declare current_status public.order_status;
begin
  if not public.has_staff_role(array['barista','manager']::public.staff_role[]) then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  select order_status into current_status from public.orders
    where id = target_order and payment_status = 'paid' for update;
  if not found then raise exception 'Pesanan berbayar tidak ditemukan' using errcode = 'P0002'; end if;
  if current_status = next_status then return; end if;
  if not ((current_status = 'pending' and next_status = 'cooking') or
          (current_status = 'cooking' and next_status = 'completed')) then
    raise exception 'Transisi status tidak valid' using errcode = '22023';
  end if;
  update public.orders set order_status = next_status where id = target_order;
end;
$$;
revoke all on function public.set_order_status(uuid, public.order_status) from public, anon;
grant execute on function public.set_order_status(uuid, public.order_status) to authenticated;

alter table public.orders replica identity full;
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
                 and schemaname = 'public' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
end;
$$;
commit;
