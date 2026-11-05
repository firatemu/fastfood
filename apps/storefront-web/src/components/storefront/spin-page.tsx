'use client';

import { useCallback, useState } from 'react';

import { isCustomerAuthenticated } from '../../lib/api';
import { errorMessage } from '../../lib/load-state';
import { useSubmitLock } from '../../lib/storefront/account-hooks';
import {
  fetchSpin,
  playSpin,
  type SpinEligibility,
  type SpinPlay,
} from '../../lib/storefront/engagement';
import { useDeferredLoad } from '../../lib/use-deferred-load';

import { AccountShell } from './account-shell';
import { useAccountUi } from './account-ui';
import { MaterialIcon } from './material-icon';
import { ShopError, ShopSkeleton } from './shop-states';

/**
 * Ateş Çarkı.
 *
 * A campaign panel, not a toy: the dial is a single 200px circle and the state
 * the customer is actually in is the dominant visual — when the daily right is
 * spent, the screen becomes a campaign readout rather than a disabled button
 * with a grey wheel on it.
 *
 * The outcome is decided by the server. The dial's labels come from the real
 * `prizes` array and the reveal shows the prize the server returned. No
 * client-side roulette, and no invented countdown: the backend sends no
 * next-reset timestamp, so the screen states the real reason and the real
 * campaign end date instead of ticking a clock that means nothing.
 */
