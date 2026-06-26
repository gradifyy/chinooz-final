import type { User } from '@chinooz/types'

export const users: User[] = [
  {
    id: 'user-1',
    phone: '9841234567',
    name: 'Ayush Chaudhary',
    email: 'ayush@example.com',
    avatar: 'https://i.pravatar.cc/150?u=ayush',
    addresses: [
      {
        id: 'addr-1',
        label: 'Home',
        fullName: 'Ayush Chaudhary',
        phone: '9841234567',
        province: 'Bagmati',
        district: 'Kathmandu',
        municipality: 'Kathmandu Metropolitan City',
        wardNo: '10',
        street: 'Baneshwor Height',
        isDefault: true,
      },
      {
        id: 'addr-2',
        label: 'Office',
        fullName: 'Ayush Chaudhary',
        phone: '9841234567',
        province: 'Bagmati',
        district: 'Lalitpur',
        municipality: 'Lalitpur Metropolitan City',
        wardNo: '6',
        street: 'Pulchowk',
        isDefault: false,
      },
    ],
    defaultAddressId: 'addr-1',
  },
]

export function getUserById(id: string): User | undefined {
  return users.find(u => u.id === id)
}
