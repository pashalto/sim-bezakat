import 'server-only'
import { withDatabase } from './database'
import type { DemoProfile, DemoState, PeriodRecord, ReviewStatus, SemesterTranscript } from '@/lib/demo-data'
import type { PortalSession, PortalUser, StoredDraft } from '@/lib/portal-contract'

type ProfileFields = Partial<DemoProfile> & Pick<DemoProfile, 'ownerId' | 'fullName'>
type Academic = SemesterTranscript & { verifiedGpa: number | null; verifiedIps: number | null }
type Report = Pick<PeriodRecord, 'ownerId' | 'month' | 'year' | 'activities' | 'answers' | 'financeDocuments' | 'reviewHistory' | 'submittedAt'> & {
  reportId: string
  periodId: string
  status: string
  snapshot: ProfileFields | null
}
type Overview = {
  profiles: ProfileFields[]
  academics: Academic[]
  reports: Report[]
  activePeriod: PortalSession['activePeriod']
  institution: string | null
}
type ReviewProgress = {
  reportId: string
  detail: {
    sections?: PeriodRecord['sectionReviews']
    finance?: Record<string, { status: ReviewStatus; issues?: Array<{reason?: string}> }>
  }
}

function profileFrom(fields: ProfileFields, academic: Academic[] = []): DemoProfile {
  const profile: DemoProfile = {
    ownerId: fields.ownerId, fullName: fields.fullName, photoName: '', photoUrl: '', birthPlace: '',
    birthDate: '', gender: '', identityAddress: '', domicileType: '', domicileAddress: '', guardianName: '',
    guardianContact: '', socialMedia: '', university: '', studyProgram: '', studentNumber: '', sponsor: '',
    registrationNumber: '', gpaValue: '', gpaType: 'IPK', gpaSemester: '', gpaHistory: [],
  }
  Object.assign(profile, Object.fromEntries(Object.entries(fields).filter(([,v]) => v != null)))
  for (const record of academic) {
    if (record.ownerId !== fields.ownerId) continue
    profile.gpaSemester = `Semester ${record.semester}`
    if (record.verifiedGpa != null) {
      profile.gpaHistory[record.semester - 1] = record.verifiedGpa
      profile.gpaValue = record.verifiedGpa.toFixed(2).replace('.', ',')
    }
  }
  return profile
}

const statuses: Record<string, ReviewStatus> = {
  draf: 'draft', perlu_revisi: 'revision', disetujui: 'approved', ditolak: 'rejected', diajukan: 'submitted',
}

export async function portalSession(user: PortalUser): Promise<PortalSession> {
  return withDatabase(async client => {
    const { rows: [row] } = await client.query<{overview: Overview; drafts: StoredDraft[]; reviews: ReviewProgress[]}>(
      `SELECT sim_bezakat.portal_ringkasan($1) AS overview,
        CASE WHEN $2='awardee' THEN sim_bezakat.portal_daftar_draf($1) ELSE '[]'::jsonb END AS drafts,
        CASE WHEN $2='awardee' OR $2='coordinator' THEN sim_bezakat.portal_daftar_pemeriksaan($1) ELSE '[]'::jsonb END AS reviews`,
      [user.id, user.role])
    const { overview, drafts, reviews } = row
    const profiles = Object.fromEntries(overview.profiles.map(p => [p.ownerId, profileFrom(p, overview.academics)]))
    const source = user.role === 'awardee'
      ? drafts.map(draft => ({ ...draft, ownerId: user.id }))
      : overview.reports
    const periods = source.map((entry): PeriodRecord => {
      const details = overview.reports.find(r => r.ownerId === entry.ownerId && r.periodId === entry.periodId)
      const review = details ? reviews.find(item => item.reportId === details.reportId)?.detail : undefined
      const financeDocuments = (details?.financeDocuments ?? []).map(document => {
        const financeReview = review?.finance?.[document.id]
        return financeReview ? {
          ...document,
          status: financeReview.status,
          reason: financeReview.issues?.map(issue => issue.reason).filter(Boolean).join('; ') || undefined,
        } : document
      })
      return {
        id: user.role === 'awardee' ? entry.periodId : `${entry.ownerId}:${entry.periodId}`,
        reportId: details?.reportId,
        ownerId: entry.ownerId, year: entry.year, month: entry.month, reportStatus: statuses[entry.status],
        answers: entry.answers, activities: entry.activities, sectionReviews: review?.sections ?? {},
        financeDocuments, reviewHistory: details?.reviewHistory ?? [],
        submittedAt: details?.submittedAt,
        profileSnapshot: details?.snapshot ? profileFrom({...details.snapshot, ownerId: entry.ownerId}) : undefined,
      }
    })
    const state: DemoState = { profiles, periods, transcripts: overview.academics }
    return { user: {...user, scope: Object.keys(profiles), institution: overview.institution ?? undefined},
      drafts, state, activePeriod: overview.activePeriod }
  })
}
