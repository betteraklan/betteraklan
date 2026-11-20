import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import TourismBottomBar from './components/TourismBottomBar';
import TourismTabs from './components/TourismTabs';

/**
 * Tourism shell: the Visit Aklan tab row (which replaced the sidebar), the
 * page card, and the phone bottom bar. Keeps the container, card styles and
 * "scrollToContent" behaviour the pages relied on from SidebarLayout.
 */
export default function TourismPageLayout() {
  const location = useLocation();

  // Links that pass { scrollToContent: true } land on the content, clear of
  // the sticky nav and tab row.
  useEffect(() => {
    if (!location.state?.scrollToContent) return;
    const t = setTimeout(() => {
      const el = document.getElementById('layout-content');
      if (!el) return;
      const offset =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            '--tourism-sticky-top'
          )
        ) || 140;
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - offset - 16,
        behavior: 'smooth',
      });
    }, 100);
    return () => clearTimeout(t);
  }, [location]);

  return (
    <>
      <TourismTabs />
      <div className='bg-kapwa-bg-surface min-h-screen'>
        <div className='container mx-auto py-6 sm:px-4 md:py-8'>
          <main className='min-w-0'>
            <div
              id='layout-content'
              className='border-kapwa-border-weak bg-kapwa-bg-surface min-h-[50vh] rounded-2xl border p-4 shadow-sm md:p-8'
            >
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <TourismBottomBar />
    </>
  );
}
