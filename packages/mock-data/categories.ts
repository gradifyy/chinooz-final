import type { Category } from '@chinooz/types'

export const categories: Category[] = [
  {
    id: 'cat-1',
    slug: 'electronics',
    name: 'Electronics',
    nameNe: 'इलेक्ट्रोनिक्स',
    description: 'Gadgets, mobile phones, laptops & accessories',
    image: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=400',
    productCount: 48,
  },
  {
    id: 'cat-2',
    slug: 'fashion',
    name: 'Fashion',
    nameNe: 'फेसन',
    description: 'Clothing, footwear & accessories for men, women & kids',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
    productCount: 72,
  },
  {
    id: 'cat-3',
    slug: 'groceries',
    name: 'Groceries',
    nameNe: 'किराना',
    description: 'Daily essentials, rice, dal, oil & spices',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
    productCount: 105,
  },
  {
    id: 'cat-4',
    slug: 'home-kitchen',
    name: 'Home & Kitchen',
    nameNe: 'घर र भान्सा',
    description: 'Furniture, cookware, decor & appliances',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
    productCount: 56,
  },
  {
    id: 'cat-5',
    slug: 'beauty-health',
    name: 'Beauty & Health',
    nameNe: 'सौन्दर्य र स्वास्थ्य',
    description: 'Skincare, makeup, supplements & wellness',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
    productCount: 63,
  },
  {
    id: 'cat-6',
    slug: 'sports',
    name: 'Sports & Outdoors',
    nameNe: 'खेलकुद र बाहिरी',
    description: 'Sports gear, fitness equipment & outdoor accessories',
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400',
    productCount: 34,
  },
  {
    id: 'cat-7',
    slug: 'books-stationery',
    name: 'Books & Stationery',
    nameNe: 'पुस्तक र स्टेसनरी',
    description: 'Books, pens, notebooks & office supplies',
    image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400',
    productCount: 41,
  },
  {
    id: 'cat-8',
    slug: 'baby-kids',
    name: 'Baby & Kids',
    nameNe: 'बच्चा र बालबालिका',
    description: 'Toys, baby care, clothing & accessories',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
    productCount: 29,
  },
  {
    id: 'cat-9',
    slug: 'automotive',
    name: 'Automotive',
    nameNe: 'अटोमोटिभ',
    description: 'Bike & car accessories, lubricants & tools',
    image: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=400',
    productCount: 22,
  },
  {
    id: 'cat-10',
    slug: 'jewelry',
    name: 'Jewelry & Accessories',
    nameNe: 'गहना र सहायक',
    description: 'Gold, silver, fashion jewelry & watches',
    image: 'https://images.unsplash.com/photo-1515562141589-6773d5c3b9c7?w=400',
    productCount: 38,
  },
]

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find(c => c.slug === slug)
}

export function getCategoryById(id: string): Category | undefined {
  return categories.find(c => c.id === id)
}
