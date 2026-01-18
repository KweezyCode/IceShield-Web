import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  baseUrl: string
  auth: {
    user: string
    pass: string
  }
  theme: 'light' | 'amoled'
  banDraftTargets: { type: 'USERNAME' | 'IP' | 'SUBNET' | 'ASN'; value: string }[]
  banDraftDetailId: number | null
  openAddBan: boolean
  setBaseUrl: (url: string) => void
  setAuth: (user: string, pass: string) => void
  setTheme: (theme: 'light' | 'amoled') => void
  setBanDraft: (targets: { type: 'USERNAME' | 'IP' | 'SUBNET' | 'ASN'; value: string }[], detailId?: number | null) => void
  clearBanDraft: () => void
  setOpenAddBan: (open: boolean) => void
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      baseUrl: '/api',
      auth: {
        user: '',
        pass: ''
      },
      theme: 'light',
      banDraftTargets: [],
      banDraftDetailId: null,
      openAddBan: false,
      setBaseUrl: (baseUrl) => set({ baseUrl }),
      setAuth: (user, pass) => set({ auth: { user, pass } }),
      setTheme: (theme) => set({ theme }),
      setBanDraft: (targets, detailId = null) => set({ banDraftTargets: targets, banDraftDetailId: detailId, openAddBan: true }),
      clearBanDraft: () => set({ banDraftTargets: [], banDraftDetailId: null }),
      setOpenAddBan: (open) => set({ openAddBan: open })
    }),
    {
      name: 'iceshield-storage'
    }
  )
)
