# Digital Zindagi — Delivery & Revenue Module (V35+)

## Current State
Digital Zindagi is a full-featured multi-vendor marketplace PWA with:
- Homepage, Category grid, Provider cards, Search, GPS filtering
- Admin Dashboard (categories, users, eBooks, announcements, affiliate, social media, app settings)
- Rate Calculator (kg/gram), eBook store, Scrap calculator
- Secret 5-tap admin entry, Staff Login footer link
- Real-time localStorage-based sync for all admin settings
- Provider registration with GPS location capture
- Manager Dashboard with restricted access

No delivery/rider module exists yet.

## Requested Changes (Diff)

### Add
1. **Delivery Boy Registration Page** (`/delivery-register`)
   - Form: Name, Phone, Photo upload, ID Proof screenshot upload
   - Submits to localStorage pending list
2. **Delivery Boy App** (`/delivery-app`) — Protected; requires approved + positive wallet balance
   - Shows Online/Offline toggle
   - Shows nearby available orders (pickup within 3-5 KM when Online)
   - Accept button — first-accept wins, order instantly removed from all others
   - Active task view: Pickup OTP entry → status → Delivery OTP entry → Complete
   - Wallet balance display, Low Balance (≤₹10) alert
   - Recharge page: shows admin UPI QR + GPay number, screenshot upload
   - Digital ID Card page: shows Verified badge, photo, name, Unique ID (DZ-DB-XXXX)
3. **Admin Delivery Panel** (new tab inside AdminDashboardPage)
   - Global ON/OFF switch for entire delivery service
   - Pending Riders list: View ID Screenshot, Approve, Reject, Block buttons
   - Approved Riders list with wallet balance, manual recharge input
   - Rate Card settings: Base Fare (0-2 KM), Extra per KM, Admin Commission (₹)
   - UPI settings: QR code image URL + GPay number
   - Daily Profit Tracker: Total Deliveries, Total Admin Earnings today
4. **Order Placement Flow** — Vendors/Customers can create a delivery order
   - Pickup address (GPS or text), Delivery address (GPS or text)
   - System calculates distance → shows estimated fare to customer
   - On confirm: order saved, Pickup OTP + Delivery OTP auto-generated (4-digit)
   - Order shown to nearby online delivery boys
5. **Utility: deliveryStore.ts** — All delivery state (orders, riders, wallet, settings) in localStorage with event-based sync

### Modify
- `router.tsx` — Add routes: `/delivery-register`, `/delivery-app`, `/delivery-app/recharge`, `/delivery-app/id-card`, `/delivery-order`
- `AdminDashboardPage.tsx` — Add "🚚 Delivery" tab section
- `HomePage.tsx` — Add "🚚 Delivery भेजें" button visible when delivery service is ON
- `Footer.tsx` — Add "Delivery Boy? Join Us" link

### Remove
- Nothing removed

## Implementation Plan
1. Create `src/frontend/src/utils/deliveryStore.ts` — full state management for delivery module
2. Create `src/frontend/src/pages/DeliveryRegisterPage.tsx` — rider registration
3. Create `src/frontend/src/pages/DeliveryAppPage.tsx` — full rider dashboard (available orders, active task with OTP flow, wallet, ID card, recharge)
4. Create `src/frontend/src/pages/DeliveryOrderPage.tsx` — customer/vendor order placement with fare calc
5. Create `src/frontend/src/components/DeliveryAdminPanel.tsx` — admin delivery section
6. Update `AdminDashboardPage.tsx` — embed DeliveryAdminPanel as a new tab
7. Update `router.tsx` — add all delivery routes
8. Update `HomePage.tsx` — add delivery service entry button
9. Update `Footer.tsx` — add rider join link
