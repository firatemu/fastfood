import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PermissionMatrix } from '../src/permission-matrix.js';

describe('PermissionMatrix', () => {
  it('renders role columns and permission rows', () => {
    render(
      <PermissionMatrix
        ariaLabel="Demo matris"
        columns={[{ id: 'admin', label: 'Admin' }]}
        rows={[{ id: 'orders.read', label: 'orders.read', grants: { admin: true } }]}
      />,
    );
    expect(screen.getByRole('table', { name: 'Demo matris' })).toBeTruthy();
    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.getByText('orders.read')).toBeTruthy();
  });
});
