import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Timeline } from '../src/timeline.js';

describe('Timeline', () => {
  it('renders events in a list', () => {
    render(
      <Timeline
        ariaLabel="Sipariş geçmişi"
        events={[
          { id: '1', time: '18:00', title: 'Alındı', description: 'Web' },
        ]}
      />,
    );
    expect(screen.getByLabelText('Sipariş geçmişi')).toBeTruthy();
    expect(screen.getByText('Alındı')).toBeTruthy();
  });
});
