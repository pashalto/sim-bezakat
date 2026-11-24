import { reportSections } from './report-questions'

export type Role = 'awardee' | 'coordinator' | 'institution' | 'ministry'
export type ReviewStatus = 'draft' | 'submitted' | 'review' | 'revision' | 'approved'
export type AnswerValue = string | string[]

export type DemoAccount = {
  id: string
  username: string
  name: string
  role: Role
  roleLabel: string
  scope?: string[]
  institution?: string
}

export type DemoProfile = {
  ownerId: string
  scholarshipStatus?: string
  photoName: string
  photoUrl: string
  fullName: string
  birthPlace: string
  birthDate: string
  gender: string
  identityAddress: string
  domicileType: string
  domicileAddress: string
  guardianName: string
  guardianContact: string
  socialMedia: string
  university: string
  studyProgram: string
  studentNumber: string
  sponsor: string
  registrationNumber: string
  gpaValue: string
  gpaType: 'IPS' | 'IPK'
  gpaSemester: string
  gpaHistory: number[]
}

export type ReviewIssue = {
  questionId: string
  reason: string
}

export type SectionReview = {
  status: ReviewStatus
  issues: ReviewIssue[]
}

export type FinanceDocument = {
  version?: number
  id: string
  category: 'current' | 'next'
  name: string
  size: number
  uploadedAt: string
  status: ReviewStatus
  reason?: string
}

export type ReviewEvent = {
  date: string
  actor: string
  text: string
}

export type OrganizationActivity = {
  id: string
  name: string
  type: string
  role: string
  description: string
  evidence: string
}

export type SemesterTranscript = {
  verifiedGpa?: number | null
  verifiedIps?: number | null
  id: string
  ownerId: string
  semester: number
  academicYear: string
  name: string
  size: number
  uploadedAt: string
  status: ReviewStatus
  reason?: string
}

export type PeriodRecord = {
  id: string
  reportId?: string
  ownerId: string
  month: number
  year: number
  reportStatus: ReviewStatus
  answers: Record<string, AnswerValue>
  activities: OrganizationActivity[]
  sectionReviews: Record<string, SectionReview>
  financeDocuments: FinanceDocument[]
  submittedAt?: string
  allowanceReceived?: boolean
  profileSnapshot?: DemoProfile
  reviewHistory: ReviewEvent[]
}

export type DemoState = {
  profiles: Record<string, DemoProfile>
  periods: PeriodRecord[]
  transcripts: SemesterTranscript[]
}

export const demoAccounts: DemoAccount[] = [
  {
    id: 'awardee-aulia',
    username: 'BZI-251-0000001',
    name: 'Aulia Contoh',
    role: 'awardee',
    roleLabel: 'Awardee',
    institution: 'LAZ Amanah Nusantara',
  },
  {
    id: 'awardee-fikri',
    username: 'BZI-251-0000002',
    name: 'Fikri Contoh',
    role: 'awardee',
    roleLabel: 'Awardee',
    institution: 'LAZ Amanah Nusantara',
  },
  {
    id: 'awardee-salma',
    username: 'BZI-251-0000003',
    name: 'Salma Contoh',
    role: 'awardee',
    roleLabel: 'Awardee',
    institution: 'LAZ Cahaya Umat',
  },
  {
    id: 'coordinator-nadia',
    username: 'BZI-001-0000001',
    name: 'Nadia Contoh',
    role: 'coordinator',
    roleLabel: 'Koordinator Awardee',
    scope: ['awardee-aulia', 'awardee-fikri'],
  },
  {
    id: 'institution-rahman',
    username: 'BZI-251-0000005',
    name: 'Rahman Contoh',
    role: 'institution',
    roleLabel: 'Pengelola Lembaga Zakat',
    scope: ['awardee-aulia', 'awardee-fikri'],
    institution: 'LAZ Amanah Nusantara',
  },
  {
    id: 'ministry-siti',
    username: 'BZI-251-0000006',
    name: 'Siti Contoh',
    role: 'ministry',
    roleLabel: 'Pengelola Kemenag',
    scope: ['awardee-aulia', 'awardee-fikri', 'awardee-salma'],
  },
]

