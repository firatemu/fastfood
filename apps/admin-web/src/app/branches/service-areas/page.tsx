'use client';

import { adminPagePermission } from '@fastfood/domain-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

import { errorMessage, type LoadState } from '../../../components/async-boundary';
import { useBranchContext } from '../../../components/ops/branch-context';
import { ConfirmDialog } from '../../../components/ops/confirm-dialog';
import { OpsIcon } from '../../../components/ops/ops-icon';
import { useOpsSync } from '../../../components/ops/ops-sync';
import { useOpsToast } from '../../../components/ops/ops-toast';
import { hasStaffPermission, useStaffAccess } from '../../../components/ops/staff-access-context';
import { createAdminClient } from '../../../lib/api';
import {
  formatBbox,
  parsePolygonGeoJson,
  readPolygonFacts,
  type PolygonFacts,
} from '../../../lib/fulfillment-ops';
import { adminBranchSchema, serviceAreasSchema, unknownDataSchema } from '../../../lib/schemas';
import { useDeferredLoad } from '../../../lib/use-deferred-load';

import styles from './service-areas.module.css';

type Area = z.infer<typeof serviceAreasSchema>['data'][number];
type BranchDetail = z.infer<typeof adminBranchSchema>['data'];

interface ServiceabilityResult {
  serviceable: boolean;
  branchId?: string | null;
  branchName?: string | null;
  serviceAreaId?: string | null;
  branches?: Array<{
    branchId: string;
    branchName: string;
    serviceAreaId: string;
    priority: number;
  }>;
}

const serviceabilityResponseSchema = z.object({
  data: z.object({
    serviceable: z.boolean(),
    branchId: z.string().nullable().optional(),
    branchName: z.string().nullable().optional(),
    serviceAreaId: z.string().nullable().optional(),
    branches: z
      .array(
        z.object({
          branchId: z.string(),
          branchName: z.string(),
          serviceAreaId: z.string(),
          priority: z.number(),
        }),
      )
      .optional(),
  }),
  meta: z.unknown().optional(),
});

type TabKey = 'areas' | 'generator' | 'simulator' | 'composer';

