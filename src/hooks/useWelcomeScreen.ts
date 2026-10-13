// The welcome screen is Home as first opened: it shows the big logo mark, so the small icon in
// the sidebar/header hides. Once the user goes to any other page, Home is the regular page for
// the rest of the visit (big mark gone, small icon back). A reload starts a new welcome.
import { useEffect, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';

let leftHome = false;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** True while this is the welcome screen (Home, before visiting any other page). */
export function useWelcomeScreen(): boolean {
  const { pathname } = useLocation();
  const left = useSyncExternalStore(subscribe, () => leftHome);

  useEffect(() => {
    if (pathname !== '/' && !leftHome) {
      leftHome = true;
      listeners.forEach((l) => l());
    }
  }, [pathname]);

  return pathname === '/' && !left;
}
