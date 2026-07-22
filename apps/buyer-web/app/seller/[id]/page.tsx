import { getSellerStorefront } from '@chinooz/mock-data'
import SellerStorefrontClient from './SellerStorefrontClient'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getSellerStorefront(id)
  if (!data) return { title: 'Seller — Chinooz' }
  return {
    title: `${data.seller.name} — Chinooz`,
    description: `Shop ${data.seller.productCount} products from ${data.seller.name} on Chinooz.`,
  }
}

export default async function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SellerStorefrontClient sellerId={id} />
}
