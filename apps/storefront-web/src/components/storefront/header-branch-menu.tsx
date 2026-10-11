'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

import { buildBranchViews, type BranchView } from '../../lib/storefront/branch-finder';
import { fetchCustomerBranches, type CustomerBranch } from '../../lib/storefront/discover';
import {
  branchEtaLabel,
  formatBranchLocation,
  formatDeliveryWindow,
} from '../../lib/storefront/format';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { MaterialIcon } from './material-icon';

type ActiveBranch = {
  id: string;
  name: string;
  addressLine: string;
  isAcceptingOrders: boolean;
  estimatedDeliveryMinutesMin: number;
  estimatedDeliveryMinutesMax: number;
};

type MenuState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; branches: CustomerBranch[] }
  | { status: 'error' };

/**
 * Header branch switcher.
 *
 * Opening the menu lists the live branch network and switches the active branch
 * in place — the chip itself never navigates away from the current page. The
 * full branch locator stays one click away through the menu footer.
 */
export function HeaderBranchMenu({
  branch,
  onSelect,
}: {
  branch: ActiveBranch;
  onSelect: (branchId: string) => void;
}) {
  const pathname = usePathname();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<MenuState>({ status: 'idle' });

  const eta = formatDeliveryWindow(
    branch.estimatedDeliveryMinutesMin,
    branch.estimatedDeliveryMinutesMax,
  );

  const views = useMemo<BranchView[]>(
    () => (open && state.status === 'ready' ? buildBranchViews(state.branches) : []),
    [open, state],
  );

  // The branch list is fetched on first open, not on every storefront render.
  useDeferredLoad(() => {
    if (!open || state.status !== 'idle') return;
    setState({ status: 'loading' });
    void fetchCustomerBranches().then(
      (branches) => setState({ status: 'ready', branches }),
      () => setState({ status: 'error' }),
    );
  }, [open, state.status]);

  // Any route change (menu footer, nav item) must not leave the menu open.
  useDeferredLoad(() => {
    if (open) setOpen(false);
  }, [pathname]);

  const closeRef = useRef<() => void>(() => setOpen(false));
  useEffect(() => {
    closeRef.current = () => setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeRef.current();
    }
    function onPointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (root && event.target instanceof Node && !root.contains(event.target)) closeRef.current();
    }
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  // Opening the menu moves focus to the active branch so the list is keyboard reachable.
  useDeferredLoad(() => {
    if (!open || views.length === 0) return;
    itemRefs.current.length = views.length;
    const active = views.findIndex((view) => view.id === branch.id);
    itemRefs.current[active >= 0 ? active : 0]?.focus();
  }, [open, views, branch.id]);

  function onMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = itemRefs.current.filter((item): item is HTMLButtonElement => item !== null);
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const next = current < 0 ? 0 : (current + step + items.length) % items.length;
    items[next]?.focus();
  }

  return (
    <div ref={rootRef} className="relative hidden xl:block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="flex items-center gap-space-xs px-space-sm py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors text-left"
      >
        <MaterialIcon name="location_on" className="text-primary text-lg" />
        <div className="flex flex-col text-left">
          <span className="font-label-sm text-label-sm text-on-surface uppercase leading-none">
            {formatBranchLocation(branch.name, branch.addressLine)}
          </span>
          <span className="font-label-sm text-[10px] text-primary-container leading-tight mt-0.5">
            {branchEtaLabel(eta, branch.isAcceptingOrders)}
          </span>
        </div>
        <MaterialIcon
          name="chevron_right"
          className={`text-on-surface-variant text-base ml-1 transition-transform ${
            open ? 'rotate-90' : ''
          }`}
        />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Şube seç"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] flex flex-col rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-[0_18px_40px_rgba(0,0,0,0.35)] p-2 z-50"
        >
          <p className="px-space-sm py-2 font-label-sm text-label-sm uppercase text-on-surface-variant">
            Şube seç
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {state.status === 'idle' || state.status === 'loading' ? (
              <p className="px-space-sm py-3 font-body-sm text-body-sm text-on-surface-variant">
                Şubeler yükleniyor…
              </p>
            ) : null}
            {state.status === 'error' ? (
              <div className="px-space-sm py-3 flex items-center justify-between gap-space-sm">
                <span className="font-body-sm text-body-sm text-error">Şubeler alınamadı.</span>
                <button
                  type="button"
                  onClick={() => setState({ status: 'idle' })}
                  className="font-label-sm text-label-sm uppercase text-secondary-container hover:underline"
                >
                  Tekrar dene
                </button>
              </div>
            ) : null}
            {views.map((view, index) => {
              const selected = view.id === branch.id;
              return (
                <button
                  key={view.id}
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => {
                    onSelect(view.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-start gap-2 px-space-sm py-2 rounded-xl text-left transition-colors ${
                    selected ? 'bg-surface-container-high' : 'hover:bg-surface-container'
                  }`}
                >
                  <MaterialIcon
                    name={selected ? 'check_circle' : 'radio_button_unchecked'}
                    filled={selected}
                    className="text-primary text-base mt-0.5"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-label-md text-label-md uppercase text-on-surface truncate">
                      {formatBranchLocation(view.name, view.addressLine)}
                    </span>
                    <span className="block font-body-sm text-body-sm text-on-surface-variant truncate">
                      {view.eta ? `Teslimat: ${view.eta}` : view.status.pill}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <Link
            href="/branches"
            data-path="subeler-and-hikaye"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center justify-between gap-2 px-space-sm py-2 rounded-xl font-label-md text-label-md uppercase text-secondary-container hover:bg-surface-container transition-colors"
          >
            Tüm şubeler
            <MaterialIcon name="chevron_right" className="text-base" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