const profile = (
  ownerId: string,
  fullName: string,
  studentNumber: string,
  registrationNumber: string,
  university: string,
): DemoProfile => ({
  ownerId,
  photoName: '',
  photoUrl: '',
  fullName,
  birthPlace: 'Bandung',
  birthDate: '2005-08-17',
  gender: 'Perempuan',
  identityAddress: 'Alamat Contoh, Kota Contoh',
  domicileType: 'Asrama',
  domicileAddress: 'Asrama Contoh, Kota Contoh',
  guardianName: 'Wali Contoh',
  guardianContact: '000000000000',
  socialMedia: 'contoh.example.invalid',
  university,
  studyProgram: 'Ilmu Komputer',
  studentNumber,
  sponsor: 'LAZ Amanah Nusantara',
  registrationNumber,
  gpaValue: '3,88',
  gpaType: 'IPK',
  gpaSemester: 'Semester 8',
  gpaHistory: [3.42, 3.55, 3.63, 3.7, 3.68, 3.76, 3.81, 3.88],
})

const defaultReviews = (status: ReviewStatus): Record<string, SectionReview> =>
  Object.fromEntries(reportSections.map((section) => [section.key, { status, issues: [] }]))

const sampleAnswers: Record<string, AnswerValue> = {
  parent_rating: '5 · Sangat baik',
  parent_communication: ['Komunikasi setiap hari', 'Hubungan harmonis dan saling mendukung'],
  lecturer_rating: '4 · Baik',
  peer_rating: '5 · Sangat baik',
  mentor_rating: '4 · Baik',
  bullying_experience: 'Tidak pernah',
  monthly_domicile: 'Asrama',
  schedule: '4 · Baik',
  material: '4 · Baik',
  motivation: '5 · Sangat baik',
  confidence: '4 · Baik',
  balance: '4 · Baik',
  stress: '4 · Baik',
  emotion: '4 · Baik',
  hobby_time: '3 · Cukup',
  current_challenges: ['Manajemen waktu'],
  challenge_story: 'Saya menyusun prioritas mingguan dan berdiskusi dengan teman belajar.',
  talent_mapping_score: '4 · Diterapkan konsisten',
  talent_mapping: ['Optimalisasi cara belajar', 'Manajemen diri dan produktivitas'],
  next_month_targets: ['Pencapaian akademik', 'Peningkatan keterampilan'],
  next_month_strategy:
    'Menyusun jadwal belajar dan mengikuti satu kelas pengembangan keterampilan.',
  long_term_targets: ['Akademik', 'Karier dan profesional', 'Finansial'],
  academic_strategy: 'Menjaga IPK dan aktif dalam proyek riset.',
  career_strategy: 'Membangun portofolio dan mencari pengalaman magang.',
  financial_strategy: 'Membangun kebiasaan menabung untuk dana darurat.',
  self_growth_strategy: 'Berlatih public speaking secara rutin.',
  social_strategy: 'Terlibat dalam kegiatan pendidikan masyarakat.',
  life_strategy: 'Menjaga pola tidur dan olahraga teratur.',
  organization_status: 'Mengikuti',
  organization_types: ['Himpunan mahasiswa/prodi'],
  committee_scope: ['Tingkat program studi'],
  committee_field: ['Akademik'],
  organization_role: ['Anggota'],
  organization_story: 'Aktif membantu pelaksanaan kelas pengembangan akademik.',
  prayer_early: '91–120 kali',
  night_prayer: '1–10 kali',
  dhuha_prayer: '11–15 kali',
  quran_reading: '6–10 juz',
  memorization: '11–20 surat',
  charity: 'Rp31.000–Rp60.000',
  speaker_count: 'Tidak Ada',
  speaker_topic: ['Tidak Ada'],
  study_count: '2 kali',
  study_topics: ['Akhlak dan tasawuf'],
  religious_contribution: ['Peserta kajian'],
  book_category: ['Nonreligius'],
  book_story: 'Atomic Habits, tentang membangun kebiasaan kecil secara konsisten.',
  religious_activity: ['Peserta kajian'],
  academic_achievement: ['Tidak Ada'],
  innovation_achievement: ['Tidak Ada'],
  delegation: ['Tidak Ada'],
  nonacademic_achievement: ['Tidak Ada'],
  competencies: ['Microsoft Office'],
  competency_story: 'Menyelesaikan pelatihan spreadsheet tingkat menengah.',
  community_activities: ['Pendidikan dan pengembangan diri'],
  community_story: 'Mendampingi belajar anak-anak di lingkungan asrama.',
  social_project_status: 'Belum Ada',
  social_project: ['Belum Ada'],
  executive_summary:
    'Bulan ini saya lebih teratur mengelola kegiatan akademik dan mulai meningkatkan kontribusi sosial.',
}

