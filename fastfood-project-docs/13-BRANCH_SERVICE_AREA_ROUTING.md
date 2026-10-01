# Branch, Service Area, and Routing Rules

## 1. Branch model

A branch is a physical fulfillment location with at least:

- name/code,
- address/location,
- timezone/business hours,
- active state,
- order-acceptance state,
- minimum-order configuration,
- delivery-fee configuration,
- preparation SLA configuration,
- service-area assignments,
- routing priority/fallback configuration.

## 2. Service area model

Service areas are stored using PostGIS geometry where practical. Neighborhood labels are operational metadata; geographic containment is the canonical serviceability capability.

A service area may define:

- polygon/multipolygon,
- human-readable name,
- branch assignment,
- priority,
- delivery fee override,
- minimum-order override,
- active schedule where needed.

## 3. Address resolution

Given a customer coordinate:

1. reject invalid/missing coordinates,
2. find active service areas containing the point,
3. filter branches that are enabled for ordering,
4. evaluate opening/acceptance rules,
5. apply explicit priority,
6. return one deterministic branch or a non-serviceable result.

## 4. Overlapping areas

Overlapping service areas are allowed only if priority is explicit. The routing engine must not choose nondeterministically.

Default tie-breaking order:

1. lowest numeric `routing_priority` wins,
2. if still equal, explicit primary area flag wins,
3. if still unresolved, treat as configuration error rather than random assignment.

## 5. Branch unavailable after checkout begins

If the resolved branch becomes unavailable before payment initialization, checkout must re-resolve or stop with a clear message.

If branch availability changes after verified payment, the order enters an operational exception path; staff may reassign to an eligible branch. The customer is not silently charged again.

## 6. Manual branch reassignment

Manual reassignment requires:

- permission,
- target branch eligibility or explicit override permission,
- reason,
- audit/event entry,
- downstream notification to relevant branch screens.

## 7. Geospatial implementation

Geospatial queries belong to the service-area repository/infrastructure layer. Raw spatial SQL must be parameterized and centralized, not copied into controllers/services.

## 8. Future routing

Dynamic load balancing may later include branch capacity or queue time. V1 deterministic routing is based on configured service area and availability/priority rules, not opaque AI or heuristic routing.
