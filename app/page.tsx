'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownUp,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Filter,
  Home,
  Menu,
  LogOut,
  LockKeyhole,
  Pencil,
  Plus,
  Receipt,
  Search,
  Tag,
  Trash2,
  TrendingUp,
  UserRound,
  X,
  Moon,
  Sun,
} from 'lucide-react'

type ExpenseType = 'Profesional' | 'Personal'
type Expense = {
  id: number
  date: string
  description: string
  category: string
  type: ExpenseType
  amount: number
  project?: string
  notes?: string
}

const categories = {
  Profesional: ['Materiales', 'Mano de obra', 'Herramientas', 'Transporte', 'Servicios', 'Otros'],
  Personal: ['Vivienda', 'Alimentación', 'Transporte', 'Salud', 'Ocio', 'Otros'],
}

const initialExpenses: Expense[] = [
  { id: 1, date: '2026-09-03', description: 'Cemento y arena', category: 'Materiales', type: 'Profesional', amount: 385.5, project: 'Reforma cocina' },
  { id: 2, date: '2026-09-02', description: 'Combustible furgoneta', category: 'Transporte', type: 'Profesional', amount: 72.4, project: 'Reforma cocina' },
  { id: 3, date: '2026-09-01', description: 'Compra supermercado', category: 'Alimentación', type: 'Personal', amount: 96.2 },
  { id: 4, date: '2026-08-29', description: 'Taladro percutor', category: 'Herramientas', type: 'Profesional', amount: 219.99, project: 'Baño principal' },
  { id: 5, date: '2026-08-27', description: 'Seguro autónomo', category: 'Servicios', type: 'Profesional', amount: 154.8, project: 'General' },
  { id: 6, date: '2026-08-22', description: 'Farmacia', category: 'Salud', type: 'Personal', amount: 34.75 },
]

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const dateFormat = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' })

function LoginView({ onLogin, isDark, onToggleTheme }: { onLogin: () => void; isDark: boolean; onToggleTheme: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (email.trim() && password.trim()) onLogin()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Receipt /></div>
            <div className="min-w-0"><p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:text-xs sm:tracking-[0.24em]">Control financiero</p><h1 className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">CostoApp</h1></div>
          </div>
          <button onClick={onToggleTheme} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}>
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-8"><p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-primary">Bienvenido de nuevo</p><h2 className="font-serif text-4xl font-semibold tracking-tight">Tus gastos, bajo control.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Inicia sesión para consultar tu actividad financiera.</p></div>
          <form onSubmit={submitLogin} className="flex flex-col gap-5">
            <label className="flex flex-col gap-2 text-sm font-medium">Correo electrónico<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@correo.com" className="rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring" /></label>
            <label className="flex flex-col gap-2 text-sm font-medium">Contraseña<input required minLength={4} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" className="rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring" /></label>
            <button type="submit" className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition hover:opacity-90"><LockKeyhole className="size-4" /> Entrar a CostoApp</button>
          </form>
          <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">Demo local: utiliza cualquier correo y contraseña para continuar.</p>
        </section>
      </div>
    </main>
  )
}

