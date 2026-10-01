import './styles.css';

export interface AddressSummaryProps {
  title: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode?: string;
  country?: string;
  notes?: string;
}

/**
 * AddressSummary — read-only address display for checkout / order screens.
 */
export function AddressSummary(props: AddressSummaryProps) {
  const { title, line1, line2, city, postalCode, country, notes } = props;
  return (
    <div className="ff-address-summary">
      <p className="ff-address-summary__title">{title}</p>
      <address className="ff-address-summary__body">
        <span>{line1}</span>
        {line2 ? <span>{line2}</span> : null}
        <span>
          {city}
          {postalCode ? `, ${postalCode}` : ''}
        </span>
        {country ? <span>{country}</span> : null}
      </address>
      {notes ? <p className="ff-address-summary__notes">{notes}</p> : null}
    </div>
  );
}
