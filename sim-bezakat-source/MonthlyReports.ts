import type { Access, CollectionBeforeValidateHook, CollectionConfig, FieldAccess } from 'payload'

const isPayloadAdmin: Access = ({ req }) => req.user?.collection === 'admins'
const isPayloadAdminField: FieldAccess = ({ req }) => req.user?.collection === 'admins'

const monthLabels = [
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

const setPeriodFields: CollectionBeforeValidateHook = ({ data }) => {
  if (!data?.month || !data?.year) return data

  const month = Number(data.month)
  const year = Number(data.year)
  const deadline = new Date(Date.UTC(year, month, 10, 16, 59, 59))
  data.periodKey = `${year}-${String(month).padStart(2, '0')}`
  data.title = `${monthLabels[month - 1]} ${year}`
  data.deadline = deadline.toISOString()
  return data
}

export const MonthlyReports: CollectionConfig = {
  slug: 'monthly-reports',
  labels: {
    singular: 'Laporan Bulanan',
    plural: 'Laporan Bulanan',
  },
  admin: {
    group: 'SIM-BEZAKAT',
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'progress', 'submittedAt'],
  },
  access: {
    create: () => true,
    delete: isPayloadAdmin,
    read: () => true,
    update: isPayloadAdmin,
  },
  hooks: {
    beforeValidate: [setPeriodFields],
  },
  fields: [
    { name: 'title', label: 'Periode Laporan', type: 'text', admin: { readOnly: true } },
    {
      type: 'row',
      fields: [
        {
          name: 'month',
          label: 'Bulan',
          type: 'number',
          min: 1,
          max: 12,
          required: true,
        },
        { name: 'year', label: 'Tahun', type: 'number', min: 2020, required: true },
      ],
    },
    {
      name: 'periodKey',
      label: 'Kunci Periode',
      type: 'text',
      unique: true,
      index: true,
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      defaultValue: 'submitted',
      access: {
        create: isPayloadAdminField,
        update: isPayloadAdminField,
      },
      options: [
        { label: 'Draf', value: 'draft' },
        { label: 'Terkirim', value: 'submitted' },
        { label: 'Diterima', value: 'accepted' },
        { label: 'Perlu Revisi', value: 'revision' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'progress',
      label: 'Progres',
      type: 'number',
      defaultValue: 100,
      min: 0,
      max: 100,
      access: {
        create: isPayloadAdminField,
        update: isPayloadAdminField,
      },
      admin: { position: 'sidebar' },
    },
    {
      name: 'deadline',
      label: 'Batas Pengisian',
      type: 'date',
      access: {
        create: isPayloadAdminField,
        update: isPayloadAdminField,
      },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'submittedAt',
      label: 'Waktu Pengiriman',
      type: 'date',
      defaultValue: () => new Date().toISOString(),
      access: {
        create: isPayloadAdminField,
        update: isPayloadAdminField,
      },
      admin: { position: 'sidebar' },
    },
    {
      name: 'acceptedAt',
      label: 'Waktu Diterima',
      type: 'date',
      access: {
        create: isPayloadAdminField,
        update: isPayloadAdminField,
      },
      admin: { position: 'sidebar' },
    },
    {
      name: 'answers',
      label: 'Jawaban Asesmen',
      type: 'json',
      required: true,
    },
    {
      name: 'financeFile',
      label: 'Spreadsheet Keuangan',
      type: 'upload',
      relationTo: 'finance-files',
    },
    {
      name: 'reviewNote',
      label: 'Catatan Reviewer',
      type: 'textarea',
      access: {
        create: isPayloadAdminField,
        update: isPayloadAdminField,
      },
    },
  ],
}
