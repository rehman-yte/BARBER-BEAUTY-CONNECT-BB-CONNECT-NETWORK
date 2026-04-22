# Security Specification

## Data Invariants
1. A Partner document must have a `brandName` to be considered "fully onboarded".
2. A user can only read their own private PII (in legacy `users` or `customers`).
3. Only authenticated users can create bookings.
4. Partners can only update their own shop data.

## The Dirty Dozen Payloads (Attack Vectors)
1. **Identity Spoofing**: Attempt to create a partner document for another UID.
2. **Role Escalation**: Attempt to set `role: 'admin'` during signup.
3. **Status Shortcutting**: Attempt to create a partner with `status: 'approved'` directly.
4. **Unauthenticated Read**: Attempt to read all notifications without auth.
5. **Ghost Field Injection**: Attempt to add `adminApproved: true` to a profile.
6. **Cross-Customer Read**: Customer A trying to read Customer B's profile.
7. **Booking Hijack**: User A trying to update User B's booking status.
8. **Resource Exhaustion**: Sending 1MB string in `brandName`.
9. **Orphaned Writes**: Creating a booking without a valid `shopId`.
10. **System Field Tampering**: Modifying `createdAt` string.
11. **Negative Pricing**: Booking a service with price `-500`.
12. **PII Leak**: Reading `mobileNumber` of all partners without being an admin or that partner.

## Test Runner (Logic Verification)
The `firestore.rules.test.ts` should verify:
- `partners` can be read by anyone (public profile).
- `partners` can be created by any authenticated user for their own UID.
- `partners` can only be updated if `existing().uid == request.auth.uid`.
- `bookings` can be listed if `resource.data.customerId == request.auth.uid` or `resource.data.shopId == request.auth.uid`.
- `users` can only be read/written by the owner.
