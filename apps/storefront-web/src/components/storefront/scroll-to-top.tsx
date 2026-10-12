'use client';

import { useEffect, useState } from 'react';

import { MaterialIcon } from './material-icon';

/** How far down the page has to be before the control means anything. */
const SHOW_AFTER_PX = 600;

/**
 * Floating "back to top" control. The storefront scrolls the window rather than
 * an inner container, so this lives in the shell and works on every shop page;
 * short pages never cross the threshold and never show it.
 */
export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    window.addEventListener('scroll', onScroll, { passive: true });
    // Deferred: a browser restores the scroll position on reload, and reading it
    // synchronously here would be a setState inside the effect body.
    queueMicrotask(onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container shadow-2xl hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-container"
      aria-label="Sayfanın başına dön"
      data-ff-scroll-to-top
    >
      <MaterialIcon name="arrow_upward" className="text-2xl" />
    </button>
  );
}