export function SpinPage() {
  const { toast } = useAccountUi();

  const [state, setState] = useState<SpinEligibility | null>(null);
  const [result, setResult] = useState<SpinPlay | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await fetchSpin();
      setState(next);
      if (next.lastPlay && typeof next.lastPlay === 'object') {
        setResult(next.lastPlay as SpinPlay);
      }
      setStatus('ready');
    } catch (err) {
      setError(errorMessage(err));
      setStatus('error');
    }
  }, []);

  useDeferredLoad(() => {
    if (!isCustomerAuthenticated()) return;
    void load();
  }, [load]);

  const runSpin = useSubmitLock(
    useCallback(async () => {
      const key = `spin-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      // Server first. The animation below only reveals what came back.
      const play = await playSpin(key);
      setSpinning(true);
      await new Promise((resolve) => setTimeout(resolve, 700));
      setResult(play);
      setState((prev) =>
        prev
          ? { ...prev, eligible: false, reason: 'ALREADY_USED', spinsRemaining: 0, lastPlay: play }
          : prev,
      );
      return play;
    }, []),
  );

  const spin = useCallback(async () => {
    setError(null);
    try {
      const play = await runSpin.run();
      if (play) toast.ok('Çarkı çevrildi.', play.prize.label);
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error('Çarkı çevrilemedi.', message);
    }
  }, [runSpin, toast]);

  if (status === 'loading') return <ShopSkeleton />;
  if (status === 'error' || !state) {
    return (
      <ShopError title="Ateş Çarkı" message={error ?? 'Yüklenemedi.'} onRetry={() => void load()} />
    );
  }

  const blocked = !state.eligible;
  const spinState = spinning
    ? 'spinning'
    : result
      ? 'result'
      : state.eligible
        ? 'ready'
        : 'blocked';

  return (
    <AccountShell
      surface="spin"
      eyebrow="Ayrıcalıklar & Kampanyalar"
      title="Ateş Çarkıfelek"
      description="Her gün şansını dene, nefis burgerler, indirim kuponları ve binlerce Ateş Puanı kazan."
      actions={
        <span
          className="ff-tag"
          data-tone={state.eligible ? 'ok' : 'warn'}
          data-ff-spin-state={spinState}
        >
          {spinning ? 'Çevriliyor...' : state.eligible ? 'Günlük Hak Hazır' : 'Bugünkü Hak Kullanıldı'}
        </span>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Çark Ana Kartı */}
        <div className="lg:col-span-2">
          <div className="ff-card flex flex-col items-center justify-center p-8 text-center">
            <div className="w-full flex items-center justify-between pb-4 mb-6 border-b border-outline-variant/60">
              <div className="text-left">
                <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                  {state.campaign?.name ?? 'Günlük Şans Çarkı'}
                  {state.campaign?.endsAt ? ` · Bitiş: ${formatDate(state.campaign.endsAt)}` : ''}
                </span>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {blocked ? reasonCopy(state.reason) : `Bugün ${state.spinsRemaining} çevirme hakkın var.`}
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant text-white">
                {state.prizes.length} Ödül
              </span>
            </div>

            {/* Glowing Wheel Stage */}
            <div className="my-4 relative">
              <div
                className="ff-dial shadow-2xl shadow-secondary/15 relative z-10"
                data-ff-spin-wheel
                data-state={spinning ? 'spinning' : result ? 'result' : blocked ? 'blocked' : 'ready'}
                role="img"
                aria-label={
                  spinning
                    ? 'Çarkı çevriliyor'
                    : result
                      ? `Sonuç: ${result.prize.label}`
                      : blocked
                        ? 'Bugünkü hak kullanıldı'
                        : 'Çarkı çevirmeye hazır'
                }
                style={{
                  width: '16rem',
                  height: '16rem',
                  background: 'radial-gradient(circle at 50% 40%, #2a2215 0%, #121318 80%)',
                  border: '3px solid rgba(254, 179, 0, 0.4)',
                }}
              >
                <div className="flex flex-col items-center justify-center p-4">
                  <div className="text-3xl text-secondary mb-2">
                    <MaterialIcon name={spinning ? 'casino' : result ? 'celebration' : 'stars'} />
                  </div>
                  <span className="ff-dial-label text-base font-extrabold text-white">
                    {spinning
                      ? 'Çevriliyor...'
                      : result
                        ? result.prize.label
                        : state.eligible
                          ? 'ÇEVİR'
                          : 'Yarın Tekrar Gel'}
                  </span>
                </div>
              </div>
            </div>

            {/* Çevir Butonu */}
            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                type="button"
                className="ff-btn ff-btn-primary px-8 py-3 text-base font-bold shadow-lg shadow-secondary/30"
                disabled={blocked || runSpin.pending}
                onClick={() => void spin()}
                data-ff-spin
              >
                <MaterialIcon name="casino" />
                {runSpin.pending ? 'Çark Dönüyor...' : 'Çarkı Çevir'}
              </button>
              {blocked ? (
                <p className="text-xs text-on-surface-variant">
                  Yeni çevirme hakkı her gece yenilenir.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Sağ Sütun: Olası Ödüller & Kurallar */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="ff-card">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <MaterialIcon name="card_giftcard" />
              Kazanabileceğin Ödüller
            </h3>
            {state.prizes.length > 0 ? (
              <div className="flex flex-col gap-2">
                {state.prizes.map((prize) => (
                  <div
                    key={prize.code}
                    className="p-2.5 rounded-xl bg-surface-container-lowest/70 border border-outline-variant/60 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-white">{prize.label}</span>
                    <span className="text-secondary font-bold">Hediye</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant">Bu kampanyada tanımlı ödül bulunmuyor.</p>
            )}
          </div>

          <div className="ff-card">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
              <MaterialIcon name="info" />
              Çark Kuralları
            </h3>
            <ul className="text-xs text-on-surface-variant space-y-2 leading-relaxed">
              <li>• Her gün 1 ücretsiz çevirme hakkı tanımlanır.</li>
              <li>• Kazanılan indirim kuponları anında hesabına işlenir.</li>
              <li>• Kazanılan puanlar ömür boyu üyelik seviyeni artırır.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Sonuç Kartı */}
      {result ? (
        <section className="ff-card mb-6 border-secondary/40 bg-secondary/5" data-ff-spin-result>
          <div className="ff-card-header">
            <div>
              <h2 className="ff-card-title text-secondary">
                <MaterialIcon name="celebration" />
                {result.replayed ? 'Son Oynanan Çekiliş' : 'Tebrikler, Kazandın!'}
              </h2>
              <p className="ff-card-desc">Ödül detayları aşağıdadır.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-surface-container-low border border-outline-variant">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center text-2xl">
                <MaterialIcon name="card_giftcard" />
              </div>
              <div>
                <div className="text-base font-bold text-white">{result.prize.label}</div>
                {result.prize.couponCode ? (
                  <div className="text-xs text-secondary font-mono mt-0.5">
                    Kupon Kodu: <span className="font-bold">{result.prize.couponCode}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {BigInt(result.prize.pointsAwarded) > 0n ? (
              <div className="px-4 py-2 rounded-lg bg-ok/15 text-ok border border-ok/30 font-bold text-sm">
                +{result.prize.pointsAwarded} Ateş Puanı
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {error ? (
        <div className="ff-notice" data-tone="danger" role="alert">
          <MaterialIcon name="error" />
          <span>{error}</span>
        </div>
      ) : null}
    </AccountShell>
  );
}

function reasonCopy(reason: string): string {
  if (reason === 'NO_CAMPAIGN') return 'Aktif bir çark kampanyası yok.';
  if (reason === 'ALREADY_USED') return 'Bugünkü hakkın kullanıldı.';
  if (reason === 'NO_PRIZES') return 'Kampanya ödülü tanımlı değil.';
  return 'Çark şu an çevrilemiyor.';
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
