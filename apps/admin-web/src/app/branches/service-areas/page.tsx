'use client';

import { adminPagePermission } from '@fastfood/domain-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';

import { errorMessage, type LoadState } from '../../../components/async-boundary';
import { useBranchContext } from '../../../components/ops/branch-context';
import { ConfirmDialog } from '../../../components/ops/confirm-dialog';
import { OpsIcon } from '../../../components/ops/ops-icon';
import { useOpsSync } from '../../../components/ops/ops-sync';
import { useOpsToast } from '../../../components/ops/ops-toast';
import { hasStaffPermission, useStaffAccess } from '../../../components/ops/staff-access-context';
import { createAdminClient } from '../../../lib/api';
import { adminBranchSchema, serviceAreasSchema } from '../../../lib/schemas';
import { useDeferredLoad } from '../../../lib/use-deferred-load';

import styles from './service-areas.module.css';

type Area = z.infer<typeof serviceAreasSchema>['data'][number];
type BranchDetail = z.infer<typeof adminBranchSchema>['data'];
type PinPoint = { lat: number; lng: number };
type MapMode = 'draw' | 'test';

export interface OtherBranchAreaItem {
  branchId: string;
  branchName: string;
  branchCode?: string;
  branchLat: number;
  branchLng: number;
  areaId: string;
  areaName: string;
  polygonGeoJson: unknown;
}

export interface OtherBranchPin {
  id: string;
  name: string;
  code?: string;
  latitude: number;
  longitude: number;
}

const storefrontBranchesSchema = z.object({
  data: z.array(
    z
      .object({
        id: z.string(),
        code: z.string(),
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
      })
      .passthrough(),
  ),
});

const singleServiceAreaResponseSchema = z.object({
  data: z
    .object({
      id: z.string(),
      name: z.string().optional(),
      priority: z.number().optional(),
    })
    .passthrough(),
  meta: z.unknown().optional(),
});

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

interface TestPointState {
  lat: number;
  lng: number;
  inActivePolygon: boolean;
  serverServiceable: boolean | null;
  serverBranchName: string | null;
  busy: boolean;
}

const EMPTY_AREAS: readonly Area[] = [];

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

function extractPinsFromGeoJson(geoJson: unknown): PinPoint[] {
  if (!geoJson || typeof geoJson !== 'object') return [];
  const typed = geoJson as { type?: string; coordinates?: unknown };
  let ring: unknown = null;

  if (typed.type === 'Polygon' && Array.isArray(typed.coordinates)) {
    ring = typed.coordinates[0];
  } else if (
    typed.type === 'MultiPolygon' &&
    Array.isArray(typed.coordinates) &&
    Array.isArray(typed.coordinates[0])
  ) {
    ring = (typed.coordinates[0] as unknown[])[0];
  }

  if (!Array.isArray(ring)) return [];

  const parsed: PinPoint[] = [];
  for (const pt of ring) {
    if (
      Array.isArray(pt) &&
      pt.length >= 2 &&
      typeof pt[0] === 'number' &&
      typeof pt[1] === 'number' &&
      Number.isFinite(pt[0]) &&
      Number.isFinite(pt[1])
    ) {
      parsed.push({ lat: round6(pt[1]), lng: round6(pt[0]) });
    }
  }

  if (parsed.length > 1) {
    const first = parsed[0];
    const last = parsed[parsed.length - 1];
    if (
      first &&
      last &&
      Math.abs(first.lat - last.lat) < 1e-6 &&
      Math.abs(first.lng - last.lng) < 1e-6
    ) {
      parsed.pop();
    }
  }

  return parsed;
}

function pinsToGeoJsonPolygon(pins: readonly PinPoint[]) {
  const ring = pins.map((p) => [round6(p.lng), round6(p.lat)]);
  const first = pins[0];
  if (first) {
    ring.push([round6(first.lng), round6(first.lat)]);
  }
  return {
    type: 'Polygon' as const,
    coordinates: [ring],
  };
}

function downsamplePins(pins: readonly PinPoint[], targetCount = 12): PinPoint[] {
  if (pins.length <= targetCount) return [...pins];
  const step = pins.length / targetCount;
  const out: PinPoint[] = [];
  for (let i = 0; i < targetCount; i++) {
    const idx = Math.floor(i * step);
    if (pins[idx]) out.push(pins[idx]);
  }
  return out;
}

function sortPinsAroundCenter(
  pins: readonly PinPoint[],
  centerLat: number,
  centerLng: number,
): PinPoint[] {
  return [...pins].sort((a, b) => {
    const angA = Math.atan2(a.lat - centerLat, a.lng - centerLng);
    const angB = Math.atan2(b.lat - centerLat, b.lng - centerLng);
    return angA - angB;
  });
}

