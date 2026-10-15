'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';

import { OpsIcon } from '../../../components/ops/ops-icon';
import { createAdminClient } from '../../../lib/api';
import { serviceAreasSchema } from '../../../lib/schemas';
import { useDeferredLoad } from '../../../lib/use-deferred-load';

import styles from './map.module.css';

interface BranchItem {
  id: string;
  code: string;
  name: string;
  addressLine?: string | null;
  phone?: string | null;
  latitude: number;
  longitude: number;
  isActive: boolean;
  isAcceptingOrders: boolean;
  minOrderMinor?: string;
  deliveryFeeMinor?: string;
  estimatedDeliveryMinutesMin?: number;
  estimatedDeliveryMinutesMax?: number;
}

type ServiceArea = z.infer<typeof serviceAreasSchema>['data'][number];

interface BranchWithAreas extends BranchItem {
  areas: ServiceArea[];
  city: string;
}

const storefrontBranchesSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      addressLine: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      latitude: z.number(),
      longitude: z.number(),
      isActive: z.boolean(),
      isAcceptingOrders: z.boolean(),
      minOrderMinor: z.string().optional(),
      deliveryFeeMinor: z.string().optional(),
      estimatedDeliveryMinutesMin: z.number().optional(),
      estimatedDeliveryMinutesMax: z.number().optional(),
    }),
  ),
});

const serviceabilityResponseSchema = z.object({
  data: z.object({
    serviceable: z.boolean(),
    branchId: z.string().nullable().optional(),
    branchName: z.string().nullable().optional(),
    distanceKm: z.number().nullable().optional(),
    maxRadiusKm: z.number().nullable().optional(),
    serviceAreaId: z.string().nullable().optional(),
    branches: z
      .array(
        z.object({
          branchId: z.string(),
          branchName: z.string(),
          serviceAreaId: z.string(),
          priority: z.number(),
          distanceKm: z.number().optional(),
          maxRadiusKm: z.number().optional(),
        }),
      )
      .optional(),
  }),
});

