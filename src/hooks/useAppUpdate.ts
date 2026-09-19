import { useRegisterSW } from 'virtual:pwa-register/react';

// The browser only re-checks the service worker on navigation, which a
// standalone PWA can go days without doing. Poll instead so a deploy is
// noticed while the app stays open, and again whenever it comes back to the
// foreground.
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000;

export function useAppUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const check = () => {
        if (document.visibilityState === 'visible') void registration.update();
      };
      setInterval(check, UPDATE_CHECK_INTERVAL);
      document.addEventListener('visibilitychange', check);
    },
  });

  return {
    updateReady: needRefresh,
    reload: () => {
      void updateServiceWorker(true);
      // updateServiceWorker reloads the page from `controllerchange`, which
      // never fires for a page the service worker has never controlled (the
      // very first load after registration), so reload ourselves there.
      if (!navigator.serviceWorker.controller) window.location.reload();
    },
    dismiss: () => setNeedRefresh(false),
  };
}
