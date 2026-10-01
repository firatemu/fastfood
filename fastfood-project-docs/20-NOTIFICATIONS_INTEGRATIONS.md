# Notifications and External Integrations

## 1. Notification architecture

Domain modules emit business events. Notification code decides which channel/template to use. Order logic must not contain direct SMS/push provider code.

## 2. Notification channels

The architecture supports:

- push notification,
- SMS,
- email,
- future WhatsApp/business messaging.

Not every channel must be enabled in V1.

## 3. Initial customer events

Potential notification events include:

- order received,
- order accepted,
- preparing,
- ready/assigned to courier,
- picked up/on the way,
- delivered,
- cancelled/refunded,
- OTP verification.

## 4. Push

Mobile push uses Expo-compatible push infrastructure initially. Device push tokens are associated with sessions/devices and can be revoked.

## 5. SMS

SMS is behind `SmsProvider`. Development uses a fake provider. Production provider selection is infrastructure configuration and must not change domain behavior.

## 6. Maps

Google Maps Platform is the canonical maps/geocoding provider. Provider calls are wrapped so keys and provider-specific responses do not spread throughout the codebase.

## 7. Storage

Media uses an S3-compatible interface. Local development uses MinIO. Production uses a configured S3-compatible endpoint without changing application code.

## 8. Payment

iyzico is described in document 10.

## 9. Future integrations

Integration boundaries should allow later addition of:

- fiscal invoice/e-Archive provider,
- POS,
- third-party delivery partner,
- CRM/marketing tools,
- BI warehouse.

These extension points do not add those features to V1 scope.
