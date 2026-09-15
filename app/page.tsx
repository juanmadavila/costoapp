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
  LogOut,
  LockKeyhole,
  Menu,
  Moon,
  Pencil,
  Plus,
  Receipt,
  Search,
  Sun,
  Tag,
  Trash2,
  TrendingUp,
  UserRound,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type ExpenseType = 'Profesional' | 'Personal'
type ModuleType = 'gastos' | 'ingresos'

type Expense = {
  id: string
  date: string
  description: string
  category: string
  type: ExpenseType
  amount: number
  project?: string
  notes?: string
}

type Income = {
  id: string
  date: string
  description: string
  category: string
  amount: number
  source?: string
  notes?: string
}

const expenseCategories = {
  Profesional: ['Materiales e insumos', 'Mano de obra', 'Herramientas', 'Transporte', 'Servicios', 'Otros'],
  Personal: ['Vivienda', 'Alimentación', 'Educación', 'Ropa', 'Transporte', 'Salud', 'Salidas', 'Otros'],
}

const defaultIncomeCategories = ['Salario', 'Freelance', 'Ventas', 'Inversiones', 'Bonos', 'Otros']
const EXPENSE_CATEGORIES_STORAGE_KEY = 'costoapp-expense-categories'
const INCOME_CATEGORIES_STORAGE_KEY = 'costoapp-income-categories'

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const dateFormat = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' })
const today = () => new Date().toISOString().slice(0, 10)
const currentMonth = () => today().slice(0, 7)
const monthStart = (value: string) => `${value}-01`
const INACTIVITY_TIMEOUT_MS = 24 * 60 * 60 * 1000
const LAST_SEEN_STORAGE_KEY = 'costoapp-last-seen'

function getLastSeenTimestamp() {
  if (typeof window === 'undefined') return 0

  const saved = Number(window.localStorage.getItem(LAST_SEEN_STORAGE_KEY) ?? '0')
  if (!Number.isFinite(saved) || saved <= 0) return 0

  return saved
}

function setLastSeenTimestamp() {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(LAST_SEEN_STORAGE_KEY, String(Date.now()))
}

function LoginView({ onLogin, isDark, onToggleTheme, notice }: { onLogin: (email: string, password: string) => Promise<void>; isDark: boolean; onToggleTheme: () => void; notice?: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      await onLogin(email, password)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'No se pudo iniciar sesión.')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Receipt /></div>
            <div className="min-w-0">
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:text-xs sm:tracking-[0.24em]">Control financiero</p>
              <h1 className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">CostoApp</h1>
            </div>
          </div>
          <button onClick={onToggleTheme} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}>
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-8">
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-primary">Bienvenido de nuevo</p>
            <h2 className="font-serif text-4xl font-semibold tracking-tight">Tus finanzas, bajo control.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Inicia sesión para consultar tus gastos e ingresos.</p>
          </div>

          {notice && <div className="mb-5 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{notice}</div>}

          <form onSubmit={submitLogin} className="flex flex-col gap-5">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Correo electrónico
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@correo.com" className="rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Contraseña
              <input required minLength={4} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" className="rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring" />
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="submit" className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition hover:opacity-90">
              <LockKeyhole className="size-4" /> Entrar a CostoApp
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">Usa una cuenta registrada para continuar.</p>
        </section>
      </div>
    </main>
  )
}

