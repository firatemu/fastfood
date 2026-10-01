# Reporting and Analytics

## 1. Reporting goals

Reporting must allow Head Office to understand commercial and operational performance while restricting branch users to authorized branch data.

## 2. Core commercial metrics

- gross merchandise sales,
- net merchandise sales after discounts,
- delivery fees,
- final collected amount,
- order count,
- average order value,
- refund amount/count,
- cancellation/rejection rate,
- payment failure rate,
- loyalty earned/redeemed/restored,
- promotion impact.

## 3. Product metrics

- units sold by product,
- units sold by variant,
- modifier popularity,
- category sales,
- sold-out frequency where tracked.

## 4. Branch metrics

- sales by branch,
- order count,
- acceptance time,
- preparation time,
- ready-to-pickup wait,
- cancellation/rejection rate,
- service-area/neighborhood performance.

## 5. Delivery metrics

- assigned deliveries,
- pickup time,
- pickup-to-delivered duration,
- completed deliveries by courier,
- active-delivery count,
- exception rate.

## 6. Customer metrics

- new vs returning registered customers,
- guest order share,
- repeat purchase indicators,
- loyalty participation.

## 7. Metric correctness

Metric definitions must state:

- source fields/events,
- timezone,
- included/excluded statuses,
- refund treatment,
- date dimension used (created, paid, delivered).

Do not create two reports with different definitions for the same named metric.

The branch order-total view accepts an optional `date=YYYY-MM-DD` filter. The
date is an `Europe/Istanbul` business date and uses `Order.createdAt`; its amount
is the sum of `Order.finalPayableMinor` for every matching order, across all
statuses. It is an order-register total, not collected net revenue: refunds are
not subtracted and cancelled/rejected orders are not excluded.

## 8. Initial reporting architecture

V1 reports may query optimized PostgreSQL views/read models. Heavy exports may run through queue jobs. A separate data warehouse is not required for V1.

## 9. Branch scope

Branch reports always apply server-side branch scope. Frontend filters cannot be the only isolation layer.
