'use client';

import { AccessDenied, Button } from '@fastfood/ui-web';
import Link from 'next/link';

export default function AccessDeniedPage() {
  return (
    <AccessDenied
      kind="permission"
      permissionCode="required.permission"
      description="Bu sayfaya erişim için gerekli izin yok. Farklı bir hesapla giriş yapın veya yöneticinize başvurun."
      action={
        <Link href="/login">
          <Button type="button" size="sm">
            Giriş sayfası
          </Button>
        </Link>
      }
    />
  );
}