export default function ServiceAreasCommandCenter() {
  const branchContext = useBranchContext();
  const branchId = branchContext.branchId;
  const access = useStaffAccess();
  const canWrite = hasStaffPermission(access, adminPagePermission('service-areas', 'create'));
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const toast = useOpsToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('areas');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Main data states
  const [state, setState] = useState<LoadState<Area[]>>({ status: 'loading' });
  const [branchDetail, setBranchDetail] = useState<BranchDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | '0' | '1+'>('ALL');

  // Operation feedback states
  const [busy, setBusy] = useState(false);

  // Radius generator state
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [confirmBulkDeploy, setConfirmBulkDeploy] = useState(false);

  // Inline editing state
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPriority, setEditPriority] = useState('0');
  const [deleteTarget, setDeleteTarget] = useState<Area | null>(null);

  // Inspector modal state
  const [inspectArea, setInspectArea] = useState<Area | null>(null);

  // Custom GeoJSON Composer state
  const [composerName, setComposerName] = useState('');
  const [composerPriority, setComposerPriority] = useState('0');
  const [composerGeoJson, setComposerGeoJson] = useState('');

  // Live Serviceability Simulator state
  const [simLat, setSimLat] = useState<string>('');
  const [simLng, setSimLng] = useState<string>('');
  const [simBusy, setSimBusy] = useState(false);
  const [simResult, setSimResult] = useState<ServiceabilityResult | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  // Load branch detail & service areas
  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const client = createAdminClient();
      const [areasRes, branchRes] = await Promise.all([
        client.request({
          path: `admin/branches/${branchId}/service-areas`,
          schema: serviceAreasSchema,
        }),
        client
          .request({
            path: `admin/branches/${branchId}`,
            schema: adminBranchSchema,
          })
          .catch(() => null),
      ]);

      if (branchRes) {
        setBranchDetail(branchRes.data);
        if (!simLat && !simLng && branchRes.data.latitude && branchRes.data.longitude) {
          setSimLat(String(branchRes.data.latitude));
          setSimLng(String(branchRes.data.longitude));
        }
      }

      if (areasRes.data.length === 0) setState({ status: 'empty' });
      else setState({ status: 'ready', data: areasRes.data });
      markSynced();
    } catch (error) {
      setState({ status: 'error', error });
      markStale();
    }
  }, [branchId, markStale, markSynced, simLat, simLng]);

  useEffect(() => {
    registerRefresh(() => load());
    return () => registerRefresh(null);
  }, [load, registerRefresh]);

  useDeferredLoad(() => void load(), [load]);

  // Polygon facts caching
  const areas: readonly Area[] = state.status === 'ready' ? state.data : [];
  const factsById = useMemo(() => {
    const map = new Map<string, PolygonFacts | null>();
    for (const a of areas) {
      map.set(a.id, readPolygonFacts(a.polygonGeoJson ?? a.polygon));
    }
    return map;
  }, [areas]);

  // Filtered areas
  const filteredAreas = useMemo(() => {
    return areas.filter((a) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (a.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.id.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (priorityFilter === '0') return (a.priority ?? 0) === 0;
      if (priorityFilter === '1+') return (a.priority ?? 0) > 0;
      return true;
    });
  }, [areas, searchQuery, priorityFilter]);

  // Metrics calculation
  const metrics = useMemo(() => {
    const list = areas.map((area) => ({
      area,
      facts: factsById.get(area.id) ?? null,
      priority: typeof area.priority === 'number' ? area.priority : null,
    }));
    const priorities = list.map((r) => r.priority).filter((p): p is number => p !== null);
    return {
      total: list.length,
      polygons: list.filter((r) => r.facts?.type === 'Polygon').length,
      multiPolygons: list.filter((r) => r.facts?.type === 'MultiPolygon').length,
      lowestPriority: priorities.length ? Math.min(...priorities) : 0,
      highestPriority: priorities.length ? Math.max(...priorities) : 0,
    };
  }, [areas, factsById]);

  // Composer parsed geometry
  const typedComposerPolygon = useMemo(
    () => (composerGeoJson.trim() ? parsePolygonGeoJson(composerGeoJson) : null),
    [composerGeoJson],
  );
  const composerFacts = useMemo(
    () => (typedComposerPolygon ? readPolygonFacts(typedComposerPolygon) : null),
    [typedComposerPolygon],
  );

  // Quick Action: Generate 10km for current branch
  async function generateCircle(radius: number = 10) {
    if (!canWrite) return;
    setBusy(true);
    try {
      await createAdminClient().request({
        method: 'POST',
        path: `admin/branches/${branchId}/service-areas/generate-circle`,
        body: { radiusKm: radius },
        schema: unknownDataSchema,
      });
      toast.success(`Seçili şube için ${radius} km dairesel servis ağı oluşturuldu.`);
      await load();
      setActiveTab('areas');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Quick Action: Bulk generate for all branches
  async function generateAllBranches(radius: number) {
    if (!canWrite) return;
    setBusy(true);
    try {
      await createAdminClient().request({
        method: 'POST',
        path: 'admin/branches/service-areas/generate-all',
        body: { radiusKm: radius },
        schema: unknownDataSchema,
      });
      toast.success(`Sistemdeki tüm şubelere ${radius} km servis ağı başarıyla uygulandı.`);
      setConfirmBulkDeploy(false);
      await load();
      setActiveTab('areas');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Action: Save inline edit
  async function saveInlineEdit(areaId: string) {
    const priorityNum = Number(editPriority);
    if (!editName.trim() || !Number.isInteger(priorityNum) || priorityNum < 0) {
      toast.error('Alan adı ve geçerli bir öncelik (>= 0) girilmelidir.');
      return;
    }
    setBusy(true);
    try {
      await createAdminClient().request({
        method: 'PATCH',
        path: `admin/branches/${branchId}/service-areas/${areaId}`,
        body: { name: editName.trim(), priority: priorityNum },
        schema: unknownDataSchema,
      });
      setEditingAreaId(null);
      toast.success('Servis alanı güncellendi.');
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Action: Delete service area
  async function confirmDeleteArea() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await createAdminClient().request({
        method: 'DELETE',
        path: `admin/branches/${branchId}/service-areas/${deleteTarget.id}`,
        schema: z.unknown(),
      });
      setDeleteTarget(null);
      toast.success('Servis alanı başarıyla kaldırıldı (pasife alındı).');
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Action: Create from Custom GeoJSON Composer
  async function createCustomPolygon() {
    if (!canWrite) return;

    if (!composerName.trim()) {
      toast.error('Lütfen alan adını girin.');
      return;
    }
    if (!typedComposerPolygon) {
      toast.error('Geçerli bir GeoJSON Poligonu girilmelidir.');
      return;
    }

    const priorityVal = Number(composerPriority);
    if (!Number.isInteger(priorityVal) || priorityVal < 0) {
      toast.error('Öncelik pozitif bir tam sayı olmalıdır.');
      return;
    }

    setBusy(true);
    try {
      await createAdminClient().request({
        method: 'POST',
        path: `admin/branches/${branchId}/service-areas`,
        body: {
          name: composerName.trim(),
          polygonGeoJson: typedComposerPolygon,
          priority: priorityVal,
        },
        schema: unknownDataSchema,
      });
      toast.success('Özel servis alanı başarıyla tanımlandı.');
      setComposerName('');
      setComposerGeoJson('');
      await load();
      setActiveTab('areas');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Action: Run Serviceability Simulation
  async function runSimulation() {
    setSimError(null);
    setSimResult(null);
    const lat = Number(simLat);
    const lng = Number(simLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setSimError('Geçerli WGS84 Enlem (-90..90) ve Boylam (-180..180) girin.');
      return;
    }

    setSimBusy(true);
    try {
      const res = await createAdminClient().request({
        path: `storefront/serviceability?latitude=${lat}&longitude=${lng}`,
        schema: serviceabilityResponseSchema,
      });
      setSimResult(res.data);
    } catch (err) {
      setSimError(errorMessage(err));
    } finally {
      setSimBusy(false);
    }
  }

  // Copy to clipboard helper
  function copyGeoJson(area: Area) {
    const raw = JSON.stringify(area.polygonGeoJson ?? area.polygon, null, 2);
    void navigator.clipboard.writeText(raw);
    toast.success(`"${area.name}" GeoJSON geometrisi panoya kopyalandı.`);
  }

  // Template injector for composer
  function injectTemplate(type: 'downtown' | 'square') {
    if (type === 'downtown') {
      const template = {
        type: 'Polygon',
        coordinates: [
          [
            [28.96, 41.0],
            [28.99, 41.0],
            [28.99, 41.03],
            [28.96, 41.03],
            [28.96, 41.0],
          ],
        ],
      };
      setComposerGeoJson(JSON.stringify(template, null, 2));
      setComposerName('İstanbul Merkez Sektörü');
    } else {
      const centerLat = branchDetail?.latitude ?? 41.0;
      const centerLng = branchDetail?.longitude ?? 29.0;
      const delta = 0.05; // ~5 km
      const square = {
        type: 'Polygon',
        coordinates: [
          [
            [Number((centerLng - delta).toFixed(4)), Number((centerLat - delta).toFixed(4))],
            [Number((centerLng + delta).toFixed(4)), Number((centerLat - delta).toFixed(4))],
            [Number((centerLng + delta).toFixed(4)), Number((centerLat + delta).toFixed(4))],
            [Number((centerLng - delta).toFixed(4)), Number((centerLat + delta).toFixed(4))],
            [Number((centerLng - delta).toFixed(4)), Number((centerLat - delta).toFixed(4))],
          ],
        ],
      };
      setComposerGeoJson(JSON.stringify(square, null, 2));
      setComposerName(`${branchDetail?.name ?? 'Şube'} Kare Sınır`);
    }
  }

  return (
    <main className={styles.page}>
      {/* 1. Header Cockpit */}
      <header className={styles.header}>
        <div className={styles.headerTitleBlock}>
          <div className={styles.breadcrumb}>
            <span>Operasyon</span>
            <span className={styles.breadcrumbSep}>/</span>
            <span>Şubeler</span>
            <span className={styles.breadcrumbSep}>/</span>
            <span style={{ color: 'var(--accent-gold)' }}>Servis Ağları</span>
          </div>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>
              <OpsIcon name="near_me" />
            </span>
            Servis Ağları & Dağıtım Merkezi
          </h1>
          <p className={styles.subtitle}>
            Şubenin dairesel veya özel poligon servis sınırlarını yönetin, kesişim alanlarını ve
            otomatik sipariş yönlendirme motorunu canlı simüle edin.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={busy || !canWrite}
            onClick={() => void generateCircle(10)}
            title="Şube koordinatını merkez alarak 10 km daire üretir"
          >
            <OpsIcon name="radar" />
            10 km Hızlı Tanımla
          </button>

          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            disabled={busy || !canWrite}
            onClick={() => setConfirmBulkDeploy(true)}
            title="15 şubenin tamamına seçili çapta servis ağı uygular"
          >
            <OpsIcon name="travel_explore" />
            Tüm Şubelere Tanımla
          </button>

          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            disabled={busy}
            onClick={() => void load()}
            title="Verileri sunucudan tazele"
          >
            <OpsIcon name="refresh" />
            Yenile
          </button>
        </div>
      </header>

      {/* 2. Branch Status Anchor */}
      <section className={styles.branchAnchor}>
        <div className={styles.branchAnchorLeft}>
          <span className={styles.branchCodeBadge}>
            {branchDetail?.code ?? branchContext.selected?.code ?? 'ŞUBE'}
          </span>
          <span className={styles.branchNameText}>
            {branchDetail?.name ?? branchContext.selected?.name ?? 'Seçili Şube'}
          </span>
          <span
            className={`${styles.statusPill} ${
              branchDetail?.isAcceptingOrders === false
                ? styles.statusInactive
                : styles.statusActive
            }`}
          >
            <OpsIcon name={branchDetail?.isAcceptingOrders === false ? 'block' : 'check_circle'} />
            {branchDetail?.isAcceptingOrders === false ? 'Sipariş Alımı Kapalı' : 'Sipariş Alıyor'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className={styles.branchCoordinates} title="Şubenin merkez GPS çapa konumu">
            <OpsIcon name="pin_drop" />
            {branchDetail?.latitude != null && branchDetail?.longitude != null
              ? `${Number(branchDetail.latitude).toFixed(4)} K · ${Number(branchDetail.longitude).toFixed(4)} D`
              : 'GPS Koordinatı Tanımlanmamış'}
          </div>

          {branchContext.branches.length > 1 && (
            <select
              className={styles.btnSecondary}
              style={{ padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}
              value={branchId}
              onChange={(e) => branchContext.setBranchId(e.target.value)}
              aria-label="Aktif Şube Seçimi"
            >
              {branchContext.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      {/* 3. Operational KPI Deck */}
      <section className={styles.statsDeck}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>Aktif Servis Ağı</span>
            <OpsIcon name="layers" />
          </div>
          <div className={styles.statValue}>
            {metrics.total}
            <span className={styles.statUnit}>Bölge</span>
          </div>
          <p className={styles.statHint}>
            {metrics.polygons} Polygon · {metrics.multiPolygons} MultiPolygon
          </p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>Öncelik Siyaseti</span>
            <OpsIcon name="low_priority" />
          </div>
          <div className={styles.statValue}>
            {metrics.lowestPriority}
            <span className={styles.statUnit}>/ {metrics.highestPriority}</span>
          </div>
          <p className={styles.statHint}>Çakışma durumunda en küçük öncelik değeri kazanır.</p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>Teslimat Koşulu</span>
            <OpsIcon name="local_shipping" />
          </div>
          <div className={styles.statValue}>
            {branchDetail?.minOrderMinor
              ? `₺${(Number(branchDetail.minOrderMinor) / 100).toFixed(0)}`
              : '—'}
            <span className={styles.statUnit}>Min Sipariş</span>
          </div>
          <p className={styles.statHint}>
            Ücret:{' '}
            {branchDetail?.deliveryFeeMinor
              ? `₺${(Number(branchDetail.deliveryFeeMinor) / 100).toFixed(2)}`
              : '0'}
          </p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <span>Ortalama ETA</span>
            <OpsIcon name="timer" />
          </div>
          <div className={styles.statValue}>
            {branchDetail?.estimatedDeliveryMinutesMin ?? 25}–
            {branchDetail?.estimatedDeliveryMinutesMax ?? 40}
            <span className={styles.statUnit}>Dk</span>
          </div>
          <p className={styles.statHint}>Müşteri vitrininde gösterilen tahmini varış süresi.</p>
        </div>
      </section>

      {/* 4. Segmented Control Tabs */}
      <nav className={styles.tabNav} aria-label="Görünüm Seçimi">
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'areas' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('areas')}
        >
          <OpsIcon name="map" />
          Kayıtlı Alanlar & Radar ({metrics.total})
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'generator' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('generator')}
        >
          <OpsIcon name="adjust" />
          Dairesel Ağ Üretici
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'simulator' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('simulator')}
        >
          <OpsIcon name="gps_fixed" />
          Kapsama & Adres Simülatörü
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'composer' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('composer')}
        >
          <OpsIcon name="polyline" />
          GeoJSON Pro Editör
        </button>
      </nav>

      {/* =========================================================================
          TAB 1: Kayıtlı Alanlar & Radar
          ========================================================================= */}
      {activeTab === 'areas' && (
        <section aria-label="Kayıtlı Servis Alanları">
          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <span className={styles.searchIcon}>
                <OpsIcon name="search" />
              </span>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Alan adı veya UUID ara…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={styles.filterGroup}>
              <span style={{ fontSize: '12px', color: 'var(--text-faint)' }}>Öncelik:</span>
              {(['ALL', '0', '1+'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`${styles.btnSecondary} ${
                    priorityFilter === filter ? styles.presetChipActive : ''
                  }`}
                  style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px' }}
                  onClick={() => setPriorityFilter(filter)}
                >
                  {filter === 'ALL' ? 'Tümü' : filter === '0' ? 'Öncelik 0' : 'Öncelik 1+'}
                </button>
              ))}

              <div className={styles.viewToggle}>
                <button
                  type="button"
                  className={`${styles.viewToggleBtn} ${
                    viewMode === 'grid' ? styles.viewToggleBtnActive : ''
                  }`}
                  onClick={() => setViewMode('grid')}
                  title="Kart Görünümü"
                >
                  <OpsIcon name="grid_view" />
                </button>
                <button
                  type="button"
                  className={`${styles.viewToggleBtn} ${
                    viewMode === 'table' ? styles.viewToggleBtnActive : ''
                  }`}
                  onClick={() => setViewMode('table')}
                  title="Tablo Görünümü"
                >
                  <OpsIcon name="view_list" />
                </button>
              </div>
            </div>
          </div>

          <div className={styles.radarSection}>
            {/* Interactive SVG Radar Preview */}
            <div className={styles.radarCard}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <strong style={{ fontSize: '14px', color: '#fff' }}>
                  Radar & Geometri Görünümü
                </strong>
                <span className={styles.branchCodeBadge}>Canlı SVG Projeksiyonu</span>
              </div>

              <div className={styles.radarSvgWrapper}>
                <svg className={styles.radarSvg} viewBox="-120 -120 240 240">
                  {/* Concentric distance rings */}
                  <circle
                    cx="0"
                    cy="0"
                    r="100"
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx="0"
                    cy="0"
                    r="75"
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx="0"
                    cy="0"
                    r="50"
                    fill="none"
                    stroke="rgba(255, 183, 77, 0.2)"
                    strokeWidth="1.2"
                  />
                  <circle
                    cx="0"
                    cy="0"
                    r="25"
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeDasharray="3 3"
                  />

                  {/* Concentric text indicators */}
                  <text x="5" y="-92" fill="#555" fontSize="7" fontFamily="monospace">
                    20 km
                  </text>
                  <text x="5" y="-68" fill="#555" fontSize="7" fontFamily="monospace">
                    15 km
                  </text>
                  <text x="5" y="-43" fill="var(--accent-gold)" fontSize="7" fontFamily="monospace">
                    10 km
                  </text>
                  <text x="5" y="-18" fill="#555" fontSize="7" fontFamily="monospace">
                    5 km
                  </text>

                  {/* Crosshairs */}
                  <line
                    x1="-115"
                    y1="0"
                    x2="115"
                    y2="0"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="0.8"
                  />
                  <line
                    x1="0"
                    y1="-115"
                    x2="0"
                    y2="115"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="0.8"
                  />

                  {/* Visual Polygons overlay for the areas */}
                  {areas.map((a, idx) => {
                    const is10km = (a.name ?? '').includes('10km');
                    return (
                      <circle
                        key={a.id}
                        cx="0"
                        cy="0"
                        r={is10km ? 50 : 35 + idx * 10}
                        fill={is10km ? 'rgba(255, 183, 77, 0.12)' : 'rgba(88, 166, 255, 0.12)'}
                        stroke={is10km ? 'var(--accent-gold)' : 'var(--accent-blue)'}
                        strokeWidth="1.5"
                      />
                    );
                  })}

                  {/* Center Branch Anchor Pin */}
                  <circle cx="0" cy="0" r="5" fill="var(--accent-gold)" />
                  <circle
                    cx="0"
                    cy="0"
                    r="10"
                    fill="none"
                    stroke="var(--accent-gold)"
                    strokeWidth="0.8"
                    opacity="0.6"
                  >
                    <animate attributeName="r" values="5;15" dur="2s" repeatCount="indefinite" />
                    <animate
                      attributeName="opacity"
                      values="0.8;0"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <text x="0" y="14" fill="#fff" fontSize="8" textAnchor="middle" fontWeight="bold">
                    {branchDetail?.code ?? 'ŞUBE'}
                  </text>
                </svg>
              </div>

              <div className={styles.radarLegend}>
                <div className={styles.legendItem}>
                  <div className={styles.legendDot} style={{ background: 'var(--accent-gold)' }} />
                  <span>Şube Konumu (Merkez)</span>
                </div>
                <div className={styles.legendItem}>
                  <div
                    className={styles.legendDot}
                    style={{ background: 'rgba(255,183,77,0.5)' }}
                  />
                  <span>10 km Çevresi</span>
                </div>
                <div className={styles.legendItem}>
                  <div className={styles.legendDot} style={{ background: 'var(--accent-blue)' }} />
                  <span>Özel Poligonlar</span>
                </div>
              </div>
            </div>

            {/* List or Grid of Areas */}
            <div>
              {state.status === 'loading' ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <OpsIcon name="progress_activity" />
                  <p>Servis ağları getiriliyor…</p>
                </div>
              ) : state.status === 'empty' || filteredAreas.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '50px 20px',
                    background: 'var(--surface-card)',
                    borderRadius: '12px',
                    border: '1px solid var(--line-subtle)',
                  }}
                >
                  <OpsIcon name="radar" />
                  <h3 style={{ marginTop: '10px', color: '#fff' }}>
                    Kayıtlı Servis Alanı Bulunamadı
                  </h3>
                  <p
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '13px',
                      maxWidth: '42ch',
                      margin: '6px auto 16px',
                    }}
                  >
                    Bu şubeye ait henüz tanımlanmış bir servis ağı yok. Yukarıdaki &quot;10 km Hızlı
                    Tanımla&quot; butonunu kullanarak saniyeler içinde oluşturabilirsiniz.
                  </p>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={() => void generateCircle(10)}
                    disabled={busy || !canWrite}
                  >
                    10 km Dairesel Alan Oluştur
                  </button>
                </div>
              ) : viewMode === 'grid' ? (
                <div className={styles.areaGrid}>
                  {filteredAreas.map((area) => {
                    const facts = factsById.get(area.id);
                    const isEditing = editingAreaId === area.id;
                    const isHigh = (area.priority ?? 0) === 0;

                    return (
                      <div key={area.id} className={styles.areaCard}>
                        {isEditing ? (
                          <div className={styles.inlineEditBox}>
                            <strong style={{ fontSize: '12px', color: 'var(--accent-gold)' }}>
                              Alan Bilgilerini Düzenle
                            </strong>
                            <div className={styles.inlineEditRow}>
                              <input
                                className={styles.inlineInput}
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Alan Adı"
                              />
                              <input
                                className={styles.inlineInput}
                                style={{ width: '80px', flex: 'none' }}
                                value={editPriority}
                                onChange={(e) => setEditPriority(e.target.value)}
                                placeholder="Öncelik"
                                inputMode="numeric"
                              />
                            </div>
                            <div
                              style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}
                            >
                              <button
                                type="button"
                                className={`${styles.btn} ${styles.btnGhost}`}
                                onClick={() => setEditingAreaId(null)}
                                disabled={busy}
                              >
                                İptal
                              </button>
                              <button
                                type="button"
                                className={`${styles.btn} ${styles.btnPrimary}`}
                                onClick={() => void saveInlineEdit(area.id)}
                                disabled={busy}
                              >
                                {busy ? 'Kaydediliyor…' : 'Kaydet'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className={styles.areaCardTop}>
                              <div className={styles.areaNameBlock}>
                                <h3 className={styles.areaName}>
                                  {area.name ?? 'İsimsiz Servis Alanı'}
                                </h3>
                                <span className={styles.areaIdCode}>{area.id}</span>
                              </div>

                              <span
                                className={`${styles.priorityPill} ${
                                  isHigh ? styles.priorityHigh : styles.priorityNormal
                                }`}
                              >
                                <OpsIcon name="star" />
                                Öncelik {area.priority ?? 0}
                              </span>
                            </div>

                            <div className={styles.areaFactsList}>
                              <div className={styles.factItem}>
                                <span className={styles.factLabel}>Geometri Türü</span>
                                <span className={styles.factValue}>{facts?.type ?? 'Polygon'}</span>
                              </div>
                              <div className={styles.factItem}>
                                <span className={styles.factLabel}>Köşe / Vertex</span>
                                <span className={styles.factValue}>
                                  {facts?.vertexCount ?? 0} Nokta
                                </span>
                              </div>
                              <div className={styles.factItem} style={{ gridColumn: '1 / -1' }}>
                                <span className={styles.factLabel}>WGS84 Kapsam (BBox)</span>
                                <span className={styles.factValueFull}>
                                  {facts ? formatBbox(facts) : '—'}
                                </span>
                              </div>
                            </div>

                            <div className={styles.areaCardActions}>
                              <button
                                type="button"
                                className={`${styles.btn} ${styles.btnGhost}`}
                                onClick={() => copyGeoJson(area)}
                                title="GeoJSON geometrisini kopyala"
                              >
                                <OpsIcon name="content_copy" />
                                Kopyala
                              </button>
                              <button
                                type="button"
                                className={`${styles.btn} ${styles.btnSecondary}`}
                                onClick={() => setInspectArea(area)}
                                title="Geometri detaylarını incele"
                              >
                                <OpsIcon name="visibility" />
                                İncele
                              </button>
                              {canWrite && (
                                <>
                                  <button
                                    type="button"
                                    className={`${styles.btn} ${styles.btnSecondary}`}
                                    onClick={() => {
                                      setEditingAreaId(area.id);
                                      setEditName(area.name ?? '');
                                      setEditPriority(String(area.priority ?? 0));
                                    }}
                                    title="İsim ve önceliği güncelle"
                                  >
                                    <OpsIcon name="edit" />
                                    Düzenle
                                  </button>
                                  <button
                                    type="button"
                                    className={`${styles.btn} ${styles.btnDanger}`}
                                    onClick={() => setDeleteTarget(area)}
                                    title="Alanı pasife al"
                                  >
                                    <OpsIcon name="delete" />
                                    Sil
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Alan Adı</th>
                        <th>Tür</th>
                        <th>Öncelik</th>
                        <th>Köşe</th>
                        <th>WGS84 Kapsam</th>
                        <th style={{ textAlign: 'right' }}>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAreas.map((area) => {
                        const facts = factsById.get(area.id);
                        return (
                          <tr key={area.id}>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <strong>{area.name ?? '—'}</strong>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    color: 'var(--text-faint)',
                                    fontFamily: 'monospace',
                                  }}
                                >
                                  {area.id}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span
                                className={styles.statusPill}
                                style={{
                                  background: 'var(--surface-sunken)',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                {facts?.type ?? 'Polygon'}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`${styles.priorityPill} ${
                                  (area.priority ?? 0) === 0
                                    ? styles.priorityHigh
                                    : styles.priorityNormal
                                }`}
                              >
                                {area.priority ?? 0}
                              </span>
                            </td>
                            <td style={{ fontFamily: 'monospace' }}>{facts?.vertexCount ?? '—'}</td>
                            <td
                              style={{
                                fontFamily: 'monospace',
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                              }}
                            >
                              {facts ? formatBbox(facts) : '—'}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  className={`${styles.btn} ${styles.btnGhost}`}
                                  onClick={() => copyGeoJson(area)}
                                >
                                  <OpsIcon name="content_copy" />
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.btn} ${styles.btnSecondary}`}
                                  onClick={() => setInspectArea(area)}
                                >
                                  <OpsIcon name="visibility" />
                                </button>
                                {canWrite && (
                                  <button
                                    type="button"
                                    className={`${styles.btn} ${styles.btnDanger}`}
                                    onClick={() => setDeleteTarget(area)}
                                  >
                                    <OpsIcon name="delete" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          TAB 2: Dairesel Ağ Üretici
          ========================================================================= */}
      {activeTab === 'generator' && (
        <section className={styles.generatorCard} aria-label="Dairesel Ağ Üretici">
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: '18px', color: '#fff' }}>
              Dairesel Servis Ağı Üretici (Haversine WGS84)
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              Şubenin enlem ve boylam koordinatını merkez alarak 64 noktalı kapalı GeoJSON dairesel
              alanı üretir.
            </p>
          </div>

          <div className={styles.sliderContainer}>
            <div className={styles.sliderHeader}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Servis Yarıçapı</span>
              <span className={styles.sliderValueBadge}>{radiusKm} km</span>
            </div>

            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className={styles.slider}
            />

            <div className={styles.presetChips}>
              <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Hızlı Seçimler:</span>
              {[3, 5, 8, 10, 15, 20].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`${styles.presetChip} ${radiusKm === preset ? styles.presetChipActive : ''}`}
                  onClick={() => setRadiusKm(preset)}
                >
                  {preset} km {preset === 10 ? '★ 10km Müşteri Menzili' : ''}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '14px',
            }}
          >
            <div
              style={{
                padding: '16px',
                background: 'var(--surface-sunken)',
                borderRadius: '10px',
                border: '1px solid var(--line-subtle)',
              }}
            >
              <h4 style={{ margin: '0 0 6px', color: 'var(--accent-gold)', fontSize: '13px' }}>
                Seçili Şubeye Uygula
              </h4>
              <p style={{ margin: '0 0 14px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Yalnızca <strong>{branchDetail?.name ?? 'Bu Şube'}</strong> için {radiusKm} km çaplı
                servis ağı üretilir.
              </p>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                style={{ width: '100%' }}
                disabled={busy || !canWrite}
                onClick={() => void generateCircle(radiusKm)}
              >
                <OpsIcon name="radar" />
                {radiusKm} km Alanı Bu Şubeye Ekle
              </button>
            </div>

            <div
              style={{
                padding: '16px',
                background: 'var(--surface-sunken)',
                borderRadius: '10px',
                border: '1px solid var(--line-subtle)',
              }}
            >
              <h4 style={{ margin: '0 0 6px', color: 'var(--accent-blue)', fontSize: '13px' }}>
                Tüm Şubelere Toplu Dağıtım
              </h4>
              <p style={{ margin: '0 0 14px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Sistemdeki tüm kayıtlı şubelerin merkezine tek tıklamayla {radiusKm} km servis ağı
                tanımlar.
              </p>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                style={{ width: '100%' }}
                disabled={busy || !canWrite}
                onClick={() => setConfirmBulkDeploy(true)}
              >
                <OpsIcon name="public" />
                15 Şubenin Tamamına Uygula
              </button>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          TAB 3: Canlı Kapsama & Adres Simülatörü
          ========================================================================= */}
      {activeTab === 'simulator' && (
        <section className={styles.simulatorCard} aria-label="Kapsama Simülatörü">
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: '18px', color: '#fff' }}>
              Canlı Coğrafi Kapsama & Adres Simülatörü
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              Müşterinin sipariş verdiği teslimat koordinatını girerek sipariş yönlendirme motorunun
              (Routing Engine) hangi şubeye veya kesişim durumunda hangi şubelere yönlendirdiğini
              anında test edin.
            </p>
          </div>

          <div className={styles.simulatorInputs}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                }}
              >
                TESLİMAT ENLEMİ (Latitude)
              </label>
              <input
                className={styles.searchInput}
                style={{ padding: '10px 12px' }}
                placeholder="41.0082"
                value={simLat}
                onChange={(e) => setSimLat(e.target.value)}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                }}
              >
                TESLİMAT BOYLAMI (Longitude)
              </label>
              <input
                className={styles.searchInput}
                style={{ padding: '10px 12px' }}
                placeholder="28.9784"
                value={simLng}
                onChange={(e) => setSimLng(e.target.value)}
              />
            </div>

            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              style={{ minHeight: '40px' }}
              disabled={simBusy}
              onClick={() => void runSimulation()}
            >
              <OpsIcon name="search" />
              {simBusy ? 'Hesaplanıyor…' : 'Kapsamayı Test Et'}
            </button>
          </div>

          <div className={styles.presetChips}>
            <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
              Hızlı Test Noktaları:
            </span>
            <button
              type="button"
              className={styles.presetChip}
              onClick={() => {
                if (branchDetail) {
                  setSimLat(String(branchDetail.latitude));
                  setSimLng(String(branchDetail.longitude));
                }
              }}
            >
              Şube Merkezi (0 km)
            </button>
            <button
              type="button"
              className={styles.presetChip}
              onClick={() => {
                if (branchDetail) {
                  setSimLat(String(Number(branchDetail.latitude) + 0.03));
                  setSimLng(String(branchDetail.longitude));
                }
              }}
            >
              +3.3 km Kuzey
            </button>
            <button
              type="button"
              className={styles.presetChip}
              onClick={() => {
                if (branchDetail) {
                  setSimLat(String(branchDetail.latitude));
                  setSimLng(String(Number(branchDetail.longitude) + 0.08));
                }
              }}
            >
              +7.2 km Doğu
            </button>
            <button
              type="button"
              className={styles.presetChip}
              onClick={() => {
                setSimLat('40.9000');
                setSimLng('29.3000');
              }}
            >
              Uzak Bölge (Kapsama Dışı)
            </button>
          </div>

          {simError && (
            <div className={styles.toastErr} role="alert">
              <OpsIcon name="error" />
              <span>{simError}</span>
            </div>
          )}

          {simResult && (
            <div
              className={`${styles.simResultBox} ${
                !simResult.serviceable
                  ? styles.simResultUnserviceable
                  : (simResult.branches?.length ?? 0) > 1
                    ? styles.simResultOverlap
                    : styles.simResultServiceable
              }`}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <OpsIcon
                    name={
                      !simResult.serviceable
                        ? 'cancel'
                        : (simResult.branches?.length ?? 0) > 1
                          ? 'call_split'
                          : 'check_circle'
                    }
                  />
                  <strong style={{ fontSize: '16px' }}>
                    {!simResult.serviceable
                      ? 'Kapsama Dışı (Servis Verilemiyor)'
                      : (simResult.branches?.length ?? 0) > 1
                        ? 'Çoklu Şube Kesişim Bölgesi (Müşteri Şube Seçebilir)'
                        : `Otomatik Yönlendirme: ${simResult.branchName ?? 'Atanan Şube'}`}
                  </strong>
                </div>

                <span
                  className={`${styles.statusPill} ${
                    !simResult.serviceable ? styles.statusInactive : styles.statusActive
                  }`}
                >
                  {simResult.serviceable ? 'Hizmet Verilebilir' : 'Kapsama Dışı'}
                </span>
              </div>

              {simResult.serviceable && (
                <div style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: '6px' }}>
                  {(simResult.branches?.length ?? 0) > 1 ? (
                    <div>
                      <p style={{ margin: '0 0 10px', color: 'var(--accent-gold)' }}>
                        Bu koordinat <strong>{simResult.branches?.length} farklı şubenin</strong>{' '}
                        servis ağlarının kesişim noktasında yer alıyor. Müşteri checkout aşamasında
                        istediği şubeyi seçebilir:
                      </p>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                          gap: '8px',
                        }}
                      >
                        {simResult.branches?.map((b) => (
                          <div
                            key={b.branchId}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '8px',
                              background: 'var(--surface-sunken)',
                              border: '1px solid var(--line-subtle)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>{b.branchName}</span>
                            <span
                              className={styles.priorityPill}
                              style={{
                                background: 'rgba(255,183,77,0.15)',
                                color: 'var(--accent-gold)',
                              }}
                            >
                              Öncelik {b.priority}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p style={{ margin: 0 }}>
                      Sipariş doğrudan <strong>{simResult.branchName}</strong> şubesine atanacak.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          TAB 4: GeoJSON Pro Editör
          ========================================================================= */}
      {activeTab === 'composer' && (
        <section className={styles.generatorCard} aria-label="GeoJSON Composer">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: '18px', color: '#fff' }}>
                Özel GeoJSON Poligon Editörü
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                Sokak veya mahalle sınırlarına göre özel WGS84 GeoJSON Poligonu tanımlayın.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => injectTemplate('square')}
              >
                Şube Etrafı Kare Şablon
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => injectTemplate('downtown')}
              >
                Merkez Sektör Şablonu
              </button>
            </div>
          </div>

          <div
            style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 140px', gap: '12px' }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                }}
              >
                ALAN ADI
              </label>
              <input
                className={styles.searchInput}
                placeholder="Örn: Kadıköy Sahil Şeridi"
                value={composerName}
                onChange={(e) => setComposerName(e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                }}
              >
                ÖNCELİK
              </label>
              <input
                className={styles.searchInput}
                placeholder="0"
                value={composerPriority}
                onChange={(e) => setComposerPriority(e.target.value)}
                inputMode="numeric"
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                marginBottom: '6px',
              }}
            >
              POLYGON GEOJSON (WGS84 [Boylam, Enlem])
            </label>
            <textarea
              className={styles.searchInput}
              style={{
                width: '100%',
                minHeight: '160px',
                fontFamily: 'monospace',
                fontSize: '12px',
                lineHeight: 1.5,
              }}
              placeholder={`{\n  "type": "Polygon",\n  "coordinates": [[[29.0, 41.0], [29.05, 41.0], [29.05, 41.05], [29.0, 41.05], [29.0, 41.0]]]\n}`}
              value={composerGeoJson}
              onChange={(e) => setComposerGeoJson(e.target.value)}
            />
          </div>

          {composerFacts && (
            <div className={styles.areaFactsList}>
              <div className={styles.factItem}>
                <span className={styles.factLabel}>Geometri Türü</span>
                <span className={styles.factValue}>{composerFacts.type}</span>
              </div>
              <div className={styles.factItem}>
                <span className={styles.factLabel}>Köşe Sayısı</span>
                <span className={styles.factValue}>{composerFacts.vertexCount} Nokta</span>
              </div>
              <div className={styles.factItem} style={{ gridColumn: '1 / -1' }}>
                <span className={styles.factLabel}>WGS84 Kapsamı</span>
                <span className={styles.factValueFull}>{formatBbox(composerFacts)}</span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={() => {
                setComposerName('');
                setComposerGeoJson('');
              }}
            >
              Temizle
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={busy || !composerName.trim() || !typedComposerPolygon || !canWrite}
              onClick={() => void createCustomPolygon()}
            >
              <OpsIcon name="add" />
              {busy ? 'Oluşturuluyor…' : 'Özel Servis Alanını Kaydet'}
            </button>
          </div>
        </section>
      )}

      {/* Inspector Modal */}
      {inspectArea && (
        <dialog
          open
          className="ops-dialog"
          style={{
            maxWidth: '640px',
            background: 'var(--ff-surface-container, #161b22)',
            color: '#fff',
            border: '1px solid var(--line-medium)',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px',
            }}
          >
            <h3 style={{ margin: 0, color: 'var(--accent-gold)' }}>{inspectArea.name}</h3>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => setInspectArea(null)}
              style={{ padding: '4px 10px' }}
            >
              ×
            </button>
          </div>
          <p
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              color: 'var(--text-faint)',
              margin: '0 0 12px',
            }}
          >
            UUID: {inspectArea.id} · Öncelik: {inspectArea.priority}
          </p>
          <pre
            style={{
              maxHeight: '320px',
              overflow: 'auto',
              background: 'var(--surface-sunken)',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '11px',
              fontFamily: 'monospace',
              border: '1px solid var(--line-subtle)',
            }}
          >
            {JSON.stringify(inspectArea.polygonGeoJson ?? inspectArea.polygon, null, 2)}
          </pre>
          <div
            style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}
          >
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={() => copyGeoJson(inspectArea)}
            >
              <OpsIcon name="content_copy" />
              Panoya Kopyala
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => setInspectArea(null)}
            >
              Kapat
            </button>
          </div>
        </dialog>
      )}

      {/* Bulk Deploy Confirmation Dialog */}
      <ConfirmDialog
        open={confirmBulkDeploy}
        title="Tüm Şubelere Servis Ağı Dağıt"
        body={`Sistemdeki tüm 15 şubenin konumları merkez alınarak ${radiusKm} km çaplı dairesel servis ağı oluşturulacak. Devam etmek istiyor musunuz?`}
        confirmLabel="Tümüne Uygula"
        busy={busy}
        onCancel={() => setConfirmBulkDeploy(false)}
        onConfirm={() => void generateAllBranches(radiusKm)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Servis Alanını Pasife Al"
        body={`"${deleteTarget?.name ?? deleteTarget?.id}" alanını pasife almak istediğinizden emin misiniz? Bu işlemden sonra müşteriler bu alandan sipariş veremez.`}
        confirmLabel="Alanı Kaldır"
        danger
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDeleteArea()}
      />
    </main>
  );
}
