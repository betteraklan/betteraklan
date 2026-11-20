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
      {/* First stop in the tourism shell: jumps past the tab row to the page. */}
      <a
        href='#tourism-main'
        className='bg-kapwa-bg-brand-default text-kapwa-text-inverse type-body sr-only font-semibold focus:not-sr-only focus:rounded-full focus:px-5 focus:py-3 focus:shadow-elev-3 focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kapwa-border-brand'
      >
        Skip to content
      </a>
      <TourismTabs />
      <div className='bg-kapwa-bg-surface min-h-screen'>
        <div className='container mx-auto py-6 sm:px-4 md:py-8'>
          <main
            id='tourism-main'
            tabIndex={-1}
            className='min-w-0 outline-none'
          >
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