const financeDocs = (prefix: string, status: ReviewStatus = 'approved'): FinanceDocument[] => [
  {
    id: `${prefix}-current`,
    category: 'current',
    name: `Keuangan-${prefix}.xlsx`,
    size: 286720,
    uploadedAt: '2026-02-07T09:30:00.000Z',
    status,
  },
  {
    id: `${prefix}-next`,
    category: 'next',
    name: `Rencana-${prefix}-berikutnya.xlsx`,
    size: 174080,
    uploadedAt: '2026-02-07T09:35:00.000Z',
    status: 'approved',
  },
]

const period = (
  ownerId: string,
  month: number,
  status: ReviewStatus,
  financeStatus: ReviewStatus = 'approved',
): PeriodRecord => {
  const year = 2026
  const reviews = defaultReviews(status === 'approved' ? 'approved' : status)
  return {
    id: `${ownerId}-${year}-${String(month).padStart(2, '0')}`,
    reportId: `${ownerId}-${year}-${String(month).padStart(2, '0')}`,
    ownerId,
    month,
    year,
    reportStatus: status,
    answers:
      status === 'draft'
        ? { parent_rating: '5 · Sangat baik', monthly_domicile: 'Asrama' }
        : { ...sampleAnswers },
    activities:
      status === 'draft'
        ? []
        : [
            {
              id: `${ownerId}-${month}-activity`,
              name: 'Himpunan Mahasiswa Teknologi',
              type: 'Organisasi',
              role: 'Anggota',
              description: 'Mendukung kelas pengembangan akademik untuk mahasiswa baru.',
              evidence: 'https://drive.example/kegiatan-demo',
            },
          ],
    sectionReviews: reviews,
    financeDocuments:
      status === 'draft'
        ? []
        : financeDocs(`${year}-${String(month).padStart(2, '0')}`, financeStatus),
    submittedAt:
      status === 'draft'
        ? undefined
        : `2026-${String(month + 1).padStart(2, '0')}-07T09:42:00.000Z`,
    allowanceReceived: month < 5,
    profileSnapshot: status === 'draft' ? undefined : undefined,
    reviewHistory:
      status === 'draft'
        ? []
        : [
            {
              date: `2026-${String(month + 1).padStart(2, '0')}-08T10:00:00.000Z`,
              actor: 'Koordinator',
              text:
                status === 'approved' ? 'Seluruh bagian laporan disetujui.' : 'Laporan diperiksa.',
            },
          ],
  }
}

