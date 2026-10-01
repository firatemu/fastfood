import { formatTryMinor } from '../../lib/money';

export function Price({
  amountMinor,
  currency,
  className,
}: {
  amountMinor: string;
  currency: string;
  className?: string;
}) {
  return <span className={className}>{formatTryMinor(amountMinor, currency)}</span>;
}
