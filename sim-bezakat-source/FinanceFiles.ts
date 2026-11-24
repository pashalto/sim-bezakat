import type { Access, CollectionConfig } from 'payload'

const isPayloadAdmin: Access = ({ req }) => req.user?.collection === 'admins'

export const FinanceFiles: CollectionConfig = {
  slug: 'finance-files',
  labels: {
    singular: 'File Keuangan',
    plural: 'File Keuangan',
  },
  admin: {
    group: 'SIM-BEZAKAT',
    useAsTitle: 'label',
  },
  access: {
    create: () => true,
    delete: isPayloadAdmin,
    read: isPayloadAdmin,
    update: isPayloadAdmin,
  },
  fields: [
    {
      name: 'label',
      label: 'Nama Dokumen',
      type: 'text',
      required: true,
    },
    {
      name: 'periodKey',
      label: 'Periode',
      type: 'text',
      index: true,
    },
  ],
  upload: {
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ],
    modifyResponseHeaders: ({ headers }) => {
      headers.set('Cache-Control', 'private, no-store')
      return headers
    },
  },
}
