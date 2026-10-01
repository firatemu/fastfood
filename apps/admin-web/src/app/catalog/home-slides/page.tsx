'use client';

import { formatTryMinor } from '@fastfood/contracts';
import { adminPagePermission } from '@fastfood/domain-types';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import type { z } from 'zod';

import { errorMessage } from '../../../components/async-boundary';
import { useOpsSync } from '../../../components/ops/ops-sync';
import { hasStaffPermission, useStaffAccess } from '../../../components/ops/staff-access-context';
import { createAdminClient } from '../../../lib/api';
import { adminHomeSlidesSchema } from '../../../lib/schemas';
import { useDeferredLoad } from '../../../lib/use-deferred-load';

import styles from './home-slides.module.css';

type Product = z.infer<typeof adminHomeSlidesSchema>['data']['products'][number];
type SlideSettings = z.infer<typeof adminHomeSlidesSchema>['data']['settings'];
type LoadStatus = 'loading' | 'ready' | 'error';

function selectedIds(rows: Product[]): string[] {
  return rows
    .filter((product) => product.isHero && product.isActive)
    .sort(
      (a, b) =>
        a.heroDisplayOrder - b.heroDisplayOrder ||
        a.displayOrder - b.displayOrder ||
        a.id.localeCompare(b.id),
    )
    .map((product) => product.id);
}

function productImage(product: Product): string | null {
  return product.heroImageUrl ?? product.imageUrl;
}

