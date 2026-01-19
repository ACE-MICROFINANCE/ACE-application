# CHANGELOG

## 2026-01-19 14:25
- Mobile: clear profile store on logout and remount bottom tab navigator per role key to avoid showing staff/admin tabs after switching back to customer accounts.

## 2026-01-06 17:50
- Add keyboard-safe helpers for iOS modals (visualViewport inset + delayed scrollIntoView) and apply to change-password modal.
- Update staff management UI with status badge and clearer lock control.

## 2026-01-06 16:45
- Build admin staff-management UI (iOS-like) with search, create/edit, lock/unlock, reset password, and delete flows.
- Integrate /staff-users FE APIs and mobile-safe modal scrolling helpers.
- Add viewportFit=cover for iOS safe-area support in web layout.

## 2026-01-06 16:10
- Add staff management APIs under /staff-users (list/create/update/delete/lock/reset).
- Add branches list endpoint /staff-users/branches and branchName mapping in responses.
- Add optional search query q for staff list.

## 2026-01-06 10:20
- Add staff branch group list endpoint GET /staff/groups (mapped from branch-group-map.json).
- Include audienceType and targetGroups in schedule detail response.

## 2026-01-04 15:56
- Seed initial StaffUser accounts (1 admin, 4 branch managers) with default password.

## 2026-01-04 15:50
- Add admin debug endpoints to refresh/read member data by memberNo with DB fallback.
- Add branch-group map cache service and branchName in customer sync/profile.

## 2026-01-04 15:33
- Add static GroupName mapping from branch-group-map.json to infer groupCode, branchCode, and branchName during BIJLI sync.
- Save branchName on Customer and include it in profile responses.

## 2026-01-04 14:30
- Ensure FE refresh token rotation uses the newest refresh token after /auth/refresh.

## 2026-01-04 11:14
- Add RBAC foundation: StaffUser, ADMIN/BRANCH_MANAGER roles, Customer.branchCode.
- Add event targeting (BRANCH_ALL/GROUPS) and staff/customer event endpoints.
- Add customer stub endpoint for branch managers.
- Update JWT payload with actorKind.
- Add docs/rbac-auth-events.md.

## 2026-01-01 09:00
- Add CustomerSavingsTransaction for savings history.

## 2025-12-30 09:01
- Update loan type rules and loan display mapping.

## 2025-12-30 07:03
- Prepare branch/group mapping foundation for BIJLI sync.

## 2025-12-10 06:20
- Add loanType field for BULLET/DEGRESSIVE.

## 2025-12-10 06:10
- Add customer.lastSyncedAt for BIJLI cache.

## 2025-12-10 06:00
- Add loan.lastSyncedAt for BIJLI cache.

## 2025-12-02 03:56
- Complete core APIs: Auth, Customers, Loans, Savings, Events, Feedback.
- Seed demo data for dev/test.

## 2025-11-30 04:32
- Initialize Prisma schema and baseline database.
