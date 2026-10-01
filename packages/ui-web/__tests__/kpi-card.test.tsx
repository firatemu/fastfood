import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { KpiCard } from '../src/kpi-card.js';

describe('KpiCard', () => {
  it('renders label and value', () => {
    render(<KpiCard label="Sipariş" value="842" testId="kpi-orders" />);
    expect(screen.getByTestId('kpi-orders')).toBeTruthy();
    expect(screen.getByText('Sipariş')).toBeTruthy();
    expect(screen.getByText('842')).toBeTruthy();
  });

  it('renders trend text', () => {
    render(
      <KpiCard label="Ciro" value="₺1" trend={{ direction: 'up', label: '+3%' }} />,
    );
    expect(screen.getByText('+3%')).toBeTruthy();
  });
});