export function createInitialDemoState(): DemoState {
  const profiles: Record<string, DemoProfile> = {
    'awardee-aulia': {
      ...profile(
        'awardee-aulia',
        'Aulia Contoh',
        'DEMO-NIM-001',
        'BZI-251-0000001',
        'Universitas Contoh Nusantara',
      ),
      birthPlace: 'Kota Contoh',
      birthDate: '2005-01-01',
      gender: 'Perempuan',
      identityAddress: 'Alamat Contoh, Kota Contoh',
      domicileType: 'Asrama',
      domicileAddress: 'Asrama Contoh, Kota Contoh',
      guardianName: 'Wali Contoh',
      guardianContact: '000000000000',
      socialMedia: 'contoh.example.invalid',
      studyProgram: 'Ilmu Komputer',
      sponsor: 'LAZ Amanah Nusantara',
      gpaValue: '3,67',
      gpaType: 'IPK',
      gpaSemester: 'Semester 1',
      gpaHistory: [3.67, 0, 0, 0, 0, 0, 0, 0],
    },
    'awardee-fikri': {
      ...profile(
        'awardee-fikri',
        'Fikri Contoh',
        'EK240087',
        'BZI-251-0000002',
        'Universitas Negeri Sejahtera',
      ),
      gender: 'Laki-laki',
      studyProgram: 'Ekonomi Syariah',
    },
    'awardee-salma': {
      ...profile(
        'awardee-salma',
        'Salma Contoh',
        'KM240061',
        'BZI-251-0000003',
        'Institut Pendidikan Madani',
      ),
      studyProgram: 'Pendidikan Matematika',
      sponsor: 'LAZ Cahaya Umat',
    },
  }

  const january = period('awardee-aulia', 1, 'approved')
  january.profileSnapshot = { ...profiles['awardee-aulia'] }
  const february = period('awardee-aulia', 2, 'approved')
  february.profileSnapshot = { ...profiles['awardee-aulia'] }
  const march = period('awardee-aulia', 3, 'revision')
  march.sectionReviews = defaultReviews('approved')
  march.sectionReviews.akademik = {
    status: 'revision',
    issues: [{ questionId: 'material', reason: 'Data tidak konsisten' }],
  }
  march.reportStatus = 'revision'
  march.profileSnapshot = { ...profiles['awardee-aulia'] }
  march.reviewHistory.push({
    date: '2026-04-09T13:20:00.000Z',
    actor: 'Nadia Contoh',
    text: 'Bagian Akademik perlu perbaikan pada 1 isian.',
  })
  const april = period('awardee-aulia', 4, 'approved', 'revision')
  april.financeDocuments[0].status = 'revision'
  april.financeDocuments[0].reason = 'Berkas tidak terbaca'
  april.profileSnapshot = { ...profiles['awardee-aulia'] }
  april.reviewHistory.push({
    date: '2026-05-09T11:00:00.000Z',
    actor: 'Nadia Contoh',
    text: 'Dokumen keuangan periode berjalan perlu diganti.',
  })
  const may = period('awardee-aulia', 5, 'draft')

  const otherPeriods = [
    period('awardee-fikri', 1, 'approved'),
    period('awardee-fikri', 2, 'approved'),
    period('awardee-fikri', 3, 'submitted'),
    period('awardee-fikri', 4, 'draft'),
    period('awardee-salma', 1, 'approved'),
    period('awardee-salma', 2, 'revision'),
  ]

  return {
    profiles,
    periods: [january, february, march, april, may, ...otherPeriods],
    transcripts: [],
  }
}

export const demoNow = new Date('2026-06-05T12:00:00+07:00')
export const monthNames = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

export function activePeriodFor(now: Date) {
  const date = new Date(now)
  if (date.getDate() < 10) date.setMonth(date.getMonth() - 1)
  return { month: date.getMonth() + 1, year: date.getFullYear() }
}

export function periodLabel(month: number, year: number) {
  return `${monthNames[month - 1]} ${year}`
}

export function statusLabel(status: ReviewStatus) {
  const labels: Record<ReviewStatus, string> = {
    draft: 'Belum dikirim',
    submitted: 'Terkirim',
    review: 'Menunggu pemeriksaan ulang',
    revision: 'Perlu perbaikan',
    approved: 'Disetujui',
  }
  return labels[status]
}

export function financeStatus(record: PeriodRecord): ReviewStatus {
  if (!record.financeDocuments.length) return 'draft'
  if (record.financeDocuments.some((doc) => doc.status === 'revision')) return 'revision'
  if (record.financeDocuments.every((doc) => doc.status === 'approved')) return 'approved'
  if (record.financeDocuments.every((doc) => doc.status === 'draft')) return 'draft'
  if (record.financeDocuments.some((doc) => doc.status === 'review')) return 'review'
  return 'submitted'
}

export function overallStatus(record: PeriodRecord): ReviewStatus | 'incomplete' {
  const finance = financeStatus(record)
  if (record.reportStatus === 'revision' || finance === 'revision') return 'revision'
  if (record.reportStatus === 'approved' && finance === 'approved') return 'approved'
  if (record.reportStatus === 'draft' && finance === 'draft') return 'draft'
  if (record.reportStatus === 'approved' && finance !== 'approved') return 'incomplete'
  return 'submitted'
}

// Identitas akun demo diperbarui tanpa menghapus draf atau snapshot laporan lama.
export function syncDemoAccountIds(saved: DemoState): DemoState {
  return {
    ...saved,
    profiles: Object.fromEntries(
      Object.entries(saved.profiles).map(([key, value]) => {
        const account = demoAccounts.find((item) => item.id === key && item.role === 'awardee')
        return [key, account ? { ...value, registrationNumber: account.username } : value]
      }),
    ),
  }
}
