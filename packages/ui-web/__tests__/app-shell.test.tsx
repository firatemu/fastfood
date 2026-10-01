import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { AppShell } from '../src/app-shell.js';
import { PageHeader } from '../src/page-header.js';

describe('AppShell', () => {
  it('exposes navigation landmark and content', () => {
    render(
      <AppShell
        brand="FASTFOOD Ops"
        navItems={[
          { id: 'orders', label: 'Siparişler', active: true },
          { id: 'kitchen', label: 'Mutfak', onSelect: () => undefined },
        ]}
        topbar={<span>Top</span>}
      >
        <p>İçerik gövdesi</p>
      </AppShell>,
    );
    expect(screen.getByLabelText('Uygulama menüsü')).toBeTruthy();
    expect(screen.getByLabelText('Birincil navigasyon')).toBeTruthy();
    expect(screen.getByText('İçerik gövdesi')).toBeTruthy();
    expect(screen.getByLabelText('Üst çubuk')).toBeTruthy();
  });

  it('renders grouped nav sections for Admin IA', () => {
    render(
      <AppShell
        brand="Ops"
        navSections={[
          {
            id: 'operations',
            label: 'Operations',
            items: [
              { id: 'orders', label: 'Siparişler', active: true },
              { id: 'kitchen', label: 'Mutfak' },
            ],
          },
          {
            id: 'system',
            label: 'System',
            items: [{ id: 'settings', label: 'Settings' }],
          },
        ]}
      >
        <span />
      </AppShell>,
    );
    expect(screen.getByText('Operations')).toBeTruthy();
    expect(screen.getByText('System')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Siparişler' })).toBeTruthy();
  });
});

describe('PageHeader', () => {
  it('renders title and actions', () => {
    render(
      <PageHeader
        title="Siparişler"
        description="Liste"
        actions={<button type="button">Yeni</button>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Siparişler' })).toBeTruthy();
    expect(screen.getByText('Liste')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Yeni' })).toBeTruthy();
  });
});
