import type { ReactNode } from 'react';

import './styles.css';
import { Card } from './card.js';
import { Money } from './money.js';

export interface ProductCardProps {
  title: string;
  description?: string;
  imageUrl?: string;
  priceMinor: string | number | bigint;
  currency?: string;
  badge?: ReactNode;
  onAdd?: () => void;
  addLabel?: string;
}

/**
 * ProductCard — composes Card + Money for catalog views.
 */
export function ProductCard(props: ProductCardProps) {
  const {
    title,
    description,
    imageUrl,
    priceMinor,
    currency,
    badge,
    onAdd,
    addLabel = 'Sepete ekle',
  } = props;
  return (
    <Card
      title={title}
      subtitle={description}
      elevation="raised"
      footer={
        <div className="ff-product-card__footer">
          <Money amountMinor={priceMinor} currency={currency} />
          {onAdd ? (
            <button type="button" className="ff-btn ff-btn--primary ff-btn--sm" onClick={onAdd}>
              {addLabel}
            </button>
          ) : null}
        </div>
      }
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="ff-product-card__image" />
      ) : (
        <div
          aria-hidden="true"
          className="ff-product-card__image ff-product-card__image--placeholder"
        />
      )}
      {badge ? <div className="ff-product-card__badge">{badge}</div> : null}
    </Card>
  );
}