function buildRadialPinsTemplate(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  corners = 6,
): PinPoint[] {
  const latRad = (centerLat * Math.PI) / 180;
  const degPerKmLat = 1 / 110.574;
  const degPerKmLng = 1 / (111.32 * Math.max(0.1, Math.cos(latRad)));
  const pins: PinPoint[] = [];
  for (let i = 0; i < corners; i++) {
    const theta = (2 * Math.PI * i) / corners;
    pins.push({
      lat: round6(centerLat + radiusKm * degPerKmLat * Math.cos(theta)),
      lng: round6(centerLng + radiusKm * degPerKmLng * Math.sin(theta)),
    });
  }
  return sortPinsAroundCenter(pins, centerLat, centerLng);
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isPointInPolygon(lat: number, lng: number, pins: readonly PinPoint[]): boolean {
  if (pins.length < 3) return false;
  let inside = false;
  for (let i = 0, j = pins.length - 1; i < pins.length; j = i++) {
    const pi = pins[i];
    const pj = pins[j];
    if (!pi || !pj) continue;
    const xi = pi.lng;
    const yi = pi.lat;
    const xj = pj.lng;
    const yj = pj.lat;
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function polygonPerimeterKm(pins: readonly PinPoint[]): number {
  if (pins.length < 2) return 0;
  let total = 0;
  const edgeCount = pins.length === 2 ? 1 : pins.length;
  for (let i = 0; i < edgeCount; i++) {
    const a = pins[i];
    const b = pins[(i + 1) % pins.length];
    if (a && b) total += haversineKm(a.lat, a.lng, b.lat, b.lng);
  }
  return total;
}

function polygonAreaKm2(pins: readonly PinPoint[]): number {
  const origin = pins[0];
  if (pins.length < 3 || !origin) return 0;
  const refLat = origin.lat;
  const kmPerDegLat = 110.574;
  const kmPerDegLng = 111.32 * Math.max(0.1, Math.cos((refLat * Math.PI) / 180));
  let area = 0;
  for (let i = 0; i < pins.length; i++) {
    const p1 = pins[i];
    const p2 = pins[(i + 1) % pins.length];
    if (!p1 || !p2) continue;
    const x1 = (p1.lng - origin.lng) * kmPerDegLng;
    const y1 = (p1.lat - origin.lat) * kmPerDegLat;
    const x2 = (p2.lng - origin.lng) * kmPerDegLng;
    const y2 = (p2.lat - origin.lat) * kmPerDegLat;
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

export default function ServiceAreasPinEditorPage() {
  const branchContext = useBranchContext();
  const branchId = branchContext.branchId;
  const access = useStaffAccess();
  const canWrite = hasStaffPermission(access, adminPagePermission('service-areas', 'create'));
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const toast = useOpsToast();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mapReady, setMapReady] = useState(false);

  const [state, setState] = useState<LoadState<Area[]>>({ status: 'loading' });
  const [branchDetail, setBranchDetail] = useState<BranchDetail | null>(null);
  const [busy, setBusy] = useState(false);

  // Active polygon editor state
  const [pins, setPins] = useState<PinPoint[]>([]);
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [areaName, setAreaName] = useState('');
  const [areaPriority, setAreaPriority] = useState('0');
  const [mapMode, setMapMode] = useState<MapMode>('draw');
  const [showGuides, setShowGuides] = useState(true);

  // Other branches' service areas for cross-branch coverage visibility
  const [otherBranchAreas, setOtherBranchAreas] = useState<OtherBranchAreaItem[]>([]);
  const [otherBranches, setOtherBranches] = useState<OtherBranchPin[]>([]);
  const [showOtherBranches, setShowOtherBranches] = useState(true);
  const allBranchesCacheRef = useRef<Map<string, { branch: OtherBranchPin; areas: Area[] }>>(
    new Map(),
  );

  // Delete confirmation & test point
  const [deleteTarget, setDeleteTarget] = useState<Area | null>(null);
  const [testPoint, setTestPoint] = useState<TestPointState | null>(null);

  const lastLoadedBranchRef = useRef<string | null>(null);

  const areas: readonly Area[] = useMemo(
    () => (state.status === 'ready' ? state.data : EMPTY_AREAS),
    [state],
  );

  const updateOtherBranchesFromCache = useCallback((currentBranchId: string) => {
    const othersAreas: OtherBranchAreaItem[] = [];
    const othersPins: OtherBranchPin[] = [];

    for (const [id, item] of allBranchesCacheRef.current.entries()) {
      if (id === currentBranchId) continue;
      othersPins.push(item.branch);
      for (const a of item.areas) {
        othersAreas.push({
          branchId: item.branch.id,
          branchName: item.branch.name,
          branchCode: item.branch.code,
          branchLat: item.branch.latitude,
          branchLng: item.branch.longitude,
          areaId: a.id,
          areaName: a.name ?? `${item.branch.name} Servis Alanı`,
          polygonGeoJson: a.polygonGeoJson ?? a.polygon,
        });
      }
    }
    setOtherBranchAreas(othersAreas);
    setOtherBranches(othersPins);
  }, []);

  const selectAreaIntoEditor = useCallback(
    (area: Area | null, branch: BranchDetail | null) => {
      if (area) {
        const extracted = extractPinsFromGeoJson(area.polygonGeoJson ?? area.polygon);
        setEditingAreaId(area.id);
        setAreaName(area.name ?? `${branch?.name ?? 'Şube'} Servis Alanı`);
        setAreaPriority(String(area.priority ?? 0));
        setPins(extracted);
      } else {
        setEditingAreaId(null);
        setAreaName(`${branch?.name ?? branchContext.selected?.name ?? 'Şube'} Servis Alanı`);
        setAreaPriority('0');
        setPins([]);
      }
      setTestPoint(null);
    },
    [branchContext.selected?.name],
  );

  const load = useCallback(
    async (preferredAreaId?: string | null, forceReloadAll = false) => {
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

        const detail = branchRes?.data ?? null;
        if (detail) setBranchDetail(detail);

        if (areasRes.data.length === 0) setState({ status: 'empty' });
        else setState({ status: 'ready', data: areasRes.data });

        // Update active branch in cache
        if (detail && detail.latitude != null && detail.longitude != null) {
          allBranchesCacheRef.current.set(branchId, {
            branch: {
              id: detail.id,
              name: detail.name,
              code: detail.code,
              latitude: detail.latitude,
              longitude: detail.longitude,
            },
            areas: areasRes.data,
          });
        }

        // Fetch other branches and their coverage if not already cached or force reload
        if (allBranchesCacheRef.current.size <= 1 || forceReloadAll) {
          try {
            const sfRes = await client.request({
              path: 'storefront/branches',
              schema: storefrontBranchesSchema,
            });
            const othersToFetch = sfRes.data.filter((b) => b.id !== branchId);
            const fetched = await Promise.all(
              othersToFetch.map(async (b) => {
                try {
                  const aRes = await client.request({
                    path: `admin/branches/${b.id}/service-areas`,
                    schema: serviceAreasSchema,
                  });
                  return {
                    branch: {
                      id: b.id,
                      name: b.name,
                      code: b.code,
                      latitude: b.latitude,
                      longitude: b.longitude,
                    },
                    areas: aRes.data,
                  };
                } catch {
                  return {
                    branch: {
                      id: b.id,
                      name: b.name,
                      code: b.code,
                      latitude: b.latitude,
                      longitude: b.longitude,
                    },
                    areas: [],
                  };
                }
              }),
            );
            for (const item of fetched) {
              allBranchesCacheRef.current.set(item.branch.id, item);
            }
          } catch (err) {
            console.warn('Failed to fetch other branches for map reference:', err);
          }
        }

        // Compute other branches' service areas from cache
        updateOtherBranchesFromCache(branchId);

        const branchSwitched = lastLoadedBranchRef.current !== branchId;
        lastLoadedBranchRef.current = branchId;

        if (preferredAreaId !== undefined) {
          const target = areasRes.data.find((a) => a.id === preferredAreaId) ?? null;
          selectAreaIntoEditor(target, detail);
        } else if (branchSwitched) {
          selectAreaIntoEditor(areasRes.data[0] ?? null, detail);
          if (detail?.latitude != null && detail?.longitude != null) {
            iframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ type: 'fly-to-branch', branch: detail }),
              '*',
            );
          }
        }

        markSynced();
      } catch (error) {
        setState({ status: 'error', error });
        markStale();
      }
    },
    [branchId, markStale, markSynced, selectAreaIntoEditor, updateOtherBranchesFromCache],
  );

  useEffect(() => {
    registerRefresh(() => load());
    return () => registerRefresh(null);
  }, [load, registerRefresh]);

  useDeferredLoad(() => void load(), [load]);

  const branchLat = branchDetail?.latitude ?? null;
  const branchLng = branchDetail?.longitude ?? null;

  const centerInside = useMemo(() => {
    if (branchLat == null || branchLng == null || pins.length < 3) return true;
    return isPointInPolygon(branchLat, branchLng, pins);
  }, [branchLat, branchLng, pins]);

  const perimeterKm = useMemo(() => polygonPerimeterKm(pins), [pins]);
  const areaKm2 = useMemo(() => polygonAreaKm2(pins), [pins]);
  const maxPinDistKm = useMemo(() => {
    if (branchLat == null || branchLng == null || pins.length === 0) return 0;
    return Math.max(...pins.map((p) => haversineKm(branchLat, branchLng, p.lat, p.lng)));
  }, [branchLat, branchLng, pins]);

  // Sync editor state to map iframe
  useEffect(() => {
    if (!mapReady || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({
        type: 'set-state',
        branch: branchDetail,
        pins,
        savedAreas: areas,
        activeAreaId: editingAreaId,
        otherBranchAreas,
        otherBranches,
        showOtherBranches,
        mode: mapMode,
        showGuides,
        centerInside,
        testPoint: testPoint
          ? {
              lat: testPoint.lat,
              lng: testPoint.lng,
              serviceable: testPoint.inActivePolygon,
            }
          : null,
      }),
      '*',
    );
  }, [
    areas,
    branchDetail,
    centerInside,
    editingAreaId,
    mapMode,
    mapReady,
    otherBranchAreas,
    otherBranches,
    pins,
    showGuides,
    showOtherBranches,
    testPoint,
  ]);

  // Fly to branch once map finishes initializing
  useEffect(() => {
    if (!mapReady || !branchDetail || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({ type: 'fly-to-branch', branch: branchDetail }),
      '*',
    );
    // Only fly on mapReady + branchId change so dragging pins never moves camera
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, branchDetail?.id]);

  // Test click handler (test mode)
  const handleTestPointClick = useCallback(
    async (lat: number, lng: number) => {
      const inLocalPoly = isPointInPolygon(lat, lng, pins);
      setTestPoint({
        lat,
        lng,
        inActivePolygon: inLocalPoly,
        serverServiceable: null,
        serverBranchName: null,
        busy: true,
      });

      try {
        const res = await createAdminClient().request({
          path: `storefront/serviceability?latitude=${lat}&longitude=${lng}`,
          schema: serviceabilityResponseSchema,
        });
        setTestPoint({
          lat,
          lng,
          inActivePolygon: inLocalPoly,
          serverServiceable: res.data.serviceable,
          serverBranchName: res.data.branchName ?? null,
          busy: false,
        });
      } catch {
        setTestPoint((prev) => (prev ? { ...prev, busy: false } : null));
      }
    },
    [pins],
  );

  // Listen for iframe messages
  useEffect(() => {
    function onMessage(event: MessageEvent<unknown>) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      let msg: { type?: string; pins?: PinPoint[]; latitude?: number; longitude?: number };
      try {
        msg = (typeof event.data === 'string' ? JSON.parse(event.data) : event.data) as typeof msg;
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'map-ready') {
        setMapReady(true);
      } else if (msg.type === 'pins-changed' && Array.isArray(msg.pins)) {
        setPins(
          msg.pins
            .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
            .map((p) => ({ lat: round6(p.lat), lng: round6(p.lng) })),
        );
      } else if (
        msg.type === 'test-point-clicked' &&
        typeof msg.latitude === 'number' &&
        typeof msg.longitude === 'number'
      ) {
        void handleTestPointClick(msg.latitude, msg.longitude);
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [handleTestPointClick]);

  // Actions
  function applyRadialTemplate(radiusKm: number) {
    if (branchLat == null || branchLng == null) {
      toast.error('Şubenin GPS koordinatı tanımlı olmadığı için şablon yerleştirilemedi.');
      return;
    }
    const generated = buildRadialPinsTemplate(branchLat, branchLng, radiusKm, 6);
    setPins(generated);
    setMapMode('draw');
    toast.success(
      `Şube merkezli ${radiusKm} km 6 köşeli pin şablonu yerleştirildi. Köşeleri sürükleyerek düzenleyebilirsiniz.`,
    );
    setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ type: 'fit-bounds' }), '*');
    }, 80);
  }

  function handleSortClockwise() {
    if (branchLat == null || branchLng == null || pins.length < 3) return;
    setPins((prev) => sortPinsAroundCenter(prev, branchLat, branchLng));
    toast.success('Pinler şube merkezi etrafında saat yönünde sıraya dizildi.');
  }

  function handleSimplifyPins() {
    if (pins.length <= 12) return;
    setPins((prev) => downsamplePins(prev, 12));
    toast.success('Poligon sürüklemesi kolay 12 köşeli pin yapısına sadeleştirildi.');
  }

  function handleUndoPin() {
    setPins((prev) => prev.slice(0, -1));
  }

  function handleClearPins() {
    setPins([]);
    setTestPoint(null);
  }

  function handleStartNewArea() {
    selectAreaIntoEditor(null, branchDetail);
    setMapMode('draw');
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ type: 'fly-to-branch', branch: branchDetail }),
      '*',
    );
  }

  async function handleSavePolygon() {
    if (!canWrite) return;
    if (pins.length < 3) {
      toast.error('Kapalı bir servis alanı oluşturmak için haritaya en az 3 pin koymalısınız.');
      return;
    }
    const cleanName = areaName.trim();
    if (!cleanName) {
      toast.error('Lütfen servis alanı için bir ad girin.');
      return;
    }
    const priorityNum = Number(areaPriority);
    if (!Number.isInteger(priorityNum) || priorityNum < 0) {
      toast.error('Öncelik değeri 0 veya pozitif bir tam sayı olmalıdır.');
      return;
    }

    const polygonGeoJson = pinsToGeoJsonPolygon(pins);
    setBusy(true);
    try {
      if (editingAreaId) {
        await createAdminClient().request({
          method: 'PATCH',
          path: `admin/branches/${branchId}/service-areas/${editingAreaId}`,
          body: {
            name: cleanName,
            priority: priorityNum,
            polygonGeoJson,
          },
          schema: singleServiceAreaResponseSchema,
        });
        toast.success(`"${cleanName}" servis alanı güncellendi.`);
        await load(editingAreaId);
      } else {
        const res = await createAdminClient().request({
          method: 'POST',
          path: `admin/branches/${branchId}/service-areas`,
          body: {
            name: cleanName,
            priority: priorityNum,
            polygonGeoJson,
          },
          schema: singleServiceAreaResponseSchema,
        });
        toast.success(`"${cleanName}" servis alanı kaydedildi.`);
        await load(res.data.id);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeleteArea() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const deletedId = deleteTarget.id;
      await createAdminClient().request({
        method: 'DELETE',
        path: `admin/branches/${branchId}/service-areas/${deletedId}`,
        schema: z.unknown(),
      });
      setDeleteTarget(null);
      toast.success('Servis alanı silindi (pasife alındı).');
      const remaining = areas.filter((a) => a.id !== deletedId);
      await load(editingAreaId === deletedId ? (remaining[0]?.id ?? null) : editingAreaId);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitleBlock}>
          <div className={styles.breadcrumb}>
            <span>Operasyon</span>
            <span className={styles.breadcrumbSep}>/</span>
            <span>Şubeler</span>
            <span className={styles.breadcrumbSep}>/</span>
            <span style={{ color: 'var(--accent-gold)' }}>Servis Alanları</span>
          </div>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>
              <OpsIcon name="add_location_alt" />
            </span>
            Harita Pinleriyle Servis Alanı Oluşturma
          </h1>
          <p className={styles.subtitle}>
            Seçili şubeyi merkez kabul ederek harita üzerine pinler yerleştirin. Pinler sırasıyla
            birleşerek kapalı bir teslimat bölgesi oluşturur. Mevcut pinleri sürükleyebilir, kenar
            ortasındaki <strong>+</strong> noktalarından yeni köşe ekleyebilir veya sağ tıklayarak
            pin silebilirsiniz.
          </p>
        </div>

        <div className={styles.headerControls}>
          {branchContext.branches.length > 0 && (
            <select
              className={styles.branchSelect}
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

          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => void load(editingAreaId, true)}
            disabled={busy}
            title="Tüm şube ve servis alanı verilerini baştan yenile"
          >
            <OpsIcon name="refresh" />
            Yenile
          </button>
        </div>
      </header>

      {/* Branch Anchor Status Bar */}
      <section className={styles.anchorBar}>
        <div className={styles.anchorIdentity}>
          <span className={styles.codeBadge}>
            {branchDetail?.code ?? branchContext.selected?.code ?? 'ŞUBE'}
          </span>
          <span className={styles.anchorName}>
            {branchDetail?.name ?? branchContext.selected?.name ?? 'Seçili Şube'}
          </span>
          <span className={styles.coordPill}>
            <OpsIcon name="my_location" />
            {branchLat != null && branchLng != null
              ? `Merkez: ${branchLat.toFixed(5)} K · ${branchLng.toFixed(5)} D`
              : 'Merkez koordinatı tanımlı değil'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {pins.length < 3 ? (
            <span className={`${styles.statusPill} ${styles.statusPending}`}>
              <OpsIcon name="polyline" />
              Kapalı alan için {3 - pins.length} pin daha ekleyin ({pins.length}/3)
            </span>
          ) : centerInside ? (
            <span className={`${styles.statusPill} ${styles.statusOk}`}>
              <OpsIcon name="check_circle" />
              Kapalı Alan Hazır ({pins.length} Pin · Merkez Kapsamda)
            </span>
          ) : (
            <span className={`${styles.statusPill} ${styles.statusWarn}`}>
              <OpsIcon name="warning" />
              Şube merkezi poligon dışında kalıyor
            </span>
          )}
        </div>
      </section>

      {/* Main Workspace */}
      <div className={styles.workspace}>
        {/* Left: Interactive Map */}
        <section className={styles.mapCard} aria-label="İnteraktif Pin Haritası">
          <div className={styles.mapToolbar}>
            <div className={styles.modeGroup} role="group" aria-label="Harita Etkileşim Modu">
              <button
                type="button"
                className={`${styles.modeBtn} ${mapMode === 'draw' ? styles.modeBtnActive : ''}`}
                onClick={() => setMapMode('draw')}
              >
                <OpsIcon name="add_location_alt" />
                Pin Koy / Düzenle
              </button>
              <button
                type="button"
                className={`${styles.modeBtn} ${mapMode === 'test' ? styles.modeBtnTestActive : ''}`}
                onClick={() => setMapMode('test')}
              >
                <OpsIcon name="gps_fixed" />
                Adres Kapsama Testi
              </button>
            </div>

            <div className={styles.toolActions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() =>
                  iframeRef.current?.contentWindow?.postMessage(
                    JSON.stringify({ type: 'fly-to-branch', branch: branchDetail }),
                    '*',
                  )
                }
                disabled={branchLat == null}
                title="Haritayı şube merkezine odakla"
              >
                <OpsIcon name="my_location" />
                Merkeze Odakla
              </button>

              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() =>
                  iframeRef.current?.contentWindow?.postMessage(
                    JSON.stringify({ type: 'fit-bounds' }),
                    '*',
                  )
                }
                disabled={pins.length === 0}
                title="Tüm pinleri ekrana sığdır"
              >
                <OpsIcon name="zoom_out_map" />
                Alana Sığdır
              </button>

              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary} ${
                  showGuides ? styles.btnSecondaryActive : ''
                }`}
                onClick={() => setShowGuides((v) => !v)}
                title="2 km, 5 km ve 10 km mesafe rehber halkalarını göster/gizle"
              >
                <OpsIcon name="radar" />
                Mesafe Halkaları
              </button>

              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary} ${
                  showOtherBranches ? styles.btnPurpleActive : ''
                }`}
                onClick={() => setShowOtherBranches((v) => !v)}
                title="Diğer şubelerin mevcut servis alanlarını ve merkezlerini harita üzerinde göster/gizle"
              >
                <OpsIcon name="share_location" />
                Diğer Şubeler {otherBranchAreas.length > 0 ? `(${otherBranchAreas.length})` : ''}
              </button>

              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={handleSortClockwise}
                disabled={pins.length < 3 || branchLat == null}
                title="Pinleri merkez etrafında düzgün sıraya dizerek çizgi kesişimlerini düzelt"
              >
                <OpsIcon name="sort" />
                Sırala
              </button>

              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={handleUndoPin}
                disabled={pins.length === 0 || !canWrite}
                title="Son eklenen pini geri al"
              >
                <OpsIcon name="undo" />
                Geri Al
              </button>

              <button
                type="button"
                className={`${styles.btn} ${styles.btnDanger}`}
                onClick={handleClearPins}
                disabled={pins.length === 0 || !canWrite}
                title="Haritadaki tüm pinleri temizle"
              >
                <OpsIcon name="clear_all" />
                Temizle
              </button>
            </div>
          </div>

          <div className={styles.mapCanvasWrap}>
            <iframe
              ref={iframeRef}
              src="/service-area-editor.html"
              className={styles.mapFrame}
              title="Şube Servis Alanı Pin Editörü Haritası"
            />
          </div>

          <div className={styles.mapHintBar}>
            <div className={styles.legendRow}>
              <span className={styles.legendItem}>
                <span className={styles.dotCenter} /> Şube Merkezi
              </span>
              <span className={styles.legendItem}>
                <span className={styles.dotPin1} /> Başlangıç Pini (#1)
              </span>
              <span className={styles.legendItem}>
                <span className={styles.dotPin} /> Köşe Pinleri (#2..N)
              </span>
              <span className={styles.legendItem}>
                <span className={styles.dotSaved} /> Kayıtlı Alanlar
              </span>
              <span className={styles.legendItem}>
                <span className={styles.dotOtherBranch} /> Diğer Şube Alanları
              </span>
            </div>

            <span>
              {mapMode === 'draw'
                ? 'İpucu: Haritaya tıklayarak pin ekleyin · Pinleri sürükleyin · Sağ tık ile pin silin'
                : 'Test Modu: Haritada bir noktaya tıklayarak çizili alan içinde olup olmadığını test edin'}
            </span>
          </div>
        </section>

        {/* Right: Controls, Pin List & Saved Areas */}
        <aside className={styles.sidePanel}>
          {/* Quick Start Templates */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <OpsIcon name="auto_fix_high" />
                Hızlı Pin Şablonları
              </h2>
              {pins.length > 24 && (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                  onClick={handleSimplifyPins}
                >
                  12 Pine İndir ({pins.length})
                </button>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
              Şubeyi merkez alan 6 köşeli başlangıç poligonu yerleştirip köşeleri mahallelere göre
              sürükleyebilirsiniz:
            </p>
            <div className={styles.templateBar}>
              {[2, 3, 5, 8, 10].map((km) => (
                <button
                  key={km}
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                  disabled={!canWrite || branchLat == null}
                  onClick={() => applyRadialTemplate(km)}
                >
                  {km} km (6 Pin)
                </button>
              ))}
            </div>
          </div>

          {/* Live Metrics & Save Form */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <OpsIcon name="polyline" />
                {editingAreaId ? 'Seçili Alanı Düzenle' : 'Yeni Servis Alanı'}
              </h2>
              {editingAreaId && (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                  onClick={handleStartNewArea}
                >
                  <OpsIcon name="add" />
                  Yeni Alan Çiz
                </button>
              )}
            </div>

            <div className={styles.metricsGrid}>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Pin Sayısı</span>
                <span className={styles.metricVal}>{pins.length}</span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Kapladığı Alan</span>
                <span className={styles.metricVal}>
                  {pins.length >= 3 ? `${areaKm2.toFixed(1)} km²` : '—'}
                </span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Çevre / Uç</span>
                <span className={styles.metricVal}>
                  {pins.length >= 3
                    ? `${perimeterKm.toFixed(1)} km`
                    : maxPinDistKm > 0
                      ? `${maxPinDistKm.toFixed(1)} km`
                      : '—'}
                </span>
              </div>
            </div>

            {pins.length >= 3 && !centerInside && (
              <div className={`${styles.alertBox} ${styles.alertWarn}`}>
                <OpsIcon name="warning" />
                <span>
                  Şube merkezi bu kapalı alanın dışında kaldı. Pinler kesişiyorsa{' '}
                  <strong>Sırala</strong> butonuna basın veya şubeyi çevreleyecek şekilde pinleri
                  taşıyın.
                </span>
              </div>
            )}

            <div className={styles.formRowSplit}>
              <div className={styles.formRow}>
                <label className={styles.label} htmlFor="area-name-input">
                  Servis Alanı Adı
                </label>
                <input
                  id="area-name-input"
                  type="text"
                  className={styles.input}
                  placeholder="Örn: Merkez 1. Bölge"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  disabled={!canWrite || busy}
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.label} htmlFor="area-priority-input">
                  Öncelik
                </label>
                <input
                  id="area-priority-input"
                  type="number"
                  min={0}
                  step={1}
                  className={styles.input}
                  value={areaPriority}
                  onChange={(e) => setAreaPriority(e.target.value)}
                  disabled={!canWrite || busy}
                />
              </div>
            </div>

            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={!canWrite || busy || pins.length < 3 || !areaName.trim()}
              onClick={() => void handleSavePolygon()}
              style={{ width: '100%', padding: '10px 14px' }}
            >
              <OpsIcon name="save" />
              {busy
                ? 'Kaydediliyor…'
                : editingAreaId
                  ? 'Servis Alanını Güncelle'
                  : 'Servis Alanını Kaydet'}
            </button>
          </div>

          {/* Test Point Feedback (if active) */}
          {testPoint && (
            <div className={styles.testBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: '#fff' }}>
                  Test Noktası: {testPoint.lat.toFixed(5)}, {testPoint.lng.toFixed(5)}
                </strong>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => setTestPoint(null)}
                  title="Test işaretini kaldır"
                >
                  ×
                </button>
              </div>
              <div
                className={`${styles.alertBox} ${
                  testPoint.inActivePolygon ? styles.alertSuccess : styles.alertWarn
                }`}
              >
                <OpsIcon name={testPoint.inActivePolygon ? 'check_circle' : 'warning'} />
                <span>
                  Çizili Poligon:{' '}
                  <strong>
                    {testPoint.inActivePolygon
                      ? 'Sınırlar İçinde (Teslimat Yapılır)'
                      : 'Sınırlar Dışında'}
                  </strong>
                  <br />
                  Kayıtlı API Durumu:{' '}
                  {testPoint.busy
                    ? 'Sorgulanıyor…'
                    : testPoint.serverServiceable
                      ? `Aktif (${testPoint.serverBranchName ?? 'Şube eşleşti'})`
                      : 'Kayıtlı kapsama dışında'}
                </span>
              </div>
            </div>
          )}

          {/* Coordinates / Pin List */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <OpsIcon name="pin_drop" />
                Yerleştirilen Pinler ({pins.length})
              </h2>
              {pins.length > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                  Merkezden uzaklık
                </span>
              )}
            </div>

            {pins.length === 0 ? (
              <div className={styles.emptyHint}>
                Henüz pin eklenmedi. Sol taraftaki haritada şube çevresine tıklayarak pin ekleyin
                veya yukarıdan hızlı şablon seçin.
              </div>
            ) : (
              <div className={styles.pinList}>
                {pins.map((pin, idx) => {
                  const dist =
                    branchLat != null && branchLng != null
                      ? haversineKm(branchLat, branchLng, pin.lat, pin.lng)
                      : null;
                  return (
                    <div key={`${idx}-${pin.lat}-${pin.lng}`} className={styles.pinRow}>
                      <span
                        className={`${styles.pinIndex} ${idx === 0 ? styles.pinIndexFirst : ''}`}
                      >
                        {idx + 1}
                      </span>
                      <div className={styles.pinCoords}>
                        <span className={styles.pinLatLng}>
                          {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
                        </span>
                        <span className={styles.pinDist}>
                          {dist != null ? `Şubeye ${dist.toFixed(2)} km` : 'Köşe noktası'}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() =>
                          iframeRef.current?.contentWindow?.postMessage(
                            JSON.stringify({ type: 'focus-pin', index: idx }),
                            '*',
                          )
                        }
                        title="Haritada bu pine odaklan"
                      >
                        <OpsIcon name="my_location" />
                      </button>
                      <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        disabled={!canWrite}
                        onClick={() => setPins((prev) => prev.filter((_, i) => i !== idx))}
                        title="Bu pini sil"
                      >
                        <OpsIcon name="delete" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Saved Service Areas */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <OpsIcon name="layers" />
                Kayıtlı Servis Alanları ({areas.length})
              </h2>
            </div>

            {state.status === 'loading' ? (
              <div className={styles.emptyHint}>Kayıtlı alanlar yükleniyor…</div>
            ) : areas.length === 0 ? (
              <div className={styles.emptyHint}>
                Bu şube için henüz kayıtlı bir servis alanı yok. Haritada en az 3 pin koyup
                kaydedebilirsiniz.
              </div>
            ) : (
              <div className={styles.savedList}>
                {areas.map((area) => {
                  const areaPins = extractPinsFromGeoJson(area.polygonGeoJson ?? area.polygon);
                  const isActive = editingAreaId === area.id;
                  return (
                    <div
                      key={area.id}
                      className={`${styles.savedItem} ${isActive ? styles.savedItemActive : ''}`}
                      onClick={() => {
                        selectAreaIntoEditor(area, branchDetail);
                        setTimeout(() => {
                          iframeRef.current?.contentWindow?.postMessage(
                            JSON.stringify({ type: 'fit-bounds' }),
                            '*',
                          );
                        }, 80);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          selectAreaIntoEditor(area, branchDetail);
                        }
                      }}
                    >
                      <div className={styles.savedItemInfo}>
                        <span className={styles.savedItemTitle}>
                          {area.name ?? 'İsimsiz Servis Alanı'}
                        </span>
                        <span className={styles.savedItemMeta}>
                          {areaPins.length} Pin · Öncelik {area.priority ?? 0}{' '}
                          {isActive ? '· Düzenleniyor' : ''}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            selectAreaIntoEditor(area, branchDetail);
                          }}
                          title="Haritada düzenle"
                        >
                          <OpsIcon name="edit_location_alt" />
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                          disabled={!canWrite || busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(area);
                          }}
                          title="Alanı sil"
                        >
                          <OpsIcon name="delete" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Servis alanını sil"
        body={
          deleteTarget
            ? `"${deleteTarget.name ?? 'İsimsiz alan'}" servis alanı pasife alınacaktır. Onaylıyor musunuz?`
            : ''
        }
        confirmLabel="Evet, Sil"
        danger
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDeleteArea()}
      />
    </main>
  );
}
