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
    return <ShopError title="Ateş Çarkı" message={error ?? 'Yüklenemedi.'} onRetry={() => void load()} />;
  }

  const blocked = !state.eligible;
  const spinState = spinning ? 'spinning' : result ? 'result' : state.eligible ? 'ready' : 'blocked';

  return (
    <AccountShell
      surface="spin"
      eyebrow="Ayrıcalıklar"
      title="Ateş Çarkı"
      description="Günlük hakkınla kampanya ödüllerinden birini kazan."
      actions={
        <span
          className="ff-tag"
          data-tone={state.eligible ? 'ok' : 'warn'}
          data-ff-spin-state={spinState}
        >
          {spinning ? 'Çevriliyor' : state.eligible ? 'Hak hazır' : 'Hak kullanıldı'}
        </span>
      }
    >
      <section className="ff-section">
        <div className="ff-section-head">
          <h2 className="ff-section-title">Kampanya</h2>
          <p className="ff-section-desc">
            {state.campaign?.endsAt
              ? `${formatDate(state.campaign.endsAt)} tarihinde bitiyor.`
              : 'Aktif kampanya yok.'}
          </p>
        </div>
        <div className="ff-section-body">
          <div className="ff-rows">
            <div className="ff-row">
              <div className="ff-row-key">
                <div className="ff-row-label">{state.campaign?.name ?? 'Aktif kampanya yok'}</div>
                <div className="ff-row-hint">
                  {blocked
                    ? reasonCopy(state.reason)
                    : `${state.spinsRemaining} hak kaldı.`}
                </div>
              </div>
              <div className="ff-row-value">
                {state.prizes.length > 0 ? `${state.prizes.length} ödül` : 'Ödül yok'}
              </div>
            </div>
          </div>

          {/* The dial. When the campaign has no prizes it states that instead of
              spinning an empty wheel. */}
          <div className="ff-spin-stage">
            <div
              className="ff-dial"
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
            >
              <span className="ff-dial-label">
                {spinning
                  ? 'Çevriliyor'
                  : result
                    ? result.prize.label
                    : state.eligible
                      ? 'Çarkı çevir'
                      : 'Bugün bitti'}
              </span>
            </div>
          </div>

          {state.prizes.length > 0 ? (
            <ul className="ff-cluster" style={{ marginTop: '0.75rem' }}>
              {state.prizes.map((prize) => (
                <li key={prize.code} className="ff-tag ff-tag-plain" data-tone="info">
                  {prize.label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="ff-row-hint" style={{ marginTop: '0.75rem' }}>
              Bu kampanyada tanımlı ödül yok.
            </p>
          )}

          <div className="ff-cluster ff-cluster-end" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="ff-btn ff-btn-primary"
              disabled={blocked || runSpin.pending}
              onClick={() => void spin()}
              data-ff-spin
            >
              <MaterialIcon name="casino" />
              {runSpin.pending ? 'Çevriliyor' : 'Çarkı çevir'}
            </button>
          </div>

          {blocked ? (
            <div className="ff-notice" data-tone="info" style={{ marginTop: '1rem' }}>
              <MaterialIcon name="schedule" />
              <span>
                Yeni hakkı sunucu belirliyor; bu ekranda uydurma bir geri sayım gösterilmez.
              </span>
            </div>
          ) : null}
        </div>
      </section>

      {result ? (
        <section className="ff-section" data-ff-spin-result>
          <div className="ff-section-head">
            <h2 className="ff-section-title">
              {result.replayed ? 'Bu çekiliş daha önce oynanmış' : 'Kazandığın'}
            </h2>
            <p className="ff-section-desc">Son çekilişin sonucu.</p>
          </div>
          <div className="ff-section-body">
            <div className="ff-rows">
              <div className="ff-row">
                <div className="ff-row-key">
                  <div className="ff-row-label">{result.prize.label}</div>
                </div>
                <div className="ff-row-actions">
                  {result.prize.couponCode ? (
                    <span className="ff-tag" data-tone="brand">
                      {result.prize.couponCode}
                    </span>
                  ) : null}
                </div>
              </div>
              {BigInt(result.prize.pointsAwarded) > 0n ? (
                <div className="ff-row">
                  <div className="ff-row-key">
                    <div className="ff-row-label">Puan</div>
                    <div className="ff-row-hint">Hesabına eklendi.</div>
                  </div>
                  <div className="ff-row-value">+{result.prize.pointsAwarded}</div>
                </div>
              ) : null}
            </div>
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
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }).format(
    date,
  );
}