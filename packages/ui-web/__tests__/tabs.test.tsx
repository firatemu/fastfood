import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Tabs } from '../src/tabs.js';
import { Alert } from '../src/alert.js';
import { Toast } from '../src/toast.js';
import { Modal } from '../src/modal.js';

describe('Tabs', () => {
  it('renders tabs with active panel', () => {
    render(
      <Tabs
        ariaLabel="Demo tabs"
        items={[
          { id: 'a', label: 'A', panel: <p>a</p> },
          { id: 'b', label: 'B', panel: <p>b</p> },
        ]}
      />,
    );
    expect(screen.getByRole('tablist', { name: 'Demo tabs' })).toBeTruthy();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });
});

describe('Alert', () => {
  it('renders with role=alert', () => {
    render(<Alert title="Hata">Bir şeyler ters gitti</Alert>);
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});

describe('Toast', () => {
  it('renders title + description', () => {
    render(<Toast title="Tamam" description="detay" />);
    expect(screen.getByText('Tamam')).toBeTruthy();
    expect(screen.getByText('detay')).toBeTruthy();
  });
});

describe('Modal', () => {
  it('renders dialog when open=true', () => {
    render(
      <Modal open title="Başlık">
        <p>içerik</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Başlık' })).toBeTruthy();
  });
});
