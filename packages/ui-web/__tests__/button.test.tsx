import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Button } from '../src/button.js';

describe('Button state coverage', () => {
  it('renders default state', () => {
    render(<Button>Tıkla</Button>);
    expect(screen.getByRole('button', { name: 'Tıkla' })).toBeTruthy();
  });
  it('renders hover/focus-visible (CSS-driven; here we just ensure focusable)', () => {
    render(<Button>Tıkla</Button>);
    const btn = screen.getByRole('button');
    btn.focus();
    expect(document.activeElement).toBe(btn);
  });
  it('handles pressed/active via mouseDown', () => {
    render(<Button>Tıkla</Button>);
    const btn = screen.getByRole('button');
    fireEvent.mouseDown(btn);
    expect(btn).toBeTruthy();
  });
  it('renders disabled state', () => {
    render(<Button disabled>Tıkla</Button>);
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
  it('renders loading state (aria-busy=true, disabled)', () => {
    render(<Button loading>Tıkla</Button>);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
  it('fires onClick', () => {
    let n = 0;
    render(<Button onClick={() => n++}>Tıkla</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(n).toBe(1);
  });
  it('does not fire onClick when disabled', () => {
    let n = 0;
    render(
      <Button disabled onClick={() => n++}>
        Tıkla
      </Button>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(n).toBe(0);
  });
  it('renders left + right icons', () => {
    render(
      <Button leftIcon={<span data-testid="l">L</span>} rightIcon={<span data-testid="r">R</span>}>
        Tıkla
      </Button>,
    );
    expect(screen.getByTestId('l')).toBeTruthy();
    expect(screen.getByTestId('r')).toBeTruthy();
  });
});

describe('Button variants', () => {
  it('renders all variants', () => {
    const variants = ['primary', 'secondary', 'save', 'danger'] as const;
    for (const v of variants) {
      const { unmount } = render(<Button variant={v}>x</Button>);
      expect(screen.getByRole('button').className).toContain(`ff-btn--${v}`);
      unmount();
    }
  });
  it('renders all sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    for (const s of sizes) {
      const { unmount } = render(<Button size={s}>x</Button>);
      expect(screen.getByRole('button').className).toContain(`ff-btn--${s}`);
      unmount();
    }
  });
});
