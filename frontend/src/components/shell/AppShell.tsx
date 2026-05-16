import { useState, type ReactNode } from 'react';
import { Topbar } from './Topbar';
import { Tabs } from './Tabs';
import { FilterBar, FilterFields } from './FilterBar';
import { MobileFilterDrawer } from './MobileFilterDrawer';
import { ActiveFiltersChips } from './ActiveFiltersChips';
import { NavigationStrip } from './NavigationStrip';
import { Footer } from './Footer';
import { SearchBar } from '../SearchBar';
import { useUIFiltersStore } from '../../stores/uiFiltersStore';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeTab = useUIFiltersStore((s) => s.activeTab);

  return (
    <div
      className="flex w-full flex-col px-3 py-3 sm:px-4 sm:py-4 lg:px-6"
      style={{ background: 'var(--civ-bg)', gap: 8, minHeight: '100vh' }}
    >
      <Topbar />
      <Tabs />
      <FilterBar />
      <ActiveFiltersChips onOpen={() => setDrawerOpen(true)} />
      {activeTab === 'mapa' && (
        <div className="sm:hidden" style={{ padding: '0 4px' }}>
          <SearchBar />
        </div>
      )}
      <NavigationStrip />
      <main className="flex flex-col">{children}</main>
      <Footer />

      <MobileFilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <FilterFields layout="stacked" />
      </MobileFilterDrawer>
    </div>
  );
}
