'use client';

import {
  createTable,
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type TableState,
} from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { z } from 'zod';

import { errorMessage, type LoadState } from '../../../components/async-boundary';
import { OpsIcon } from '../../../components/ops/ops-icon';
import { useOpsSync } from '../../../components/ops/ops-sync';
import { useOpsToast } from '../../../components/ops/ops-toast';
import { ActionButton } from '../../../components/ops/ops-ui';
import { createAdminClient } from '../../../lib/api';
import { modifierBoundsValid } from '../../../lib/catalog-ops';
import {
  adminModifierGroupsSchema,
  adminProductsForModifiersSchema,
  modifierGroupCreateSchema,
  modifierGroupLinkSchema,
  modifierOptionCreateSchema,
} from '../../../lib/schemas';
import { useDeferredLoad } from '../../../lib/use-deferred-load';

import styles from './modifiers.module.css';

type ModifierGroup = z.infer<typeof adminModifierGroupsSchema>['data'][number];
type ViewFilter = 'all' | 'required' | 'optional';
type EditTab = 'settings' | 'options' | 'products';
type ModifierProduct = z.infer<typeof adminProductsForModifiersSchema>['data'][number];

const PAGE_SIZES = [10, 20, 50];
const EMPTY_GROUPS: ModifierGroup[] = [];
const INITIAL_TABLE_STATE: TableState = {
  columnSizing: {},
  columnSizingInfo: {
    startOffset: null,
    startSize: null,
    deltaOffset: null,
    deltaPercentage: null,
    isResizingColumn: false,
    columnSizingStart: [],
  },
  rowSelection: {},
  rowPinning: { top: [], bottom: [] },
  expanded: {},
  grouping: [],
  sorting: [{ id: 'name', desc: false }],
  columnFilters: [],
  columnPinning: { left: [], right: [] },
  columnOrder: [],
  columnVisibility: {
    modifiers: true,
    products: true,
    selectionMin: true,
    selectionMax: true,
    requirement: true,
    status: true,
  },
  pagination: { pageIndex: 0, pageSize: 10 },
  globalFilter: '',
};

