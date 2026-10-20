import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserAccountItem, StoreItem, ShiftInfo } from '@/lib/types';

export interface ExtendedUserItem extends UserAccountItem {
  roleBadge?: string;
  initials?: string;
  storeName?: string;
}

interface SessionState {
  isLoggedIn: boolean;
  isStationLocked: boolean;
  user: ExtendedUserItem | null;
  store: StoreItem | null;
  shift: ShiftInfo | null;
  isSidebarCollapsed: boolean;
  isMobileMenuOpen: boolean;
  isFullscreen: boolean;

  // Actions
  login: (user: ExtendedUserItem, store: StoreItem) => void;
  logout: () => void;
  lockStation: () => void;
  unlockStation: () => void;
  setUser: (user: ExtendedUserItem | null) => void;
  setStore: (store: StoreItem | null) => void;
  setShift: (shift: ShiftInfo | null) => void;
  toggleSidebar: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  toggleFullscreen: () => void;

  // Role permissions
  isSuperAdmin: () => boolean;
  isStoreAdmin: () => boolean;
  isAdmin: () => boolean;
  isStaff: () => boolean;
  canAccessTreasury: () => boolean;
  canAccessReports: () => boolean;
  canAccessAiAdvisor: () => boolean;
  canAccessDashboard: () => boolean;
  canManageSettings: () => boolean;
  canRefund: () => boolean;
  canAdjustStock: () => boolean;
  canEditProducts: () => boolean;
  canAccessPurchases: () => boolean;
  canAccessBatches: () => boolean;
  canAccessStockAudit: () => boolean;
  canAccessExpenses: () => boolean;
  canAccessOnlineStock: () => boolean;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      isStationLocked: true,
      user: null,
      store: null,
      shift: null,
      isSidebarCollapsed: false,
      isMobileMenuOpen: false,
      isFullscreen: false,

      login: (user, store) =>
        set({
          isLoggedIn: true,
          isStationLocked: false,
          user,
          store,
        }),

      logout: () =>
        set({
          isLoggedIn: false,
          isStationLocked: true,
          user: null,
        }),

      lockStation: () =>
        set({
          isStationLocked: true,
        }),

      unlockStation: () =>
        set({
          isStationLocked: false,
        }),

      setUser: (user) => set({ user }),
      setStore: (store) => set({ store }),
      setShift: (shift) => set({ shift }),
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
      toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
      toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),

      // Computed permissions
      isSuperAdmin: () => get().user?.role === 'SUPER_ADMIN',
      isStoreAdmin: () => get().user?.role === 'STORE_ADMIN' || get().user?.role === 'ADMIN',
      isAdmin: () =>
        get().user?.role === 'SUPER_ADMIN' ||
        get().user?.role === 'STORE_ADMIN' ||
        get().user?.role === 'ADMIN',
      isStaff: () => get().user?.role === 'STAFF',
      canAccessTreasury: () => get().isAdmin(),
      canAccessReports: () => get().isAdmin(),
      canAccessAiAdvisor: () => get().isAdmin(),
      canAccessDashboard: () => get().isAdmin(),
      canManageSettings: () => get().isSuperAdmin(),
      canRefund: () => get().isAdmin(),
      canAdjustStock: () => get().isAdmin(),
      canEditProducts: () => get().isAdmin(),
      canAccessPurchases: () => get().isAdmin(),
      canAccessBatches: () => get().isAdmin(),
      canAccessStockAudit: () => get().isAdmin(),
      canAccessExpenses: () => get().isAdmin(),
      canAccessOnlineStock: () => get().isAdmin(),
    }),
    {
      name: 'eyenova-session-storage',
      version: 3,
      migrate: (persistedState: any) => {
        if (persistedState) {
          if (
            persistedState.user?.id === 'USR-STAFF' ||
            persistedState.user?.username === 'staff' ||
            persistedState.user?.fullName?.includes('Sarah')
          ) {
            persistedState.user = null;
            persistedState.isLoggedIn = false;
            persistedState.isStationLocked = true;
          }
          if (persistedState.shift) {
            if (persistedState.shift.id === 'SHIFT-AUTO' || persistedState.shift.openingCash === 500) {
              persistedState.shift = null;
            }
          }
        }
        return persistedState;
      },
      onRehydrateStorage: () => (state) => {
        if (
          state?.user?.id === 'USR-STAFF' ||
          state?.user?.username === 'staff' ||
          state?.user?.fullName?.includes('Sarah')
        ) {
          state.logout();
        }
        if (state?.shift && (state.shift.id === 'SHIFT-AUTO' || state.shift.openingCash === 500)) {
          state.setShift(null);
        }
      },
    }
  )
);
