export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  navbar: 30,
  modal: 40,
  toast: 50,
  tooltip: 60,
  max: 9999,
} as const

export type ZIndexToken = keyof typeof zIndex
