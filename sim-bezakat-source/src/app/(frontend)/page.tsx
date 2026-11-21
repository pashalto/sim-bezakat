import PortalApp from '@/components/PortalApp'

export const dynamic = 'force-dynamic'
export default function HomePage() {
  return <PortalApp storageMode={process.env.BEZAKAT_STORAGE === 'demo' ? 'demo' : 'postgres'} />
}