export default function Page() {
  const [expenses, setExpenses] = useState(initialExpenses)
  const [activeType, setActiveType] = useState<'Todos' | ExpenseType>('Todos')
  const [month, setMonth] = useState('2026-09')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todas')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [form, setForm] = useState({ description: '', amount: '', date: '2026-09-05', category: 'Materiales', type: 'Profesional' as ExpenseType, project: '', notes: '' })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  const filtered = useMemo(() => expenses
    .filter((expense) => expense.date.startsWith(month))
    .filter((expense) => activeType === 'Todos' || expense.type === activeType)
    .filter((expense) => category === 'Todas' || expense.category === category)
    .filter((expense) => `${expense.description} ${expense.project ?? ''}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date)), [expenses, month, activeType, category, query])

  const total = filtered.reduce((sum, expense) => sum + expense.amount, 0)
  const professionalTotal = expenses.filter((e) => e.date.startsWith(month) && e.type === 'Profesional').reduce((s, e) => s + e.amount, 0)
  const personalTotal = expenses.filter((e) => e.date.startsWith(month) && e.type === 'Personal').reduce((s, e) => s + e.amount, 0)
  const categoryTotals = filtered.reduce<Record<string, number>>((totals, expense) => ({ ...totals, [expense.category]: (totals[expense.category] ?? 0) + expense.amount }), {})
  const topCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 4)
  const maxCategory = topCategories[0]?.[1] || 1

  function openNew() {
    setEditing(null)
    setForm({ description: '', amount: '', date: '2026-09-05', category: activeType === 'Personal' ? 'Alimentación' : 'Materiales', type: activeType === 'Personal' ? 'Personal' : 'Profesional', project: '', notes: '' })
    setIsFormOpen(true)
  }

  function openEdit(expense: Expense) {
    setEditing(expense)
    setForm({ description: expense.description, amount: String(expense.amount), date: expense.date, category: expense.category, type: expense.type, project: expense.project ?? '', notes: expense.notes ?? '' })
    setIsFormOpen(true)
  }

  function saveExpense(event: React.FormEvent) {
    event.preventDefault()
    if (!form.description || !form.amount || Number(form.amount) <= 0) return
    const next: Expense = { id: editing?.id ?? Date.now(), date: form.date, description: form.description, category: form.category, type: form.type, amount: Number(form.amount), project: form.type === 'Profesional' ? form.project || 'General' : undefined, notes: form.notes }
    setExpenses((current) => editing ? current.map((expense) => expense.id === editing.id ? next : expense) : [next, ...current])
    setIsFormOpen(false)
  }

  function deleteExpense(id: number) {
    if (window.confirm('¿Eliminar este gasto?')) setExpenses((current) => current.filter((expense) => expense.id !== id))
  }

  if (!isLoggedIn) return <LoginView onLogin={() => setIsLoggedIn(true)} isDark={isDark} onToggleTheme={() => setIsDark((current) => !current)} />

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-3 py-3 sm:flex-nowrap sm:px-6 sm:py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Receipt data-icon="inline-start" /></div>
            <div className="min-w-0"><p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:text-xs sm:tracking-[0.24em]">Control financiero</p><h1 className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">CostoApp</h1></div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex"><span className="size-2 rounded-full bg-chart-2" /> Datos locales · Demo</div>
            <button onClick={() => setIsDark((current) => !current)} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'} title={isDark ? 'Modo claro' : 'Modo oscuro'}>
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <button onClick={() => setIsLoggedIn(false)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Cerrar sesión" title="Cerrar sesión">
              <LogOut className="size-4" /><span className="hidden sm:inline">Cerrar sesión</span>
            </button>
            <button className="rounded-lg p-2 text-muted-foreground sm:hidden" aria-label="Abrir menú"><Menu /></button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-primary">Resumen mensual</p><h2 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Tus gastos, <em className="text-primary">bajo control.</em></h2><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Una vista clara para separar lo que cuesta tu trabajo de lo que cuesta tu vida.</p></div>
          <button onClick={openNew} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"><Plus data-icon="inline-start" /> Añadir gasto</button>
        </section>

        <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-3">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
            {(['Todos', 'Profesional', 'Personal'] as const).map((item) => <button key={item} onClick={() => { setActiveType(item); setCategory('Todas') }} className={`rounded-lg px-2 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${activeType === item ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{item === 'Todos' ? 'Todos' : item === 'Profesional' ? <span className="flex items-center gap-2"><BriefcaseBusiness className="size-4" /> Profesional</span> : <span className="flex items-center gap-2"><UserRound className="size-4" /> Personal</span>}</button>)}
          </div>
          <label className="flex min-w-0 items-center gap-2 px-2 text-sm text-muted-foreground"><CalendarDays className="size-4" /><select value={month} onChange={(event) => setMonth(event.target.value)} className="bg-transparent font-medium text-foreground outline-none"><option value="2026-09">Septiembre 2026</option><option value="2026-08">Agosto 2026</option></select><ChevronDown className="size-4" /></label>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="rounded-2xl bg-primary p-6 text-primary-foreground"><div className="flex items-start justify-between"><div><p className="text-sm text-primary-foreground/70">Gasto total</p><p className="mt-2 font-serif text-4xl font-semibold">{money.format(total)}</p></div><CircleDollarSign className="size-7 opacity-70" /></div><div className="mt-8 flex items-center gap-2 text-sm text-primary-foreground/75"><TrendingUp className="size-4" /> Este mes · {filtered.length} movimientos</div></div>
          <div className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Profesional</p><BriefcaseBusiness className="size-5 text-primary" /></div><p className="mt-4 font-serif text-3xl font-semibold">{money.format(professionalTotal)}</p><div className="mt-4 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: total ? `${professionalTotal / total * 100}%` : '0%' }} /></div></div>
          <div className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Personal</p><UserRound className="size-5 text-chart-3" /></div><p className="mt-4 font-serif text-3xl font-semibold">{money.format(personalTotal)}</p><div className="mt-4 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-chart-3" style={{ width: total ? `${personalTotal / total * 100}%` : '0%' }} /></div></div>
        </section>

        <section className="mb-8 grid gap-6 lg:grid-cols-[0.9fr_1.6fr]">
          <div className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-6"><div className="mb-5 flex items-start justify-between gap-3 sm:mb-6"><div className="min-w-0"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:text-xs sm:tracking-widest">Distribución</p><h3 className="mt-1 font-serif text-lg font-semibold sm:text-xl">Por categoría</h3></div><BarChart3 className="size-5 shrink-0 text-muted-foreground" /></div><div className="flex min-w-0 flex-col gap-4">{topCategories.length ? topCategories.map(([name, value], index) => <div key={name}><div className="mb-1.5 flex justify-between text-sm"><span className="flex items-center gap-2"><span className={`size-2.5 rounded-full ${['bg-primary', 'bg-chart-3', 'bg-chart-4', 'bg-chart-2'][index]}`} />{name}</span><span className="font-medium">{money.format(value)}</span></div><div className="h-2 rounded-full bg-muted"><div className={`h-full rounded-full ${['bg-primary', 'bg-chart-3', 'bg-chart-4', 'bg-chart-2'][index]}`} style={{ width: `${value / maxCategory * 100}%` }} /></div></div>) : <p className="text-sm text-muted-foreground">No hay datos para este filtro.</p>}</div></div>
          <div className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-6"><div className="mb-5 flex flex-col gap-3"><div className="min-w-0"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:text-xs sm:tracking-widest">Registro</p><h3 className="mt-1 font-serif text-lg font-semibold sm:text-xl">Últimos movimientos</h3></div><div className="flex w-full min-w-0 gap-2"><div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-input px-3 py-2"><Search className="size-4 shrink-0 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar..." className="min-w-0 w-full bg-transparent text-sm outline-none" /></div><button onClick={() => setShowFilters(!showFilters)} className={`rounded-lg border px-3 py-2 ${showFilters ? 'border-primary text-primary' : 'border-input text-muted-foreground'}`} aria-label="Mostrar filtros"><Filter className="size-4" /></button></div></div>{showFilters && <div className="mb-4 flex flex-wrap items-center gap-2"><Tag className="size-4 shrink-0 text-muted-foreground" /><select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm"><option>Todas</option>{Array.from(new Set(Object.values(categories).flat())).map((item) => <option key={item}>{item}</option>)}</select><button onClick={() => { setCategory('Todas'); setQuery('') }} className="text-xs text-muted-foreground underline">Limpiar</button></div>}<div className="flex flex-col gap-1">{filtered.map((expense) => <div key={expense.id} className="group flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition hover:bg-muted/60"><div className="flex min-w-0 items-center gap-3"><div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${expense.type === 'Profesional' ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'}`}>{expense.type === 'Profesional' ? <BriefcaseBusiness className="size-4" /> : <Home className="size-4" />}</div><div className="min-w-0"><p className="truncate text-sm font-medium">{expense.description}</p><p className="truncate text-xs text-muted-foreground">{expense.category} · {expense.project ?? 'Personal'} · {dateFormat.format(new Date(`${expense.date}T12:00:00`))}</p></div></div><div className="flex items-center gap-2"><span className="whitespace-nowrap text-sm font-semibold">{money.format(expense.amount)}</span><div className="hidden gap-1 group-hover:flex"><button onClick={() => openEdit(expense)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Editar ${expense.description}`}><Pencil className="size-3.5" /></button><button onClick={() => deleteExpense(expense.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Eliminar ${expense.description}`}><Trash2 className="size-3.5" /></button></div></div></div>)}{!filtered.length && <div className="py-10 text-center text-sm text-muted-foreground">No encontramos gastos con estos filtros.</div>}</div></div>
        </section>
      </div>

      {isFormOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/35 p-0 sm:items-center sm:p-4"><div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-card p-6 shadow-2xl sm:max-w-lg sm:rounded-2xl"><div className="mb-6 flex items-start justify-between"><div><p className="font-mono text-xs uppercase tracking-widest text-primary">{editing ? 'Editar movimiento' : 'Nuevo movimiento'}</p><h2 className="mt-1 font-serif text-2xl font-semibold">Añadir un gasto</h2></div><button onClick={() => setIsFormOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Cerrar"><X /></button></div><form onSubmit={saveExpense} className="flex flex-col gap-4"><label className="flex flex-col gap-2 text-sm font-medium">Descripción<input required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Ej. Compra de pintura" className="rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring" /></label><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="flex flex-col gap-2 text-sm font-medium">Importe ($)<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0,00" className="rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring" /></label><label className="flex flex-col gap-2 text-sm font-medium">Fecha<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring" /></label></div><div className="flex flex-col gap-2 text-sm font-medium">Tipo<div className="grid grid-cols-2 gap-2">{(['Profesional', 'Personal'] as ExpenseType[]).map((item) => <button type="button" key={item} onClick={() => setForm({ ...form, type: item, category: categories[item][0] })} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm ${form.type === item ? 'border-primary bg-primary/10 text-primary' : 'border-input text-muted-foreground'}`}>{form.type === item && <Check className="size-4" />}{item}</button>)}</div></div><label className="flex flex-col gap-2 text-sm font-medium">Categoría<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring">{categories[form.type].map((item) => <option key={item}>{item}</option>)}</select></label>{form.type === 'Profesional' && <label className="flex flex-col gap-2 text-sm font-medium">Proyecto<input value={form.project} onChange={(event) => setForm({ ...form, project: event.target.value })} placeholder="Ej. Reforma cocina" className="rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring" /></label>}<label className="flex flex-col gap-2 text-sm font-medium">Notas <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} placeholder="Opcional" className="resize-none rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring" /></label><button type="submit" className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground hover:opacity-90">{editing ? 'Guardar cambios' : 'Guardar gasto'}<ArrowDownUp className="size-4 rotate-90" /></button></form></div></div>}
    </main>
  )
}
