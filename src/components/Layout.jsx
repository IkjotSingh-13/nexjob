import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header.jsx';
import { Drawer } from './Drawer.jsx';
import { Footer } from './Footer.jsx';

/**
 * The frame every page shares: skip link, masthead, the page itself, footer
 * and drawer.
 *
 * A single-page app has to do by hand what the browser used to do for free on
 * every navigation, which is what the two effects below are for: land at the
 * top of the new page (or on its #anchor), and move focus to the page so a
 * keyboard or screen-reader user is not left on a link that is gone.
 */
export default function Layout() {
  const { pathname, hash, key } = useLocation();
  const mainRef = useRef(null);
  const lastPath = useRef(pathname);

  /* Like the account menu, the drawer is open for one location only. */
  const [drawerKey, setDrawerKey] = useState(null);
  const drawerOpen = drawerKey === key;
  const closeDrawer = useCallback(() => setDrawerKey(null), []);

  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;

    /* The stylesheet sets `scroll-behavior: smooth` on <html>. That suits an
       in-page anchor, but a new page should simply start at the top, as it
       does after a full load, not glide there from wherever the last one was. */
    if (target) target.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);

  useEffect(() => {
    if (lastPath.current === pathname) return;

    lastPath.current = pathname;
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>

      <Header drawerOpen={drawerOpen} onOpenDrawer={() => setDrawerKey(key)} />

      <main id="main" ref={mainRef} tabIndex={-1} style={{ outline: 'none' }}>
        <Outlet />
      </main>

      <Footer />
      <Drawer open={drawerOpen} onClose={closeDrawer} />
    </>
  );
}
