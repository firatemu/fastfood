import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function baseProps(props: IconProps): SVGProps<SVGSVGElement> {
  const { title, ...rest } = props;
  return {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': title ? undefined : true,
    role: title ? 'img' : undefined,
    ...rest,
  };
}

function Title({ title }: { title?: string }) {
  return title ? <title>{title}</title> : null;
}

/** Canonical Ops SVG icons — no emoji, no external icon package. */
export function IconSearch(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <Title title={props.title} />
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <Title title={props.title} />
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconFilter(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <Title title={props.title} />
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <Title title={props.title} />
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <Title title={props.title} />
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <Title title={props.title} />
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <Title title={props.title} />
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <Title title={props.title} />
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 4.3 2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

export function IconOrders(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <Title title={props.title} />
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

export function IconKitchen(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <Title title={props.title} />
      <path d="M4 20h16M6 20V10l6-6 6 6v10" />
      <path d="M10 20v-4h4v4" />
    </svg>
  );
}

export function IconCourier(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <Title title={props.title} />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
      <path d="M5 17H3V7h9l3 4h4v6h-2" />
    </svg>
  );
}

export function IconRefund(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <Title title={props.title} />
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

export function IconReport(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <Title title={props.title} />
      <path d="M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-6" />
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <Title title={props.title} />
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <Title title={props.title} />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <Title title={props.title} />
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  );
}

export function IconMore(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <Title title={props.title} />
      <circle cx="6" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

export type IconComponent = (props: IconProps) => ReactNode;
