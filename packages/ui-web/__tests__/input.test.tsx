import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Input } from '../src/input.js';

describe('Input state coverage', () => {
  it('renders default', () => {
    render(<Input placeholder="x" />);
    expect(screen.getByPlaceholderText('x')).toBeTruthy();
  });
  it('renders focus-visible (focusable)', () => {
    render(<Input />);
    const i = screen.getByRole('textbox');
    i.focus();
    expect(document.activeElement).toBe(i);
  });
  it('renders invalid', () => {
    render(<Input invalid />);
    const i = screen.getByRole('textbox');
    expect(i.className).toContain('ff-input--invalid');
  });
  it('renders loading', () => {
    render(<Input loading />);
    const i = screen.getByRole('textbox');
    expect(i.className).toContain('ff-input--loading');
    expect((i as HTMLInputElement).disabled).toBe(true);
  });
  it('renders disabled', () => {
    render(<Input disabled />);
    const i = screen.getByRole('textbox');
    expect((i as HTMLInputElement).disabled).toBe(true);
  });
  it('renders read-only', () => {
    render(<Input readOnly value="x" />);
    const i = screen.getByRole('textbox');
    expect((i as HTMLInputElement).readOnly).toBe(true);
  });
  it('fires change event', () => {
    let v = '';
    render(
      <Input
        onChange={(e) => {
          v = e.target.value;
        }}
      />,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'merhaba' } });
    expect(v).toBe('merhaba');
  });
});