function ruleText(group: ModifierGroup): string {
  return `${group.selectionMin ?? 0}–${group.selectionMax ?? 1} seçim`;
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export default function ModifiersPage() {
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const toast = useOpsToast();
  const [state, setState] = useState<LoadState<ModifierGroup[]>>({ status: 'loading' });
  const [products, setProducts] = useState<ModifierProduct[]>([]);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [tableState, setTableState] = useState<TableState>(INITIAL_TABLE_STATE);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ModifierGroup | null>(null);
  const [editTab, setEditTab] = useState<EditTab>('settings');
  const [name, setName] = useState('');
  const [selectionMin, setSelectionMin] = useState('0');
  const [selectionMax, setSelectionMax] = useState('1');
  const [busy, setBusy] = useState(false);
  const [groupDraft, setGroupDraft] = useState({ name: '', selectionMin: '0', selectionMax: '1' });
  const [optionDraft, setOptionDraft] = useState({ id: '', name: '', price: '' });
  const [productToLink, setProductToLink] = useState('');
  const [productDisplayOrder, setProductDisplayOrder] = useState('0');
  const [productOrderDrafts, setProductOrderDrafts] = useState<Record<string, string>>({});
  const menuRef = useRef<HTMLDivElement | null>(null);
  const editDialogRef = useRef<HTMLElement | null>(null);
  const editTriggerRef = useRef<HTMLElement | null>(null);
  const optionNameRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async (): Promise<ModifierGroup[]> => {
    setState((current) => (current.status === 'ready' ? current : { status: 'loading' }));
    try {
      const client = createAdminClient();
      const [response, productResponse] = await Promise.all([
        client.request({
          path: 'admin/modifier-groups',
          query: { includeInactive: 'true' },
          schema: adminModifierGroupsSchema,
        }),
        client.request({ path: 'admin/products', schema: adminProductsForModifiersSchema }),
      ]);
      setProducts(productResponse.data);
      setState(
        response.data.length ? { status: 'ready', data: response.data } : { status: 'empty' },
      );
      markSynced();
      return response.data;
    } catch (error) {
      setState({ status: 'error', error });
      markStale();
      return [];
    }
  }, [markStale, markSynced]);

  useEffect(() => {
    registerRefresh(() => {
      void load();
    });
    return () => registerRefresh(null);
  }, [load, registerRefresh]);

  useDeferredLoad(() => void load(), [load]);

  const closeEditor = useCallback(() => {
    if (busy) return;
    setSelectedGroup(null);
    window.requestAnimationFrame(() => editTriggerRef.current?.focus());
  }, [busy]);

  useEffect(() => {
    if (!columnMenuOpen) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setColumnMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setColumnMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [columnMenuOpen]);

  useEffect(() => {
    if (!createOpen && !selectedGroup) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        setCreateOpen(false);
        if (selectedGroup) closeEditor();
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [busy, closeEditor, createOpen, selectedGroup]);

  const selectedGroupId = selectedGroup?.id;

  useEffect(() => {
    if (selectedGroupId === undefined) return;
    editDialogRef.current?.focus();
  }, [selectedGroupId]);

  const groups = state.status === 'ready' ? state.data : EMPTY_GROUPS;
  const activeGroups = groups.filter((group) => group.isActive !== false);
  const filteredGroups = useMemo(() => {
    if (viewFilter === 'all') return groups;
    return groups.filter(
      (group) =>
        group.isActive !== false &&
        (viewFilter === 'required'
          ? (group.selectionMin ?? 0) > 0
          : (group.selectionMin ?? 0) === 0),
    );
  }, [groups, viewFilter]);

  const columns = useMemo<ColumnDef<ModifierGroup>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (group) => group.name,
        header: 'Modifier grubu',
        cell: ({ row }) => (
          <button
            className={styles.groupLink}
            type="button"
            onClick={() => selectGroup(row.original)}
            aria-label={`${row.original.name} grubunu düzenle`}
          >
            <span className={styles.groupMark} aria-hidden="true">
              <OpsIcon name="tune" />
            </span>
            <span className={styles.groupIdentity}>
              <strong>{row.original.name}</strong>
              <code>{shortId(row.original.id)}</code>
            </span>
          </button>
        ),
        enableHiding: false,
      },
      {
        id: 'selectionMin',
        accessorFn: (group) => group.selectionMin ?? 0,
        header: 'Min. seçim',
        cell: ({ getValue }) => <span className={styles.number}>{String(getValue<number>())}</span>,
      },
      {
        id: 'selectionMax',
        accessorFn: (group) => group.selectionMax ?? 1,
        header: 'Maks. seçim',
        cell: ({ getValue }) => <span className={styles.number}>{String(getValue<number>())}</span>,
      },
      {
        id: 'modifiers',
        accessorFn: (group) => group.modifiers?.length ?? 0,
        header: 'Seçenek',
        cell: ({ row }) => (
          <span className={styles.number}>{row.original.modifiers?.length ?? 0}</span>
        ),
      },
      {
        id: 'products',
        accessorFn: (group) => group.products?.length ?? 0,
        header: 'Bağlı ürün',
        cell: ({ row }) => (
          <span className={styles.number}>{row.original.products?.length ?? 0}</span>
        ),
      },
      {
        id: 'requirement',
        accessorFn: (group) => ((group.selectionMin ?? 0) > 0 ? 'Zorunlu' : 'İsteğe bağlı'),
        header: 'Seçim kuralı',
        cell: ({ row }) => {
          const required = (row.original.selectionMin ?? 0) > 0;
          return (
            <span
              className={`${styles.ruleBadge} ${required ? styles.ruleRequired : styles.ruleOptional}`}
            >
              <i aria-hidden="true" />
              {required ? 'Zorunlu' : 'İsteğe bağlı'}
            </span>
          );
        },
      },
      {
        id: 'status',
        accessorFn: (group) => (group.isActive === false ? 'Pasif' : 'Aktif'),
        header: 'Durum',
        cell: ({ row }) => (
          <span
            className={`${styles.status} ${row.original.isActive === false ? styles.statusInactive : ''}`}
          >
            <i aria-hidden="true" />
            {row.original.isActive === false ? 'Pasif' : 'Aktif'}
          </span>
        ),
      },
      {
        id: 'selectionRule',
        accessorFn: (group) => `${group.selectionMin ?? 0} ${group.selectionMax ?? 1}`,
        header: 'Aralık',
        cell: ({ row }) => <span className={styles.range}>{ruleText(row.original)}</span>,
      },
    ],
    [],
  );

  const table = createTable<ModifierGroup>({
    data: filteredGroups,
    columns,
    state: tableState,
    onStateChange: (updater) => setTableState((previous) => functionalUpdate(updater, previous)),
    renderFallbackValue: null,
    globalFilterFn: (row, _columnId, filterValue) => {
      const needle = String(filterValue).trim().toLocaleLowerCase('tr-TR');
      const indexed = `${row.original.name} ${row.original.id} ${(row.original.modifiers ?? []).map((item) => item.name).join(' ')} ${(row.original.products ?? []).map((item) => item.name).join(' ')}`;
      return !needle || indexed.toLocaleLowerCase('tr-TR').includes(needle);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const min = Number(selectionMin);
    const max = Number(selectionMax);
    if (!name.trim()) {
      toast.error('Grup adı zorunludur.');
      setBusy(false);
      return;
    }
    if (!Number.isInteger(min) || !Number.isInteger(max) || !modifierBoundsValid(min, max)) {
      toast.error(
        'Seçim sınırları sıfır veya daha büyük tam sayı olmalı; minimum, maksimumu aşamaz.',
      );
      setBusy(false);
      return;
    }

    try {
      await createAdminClient().request({
        method: 'POST',
        path: 'admin/modifier-groups',
        body: { name: name.trim(), selectionMin: min, selectionMax: max },
        schema: modifierGroupCreateSchema,
      });
      setCreateOpen(false);
      setName('');
      setSelectionMin('0');
      setSelectionMax('1');
      toast.success('Modifier grubu oluşturuldu.');
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function selectGroup(group: ModifierGroup) {
    editTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedGroup(group);
    setEditTab('settings');
    setGroupDraft({
      name: group.name,
      selectionMin: String(group.selectionMin ?? 0),
      selectionMax: String(group.selectionMax ?? 1),
    });
    setOptionDraft({ id: '', name: '', price: '' });
    setProductToLink('');
    setProductDisplayOrder('0');
    setProductOrderDrafts(
      Object.fromEntries(
        (group.products ?? []).map((product) => [product.id, String(product.displayOrder)]),
      ),
    );
  }

  async function refreshSelected(groupId = selectedGroup?.id) {
    const updatedGroups = await load();
    if (groupId) {
      const refreshed = updatedGroups.find((group) => group.id === groupId);
      if (refreshed) setSelectedGroup(refreshed);
    }
  }

  async function updateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGroup) return;
    const min = Number(groupDraft.selectionMin);
    const max = Number(groupDraft.selectionMax);
    if (
      !groupDraft.name.trim() ||
      !Number.isInteger(min) ||
      !Number.isInteger(max) ||
      !modifierBoundsValid(min, max)
    ) {
      toast.error('Grup adı ve geçerli minimum/maksimum seçim aralığı girin.');
      return;
    }
    setBusy(true);
    try {
      await createAdminClient().request({
        method: 'PATCH',
        path: `admin/modifier-groups/${selectedGroup.id}`,
        body: { name: groupDraft.name.trim(), selectionMin: min, selectionMax: max },
        schema: modifierGroupCreateSchema,
      });
      toast.success('Modifier grubu güncellendi.');
      await refreshSelected(selectedGroup.id);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function priceToMinor(price: string): string | null {
    const normalized = price.trim().replace(',', '.');
    if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(normalized)) return null;
    const [whole = '0', fraction = ''] = normalized.split('.');
    return (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))).toString();
  }

  function formatMinor(value: string): string {
    const amount = BigInt(value);
    return `${(amount / 100n).toString()}.${(amount % 100n).toString().padStart(2, '0')} ₺`;
  }

  async function saveOption(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGroup) return;
    const priceDeltaMinor = priceToMinor(optionDraft.price);
    if (!optionDraft.name.trim() || priceDeltaMinor === null) {
      toast.error('Seçenek adı girin; fiyatı 0,00 biçiminde yazın.');
      return;
    }
    setBusy(true);
    try {
      const editing = Boolean(optionDraft.id);
      await createAdminClient().request({
        method: editing ? 'PATCH' : 'POST',
        path: editing
          ? `admin/modifier-groups/${selectedGroup.id}/modifiers/${optionDraft.id}`
          : `admin/modifier-groups/${selectedGroup.id}/modifiers`,
        body: { name: optionDraft.name.trim(), priceDeltaMinor },
        schema: modifierOptionCreateSchema,
      });
      setOptionDraft({ id: '', name: '', price: '' });
      toast.success(editing ? 'Seçenek güncellendi.' : 'Seçenek eklendi.');
      await refreshSelected(selectedGroup.id);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function setOptionActive(optionId: string, isActive: boolean) {
    if (!selectedGroup) return;
    setBusy(true);
    try {
      await createAdminClient().request({
        method: 'PATCH',
        path: `admin/modifier-groups/${selectedGroup.id}/modifiers/${optionId}`,
        body: { isActive },
        schema: modifierOptionCreateSchema,
      });
      toast.success(isActive ? 'Seçenek yeniden etkinleştirildi.' : 'Seçenek pasife alındı.');
      await refreshSelected(selectedGroup.id);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function setGroupActive() {
    if (!selectedGroup) return;
    const isActive = selectedGroup.isActive === false;
    setBusy(true);
    try {
      await createAdminClient().request({
        method: 'PATCH',
        path: `admin/modifier-groups/${selectedGroup.id}`,
        body: { isActive },
        schema: modifierGroupCreateSchema,
      });
      toast.success(isActive ? 'Grup yeniden etkinleştirildi.' : 'Grup pasife alındı.');
      await refreshSelected(selectedGroup.id);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function linkProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGroup || !productToLink) return;
    const displayOrder = Number(productDisplayOrder);
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      toast.error('Ürün sırası sıfır veya daha büyük bir tam sayı olmalı.');
      return;
    }
    setBusy(true);
    try {
      await createAdminClient().request({
        method: 'POST',
        path: `admin/modifier-groups/${selectedGroup.id}/products/${productToLink}`,
        body: { displayOrder },
        schema: modifierGroupLinkSchema,
      });
      setProductToLink('');
      toast.success('Grup ürüne bağlandı.');
      await refreshSelected(selectedGroup.id);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function updateProductOrder(productId: string) {
    if (!selectedGroup) return;
    const displayOrder = Number(productOrderDrafts[productId]);
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      toast.error('Ürün sırası sıfır veya daha büyük bir tam sayı olmalı.');
      return;
    }
    setBusy(true);
    try {
      await createAdminClient().request({
        method: 'POST',
        path: `admin/modifier-groups/${selectedGroup.id}/products/${productId}`,
        body: { displayOrder },
        schema: modifierGroupLinkSchema,
      });
      toast.success('Ürün sırası güncellendi.');
      await refreshSelected(selectedGroup.id);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function unlinkProduct(productId: string) {
    if (!selectedGroup) return;
    setBusy(true);
    try {
      await createAdminClient().request({
        method: 'DELETE',
        path: `admin/modifier-groups/${selectedGroup.id}/products/${productId}`,
        schema: modifierGroupLinkSchema,
      });
      toast.success('Ürün bağlantısı kaldırıldı.');
      await refreshSelected(selectedGroup.id);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const requiredCount = activeGroups.filter((group) => (group.selectionMin ?? 0) > 0).length;
  const optionalCount = activeGroups.length - requiredCount;
  const hasLoaded = state.status === 'ready' || state.status === 'empty';

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <div className={styles.breadcrumb}>
            Katalog <span>/</span> Özelleştirme
          </div>
          <h1>Modifier grupları</h1>
          <p>Ürün seçim kurallarını tek merkezden yönetin.</p>
        </div>
        <button className={styles.createButton} type="button" onClick={() => setCreateOpen(true)}>
          <OpsIcon name="add" />
          Yeni grup
        </button>
      </header>

      <section className={styles.gridPanel} aria-label="Modifier grupları tablosu">
        <div className={styles.gridHeading}>
          <div>
            <h2>Grup kataloğu</h2>
            <p>
              {hasLoaded ? `${table.getFilteredRowModel().rows.length} kayıt` : 'Katalog kayıtları'}
            </p>
          </div>
          <div className={styles.gridTools}>
            <label className={styles.search}>
              <OpsIcon name="search" />
              <input
                value={String(tableState.globalFilter ?? '')}
                onChange={(event) => {
                  table.setGlobalFilter(event.target.value);
                  table.setPageIndex(0);
                }}
                placeholder="Grup adı veya kod ara"
                aria-label="Modifier gruplarında ara"
              />
              {tableState.globalFilter ? (
                <button
                  type="button"
                  onClick={() => table.setGlobalFilter('')}
                  aria-label="Aramayı temizle"
                >
                  ×
                </button>
              ) : null}
            </label>
            <button
              className={styles.refreshButton}
              type="button"
              onClick={() => void load()}
              aria-label="Listeyi yenile"
            >
              <OpsIcon name="refresh" />
            </button>
            <div className={styles.columnMenu} ref={menuRef}>
              <button
                type="button"
                className={styles.toolButton}
                aria-expanded={columnMenuOpen}
                aria-haspopup="true"
                onClick={() => setColumnMenuOpen((open) => !open)}
              >
                <OpsIcon name="view_column" /> Sütunlar
              </button>
              {columnMenuOpen ? (
                <div className={styles.columnMenuPanel} role="group" aria-label="Görünür sütunlar">
                  {table
                    .getAllLeafColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <label key={column.id}>
                        <input
                          type="checkbox"
                          checked={column.getIsVisible()}
                          onChange={column.getToggleVisibilityHandler()}
                        />
                        <span>
                          {{
                            selectionMin: 'Minimum',
                            selectionMax: 'Maksimum',
                            requirement: 'Seçim kuralı',
                            status: 'Durum',
                            modifiers: 'Seçenek',
                            products: 'Bağlı ürün',
                          }[column.id] ?? column.id}
                        </span>
                      </label>
                    ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className={styles.gridFilters} role="group" aria-label="Grup türüne göre filtrele">
          {(
            [
              ['all', 'Tüm gruplar', groups.length],
              ['required', 'Zorunlu', requiredCount],
              ['optional', 'İsteğe bağlı', optionalCount],
            ] as const
          ).map(([filter, label, count]) => (
            <button
              key={filter}
              type="button"
              className={viewFilter === filter ? styles.filterActive : styles.filterButton}
              aria-pressed={viewFilter === filter}
              onClick={() => {
                setViewFilter(filter);
                table.setPageIndex(0);
              }}
            >
              {label}
              <span>{hasLoaded ? count : '—'}</span>
            </button>
          ))}
          <span className={styles.activeOnly}>
            <i /> {activeGroups.length} aktif · {groups.length - activeGroups.length} pasif
          </span>
        </div>

        {state.status === 'loading' ? (
          <div className={styles.statePanel} role="status">
            <span className={styles.loader} />
            <strong>Gruplar getiriliyor</strong>
            <p>Katalog verisi yükleniyor…</p>
          </div>
        ) : state.status === 'error' ? (
          <div className={styles.statePanel} role="alert">
            <span className={styles.stateIcon}>
              <OpsIcon name="error" />
            </span>
            <strong>Gruplar yüklenemedi</strong>
            <p>{errorMessage(state.error)}</p>
            <ActionButton variant="primary" onClick={() => void load()}>
              Tekrar dene
            </ActionButton>
          </div>
        ) : state.status === 'empty' ? (
          <div className={styles.statePanel}>
            <span className={styles.stateIcon}>
              <OpsIcon name="tune" />
            </span>
            <strong>Henüz modifier grubu yok</strong>
            <p>Ürünlerin seçilebilir eklerini düzenlemek için ilk grubu oluşturun.</p>
            <button
              className={styles.inlineCreate}
              type="button"
              onClick={() => setCreateOpen(true)}
            >
              <OpsIcon name="add" /> İlk grubu oluştur
            </button>
          </div>
        ) : table.getRowModel().rows.length === 0 ? (
          <div className={styles.statePanel}>
            <span className={styles.stateIcon}>
              <OpsIcon name="search_off" />
            </span>
            <strong>Sonuç bulunamadı</strong>
            <p>Arama veya filtre seçimini değiştirip yeniden deneyin.</p>
            <button
              className={styles.resetButton}
              type="button"
              onClick={() => {
                table.setGlobalFilter('');
                setViewFilter('all');
              }}
            >
              Filtreleri temizle
            </button>
          </div>
        ) : (
          <div
            className={styles.tableScroll}
            role="region"
            aria-label="Modifier grup veri tablosu"
            tabIndex={0}
          >
            <table className={styles.table}>
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const numeric = [
                        'selectionMin',
                        'selectionMax',
                        'modifiers',
                        'products',
                      ].includes(header.column.id);
                      return (
                        <th
                          key={header.id}
                          className={numeric ? styles.numericHeading : undefined}
                          scope="col"
                        >
                          {header.isPlaceholder ? null : (
                            <button
                              className={styles.sortButton}
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              aria-label={`${String(header.column.columnDef.header)} sütununa göre sırala`}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              <span className={styles.sortMark} aria-hidden="true">
                                {header.column.getIsSorted() === 'asc'
                                  ? '↑'
                                  : header.column.getIsSorted() === 'desc'
                                    ? '↓'
                                    : '↕'}
                              </span>
                            </button>
                          )}
                        </th>
                      );
                    })}
                    <th className={styles.detailHeading} scope="col">
                      Ayrıntı
                    </th>
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => {
                      const numeric = [
                        'selectionMin',
                        'selectionMax',
                        'modifiers',
                        'products',
                      ].includes(cell.column.id);
                      return (
                        <td key={cell.id} className={numeric ? styles.numericCell : undefined}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                    <td className={styles.detailCell}>
                      <button
                        type="button"
                        className={styles.detailButton}
                        onClick={() => selectGroup(row.original)}
                        aria-label={`${row.original.name} grubunu düzenle`}
                      >
                        <OpsIcon name="edit" />
                        <span>Düzenle</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {state.status === 'ready' && table.getFilteredRowModel().rows.length > 0 ? (
          <footer className={styles.gridFooter}>
            <span>
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length,
              )}{' '}
              <span>/ {table.getFilteredRowModel().rows.length} grup</span>
            </span>
            <div className={styles.pagination}>
              <label>
                Satır{' '}
                <select
                  value={table.getState().pagination.pageSize}
                  onChange={(event) => table.setPageSize(Number(event.target.value))}
                >
                  {PAGE_SIZES.map((size) => (
                    <option value={size} key={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Önceki sayfa"
              >
                ‹
              </button>
              <span>
                {table.getState().pagination.pageIndex + 1} / {Math.max(table.getPageCount(), 1)}
              </span>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Sonraki sayfa"
              >
                ›
              </button>
            </div>
          </footer>
        ) : null}
      </section>

      {createOpen ? (
        <div
          className={styles.overlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setCreateOpen(false);
          }}
        >
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modifier-create-title"
          >
            <header className={styles.dialogHeader}>
              <span className={styles.dialogGlyph}>
                <OpsIcon name="tune" />
              </span>
              <div>
                <span>Katalog yapılandırması</span>
                <h2 id="modifier-create-title">Yeni modifier grubu</h2>
              </div>
              <button
                className={styles.closeButton}
                type="button"
                onClick={() => setCreateOpen(false)}
                disabled={busy}
                aria-label="Pencereyi kapat"
              >
                ×
              </button>
            </header>
            <form onSubmit={(event) => void createGroup(event)}>
              <div className={styles.dialogBody}>
                <p>Grup adını ve müşterinin yapabileceği seçim aralığını belirleyin.</p>
                <label className={styles.formField}>
                  <span>
                    Grup adı <b>*</b>
                  </span>
                  <input
                    autoFocus
                    maxLength={128}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Örn. Ekstra malzemeler"
                    required
                  />
                  <small>En fazla 128 karakter</small>
                </label>
                <div className={styles.boundsFields}>
                  <label className={styles.formField}>
                    <span>Minimum seçim</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={selectionMin}
                      onChange={(event) => setSelectionMin(event.target.value)}
                    />
                    <small>0 ise grup isteğe bağlıdır</small>
                  </label>
                  <label className={styles.formField}>
                    <span>Maksimum seçim</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={selectionMax}
                      onChange={(event) => setSelectionMax(event.target.value)}
                    />
                    <small>İzin verilen en yüksek seçim</small>
                  </label>
                </div>
                <div className={styles.rulePreview}>
                  <span className={styles.rulePreviewIcon}>
                    <OpsIcon name="rule" />
                  </span>
                  <div>
                    <strong>
                      {Number(selectionMin) > 0 ? 'Zorunlu seçim' : 'İsteğe bağlı seçim'}
                    </strong>
                    <span>
                      {Number(selectionMin) || 0} ile {Number(selectionMax) || 0} seçenek arasında
                    </span>
                  </div>
                </div>
              </div>
              <footer className={styles.dialogFooter}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setCreateOpen(false)}
                  disabled={busy}
                >
                  Vazgeç
                </button>
                <button type="submit" className={styles.submitButton} disabled={busy}>
                  {busy ? (
                    <>
                      <span className={styles.buttonLoader} /> Oluşturuluyor
                    </>
                  ) : (
                    <>
                      <OpsIcon name="add" /> Grubu oluştur
                    </>
                  )}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}

      {selectedGroup ? (
        <div
          className={styles.overlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditor();
          }}
        >
          <section
            ref={editDialogRef}
            tabIndex={-1}
            className={styles.editDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modifier-detail-title"
            aria-describedby="modifier-detail-description"
            onKeyDown={(event) => {
              if (event.key !== 'Tab') return;
              const focusable = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>(
                  'button:not([disabled]), input:not([disabled]), select:not([disabled])',
                ),
              );
              if (!focusable.length) return;
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (
                event.shiftKey &&
                (document.activeElement === first || document.activeElement === event.currentTarget)
              ) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }}
          >
            <header className={styles.editHeader}>
              <span className={styles.editGlyph} aria-hidden="true">
                <OpsIcon name="tune" />
              </span>
              <div className={styles.editTitle}>
                <span>MODIFIER GRUBU / {shortId(selectedGroup.id)}</span>
                <h2 id="modifier-detail-title">{selectedGroup.name}</h2>
                <p id="modifier-detail-description">
                  Grup kuralını, seçenekleri ve ürün bağlantılarını yönetin.
                </p>
              </div>
              <button
                className={styles.closeButton}
                type="button"
                onClick={closeEditor}
                disabled={busy}
                aria-label="Düzenleme penceresini kapat"
              >
                ×
              </button>
            </header>
            <div
              className={styles.editTabs}
              role="tablist"
              aria-label="Düzenleme bölümleri"
              onKeyDown={(event) => {
                const tabs: EditTab[] = ['settings', 'options', 'products'];
                const current = tabs.indexOf(editTab);
                const next =
                  event.key === 'ArrowRight'
                    ? (current + 1) % tabs.length
                    : event.key === 'ArrowLeft'
                      ? (current - 1 + tabs.length) % tabs.length
                      : event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? tabs.length - 1
                          : null;
                if (next === null) return;
                event.preventDefault();
                const nextTab = tabs[next];
                if (!nextTab) return;
                setEditTab(nextTab);
                window.requestAnimationFrame(() =>
                  document.getElementById(`modifier-tab-${nextTab}`)?.focus(),
                );
              }}
            >
              {(
                [
                  ['settings', 'Grup ayarları', 'tune'],
                  ['options', 'Seçenekler', 'list_alt'],
                  ['products', 'Bağlı ürünler', 'inventory_2'],
                ] as const
              ).map(([tab, label, icon]) => (
                <button
                  key={tab}
                  id={`modifier-tab-${tab}`}
                  type="button"
                  role="tab"
                  aria-selected={editTab === tab}
                  tabIndex={editTab === tab ? 0 : -1}
                  aria-controls="modifier-edit-panel"
                  className={`${styles.editTab} ${editTab === tab ? styles.editTabActive : ''}`}
                  onClick={() => {
                    setEditTab(tab);
                  }}
                >
                  <OpsIcon name={icon} />
                  <span>{label}</span>
                  {tab === 'options' ? <em>{selectedGroup.modifiers?.length ?? 0}</em> : null}
                  {tab === 'products' ? <em>{selectedGroup.products?.length ?? 0}</em> : null}
                </button>
              ))}
            </div>
            <div
              className={styles.editBody}
              id="modifier-edit-panel"
              role="tabpanel"
              aria-labelledby={`modifier-tab-${editTab}`}
            >
              {editTab === 'settings' ? (
                <form
                  className={styles.managementSection}
                  onSubmit={(event) => void updateGroup(event)}
                >
                  <div className={styles.sectionHeading}>
                    <div>
                      <span>SEÇİM KURALI</span>
                      <h3>Grup ayarları</h3>
                    </div>
                    <span>Ürün ekranında uygulanır</span>
                  </div>
                  <label className={styles.managementField}>
                    <span>Grup adı</span>
                    <input
                      maxLength={128}
                      value={groupDraft.name}
                      onChange={(event) =>
                        setGroupDraft((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </label>
                  <div className={styles.managementBounds}>
                    <label className={styles.managementField}>
                      <span>Minimum</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={groupDraft.selectionMin}
                        onChange={(event) =>
                          setGroupDraft((current) => ({
                            ...current,
                            selectionMin: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className={styles.managementField}>
                      <span>Maksimum</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={groupDraft.selectionMax}
                        onChange={(event) =>
                          setGroupDraft((current) => ({
                            ...current,
                            selectionMax: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <button className={styles.saveCompact} type="submit" disabled={busy}>
                      Kaydet
                    </button>
                  </div>
                </form>
              ) : null}

              {editTab === 'options' ? (
                <section className={styles.managementSection}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <span>GRUP İÇERİĞİ</span>
                      <h3>Grup seçenekleri</h3>
                    </div>
                    <span>
                      {selectedGroup.modifiers?.filter((item) => item.isActive).length ?? 0} etkin
                    </span>
                  </div>
                  <div className={styles.optionList}>
                    {selectedGroup.modifiers?.length ? (
                      selectedGroup.modifiers.map((option) => (
                        <article
                          className={`${styles.optionRow} ${option.isActive ? '' : styles.optionInactive}`}
                          key={option.id}
                        >
                          <div className={styles.optionInfo}>
                            <strong>{option.name}</strong>
                            <span>{formatMinor(option.priceDeltaMinor)}</span>
                            <small>{option.isActive ? 'Etkin' : 'Pasif'}</small>
                          </div>
                          <div className={styles.optionActions}>
                            <button
                              type="button"
                              onClick={() => {
                                setOptionDraft({
                                  id: option.id,
                                  name: option.name,
                                  price: `${(BigInt(option.priceDeltaMinor ?? '0') / 100n).toString()}.${(BigInt(option.priceDeltaMinor ?? '0') % 100n).toString().padStart(2, '0')}`,
                                });
                                window.requestAnimationFrame(() => {
                                  optionNameRef.current?.scrollIntoView({ block: 'center' });
                                  optionNameRef.current?.focus({ preventScroll: true });
                                });
                              }}
                              disabled={busy}
                            >
                              Düzenle
                            </button>
                            <button
                              type="button"
                              onClick={() => void setOptionActive(option.id, !option.isActive)}
                              disabled={busy}
                            >
                              {option.isActive ? 'Pasife al' : 'Etkinleştir'}
                            </button>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className={styles.emptyInline}>Henüz seçenek eklenmemiş.</p>
                    )}
                  </div>
                  <form className={styles.optionForm} onSubmit={(event) => void saveOption(event)}>
                    <div className={styles.formSubheading}>
                      {optionDraft.id ? 'Seçeneği düzenle' : 'Yeni seçenek ekle'}
                      {optionDraft.id ? (
                        <button
                          type="button"
                          onClick={() => setOptionDraft({ id: '', name: '', price: '' })}
                        >
                          Vazgeç
                        </button>
                      ) : null}
                    </div>
                    <div className={styles.optionInputs}>
                      <label className={styles.managementField}>
                        <span>Seçenek adı</span>
                        <input
                          ref={optionNameRef}
                          maxLength={128}
                          value={optionDraft.name}
                          onChange={(event) =>
                            setOptionDraft((current) => ({ ...current, name: event.target.value }))
                          }
                          placeholder="Örn. Ekstra cheddar"
                          required
                        />
                      </label>
                      <label className={styles.managementField}>
                        <span>Ek fiyat · ₺</span>
                        <input
                          inputMode="decimal"
                          value={optionDraft.price}
                          onChange={(event) =>
                            setOptionDraft((current) => ({ ...current, price: event.target.value }))
                          }
                          placeholder="0,00"
                          required
                        />
                      </label>
                      <button className={styles.saveCompact} type="submit" disabled={busy}>
                        {optionDraft.id ? 'Güncelle' : 'Ekle'}
                      </button>
                    </div>
                  </form>
                </section>
              ) : null}

              {editTab === 'products' ? (
                <section className={styles.managementSection}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <span>KATALOG BAĞLANTISI</span>
                      <h3>Bağlı ürünler</h3>
                    </div>
                    <span>{selectedGroup.products?.length ?? 0} ürün</span>
                  </div>
                  <div className={styles.productLinks}>
                    {selectedGroup.products?.length ? (
                      selectedGroup.products.map((product) => (
                        <div className={styles.productLink} key={product.id}>
                          <span className={styles.productLinkIcon}>
                            <OpsIcon name="inventory_2" />
                          </span>
                          <span>
                            <strong>{product.name}</strong>
                            <small>
                              {product.slug}
                              {product.isActive ? '' : ' · Ürün pasif'}
                            </small>
                          </span>
                          <label className={styles.productOrder}>
                            <span>Sıra</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={productOrderDrafts[product.id] ?? String(product.displayOrder)}
                              onChange={(event) =>
                                setProductOrderDrafts((current) => ({
                                  ...current,
                                  [product.id]: event.target.value,
                                }))
                              }
                              aria-label={`${product.name} sırası`}
                            />
                          </label>
                          <button
                            className={styles.orderSaveButton}
                            type="button"
                            onClick={() => void updateProductOrder(product.id)}
                            disabled={busy}
                          >
                            Sıra kaydet
                          </button>
                          <button
                            type="button"
                            onClick={() => void unlinkProduct(product.id)}
                            disabled={busy}
                            aria-label={`${product.name} bağlantısını kaldır`}
                          >
                            Kaldır
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className={styles.emptyInline}>Bu grup henüz bir üründe kullanılmıyor.</p>
                    )}
                  </div>
                  <form className={styles.linkForm} onSubmit={(event) => void linkProduct(event)}>
                    <select
                      aria-label="Bağlanacak ürün"
                      value={productToLink}
                      onChange={(event) => setProductToLink(event.target.value)}
                    >
                      <option value="">Ürün seçin</option>
                      {products
                        .filter(
                          (product) =>
                            !selectedGroup.products?.some((linked) => linked.id === product.id),
                        )
                        .map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                            {product.isActive === false ? ' · Pasif ürün' : ''}
                          </option>
                        ))}
                    </select>
                    <label className={styles.orderField}>
                      <span>Sıra</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={productDisplayOrder}
                        onChange={(event) => setProductDisplayOrder(event.target.value)}
                      />
                    </label>
                    <button
                      className={styles.saveCompact}
                      type="submit"
                      disabled={busy || !productToLink}
                    >
                      Ürüne bağla
                    </button>
                  </form>
                </section>
              ) : null}
              <div className={styles.recordId}>
                <span>Kayıt kimliği</span>
                <code>{selectedGroup.id}</code>
              </div>
            </div>
            <footer className={styles.editFooter}>
              <button
                className={styles.archiveButton}
                type="button"
                onClick={() => void setGroupActive()}
                disabled={busy}
              >
                {selectedGroup.isActive === false ? 'Grubu etkinleştir' : 'Grubu pasife al'}
              </button>
              <button
                className={styles.cancelButton}
                type="button"
                onClick={closeEditor}
                disabled={busy}
              >
                Kapat
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
