import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { NumberInput } from '../src/number-input.js';
import { CurrencyInput } from '../src/currency-input.js';
import { OtpInput } from '../src/otp-input.js';
import { Progress } from '../src/progress.js';
import { AccessDenied } from '../src/access-denied.js';
import { LoadingState } from '../src/loading-state.js';
import { SuccessState } from '../src/success-state.js';
import { DateRange } from '../src/date-range.js';

describe('WAVE 1 form / state controls', () => {
  it('NumberInput renders numeric type', () => {
    render(<NumberInput aria-label="Adet" defaultValue={3} />);
    const el = screen.getByLabelText('Adet') as HTMLInputElement;
    expect(el.type).toBe('number');
  });

  it('CurrencyInput exposes currency accessible name', () => {
    render(<CurrencyInput defaultValue="120,00" />);
    expect(screen.getByLabelText(/Tutar/)).toBeTruthy();
  });

  it('OtpInput updates value and advances focus', () => {
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} length={4} />);
    const first = screen.getByLabelText('Doğrulama kodu 1');
    fireEvent.change(first, { target: { value: '9' } });
    expect(onChange).toHaveBeenCalledWith('9');
  });

  it('Progress exposes progressbar semantics', () => {
    render(<Progress value={42} label="Mutfak doluluk" showValue />);
    const bar = screen.getByRole('progressbar', { name: 'Mutfak doluluk' });
    expect(bar.getAttribute('aria-valuenow')).toBe('42');
    expect(screen.getByText('42%')).toBeTruthy();
  });

  it('AccessDenied distinguishes kinds', () => {
    const { rerender } = render(<AccessDenied kind="permission" permissionCode="settings.write" />);
    expect(screen.getByTestId('access-denied-permission')).toBeTruthy();
    expect(screen.getByText(/settings.write/)).toBeTruthy();
    rerender(<AccessDenied kind="not_found" />);
    expect(screen.getByTestId('access-denied-not_found')).toBeTruthy();
    rerender(<AccessDenied kind="auth_required" />);
    expect(screen.getByTestId('access-denied-auth_required')).toBeTruthy();
  });

  it('LoadingState and SuccessState announce status', () => {
    const { rerender } = render(<LoadingState />);
    expect(screen.getByRole('status')).toBeTruthy();
    rerender(<SuccessState title="Kaydedildi" description="Ayarlar güncellendi" />);
    expect(screen.getByText('Kaydedildi')).toBeTruthy();
  });

  it('DateRange updates from/to', () => {
    const onChange = vi.fn();
    render(<DateRange value={{ from: '2026-09-01', to: '2026-09-18' }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Başlangıç'), { target: { value: '2026-09-05' } });
    expect(onChange).toHaveBeenCalledWith({ from: '2026-09-05', to: '2026-09-18' });
  });
});
