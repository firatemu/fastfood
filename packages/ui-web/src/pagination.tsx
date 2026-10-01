import './styles.css';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Pagination — keyboard-operable page navigation. aria-current on the
 * active page.
 */
export function Pagination(props: PaginationProps) {
  const { page, totalPages, onPageChange } = props;
  if (totalPages <= 1) return null;
  const items: (number | 'ellipsis')[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
      items.push(p);
    } else if (items[items.length - 1] !== 'ellipsis') {
      items.push('ellipsis');
    }
  }
  return (
    <nav aria-label="Pagination" className="ff-pagination">
      <button
        type="button"
        className="ff-pagination__btn"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Önceki sayfa"
      >
        ‹
      </button>
      <ol className="ff-pagination__list">
        {items.map((it, i) =>
          it === 'ellipsis' ? (
            <li key={`e-${i}`} aria-hidden="true" className="ff-pagination__ellipsis">
              …
            </li>
          ) : (
            <li key={it} className="ff-pagination__item">
              <button
                type="button"
                aria-current={it === page ? 'page' : undefined}
                className={`ff-pagination__btn ${it === page ? 'ff-pagination__btn--active' : ''}`}
                onClick={() => onPageChange(it)}
              >
                {it}
              </button>
            </li>
          ),
        )}
      </ol>
      <button
        type="button"
        className="ff-pagination__btn"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Sonraki sayfa"
      >
        ›
      </button>
    </nav>
  );
}
