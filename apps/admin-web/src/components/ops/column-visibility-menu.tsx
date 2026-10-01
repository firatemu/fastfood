'use client';

import { useEffect, useRef, useState } from 'react';

import {
  COLUMNS,
  defaultVisibility,
  loadVisibility,
  saveVisibility,
  toggleVisibility,
  visibleColumnIds,
  type ColumnId,
  type ColumnVisibility,
} from '../../lib/column-prefs';

import styles from './column-visibility-menu.module.css';

export interface ColumnVisibilityMenuProps {
  open: boolean;
  onClose: () => void;
  visibility: ColumnVisibility;
  onChange: (next: ColumnVisibility) => void;
  anchorTop: number;
  anchorLeft: number;
}

export function ColumnVisibilityMenu(props: ColumnVisibilityMenuProps) {
  const firstToggleRef = useRef<HTMLInputElement | null>(null);
  const visibleCount = visibleColumnIds(props.visibility).length;
  const firstToggleId = COLUMNS.find((column) => !column.locked)?.id;

  useEffect(() => {
    if (props.open) firstToggleRef.current?.focus();
  }, [props.open]);

  if (!props.open) return null;

  const close = () => props.onClose();
  const reset = () => props.onChange(defaultVisibility());

  return (
    <div
      className={styles.menu}
      role="dialog"
      aria-label="Kolon görünürlüğü"
      aria-modal="false"
      style={{ top: `${props.anchorTop}px`, left: `${props.anchorLeft}px` }}
      data-ff-columns-menu="open"
    >
      <header className={styles.header}>
        <span className={styles.headerIcon} aria-hidden="true">
          <span className="material-symbols-outlined">view_column</span>
        </span>
        <div className={styles.headerText}>
          <strong>Tablo kolonları</strong>
          <span>{visibleCount} alan görünür</span>
        </div>
        <button type="button" className={styles.close} aria-label="Menüyü kapat" onClick={close}>
          <span className="material-symbols-outlined" aria-hidden="true">
            close
          </span>
        </button>
      </header>
      <p className={styles.hint}>
        İş akışına göre alanları açıp kapatın. Seçiminiz bu tarayıcıda saklanır.
      </p>
      <ul className={styles.list}>
        {COLUMNS.map((col) => {
          const enabled = col.locked ? true : props.visibility[col.id];
          return (
            <li key={col.id} className={styles.item}>
              <label className={styles.option}>
                <input
                  type="checkbox"
                  ref={col.id === firstToggleId ? firstToggleRef : undefined}
                  className={styles.checkbox}
                  checked={enabled}
                  disabled={col.locked}
                  onChange={() => props.onChange(toggleVisibility(props.visibility, col.id))}
                  data-ff-toggle-column={col.id}
                />
                <span className={styles.optionCopy}>
                  <strong>{col.label}</strong>
                  <span>{col.description}</span>
                </span>
                <span className={styles.switch} aria-hidden="true">
                  <span />
                </span>
                {col.locked ? <span className={styles.locked}>Sabit</span> : null}
              </label>
            </li>
          );
        })}
      </ul>
      <footer className={styles.footer}>
        <span>Tablo görünümü</span>
        <button type="button" onClick={reset}>
          Varsayılana dön
        </button>
      </footer>
    </div>
  );
}

/**
 * Sticky-state hook for the column visibility menu: stores the
 * visibility map in `localStorage` and exposes a single setter.
 *
 * `mounted` lets the consumer avoid an SSR/hydration mismatch — the
 * menu should only render after the client has read the persisted
 * value.
 */
export function useColumnVisibility(): {
  mounted: boolean;
  visibility: ColumnVisibility;
  setVisibility: (next: ColumnVisibility) => void;
  visibleIds: readonly ColumnId[];
} {
  const [mounted, setMounted] = useState(false);
  const [visibility, setVisibilityState] = useState<ColumnVisibility>(defaultVisibility);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
      setVisibilityState(loadVisibility());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const setVisibility = (next: ColumnVisibility) => {
    setVisibilityState(next);
    saveVisibility(next);
  };

  return {
    mounted,
    visibility,
    setVisibility,
    visibleIds: visibleColumnIds(visibility),
  };
}

/**
 * Lightweight hook for the menu open/close state. Anchors the menu
 * to the trigger button via a ref.
 */
export function useColumnMenuAnchor() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [anchor, setAnchor] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const node = triggerRef.current;
    if (node) {
      const rect = node.getBoundingClientRect();
      const width = Math.min(332, window.innerWidth - 24);
      const height = Math.min(460, window.innerHeight - 24);
      const top =
        rect.bottom + height + 8 <= window.innerHeight
          ? rect.bottom + 8
          : Math.max(12, rect.top - height - 8);
      setAnchor({
        top,
        left: Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)),
      });
    }
    setOpen(true);
  };

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (target.closest('[data-ff-columns-menu="open"]')) return;
      if (target.closest('[data-ff-columns-trigger="true"]')) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onReposition = () => {
      const node = triggerRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const width = Math.min(332, window.innerWidth - 24);
      const height = Math.min(460, window.innerHeight - 24);
      const top =
        rect.bottom + height + 8 <= window.innerHeight
          ? rect.bottom + 8
          : Math.max(12, rect.top - height - 8);
      setAnchor({
        top,
        left: Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)),
      });
    };
    document.addEventListener('pointerdown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('pointerdown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open]);

  return { open, toggle, close, triggerRef, anchor };
}
