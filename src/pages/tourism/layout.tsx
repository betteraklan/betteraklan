import { Outlet, useLocation } from 'react-router-dom';

import { SidebarLayout } from '@/components/layout/SidebarLayout';

import TourismBottomBar from './components/TourismBottomBar';
import TourismSidebar from './components/TourismSidebar';
import TourismTabs from './components/TourismTabs';

export default function TourismPageLayout() {
  const location = useLocation();

  // Logic: Collapse if not on the index
  const isDeepPage = location.pathname !== '/tourism';

  return (
    <>
      <TourismTabs />
      <SidebarLayout
        sidebar={<TourismSidebar />}
        collapsible={true}
        defaultCollapsed={isDeepPage}
      >
        <Outlet />
      </SidebarLayout>
      <TourismBottomBar />
    </>
  );
}
