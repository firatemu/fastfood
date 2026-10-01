import './styles.css';

export interface BreadcrumbItem {
  href?: string;
  label: string;
  current?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb(props: BreadcrumbProps) {
  const { items } = props;
  return (
    <nav aria-label="Breadcrumb" className="ff-breadcrumb">
      <ol className="ff-breadcrumb__list">
        {items.map((it, i) => (
          <li key={`${i}-${it.label}`} className="ff-breadcrumb__item">
            {it.href && !it.current ? (
              <a href={it.href} className="ff-breadcrumb__link">
                {it.label}
              </a>
            ) : (
              <span
                className="ff-breadcrumb__current"
                aria-current={it.current ? 'page' : undefined}
              >
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
