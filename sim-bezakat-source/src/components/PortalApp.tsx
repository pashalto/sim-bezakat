'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction, type ChangeEvent, type ReactNode } from 'react'
import Image from 'next/image'
import type { PortalSession, ReportReviewInput, StoredDraft } from '@/lib/portal-contract'
import {
  activePeriodFor,
  createInitialDemoState,
  demoAccounts,
  syncDemoAccountIds,
  demoNow,
  financeStatus,
  monthNames,
  overallStatus,
  periodLabel,
  statusLabel,
  type AnswerValue,
  type DemoAccount,
  type DemoProfile,
  type DemoState,
  type FinanceDocument,
  type OrganizationActivity,
  type PeriodRecord,
  type ReviewStatus,
  type SemesterTranscript,
} from '@/lib/demo-data'
import {
  exclusiveOptions,
  reportSections,
  type ReportQuestion,
  type ReportSection,
} from '@/lib/report-questions'

type IconName =
  | 'grid'
  | 'user'
  | 'file'
  | 'wallet'
  | 'chart'
  | 'bell'
  | 'menu'
  | 'close'
  | 'chevron'
  | 'arrow'
  | 'check'
  | 'clock'
  | 'calendar'
  | 'upload'
  | 'lock'
  | 'alert'
  | 'users'
  | 'logout'
  | 'eye'
  | 'download'
  | 'plus'
  | 'save'
  | 'shield'
  | 'search'
  | 'building'
  | 'award'
  | 'book'

const DATA_KEY = 'sim-bezakat-demo-v7'
const SESSION_KEY = 'sim-bezakat-session-v5'
const reviewReasons = [
  'Belum lengkap',
  'Data tidak konsisten',
  'Bukti tidak sesuai',
  'Berkas tidak terbaca',
  'Tautan tidak dapat diakses',
]

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    file: (
      <>
        <path d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M14 3v5h5M8 13h7M8 17h5" />
      </>
    ),
    wallet: (
      <>
        <path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h16v11H5a3 3 0 0 1-3-3V6" />
        <path d="M16 13h2" />
      </>
    ),
    chart: <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />,
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    upload: <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    alert: (
      <>
        <path d="M12 3 2.8 20h18.4L12 3Z" />
        <path d="M12 9v5M12 17h.01" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8M22 21v-2a4 4 0 0 0-3-3.87" />
      </>
    ),
    logout: <path d="M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />,
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    download: <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />,
    plus: <path d="M12 5v14M5 12h14" />,
    save: (
      <>
        <path d="M5 3h12l2 2v16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M8 3v6h8V3M8 21v-7h8v7" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    building: (
      <>
        <path d="M3 21h18M5 21V8l7-4 7 4v13M9 12h1M14 12h1M9 16h1M14 16h1" />
      </>
    ),
    award: (
      <>
        <circle cx="12" cy="8" r="5" />
        <path d="m8.5 12-1 9 4.5-3 4.5 3-1-9" />
      </>
    ),
    book: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22Z" />
      </>
    ),
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

export default function PortalApp({ storageMode = 'postgres' }: { storageMode?: 'postgres' | 'demo' }) {
  return storageMode === 'postgres' ? <DatabasePortal /> : <DemoPortal />
}

function DemoPortal() {
  const [hydrated, setHydrated] = useState(false)
  const [account, setAccount] = useState<DemoAccount | null>(null)
  const [state, setState] = useState<DemoState>(() => createInitialDemoState())
  useEffect(() => {
    try {
      const savedState = window.localStorage.getItem(DATA_KEY)
      if (savedState) setState(syncDemoAccountIds(JSON.parse(savedState) as DemoState))
      const session = window.localStorage.getItem(SESSION_KEY)
      if (session) setAccount(demoAccounts.find((item) => item.id === session) ?? null)
    } catch {
      setState(createInitialDemoState())
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(DATA_KEY, JSON.stringify(state))
  }, [hydrated, state])

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f6f1]">
        <div className="flex items-center gap-3 text-sm font-bold text-emerald-800">
          <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-600" />
          Menyiapkan SIM-BEZAKAT...
        </div>
      </div>
    )
  }

  if (!account) {
    return (
      <LoginPage
        onLogin={(nextAccount) => {
          setAccount(nextAccount)
          window.localStorage.setItem(SESSION_KEY, nextAccount.id)
        }}
      />
    )
  }

  const clearDemoDraft = (expected: PeriodRecord) => {
    const stored = window.localStorage.getItem(DATA_KEY)
    const latest: DemoState = stored ? JSON.parse(stored) : state
    const active = activePeriodFor(demoNow)
    const row = latest.periods.find(p => p.ownerId === account.id && p.id === expected.id)
    if (!row || row.month !== active.month || row.year !== active.year || row.reportStatus !== 'draft' || row.submittedAt) {
      throw new Error('Hanya draf periode aktif yang belum pernah diajukan dapat dihapus.')
    }
    if (JSON.stringify(row.answers) !== JSON.stringify(expected.answers) ||
        JSON.stringify(row.activities) !== JSON.stringify(expected.activities)) {
      throw new Error('Draf berubah di tab lain. Buka ulang laporan sebelum menghapus.')
    }
    const next = {...latest, periods: latest.periods.map(p => p === row ? {...p, answers: {}, activities: []} : p)}
    window.localStorage.setItem(DATA_KEY, JSON.stringify(next))
    setState(next)
  }

  return <PortalViews account={account} state={state} setState={setState} clearDraft={clearDemoDraft}
    activePeriod={activePeriodFor(demoNow)} logout={() => {
      window.localStorage.removeItem(SESSION_KEY)
      setAccount(null)
    }} />
}

type HeaderPanel = 'notifications' | 'account' | null

type PortalViewsProps = {
  account: DemoAccount
  state: DemoState
  setState?: Dispatch<SetStateAction<DemoState>>
  activePeriod: PortalSession['activePeriod']
  logout: () => void
  persistDraft?: (period: PeriodRecord) => Promise<void>
  clearDraft: (period: PeriodRecord) => Promise<void> | void
  refresh?: (signal?: AbortSignal) => Promise<PortalSession>
  reviewPeriod?: (input: ReportReviewInput) => Promise<void>
}
// Tanggal 10 pukul 00.00 WIB adalah tanggal 9 pukul 17.00 UTC.
function reportPeriodCutoff(period: {month: number; year: number}) {
  return Date.UTC(period.year, period.month, 9, 17)
}

function useDashboardPeriod(period: PortalSession['activePeriod'], refresh?: PortalViewsProps['refresh']) {
  const cutoff = period && reportPeriodCutoff(period)
  const [expiredCutoff, setExpiredCutoff] = useState<number | null>(null)

  useEffect(() => {
    if (!refresh) return
    const controller = new AbortController()
    let timer: number
    let pending = false

    const checkPeriod = () => {
      window.clearTimeout(timer)
      const remaining = cutoff === null ? 0 : cutoff - Date.now()
      // Limit long timers to one day. Retry after a minute if no period is available.
      timer = window.setTimeout(checkPeriod, remaining > 0 ? Math.min(remaining, 86_400_000) : 60_000)
      if (remaining > 0) return
      if (cutoff !== null) setExpiredCutoff(cutoff)
      if (document.hidden || pending) return
      pending = true
      void refresh(controller.signal)
        .catch(() => { /* Keep the expired card closed until the server responds. */ })
        .finally(() => { pending = false })
    }
    checkPeriod()
    document.addEventListener('visibilitychange', checkPeriod)
    window.addEventListener('online', checkPeriod)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', checkPeriod)
      window.removeEventListener('online', checkPeriod)
    }
  }, [cutoff, refresh])

  return refresh && cutoff !== null && cutoff === expiredCutoff ? null : period
}