function detectCity(name: string, code: string): string {
  const n = (name + ' ' + code).toUpperCase();
  if (n.includes('GAZİANTEP') || n.includes('GAZ-')) return 'Gaziantep';
  if (n.includes('MERSİN') || n.includes('MER-')) return 'Mersin';
  if (n.includes('OSMANİYE') || n.includes('OSM-')) return 'Osmaniye';
  if (n.includes('KADIKÖY') || n.includes('MODA') || n.includes('IST-')) return 'İstanbul';
  return 'Adana';
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

export default function TurkeyCoverageMapPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mapReady, setMapReady] = useState(false);

  const [branches, setBranches] = useState<BranchWithAreas[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Layer toggles
  const [showCircles, setShowCircles] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  // Click-to-Test Marker
  const [testPoint, setTestPoint] = useState<{ lat: number; lon: number } | null>(null);
  const [testResult, setTestResult] = useState<{
    serviceable: boolean;
    branchName?: string;
    distanceKm?: number;
    overlapCount?: number;
    branches?: Array<{ branchId: string; branchName: string; priority: number; distanceKm?: number }>;
    nearestBranch?: { name: string; distKm: number };
  } | null>(null);
  const [testBusy, setTestBusy] = useState(false);

  // Load all branches and their 10km service areas from API
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const client = createAdminClient();
      const branchRes = await client.request({
        path: 'storefront/branches',
        schema: storefrontBranchesSchema,
      });

      const loadedBranches = await Promise.all(
        branchRes.data.map(async (b) => {
          const city = detectCity(b.name, b.code);
          let areas: ServiceArea[] = [];
          try {
            const areaRes = await client.request({
              path: `admin/branches/${b.id}/service-areas`,
              schema: serviceAreasSchema,
            });
            areas = areaRes.data;
          } catch {
            areas = [];
          }
          return {
            ...b,
            city,
            areas,
          };
        }),
      );

      setBranches(loadedBranches);
    } catch (err) {
      console.error('Failed to load branches for map:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useDeferredLoad(() => void loadData(), [loadData]);

  // Cities list
  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const b of branches) set.add(b.city);
    return Array.from(set).sort();
  }, [branches]);

  // Filtered branches
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      if (cityFilter !== 'ALL' && b.city !== cityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          b.name.toLowerCase().includes(q) ||
          b.code.toLowerCase().includes(q) ||
          b.city.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [branches, cityFilter, searchQuery]);

  // Selected branch
  const selectedBranch = useMemo(
    () => branches.find((b) => b.id === selectedBranchId) ?? null,
    [branches, selectedBranchId],
  );

  // Send data to MapLibre / OpenStreetMap iframe
  const sendDataToMap = useCallback(() => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({
        type: 'set-data',
        branches: filteredBranches,
      }),
      '*',
    );
  }, [filteredBranches]);

  useEffect(() => {
    if (mapReady && branches.length > 0) {
      sendDataToMap();
    }
  }, [mapReady, branches, sendDataToMap]);

  // Handle location clicked on the real map
  const handleLocationClicked = useCallback(
    async (lat: number, lon: number) => {
      setTestPoint({ lat, lon });
      setTestBusy(true);

      // Calculate nearest branch
      let nearest: { name: string; distKm: number } | undefined;
      let minDist = Infinity;
      for (const b of branches) {
        const d = haversineKm(lat, lon, b.latitude, b.longitude);
        if (d < minDist) {
          minDist = d;
          nearest = { name: b.name, distKm: Number(d.toFixed(2)) };
        }
      }

      try {
        const client = createAdminClient();
        const res = await client.request({
          path: `storefront/serviceability?latitude=${lat}&longitude=${lon}`,
          schema: serviceabilityResponseSchema,
        });

        setTestResult({
          serviceable: res.data.serviceable,
          branchName: res.data.branchName ?? undefined,
          distanceKm: res.data.distanceKm ?? nearest?.distKm,
          overlapCount: res.data.branches?.length ?? (res.data.serviceable ? 1 : 0),
          branches: res.data.branches,
          nearestBranch: nearest,
        });
      } catch {
        setTestResult({
          serviceable: (nearest?.distKm ?? 99) <= 10,
          distanceKm: nearest?.distKm,
          nearestBranch: nearest,
        });
      } finally {
        setTestBusy(false);
      }
    },
    [branches],
  );

  // Listen to messages from real map iframe
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      let msg;
      try {
        msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      if (msg?.type === 'map-ready') {
        setMapReady(true);
      } else if (msg?.type === 'location-clicked') {
        void handleLocationClicked(msg.latitude, msg.longitude);
      } else if (msg?.type === 'branch-selected') {
        setSelectedBranchId(msg.branchId);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleLocationClicked]);

  // Focus city on the real map
  function focusCity(cityName: string) {
    setCityFilter(cityName);
    setSelectedBranchId(null);
    if (!iframeRef.current?.contentWindow) return;

    if (cityName === 'ALL') {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ type: 'reset-view' }), '*');
      return;
    }

    const cityBranches = branches.filter((b) => b.city === cityName);
    if (cityBranches.length === 0) return;

    const avgLon = cityBranches.reduce((s, b) => s + b.longitude, 0) / cityBranches.length;
    const avgLat = cityBranches.reduce((s, b) => s + b.latitude, 0) / cityBranches.length;

    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({
        type: 'fly-to',
        center: [avgLon, avgLat],
        zoom: cityName === 'Adana' ? 11.5 : 12,
      }),
      '*',
    );
  }

  // Focus specific branch
  function focusBranch(branch: BranchWithAreas) {
    setSelectedBranchId(branch.id);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          type: 'highlight-branch',
          branchId: branch.id,
        }),
        '*',
      );
    }
  }

  // Reset view
  function resetView() {
    setCityFilter('ALL');
    setSelectedBranchId(null);
    setTestPoint(null);
    setTestResult(null);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ type: 'reset-view' }), '*');
    }
  }

  // Toggle circles layer
  function toggleCircles() {
    setShowCircles((v) => {
      const next = !v;
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ type: 'toggle-layer', layer: 'circles', visible: next }),
          '*',
        );
      }
      return next;
    });
  }

  // Toggle labels layer
  function toggleLabels() {
    setShowLabels((v) => {
      const next = !v;
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ type: 'toggle-layer', layer: 'labels', visible: next }),
          '*',
        );
      }
      return next;
    });
  }

  return (
    <main className={styles.page}>
      {/* 1. Header */}
      <header className={styles.header}>
        <div className={styles.headerTitleBlock}>
          <div className={styles.breadcrumb}>
            <span>Operasyon</span>
            <span className={styles.breadcrumbSep}>/</span>
            <span>Şubeler</span>
            <span className={styles.breadcrumbSep}>/</span>
            <span style={{ color: 'var(--accent-gold)' }}>Kapsama Haritası</span>
          </div>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>
              <OpsIcon name="map" />
            </span>
            Türkiye Şube & Servis Ağı Haritası
          </h1>
          <p className={styles.subtitle}>
            Projemizde kullanılan OpenFreeMap / OpenStreetMap motoru üzerinden tüm şubelerin gerçek
            10 km servis ağı poligonlarını, sokak ve il sınırlarını ve kesişim bölgelerini canlı harita
            üzerinde inceleyin.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={`${styles.cityChip} ${showCircles ? styles.cityChipActive : ''}`}
            onClick={toggleCircles}
          >
            <OpsIcon name="adjust" />
            Maks. 10 km Alanları {showCircles ? 'Açık' : 'Kapalı'}
          </button>

          <button
            type="button"
            className={`${styles.cityChip} ${showLabels ? styles.cityChipActive : ''}`}
            onClick={toggleLabels}
          >
            <OpsIcon name="label" />
            Etiketler {showLabels ? 'Açık' : 'Kapalı'}
          </button>

          <button
            type="button"
            className={styles.cityChip}
            onClick={resetView}
            title="Haritayı Türkiye geneline sıfırla"
          >
            <OpsIcon name="zoom_out_map" />
            Sıfırla
          </button>
        </div>
      </header>

      {/* 2. KPI Stats Bar */}
      <section className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Toplam Şube</span>
          <div className={styles.statValue}>
            {branches.length} <span className={styles.statSub}>Lokasyon</span>
          </div>
          <span className={styles.statSub}>15/15 Aktif</span>
        </div>

        <div className={styles.statItem}>
          <span className={styles.statLabel}>Kapsanan İl Sayısı</span>
          <div className={styles.statValue}>
            {cities.length} <span className={styles.statSub}>İl</span>
          </div>
          <span className={styles.statSub}>Adana, Mersin, Gaziantep, Osmaniye, İstanbul</span>
        </div>

        <div className={styles.statItem}>
          <span className={styles.statLabel}>Toplam Kapsama Alanı</span>
          <div className={styles.statValue}>
            ~4.712 <span className={styles.statSub}>km²</span>
          </div>
          <span className={styles.statSub}>Her şube müşteriye azami 10.0 km uzaklığa kadar servis verir</span>
        </div>

        <div className={styles.statItem}>
          <span className={styles.statLabel}>Harita Motoru</span>
          <div className={styles.statValue} style={{ color: 'var(--accent-gold)', fontSize: '18px' }}>
            OpenFreeMap
          </div>
          <span className={styles.statSub}>Vektör & Canlı Ölçek Cetveli</span>
        </div>
      </section>

      {/* 2.5 Radius & Scale Analysis Box */}
      <div className={styles.metricNoticeBox}>
        <div className={styles.noticeIcon}>
          <OpsIcon name="check_circle" />
        </div>
        <div className={styles.noticeContent}>
          <div className={styles.noticeTitle}>
            Servis Kuralı: Şubeden Müşteriye Azami 10.0 km Uzaklık
          </div>
          <p className={styles.noticeText}>
            Sistemdeki tüm şubeler, kendi merkezinden müşterinin konumuna olan mesafesi en fazla{' '}
            <strong>10.0 km</strong> olan adreslere servis verecek şekilde yapılandırıldı.
            Harita üzerindeki dairesel alanlar, şubeden <strong>10.0 km uzağa</strong> uzanan tüm sipariş noktalarını (kuzey, güney, doğu, batı) sınırlandırmaktadır.
            Haritaya tıklayarak müşterinin şubeye olan net km mesafesini ve servis durumunu canlı test edebilirsiniz.
          </p>
          <div className={styles.metricComparison}>
            <div className={styles.metricPill}>
              <span className={styles.metricPillBadge}>Kural</span>
              <span><strong>Müşteri — Şube Uzaklığı ≤ 10.0 km</strong></span>
            </div>
            <div className={styles.metricPill}>
              <span className={styles.metricPillBadge} style={{ background: 'rgba(63, 185, 80, 0.2)', color: 'var(--accent-green)' }}>Azami Menzil</span>
              <span>Tek yön azami <strong>10.0 km</strong> mesafe (Doğu-Batı toplam aksı: 20 km)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Workspace Grid */}
      <div className={styles.workspace}>
        {/* Real Map Container */}
        <section className={styles.mapContainer}>
          <div className={styles.mapToolbar}>
            <div className={styles.cityFilterChips}>
              <span style={{ fontSize: '11px', color: 'var(--text-faint)', fontWeight: 700 }}>
                ŞEHRE ODAKLAN:
              </span>
              <button
                type="button"
                className={`${styles.cityChip} ${cityFilter === 'ALL' ? styles.cityChipActive : ''}`}
                onClick={() => focusCity('ALL')}
              >
                Tüm Türkiye ({branches.length})
              </button>
              {cities.map((city) => {
                const count = branches.filter((b) => b.city === city).length;
                return (
                  <button
                    key={city}
                    type="button"
                    className={`${styles.cityChip} ${cityFilter === city ? styles.cityChipActive : ''}`}
                    onClick={() => focusCity(city)}
                  >
                    {city} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real Map Iframe (MapLibre GL + OpenFreeMap / OSM) */}
          <div className={styles.canvasWrapper}>
            <iframe
              ref={iframeRef}
              src="/coverage-map-viewer.html"
              className={styles.mapFrame}
              title="FASTFOOD Gerçek Kapsama Haritası"
            />
          </div>

          {/* Map Legend Footer */}
          <div className={styles.mapLegend}>
            <div className={styles.legendItems}>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ background: 'var(--accent-gold)' }} />
                <span>Şube Konumu</span>
              </div>
              <div className={styles.legendItem}>
                <div
                  className={styles.legendDot}
                  style={{ background: 'rgba(255, 183, 77, 0.4)', border: '1px solid var(--accent-gold)' }}
                />
                <span>10 km Gerçek Servis Ağı</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ background: '#58a6ff' }} />
                <span>Seçili / Odaklanılan Şube</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ background: '#3fb950' }} />
                <span>Test Edilen Müşteri Noktası</span>
              </div>
            </div>

            <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
              İpucu: Gerçek haritada herhangi bir cadde/adrese tıklayarak anlık kapsama testi yapabilirsiniz.
            </span>
          </div>
        </section>

        {/* 4. Sidebar / Branch Roster & Live Detail */}
        <aside className={styles.sidebar}>
          {/* Test Point Result Card (if user clicked on the real map) */}
          {testPoint && (
            <div
              className={`${styles.testResultCard} ${
                !testResult?.serviceable
                  ? styles.testResultError
                  : (testResult?.overlapCount ?? 0) > 1
                  ? styles.testResultWarning
                  : ''
              }`}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <OpsIcon name={testResult?.serviceable ? 'check_circle' : 'cancel'} />
                  {testBusy
                    ? 'Konum Hesaplanıyor…'
                    : testResult?.serviceable
                    ? (testResult.overlapCount ?? 0) > 1
                      ? 'Kesişim Bölgesi (Çoklu Şube)'
                      : 'Teslimat Kapsamında'
                    : 'Kapsama Dışı'}
                </strong>
                <button
                  type="button"
                  className={styles.cityChip}
                  style={{ padding: '2px 8px', fontSize: '10px' }}
                  onClick={() => {
                    setTestPoint(null);
                    setTestResult(null);
                  }}
                >
                  Kapat
                </button>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Koordinat:{' '}
                <span style={{ fontFamily: 'monospace', color: '#fff' }}>
                  {testPoint.lat.toFixed(4)}, {testPoint.lon.toFixed(4)}
                </span>
              </div>

              {testResult && (
                <div style={{ fontSize: '12px' }}>
                  {testResult.nearestBranch && (
                    <p style={{ margin: '4px 0', color: 'var(--text-faint)' }}>
                      En yakın şube: <strong>{testResult.nearestBranch.name}</strong> — Şubeye Mesafe:{' '}
                      <strong style={{ color: '#fff' }}>{testResult.distanceKm ?? testResult.nearestBranch.distKm} km</strong>
                      {testResult.serviceable ? (
                        <span style={{ color: 'var(--accent-green)', marginLeft: '6px' }}>
                          (≤ 10.0 km menzili içinde)
                        </span>
                      ) : (
                        <span style={{ color: 'var(--accent-red)', marginLeft: '6px' }}>
                          (&gt; 10.0 km sınırını aşıyor)
                        </span>
                      )}
                    </p>
                  )}

                  {testResult.serviceable ? (
                    (testResult.overlapCount ?? 0) > 1 ? (
                      <div style={{ marginTop: '6px' }}>
                        <span style={{ color: 'var(--accent-gold)', fontSize: '11px' }}>
                          Müşteri bu konumdan şu şubeleri seçebilir:
                        </span>
                        <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                          {testResult.branches?.map((b) => (
                            <li key={b.branchId}>
                              {b.branchName} (Öncelik {b.priority})
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p style={{ margin: '4px 0 0', color: 'var(--accent-green)' }}>
                        Sipariş otomatik olarak <strong>{testResult.branchName}</strong> şubesine atanır.
                      </p>
                    )
                  ) : (
                    <p style={{ margin: '4px 0 0', color: 'var(--accent-red)' }}>
                      Bu koordinat hiçbir şubenin 10 km servis ağı içinde yer almıyor.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Selected Branch Spotlight Card */}
          {selectedBranch && (
            <div className={styles.spotlightCard}>
              <div className={styles.spotlightTop}>
                <div>
                  <span className={styles.branchCode}>{selectedBranch.code}</span>
                  <h3 className={styles.spotlightTitle}>{selectedBranch.name}</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selectedBranch.city} Bölgesi</span>
                </div>
                <button
                  type="button"
                  className={styles.cityChip}
                  style={{ padding: '3px 8px', fontSize: '10px' }}
                  onClick={() => setSelectedBranchId(null)}
                >
                  Kapat
                </button>
              </div>

              <div className={styles.spotlightGrid}>
                <div>
                  <span style={{ color: 'var(--text-faint)', fontSize: '10px', textTransform: 'uppercase' }}>
                    GPS Koordinatı
                  </span>
                  <p style={{ margin: 0, fontFamily: 'monospace', color: '#fff', fontSize: '11px' }}>
                    {selectedBranch.latitude.toFixed(4)}, {selectedBranch.longitude.toFixed(4)}
                  </p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-faint)', fontSize: '10px', textTransform: 'uppercase' }}>
                    Sipariş Durumu
                  </span>
                  <p
                    style={{
                      margin: 0,
                      color: selectedBranch.isAcceptingOrders ? 'var(--accent-green)' : 'var(--accent-red)',
                      fontWeight: 600,
                    }}
                  >
                    {selectedBranch.isAcceptingOrders ? 'Sipariş Alıyor' : 'Kapalı'}
                  </p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-faint)', fontSize: '10px', textTransform: 'uppercase' }}>
                    Min. Sipariş
                  </span>
                  <p style={{ margin: 0, color: '#fff' }}>
                    {selectedBranch.minOrderMinor
                      ? `₺${(Number(selectedBranch.minOrderMinor) / 100).toFixed(0)}`
                      : '0'}
                  </p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-faint)', fontSize: '10px', textTransform: 'uppercase' }}>
                    Teslimat Ücreti
                  </span>
                  <p style={{ margin: 0, color: '#fff' }}>
                    {selectedBranch.deliveryFeeMinor
                      ? `₺${(Number(selectedBranch.deliveryFeeMinor) / 100).toFixed(2)}`
                      : '0'}
                  </p>
                </div>
                <div style={{ gridColumn: 'span 2', padding: '8px 10px', background: 'rgba(255, 183, 77, 0.08)', borderRadius: '6px', border: '1px dashed rgba(255, 183, 77, 0.35)' }}>
                  <div style={{ color: 'var(--accent-gold)', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>
                    🎯 Şube Kapsama Boyutları
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: '#c9d1d9' }}>
                    <span>Müşteriye Azami Mesafe: <strong style={{ color: '#fff' }}>10.0 km</strong></span>
                    <span>Doğu-Batı Aksı: <strong style={{ color: '#fff' }}>20.0 km</strong></span>
                    <span>Alan: <strong style={{ color: '#fff' }}>~314.16 km²</strong></span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={`/branches/${selectedBranch.id}`}
                  className={`${styles.cityChip} ${styles.cityChipActive}`}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <OpsIcon name="edit" />
                  Şube Profilini Düzenle
                </a>
              </div>
            </div>
          )}

          {/* Branch Roster List Card */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarHeader}>
              <h3 className={styles.sidebarTitle}>
                <OpsIcon name="storefront" />
                Şube Listesi ({filteredBranches.length})
              </h3>
            </div>

            <div className={styles.searchBox}>
              <span className={styles.searchIcon}>
                <OpsIcon name="search" />
              </span>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Şube veya il ara…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                <OpsIcon name="progress_activity" />
                <p style={{ fontSize: '12px' }}>Şubeler getiriliyor…</p>
              </div>
            ) : (
              <div className={styles.branchListScroll}>
                {filteredBranches.map((branch) => {
                  const isSelected = selectedBranchId === branch.id;

                  return (
                    <div
                      key={branch.id}
                      className={`${styles.branchItem} ${isSelected ? styles.branchItemActive : ''}`}
                      onClick={() => focusBranch(branch)}
                    >
                      <div className={styles.branchItemTop}>
                        <span className={styles.branchCode}>{branch.code}</span>
                        <span className={styles.branchCityTag}>{branch.city}</span>
                      </div>

                      <div className={styles.branchName}>{branch.name}</div>

                      <div className={styles.branchMetaRow}>
                        <span>10 km Servis Ağı</span>
                        <span
                          style={{
                            color: branch.isAcceptingOrders ? 'var(--accent-green)' : 'var(--accent-red)',
                            fontWeight: 600,
                          }}
                        >
                          {branch.isAcceptingOrders ? 'Açık' : 'Kapalı'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
