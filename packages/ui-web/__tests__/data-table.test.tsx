import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { DataTable } from '../src/data-table.js';

type Row = { id: string; name: string; amount: number };

const rows: Row[] = [
  { id: '1', name: 'Alpha', amount: 10 },
  { id: '2', name: 'Beta', amount: 20 },
];

describe('DataTable', () => {
  it('renders headers and cells', () => {
    render(
      <DataTable
        ariaLabel="Demo"
        rowKey={(r) => r.id}
        columns={[
          { key: 'name', header: 'Ad' },
          { key: 'amount', header: 'Tutar', align: 'right' },
        ]}
        rows={rows}
      />,
    );
    expect(screen.getByRole('table', { name: 'Demo' })).toBeTruthy();
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('20')).toBeTruthy();
  });

  it('supports selection', () => {
    const onSelectionChange = vi.fn();
    render(
      <DataTable
        ariaLabel="Seçim"
        rowKey={(r) => r.id}
        selectedKeys={['1']}
        onSelectionChange={onSelectionChange}
        columns={[{ key: 'name', header: 'Ad' }]}
        rows={rows}
      />,
    );
    fireEvent.click(screen.getByLabelText('Satır 2 seç'));
    expect(onSelectionChange).toHaveBeenCalled();
  });

  it('supports sort callbacks', () => {
    const onSortChange = vi.fn();
    render(
      <DataTable
        ariaLabel="Sıralı"
        rowKey={(r) => r.id}
        sortKey="name"
        sortDirection="asc"
        onSortChange={onSortChange}
        columns={[{ key: 'name', header: 'Ad', sortable: true }]}
        rows={rows}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Ad/ }));
    expect(onSortChange).toHaveBeenCalledWith('name', 'desc');
  });

  it('renders empty state', () => {
    render(
      <DataTable
        ariaLabel="Boş"
        rowKey={(r) => r.id}
        columns={[{ key: 'name', header: 'Ad' }]}
        rows={[]}
        emptyText="Kayıt yok"
      />,
    );
    expect(screen.getByRole('status').textContent).toContain('Kayıt yok');
  });
});
