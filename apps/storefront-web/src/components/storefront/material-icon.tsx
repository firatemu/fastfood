/**
 * `size` is inline on purpose: `.material-symbols-outlined` is an unlayered
 * class rule that declares its own font-size, and unlayered CSS beats every
 * Tailwind `text-*` utility regardless of specificity — those classes are a
 * no-op on this element.
 */
export function MaterialIcon({
  name,
  className,
  filled = false,
  size,
}: {
  name: string;
  className?: string;
  filled?: boolean;
  size?: number;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className ?? ''}`.trim()}
      style={{
        ...(filled ? { fontVariationSettings: "'FILL' 1" } : {}),
        ...(size !== undefined ? { fontSize: size } : {}),
      }}
      aria-hidden
    >
      {name}
    </span>
  );
}
