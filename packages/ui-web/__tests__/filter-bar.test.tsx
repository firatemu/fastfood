import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { FilterBar } from '../src/filter-bar.js';

describe('FilterBar', () => {
  it('exposes search landmark with filters', () => {
    render(
      <FilterBar ariaLabel="Sipariş filtreleri">
        <input aria-label="Kod" />
      </FilterBar>,
    );
    expect(screen.getByRole('search', { name: 'Sipariş filtreleri' })).toBeTruthy();
  });
});