function PortalViews({ account, state, setState, activePeriod, logout, persistDraft, clearDraft, refresh, reviewPeriod }: PortalViewsProps) {
  const [active, setActive] = useState('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const [headerPanel, setHeaderPanel] = useState<HeaderPanel>(null)
  const [toast, setToast] = useState('')
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [reportPeriodId, setReportPeriodId] = useState<string | null>(null)
  const [reportOpenCount, setReportOpenCount] = useState(0)
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const displayPeriod = useDashboardPeriod(activePeriod, active === 'dashboard' && account.role === 'awardee' ? refresh : undefined)
  const profile = state.profiles[account.id]
  const scopedIds =
    account.role === 'awardee' ? [account.id] : (account.scope ?? []).filter(Boolean)
  const scopedPeriods = state.periods.filter((period) => scopedIds.includes(period.ownerId))
  const currentPeriod =
    account.role === 'awardee'
      ? state.periods.find(
          (period) =>
            period.ownerId === account.id &&
            period.month === displayPeriod?.month &&
            period.year === displayPeriod.year,
        )
      : undefined

  const updatePeriod = (nextPeriod: PeriodRecord) => {
    setState?.((current) => ({
      ...current,
      periods: current.periods.map((period) => (period.id === nextPeriod.id ? nextPeriod : period)),
    }))
  }

  const navigate = (target: string) => {
    const allowed =
      account.role === 'awardee'
        ? ['dashboard', 'profile', 'transcript', 'report', 'finance', 'recap', 'recap-detail']
        : ['dashboard', 'awardees', 'monitoring', 'staff-detail', 'account']
    if (!allowed.includes(target)) {
      setActive('forbidden')
    } else {
      setActive(target)
    }
    setMenuOpen(false)
    setHeaderPanel(null)
  }

  const openReport = async (periodId?: string) => {
    try {
      const latest = await refresh?.()
      const id = latest
        ? latest.drafts.find(row => periodId ? row.periodId === periodId : row.isOpen)?.periodId
        : periodId ?? currentPeriod?.id
      if (!id) {
        setToast('Belum ada periode laporan yang dibuka.')
        return
      }
      setReportPeriodId(id)
      setReportOpenCount(count => count + 1)
      navigate('report')
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Gagal memuat laporan.')
    }
  }
  const openCurrentReport = () => { void openReport() }

  const openPeriodDetail = (id: string) => {
    setSelectedPeriodId(id)
    navigate(account.role === 'awardee' ? 'recap-detail' : 'staff-detail')
  }

  const monitoringPeriod = activePeriod ?? (persistDraft ? {
    year: Number(new Intl.DateTimeFormat('en', {timeZone: 'Asia/Jakarta', year: 'numeric'}).format(new Date())),
    month: 0,
  } : activePeriodFor(demoNow))
  const selectedPeriod = state.periods.find((period) => period.id === selectedPeriodId)
  const editingPeriod = state.periods.find(
    (period) => period.id === (reportPeriodId ?? currentPeriod?.id),
  )

  return (
    <div className="min-h-screen bg-[#f5f6f1] text-slate-900">
      {toast && (
        <div className="fixed right-5 top-5 z-[70] flex max-w-sm items-start gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 shadow-xl">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <Icon name="check" className="h-4 w-4" />
          </span>
          <span role="status" className="pt-1.5">{toast}</span>
        </div>
      )}
      {menuOpen && (
        <button
          aria-label="Tutup menu"
          className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <Sidebar
        account={account}
        active={active}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        navigate={navigate}
        openReport={openCurrentReport}
      />
      <div className="lg:pl-[252px]">
        <Header
          period={displayPeriod}
          account={account}
          panel={headerPanel}
          setPanel={setHeaderPanel}
          openMenu={() => setMenuOpen(true)}
          navigate={navigate}
          logout={logout}
        />
        <main className="mx-auto max-w-[1480px] p-5 sm:p-7 lg:p-9">
          {active === 'forbidden' && <AccessDenied onBack={() => navigate('dashboard')} />}
          {account.role === 'awardee' && (
            <>
              {(active === 'dashboard' || active === 'finance') && !currentPeriod && (
                <PageHeading eyebrow="Periode aktif" title="Belum ada periode terbuka"
                  description="Laporan sebelumnya dapat dibuka melalui menu Rekapitulasi." />
              )}
              {active === 'dashboard' && !currentPeriod && (
                <div className="mt-6 max-w-md"><AllowanceConfirmationCard /></div>
              )}
              {active === 'dashboard' && currentPeriod && profile && (
                <AwardeeDashboard
                  connected={!!persistDraft}
                  account={account}
                  profile={profile}
                  currentPeriod={currentPeriod}
                  periods={scopedPeriods}
                  updatePeriod={updatePeriod}
                  openReport={openCurrentReport}
                  navigate={navigate}
                />
              )}
              {active === 'profile' && profile && (
                <ProfilePage
                  connected={!!persistDraft}
                  profile={profile}
                  onSave={(nextProfile) => {
                    setState?.((current) => ({
                      ...current,
                      profiles: { ...current.profiles, [account.id]: nextProfile },
                    }))
                    setToast('Perubahan profil berhasil disimpan untuk laporan berikutnya.')
                  }}
                />
              )}
              {active === 'transcript' && profile && (
                <TranscriptPage
                  connected={!!persistDraft}
                  profile={profile}
                  transcripts={state.transcripts.filter(
                    (transcript) => transcript.ownerId === account.id,
                  )}
                  onChange={(transcripts) => {
                    setState?.((current) => ({
                      ...current,
                      transcripts: [
                        ...current.transcripts.filter(
                          (transcript) => transcript.ownerId !== account.id,
                        ),
                        ...transcripts,
                      ],
                    }))
                  }}
                  onToast={setToast}
                />
              )}
              {active === 'report' && editingPeriod && (
                <MonthlyReportPage
                  key={editingPeriod.id + ':' + reportOpenCount}
                  persistDraft={persistDraft}
                  clearDraft={clearDraft}
                  isActivePeriod={editingPeriod.ownerId === account.id && editingPeriod.id === currentPeriod?.id}
                  readOnly={!!persistDraft && !['draft','revision'].includes(editingPeriod.reportStatus)}
                  period={editingPeriod}
                  updatePeriod={updatePeriod}
                  profile={profile}
                  onToast={setToast}
                  onBack={() =>
                    navigate(editingPeriod.id === currentPeriod?.id ? 'dashboard' : 'recap-detail')
                  }
                  onSubmitted={() => {
                    setSelectedPeriodId(editingPeriod.id)
                    navigate('recap-detail')
                  }}
                />
              )}
              {active === 'finance' && currentPeriod && (
                <FinancePage
                  connected={!!persistDraft}
                  period={currentPeriod}
                  updatePeriod={updatePeriod}
                  onToast={setToast}
                />
              )}
              {active === 'recap' && (
                <RecapPage periods={scopedPeriods} openDetail={openPeriodDetail} />
              )}
              {active === 'recap-detail' && selectedPeriod && (
                <PeriodDetail
                  openReport={persistDraft ? () => void openReport(selectedPeriod.id) : undefined}
                  period={selectedPeriod}
                  profile={selectedPeriod.profileSnapshot ?? profile}
                  onBack={() => navigate('recap')}
                  onRepair={(sectionKey) => {
                    setReportPeriodId(selectedPeriod.id)
                    window.sessionStorage.setItem('sim-bezakat-target-section', sectionKey)
                    navigate('report')
                  }}
                  onToast={setToast}
                />
              )}
            </>
          )}
          {account.role !== 'awardee' && (
            <>
              {active === 'dashboard' && (
                <StaffDashboard
                  referencePeriod={monitoringPeriod}
                  account={account}
                  periods={scopedPeriods}
                  profiles={state.profiles}
                  openDetail={openPeriodDetail}
                />
              )}
              {(active === 'awardees' || active === 'monitoring') && (
                <AwardeeMatrix
                  referencePeriod={monitoringPeriod}
                  account={account}
                  periods={scopedPeriods}
                  profiles={state.profiles}
                  openDetail={openPeriodDetail}
                />
              )}
              {active === 'staff-detail' && selectedPeriod && (
                <StaffPeriodDetail
                  connected={!!persistDraft}
                  persistReview={reviewPeriod}
                  account={account}
                  period={selectedPeriod}
                  profile={state.profiles[selectedPeriod.ownerId]}
                  updatePeriod={updatePeriod}
                  onBack={() =>
                    navigate(account.role === 'coordinator' ? 'awardees' : 'monitoring')
                  }
                  onToast={setToast}
                />
              )}
              {active === 'account' && <StaffAccountPage account={account} />}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function LoginPage({ onLogin, authenticate }: {
  onLogin: (account: DemoAccount) => void
  authenticate?: (id: string, password: string) => Promise<DemoAccount>
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const [busy, setBusy] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    try {
        const account = authenticate ? await authenticate(username,password)
          : (await portalRequest<{user: DemoAccount}>('login','POST',{idBeasiswa: username,password})).user
        onLogin(account)
      }
      catch (e) { setError(e instanceof Error ? e.message : 'Login gagal.') }
    finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen bg-[#f4f5ef] p-4 sm:p-7">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1240px] overflow-hidden rounded-[28px] border border-emerald-900/10 bg-white shadow-[0_28px_80px_rgba(6,78,59,.12)] sm:min-h-[calc(100vh-3.5rem)] lg:grid-cols-[1.08fr_.92fr]">
        <section className="relative isolate hidden overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 p-12 text-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 pr-28">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/20 text-lg font-extrabold text-white">
              S
            </div>
            <div>
              <p className="text-lg font-extrabold tracking-tight">SIM-BEZAKAT</p>
              <p className="text-[9px] font-bold uppercase tracking-[.2em] text-emerald-200">
                Student Monitoring Portal
              </p>
            </div>
          </div>
          <svg className="absolute" width="0" height="0" aria-hidden="true" focusable="false">
            <defs>
              <filter id="bezakat-logo-dark" x="0" y="0" width="100%" height="100%" primitiveUnits="objectBoundingBox" colorInterpolationFilters="sRGB">
                {/* Remove the white matte and lighten only the wordmark below the emblem. */}
                <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -2 -2 -2 0 6" result="ink" />
                <feFlood x="0" y="0.7" width="1" height="0.3" floodColor="white" />
                <feComposite in2="ink" operator="atop" />
              </filter>
            </defs>
          </svg>
          <Image
            src="/logo-bezakat.png"
            alt="BeZakat"
            width={120}
            height={120}
            className="absolute right-6 top-5 h-[120px] w-[120px] object-contain [filter:url(#bezakat-logo-dark)]"
          />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-12 grid size-80 rotate-[22.5deg] place-items-center text-emerald-100/15">
            <span className="absolute inset-0 border border-current" />
            <span className="absolute inset-0 rotate-45 border border-current" />
            <span className="absolute inset-8 border border-current" />
            <span className="absolute inset-8 rotate-45 border border-current" />
          </div>
          <div className="relative my-auto max-w-lg py-12">
            <p className="flex items-center gap-3 text-sm font-bold text-amber-200">
              <span aria-hidden="true" className="h-px w-8 bg-amber-200/60" />
              Beasiswa Zakat Indonesia
            </p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">
              Bertumbuh dalam ilmu,
              <br />
              <span className="text-white">memberi manfaat.</span>
            </h1>
          </div>
        </section>
        <section className="flex items-center justify-center p-7 sm:p-12">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-800 font-extrabold text-white">
                S
              </div>
              <p className="font-extrabold text-emerald-950">SIM-BEZAKAT</p>
            </div>
            <p className="text-xs font-extrabold uppercase tracking-[.15em] text-emerald-700">
              Selamat datang
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
              Assalamu&apos;alaikum,
              <br />
              Sahabat BeZakat
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              Bismillah, lanjutkan langkah untuk bertumbuh, berprestasi, dan memberi manfaat.
            </p>
            <form onSubmit={submit} className="mt-9 space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-700">ID beasiswa</span>
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value)
                    setError('')
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  placeholder="Contoh: BZI-251-0000001"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-700">Kata sandi</span>
                <span className="relative block">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setError('')
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-14 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    placeholder="Masukkan kata sandi"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-0 px-4 text-slate-400 hover:text-emerald-700"
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    <Icon name="eye" className="h-4 w-4" />
                  </button>
                </span>
              </label>
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                  <Icon name="alert" className="h-4 w-4" />
                  {error}
                </div>
              )}
              <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-900 disabled:opacity-60">
                {busy ? 'Memeriksa akun...' : 'Masuk ke Portal'}
                <Icon name="arrow" className="h-4 w-4" />
              </button>
            </form>
            <div className="mt-8 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <p className="text-[11px] leading-5 text-amber-800">
                Peran ditentukan oleh akun. Untuk mencoba peran lain, keluar lalu masuk menggunakan
                akun pengujian lain.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function Sidebar({
  account,
  active,
  open,
  onClose,
  navigate,
  openReport,
}: {
  account: DemoAccount
  active: string
  open: boolean
  onClose: () => void
  navigate: (target: string) => void
  openReport: () => void
}) {
  const awardeeMenu = [
    { key: 'dashboard', label: 'Dashboard', icon: 'grid' as IconName },
    { key: 'profile', label: 'Profil', icon: 'user' as IconName },
    { key: 'transcript', label: 'Transkrip Semester', icon: 'book' as IconName },
    { key: 'report', label: 'Laporan Bulanan', icon: 'file' as IconName },
    { key: 'finance', label: 'Keuangan', icon: 'wallet' as IconName },
    { key: 'recap', label: 'Rekapitulasi', icon: 'chart' as IconName },
  ]
  const staffMenu =
    account.role === 'coordinator'
      ? [
          { key: 'dashboard', label: 'Dashboard', icon: 'grid' as IconName },
          { key: 'awardees', label: 'Rekap Awardee', icon: 'users' as IconName },
        ]
      : [
          { key: 'dashboard', label: 'Dashboard', icon: 'grid' as IconName },
          { key: 'monitoring', label: 'Monitoring Awardee', icon: 'chart' as IconName },
        ]
  const menu = account.role === 'awardee' ? awardeeMenu : staffMenu

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-emerald-950/10 bg-[#fbfcf9] transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex h-[78px] items-center gap-3 border-b border-slate-200/70 px-6">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-900 to-emerald-700 font-extrabold text-white shadow-lg shadow-emerald-200">
          S
        </div>
        <div>
          <p className="text-[16px] font-extrabold tracking-tight text-emerald-950">SIM-BEZAKAT</p>
          <p className="text-[8px] font-bold uppercase tracking-[.17em] text-emerald-700/60">
            Monitoring Portal
          </p>
        </div>
        <button className="ml-auto text-slate-500 lg:hidden" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-3 px-3 text-[9px] font-extrabold uppercase tracking-[.16em] text-slate-400">
          Menu Utama
        </p>
        {menu.map((item) => {
          const itemActive =
            active === item.key ||
            (item.key === 'recap' && active === 'recap-detail') ||
            ((item.key === 'awardees' || item.key === 'monitoring') && active === 'staff-detail')
          return (
            <button
              key={item.key}
              onClick={() => (item.key === 'report' ? openReport() : navigate(item.key))}
              className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold transition ${
                itemActive
                  ? 'bg-emerald-100/70 font-extrabold text-emerald-900'
                  : 'text-slate-500 hover:bg-white hover:text-emerald-800'
              }`}
            >
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
              {item.label}
              {item.key === 'report' && (
                <span className="ml-auto h-2 w-2 rounded-full bg-amber-400" />
              )}
            </button>
          )
        })}
      </nav>
      <div className="m-3 rounded-2xl border border-emerald-900/10 bg-white p-4">
        <div className="flex items-center gap-3">
          <Avatar name={account.name} />
          <div className="min-w-0">
            <p className="truncate text-xs font-extrabold text-slate-800">{account.name}</p>
            <p className="mt-0.5 truncate text-[9px] font-semibold text-emerald-700">
              {account.roleLabel}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}

function Header({
  account,
  panel,
  setPanel,
  openMenu,
  navigate,
  logout,
  period,
}: {
  account: DemoAccount
  panel: HeaderPanel
  setPanel: (panel: HeaderPanel) => void
  openMenu: () => void
  navigate: (target: string) => void
  logout: () => void
  period: PortalSession['activePeriod']
}) {
  const notificationArea = useRef<HTMLDivElement>(null)
  const bellButton = useRef<HTMLButtonElement>(null)
  const noticePeriod = account.role === 'awardee' ? period : null
  const notificationsOpen = panel === 'notifications'

  useEffect(() => {
    if (!notificationsOpen) return
    const dismissOutside = (event: Event) => {
      if (event.target instanceof Node && !notificationArea.current?.contains(event.target)) setPanel(null)
    }
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPanel(null)
        bellButton.current?.focus()
      }
    }
    document.addEventListener('pointerdown', dismissOutside)
    document.addEventListener('focusin', dismissOutside)
    document.addEventListener('keydown', dismissOnEscape)
    return () => {
      document.removeEventListener('pointerdown', dismissOutside)
      document.removeEventListener('focusin', dismissOutside)
      document.removeEventListener('keydown', dismissOnEscape)
    }
  }, [notificationsOpen, setPanel])

  return (
    <header className="sticky top-0 z-20 flex h-[78px] items-center border-b border-slate-200/80 bg-[#fbfcf9]/90 px-5 backdrop-blur-xl sm:px-7 lg:px-9">
      <button
        aria-label="Buka menu"
        onClick={openMenu}
        className="mr-4 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
      >
        <Icon name="menu" className="h-6 w-6" />
      </button>
      <div>
        <p className="text-[9px] font-extrabold uppercase tracking-[.13em] text-slate-400">
          {account.role === 'awardee' ? 'Periode Aktif' : 'Ruang Monitoring'}
        </p>
        <p className="mt-1 text-sm font-extrabold text-slate-700">
          {account.role === 'awardee'
            ? (period ? periodLabel(period.month, period.year) : 'Belum ada periode terbuka')
            : (account.institution ?? 'Beasiswa Zakat Indonesia')}
        </p>
      </div>
      <div className="relative ml-auto flex items-center gap-3">
        <div ref={notificationArea}>
          <button
            ref={bellButton}
            type="button"
            aria-label="Notifikasi"
            aria-expanded={notificationsOpen}
            aria-controls={notificationsOpen ? 'portal-notifications' : undefined}
            onClick={() => setPanel(notificationsOpen ? null : 'notifications')}
            className="relative grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:text-emerald-700"
          >
            <Icon name="bell" className="h-[18px] w-[18px]" />
            {noticePeriod && <span aria-hidden="true" className="absolute right-2.5 top-2 h-2 w-2 rounded-full border-2 border-white bg-amber-500" />}
          </button>
          {notificationsOpen && (
            <section
              id="portal-notifications"
              aria-labelledby="notifications-title"
              className="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw_-_2.5rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
            >
              <h2 id="notifications-title" className="text-sm font-extrabold text-slate-800">Notifikasi</h2>
              {noticePeriod ? (
                <div className="mt-3 flex items-start gap-3 rounded-xl bg-emerald-50 p-3">
                  <Icon name="calendar" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                  <div>
                    <h3 className="text-xs font-extrabold text-emerald-900">Pergantian periode tanggal 10</h3>
                    <p className="mt-1 text-[11px] leading-5 text-emerald-800">
                      Batas pengajuan laporan {monthNames[noticePeriod.month - 1]} adalah 9 {periodLabel(noticePeriod.month % 12 + 1, noticePeriod.year + Number(noticePeriod.month === 12))} pukul 23.59 WIB.
                      Periode baru dibuka tanggal 10 pukul 00.00 WIB. Draf, lampiran, keputusan, dan riwayat periode lama tetap tersimpan.
                    </p>
                  </div>
                </div>
              ) : <p className="mt-3 text-xs text-slate-500">Belum ada notifikasi.</p>}
            </section>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setPanel(panel === 'account' ? null : 'account')}
            className="flex items-center gap-2.5 rounded-xl p-1.5 pr-2 hover:bg-white"
          >
            <Avatar name={account.name} size="small" />
            <div className="hidden text-left sm:block">
              <p className="max-w-36 truncate text-[11px] font-extrabold text-slate-800">
                {account.name}
              </p>
              <p className="text-[9px] text-slate-400">{account.roleLabel}</p>
            </div>
            <span className="hidden rotate-90 text-slate-400 sm:block">
              <Icon name="chevron" className="h-3.5 w-3.5" />
            </span>
          </button>
          {panel === 'account' && (
            <div className="absolute right-0 top-13 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              <div className="border-b border-slate-100 px-3 py-3">
                <p className="text-xs font-extrabold">{account.name}</p>
                <p className="mt-1 text-[10px] text-emerald-700">{account.roleLabel}</p>
              </div>
              <button
                onClick={() => navigate(account.role === 'awardee' ? 'profile' : 'account')}
                className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Icon name="user" className="h-4 w-4" />
                Profil Saya
              </button>
              <button
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                <Icon name="logout" className="h-4 w-4" />
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function AwardeeDashboard({
  connected = false,
  account,
  profile,
  currentPeriod,
  periods,
  updatePeriod,
  openReport,
  navigate,
}: {
  connected?: boolean
  account: DemoAccount
  profile: DemoProfile
  currentPeriod: PeriodRecord
  periods: PeriodRecord[]
  updatePeriod: (period: PeriodRecord) => void
  openReport: () => void
  navigate: (target: string) => void
}) {
  const firstName = account.name.split(' ')[0]
  const reportProgress = reportCompletion(currentPeriod)
  const finance = financeStatus(currentPeriod)
  const revisionCount = connected ? periods.filter(p => p.reportStatus === 'revision').length : periods.reduce(
    (sum, period) =>
      sum +
      Object.values(period.sectionReviews).reduce(
        (sectionSum, section) => sectionSum + section.issues.length,
        0,
      ) +
      period.financeDocuments.filter((document) => document.status === 'revision').length,
    0,
  )

  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-extrabold text-emerald-700">
            Assalamu&apos;alaikum, {firstName}
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[30px]">
            Ringkasan Periode Aktif
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Pantau laporan, dokumen keuangan, dan tindak lanjut pemeriksaanmu.
          </p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
          <Icon name="clock" className="h-4 w-4" />
          Tenggat 9 {periodLabel(currentPeriod.month % 12 + 1, currentPeriod.year + Number(currentPeriod.month === 12))} · 23.59 WIB
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStat
          icon="file"
          label="Progres laporan"
          value={`${reportProgress}%`}
          note={statusLabel(currentPeriod.reportStatus)}
          tone="emerald"
        />
        <DashboardStat
          icon="wallet"
          label="Status keuangan"
          value={finance === 'draft' ? 'Belum ada' : statusLabel(finance)}
          note={`${currentPeriod.financeDocuments.length}/2 dokumen`}
          tone="amber"
          compact
        />
        <DashboardStat
          icon="alert"
          label="Perlu perbaikan"
          value={String(revisionCount)}
          note={connected ? "Laporan" : "Isian atau dokumen"}
          tone="rose"
        />
        <DashboardStat
          icon="calendar"
          label="Periode aktif"
          value={monthNames[currentPeriod.month - 1]}
          note={`Tahun ${currentPeriod.year}`}
          tone="slate"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold">Langkah Periode Ini</h2>
              <p className="mt-1 text-xs text-slate-400">
                Laporan dan keuangan memakai periode yang sama.
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-extrabold text-emerald-700">
              {periodLabel(currentPeriod.month, currentPeriod.year)}
            </span>
          </div>
          <div className="space-y-3">
            <ActionRow
              icon="file"
              title="Lengkapi Laporan Bulanan"
              description={`${reportProgress}% terisi · ${statusLabel(currentPeriod.reportStatus)}`}
              status={currentPeriod.reportStatus}
              action="Lanjutkan"
              onClick={openReport}
            />
            <ActionRow
              icon="wallet"
              title="Unggah Dokumen Keuangan"
              description={`${currentPeriod.financeDocuments.length} dari 2 kategori terunggah`}
              status={finance}
              action="Buka Keuangan"
              onClick={() => navigate('finance')}
            />
            {revisionCount > 0 && (
              <ActionRow
                icon="alert"
                title="Tindak Lanjut Perbaikan"
                description={`${revisionCount} catatan pemeriksaan pada periode sebelumnya`}
                status="revision"
                action="Lihat Rekap"
                onClick={() => navigate('recap')}
              />
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 p-6 text-white shadow-xl shadow-emerald-200/60">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-100">Progres laporan bulan ini</p>
                <p className="mt-2 text-4xl font-extrabold">{reportProgress}%</p>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10">
                <Icon name="chart" />
              </span>
            </div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-amber-300 transition-all"
                style={{ width: `${reportProgress}%` }}
              />
            </div>
            <p className="mt-3 text-[11px] leading-5 text-emerald-100/80">
              Simpan draft kapan saja. Data tidak hilang saat periode baru dibuka.
            </p>
          </section>

          <AllowanceConfirmationCard
            key={currentPeriod.ownerId + ':' + currentPeriod.id}
            period={currentPeriod}
            onConfirm={connected ? undefined : () => updatePeriod({ ...currentPeriod, allowanceReceived: true })}
          />
        </div>
      </div>
    </>
  )
}

function AllowanceConfirmationCard({
  period,
  onConfirm,
}: {
  period?: PeriodRecord
  onConfirm?: () => void
}) {
  const receiptDialog = useRef<HTMLDialogElement>(null)
  const [selected, setSelected] = useState(false)
  // In the connected portal this receipt is a browser-only prototype.
  const storageKey = period && !onConfirm
    ? `sim-bezakat:allowance-receipt:v1:${period.ownerId}:${period.id}`
    : undefined
  const [localReceipt, setLocalReceipt] = useState(() => {
    if (!storageKey || typeof window === 'undefined') return false
    try { return window.localStorage.getItem(storageKey) === '1' }
    catch { return false }
  })
  useEffect(() => {
    if (!storageKey) return
    const syncReceipt = (event: StorageEvent) => {
      if (event.key === storageKey) setLocalReceipt(event.newValue === '1')
    }
    window.addEventListener('storage', syncReceipt)
    return () => window.removeEventListener('storage', syncReceipt)
  }, [storageKey])

  const available = Boolean(period)
  const confirmed = Boolean(period?.allowanceReceived) || localReceipt
  const locked = !available || confirmed

  function confirmReceipt() {
    if (locked || !selected || !receiptDialog.current?.open) return
    receiptDialog.current.close()
    if (storageKey && period && Date.now() >= reportPeriodCutoff(period)) return
    if (onConfirm) {
      onConfirm()
    } else if (storageKey) {
      setLocalReceipt(true)
      try { window.localStorage.setItem(storageKey, '1') }
      catch { /* The receipt remains visible while the card is open. */ }
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
          <Icon name="wallet" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold">Konfirmasi uang bulanan</h3>
          <div role="status">
            {confirmed && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-800">
                <span aria-hidden="true" className="mt-0.5 shrink-0"><Icon name="check" className="h-4 w-4" /></span>
                Terima kasih sudah mengonfirmasi penerimaan uang bulanan.
              </p>
            )}
          </div>
          {!confirmed && (
            <>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                Apakah uang bulanan periode sebelumnya sudah diterima?
              </p>
              <label className={`mt-4 flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-700 ${locked ? 'cursor-default' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  disabled={locked}
                  checked={available && selected}
                  onChange={(event) => setSelected(event.target.checked)}
                  className="h-4 w-4 accent-emerald-700"
                />
                <span aria-live="polite">
                  {available ? 'Sudah diterima' : 'Konfirmasi belum tersedia'}
                </span>
              </label>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  disabled={locked || !selected}
                  aria-haspopup="dialog"
                  onClick={() => receiptDialog.current?.showModal()}
                  className="rounded-xl bg-emerald-800 px-5 py-3 text-xs font-extrabold text-white shadow-lg shadow-emerald-200 enabled:hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  Konfirmasi
                </button>
              </div>
              {period && (
                <dialog
                  ref={receiptDialog}
                  aria-labelledby="receipt-dialog-title"
                  aria-describedby="receipt-dialog-description"
                  className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-900/40"
                >
                  <h2 id="receipt-dialog-title" className="text-base font-extrabold">Konfirmasi penerimaan uang bulanan?</h2>
                  <p id="receipt-dialog-description" className="mt-2 text-sm leading-6 text-slate-600">
                    Pastikan uang bulanan untuk {periodLabel(period.month === 1 ? 12 : period.month - 1, period.month === 1 ? period.year - 1 : period.year)} sudah kamu terima sebelum melanjutkan.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-end gap-2">
                    <button type="button" autoFocus onClick={() => receiptDialog.current?.close()}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-extrabold text-slate-600 hover:bg-slate-50">
                      Batal
                    </button>
                    <button type="button" onClick={confirmReceipt}
                      className="rounded-xl bg-emerald-800 px-4 py-3 text-xs font-extrabold text-white hover:bg-emerald-900">
                      Ya, sudah diterima
                    </button>
                  </div>
                </dialog>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function DashboardStat({
  icon,
  label,
  value,
  note,
  tone,
  compact = false,
}: {
  icon: IconName
  label: string
  value: string
  note: string
  tone: 'emerald' | 'amber' | 'rose' | 'slate'
  compact?: boolean
}) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    slate: 'bg-slate-100 text-slate-600',
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-slate-500">{label}</p>
          <p
            className={`mt-3 font-extrabold tracking-tight text-slate-900 ${compact ? 'text-lg' : 'text-2xl'}`}
          >
            {value}
          </p>
          <p className="mt-1 text-[10px] text-slate-400">{note}</p>
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>
      </div>
    </div>
  )
}

function ActionRow({
  icon,
  title,
  description,
  status,
  action,
  onClick,
}: {
  icon: IconName
  title: string
  description: string
  status: ReviewStatus
  action: string
  onClick: () => void
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-100 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/20 sm:flex-row sm:items-center">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-500">
        <Icon name={icon} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-extrabold text-slate-700">{title}</p>
          <StatusPill status={status} />
        </div>
        <p className="mt-1 text-[10px] text-slate-400">{description}</p>
      </div>
      <button
        onClick={onClick}
        className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-[10px] font-extrabold text-emerald-800 hover:bg-emerald-800 hover:text-white"
      >
        {action}
        <Icon name="arrow" className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function ProfilePage({
  connected = false,
  profile,
  onSave,
}: {
  connected?: boolean
  profile: DemoProfile
  onSave: (profile: DemoProfile) => void
}) {
  const [form, setForm] = useState(profile)
  const update = (key: keyof DemoProfile, value: string) => setForm({ ...form, [key]: value })
  const updateGpa = (index: number, value: string) => {
    const numeric = Math.min(4, Math.max(0, Number(value) || 0))
    const history = [...form.gpaHistory]
    history[index] = numeric
    const latestIndex = history.reduce(
      (latest, item, itemIndex) => (item > 0 ? itemIndex : latest),
      -1,
    )
    setForm({
      ...form,
      gpaHistory: history,
      gpaValue: latestIndex >= 0 ? history[latestIndex].toFixed(2).replace('.', ',') : '',
      gpaSemester: latestIndex >= 0 ? `Semester ${latestIndex + 1}` : '',
    })
  }
  const uploadPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () =>
      setForm({
        ...form,
        photoName: file.name,
        photoUrl: typeof reader.result === 'string' ? reader.result : form.photoUrl,
      })
    reader.readAsDataURL(file)
  }
  const identityFields: { key: keyof DemoProfile; label: string; type?: string }[] = [
    { key: 'fullName', label: 'Nama lengkap' },
    { key: 'birthPlace', label: 'Tempat lahir' },
    { key: 'birthDate', label: 'Tanggal lahir', type: 'date' },
    { key: 'gender', label: 'Jenis kelamin' },
    { key: 'identityAddress', label: 'Alamat sesuai KTP', type: 'textarea' },
    { key: 'domicileType', label: 'Jenis domisili' },
    { key: 'domicileAddress', label: 'Alamat domisili', type: 'textarea' },
    { key: 'guardianName', label: 'Nama orang tua/wali' },
    { key: 'guardianContact', label: 'Kontak orang tua/wali' },
    { key: 'socialMedia', label: 'Username media sosial' },
  ]
  const academicFields: { key: keyof DemoProfile; label: string }[] = [
    { key: 'university', label: 'Perguruan tinggi' },
    { key: 'studyProgram', label: 'Program studi' },
    { key: 'studentNumber', label: 'NIM' },
    { key: 'sponsor', label: 'Dewan penyantun' },
    { key: 'registrationNumber', label: 'Nomor registrasi BEZAKAT' },
  ]

  return (
    <fieldset disabled={connected} className="min-w-0">
      <PageHeading
        eyebrow="Data Awardee"
        title="Profil"
        description={connected ? "Data identitas dan kemahasiswaan yang tercatat." : "Perbarui data identitas dan kemahasiswaan tanpa perlu mengetiknya kembali setiap bulan."}
      />
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-[11px] leading-5 text-emerald-900">
        <Icon name="shield" className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-extrabold">{connected ? 'Profil dari database · hanya baca' : 'Perubahan profil berlaku untuk laporan berikutnya.'}</p>
          <p>Data pada laporan yang sudah dikirim tetap tersimpan.</p>
        </div>
      </div>
      <div className="mb-6 grid gap-6 xl:grid-cols-[.72fr_1.7fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-3xl border-4 border-white bg-gradient-to-br from-emerald-100 to-amber-50 shadow-lg">
            {form.photoUrl ? (
              <Image
                src={form.photoUrl}
                alt={`Foto profil ${form.fullName}`}
                fill
                sizes="112px"
                className="object-cover"
              />
            ) : (
              <span className="grid h-full w-full place-items-center text-2xl font-extrabold text-emerald-800">
                {initials(form.fullName)}
              </span>
            )}
          </div>
          <h2 className="mt-5 text-lg font-extrabold">{form.fullName}</h2>
          <p className="mt-1 text-xs font-bold text-emerald-800">{form.studyProgram}</p>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">{form.university}</p>
          <p className="mt-3 text-[10px] font-semibold text-slate-400">{form.registrationNumber}</p>
          <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-[10px] font-extrabold text-slate-600 hover:border-emerald-300 hover:text-emerald-700">
            <Icon name="upload" className="h-4 w-4" />
            Ubah Foto
            <input type="file" accept="image/*" className="sr-only" onChange={uploadPhoto} />
          </label>
          <p className="mt-2 truncate text-[9px] text-slate-400">
            {form.photoName || (connected ? 'Belum ada foto' : 'Foto profil demo')}
          </p>
        </aside>
        <GpaChart scholarshipStatus={connected ? form.scholarshipStatus : undefined} history={form.gpaHistory} />
      </div>
      <div className="space-y-6">
        <FormCard title="Identitas Diri" icon="user" editable>
          <div className="grid gap-5 sm:grid-cols-2">
            {identityFields.map((field) => (
              <ProfileField
                key={field.key}
                label={field.label}
                value={String(form[field.key] ?? '')}
                type={field.type}
                onChange={(value) => update(field.key, value)}
              />
            ))}
          </div>
        </FormCard>
        <FormCard title="Data Kemahasiswaan" icon="book" editable>
          <div className="grid gap-5 sm:grid-cols-2">
            {academicFields.map((field) => (
              <ProfileField
                key={field.key}
                label={field.label}
                value={String(form[field.key] ?? '')}
                onChange={(value) => update(field.key, value)}
              />
            ))}
            <ProfileField
              label="Indeks prestasi terakhir"
              value={form.gpaValue}
              onChange={(value) => update('gpaValue', value)}
            />
            <label>
              <span className="mb-2 block text-[11px] font-bold text-slate-700">Jenis indeks</span>
              <select
                value={form.gpaType}
                onChange={(event) => update('gpaType', event.target.value)}
                className="form-input"
              >
                <option>IPS</option>
                <option>IPK</option>
              </select>
            </label>
            <ProfileField
              label="Semester acuan"
              value={form.gpaSemester}
              onChange={(value) => update('gpaSemester', value)}
            />
            <div className="sm:col-span-2">
              <p className="mb-3 text-[11px] font-bold text-slate-700">Riwayat IPK Semester 1–8</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {form.gpaHistory.map((value, index) => (
                  <label key={index}>
                    <span className="mb-1.5 block text-[9px] font-bold text-slate-400">
                      Semester {index + 1}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="4"
                      step="0.01"
                      value={value || ''}
                      onChange={(event) => updateGpa(index, event.target.value)}
                      className="form-input"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </FormCard>
        <div className="flex justify-end">
          <button
            onClick={() => onSave(form)}
            className="flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-xs font-extrabold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-900"
          >
            <Icon name="save" className="h-4 w-4" />
            Simpan Perubahan
          </button>
        </div>
      </div>
    </fieldset>
  )
}

function GpaChart({ history, scholarshipStatus }: { history: number[]; scholarshipStatus?: string }) {
  const width = 720
  const height = 250
  const left = 52
  const right = 28
  const top = 28
  const bottom = 48
  const chartWidth = width - left - right
  const chartHeight = height - top - bottom
  const yMin = Math.min(2.5, ...history.filter(Number.isFinite))
  const yMax = 4
  const points = history
    .map((value, index) => ({
      value,
      index,
      x: left + (index * chartWidth) / Math.max(7, history.length - 1),
      y: top + ((yMax - value) / (yMax - yMin)) * chartHeight,
    }))
    .filter(point => point && (scholarshipStatus ? Number.isFinite(point.value) : point.value > 0))
  const latestGpa = [...history].reverse().find(value => scholarshipStatus ? Number.isFinite(value) : value > 0)
  const belowMinimumCount = history.filter((value) => value > 0 && value < 3).length

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-extrabold text-slate-800">Perkembangan IPK</h2>
          <p className="mt-1 text-[10px] text-slate-400">Semester 1 sampai Semester 8</p>
        </div>
        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-right">
          <p className="text-[8px] font-bold uppercase tracking-wide text-emerald-600">
            IPK Terakhir
          </p>
          <p className="mt-0.5 text-lg font-extrabold text-emerald-900">
            {latestGpa?.toFixed(2) ?? '—'}
          </p>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[600px] w-full"
          role="img"
          aria-label="Grafik perkembangan IPK dari semester 1 sampai semester 8"
        >
          {[2.5, 3, 3.5, 4].map((value) => {
            const y = top + ((yMax - value) / (yMax - yMin)) * chartHeight
            return (
              <g key={value}>
                <line
                  x1={left}
                  y1={y}
                  x2={width - right}
                  y2={y}
                  stroke={value === 3 ? '#e11d48' : '#e2e8f0'}
                  strokeWidth={value === 3 ? 2 : 1}
                  strokeDasharray={value === 3 ? '8 5' : '4 5'}
                />
                <text x={left - 12} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                  {value.toFixed(1)}
                </text>
                {value === 3 && (
                  <text
                    x={width - right}
                    y={y - 8}
                    textAnchor="end"
                    fontSize="9"
                    fontWeight="700"
                    fill="#be123c"
                  >
                    Batas minimum
                  </text>
                )}
              </g>
            )
          })}
          <polyline
            points={points.map(({ x, y }) => `${x},${y}`).join(' ')}
            fill="none"
            stroke="#047857"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map(({ x, y, index, value }) => (
            <g key={index}>
              <circle cx={x} cy={y} r="7" fill="white" stroke="#047857" strokeWidth="4" />
              <text
                x={x}
                y={y - 14}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="#065f46"
              >
                {value.toFixed(2)}
              </text>
              <text
                x={x}
                y={height - 18}
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill="#64748b"
              >
                S{index + 1}
              </text>
            </g>
          ))}
        </svg>
      </div>
      {scholarshipStatus ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs font-semibold">Status beasiswa: {scholarshipStatus}. Evaluasi memakai IPS terverifikasi per semester.</p> : <GpaRiskNotice latestGpa={latestGpa} belowMinimumCount={belowMinimumCount} />}
    </section>
  )
}

function GpaRiskNotice({
  latestGpa,
  belowMinimumCount,
}: {
  latestGpa?: number
  belowMinimumCount: number
}) {
  if (!latestGpa) {
    return (
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-[10px] leading-5 text-slate-500">
        Belum ada nilai IPK untuk dievaluasi. Batas minimum evaluasi beasiswa adalah 3,00.
      </div>
    )
  }

  if (belowMinimumCount >= 2) {
    return (
      <div className="mt-4 flex gap-3 rounded-xl border-2 border-rose-500 bg-rose-100 p-4 text-rose-950">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-700 text-white">
          <Icon name="alert" className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-wide">Status Kritis</p>
          <p className="mt-1 text-[10px] font-semibold leading-5">
            Tercatat {belowMinimumCount} semester dengan IPK di bawah 3,00. Kondisi ini berisiko
            menyebabkan penghentian beasiswa. Segera hubungi koordinator untuk tindak lanjut
            akademik.
          </p>
        </div>
      </div>
    )
  }

  if (latestGpa <= 3) {
    return (
      <div className="mt-4 flex gap-3 rounded-xl border-2 border-rose-400 bg-rose-50 p-4 text-rose-900">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-600 text-white">
          <Icon name="alert" className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-wide">Peringatan Serius</p>
          <p className="mt-1 text-[10px] font-semibold leading-5">
            IPK berada di batas minimum 3,00 atau lebih rendah. Dua semester dengan IPK di bawah
            3,00 dapat menyebabkan penghentian beasiswa. Segera susun rencana perbaikan bersama
            koordinator.
          </p>
        </div>
      </div>
    )
  }

  if (latestGpa <= 3.25) {
    return (
      <div className="mt-4 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500 text-white">
          <Icon name="alert" className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-extrabold">Perhatian Akademik</p>
          <p className="mt-1 text-[10px] font-semibold leading-5">
            IPK mulai mendekati batas minimum 3,00. Pertahankan pendampingan belajar dan
            konsultasikan kendala akademik lebih awal.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[10px] font-semibold text-emerald-800">
      <Icon name="check" className="h-4 w-4" />
      IPK berada di atas batas minimum evaluasi 3,00.
    </div>
  )
}

function ProfileField({
  label,
  value,
  type = 'text',
  onChange,
}: {
  label: string
  value: string
  type?: string
  onChange: (value: string) => void
}) {
  return (
    <label className={type === 'textarea' ? 'sm:col-span-2' : ''}>
      <span className="mb-2 block text-[11px] font-bold text-slate-700">{label}</span>
      {type === 'textarea' ? (
        <textarea
          rows={3}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="form-input resize-y"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="form-input"
        />
      )}
    </label>
  )
}

function TranscriptPage({
  connected = false,
  profile,
  transcripts,
  onChange,
  onToast,
}: {
  connected?: boolean
  profile: DemoProfile
  transcripts: SemesterTranscript[]
  onChange: (transcripts: SemesterTranscript[]) => void
  onToast: (message: string) => void
}) {
  const currentSemester = Number(profile.gpaSemester.match(/\d+/)?.[0] ?? 1) || 1

  const selectFile = (semester: number, file?: File) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      onToast('Transkrip harus menggunakan format PDF.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      onToast('Ukuran transkrip maksimal 10 MB.')
      return
    }
    const existing = transcripts.find((item) => item.semester === semester)
    const next: SemesterTranscript = {
      id: existing?.id ?? `${profile.ownerId}-transcript-${semester}`,
      ownerId: profile.ownerId,
      semester,
      academicYear: `${2024 + Math.ceil(semester / 2)}/${2025 + Math.ceil(semester / 2)}`,
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      status: existing?.status === 'revision' ? 'revision' : 'draft',
      reason: existing?.status === 'revision' ? existing.reason : undefined,
    }
    onChange([...transcripts.filter((item) => item.semester !== semester), next])
    onToast('Transkrip dipilih dan disimpan sebagai draft lokal.')
  }

  const send = (transcript: SemesterTranscript) => {
    onChange(
      transcripts.map((item) =>
        item.id === transcript.id
          ? {
              ...item,
              status: item.status === 'revision' ? 'review' : 'submitted',
              reason: undefined,
            }
          : item,
      ),
    )
    onToast('Transkrip semester dikirim untuk diperiksa.')
  }

  return (
    <fieldset disabled={connected} className="min-w-0">
      <PageHeading
        eyebrow="Dokumen Akademik"
        title="Transkrip Semester"
        description="Unggah transkrip nilai setiap kali semester baru selesai. Dokumen lama tetap tersimpan sebagai riwayat."
        action={
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600">
            {connected ? 'Semester tercatat: ' : 'Semester aktif: '}{connected ? (transcripts.length ? currentSemester : '—') : currentSemester}
          </div>
        }
      />
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <Icon name="book" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
        <p className="text-[11px] leading-5 text-emerald-900">
          {connected ? 'KHS dan nilai terverifikasi ditampilkan per semester. Halaman ini hanya dapat dibaca.'
            : 'Unggah satu transkrip PDF untuk setiap semester. Semester berikutnya akan terbuka setelah semester acuan pada Profil diperbarui.'}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: Math.max(8, currentSemester) }, (_, index) => index + 1).map((semester) => {
          const transcript = transcripts.find((item) => item.semester === semester)
          const future = !connected && semester > currentSemester
          const locked = transcript?.status === 'approved'
          return (
            <section
              key={semester}
              className={`rounded-2xl border bg-white p-5 shadow-sm ${
                transcript?.status === 'revision' ? 'border-rose-300' : 'border-slate-200'
              } ${future ? 'opacity-65' : ''}`}
            >
              <div className="flex items-start justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-xs font-extrabold text-emerald-800">
                  S{semester}
                </span>
                {future ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[8px] font-extrabold text-slate-500">
                    Belum dibuka
                  </span>
                ) : (
                  <StatusPill status={transcript?.status ?? 'draft'} />
                )}
              </div>
              <h2 className="mt-4 text-sm font-extrabold text-slate-800">Semester {semester}</h2>
              <p className="mt-1 text-[9px] text-slate-400">
                {connected ? (transcript ? "KHS semester " + semester : "KHS belum tersedia") : `Tahun akademik ${2024 + Math.ceil(semester / 2)}/${2025 + Math.ceil(semester / 2)}`}
              </p>
              {transcript ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start gap-2">
                    <Icon name="file" className="h-4 w-4 shrink-0 text-emerald-700" />
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-extrabold text-slate-700">
                        {transcript.name}
                      </p>
                      {connected && transcript.verifiedIps != null && <p className="mt-1 text-[10px] font-semibold text-emerald-800">
                        IPS {transcript.verifiedIps.toFixed(2)} · IPK {transcript.verifiedGpa?.toFixed(2)}
                      </p>}
                      <p className="mt-1 text-[8px] text-slate-400">
                        {formatFileSize(transcript.size)} · {formatDateTime(transcript.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  {transcript.reason && (
                    <p className="mt-2 rounded-lg bg-rose-100 p-2 text-[8px] font-bold text-rose-700">
                      {transcript.reason}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-center text-[9px] text-slate-400">
                  Belum ada transkrip
                </p>
              )}
              {!future && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {transcript && (
                    <button
                      onClick={() => onToast('Prototype lokal hanya menyimpan metadata transkrip.')}
                      className="icon-action"
                    >
                      <Icon name="eye" className="h-3.5 w-3.5" />
                      Lihat
                    </button>
                  )}
                  {!locked && (
                    <label className="icon-action cursor-pointer">
                      <Icon name="upload" className="h-3.5 w-3.5" />
                      {transcript ? 'Ganti' : 'Unggah PDF'}
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        className="sr-only"
                        onChange={(event) => selectFile(semester, event.target.files?.[0])}
                      />
                    </label>
                  )}
                  {transcript &&
                    !locked &&
                    (transcript.status === 'draft' || transcript.status === 'revision') && (
                      <button
                        onClick={() => send(transcript)}
                        className="w-full rounded-lg bg-emerald-800 px-3 py-2 text-[9px] font-extrabold text-white"
                      >
                        Kirim untuk diperiksa
                      </button>
                    )}
                </div>
              )}
            </section>
          )
        })}
      </div>
      <p className="mt-6 text-center text-[10px] text-slate-400">
        {connected ? 'Metadata KHS dari database. Unggahan belum tersedia.' : 'Pada prototype ini, hanya metadata berkas yang disimpan di browser.'}
      </p>
    </fieldset>
  )
}

function hasDraftEntries(period: PeriodRecord) {
  return period.activities.length > 0 || Object.values(period.answers).some(value =>
    Array.isArray(value) ? value.length > 0 : Boolean(value?.trim()),
  )
}

function MonthlyReportPage({
  period,
  updatePeriod,
  profile,
  onToast,
  onBack,
  onSubmitted,
  persistDraft,
  clearDraft,
  isActivePeriod,
  readOnly = false,
}: {
  period: PeriodRecord
  updatePeriod: (period: PeriodRecord) => void
  profile?: DemoProfile
  onToast: (message: string) => void
  onBack: () => void
  onSubmitted: () => void
  persistDraft?: (draft: PeriodRecord) => Promise<void>
  clearDraft: PortalViewsProps['clearDraft']
  isActivePeriod: boolean
  readOnly?: boolean
}) {
  const targetSection =
    typeof window !== 'undefined'
      ? window.sessionStorage.getItem('sim-bezakat-target-section')
      : null
  const initialIndex = Math.max(
    0,
    reportSections.findIndex((section) => section.key === targetSection),
  )
  const [sectionIndex, setSectionIndex] = useState(initialIndex)
  const [draft, setDraft] = useState(period)
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)
  const deleteDialog = useRef<HTMLDialogElement>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const eligible = isActivePeriod && !readOnly && period.reportStatus === 'draft' && !period.submittedAt
  const canDelete = eligible && !saving && !deleting && (confirmed || hasDraftEntries(draft) || hasDraftEntries(period))
  const section = reportSections[sectionIndex]
  const review = draft.sectionReviews[section.key]
  const locked = readOnly || saving || (review?.status === 'approved' && period.reportStatus !== 'draft')
  const issues = review?.issues ?? []
  const progress = reportCompletion(draft)

  useEffect(() => {
    window.sessionStorage.removeItem('sim-bezakat-target-section')
  }, [])

  const save = async (message: string) => {
    if (saving || readOnly) return false
    setSaving(true)
    try {
      if (persistDraft) await persistDraft(draft)
      else updatePeriod({ ...draft })
      onToast(persistDraft ? 'Draf berhasil disimpan ke PostgreSQL.' : message)
      return true
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Gagal menyimpan. Isian masih ada di formulir; silakan coba lagi.')
      return false
    } finally { setSaving(false) }
  }

  const confirmDelete = async () => {
    if (!canDelete) return
    setDeleting(true)
    setDeleteError('')
    try {
      await clearDraft(period)
      setDraft({...period, answers: {}, activities: []})
      setConfirmed(false)
      deleteDialog.current?.close()
      onToast('Draft berhasil dihapus')
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Draft gagal dihapus. Silakan coba lagi.')
    } finally {
      setDeleting(false)
    }
  }

  const next = async () => {
    if (!(await save('Draft berhasil disimpan.'))) return
    setSectionIndex((current) => Math.min(reportSections.length - 1, current + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = () => {
    if (persistDraft || !profile) return
    const incomplete = reportSections.filter((item) => answeredInSection(draft, item) === 0)
    if (incomplete.length) {
      onToast(`Masih ada ${incomplete.length} subbab yang belum diisi.`)
      return
    }
    if (!confirmed) {
      onToast('Konfirmasikan kebenaran data sebelum mengirim laporan.')
      return
    }
    const nextStatus = period.reportStatus === 'revision' ? 'review' : 'submitted'
    const nextReviews = { ...draft.sectionReviews }
    for (const [key, value] of Object.entries(nextReviews)) {
      if (value.status === 'revision') nextReviews[key] = { ...value, status: 'review' }
    }
    const submitted: PeriodRecord = {
      ...draft,
      reportStatus: nextStatus,
      sectionReviews: nextReviews,
      submittedAt: new Date().toISOString(),
      profileSnapshot: { ...profile },
      reviewHistory: [
        ...draft.reviewHistory,
        {
          date: new Date().toISOString(),
          actor: profile.fullName,
          text:
            period.reportStatus === 'revision'
              ? 'Perbaikan laporan dikirim untuk pemeriksaan ulang.'
              : 'Laporan bulanan dikirim untuk diperiksa.',
        },
      ],
    }
    updatePeriod(submitted)
    onToast('Laporan berhasil dikirim dan menunggu pemeriksaan.')
    onSubmitted()
  }

  return (
    <>
      <button
        disabled={saving}
        onClick={onBack}
        className="mb-5 flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-emerald-700"
      >
        <span className="rotate-180">
          <Icon name="arrow" className="h-4 w-4" />
        </span>
        Kembali
      </button>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-extrabold text-emerald-700">
            Laporan Bulanan · {periodLabel(period.month, period.year)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
              {section.label}
            </h1>
            {issues.length > 0 && (
              <span className="rounded-full bg-rose-100 px-3 py-1.5 text-[9px] font-extrabold text-rose-700">
                Perlu perbaikan · {issues.length} isian
              </span>
            )}
          </div>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">{section.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill status={review?.status ?? period.reportStatus} />
          <span className="text-xs font-extrabold text-emerald-800">{progress}%</span>
        </div>
      </div>

      <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex min-w-max gap-1">
          {reportSections.map((item, index) => {
            const itemReview = draft.sectionReviews[item.key]
            const issueCount = itemReview?.issues.length ?? 0
            return (
              <button
                key={item.key}
                onClick={() => setSectionIndex(index)}
                className={`relative flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[10px] font-extrabold transition ${
                  sectionIndex === index
                    ? 'bg-emerald-800 text-white'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full text-[9px] ${
                    sectionIndex === index ? 'bg-white/15' : 'bg-slate-100'
                  }`}
                >
                  {index + 1}
                </span>
                {item.shortLabel}
                {issueCount > 0 && (
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-rose-500 text-[8px] text-white">
                    {issueCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {issues.length > 0 && (
            <div className="mb-6 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-700">
                <Icon name="alert" className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="text-xs font-extrabold text-rose-800">
                  Perlu perbaikan · {issues.length} isian
                </p>
                <p className="mt-1 text-[10px] text-rose-600">
                  Isian lain tetap normal dan tidak perlu diubah.
                </p>
              </div>
              <button
                onClick={() =>
                  document
                    .getElementById(`question-${issues[0].questionId}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
                className="rounded-lg bg-rose-700 px-3 py-2 text-[10px] font-extrabold text-white"
              >
                Menuju isian
              </button>
            </div>
          )}

          {locked && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
              <Icon name="lock" className="h-4 w-4" />
              {saving ? 'Sedang menyimpan...' : 'Laporan ini hanya dapat dibaca.'}
            </div>
          )}

          {section.key === 'ringkasan' ? (
            <SummaryStep
              period={draft}
              section={section}
              confirmed={confirmed}
              setConfirmed={setConfirmed}
              setAnswer={(id, value) =>
                setDraft({ ...draft, answers: { ...draft.answers, [id]: value } })
              }
              locked={locked}
            />
          ) : (
            <div className="space-y-7">
              {section.questions.map((question, index) => {
                const issue = issues.find((item) => item.questionId === question.id)
                return (
                  <QuestionInput
                    key={question.id}
                    question={question}
                    number={index + 1}
                    value={draft.answers[question.id]}
                    disabled={locked}
                    issue={issue?.reason}
                    onChange={(value) =>
                      setDraft({
                        ...draft,
                        answers: { ...draft.answers, [question.id]: value },
                      })
                    }
                    otherValue={String(draft.answers[`${question.id}__other`] ?? '')}
                    onOtherChange={(value) =>
                      setDraft({
                        ...draft,
                        answers: {
                          ...draft.answers,
                          [`${question.id}__other`]: value,
                        },
                      })
                    }
                  />
                )
              })}
              {section.key === 'organisasi' && (
                <ActivityEditor
                  activities={draft.activities}
                  disabled={locked}
                  onChange={(activities) => setDraft({ ...draft, activities })}
                />
              )}
            </div>
          )}

          <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex gap-2">
              <button
                disabled={saving || readOnly}
                onClick={() => {
                  void save('Draft berhasil disimpan di perangkat ini.')
                }}
                className="flex max-sm:flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-extrabold text-slate-600 hover:bg-slate-50"
              >
                <Icon name="save" className="h-4 w-4" />
                {saving ? 'Menyimpan...' : 'Simpan Draft'}
              </button>
              {eligible && (
                <button
                  type="button"
                  disabled={!canDelete}
                  onClick={() => {
                    setDeleteError('')
                    deleteDialog.current?.showModal()
                  }}
                  className="rounded-xl border border-rose-300 px-4 py-3 text-xs font-extrabold text-rose-700 enabled:hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 max-sm:flex-1"
                >
                  Hapus Draft
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                disabled={saving || sectionIndex === 0}
                onClick={() => setSectionIndex((current) => Math.max(0, current - 1))}
                className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-extrabold text-slate-600 disabled:opacity-40"
              >
                Sebelumnya
              </button>
              {sectionIndex < reportSections.length - 1 ? (
                <button
                  disabled={saving || readOnly}
                  onClick={next}
                  className="flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-xs font-extrabold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-900"
                >
                  Simpan & Lanjutkan
                  <Icon name="arrow" className="h-4 w-4" />
                </button>
              ) : (
                <button
                  disabled={!!persistDraft || saving || readOnly}
                  onClick={submit}
                  className="flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-xs font-extrabold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-900"
                >
                  <Icon name="check" className="h-4 w-4" />
                  {persistDraft ? 'Pengajuan belum dihubungkan' : 'Kirim Laporan'}
                </button>
              )}
            </div>
          </div>
        </section>

        <dialog
          ref={deleteDialog}
          aria-labelledby="delete-draft-title"
          aria-describedby="delete-draft-description"
          onCancel={event => { if (deleting) event.preventDefault() }}
          className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-900/40"
        >
          <h2 id="delete-draft-title" className="text-base font-extrabold">Hapus semua isian draft?</h2>
          <p id="delete-draft-description" className="mt-2 text-sm leading-6 text-slate-600">
            Semua jawaban draft di seluruh bagian laporan periode ini akan dihapus. Tindakan ini tidak dapat dibatalkan.
          </p>
          {deleteError && <p role="alert" className="mt-3 text-xs font-semibold text-rose-700">{deleteError}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" autoFocus disabled={deleting} onClick={() => deleteDialog.current?.close()}
              className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-extrabold text-slate-600">
              Batal
            </button>
            <button type="button" disabled={!canDelete} onClick={confirmDelete}
              className="rounded-xl bg-rose-700 px-4 py-3 text-xs font-extrabold text-white enabled:hover:bg-rose-800 disabled:opacity-50">
              {deleting ? 'Menghapus...' : 'Hapus Draft'}
            </button>
          </div>
        </dialog>
        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold">Progres Pengisian</p>
              <p className="text-lg font-extrabold text-emerald-800">{progress}%</p>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-700 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-5 space-y-2">
              {reportSections.map((item) => {
                const count = answeredInSection(draft, item)
                return (
                  <button
                    key={item.key}
                    onClick={() =>
                      setSectionIndex(
                        reportSections.findIndex((sectionItem) => sectionItem.key === item.key),
                      )
                    }
                    className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[10px] hover:bg-slate-50"
                  >
                    <span className="font-semibold text-slate-600">{item.shortLabel}</span>
                    <span
                      className={`font-extrabold ${count > 0 ? 'text-emerald-700' : 'text-slate-300'}`}
                    >
                      {count}/{item.questions.length}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-extrabold text-amber-900">Catatan instrumen</p>
            <p className="mt-2 text-[10px] leading-5 text-amber-800">
              Skala yang ambigu pada formulir sumber diberi label makna yang jelas. Redaksi dan
              rentang jawaban perlu divalidasi kembali oleh pengelola sebelum digunakan sebagai
              instrumen resmi.
            </p>
          </section>
        </aside>
      </div>
    </>
  )
}

function QuestionInput({
  question,
  number,
  value,
  disabled,
  issue,
  onChange,
  otherValue,
  onOtherChange,
}: {
  question: ReportQuestion
  number: number
  value?: AnswerValue
  disabled: boolean
  issue?: string
  onChange: (value: AnswerValue) => void
  otherValue: string
  onOtherChange: (value: string) => void
}) {
  const selected = Array.isArray(value) ? value : []
  const hasOther = value === 'Lainnya' || (Array.isArray(value) && value.includes('Lainnya'))
  const toggle = (option: string) => {
    if (exclusiveOptions.includes(option)) {
      onChange(selected.includes(option) ? [] : [option])
      return
    }
    const withoutExclusive = selected.filter((item) => !exclusiveOptions.includes(item))
    onChange(
      withoutExclusive.includes(option)
        ? withoutExclusive.filter((item) => item !== option)
        : [...withoutExclusive, option],
    )
  }

  return (
    <fieldset
      id={`question-${question.id}`}
      className={`scroll-mt-28 rounded-xl p-4 transition ${
        issue ? 'border border-rose-300 bg-rose-50/70' : 'border border-transparent'
      }`}
      disabled={disabled}
    >
      <legend className="flex gap-3 text-xs font-extrabold leading-5 text-slate-700">
        <span
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[9px] ${
            issue ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {issue ? <Icon name="alert" className="h-3.5 w-3.5" /> : number}
        </span>
        <span className="pt-0.5">{question.label}</span>
      </legend>
      {question.hint && (
        <p className="ml-9 mt-1 text-[10px] leading-4 text-slate-400">{question.hint}</p>
      )}
      {issue && (
        <p className="ml-9 mt-2 text-[10px] font-extrabold text-rose-700">Alasan: {issue}</p>
      )}
      <div className="ml-9 mt-3">
        {question.type === 'single' && (
          <div className="grid gap-2 sm:grid-cols-2">
            {question.options?.map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-[11px] font-semibold leading-4 transition ${
                  value === option
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 text-slate-600 hover:border-emerald-200'
                } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
              >
                <input
                  type="radio"
                  name={question.id}
                  checked={value === option}
                  onChange={() => onChange(option)}
                  className="mt-0.5 accent-emerald-700"
                />
                {option}
              </label>
            ))}
          </div>
        )}
        {question.type === 'multi' && (
          <div className="grid gap-2 sm:grid-cols-2">
            {question.options?.map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-[11px] font-semibold leading-4 transition ${
                  selected.includes(option)
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 text-slate-600 hover:border-emerald-200'
                } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggle(option)}
                  className="mt-0.5 accent-emerald-700"
                />
                {option}
              </label>
            ))}
          </div>
        )}
        {question.type === 'textarea' && (
          <textarea
            rows={4}
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => onChange(event.target.value)}
            className="form-input resize-y"
            placeholder="Tuliskan jawaban secara singkat dan jelas..."
          />
        )}
        {question.type === 'text' && (
          <input
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => onChange(event.target.value)}
            className="form-input"
            placeholder="Masukkan tautan atau keterangan..."
          />
        )}
        {hasOther && (
          <label className="mt-3 block">
            <span className="mb-2 block text-[10px] font-bold text-slate-600">
              Jelaskan pilihan lainnya
            </span>
            <input
              value={otherValue}
              onChange={(event) => onOtherChange(event.target.value)}
              className="form-input"
              placeholder="Tuliskan jawaban lainnya..."
            />
          </label>
        )}
      </div>
    </fieldset>
  )
}

function ActivityEditor({
  activities,
  disabled,
  onChange,
}: {
  activities: OrganizationActivity[]
  disabled: boolean
  onChange: (activities: OrganizationActivity[]) => void
}) {
  const add = () =>
    onChange([
      ...activities,
      {
        id: `activity-${Date.now()}`,
        name: '',
        type: '',
        role: '',
        description: '',
        evidence: '',
      },
    ])
  const update = (id: string, key: keyof OrganizationActivity, value: string) =>
    onChange(
      activities.map((activity) => (activity.id === id ? { ...activity, [key]: value } : activity)),
    )

  return (
    <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold text-emerald-900">Daftar kegiatan</p>
          <p className="mt-1 text-[10px] text-emerald-700/70">
            Tambahkan lebih dari satu organisasi atau kepanitiaan bila diperlukan.
          </p>
        </div>
        <button
          disabled={disabled}
          onClick={add}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-emerald-800 px-3 py-2.5 text-[10px] font-extrabold text-white disabled:opacity-50"
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
          Tambah
        </button>
      </div>
      {activities.length === 0 ? (
        <p className="mt-5 rounded-xl bg-white p-4 text-center text-[10px] text-slate-400">
          Belum ada kegiatan tambahan.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {activities.map((activity, index) => (
            <div key={activity.id} className="rounded-xl border border-emerald-100 bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[11px] font-extrabold text-slate-700">Kegiatan {index + 1}</p>
                {!disabled && (
                  <button
                    onClick={() => onChange(activities.filter((item) => item.id !== activity.id))}
                    className="text-[10px] font-bold text-rose-600"
                  >
                    Hapus
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['name', 'Nama organisasi/kegiatan'],
                  ['type', 'Jenis atau bidang'],
                  ['role', 'Jabatan/peran'],
                  ['evidence', 'Tautan bukti'],
                ].map(([key, label]) => (
                  <label key={key}>
                    <span className="mb-1.5 block text-[9px] font-bold text-slate-500">
                      {label}
                    </span>
                    <input
                      disabled={disabled}
                      value={String(activity[key as keyof OrganizationActivity])}
                      onChange={(event) =>
                        update(activity.id, key as keyof OrganizationActivity, event.target.value)
                      }
                      className="form-input"
                    />
                  </label>
                ))}
                <label className="sm:col-span-2">
                  <span className="mb-1.5 block text-[9px] font-bold text-slate-500">
                    Deskripsi aktivitas
                  </span>
                  <textarea
                    disabled={disabled}
                    rows={3}
                    value={activity.description}
                    onChange={(event) => update(activity.id, 'description', event.target.value)}
                    className="form-input resize-y"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryStep({
  period,
  section,
  confirmed,
  setConfirmed,
  setAnswer,
  locked,
}: {
  period: PeriodRecord
  section: ReportSection
  confirmed: boolean
  setConfirmed: (confirmed: boolean) => void
  setAnswer: (id: string, value: AnswerValue) => void
  locked: boolean
}) {
  const question = section.questions[0]
  return (
    <div>
      <QuestionInput
        question={question}
        number={1}
        value={period.answers[question.id]}
        disabled={locked}
        onChange={(value) => setAnswer(question.id, value)}
        otherValue=""
        onOtherChange={() => undefined}
      />
      <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-extrabold text-slate-800">Pemeriksaan kelengkapan</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {reportSections.slice(0, -1).map((item) => {
            const count = answeredInSection(period, item)
            return (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5"
              >
                <span className="text-[10px] font-semibold text-slate-600">{item.label}</span>
                <span
                  className={`flex items-center gap-1 text-[9px] font-extrabold ${
                    count > 0 ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  <Icon name={count > 0 ? 'check' : 'clock'} className="h-3.5 w-3.5" />
                  {count > 0 ? 'Terisi' : 'Belum terisi'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold leading-5 text-emerald-900">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-emerald-700"
        />
        Saya menyatakan data yang diisi sesuai dengan kondisi dan kegiatan yang sebenarnya.
      </label>
    </div>
  )
}

function FinancePage({
  connected = false,
  period,
  updatePeriod,
  onToast,
}: {
  connected?: boolean
  period: PeriodRecord
  updatePeriod: (period: PeriodRecord) => void
  onToast: (message: string) => void
}) {
  const categories = [
    {
      key: 'current' as const,
      title: 'Perencanaan dan realisasi keuangan periode berjalan',
      description:
        'Jika perencanaan dan realisasi berada dalam satu workbook, cukup unggah satu berkas.',
    },
    {
      key: 'next' as const,
      title: 'Perencanaan keuangan bulan berikutnya',
      description: 'Unggah dokumen rencana untuk periode selanjutnya.',
    },
  ]

  const selectFile = (category: 'current' | 'next', file?: File) => {
    if (!file) return
    const existing = period.financeDocuments.find((item) => item.category === category)
    const document: FinanceDocument = {
      id: existing?.id ?? `${period.id}-${category}`,
      category,
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      status: existing?.status === 'revision' ? 'revision' : 'draft',
      reason: existing?.status === 'revision' ? existing.reason : undefined,
    }
    updatePeriod({
      ...period,
      financeDocuments: [
        ...period.financeDocuments.filter((item) => item.category !== category),
        document,
      ],
    })
    onToast('Berkas dipilih dan disimpan sebagai draft lokal. Belum dikirim.')
  }

  const send = (document: FinanceDocument) => {
    updatePeriod({
      ...period,
      financeDocuments: period.financeDocuments.map((item) =>
        item.id === document.id
          ? {
              ...item,
              status: item.status === 'revision' ? 'review' : 'submitted',
              reason: undefined,
            }
          : item,
      ),
      reviewHistory: [
        ...period.reviewHistory,
        {
          date: new Date().toISOString(),
          actor: 'Awardee',
          text: `${document.name} dikirim untuk diperiksa.`,
        },
      ],
    })
    onToast('Dokumen dikirim dan menunggu pemeriksaan.')
  }

  return (
    <fieldset disabled={connected} className="min-w-0">
      <PageHeading
        eyebrow={`Keuangan · ${periodLabel(period.month, period.year)}`}
        title="Dokumen Keuangan"
        description={connected ? 'Lihat dokumen Excel atau PDF terbaru untuk periode ini.' : 'Unggah dokumen spreadsheet/Excel per periode.'}
        action={
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600">
            Tenggat 9 {periodLabel(period.month % 12 + 1, period.year + Number(period.month === 12))} · 23.59 WIB
          </div>
        }
      />
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <p className="text-[11px] leading-5 text-amber-800">
          {connected ? 'Halaman ini menampilkan metadata. Unggahan dan pengiriman belum tersedia.'
            : <>Memilih berkas belum mengirimkannya. Gunakan tombol <strong>Kirim untuk diperiksa</strong> pada setiap kartu dokumen.</>}
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {categories.map((category) => {
          const document = period.financeDocuments.find((item) => item.category === category.key)
          const locked = document?.status === 'approved'
          return (
            <section
              key={category.key}
              className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${
                document?.status === 'revision' ? 'border-rose-300' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Icon name="wallet" />
                </span>
                <StatusPill status={document?.status ?? 'draft'} />
              </div>
              <h2 className="mt-5 text-sm font-extrabold leading-6 text-slate-800">
                {category.title}
              </h2>
              <p className="mt-2 min-h-10 text-[11px] leading-5 text-slate-500">
                {category.description}
              </p>
              {document ? (
                <div
                  className={`mt-5 rounded-xl border p-4 ${
                    document.status === 'revision'
                      ? 'border-rose-200 bg-rose-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-emerald-700 shadow-sm">
                      <Icon name="file" className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-extrabold text-slate-700">
                        {document.name}
                      </p>
                      <p className="mt-1 text-[9px] text-slate-400">
                        {connected && document.version && ('Versi ' + document.version + ' · ')}{formatFileSize(document.size)} · Dipilih{' '}
                        {formatDateTime(document.uploadedAt)}
                      </p>
                    </div>
                  </div>
                  {document.reason && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-100 px-3 py-2 text-[10px] font-extrabold text-rose-700">
                      <Icon name="alert" className="h-3.5 w-3.5" />
                      {document.reason}
                    </div>
                  )}
                </div>
              ) : (
                <label className="mt-5 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center hover:border-emerald-300 hover:bg-emerald-50/40">
                  <Icon name="upload" className="h-6 w-6 text-emerald-700" />
                  <p className="mt-3 text-xs font-extrabold text-slate-700">
                    {connected ? 'Belum ada dokumen' : 'Pilih dokumen spreadsheet/Excel'}
                  </p>
                  <p className="mt-1 text-[9px] text-slate-400">{connected ? 'Excel atau PDF' : '.xlsx atau .xls'}</p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="sr-only"
                    onChange={(event) => selectFile(category.key, event.target.files?.[0])}
                  />
                </label>
              )}
              {document && (
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      onToast(
                        'Prototype lokal hanya menampilkan metadata; isi berkas tidak disimpan ke server.',
                      )
                    }
                    className="icon-action"
                  >
                    <Icon name="eye" className="h-3.5 w-3.5" />
                    Lihat
                  </button>
                  <button
                    onClick={() =>
                      onToast('Unduhan tidak tersedia karena unggahan hanya simulasi lokal.')
                    }
                    className="icon-action"
                  >
                    <Icon name="download" className="h-3.5 w-3.5" />
                    Unduh
                  </button>
                  {!locked && (
                    <label className="icon-action cursor-pointer">
                      <Icon name="upload" className="h-3.5 w-3.5" />
                      Ganti Berkas
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        className="sr-only"
                        onChange={(event) => selectFile(category.key, event.target.files?.[0])}
                      />
                    </label>
                  )}
                  {!locked && (document.status === 'draft' || document.status === 'revision') && (
                    <button
                      onClick={() => send(document)}
                      className="ml-auto rounded-lg bg-emerald-800 px-3 py-2 text-[10px] font-extrabold text-white"
                    >
                      Kirim untuk diperiksa
                    </button>
                  )}
                </div>
              )}
            </section>
          )
        })}
      </div>
      <p className="mt-6 text-center text-[10px] leading-5 text-slate-400">
        {connected ? 'Versi terbaru berkas Excel atau PDF dari database. Unggahan belum tersedia.' : 'Pada prototype ini, hanya metadata berkas yang disimpan di browser.'}
      </p>
    </fieldset>
  )
}

function RecapPage({
  periods,
  openDetail,
}: {
  periods: PeriodRecord[]
  openDetail: (id: string) => void
}) {
  const years = Array.from(new Set(periods.map((period) => period.year))).sort((a, b) => b - a)
  const [year, setYear] = useState(years[0] ?? 2026)
  const visible = periods.filter((period) => period.year === year).sort((a, b) => b.month - a.month)
  const approvedCount = visible.filter((period) => period.reportStatus === 'approved').length
  const submittedCount = visible.filter(
    (period) => period.reportStatus === 'submitted' || period.reportStatus === 'review',
  ).length
  const revisionCount = visible.filter((period) => period.reportStatus === 'revision').length

  return (
    <>
      <PageHeading
        eyebrow="Arsip Bulanan"
        title="Rekapitulasi"
        description="Lihat status Laporan Bulanan dan Keuangan secara terpisah untuk setiap periode."
        action={
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <span className="text-[10px] font-bold text-slate-400">Tahun</span>
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="bg-transparent text-xs font-extrabold outline-none"
            >
              {years.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <RecapStatusCard
          label="Laporan Disetujui"
          value={approvedCount}
          note="Telah selesai diperiksa"
          tone="emerald"
        />
        <RecapStatusCard
          label="Laporan Terkirim"
          value={submittedCount}
          note="Menunggu pemeriksaan"
          tone="terracotta"
        />
        <RecapStatusCard
          label="Perlu Direvisi"
          value={revisionCount}
          note="Menunggu perbaikan"
          tone="rose"
        />
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-extrabold">Arsip {year}</h2>
          <span className="text-[10px] text-slate-400">{visible.length} periode</span>
        </div>
        <div className="space-y-3">
          {visible.map((period) => (
            <PeriodRow key={period.id} period={period} openDetail={openDetail} />
          ))}
        </div>
      </section>
    </>
  )
}

function RecapStatusCard({
  label,
  value,
  note,
  tone,
}: {
  label: string
  value: number
  note: string
  tone: 'emerald' | 'terracotta' | 'rose'
}) {
  const tones = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    terracotta: 'border-orange-200 bg-orange-50 text-orange-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
  }
  const dots = {
    emerald: 'bg-emerald-600',
    terracotta: 'bg-orange-600',
    rose: 'bg-rose-600',
  }
  return (
    <div className={`rounded-2xl border p-5 ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-extrabold">{label}</p>
        <span className={`h-2.5 w-2.5 rounded-full ${dots[tone]}`} />
      </div>
      <p className="mt-3 text-3xl font-extrabold">{value}</p>
      <p className="mt-1 text-[9px] opacity-70">{note}</p>
    </div>
  )
}

function PeriodRow({
  period,
  openDetail,
}: {
  period: PeriodRecord
  openDetail: (id: string) => void
}) {
  const finance = financeStatus(period)
  const overall = overallStatus(period)
  return (
    <div className="grid gap-4 rounded-xl border border-slate-100 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/20 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto] md:items-center">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
          <Icon name="calendar" />
        </span>
        <div>
          <p className="text-xs font-extrabold text-slate-800">
            {periodLabel(period.month, period.year)}
          </p>
          <p className="mt-1 text-[9px] text-slate-400">
            {period.submittedAt ? `Dikirim ${formatDateTime(period.submittedAt)}` : 'Belum dikirim'}
          </p>
        </div>
      </div>
      <StatusColumn label="Laporan Bulanan" status={period.reportStatus} />
      <StatusColumn label="Keuangan" status={finance} />
      <div>
        <p className="mb-1 text-[8px] font-bold uppercase tracking-wide text-slate-400">
          Status keseluruhan
        </p>
        <OverallPill status={overall} />
      </div>
      <button
        onClick={() => openDetail(period.id)}
        className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 px-4 py-2.5 text-[10px] font-extrabold text-emerald-800 hover:bg-emerald-800 hover:text-white"
      >
        Lihat Detail
        <Icon name="arrow" className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function PeriodDetail({
  period,
  profile,
  onBack,
  onRepair,
  openReport,
  onToast,
}: {
  period: PeriodRecord
  profile: DemoProfile
  onBack: () => void
  openReport?: () => void
  onRepair: (sectionKey: string) => void
  onToast: (message: string) => void
}) {
  const revisionSection = reportSections.find(
    (section) => period.sectionReviews[section.key]?.status === 'revision',
  )
  return (
    <>
      <button onClick={onBack} className="back-button">
        <span className="rotate-180">
          <Icon name="arrow" className="h-4 w-4" />
        </span>
        Kembali ke Rekapitulasi
      </button>
      <PageHeading
        eyebrow="Detail Periode"
        title={periodLabel(period.month, period.year)}
        description="Laporan, dokumen keuangan, profil saat pengiriman, dan riwayat pemeriksaan."
        action={<OverallPill status={overallStatus(period)} />}
      />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_.8fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-sm font-extrabold">Laporan Bulanan</h2>
            <div className="mt-5 space-y-3">
              {reportSections.map((section) => {
                const review = period.sectionReviews[section.key]
                return (
                  <details key={section.key} className="group rounded-xl border border-slate-100">
                    <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 text-[10px] font-extrabold text-slate-500">
                        {reportSections.indexOf(section) + 1}
                      </span>
                      <span className="flex-1 text-xs font-extrabold text-slate-700">
                        {section.label}
                      </span>
                      {review?.status === 'revision' && (
                        <span className="text-[9px] font-extrabold text-rose-700">
                          Perlu perbaikan · {review.issues.length} isian
                        </span>
                      )}
                      <StatusPill status={review?.status ?? period.reportStatus} />
                    </summary>
                    <div className="border-t border-slate-100 p-4">
                      <AnswerList period={period} section={section} />
                    </div>
                  </details>
                )
              })}
            </div>
            {openReport && <button className="mt-5 icon-action" onClick={openReport}>{period.reportStatus === "revision" ? "Perbaiki laporan" : period.reportStatus === "draft" ? "Lanjutkan draf" : "Buka laporan"}</button>}
            {!openReport && revisionSection && (
              <button
                onClick={() => onRepair(revisionSection.key)}
                className="mt-5 flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-3 text-xs font-extrabold text-white"
              >
                <Icon name="alert" className="h-4 w-4" />
                Perbaiki {revisionSection.label}
              </button>
            )}
          </section>
          <FinanceDetail period={period} onToast={onToast} />
        </div>
        <aside className="space-y-6">
          <SnapshotCard current={!!openReport && !period.profileSnapshot} profile={profile} />
          <HistoryCard events={period.reviewHistory} />
        </aside>
      </div>
    </>
  )
}

function AnswerList({ period, section }: { period: PeriodRecord; section: ReportSection }) {
  return (
    <dl className="space-y-4">
      {section.questions.map((question) => {
        const value = period.answers[question.id]
        const issue = period.sectionReviews[section.key]?.issues.find(
          (item) => item.questionId === question.id,
        )
        return (
          <div
            key={question.id}
            className={`rounded-lg p-3 ${
              issue ? 'border border-rose-200 bg-rose-50' : 'bg-slate-50'
            }`}
          >
            <dt className="text-[9px] font-bold leading-4 text-slate-400">{question.label}</dt>
            <dd className="mt-1 text-[11px] font-semibold leading-5 text-slate-700">
              {formatAnswer(value)}
            </dd>
            {issue && (
              <p className="mt-2 text-[9px] font-extrabold text-rose-700">{issue.reason}</p>
            )}
          </div>
        )
      })}
    </dl>
  )
}

function FinanceDetail({
  period,
  onToast,
}: {
  period: PeriodRecord
  onToast: (message: string) => void
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-extrabold">Dokumen Keuangan</h2>
      {period.financeDocuments.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {period.financeDocuments.map((document) => (
            <div
              key={document.id}
              className={`rounded-xl border p-4 ${
                document.status === 'revision' ? 'border-rose-300 bg-rose-50' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <Icon name="file" className="h-5 w-5 text-emerald-700" />
                <StatusPill status={document.status} />
              </div>
              <p className="mt-4 truncate text-xs font-extrabold text-slate-700">{document.name}</p>
              <p className="mt-1 text-[9px] text-slate-400">
                {document.category === 'current'
                  ? 'Perencanaan & realisasi'
                  : 'Rencana bulan berikutnya'}
              </p>
              {document.reason && (
                <p className="mt-3 rounded-lg bg-rose-100 p-2 text-[9px] font-extrabold text-rose-700">
                  {document.reason}
                </p>
              )}
              <button
                onClick={() => onToast(`${document.name} · ${formatFileSize(document.size)} · ${formatDateTime(document.uploadedAt)}`)}
                className="mt-4 text-[10px] font-extrabold text-emerald-700"
              >
                Lihat metadata
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-xl bg-slate-50 p-5 text-center text-xs text-slate-400">
          Belum ada dokumen keuangan.
        </p>
      )}
    </section>
  )
}

function SnapshotCard({ profile, current = false }: { profile: DemoProfile; current?: boolean }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar name={profile.fullName} />
        <div>
          <h2 className="text-xs font-extrabold">{current ? "Profil awardee" : "Profil saat pengiriman"}</h2>
          <p className="mt-1 text-[9px] text-slate-400">{current ? "Data saat ini" : "Snapshot periode"}</p>
        </div>
      </div>
      <dl className="mt-5 space-y-3">
        {[
          ['Nama', profile.fullName],
          ['Perguruan tinggi', profile.university],
          ['Program studi', profile.studyProgram],
          ['NIM', profile.studentNumber],
          ['Registrasi', profile.registrationNumber],
          ['Indeks prestasi', `${profile.gpaType} ${profile.gpaValue} · ${profile.gpaSemester}`],
        ].map(([label, value]) => (
          <div key={label} className="border-t border-slate-100 pt-3">
            <dt className="text-[8px] font-bold uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="mt-1 text-[10px] font-semibold leading-4 text-slate-700">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function HistoryCard({ events }: { events: PeriodRecord['reviewHistory'] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xs font-extrabold">Riwayat Pemeriksaan</h2>
      <div className="mt-5 space-y-5">
        {events.length ? (
          events.map((event, index) => (
            <div key={`${event.date}-${index}`} className="flex gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-600 ring-4 ring-emerald-50" />
              <div>
                <p className="text-[10px] font-bold leading-4 text-slate-700">{event.text}</p>
                <p className="mt-1 text-[9px] text-slate-400">
                  {event.actor} · {formatDateTime(event.date)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-[10px] text-slate-400">Belum ada riwayat.</p>
        )}
      </div>
    </section>
  )
}

function StaffDashboard({
  referencePeriod = activePeriodFor(demoNow),
  account,
  periods,
  profiles,
  openDetail,
}: {
  referencePeriod?: { month: number; year: number }
  account: DemoAccount
  periods: PeriodRecord[]
  profiles: Record<string, DemoProfile>
  openDetail: (id: string) => void
}) {
  const pending = periods.filter(
    (period) => period.reportStatus === 'submitted' || financeStatus(period) === 'submitted',
  ).length
  const revisions = periods.filter(
    (period) => ['revision', 'rejected'].includes(period.reportStatus) ||
      ['revision', 'rejected'].includes(financeStatus(period)),
  ).length
  const approved = periods.filter((period) => overallStatus(period) === 'approved').length
  return (
    <>
      <PageHeading
        eyebrow={account.roleLabel}
        title={`Assalamu'alaikum, ${account.name.split(' ')[0]}`}
        description={
          account.role === 'coordinator'
            ? 'Periksa laporan awardee per subbab dan dokumen keuangan per berkas.'
            : 'Pantau perkembangan awardee sesuai cakupan akun secara hanya-baca.'
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStat
          icon="users"
          label="Awardee dalam cakupan"
          value={String(account.scope?.length ?? 0)}
          note="Sesuai cakupan akses"
          tone="emerald"
        />
        <DashboardStat
          icon="clock"
          label="Menunggu pemeriksaan"
          value={String(pending)}
          note="Periode"
          tone="amber"
        />
        <DashboardStat
          icon="alert"
          label="Perlu tindak lanjut"
          value={String(revisions)}
          note="Periode"
          tone="rose"
        />
        <DashboardStat
          icon="check"
          label="Disetujui"
          value={String(approved)}
          note="Periode lengkap"
          tone="slate"
        />
      </div>
      <AwardeeMatrix
        referencePeriod={referencePeriod}
        account={account}
        periods={periods}
        profiles={profiles}
        openDetail={openDetail}
        embedded
      />
    </>
  )
}

function AwardeeMatrix({
  referencePeriod = activePeriodFor(demoNow),
  account,
  periods,
  profiles,
  openDetail,
  embedded = false,
}: {
  referencePeriod?: { month: number; year: number }
  account: DemoAccount
  periods: PeriodRecord[]
  profiles: Record<string, DemoProfile>
  openDetail: (id: string) => void
  embedded?: boolean
}) {
  const years = [...new Set([referencePeriod.year, ...periods.map(p => p.year)])].sort((a,b) => b-a)
  const [year, setYear] = useState(referencePeriod.year)
  const owners = account.scope ?? []
  return (
    <>
      {!embedded && (
        <PageHeading
          eyebrow={account.role === 'coordinator' ? 'Pemeriksaan Awardee' : 'Monitoring'}
          title={`Rekap Awardee ${year}`}
          description="Klik sel bulan untuk membuka detail periode sesuai akses akun."
        />
      )}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="text-sm font-extrabold">Rekap Januari–Desember</h2>
            <p className="mt-1 text-[10px] text-slate-400">
              Bulan mendatang ditandai Belum dibuka.
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[9px] font-extrabold text-emerald-700">
            {years.length > 1 && <select aria-label="Tahun pemantauan" value={year} onChange={event => setYear(Number(event.target.value))}>{years.map(y => <option key={y}>{y}</option>)}</select>} {owners.length} awardee
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky left-0 z-10 w-56 bg-slate-50 px-5 py-3 text-left text-[9px] font-extrabold uppercase tracking-wide text-slate-400">
                  Awardee
                </th>
                {monthNames.map((month) => (
                  <th
                    key={month}
                    className="min-w-20 px-2 py-3 text-center text-[9px] font-extrabold text-slate-400"
                  >
                    {month.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {owners.map((ownerId) => {
                const profile = profiles[ownerId]
                return (
                  <tr key={ownerId} className="border-t border-slate-100">
                    <td className="sticky left-0 z-10 bg-white px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={profile.fullName} size="small" />
                        <div>
                          <p className="text-[10px] font-extrabold text-slate-700">
                            {profile.fullName}
                          </p>
                          <p className="mt-0.5 text-[8px] text-slate-400">
                            {profile.registrationNumber}
                          </p>
                        </div>
                      </div>
                    </td>
                    {monthNames.map((_, index) => {
                      const month = index + 1
                      const period = periods.find(
                        (item) =>
                          item.ownerId === ownerId && item.month === month && item.year === year,
                      )
                      const future = year > referencePeriod.year || (year === referencePeriod.year && month > referencePeriod.month)
                      return (
                        <td key={month} className="px-2 py-4 text-center">
                          {period ? (
                            <button
                              onClick={() => openDetail(period.id)}
                              className={`mx-auto grid h-9 w-9 place-items-center rounded-xl text-white shadow-sm ${matrixTone(overallStatus(period))}`}
                              aria-label={`Buka ${periodLabel(month, year)} ${profile.fullName}`}
                            >
                              <Icon
                                name={
                                  overallStatus(period) === 'approved'
                                    ? 'check'
                                    : overallStatus(period) === 'revision'
                                      ? 'alert'
                                      : 'clock'
                                }
                                className="h-4 w-4"
                              />
                            </button>
                          ) : (
                            <span
                              className={`text-[8px] font-semibold ${future ? 'text-slate-300' : 'text-slate-400'}`}
                            >
                              {future ? 'Belum dibuka' : '—'}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

function escapePdfText(value: unknown) {
  return String(value ?? '—')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function pdfValue(value: unknown) {
  if (value === undefined || value === null || value === '') return '—'
  return escapePdfText(value)
}

function pdfSelectedValues(value?: AnswerValue) {
  if (Array.isArray(value)) return new Set(value)
  return new Set(value ? [value] : [])
}

function renderPdfQuestion(
  question: ReportQuestion,
  value: AnswerValue | undefined,
  number: string,
  issue?: string,
) {
  const selected = pdfSelectedValues(value)
  const options = question.options ?? []
  const answer = Array.isArray(value) ? value.join(', ') : value
  const answerHtml = options.length
    ? `<div class="choices">${options.map(option => (
        `<span class="choice"><span class="box">${selected.has(option) ? '☒' : '☐'}</span>${escapePdfText(option)}</span>`
      )).join('')}</div>`
    : `<div class="narrative">${pdfValue(answer)}</div>`

  return `<article class="question">
    <div class="question-title"><span class="question-number">${escapePdfText(number)}.</span><span>${escapePdfText(question.label)}</span></div>
    ${question.hint ? `<p class="hint">${escapePdfText(question.hint)}</p>` : ''}
    ${answerHtml}
    ${issue ? `<div class="review-note"><strong>Catatan pemeriksa:</strong> ${escapePdfText(issue)}</div>` : ''}
  </article>`
}

function safePdfPhotoUrl(photoUrl: string) {
  if (!photoUrl) return ''
  if (/^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(photoUrl) || photoUrl.startsWith('blob:')) {
    return photoUrl
  }
  try {
    const resolved = new URL(photoUrl, window.location.href)
    return resolved.origin === window.location.origin && /^https?:$/.test(resolved.protocol)
      ? resolved.href
      : ''
  } catch {
    return ''
  }
}

function exportPeriodPdf(
  period: PeriodRecord,
  profile: DemoProfile,
  onToast: (message: string) => void,
) {
  const popup = window.open('', '_blank')
  if (!popup) {
    onToast('Izinkan pop-up untuk mengekspor PDF.')
    return
  }
  const reportProfile = period.profileSnapshot ?? profile
  const identityRows = [
    ['Nama lengkap', reportProfile.fullName],
    ['Tempat, tanggal lahir', `${reportProfile.birthPlace || '—'}, ${reportProfile.birthDate || '—'}`],
    ['Jenis kelamin', reportProfile.gender],
    ['Alamat sesuai identitas', reportProfile.identityAddress],
    ['Jenis domisili', reportProfile.domicileType],
    ['Alamat domisili', reportProfile.domicileAddress],
    ['Nama orang tua/wali', reportProfile.guardianName],
    ['Kontak orang tua/wali', reportProfile.guardianContact],
    ['Media sosial', reportProfile.socialMedia],
  ]
  const studentRows = [
    ['Perguruan tinggi', reportProfile.university],
    ['Program studi', reportProfile.studyProgram],
    ['Nomor induk mahasiswa', reportProfile.studentNumber],
    ['Nomor registrasi BeZakat', reportProfile.registrationNumber],
    ['Lembaga penyantun', reportProfile.sponsor],
    ['Status beasiswa', reportProfile.scholarshipStatus],
    ['Indeks prestasi', `${reportProfile.gpaType} ${reportProfile.gpaValue || '—'}`],
    ['Periode indeks prestasi', reportProfile.gpaSemester],
    ['Riwayat indeks prestasi', reportProfile.gpaHistory.length
      ? reportProfile.gpaHistory.map((item, index) => `S${index + 1}: ${item || '—'}`).join(' · ')
      : '—'],
  ]
  const renderRows = (rows: (string | undefined)[][]) => rows.map(([label, value], index) => (
    `<tr><td class="row-number">${index + 1}</td><th>${escapePdfText(label)}</th><td>${pdfValue(value)}</td></tr>`
  )).join('')
  const summarySection = reportSections.find(section => section.key === 'ringkasan')
  const assessmentSections = reportSections.filter(section => section.key !== 'ringkasan')
  const summaryQuestion = summarySection?.questions[0]
  const summaryIssue = period.sectionReviews.ringkasan?.issues.find(
    item => item.questionId === summaryQuestion?.id,
  )?.reason
  const sectionLetters = ['D', 'E', 'F', 'G', 'H', 'I', 'J']
  const assessmentHtml = assessmentSections.map((section, sectionIndex) => {
    const review = period.sectionReviews[section.key]
    return `<section class="report-section">
      <div class="section-heading">
        <span>${sectionLetters[sectionIndex]}.</span>
        <div><h2>${escapePdfText(section.label.toUpperCase())}</h2><p>${escapePdfText(section.description)}</p></div>
        <span class="section-status">${escapePdfText(statusLabel(review?.status ?? 'draft'))}</span>
      </div>
      <div class="question-list">${section.questions.map((question, questionIndex) => {
        const issue = review?.issues.find(item => item.questionId === question.id)?.reason
        return renderPdfQuestion(
          question,
          period.answers[question.id],
          `${sectionLetters[sectionIndex]}.${questionIndex + 1}`,
          issue,
        )
      }).join('')}</div>
    </section>`
  }).join('')
  const activities = period.activities.length
    ? period.activities.map((activity, index) => `<tr>
        <td class="row-number">${index + 1}</td>
        <td><strong>${escapePdfText(activity.name)}</strong><br><span class="muted">${escapePdfText(activity.type)} · ${escapePdfText(activity.role)}</span></td>
        <td>${pdfValue(activity.description)}</td>
        <td>${pdfValue(activity.evidence)}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" class="empty">Tidak ada kegiatan organisasi atau kepanitiaan.</td></tr>'
  const finance = period.financeDocuments.length
    ? period.financeDocuments.map((document, index) => `<tr>
        <td class="row-number">${index + 1}</td>
        <td>${escapePdfText(document.category === 'current' ? 'Realisasi bulan berjalan' : 'Rencana bulan berikutnya')}</td>
        <td>${escapePdfText(document.name)}<br><span class="muted">${escapePdfText(formatFileSize(document.size))} · diunggah ${escapePdfText(formatDateTime(document.uploadedAt))}</span></td>
        <td><span class="document-status">${escapePdfText(statusLabel(document.status))}</span>${document.reason
          ? `<div class="review-note compact"><strong>Catatan:</strong> ${escapePdfText(document.reason)}</div>`
          : ''}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" class="empty">Belum ada dokumen keuangan.</td></tr>'
  const history = period.reviewHistory.length
    ? period.reviewHistory.map((event, index) => `<tr>
        <td class="row-number">${index + 1}</td>
        <td>${escapePdfText(formatDateTime(event.date))}</td>
        <td>${escapePdfText(event.actor)}</td>
        <td>${escapePdfText(event.text)}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" class="empty">Belum ada riwayat pemeriksaan.</td></tr>'
  const exportedStatus = overallStatus(period)
  const exportedStatusLabel = exportedStatus === 'incomplete' ? 'Belum lengkap' : statusLabel(exportedStatus)
  const photoUrl = safePdfPhotoUrl(profile.photoUrl)
  const photo = photoUrl
    ? `<img class="profile-photo" src="${escapePdfText(photoUrl)}" alt="Foto terbaru ${escapePdfText(reportProfile.fullName)}">`
    : `<div class="photo-placeholder"><span>FOTO TERBARU</span><small>Belum tersedia</small></div>`
  const submittedAt = period.submittedAt ? formatDateTime(period.submittedAt) : 'Belum dikirim'
  const generatedAt = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })

  popup.document.write(`<!doctype html>
<html lang="id"><head><meta charset="utf-8"><title>SIM-BEZAKAT · ${escapePdfText(periodLabel(period.month, period.year))}</title>
<style>
@page{size:A4;margin:14mm 14mm 16mm}*{box-sizing:border-box}html{background:#edf3f0}body{width:210mm;min-height:297mm;margin:0 auto;background:#fff;color:#17251f;font-family:Arial,Helvetica,sans-serif;font-size:9.2pt;line-height:1.45;padding:14mm}
h1,h2,p{margin:0}.document-header{border-top:8px solid #126448;border-bottom:2px solid #126448;padding:12px 0 10px;text-align:center}.kicker{font-size:8pt;font-weight:700;letter-spacing:1.8px;color:#126448}.document-header h1{max-width:150mm;margin:6px auto 3px;font-size:17pt;line-height:1.25}.period-title{font-size:11pt;font-weight:700;color:#3c554b}
.cover-grid{display:grid;grid-template-columns:38mm 1fr;gap:12mm;align-items:center;margin:16mm 0 10mm}.profile-photo,.photo-placeholder{width:38mm;height:50mm;border:1.5px solid #126448}.profile-photo{display:block;object-fit:cover}.photo-placeholder{display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f2f7f4;color:#507066;font-weight:700;letter-spacing:.7px}.photo-placeholder small{margin-top:5px;font-size:7pt;font-weight:400;letter-spacing:0}.cover-name{font-size:19pt;line-height:1.2;color:#103e2f}.cover-registration{margin-top:5px;font-size:10pt;color:#52665e}.cover-meta{display:grid;grid-template-columns:42mm 1fr;margin-top:12px;border-top:1px solid #cbd8d2}.cover-meta dt,.cover-meta dd{margin:0;padding:5px 0;border-bottom:1px solid #cbd8d2}.cover-meta dt{font-weight:700}.status-pill{display:inline-block;border:1px solid #126448;background:#e7f3ed;color:#126448;padding:2px 7px;font-weight:700;text-transform:uppercase;font-size:7.5pt}
.document-note{margin:8mm 0 12mm;padding:7px 9px;border-left:3px solid #126448;background:#f2f7f4;color:#40564d;font-size:8pt}.section-heading{display:grid;grid-template-columns:8mm 1fr auto;gap:2mm;align-items:start;margin:8mm 0 3mm;padding:6px 7px;background:#126448;color:#fff;break-after:avoid}.section-heading>span:first-child,.section-heading h2{font-size:10.5pt;font-weight:700}.section-heading p{margin-top:2px;font-size:7.5pt;color:#dcece5}.section-status{align-self:center;border:1px solid #bad8ca;padding:2px 5px;font-size:7pt;font-weight:700;text-transform:uppercase}
table{width:100%;border-collapse:collapse}.form-table tr,.evidence-table tr{break-inside:avoid}.form-table th,.form-table td,.evidence-table th,.evidence-table td{border:1px solid #8ca39a;padding:5px 6px;text-align:left;vertical-align:top}.form-table th{width:35%;background:#eef5f1;font-weight:700}.row-number{width:8mm!important;text-align:center!important;background:#f7faf8!important;font-weight:700}.evidence-table thead th{background:#dcece5;color:#153e31}.evidence-table .empty{text-align:center;padding:12px;color:#64776f}.muted{color:#64776f;font-size:7.5pt}
.question-list{border:1px solid #8ca39a;border-bottom:0}.question{padding:7px 8px;border-bottom:1px solid #8ca39a;break-inside:avoid}.question-title{display:flex;gap:5px;font-weight:700}.question-number{min-width:11mm;color:#126448}.hint{margin:3px 0 0 13mm;color:#687b73;font-size:7.5pt;font-style:italic}.choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px 10px;margin:6px 0 0 13mm}.choice{display:flex;align-items:flex-start;gap:4px}.box{font-family:"Arial Unicode MS","Segoe UI Symbol",Arial,sans-serif;color:#126448;font-size:11pt;line-height:1}.narrative{min-height:13mm;margin:6px 0 0 13mm;padding:6px 7px;border:1px solid #b7c8c0;background:#fbfcfb;white-space:pre-wrap}.review-note{margin:6px 0 0 13mm;padding:5px 7px;border-left:3px solid #b42318;background:#fff0ee;color:#7a271a;font-size:8pt}.review-note.compact{margin:4px 0 0;padding:4px 5px}.summary-box{min-height:28mm;padding:9px;border:1px solid #8ca39a;background:#fbfcfb;white-space:pre-wrap}.summary-meta{display:flex;gap:14px;margin-top:5px;color:#52665e;font-size:7.5pt}
.signoff{display:grid;grid-template-columns:1fr 58mm;gap:12mm;margin-top:10mm;break-inside:avoid}.signoff-note{color:#52665e;font-size:8pt}.signature{text-align:center}.signature-space{height:20mm}.footer{margin-top:12mm;padding-top:5px;border-top:1px solid #9eb0a8;color:#667970;font-size:7pt;text-align:center}
.no-print{position:fixed;z-index:10;right:18px;top:18px;padding:11px 16px;border:0;border-radius:7px;background:#126448;color:#fff;font-weight:700;box-shadow:0 6px 18px #0003;cursor:pointer}
@media print{html,body{background:#fff}body{width:auto;min-height:0;margin:0;padding:0}.no-print{display:none}.report-section{break-before:auto}.section-heading{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head><body>
<button class="no-print" onclick="window.print()">Simpan sebagai PDF</button>
<header class="document-header">
  <p class="kicker">SISTEM INFORMASI MANAJEMEN BEASISWA ZAKAT INDONESIA</p>
  <h1>LAPORAN ASESMEN BULANAN<br>PENERIMA BEASISWA ZAKAT INDONESIA</h1>
  <p class="period-title">Periode ${escapePdfText(periodLabel(period.month, period.year))}</p>
</header>
<section class="cover-grid">
  ${photo}
  <div>
    <p class="kicker">IDENTITAS PENERIMA BEASISWA</p>
    <h2 class="cover-name">${escapePdfText(reportProfile.fullName)}</h2>
    <p class="cover-registration">${escapePdfText(reportProfile.registrationNumber)} · ${escapePdfText(reportProfile.university)}</p>
    <dl class="cover-meta">
      <dt>Periode asesmen</dt><dd>${escapePdfText(periodLabel(period.month, period.year))}</dd>
      <dt>Tanggal pengiriman</dt><dd>${escapePdfText(submittedAt)}</dd>
      <dt>Status laporan</dt><dd><span class="status-pill">${escapePdfText(exportedStatusLabel)}</span></dd>
      <dt>Dana diterima</dt><dd>${period.allowanceReceived === undefined ? '—' : period.allowanceReceived ? 'Ya' : 'Tidak'}</dd>
    </dl>
  </div>
</section>
<p class="document-note">Dokumen ini memuat data profil, jawaban asesmen, bukti kegiatan, laporan keuangan, serta hasil pemeriksaan koordinator sesuai data yang tersimpan pada SIM-BEZAKAT.</p>

<section>
  <div class="section-heading"><span>A.</span><div><h2>IDENTITAS DIRI</h2><p>Data pribadi penerima Beasiswa Zakat Indonesia</p></div></div>
  <table class="form-table"><tbody>${renderRows(identityRows)}</tbody></table>
</section>
<section>
  <div class="section-heading"><span>B.</span><div><h2>DATA KEMAHASISWAAN</h2><p>Data akademik dan kepesertaan program beasiswa</p></div></div>
  <table class="form-table"><tbody>${renderRows(studentRows)}</tbody></table>
</section>
<section>
  <div class="section-heading"><span>C.</span><div><h2>KABAR BULAN INI</h2><p>Ringkasan asesmen penerima beasiswa pada periode pelaporan</p></div><span class="section-status">${escapePdfText(statusLabel(period.sectionReviews.ringkasan?.status ?? 'draft'))}</span></div>
  <div class="summary-box">${summaryQuestion ? pdfValue(period.answers[summaryQuestion.id]) : '—'}</div>
  ${summaryIssue ? `<div class="review-note"><strong>Catatan pemeriksa:</strong> ${escapePdfText(summaryIssue)}</div>` : ''}
  <div class="summary-meta"><span>Periode: ${escapePdfText(periodLabel(period.month, period.year))}</span><span>Status: ${escapePdfText(exportedStatusLabel)}</span></div>
</section>

${assessmentHtml}

<section>
  <div class="section-heading"><span>K.</span><div><h2>RINCIAN AKTIVITAS ORGANISASI</h2><p>Kegiatan, peran, deskripsi, dan bukti pendukung</p></div></div>
  <table class="evidence-table"><thead><tr><th>No.</th><th>Kegiatan & peran</th><th>Uraian</th><th>Bukti</th></tr></thead><tbody>${activities}</tbody></table>
</section>
<section>
  <div class="section-heading"><span>L.</span><div><h2>LAPORAN KEUANGAN & LAMPIRAN</h2><p>Dokumen realisasi dan rencana penggunaan dana</p></div></div>
  <table class="evidence-table"><thead><tr><th>No.</th><th>Kategori</th><th>Dokumen</th><th>Hasil pemeriksaan</th></tr></thead><tbody>${finance}</tbody></table>
</section>
<section>
  <div class="section-heading"><span>M.</span><div><h2>HASIL & RIWAYAT PEMERIKSAAN</h2><p>Jejak keputusan dan catatan koordinator</p></div><span class="section-status">${escapePdfText(exportedStatusLabel)}</span></div>
  <table class="evidence-table"><thead><tr><th>No.</th><th>Waktu</th><th>Pemeriksa</th><th>Catatan/keputusan</th></tr></thead><tbody>${history}</tbody></table>
</section>
<section class="signoff">
  <p class="signoff-note">Laporan ini dihasilkan secara elektronik dari SIM-BEZAKAT. Status dan catatan pemeriksaan pada dokumen mengikuti data terakhir saat ekspor.</p>
  <div class="signature"><p>${escapePdfText(new Date().toLocaleDateString('id-ID', { dateStyle: 'long' }))}</p><p>Koordinator Awardee</p><div class="signature-space"></div><p><strong>( .................................... )</strong></p></div>
</section>
<p class="footer">Dokumen SIM-BEZAKAT · Diekspor pada ${escapePdfText(generatedAt)} · ${escapePdfText(reportProfile.registrationNumber)}</p>
</body></html>`)
  popup.document.close()
  onToast('Dokumen PDF siap dicetak atau disimpan.')
}

function StaffPeriodDetail({
  connected = false,
  persistReview,
  account,
  period,
  profile,
  updatePeriod,
  onBack,
  onToast,
}: {
  connected?: boolean
  persistReview?: (input: ReportReviewInput) => Promise<void>
  account: DemoAccount
  period: PeriodRecord
  profile: DemoProfile
  updatePeriod: (period: PeriodRecord) => void
  onBack: () => void
  onToast: (message: string) => void
}) {
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])
  const [reason, setReason] = useState('')
  const [financeReview, setFinanceReview] = useState<string | null>(null)
  const [savingReview, setSavingReview] = useState('')
  const [decisionNote, setDecisionNote] = useState('')
  const hasFinalDecision = ['revision', 'approved', 'rejected'].includes(period.reportStatus)
  const [editingReview, setEditingReview] = useState(!hasFinalDecision)
  const canReview = account.role === 'coordinator'
  const readOnly = !canReview || !editingReview

  const saveConnectedReview = async (input: Omit<ReportReviewInput, 'reportId'>, success: string) => {
    if (!persistReview) return false
    if (!period.reportId) {
      onToast('Identitas laporan tidak tersedia. Muat ulang halaman.')
      return true
    }
    setSavingReview(`${input.operation}:${input.target}`)
    try {
      await persistReview({ ...input, reportId: period.reportId })
      setReviewing(null)
      setFinanceReview(null)
      setSelectedQuestions([])
      setReason('')
      if (
        input.operation === 'approve-report' ||
        input.operation === 'reject-report' ||
        input.operation.startsWith('revise-')
      ) {
        setEditingReview(false)
      }
      onToast(success)
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Pemeriksaan gagal disimpan.')
    } finally {
      setSavingReview('')
    }
    return true
  }

  const decideReport = async (decision: 'approved' | 'revision' | 'rejected') => {
    if (decision !== 'approved' && !decisionNote.trim()) {
      onToast('Catatan wajib diisi untuk revisi atau penolakan.')
      return
    }
    const operation = decision === 'approved'
      ? 'approve-report'
      : decision === 'revision' ? 'revise-report' : 'reject-report'
    const success = decision === 'approved'
      ? 'Laporan diterima.'
      : decision === 'revision' ? 'Laporan dikembalikan untuk direvisi.' : 'Laporan ditolak.'
    if (await saveConnectedReview({
      operation,
      target: 'report',
      issues: decision === 'approved' ? undefined : [{ questionId: 'report', reason: decisionNote.trim() }],
    }, success)) return
    const now = new Date().toISOString()
    const nextReviews = decision === 'approved'
      ? Object.fromEntries(reportSections.map(section => [section.key, { status: 'approved' as ReviewStatus, issues: [] }]))
      : decision === 'revision'
        ? {
            ...period.sectionReviews,
            ringkasan: {
              status: 'revision' as ReviewStatus,
              issues: [{ questionId: 'executive_summary', reason: decisionNote.trim() }],
            },
          }
        : period.sectionReviews
    updatePeriod({
      ...period,
      reportStatus: decision,
      sectionReviews: nextReviews,
      financeDocuments: decision === 'approved'
        ? period.financeDocuments.map(document => ({ ...document, status: 'approved' }))
        : period.financeDocuments,
      reviewHistory: [...period.reviewHistory, {
        date: now,
        actor: account.name,
        text: decision === 'approved' ? 'Laporan diterima oleh koordinator.' :
          `${decision === 'revision' ? 'Laporan perlu direvisi' : 'Laporan ditolak'}: ${decisionNote.trim()}`,
      }],
    })
    setDecisionNote('')
    setEditingReview(false)
    onToast(success)
  }

  const approveSection = async (sectionKey: string) => {
    if (await saveConnectedReview(
      { operation: 'approve-section', target: sectionKey },
      'Bagian laporan disetujui.',
    )) return
    const nextReviews = {
      ...period.sectionReviews,
      [sectionKey]: { status: 'approved' as ReviewStatus, issues: [] },
    }
    updatePeriod({
      ...period,
      sectionReviews: nextReviews,
      reportStatus: Object.values(nextReviews).every((item) => item.status === 'approved')
        ? 'approved'
        : 'submitted',
      reviewHistory: [
        ...period.reviewHistory,
        {
          date: new Date().toISOString(),
          actor: account.name,
          text: `${reportSections.find((item) => item.key === sectionKey)?.label} disetujui.`,
        },
      ],
    })
    onToast('Bagian laporan disetujui.')
  }

  const requestRevision = async (sectionKey: string) => {
    if (!selectedQuestions.length || !reason) {
      onToast('Pilih minimal satu isian dan satu alasan.')
      return
    }
    if (await saveConnectedReview({
      operation: 'revise-section',
      target: sectionKey,
      issues: selectedQuestions.map(questionId => ({ questionId, reason })),
    }, 'Permintaan perbaikan berhasil dikirim ke awardee.')) return
    updatePeriod({
      ...period,
      reportStatus: 'revision',
      sectionReviews: {
        ...period.sectionReviews,
        [sectionKey]: {
          status: 'revision',
          issues: selectedQuestions.map((questionId) => ({ questionId, reason })),
        },
      },
      reviewHistory: [
        ...period.reviewHistory,
        {
          date: new Date().toISOString(),
          actor: account.name,
          text: `${selectedQuestions.length} isian ditandai perlu perbaikan (${reason}).`,
        },
      ],
    })
    setReviewing(null)
    setSelectedQuestions([])
    setReason('')
    setEditingReview(false)
    onToast('Permintaan perbaikan berhasil disimpan.')
  }

  const updateFinance = async (
    document: FinanceDocument,
    status: ReviewStatus,
    selectedReason?: string,
  ) => {
    if (status === 'revision' && !selectedReason) {
      onToast('Pilih alasan perbaikan dokumen.')
      return
    }
    if (await saveConnectedReview({
      operation: status === 'approved' ? 'approve-finance' : 'revise-finance',
      target: document.id,
      issues: status === 'revision' ? [{ questionId: document.id, reason: selectedReason! }] : undefined,
    }, status === 'approved' ? 'Dokumen keuangan disetujui.' : 'Permintaan penggantian dikirim ke awardee.')) return
    updatePeriod({
      ...period,
      reportStatus: status === 'revision' ? 'revision' : period.reportStatus,
      financeDocuments: period.financeDocuments.map((item) =>
        item.id === document.id
          ? { ...item, status, reason: status === 'revision' ? selectedReason : undefined }
          : item,
      ),
      reviewHistory: [
        ...period.reviewHistory,
        {
          date: new Date().toISOString(),
          actor: account.name,
          text:
            status === 'approved'
              ? `${document.name} disetujui.`
              : `${document.name} perlu diganti (${selectedReason}).`,
        },
      ],
    })
    setFinanceReview(null)
    if (status === 'revision') setEditingReview(false)
    onToast(
      status === 'approved'
        ? 'Dokumen keuangan disetujui.'
        : 'Permintaan penggantian dokumen disimpan.',
    )
  }

  return (
    <>
      <button onClick={onBack} className="back-button">
        <span className="rotate-180">
          <Icon name="arrow" className="h-4 w-4" />
        </span>
        Kembali ke rekap
      </button>
      <PageHeading
        eyebrow={`${profile.fullName} · ${profile.registrationNumber}`}
        title={periodLabel(period.month, period.year)}
        description={
          readOnly
            ? canReview
              ? 'Pemeriksaan dikunci setelah keputusan tersimpan. Aktifkan Edit Pemeriksaan untuk melakukan koreksi.'
              : 'Mode monitoring hanya-baca. Jawaban awardee tidak dapat diubah.'
            : 'Setujui laporan per subbab atau tandai isian tertentu untuk diperbaiki.'
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            {canReview && hasFinalDecision && (
              <button
                onClick={() => {
                  setEditingReview(current => !current)
                  setReviewing(null)
                  setFinanceReview(null)
                  setSelectedQuestions([])
                  setReason('')
                  setDecisionNote('')
                }}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-extrabold shadow-sm ${
                  editingReview
                    ? 'border border-slate-200 bg-white text-slate-700'
                    : 'bg-amber-500 text-white'
                }`}
              >
                <Icon name={editingReview ? 'check' : 'save'} className="h-4 w-4" />
                {editingReview ? 'Selesai Edit' : 'Edit Pemeriksaan'}
              </button>
            )}
            <button
              onClick={() => exportPeriodPdf(period, profile, onToast)}
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-[10px] font-extrabold text-emerald-800 shadow-sm"
            >
              <Icon name="download" className="h-4 w-4" />
              Ekspor PDF
            </button>
            <OverallPill status={overallStatus(period)} />
          </div>
        }
      />
      {readOnly && (
        <div className={`mb-6 flex items-center gap-3 rounded-xl border p-4 text-xs font-semibold ${
          canReview ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-600'
        }`}>
          <Icon name={canReview ? 'lock' : 'eye'} className={`h-4 w-4 ${canReview ? 'text-amber-700' : 'text-emerald-700'}`} />
          {canReview
            ? 'Keputusan pemeriksaan sudah tersimpan dan dikunci untuk mencegah salah pencet. Klik Edit Pemeriksaan untuk mengubah keputusan, bagian revisi, atau dokumen keuangan.'
            : 'Akses akun ini bersifat hanya-baca.'}
        </div>
      )}
      {canReview && editingReview && hasFinalDecision && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="font-extrabold">Mode edit pemeriksaan aktif</p>
            <p className="mt-1 leading-5">
              Perubahan berikutnya menggantikan keputusan aktif sebelumnya. Periksa kembali pilihan sebelum menyimpan keputusan terbaru.
            </p>
          </div>
        </div>
      )}
      {!readOnly && (
        <section className="mb-6 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-emerald-700">
                Keputusan laporan
              </p>
              <h2 className="mt-1 text-base font-extrabold">Tentukan hasil pemeriksaan</h2>
              <p className="mt-1 text-[10px] text-slate-500">
                Catatan wajib untuk laporan yang perlu direvisi atau ditolak.
              </p>
              <textarea
                value={decisionNote}
                onChange={event => setDecisionNote(event.target.value)}
                maxLength={500}
                placeholder="Tulis catatan untuk awardee..."
                className="mt-4 min-h-24 w-full rounded-xl border border-slate-200 px-4 py-3 text-xs outline-none focus:border-emerald-500"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:w-[430px]">
              <button disabled={!!savingReview} onClick={() => void decideReport('approved')}
                className="rounded-xl bg-emerald-700 px-4 py-3 text-[10px] font-extrabold text-white">
                Terima Laporan
              </button>
              <button disabled={!!savingReview} onClick={() => void decideReport('revision')}
                className="rounded-xl bg-amber-500 px-4 py-3 text-[10px] font-extrabold text-white">
                Butuh Revisi
              </button>
              <button disabled={!!savingReview} onClick={() => void decideReport('rejected')}
                className="rounded-xl bg-rose-700 px-4 py-3 text-[10px] font-extrabold text-white">
                Tolak Laporan
              </button>
            </div>
          </div>
        </section>
      )}
      <div className="grid gap-6 xl:grid-cols-[1.65fr_.8fr]">
        <div className="space-y-5">
          {reportSections.map((section) => {
            const review = period.sectionReviews[section.key]
            const isReviewing = reviewing === section.key
            return (
              <section
                key={section.key}
                className={`rounded-2xl border bg-white p-5 shadow-sm ${
                  review?.status === 'revision' ? 'border-rose-300' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-xs font-extrabold text-emerald-700">
                    {reportSections.indexOf(section) + 1}
                  </span>
                  <div className="flex-1">
                    <h2 className="text-sm font-extrabold">{section.label}</h2>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {answeredInSection(period, section)} isian terjawab
                    </p>
                  </div>
                  <StatusPill status={review?.status ?? period.reportStatus} />
                  {!readOnly && (
                    <div className="flex gap-2">
                      <button
                        disabled={!!savingReview}
                        onClick={() => void approveSection(section.key)}
                        className="rounded-lg bg-emerald-700 px-3 py-2 text-[9px] font-extrabold text-white"
                      >
                        Setujui Bagian
                      </button>
                      <button
                        onClick={() => {
                          setReviewing(isReviewing ? null : section.key)
                          setSelectedQuestions(isReviewing ? [] : (review?.issues.map(item => item.questionId) ?? []))
                          setReason(isReviewing ? '' : (review?.issues[0]?.reason ?? ''))
                        }}
                        className="rounded-lg border border-rose-200 px-3 py-2 text-[9px] font-extrabold text-rose-700"
                      >
                        Perlu Perbaikan
                      </button>
                    </div>
                  )}
                </div>
                <details className="mt-4 rounded-xl bg-slate-50">
                  <summary className="cursor-pointer px-4 py-3 text-[10px] font-extrabold text-slate-600">
                    Lihat jawaban
                  </summary>
                  <div className="border-t border-slate-200 p-4">
                    <AnswerList period={period} section={section} />
                  </div>
                </details>
                {isReviewing && (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-[10px] font-extrabold text-rose-800">
                      Pilih minimal satu isian bermasalah
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {section.questions.map((question) => (
                        <label
                          key={question.id}
                          className="flex cursor-pointer items-start gap-2 rounded-lg bg-white p-3 text-[9px] font-semibold leading-4 text-slate-600"
                        >
                          <input
                            type="checkbox"
                            checked={selectedQuestions.includes(question.id)}
                            onChange={() =>
                              setSelectedQuestions((current) =>
                                current.includes(question.id)
                                  ? current.filter((item) => item !== question.id)
                                  : [...current, question.id],
                              )
                            }
                            className="mt-0.5 accent-rose-600"
                          />
                          {question.label}
                        </label>
                      ))}
                    </div>
                    <p className="mt-4 text-[10px] font-extrabold text-rose-800">Pilih alasan</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {reviewReasons.map((item) => (
                        <button
                          key={item}
                          onClick={() => setReason(item)}
                          className={`rounded-lg px-3 py-2 text-[9px] font-extrabold ${
                            reason === item
                              ? 'bg-rose-700 text-white'
                              : 'border border-rose-200 bg-white text-rose-700'
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    {reason && !reviewReasons.includes(reason) && (
                      <p className="mt-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-[9px] font-semibold text-rose-700">
                        Alasan tersimpan: {reason}
                      </p>
                    )}
                    <button
                      disabled={!!savingReview}
                      onClick={() => void requestRevision(section.key)}
                      className="mt-4 rounded-lg bg-rose-700 px-4 py-2.5 text-[10px] font-extrabold text-white"
                    >
                      Simpan Permintaan Perbaikan
                    </button>
                  </div>
                )}
              </section>
            )
          })}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-extrabold">Pemeriksaan Dokumen Keuangan</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {period.financeDocuments.map((document) => (
                <div
                  key={document.id}
                  className={`rounded-xl border p-4 ${
                    document.status === 'revision'
                      ? 'border-rose-300 bg-rose-50'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <Icon name="file" className="h-5 w-5 text-emerald-700" />
                    <StatusPill status={document.status} />
                  </div>
                  <p className="mt-4 truncate text-xs font-extrabold">{document.name}</p>
                  <p className="mt-1 text-[9px] text-slate-400">{formatFileSize(document.size)}</p>
                  {document.reason && (
                    <p className="mt-3 rounded-lg bg-rose-100 p-2 text-[9px] font-extrabold text-rose-700">
                      {document.reason}
                    </p>
                  )}
                  {!readOnly && (
                    <div className="mt-4">
                      <div className="flex gap-2">
                        <button
                          disabled={!!savingReview}
                          onClick={() => void updateFinance(document, 'approved')}
                          className="rounded-lg bg-emerald-700 px-3 py-2 text-[9px] font-extrabold text-white"
                        >
                          Setujui
                        </button>
                        <button
                          onClick={() =>
                            setFinanceReview(financeReview === document.id ? null : document.id)
                          }
                          className="rounded-lg border border-rose-200 px-3 py-2 text-[9px] font-extrabold text-rose-700"
                        >
                          Perlu Diganti
                        </button>
                      </div>
                      {financeReview === document.id && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {reviewReasons.map((item) => (
                            <button
                              key={item}
                              disabled={!!savingReview}
                              onClick={() => void updateFinance(document, 'revision', item)}
                              className="rounded-lg border border-rose-200 bg-white px-2.5 py-2 text-[8px] font-bold text-rose-700"
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside className="space-y-6">
          <SnapshotCard current={connected && !period.profileSnapshot} profile={period.profileSnapshot ?? profile} />
          <HistoryCard events={period.reviewHistory} />
        </aside>
      </div>
    </>
  )
}

function StaffAccountPage({ account }: { account: DemoAccount }) {
  return (
    <>
      <PageHeading
        eyebrow="Akun"
        title="Profil Saya"
        description="Informasi akun yang sedang digunakan."
      />
      <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Avatar name={account.name} />
          <div>
            <h2 className="text-lg font-extrabold">{account.name}</h2>
            <p className="mt-1 text-xs text-emerald-700">{account.roleLabel}</p>
          </div>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <Info label="ID beasiswa" value={account.username} />
          <Info label="Peran" value={account.roleLabel} />
          <Info label="Lembaga" value={account.institution ?? (account.role === 'ministry' ? 'Kementerian Agama' : '—')} />
          <Info label="Jumlah awardee dalam cakupan" value={String(account.scope?.length ?? 0)} />
        </dl>
      </div>
    </>
  )
}

function AccessDenied({ onBack }: { onBack: () => void }) {
  return (
    <div className="grid min-h-[65vh] place-items-center">
      <div className="max-w-md text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-rose-50 text-rose-700">
          <Icon name="lock" className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold">Akses tidak diizinkan</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Akun ini tidak memiliki izin untuk membuka halaman tersebut.
        </p>
        <button
          onClick={onBack}
          className="mt-6 rounded-xl bg-emerald-800 px-5 py-3 text-xs font-extrabold text-white"
        >
          Kembali ke Dashboard
        </button>
      </div>
    </div>
  )
}

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs font-extrabold text-emerald-700">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-[30px]">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  )
}

function FormCard({
  title,
  icon,
  children,
  editable = false,
}: {
  title: string
  icon: IconName
  children: ReactNode
  editable?: boolean
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>
        <h2 className="text-sm font-extrabold">{title}</h2>
        {editable && (
          <span className="ml-auto rounded-full bg-emerald-50 px-3 py-1 text-[8px] font-extrabold text-emerald-700">
            Dapat diubah
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

function StatusPill({ status }: { status: ReviewStatus }) {
  const tones: Record<ReviewStatus, string> = {
    draft: 'bg-slate-100 text-slate-600',
    submitted: 'bg-amber-50 text-amber-700',
    review: 'bg-violet-50 text-violet-700',
    revision: 'bg-rose-50 text-rose-700',
    approved: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-slate-900 text-white',
  }
  return (
    <span className={`w-fit rounded-full px-2.5 py-1 text-[8px] font-extrabold ${tones[status]}`}>
      {statusLabel(status)}
    </span>
  )
}

function OverallPill({ status }: { status: ReturnType<typeof overallStatus> }) {
  const label =
    status === 'incomplete'
      ? 'Belum lengkap'
      : status === 'approved'
        ? 'Disetujui'
        : status === 'revision'
          ? 'Perlu perbaikan'
        : status === 'rejected'
          ? 'Ditolak'
          : status === 'draft'
            ? 'Belum dikirim'
            : 'Dalam proses'
  const tone =
    status === 'approved'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'revision'
        ? 'bg-rose-100 text-rose-800'
        : status === 'rejected'
          ? 'bg-slate-900 text-white'
        : status === 'incomplete'
          ? 'bg-amber-100 text-amber-800'
          : 'bg-slate-100 text-slate-600'
  return (
    <span className={`w-fit rounded-full px-3 py-1.5 text-[9px] font-extrabold ${tone}`}>
      {label}
    </span>
  )
}

function StatusColumn({ label, status }: { label: string; status: ReviewStatus }) {
  return (
    <div>
      <p className="mb-1 text-[8px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <StatusPill status={status} />
    </div>
  )
}

function Avatar({ name, size = 'normal' }: { name: string; size?: 'small' | 'normal' }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-100 to-amber-50 font-extrabold text-emerald-800 ${
        size === 'small' ? 'h-9 w-9 text-[10px]' : 'h-10 w-10 text-xs'
      }`}
    >
      {initials(name)}
    </span>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <dt className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-xs font-extrabold text-slate-700">{value}</dd>
    </div>
  )
}

function reportCompletion(period: PeriodRecord) {
  const total = reportSections.reduce((sum, section) => sum + section.questions.length, 0)
  const answered = reportSections.reduce(
    (sum, section) => sum + answeredInSection(period, section),
    0,
  )
  return total ? Math.min(100, Math.round((answered / total) * 100)) : 0
}

function answeredInSection(period: PeriodRecord, section: ReportSection) {
  return section.questions.filter((question) => {
    const value = period.answers[question.id]
    return Array.isArray(value) ? value.length > 0 : Boolean(value?.trim())
  }).length
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatAnswer(value?: AnswerValue) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'Belum diisi'
  return value || 'Belum diisi'
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatFileSize(size: number) {
  return size > 1024 * 1024
    ? `${(size / 1024 / 1024).toFixed(2)} MB`
    : `${Math.round(size / 1024)} KB`
}

function matrixTone(status: ReturnType<typeof overallStatus>) {
  if (status === 'approved') return 'bg-emerald-600'
  if (status === 'rejected') return 'bg-slate-800'
  if (status === 'revision') return 'bg-rose-500'
  if (status === 'incomplete') return 'bg-amber-500'
  if (status === 'draft') return 'bg-slate-400'
  return 'bg-violet-500'
}


async function portalRequest<T>(path: string, method = 'GET', value?: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/portal/${path}`, {
      method, signal, credentials: 'same-origin', cache: 'no-store',
      headers: value === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: value === undefined ? undefined : JSON.stringify(value),
    })
  } catch { throw new Error('Server tidak terjangkau. Isian belum tersimpan; periksa koneksi lalu coba lagi.') }
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Permintaan gagal.')
  return result as T
}

function DatabasePortal() {
  const [data, setData] = useState<PortalSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const result = await portalRequest<PortalSession>('session', 'GET', undefined, signal)
    if (!signal?.aborted) {
      setData(result)
      setError('')
    }
    return result
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    async function restore() {
      try {
        const response = await fetch('/api/portal/session', { cache: 'no-store', signal: controller.signal })
        if (response.status === 401) return
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        if (!controller.signal.aborted) setData(result)
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Gagal memuat sesi.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void restore()
    return () => controller.abort()
  }, [])

  const logout = async () => {
    try {
      await portalRequest('logout', 'POST', {})
      setData(null)
      setError('')
    } catch { setError('Gagal keluar. Silakan coba lagi.') }
  }

  async function writeDraft(period: PeriodRecord, action: 'save' | 'clear') {
    const row = data?.drafts.find(draft => draft.periodId === period.id)
    if (!data || !row) throw new Error('Periode tidak ditemukan. Buka ulang laporan.')
    const target = {periodId: row.periodId, version: row.version}
    const {draft} = action === 'clear'
      ? await portalRequest<{draft: StoredDraft}>('drafts', 'DELETE', target)
      : await portalRequest<{draft: StoredDraft}>('drafts', 'PUT', {
          ...target, answers: period.answers, activities: period.activities,
        })
    setData(previous => previous && previous.user.id === data.user.id ? {
      ...previous, drafts: previous.drafts.map(r => r.periodId === draft.periodId ? draft : r),
      state: {...previous.state, periods: previous.state.periods.map(p => p.id === period.id
        ? {...p, answers: draft.answers, activities: draft.activities} : p)},
    } : previous)
  }

  const reviewPeriod = async (input: ReportReviewInput) => {
    const result = await portalRequest<PortalSession>('reviews', 'POST', input)
    setData(result)
  }

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f5f6f1] text-sm font-bold text-emerald-800">Menyiapkan SIM-BEZAKAT...</div>
  return <>
    {error && <p role="alert" className="bg-amber-50 p-4 text-center text-sm text-amber-900">{error}</p>}
    {data ? <PortalViews key={data.user.id} account={data.user} state={data.state}
      activePeriod={data.activePeriod} refresh={refresh} logout={() => void logout()}
      reviewPeriod={reviewPeriod}
      persistDraft={period => writeDraft(period, 'save')}
      clearDraft={period => writeDraft(period, 'clear')} /> : <LoginPage authenticate={async (idBeasiswa, password) => {
        await portalRequest('login', 'POST', {idBeasiswa, password})
        return (await refresh()).user
      }} onLogin={() => {}} />}
  </>
}
