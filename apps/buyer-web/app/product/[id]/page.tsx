export default function ProductPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text">Product Detail</h1>
      <p className="text-sm text-text-muted mt-2">ID: {params.id}</p>
    </div>
  )
}