export default function Page() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [incomes, setIncomes] = useState<Income[]>([])
  const [activeModule, setActiveModule] = useState<ModuleType>('gastos')
  const [activeType, setActiveType] = useState<'Todos' | ExpenseType>('Todos')
  const [month, setMonth] = useState(currentMonth)
  const [query, setQuery] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('Todas')
  const [incomeCategory, setIncomeCategory] = useState('Todas')
  const [loginNotice, setLoginNotice] = useState('')
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [isIncomeFormOpen, setIsIncomeFormOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState<Income | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [monthlyBudgets, setMonthlyBudgets] = useState<Partial<Record<ExpenseType, string>>>({})
  const [monthlyIncomeGoal, setMonthlyIncomeGoal] = useState('')
  const [budgetEditor, setBudgetEditor] = useState<ExpenseType | null>(null)
  const [budgetForm, setBudgetForm] = useState('')
  const [incomeGoalEditor, setIncomeGoalEditor] = useState(false)
  const [incomeGoalForm, setIncomeGoalForm] = useState('')
  const [expenseCategoryOptions, setExpenseCategoryOptions] = useState<Record<ExpenseType, string[]>>(() => {
    if (typeof window === 'undefined') return expenseCategories

    try {
      const saved = window.localStorage.getItem(EXPENSE_CATEGORIES_STORAGE_KEY)
      const parsed = saved ? JSON.parse(saved) : null
      return parsed?.Profesional?.length && parsed?.Personal?.length ? parsed : expenseCategories
    } catch {
      return expenseCategories
    }
  })
  const [isAddingExpenseCategory, setIsAddingExpenseCategory] = useState(false)
  const [newExpenseCategory, setNewExpenseCategory] = useState('')
  const [form, setForm] = useState({ description: '', amount: '', date: today(), category: expenseCategories.Profesional[0], type: 'Profesional' as ExpenseType, project: '', notes: '' })
  const [incomeCategories, setIncomeCategories] = useState<string[]>(() => {
    if (typeof window === 'undefined') return defaultIncomeCategories

    try {
      const saved = window.localStorage.getItem(INCOME_CATEGORIES_STORAGE_KEY)
      const parsed = saved ? JSON.parse(saved) : null
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultIncomeCategories
    } catch {
      return defaultIncomeCategories
    }
  })
  const [isAddingIncomeCategory, setIsAddingIncomeCategory] = useState(false)
  const [newIncomeCategory, setNewIncomeCategory] = useState('')
  const [incomeForm, setIncomeForm] = useState({ description: '', amount: '', date: today(), category: defaultIncomeCategories[0], source: '', notes: '' })

  useEffect(() => {
    window.localStorage.setItem(EXPENSE_CATEGORIES_STORAGE_KEY, JSON.stringify(expenseCategoryOptions))
  }, [expenseCategoryOptions])

  useEffect(() => {
    window.localStorage.setItem(INCOME_CATEGORIES_STORAGE_KEY, JSON.stringify(incomeCategories))
  }, [incomeCategories])

  const currentCategory = activeModule === 'gastos' ? expenseCategory : incomeCategory

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  useEffect(() => {
    if (!userId) return

    setLastSeenTimestamp()

    const interval = window.setInterval(() => {
      const lastSeen = getLastSeenTimestamp()
      const elapsed = Date.now() - lastSeen

      if (elapsed > INACTIVITY_TIMEOUT_MS) {
        void logout()
      }
    }, 60 * 1000)

    return () => window.clearInterval(interval)
  }, [userId])

  useEffect(() => {
    const handleActivity = () => {
      setLastSeenTimestamp()
    }

    window.addEventListener('pointerdown', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('scroll', handleActivity, { passive: true })

    return () => {
      window.removeEventListener('pointerdown', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('scroll', handleActivity)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setUserId(session?.user.id ?? null)
      setIsLoggedIn(Boolean(session))
      setAuthReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null)
      setIsLoggedIn(Boolean(session))
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!userId) {
      setExpenses([])
      setIncomes([])
      setMonthlyBudgets({})
      return
    }

    setIsLoading(true)
    Promise.all([
      supabase.from('expenses').select('id, spent_on, description, category, type, amount, project, notes').eq('user_id', userId).order('spent_on', { ascending: false }),
      supabase.from('incomes').select('id, received_on, description, category, amount, source, notes').eq('user_id', userId).order('received_on', { ascending: false }),
      supabase.from('monthly_budgets').select('type, amount').eq('user_id', userId).eq('month', monthStart(month)),
      supabase.from('monthly_income_goals').select('amount').eq('user_id', userId).eq('month', monthStart(month)).maybeSingle(),
    ])
      .then(([expensesResult, incomesResult, budgetsResult, incomeGoalResult]) => {
        if (expensesResult.error) throw expensesResult.error
        if (incomesResult.error) throw incomesResult.error
        if (budgetsResult.error) throw budgetsResult.error
        if (incomeGoalResult.error) throw incomeGoalResult.error

        setExpenses(
          (expensesResult.data ?? []).map((expense) => ({
            id: expense.id,
            date: expense.spent_on,
            description: expense.description,
            category: expense.category,
            type: expense.type as ExpenseType,
            amount: Number(expense.amount),
            project: expense.project ?? undefined,
            notes: expense.notes ?? undefined,
          })),
        )

        setIncomes(
          (incomesResult.data ?? []).map((income) => ({
            id: income.id,
            date: income.received_on,
            description: income.description,
            category: income.category,
            amount: Number(income.amount),
            source: income.source ?? undefined,
            notes: income.notes ?? undefined,
          })),
        )

        setMonthlyBudgets(
          Object.fromEntries((budgetsResult.data ?? []).map((budget) => [budget.type, String(budget.amount)])) as Partial<Record<ExpenseType, string>>,
        )
        setMonthlyIncomeGoal(incomeGoalResult.data ? String(incomeGoalResult.data.amount) : '')
      })
      .catch(() => {
        setExpenses([])
        setIncomes([])
        setMonthlyBudgets({})
        setMonthlyIncomeGoal('')
      })
      .finally(() => setIsLoading(false))
  }, [userId, month])

  const filteredExpenses = useMemo(
    () =>
      expenses
        .filter((expense) => expense.date.startsWith(month))
        .filter((expense) => activeType === 'Todos' || expense.type === activeType)
        .filter((expense) => expenseCategory === 'Todas' || expense.category === expenseCategory)
        .filter((expense) => `${expense.description} ${expense.project ?? ''}`.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [expenses, month, activeType, expenseCategory, query],
  )

  const filteredIncomes = useMemo(
    () =>
      incomes
        .filter((income) => income.date.startsWith(month))
        .filter((income) => incomeCategory === 'Todas' || income.category === incomeCategory)
        .filter((income) => `${income.description} ${income.source ?? ''}`.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [incomes, month, incomeCategory, query],
  )

  const expenseTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const professionalTotal = expenses.filter((e) => e.date.startsWith(month) && e.type === 'Profesional').reduce((s, e) => s + e.amount, 0)
  const personalTotal = expenses.filter((e) => e.date.startsWith(month) && e.type === 'Personal').reduce((s, e) => s + e.amount, 0)
  const incomeTotal = filteredIncomes.reduce((sum, income) => sum + income.amount, 0)
  const netTotal = incomeTotal - expenseTotal

  const expenseCategoryTotals = filteredExpenses.reduce<Record<string, number>>((totals, expense) => ({
    ...totals,
    [expense.category]: (totals[expense.category] ?? 0) + expense.amount,
  }), {})

  const incomeCategoryTotals = filteredIncomes.reduce<Record<string, number>>((totals, income) => ({
    ...totals,
    [income.category]: (totals[income.category] ?? 0) + income.amount,
  }), {})

  const topExpenseCategories = Object.entries(expenseCategoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 4)
  const maxExpenseCategory = topExpenseCategories[0]?.[1] || 1
  const topIncomeCategories = Object.entries(incomeCategoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 4)
  const maxIncomeCategory = topIncomeCategories[0]?.[1] || 1

  const professionalBudget = Number(monthlyBudgets.Profesional) || 0
  const personalBudget = Number(monthlyBudgets.Personal) || 0
  const professionalPercentage = professionalBudget > 0 ? professionalTotal / professionalBudget * 100 : 0
  const personalPercentage = personalBudget > 0 ? personalTotal / personalBudget * 100 : 0
  const incomeGoal = Number(monthlyIncomeGoal) || 0
  const incomeGoalPercentage = incomeGoal > 0 ? incomeTotal / incomeGoal * 100 : 0

  function setActiveCategory(value: string) {
    if (activeModule === 'gastos') {
      setExpenseCategory(value)
      return
    }
    setIncomeCategory(value)
  }

  function openNewExpense() {
    setEditing(null)
    const type = activeType === 'Personal' ? 'Personal' : 'Profesional'
    setForm({ description: '', amount: '', date: today(), category: expenseCategoryOptions[type][0], type, project: '', notes: '' })
    setIsAddingExpenseCategory(false)
    setNewExpenseCategory('')
    setIsFormOpen(true)
  }

  function openEditExpense(expense: Expense) {
    setEditing(expense)
    setForm({ description: expense.description, amount: String(expense.amount), date: expense.date, category: expense.category, type: expense.type, project: expense.project ?? '', notes: expense.notes ?? '' })
    setIsAddingExpenseCategory(false)
    setNewExpenseCategory('')
    setIsFormOpen(true)
  }

  function addCustomExpenseCategory() {
    const value = newExpenseCategory.trim().replace(/\s+/g, ' ')
    if (!value) return

    const category = value.charAt(0).toUpperCase() + value.slice(1)
    setExpenseCategoryOptions((current) => ({
      ...current,
      [form.type]: current[form.type].some((item) => item.toLowerCase() === category.toLowerCase())
        ? current[form.type]
        : [...current[form.type], category],
    }))
    setForm((current) => ({ ...current, category }))
    setIsAddingExpenseCategory(false)
    setNewExpenseCategory('')
  }

  async function saveExpense(event: React.FormEvent) {
    event.preventDefault()
    if (!userId || !form.description || !form.amount || Number(form.amount) <= 0) return

    const values = {
      spent_on: form.date,
      description: form.description.trim(),
      category: form.category,
      type: form.type,
      amount: Number(form.amount),
      project: form.type === 'Profesional' ? form.project.trim() || null : null,
      notes: form.notes.trim() || null,
    }

    const result = editing
      ? await supabase.from('expenses').update(values).eq('id', editing.id).eq('user_id', userId).select('id, spent_on, description, category, type, amount, project, notes').single()
      : await supabase.from('expenses').insert({ ...values, user_id: userId }).select('id, spent_on, description, category, type, amount, project, notes').single()

    if (result.error) return

    const saved: Expense = {
      id: result.data.id,
      date: result.data.spent_on,
      description: result.data.description,
      category: result.data.category,
      type: result.data.type as ExpenseType,
      amount: Number(result.data.amount),
      project: result.data.project ?? undefined,
      notes: result.data.notes ?? undefined,
    }

    setExpenses((current) => editing ? current.map((expense) => expense.id === saved.id ? saved : expense) : [saved, ...current])
    setIsFormOpen(false)
  }

  async function deleteExpense(id: string) {
    if (!userId || !window.confirm('¿Eliminar este gasto?')) return

    const result = await supabase.from('expenses').delete().eq('id', id).eq('user_id', userId)
    if (!result.error) setExpenses((current) => current.filter((expense) => expense.id !== id))
  }

  function openBudgetEditor(type: ExpenseType) {
    setBudgetEditor(type)
    setBudgetForm(monthlyBudgets[type] ?? '')
  }

  async function saveBudget(event: React.FormEvent) {
    event.preventDefault()
    if (!userId || !budgetEditor || !budgetForm || Number(budgetForm) <= 0) return

    const result = await supabase.from('monthly_budgets').upsert(
      { user_id: userId, month: monthStart(month), type: budgetEditor, amount: Number(budgetForm) },
      { onConflict: 'user_id,month,type' },
    )

    if (result.error) return

    setMonthlyBudgets((current) => ({ ...current, [budgetEditor]: budgetForm }))
    setBudgetEditor(null)
  }

  async function clearBudget() {
    if (!userId || !budgetEditor) return

    const result = await supabase.from('monthly_budgets').delete().eq('user_id', userId).eq('month', monthStart(month)).eq('type', budgetEditor)
    if (result.error) return

    setMonthlyBudgets((current) => {
      const next = { ...current }
      delete next[budgetEditor]
      return next
    })
    setBudgetForm('')
    setBudgetEditor(null)
  }

  function openIncomeGoalEditor() {
    setIncomeGoalEditor(true)
    setIncomeGoalForm(monthlyIncomeGoal)
  }

  async function saveIncomeGoal(event: React.FormEvent) {
    event.preventDefault()
    if (!userId || !incomeGoalForm || Number(incomeGoalForm) <= 0) return

    const result = await supabase.from('monthly_income_goals').upsert(
      { user_id: userId, month: monthStart(month), amount: Number(incomeGoalForm) },
      { onConflict: 'user_id,month' },
    )

    if (result.error) return

    setMonthlyIncomeGoal(incomeGoalForm)
    setIncomeGoalEditor(false)
  }

  async function clearIncomeGoal() {
    if (!userId) return

    const result = await supabase.from('monthly_income_goals').delete().eq('user_id', userId).eq('month', monthStart(month))
    if (result.error) return

    setMonthlyIncomeGoal('')
    setIncomeGoalForm('')
    setIncomeGoalEditor(false)
  }

  function openNewIncome() {
    setEditingIncome(null)
    setIncomeForm({ description: '', amount: '', date: today(), category: incomeCategories[0] ?? defaultIncomeCategories[0], source: '', notes: '' })
    setIsAddingIncomeCategory(false)
    setNewIncomeCategory('')
    setIsIncomeFormOpen(true)
  }

  function openEditIncome(income: Income) {
    setEditingIncome(income)
    setIncomeForm({ description: income.description, amount: String(income.amount), date: income.date, category: income.category, source: income.source ?? '', notes: income.notes ?? '' })
    setIsAddingIncomeCategory(false)
    setNewIncomeCategory('')
    setIsIncomeFormOpen(true)
  }

  function addCustomIncomeCategory() {
    const value = newIncomeCategory.trim()
    if (!value) return

    const normalized = value.replace(/\s+/g, ' ').trim()
    const category = normalized.charAt(0).toUpperCase() + normalized.slice(1)

    setIncomeCategories((current) => {
      if (current.some((item) => item.toLowerCase() === category.toLowerCase())) {
        return current
      }
      return [...current, category]
    })

    setIncomeForm((current) => ({ ...current, category }))
    setIsAddingIncomeCategory(false)
    setNewIncomeCategory('')
  }

  async function saveIncome(event: React.FormEvent) {
    event.preventDefault()
    if (!userId || !incomeForm.description || !incomeForm.amount || Number(incomeForm.amount) <= 0) return

    const values = {
      received_on: incomeForm.date,
      description: incomeForm.description.trim(),
      category: incomeForm.category,
      amount: Number(incomeForm.amount),
      source: incomeForm.source.trim() || null,
      notes: incomeForm.notes.trim() || null,
    }

    const result = editingIncome
      ? await supabase.from('incomes').update(values).eq('id', editingIncome.id).eq('user_id', userId).select('id, received_on, description, category, amount, source, notes').single()
      : await supabase.from('incomes').insert({ ...values, user_id: userId }).select('id, received_on, description, category, amount, source, notes').single()

    if (result.error) return

    const saved: Income = {
      id: result.data.id,
      date: result.data.received_on,
      description: result.data.description,
      category: result.data.category,
      amount: Number(result.data.amount),
      source: result.data.source ?? undefined,
      notes: result.data.notes ?? undefined,
    }

    setIncomes((current) => editingIncome ? current.map((income) => income.id === saved.id ? saved : income) : [saved, ...current])
    setIsIncomeFormOpen(false)
  }

  async function deleteIncome(id: string) {
    if (!userId || !window.confirm('¿Eliminar este ingreso?')) return

    const result = await supabase.from('incomes').delete().eq('id', id).eq('user_id', userId)
    if (!result.error) setIncomes((current) => current.filter((income) => income.id !== id))
  }

  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error('Correo o contraseña incorrectos.')

    setLastSeenTimestamp()
    setLoginNotice('')
  }

  async function logout() {
    try {
      await supabase.auth.signOut()
    } finally {
      window.localStorage.removeItem(LAST_SEEN_STORAGE_KEY)
      setLoginNotice('')
      setIsLoggedIn(false)
      setUserId(null)
    }
  }

  if (!authReady || !isLoggedIn) return <LoginView onLogin={login} isDark={isDark} onToggleTheme={() => setIsDark((current) => !current)} notice={loginNotice} />

  return (
    <main className="min-h-screen bg-background text-foreground">
      {budgetEditor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/35 p-0 sm:items-center sm:p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="budget-title" className="w-full rounded-t-3xl bg-card p-6 shadow-2xl sm:max-w-md sm:rounded-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-primary">Límite mensual</p>
                <h2 id="budget-title" className="mt-1 font-serif text-2xl font-semibold">Presupuesto {budgetEditor}</h2>
              </div>
              <button type="button" onClick={() => setBudgetEditor(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Cerrar"><X /></button>
            </div>
            <form onSubmit={saveBudget} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm font-medium">
                Presupuesto de gasto mensual objetivo
                <input autoFocus required type="number" min="0.01" step="0.01" value={budgetForm} onChange={(event) => setBudgetForm(event.target.value)} className="rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring" />
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <button type="button" onClick={clearBudget} className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/15">Eliminar límite</button>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setBudgetEditor(null)} className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
                  <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Guardar límite</button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}

      {incomeGoalEditor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/35 p-0 sm:items-center sm:p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="income-goal-title" className="w-full rounded-t-3xl bg-card p-6 shadow-2xl sm:max-w-md sm:rounded-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-primary">Objetivo mensual</p>
                <h2 id="income-goal-title" className="mt-1 font-serif text-2xl font-semibold">Meta de ingresos</h2>
              </div>
              <button type="button" onClick={() => setIncomeGoalEditor(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Cerrar"><X /></button>
            </div>
            <form onSubmit={saveIncomeGoal} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm font-medium">
                Monto objetivo de ingreso mensual
                <input autoFocus required type="number" min="0.01" step="0.01" value={incomeGoalForm} onChange={(event) => setIncomeGoalForm(event.target.value)} className="rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring" />
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <button type="button" onClick={clearIncomeGoal} className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/15">Eliminar objetivo</button>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIncomeGoalEditor(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
                  <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Guardar objetivo</button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}

      {isIncomeFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/35 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-card p-6 shadow-2xl sm:max-w-lg sm:rounded-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-primary">{editingIncome ? 'Editar ingreso' : 'Nuevo ingreso'}</p>
                <h2 className="mt-1 font-serif text-2xl font-semibold">Registrar un ingreso</h2>
              </div>
              <button onClick={() => setIsIncomeFormOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Cerrar"><X /></button>
            </div>

            <form onSubmit={saveIncome} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm font-medium">
                Descripción
                <input required value={incomeForm.description} onChange={(event) => setIncomeForm({ ...incomeForm, description: event.target.value })} placeholder="Ej. Pago de proyecto" className="rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring" />
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Importe ($)
                  <input required type="number" min="0.01" step="0.01" value={incomeForm.amount} onChange={(event) => setIncomeForm({ ...incomeForm, amount: event.target.value })} placeholder="0,00" className="rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring" />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Fecha
                  <input required type="date" value={incomeForm.date} onChange={(event) => setIncomeForm({ ...incomeForm, date: event.target.value })} className="rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring" />
                </label>
              </div>

              <label className="flex flex-col gap-2 text-sm font-medium">
                Categoría
                <select value={isAddingIncomeCategory ? '__new__' : incomeForm.category} onChange={(event) => {
                  const nextValue = event.target.value
                  if (nextValue === '__new__') {
                    setIsAddingIncomeCategory(true)
                    return
                  }

                  setIsAddingIncomeCategory(false)
                  setIncomeForm({ ...incomeForm, category: nextValue })
                }} className="rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring">
                  {incomeCategories.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                  <option value="__new__">+ Agregar categoría</option>
                </select>
              </label>

              {isAddingIncomeCategory && (
                <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-muted/40 p-3">
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Nueva categoría
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={newIncomeCategory}
                        onChange={(event) => setNewIncomeCategory(event.target.value)}
                        placeholder="Ej. Dividendos"
                        className="flex-1 rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button type="button" onClick={addCustomIncomeCategory} className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Agregar</button>
                    </div>
                  </label>
                </div>
              )}

              <label className="flex flex-col gap-2 text-sm font-medium">
                Fuente
                <input value={incomeForm.source} onChange={(event) => setIncomeForm({ ...incomeForm, source: event.target.value })} placeholder="Ej. Cliente, salario, venta" className="rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring" />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium">
                Notas
                <textarea value={incomeForm.notes} onChange={(event) => setIncomeForm({ ...incomeForm, notes: event.target.value })} placeholder="Observaciones adicionales" className="min-h-24 rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring" />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsIncomeFormOpen(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
                <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Guardar ingreso</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <header className="border-b border-border/70 bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-3 py-3 sm:flex-nowrap sm:px-6 sm:py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Receipt /></div>
            <div className="min-w-0">
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:text-xs sm:tracking-[0.24em]">Control financiero</p>
              <h1 className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">CostoApp</h1>
            </div>
          </div>

          <div className="relative flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setIsNavMenuOpen((current) => !current)}
              className="rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Abrir menú de navegación"
              aria-expanded={isNavMenuOpen}
              title="Menú"
            >
              <Menu className="size-5" />
            </button>

            {isNavMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-2xl border border-border bg-card p-2 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setIsDark((current) => !current)
                    setIsNavMenuOpen(false)
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-muted"
                  aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
                >
                  <span className="flex items-center gap-2">
                    {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                    {isDark ? 'Modo claro' : 'Modo oscuro'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsNavMenuOpen(false)
                    void logout()
                  }}
                  className="mt-1 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-muted"
                  aria-label="Cerrar sesión"
                >
                  <span className="flex items-center gap-2">
                    <LogOut className="size-4" />
                    Cerrar sesión
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-primary">Resumen mensual</p>
            <h2 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
              {activeModule === 'gastos' ? 'Tus gastos' : 'Tus ingresos'}
            </h2>
          </div>
          <button onClick={activeModule === 'gastos' ? openNewExpense : openNewIncome} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90">
            <Plus /> {activeModule === 'gastos' ? 'Añadir gasto' : 'Añadir ingreso'}
          </button>
        </section>

        <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-3">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            <button onClick={() => { setActiveModule('gastos'); setShowFilters(false); setQuery(''); setExpenseCategory('Todas'); setActiveType('Todos') }} className={`rounded-lg px-2 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${activeModule === 'gastos' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <span className="flex items-center justify-center gap-2"><ArrowDownUp className="size-4" /> Gastos</span>
            </button>
            <button onClick={() => { setActiveModule('ingresos'); setShowFilters(false); setQuery(''); setIncomeCategory('Todas') }} className={`rounded-lg px-2 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${activeModule === 'ingresos' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <span className="flex items-center justify-center gap-2"><TrendingUp className="size-4" /> Ingresos</span>
            </button>
          </div>
          <label className="flex min-w-0 items-center gap-2 px-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="bg-transparent font-medium text-foreground outline-none" />
          </label>
        </section>

        {activeModule === 'gastos' ? (
          <>
            <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-3">
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
                {(['Todos', 'Profesional', 'Personal'] as const).map((item) => (
                  <button
                    key={item}
                    onClick={() => { setActiveType(item); setExpenseCategory('Todas') }}
                    className={`rounded-lg px-2 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${activeType === item ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {item === 'Todos' ? 'Todos' : item === 'Profesional' ? (
                      <span className="flex items-center gap-2"><BriefcaseBusiness className="size-4" /> Profesional</span>
                    ) : (
                      <span className="flex items-center gap-2"><UserRound className="size-4" /> Personal</span>
                    )}
                  </button>
                ))}
              </div>
            </section>

            <section className="mb-6 grid gap-4 md:grid-cols-[1.4fr_1fr_1fr]">
              <div className="rounded-2xl bg-red-100 p-6 text-red-950 dark:bg-red-950/50 dark:text-red-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-red-950/70 dark:text-red-100/70">Gasto total</p>
                    <p className="mt-2 font-serif text-4xl font-semibold">{money.format(expenseTotal)}</p>
                  </div>
                  <CircleDollarSign className="size-7 shrink-0 opacity-70" />
                </div>
                <div className="mt-8 flex items-center gap-2 text-sm text-red-950/75 dark:text-red-100/75">
                  <TrendingUp className="size-4" /> Este mes · {filteredExpenses.length} movimientos
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Profesional</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{professionalBudget > 0 ? money.format(professionalBudget) : 'Sin límite'}</span>
                    <button type="button" onClick={() => openBudgetEditor('Profesional')} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Editar presupuesto profesional" title="Editar presupuesto"><Pencil className="size-4" /></button>
                    <BriefcaseBusiness className="size-5 text-primary" />
                  </div>
                </div>
                <p className="mt-4 font-serif text-3xl font-semibold">{money.format(professionalTotal)}</p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${professionalPercentage > 100 ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${Math.min(professionalPercentage, 100)}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{professionalBudget > 0 ? `${Math.round(professionalPercentage)}% del presupuesto` : 'Define un presupuesto mensual'}</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Personal</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{personalBudget > 0 ? money.format(personalBudget) : 'Sin límite'}</span>
                    <button type="button" onClick={() => openBudgetEditor('Personal')} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Editar presupuesto personal" title="Editar presupuesto"><Pencil className="size-4" /></button>
                    <UserRound className="size-5 text-chart-3" />
                  </div>
                </div>
                <p className="mt-4 font-serif text-3xl font-semibold">{money.format(personalTotal)}</p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${personalPercentage > 100 ? 'bg-red-500' : 'bg-chart-3'}`} style={{ width: `${Math.min(personalPercentage, 100)}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{personalBudget > 0 ? `${Math.round(personalPercentage)}% del presupuesto` : 'Define un presupuesto mensual'}</p>
              </div>
            </section>

            <section className="mb-8 grid gap-6 lg:grid-cols-[0.9fr_1.6fr]">
              <div className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:text-xs sm:tracking-widest">Distribución</p>
                    <h3 className="mt-1 font-serif text-lg font-semibold sm:text-xl">Por categoría</h3>
                  </div>
                  <BarChart3 className="size-5 shrink-0 text-muted-foreground" />
                </div>

                <div className="flex min-w-0 flex-col gap-4">
                  {topExpenseCategories.length ? (
                    topExpenseCategories.map(([name, value], index) => (
                      <div key={name}>
                        <div className="mb-1.5 flex justify-between text-sm">
                          <span className="flex items-center gap-2"><span className={`size-2.5 rounded-full ${['bg-primary', 'bg-chart-3', 'bg-chart-4', 'bg-chart-2'][index]}`} />{name}</span>
                          <span className="font-medium">{money.format(value)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className={`h-full rounded-full ${['bg-primary', 'bg-chart-3', 'bg-chart-4', 'bg-chart-2'][index]}`} style={{ width: `${Math.min(value / maxExpenseCategory * 100, 100)}%` }} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay datos para este filtro.</p>
                  )}
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-6">
                <div className="mb-5 flex flex-col gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:text-xs sm:tracking-widest">Registro</p>
                    <h3 className="mt-1 font-serif text-lg font-semibold sm:text-xl">Últimos movimientos</h3>
                  </div>
                  <div className="flex w-full min-w-0 gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-input px-3 py-2">
                      <Search className="size-4 shrink-0 text-muted-foreground" />
                      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar gasto..." className="min-w-0 w-full bg-transparent text-sm outline-none" />
                    </div>
                    <button onClick={() => setShowFilters(!showFilters)} className={`rounded-lg border px-3 py-2 ${showFilters ? 'border-primary text-primary' : 'border-input text-muted-foreground'}`} aria-label="Mostrar filtros"><Filter className="size-4" /></button>
                  </div>
                </div>

                {showFilters && (
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Tag className="size-4 shrink-0 text-muted-foreground" />
                    <select value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
                      <option value="Todas">Todas</option>
                      {Array.from(new Set(Object.values(expenseCategoryOptions).flat())).map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                    <button onClick={() => { setExpenseCategory('Todas'); setQuery('') }} className="text-xs text-muted-foreground underline">Limpiar</button>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  {filteredExpenses.length ? (
                    filteredExpenses.map((expense) => (
                      <div key={expense.id} className="group flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition hover:bg-muted/60">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${expense.type === 'Profesional' ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'}`}>
                            {expense.type === 'Profesional' ? <BriefcaseBusiness className="size-4" /> : <UserRound className="size-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{expense.description}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="rounded-full border border-border px-2 py-0.5">{expense.category}</span>
                              <span>{dateFormat.format(new Date(`${expense.date}T00:00:00`))}</span>
                              {expense.project && <span>{expense.project}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">-{money.format(expense.amount)}</span>
                          <button type="button" onClick={() => openEditExpense(expense)} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Editar gasto"><Pencil className="size-4" /></button>
                          <button type="button" onClick={() => deleteExpense(expense.id)} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Eliminar gasto"><Trash2 className="size-4" /></button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay gastos para este filtro.</p>
                  )}
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="mb-6 grid gap-4 md:grid-cols-[1.2fr_1fr_1fr]">
              <div className="rounded-2xl bg-primary p-6 text-primary-foreground">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-primary-foreground/70">Ingreso total</p>
                    <p className="mt-2 font-serif text-4xl font-semibold">{money.format(incomeTotal)}</p>
                  </div>
                  <TrendingUp className="size-7 shrink-0 opacity-70" />
                </div>
                <div className="mt-8 flex items-center gap-2 text-sm text-primary-foreground/75">
                  <Check className="size-4" /> Este mes · {filteredIncomes.length} registros
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Balance neto</p>
                  <CircleDollarSign className="size-5 text-primary" />
                </div>
                <p className={`mt-4 font-serif text-3xl font-semibold ${netTotal >= 0 ? 'text-primary' : 'text-destructive'}`}>{money.format(netTotal)}</p>
                <p className="mt-2 text-xs text-muted-foreground">{netTotal >= 0 ? 'Flujo positivo' : 'Flujo negativo'} del mes</p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Meta de ingresos</p>
                    <button type="button" onClick={openIncomeGoalEditor} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Editar objetivo de ingresos" title="Editar objetivo"><Pencil className="size-4" /></button>
                  </div>
                  <TrendingUp className="size-5 text-primary" />
                </div>
                <p className="mt-4 font-serif text-3xl font-semibold">{incomeGoal > 0 ? money.format(incomeGoal) : 'Sin meta'}</p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${incomeGoalPercentage > 100 ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${Math.min(incomeGoalPercentage, 100)}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{incomeGoal > 0 ? `${Math.round(incomeGoalPercentage)}% del objetivo` : 'Define un objetivo mensual'}</p>
              </div>
            </section>

            <section className="mb-8 grid gap-6 lg:grid-cols-[0.9fr_1.6fr]">
              <div className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:text-xs sm:tracking-widest">Ingresos</p>
                    <h3 className="mt-1 font-serif text-lg font-semibold sm:text-xl">Por categoría</h3>
                  </div>
                  <BarChart3 className="size-5 shrink-0 text-muted-foreground" />
                </div>

                <div className="flex min-w-0 flex-col gap-4">
                  {topIncomeCategories.length ? (
                    topIncomeCategories.map(([name, value], index) => (
                      <div key={name}>
                        <div className="mb-1.5 flex justify-between text-sm">
                          <span className="flex items-center gap-2"><span className={`size-2.5 rounded-full ${['bg-primary', 'bg-chart-3', 'bg-chart-4', 'bg-chart-2'][index]}`} />{name}</span>
                          <span className="font-medium">{money.format(value)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className={`h-full rounded-full ${['bg-primary', 'bg-chart-3', 'bg-chart-4', 'bg-chart-2'][index]}`} style={{ width: `${Math.min(value / maxIncomeCategory * 100, 100)}%` }} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay ingresos para este filtro.</p>
                  )}
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-6">
                <div className="mb-5 flex flex-col gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:text-xs sm:tracking-widest">Registro</p>
                    <h3 className="mt-1 font-serif text-lg font-semibold sm:text-xl">Últimos ingresos</h3>
                  </div>
                  <div className="flex w-full min-w-0 gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-input px-3 py-2">
                      <Search className="size-4 shrink-0 text-muted-foreground" />
                      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ingreso..." className="min-w-0 w-full bg-transparent text-sm outline-none" />
                    </div>
                    <button onClick={() => setShowFilters(!showFilters)} className={`rounded-lg border px-3 py-2 ${showFilters ? 'border-primary text-primary' : 'border-input text-muted-foreground'}`} aria-label="Mostrar filtros"><Filter className="size-4" /></button>
                  </div>
                </div>

                {showFilters && (
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Tag className="size-4 shrink-0 text-muted-foreground" />
                    <select value={incomeCategory} onChange={(event) => setIncomeCategory(event.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
                      <option value="Todas">Todas</option>
                      {incomeCategories.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                    <button onClick={() => { setIncomeCategory('Todas'); setQuery('') }} className="text-xs text-muted-foreground underline">Limpiar</button>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  {filteredIncomes.length ? (
                    filteredIncomes.map((income) => (
                      <div key={income.id} className="group flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition hover:bg-muted/60">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <TrendingUp className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{income.description}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="rounded-full border border-border px-2 py-0.5">{income.category}</span>
                              <span>{dateFormat.format(new Date(`${income.date}T00:00:00`))}</span>
                              {income.source && <span>{income.source}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary">+{money.format(income.amount)}</span>
                          <button type="button" onClick={() => openEditIncome(income)} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Editar ingreso"><Pencil className="size-4" /></button>
                          <button type="button" onClick={() => deleteIncome(income.id)} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Eliminar ingreso"><Trash2 className="size-4" /></button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay ingresos para este filtro.</p>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/35 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-card p-6 shadow-2xl sm:max-w-lg sm:rounded-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-primary">{editing ? 'Editar movimiento' : 'Nuevo movimiento'}</p>
                <h2 className="mt-1 font-serif text-2xl font-semibold">Añadir un gasto</h2>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Cerrar"><X /></button>
            </div>

            <form onSubmit={saveExpense} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm font-medium">
                Descripción
                <input required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Ej. Compra de pintura" className="rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring" />
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Importe ($)
                  <input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0,00" className="rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring" />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Fecha
                  <input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring" />
                </label>
              </div>

              <div className="flex flex-col gap-2 text-sm font-medium">
                Tipo
                <div className="grid grid-cols-2 gap-2">
                  {(['Profesional', 'Personal'] as ExpenseType[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, type: item, category: expenseCategoryOptions[item][0], project: item === 'Profesional' ? form.project : '' })
                        setIsAddingExpenseCategory(false)
                      }}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${form.type === item ? 'border-primary bg-primary/10 text-primary' : 'border-input text-muted-foreground hover:bg-muted'}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex flex-col gap-2 text-sm font-medium">
                Categoría
                <select value={isAddingExpenseCategory ? '__new__' : form.category} onChange={(event) => {
                  const nextValue = event.target.value
                  if (nextValue === '__new__') {
                    setIsAddingExpenseCategory(true)
                    return
                  }

                  setIsAddingExpenseCategory(false)
                  setForm({ ...form, category: nextValue })
                }} className="rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring">
                  {expenseCategoryOptions[form.type].map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                  <option value="__new__">+ Agregar categoría</option>
                </select>
              </label>

              {isAddingExpenseCategory && (
                <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-muted/40 p-3">
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Nueva categoría
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={newExpenseCategory}
                        onChange={(event) => setNewExpenseCategory(event.target.value)}
                        placeholder="Ej. Suscripciones"
                        className="flex-1 rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button type="button" onClick={addCustomExpenseCategory} className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Agregar</button>
                    </div>
                  </label>
                </div>
              )}

              {form.type === 'Profesional' && (
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Proyecto / Cliente
                  <input value={form.project} onChange={(event) => setForm({ ...form, project: event.target.value })} placeholder="Nombre del proyecto" className="rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring" />
                </label>
              )}

              <label className="flex flex-col gap-2 text-sm font-medium">
                Notas
                <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Observaciones adicionales" className="min-h-24 rounded-xl border border-input bg-background px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring" />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
                <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Guardar gasto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
