'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { z } from 'zod';

import { errorMessage } from '../../../components/async-boundary';
import { createAdminClient } from '../../../lib/api';
import styles from '../invite.module.css';

const emailConfirmationSchema = z.object({ data: z.object({ userId: z.string() }) }).passthrough();

function ConfirmEmail() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [state, setState] = useState<{
    kind: 'idle' | 'busy' | 'success' | 'error';
    message: string;
  }>({
    kind: 'idle',
    message: 'Yeni giriş adresinizi onaylayın.',
  });
  const visibleState = token
    ? state
    : { kind: 'error' as const, message: 'Doğrulama bağlantısında anahtar bulunamadı.' };

  async function confirm() {
    if (!token || state.kind === 'busy' || state.kind === 'success') return;
    setState({ kind: 'busy', message: 'E-posta adresiniz doğrulanıyor…' });
    try {
      await createAdminClient().request({
        method: 'POST',
        path: 'auth/staff/email/confirm',
        body: { token },
        schema: emailConfirmationSchema,
      });
      setState({ kind: 'success', message: 'Yeni e-posta adresi doğrulandı.' });
    } catch (error) {
      setState({ kind: 'error', message: errorMessage(error) });
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <span className={styles.eyebrow}>FASTFOOD · E-POSTA GÜVENLİĞİ</span>
        <h1>Adres doğrulama</h1>
        <p
          className={`${styles.message} ${visibleState.kind === 'error' ? styles.error : ''}`}
          role={visibleState.kind === 'error' ? 'alert' : 'status'}
        >
          {visibleState.message}
        </p>
        {token && visibleState.kind !== 'success' ? (
          <button
            className={styles.button}
            type="button"
            onClick={() => void confirm()}
            disabled={visibleState.kind === 'busy'}
          >
            {visibleState.kind === 'busy' ? 'Doğrulanıyor…' : 'Yeni e-postayı doğrula'}
          </button>
        ) : null}
        {visibleState.kind === 'success' ? (
          <button className={styles.button} type="button" onClick={() => router.replace('/users')}>
            Kullanıcı yönetimine dön
          </button>
        ) : null}
        <a className={styles.back} href="/login">
          Giriş ekranına dön
        </a>
      </section>
    </main>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.page}>
          <section className={styles.card}>Doğrulama açılıyor…</section>
        </main>
      }
    >
      <ConfirmEmail />
    </Suspense>
  );
}
