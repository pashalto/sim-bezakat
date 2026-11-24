import type { Access, CollectionConfig } from 'payload'

const isPayloadAdmin: Access = ({ req }) => req.user?.collection === 'admins'

export const StudentProfiles: CollectionConfig = {
  slug: 'student-profiles',
  labels: {
    singular: 'Profil Mahasiswa',
    plural: 'Profil Mahasiswa',
  },
  admin: {
    group: 'SIM-BEZAKAT',
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'registrationNumber', 'university', 'studyProgram'],
  },
  access: {
    create: isPayloadAdmin,
    delete: isPayloadAdmin,
    read: () => true,
    update: isPayloadAdmin,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Identitas Diri',
          fields: [
            { name: 'fullName', label: 'Nama Lengkap', type: 'text', required: true },
            {
              type: 'row',
              fields: [
                { name: 'birthPlace', label: 'Tempat Lahir', type: 'text' },
                { name: 'birthDate', label: 'Tanggal Lahir', type: 'date' },
              ],
            },
            {
              name: 'gender',
              label: 'Jenis Kelamin',
              type: 'select',
              options: [
                { label: 'Perempuan', value: 'female' },
                { label: 'Laki-laki', value: 'male' },
              ],
            },
            { name: 'identityAddress', label: 'Alamat Sesuai KTP', type: 'textarea' },
            {
              name: 'domicileType',
              label: 'Jenis Domisili',
              type: 'select',
              options: [
                { label: 'Rumah Orang Tua/Saudara', value: 'family-home' },
                { label: 'Asrama', value: 'dormitory' },
                { label: 'Kost', value: 'boarding-house' },
                { label: 'Lainnya', value: 'other' },
              ],
            },
            { name: 'domicileAddress', label: 'Alamat Domisili', type: 'textarea' },
            { name: 'guardianName', label: 'Nama Orang Tua/Wali', type: 'text' },
            { name: 'guardianContact', label: 'Kontak Orang Tua/Wali', type: 'text' },
            { name: 'socialMedia', label: 'Username Media Sosial', type: 'text' },
            {
              name: 'lastAllowanceReceived',
              label: 'Sudah Menerima Uang Bulanan',
              type: 'checkbox',
              defaultValue: false,
            },
          ],
        },
        {
          label: 'Data Kemahasiswaan',
          fields: [
            { name: 'university', label: 'Asal Perguruan Tinggi', type: 'text', required: true },
            { name: 'studyProgram', label: 'Program Studi', type: 'text', required: true },
            { name: 'studentNumber', label: 'NIM', type: 'text', required: true },
            { name: 'sponsor', label: 'Dewan Penyantun', type: 'text' },
            {
              name: 'registrationNumber',
              label: 'Nomor Registrasi BeZakat',
              type: 'text',
              required: true,
              unique: true,
              index: true,
            },
            { name: 'currentGpa', label: 'Indeks Prestasi', type: 'number', min: 0, max: 4 },
            { name: 'cohort', label: 'Angkatan', type: 'number' },
            {
              name: 'scholarshipStatus',
              label: 'Status Beasiswa',
              type: 'select',
              defaultValue: 'active',
              options: [
                { label: 'Aktif', value: 'active' },
                { label: 'Ditangguhkan', value: 'paused' },
                { label: 'Selesai', value: 'completed' },
              ],
            },
          ],
        },
      ],
    },
  ],
}
