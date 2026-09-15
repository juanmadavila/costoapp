create type public.expense_type as enum ('Profesional', 'Personal');

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  spent_on date not null default current_date,
  description text not null check (char_length(trim(description)) > 0),
  category text not null check (char_length(trim(category)) > 0),
  type public.expense_type not null,
  amount numeric(12, 2) not null check (amount > 0),
  project text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  received_on date not null default current_date,
  description text not null check (char_length(trim(description)) > 0),
  category text not null check (char_length(trim(category)) > 0),
  amount numeric(12, 2) not null check (amount > 0),
  source text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index expenses_user_spent_on_idx on public.expenses (user_id, spent_on desc);
create index expenses_user_type_idx on public.expenses (user_id, type);
create index incomes_user_received_on_idx on public.incomes (user_id, received_on desc);
create index incomes_user_category_idx on public.incomes (user_id, category);

create table public.monthly_budgets (
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  type public.expense_type not null,
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, month, type)
);

create table public.user_session_locks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  browser_session_id text not null,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger user_session_locks_set_updated_at
before update on public.user_session_locks
for each row execute function public.set_updated_at();

create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

create trigger incomes_set_updated_at
before update on public.incomes
for each row execute function public.set_updated_at();

create trigger monthly_budgets_set_updated_at
before update on public.monthly_budgets
for each row execute function public.set_updated_at();

alter table public.expenses enable row level security;
alter table public.incomes enable row level security;
alter table public.monthly_budgets enable row level security;
alter table public.user_session_locks enable row level security;

create policy "Users can manage their own session lock"
on public.user_session_locks for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can read their own expenses"
on public.expenses for select
using (auth.uid() = user_id);

create policy "Users can create their own expenses"
on public.expenses for insert
with check (auth.uid() = user_id);

create policy "Users can update their own expenses"
on public.expenses for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own expenses"
on public.expenses for delete
using (auth.uid() = user_id);

create policy "Users can read their own incomes"
on public.incomes for select
using (auth.uid() = user_id);

create policy "Users can create their own incomes"
on public.incomes for insert
with check (auth.uid() = user_id);

create policy "Users can update their own incomes"
on public.incomes for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own incomes"
on public.incomes for delete
using (auth.uid() = user_id);

create policy "Users can read their own budgets"
on public.monthly_budgets for select
using (auth.uid() = user_id);

create policy "Users can create their own budgets"
on public.monthly_budgets for insert
with check (auth.uid() = user_id);

create policy "Users can update their own budgets"
on public.monthly_budgets for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own budgets"
on public.monthly_budgets for delete
using (auth.uid() = user_id);

create or replace function public.acquire_session_lock(p_user_id uuid, p_browser_session_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
  v_current_record public.user_session_locks%rowtype;
begin
  select * into v_current_record
  from public.user_session_locks
  where user_id = p_user_id
  for update;

  if not found then
    insert into public.user_session_locks (user_id, browser_session_id, last_seen_at)
    values (p_user_id, p_browser_session_id, timezone('utc', now()));
    return true;
  end if;

  if v_current_record.browser_session_id = p_browser_session_id then
    update public.user_session_locks
    set last_seen_at = timezone('utc', now()), updated_at = timezone('utc', now())
    where user_id = p_user_id;
    return true;
  end if;

  if v_current_record.last_seen_at < timezone('utc', now()) - interval '10 minutes' then
    update public.user_session_locks
    set browser_session_id = p_browser_session_id,
        last_seen_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
    where user_id = p_user_id;
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.bind_session_lock(p_user_id uuid, p_browser_session_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_record public.user_session_locks%rowtype;
begin
  select * into v_current_record
  from public.user_session_locks
  where user_id = p_user_id;

  if not found then
    return true;
  end if;

  if v_current_record.browser_session_id = p_browser_session_id then
    update public.user_session_locks
    set last_seen_at = timezone('utc', now()), updated_at = timezone('utc', now())
    where user_id = p_user_id;
    return true;
  end if;

  if v_current_record.last_seen_at < timezone('utc', now()) - interval '10 minutes' then
    update public.user_session_locks
    set browser_session_id = p_browser_session_id,
        last_seen_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
    where user_id = p_user_id;
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.release_session_lock(p_user_id uuid, p_browser_session_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.user_session_locks
  where user_id = p_user_id
    and browser_session_id = p_browser_session_id;

  return true;
end;
$$;
