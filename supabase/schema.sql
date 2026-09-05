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

create index expenses_user_spent_on_idx on public.expenses (user_id, spent_on desc);
create index expenses_user_type_idx on public.expenses (user_id, type);

create table public.monthly_budgets (
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  type public.expense_type not null,
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, month, type)
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

create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

create trigger monthly_budgets_set_updated_at
before update on public.monthly_budgets
for each row execute function public.set_updated_at();

alter table public.expenses enable row level security;
alter table public.monthly_budgets enable row level security;

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
