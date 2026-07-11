# ticket-box-web
## Overview
- This `ticket-box-web` provide a website UI for ORGANIZER and AUDIENCE role in https://github.com/NichikouGN/ticket-box-backend.

## Tech Stack
- ReactJS
- Typescript
- TailwindCSS
- ShadcnUI

## Installation
1. Configure the `.env` file

2. At root directory
```
npm install
```
3. Run and open the browser
```
npm run dev
```
## Versioning
### [v1.6.0] - 2026-07-11
- Add VIP Guest roster view, CSV import feature for organizers, and VIP search check-in list for staff members.
- Map fallback ISO-8601 strings for `saleStart` and `saleEnd` properties on `ticketTypes` in frontend API payloads to prevent concert creation validation failures.

### [v1.5.1] - 2026-07-11
- Fix "waiting for payment" screen getting stuck by adding a polling fallback to the SSE order confirmation stream.
- Align `CreateOrderResponse` type with backend `OrderResponse` (removed non-existent `status` field from `data`).
- Add `paymentDeadline` to `OrderStatusUpdate` type for completeness.

### [v1.5.0] - 2026-07-11
- Fix React child object rendering crash on `ConcertDetailPage.tsx` by mapping artist objects and displaying verified biographies.
- Fix payment redirect flow on `PaymentSuccessPage.tsx` by supporting the new `orderId` query parameter.
- Bypassed deprecated `/payments/confirm` endpoint on `TicketsPage.tsx` to align with the event-driven asynchronous ticketing architecture.

### [v1.4.0] - 2026-06-30
- create `PaymentSuccessPage` and `PaymentCancelledPage`.
- Split `streamOrderStatus` to `streamPaymentURL` and `streamOrderComfirm`.

### [v1.3.0] - 2026-06-28
- Create Spinner loading while waiting user to pay in Stripe.
- Split SSE streamOrderStatus to streamPaymentURL and streamOrderComfirm.

### [v1.2.0] - 2026-06-27
- `[AUDIENCE]` Create UI for CheckinPage (show ticket info and QR code).
- `[ORGANIZER]` Create UI for Edit concert.
- Improve UI for Order and Payment.
- Refactor some code.


### [v1.1.0] - 2026-06-26
- Create UI for ORGANIZER to create and manage concerts.
- Create Home UI for AUDIENCE to buy tickets.
- Create UI for next features (Order and Payment).

### [v1.0.0] - 2026-06-22
- Signup forms.
- Login forms.
- Profile pages.
- Forms validations.
- Login state management.