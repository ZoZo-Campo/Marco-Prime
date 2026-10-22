import type { PropsWithChildren } from "preact/compat";
import { useLocation } from "preact-iso";
import { useEffect } from "preact/hooks";
import { NavBar } from "./components/layout/navbar";
import { shopping } from "./contexts/shopping-context";
import { clearTicket } from "./contexts/ticket-context";
import { HOME_ROUTE_URL } from "./pages/home";
import {
  purchaseInteractionLockedSignal,
  resetPurchaseState,
} from "./contexts/purchase-state";
import {
  rechargeInteractionLockedSignal,
  resetRechargeState,
} from "./contexts/recharge-state";

type LayoutProps = PropsWithChildren;

/** Retour à l'accueil après inactivité (l'accueil fait office d'écran d'attente). */
const IDLE_RESET_MS = 120_000;

export function Layout({ children }: LayoutProps) {
  const { path, route } = useLocation();

  useEffect(() => {
    let timeout = window.setTimeout(resetSession, IDLE_RESET_MS);

    function resetSession() {
      if (
        purchaseInteractionLockedSignal.value ||
        rechargeInteractionLockedSignal.value
      ) {
        timeout = window.setTimeout(resetSession, IDLE_RESET_MS);
        return;
      }
      shopping.reset();
      resetPurchaseState();
      resetRechargeState();
      clearTicket();
      route(HOME_ROUTE_URL);
    }

    function refreshTimeout() {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(resetSession, IDLE_RESET_MS);
    }

    window.addEventListener("keydown", refreshTimeout);
    window.addEventListener("pointerdown", refreshTimeout);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("keydown", refreshTimeout);
      window.removeEventListener("pointerdown", refreshTimeout);
    };
  }, []);

  return (
    <div class="app-shell w-screen flex flex-col overflow-hidden">
      <main key={path} class="flex-1 flex min-h-0 overflow-auto view-enter">
        {children}
      </main>
      <NavBar />
    </div>
  );
}