export default function HomeSlidesPage(): ReactElement {
  const { markStale, markSynced, registerRefresh } = useOpsSync();
  const access = useStaffAccess();
  const canManage =
    hasStaffPermission(access, adminPagePermission('products', 'update')) &&
    hasStaffPermission(access, 'catalog.products.write');
  const [products, setProducts] = useState<Product[]>([]);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [settings, setSettings] = useState<SlideSettings>({
    transitionDurationSeconds: 5,
    loop: true,
  });
  const [draftSettings, setDraftSettings] = useState<SlideSettings>({
    transitionDurationSeconds: 5,
    loop: true,
  });
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setStatus((current) => (current === 'ready' ? current : 'loading'));
    setLoadError(null);
    try {
      const response = await createAdminClient().request({
        path: 'admin/home-slides',
        schema: adminHomeSlidesSchema,
      });
      setProducts(response.data.products);
      setDraftIds(selectedIds(response.data.products));
      setSettings(response.data.settings);
      setDraftSettings(response.data.settings);
      setStatus('ready');
      setLoadError(null);
      markSynced();
    } catch (error) {
      setStatus('error');
      setLoadError(errorMessage(error));
      markStale();
    }
  }, [markStale, markSynced]);

  useEffect(() => {
    registerRefresh(() => void load());
    return () => registerRefresh(null);
  }, [load, registerRefresh]);

  useDeferredLoad(() => void load(), [load]);

  const savedIds = useMemo(() => selectedIds(products), [products]);
  const dirty =
    JSON.stringify(draftIds) !== JSON.stringify(savedIds) ||
    JSON.stringify(draftSettings) !== JSON.stringify(settings);
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const selectedProducts = draftIds
    .map((productId) => productById.get(productId))
    .filter((product): product is Product => Boolean(product));
  const availableProducts = products.filter((product) => {
    if (draftIds.includes(product.id)) return false;
    const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR');
    if (!normalizedQuery) return true;
    return `${product.name} ${product.categoryName} ${product.slug}`
      .toLocaleLowerCase('tr-TR')
      .includes(normalizedQuery);
  });
  const previewProduct =
    selectedProducts[0] ??
    products.find((product) => product.isActive && product.isFeatured) ??
    products.find((product) => product.isActive) ??
    null;
  const previewImage = previewProduct ? productImage(previewProduct) : null;

  function moveSlide(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= draftIds.length) return;
    setDraftIds((current) => {
      const next = [...current];
      const currentId = next[index];
      const targetId = next[target];
      if (!currentId || !targetId) return current;
      next[index] = targetId;
      next[target] = currentId;
      return next;
    });
    setNotice(null);
  }

  async function save(): Promise<void> {
    if (!canManage || !dirty || saving) return;
    setSaving(true);
    setSaveError(null);
    setNotice(null);
    try {
      const response = await createAdminClient().request({
        method: 'PUT',
        path: 'admin/home-slides',
        body: { productIds: draftIds, settings: draftSettings },
        schema: adminHomeSlidesSchema,
      });
      setProducts(response.data.products);
      setDraftIds(selectedIds(response.data.products));
      setSettings(response.data.settings);
      setDraftSettings(response.data.settings);
      setNotice('Vitrin ayarları kaydedildi.');
      markSynced();
    } catch (error) {
      setSaveError(errorMessage(error));
      markStale();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={`${styles.page} ops-page`}>
      <header className={styles.heading}>
        <div className={styles.headingCopy}>
          <div className={styles.kicker}>
            <span className="material-symbols-outlined" aria-hidden="true">
              view_carousel
            </span>
            Katalog <span>/</span> Ana sayfa vitrin alanı
          </div>
          <h1>Vitrin Slaytları</h1>
          <p>Ana sayfada öne çıkacak ürünleri seçin ve gösterim sırasını belirleyin.</p>
        </div>
        <div className={styles.headingActions}>
          <span className={styles.countBadge}>
            <i aria-hidden="true" />
            {draftIds.length} slayt seçili
          </span>
          <button
            className={styles.saveButton}
            type="button"
            onClick={() => void save()}
            disabled={!canManage || !dirty || saving || status !== 'ready'}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {saving ? 'hourglass_top' : 'save'}
            </span>
            {saving ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}
          </button>
        </div>
      </header>

      {status === 'loading' ? (
        <section className={styles.state} role="status">
          <span className="material-symbols-outlined" aria-hidden="true">
            progress_activity
          </span>
          <strong>Vitrin ürünleri yükleniyor</strong>
          <p>Ürün kataloğu ve mevcut slayt sırası alınıyor.</p>
        </section>
      ) : status === 'error' ? (
        <section className={styles.state} role="alert">
          <span className="material-symbols-outlined" aria-hidden="true">
            cloud_off
          </span>
          <strong>Vitrin ayarları alınamadı</strong>
          <p>{loadError ?? 'Bağlantıyı kontrol edip yeniden deneyin.'}</p>
          <button className={styles.secondaryButton} type="button" onClick={() => void load()}>
            Yeniden dene
          </button>
        </section>
      ) : (
        <>
          <div className={styles.summary}>
            <div className={styles.summaryIcon}>
              <span className="material-symbols-outlined" aria-hidden="true">
                tips_and_updates
              </span>
            </div>
            <p>
              {canManage
                ? 'Seçili slayt yoksa ana sayfada mevcut vitrin ürünü gösterilmeye devam eder. Ürünlerin katalog sırası bu ekrandaki sıralamadan bağımsızdır.'
                : 'Vitrin ayarlarını değiştirmek için ürün güncelleme yetkisi gerekir. Mevcut sıra salt okunur gösteriliyor.'}
            </p>
            <span className={dirty ? styles.draftStatus : styles.savedStatus}>
              {dirty ? 'Kaydedilmemiş değişiklik' : 'Yayınlanan sıralama'}
            </span>
          </div>

          {loadError ? (
            <p className={styles.inlineError} role="alert">
              {loadError}
            </p>
          ) : null}
          {saveError ? (
            <p className={styles.inlineError} role="alert">
              Kaydedilemedi: {saveError}
            </p>
          ) : null}
          {notice ? (
            <p className={styles.inlineSuccess} role="status">
              {notice}
            </p>
          ) : null}

          <div className={styles.layout}>
            <section className={styles.panel} aria-labelledby="selected-slides-title">
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>SIRALAMA</span>
                  <h2 id="selected-slides-title">Yayındaki ürünler</h2>
                </div>
                <span className={styles.panelCount}>
                  {selectedProducts.length.toString().padStart(2, '0')}
                </span>
              </div>

              {selectedProducts.length > 0 ? (
                <ol className={styles.selectedList}>
                  {selectedProducts.map((product, index) => (
                    <li className={styles.selectedRow} key={product.id}>
                      <span className={styles.orderNumber}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <ProductThumbnail product={product} />
                      <div className={styles.productCopy}>
                        <strong>{product.name}</strong>
                        <span>{product.categoryName}</span>
                      </div>
                      <span className={styles.productPrice}>
                        {formatTryMinor(product.basePriceMinor, product.currency)}
                      </span>
                      <div className={styles.rowActions}>
                        <button
                          aria-label={`${product.name} slaydını yukarı taşı`}
                          className={styles.iconButton}
                          disabled={!canManage || index === 0}
                          onClick={() => moveSlide(index, -1)}
                          title="Yukarı taşı"
                          type="button"
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">
                            arrow_upward
                          </span>
                        </button>
                        <button
                          aria-label={`${product.name} slaydını aşağı taşı`}
                          className={styles.iconButton}
                          disabled={!canManage || index === selectedProducts.length - 1}
                          onClick={() => moveSlide(index, 1)}
                          title="Aşağı taşı"
                          type="button"
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">
                            arrow_downward
                          </span>
                        </button>
                        <button
                          aria-label={`${product.name} ürününü vitrinden kaldır`}
                          className={`${styles.iconButton} ${styles.removeButton}`}
                          disabled={!canManage}
                          onClick={() => {
                            setDraftIds((current) => current.filter((id) => id !== product.id));
                            setNotice(null);
                          }}
                          title="Vitrinden kaldır"
                          type="button"
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">
                            close
                          </span>
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className={styles.emptySelected}>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    view_carousel
                  </span>
                  <strong>Henüz özel slayt seçilmedi</strong>
                  <p>Sağdaki ürün listesinden ana sayfada göstermek istediklerinizi ekleyin.</p>
                </div>
              )}
            </section>

            <div className={styles.sideColumn}>
              <section className={styles.panel} aria-labelledby="available-products-title">
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.panelEyebrow}>ÜRÜN KATALOĞU</span>
                    <h2 id="available-products-title">Slayta ürün ekle</h2>
                  </div>
                  <span className={styles.panelCount}>
                    {availableProducts.length.toString().padStart(2, '0')}
                  </span>
                </div>
                <label className={styles.search}>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    search
                  </span>
                  <span className={styles.srOnly}>Ürünlerde ara</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Ürün veya kategori ara"
                    type="search"
                  />
                  {query ? (
                    <button aria-label="Aramayı temizle" type="button" onClick={() => setQuery('')}>
                      <span className="material-symbols-outlined" aria-hidden="true">
                        close
                      </span>
                    </button>
                  ) : null}
                </label>
                <ul className={styles.availableList}>
                  {availableProducts.map((product) => (
                    <li className={styles.availableRow} key={product.id}>
                      <ProductThumbnail product={product} />
                      <div className={styles.productCopy}>
                        <strong>{product.name}</strong>
                        <span>{product.categoryName}</span>
                      </div>
                      {product.isActive ? (
                        <button
                          aria-label={`${product.name} ürününü slayta ekle`}
                          className={styles.addButton}
                          disabled={!canManage}
                          onClick={() => {
                            setDraftIds((current) => [...current, product.id]);
                            setNotice(null);
                          }}
                          type="button"
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">
                            add
                          </span>
                          Ekle
                        </button>
                      ) : (
                        <span className={styles.inactiveBadge}>Ürün kapalı</span>
                      )}
                    </li>
                  ))}
                  {availableProducts.length === 0 ? (
                    <li className={styles.noResults}>
                      {products.length === 0
                        ? 'Katalogda ürün bulunmuyor.'
                        : 'Aramanızla eşleşen ürün yok.'}
                    </li>
                  ) : null}
                </ul>
              </section>

              <section className={styles.previewPanel} aria-labelledby="preview-title">
                <div className={styles.previewHeader}>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    visibility
                  </span>
                  <h2 id="preview-title">Vitrin önizlemesi</h2>
                  <span>İLK SLAYT</span>
                </div>
                {previewProduct ? (
                  <div className={styles.previewCard}>
                    {previewImage ? (
                      <Image
                        alt=""
                        className={styles.previewImage}
                        fill
                        sizes="(max-width: 980px) 100vw, 40vw"
                        src={previewImage}
                        unoptimized
                      />
                    ) : null}
                    <div className={styles.previewShade} />
                    <div className={styles.previewCopy}>
                      <span>{selectedProducts.length ? 'SLAYT 01' : 'MEVCUT VİTRİN ÜRÜNÜ'}</span>
                      <strong>{previewProduct.name}</strong>
                      <p>
                        {previewProduct.heroDescription ??
                          'Ürün açıklaması ana sayfada gösterilir.'}
                      </p>
                    </div>
                    {selectedProducts.length > 1 ? (
                      <div
                        className={styles.previewDots}
                        aria-label={`${selectedProducts.length} slayt`}
                      >
                        {selectedProducts.map((product, index) => (
                          <i
                            key={product.id}
                            className={index === 0 ? styles.activeDot : undefined}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className={styles.previewEmpty}>Önizleme için aktif bir ürün ekleyin.</p>
                )}
              </section>

              <section className={styles.panel} aria-labelledby="playback-title">
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.panelEyebrow}>SLAYT DAVRANIŞI</span>
                    <h2 id="playback-title">Geçiş ayarları</h2>
                  </div>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    timer
                  </span>
                </div>
                <label className={styles.durationSetting}>
                  <span className={styles.durationLabel}>
                    <span>Slayt geçiş süresi</span>
                    <strong>{draftSettings.transitionDurationSeconds} saniye</strong>
                  </span>
                  <input
                    aria-label="Slayt geçiş süresi, saniye"
                    disabled={!canManage}
                    max={30}
                    min={2}
                    aria-valuetext={`${draftSettings.transitionDurationSeconds} saniye`}
                    onChange={(event) =>
                      setDraftSettings((current) => ({
                        ...current,
                        transitionDurationSeconds: Number(event.currentTarget.value),
                      }))
                    }
                    type="range"
                    value={draftSettings.transitionDurationSeconds}
                  />
                  <span className={styles.durationRange} aria-hidden="true">
                    <span>2 sn</span>
                    <span>30 sn</span>
                  </span>
                </label>
                <label className={styles.loopSetting}>
                  <span className={styles.loopCopy}>
                    <strong>Başa dönerek devam et</strong>
                    <span>Son slayttan sonra ilk slayta geç.</span>
                  </span>
                  <input
                    aria-label={draftSettings.loop ? 'Slayt döngüsünü kapat' : 'Slayt döngüsünü aç'}
                    checked={draftSettings.loop}
                    disabled={!canManage}
                    onChange={(event) =>
                      setDraftSettings((current) => ({
                        ...current,
                        loop: event.currentTarget.checked,
                      }))
                    }
                    type="checkbox"
                  />
                </label>
                {!draftSettings.loop ? (
                  <p className={styles.playbackHint}>Döngü kapalıyken son slaytta durulur.</p>
                ) : null}
              </section>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function ProductThumbnail({ product }: { product: Product }): ReactElement {
  const image = productImage(product);
  return (
    <span className={styles.thumbnail}>
      {image ? <Image alt="" fill sizes="48px" src={image} unoptimized /> : null}
      {!image ? (
        <span className="material-symbols-outlined" aria-hidden="true">
          lunch_dining
        </span>
      ) : null}
    </span>
  );
}
