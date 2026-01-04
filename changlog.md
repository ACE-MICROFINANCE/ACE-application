# CHANGELOG

## 2025-11-30 04:32
- Khởi tạo Prisma schema và nền tảng database ban đầu.

## 2025-12-02 03:56
- Hoàn thiện core API: Auth, Customers, Loans, Savings, Events, Feedback.
- Seed dữ liệu demo phục vụ dev/test.

## 2025-12-10 06:00
- Bổ sung `loan.lastSyncedAt` phục vụ cache sync BIJLI.

## 2025-12-10 06:10
- Bổ sung `customer.lastSyncedAt` phục vụ cache sync BIJLI.

## 2025-12-10 06:20
- Bổ sung `loanType` để phân loại khoản vay (BULLET/DEGRESSIVE).

## 2025-12-30 07:03
- Chuẩn bị nền mapping nhóm/chi nhánh (giai đoạn sync BIJLI).

## 2025-12-30 09:01
- Điều chỉnh quy tắc `loanType` và logic hiển thị khoản vay.

## 2025-12-31 07:10
- Tổ chức lại mô hình mapping nhóm/chi nhánh và staff (giai đoạn dữ liệu BIJLI).

## 2026-01-01 09:00
- Bổ sung bảng lưu lịch sử giao dịch tiết kiệm (CustomerSavingsTransaction).

## 2026-01-04 11:14
- Thêm nền tảng RBAC: StaffUser, phân quyền ADMIN/BRANCH_MANAGER.
- Thêm `Customer.branchCode`, event target theo `BRANCH_ALL` hoặc `GROUPS`.
- Thêm CRUD StaffUser (ADMIN), CRUD Event (BRANCH_MANAGER), Customer events endpoint.
- Thêm endpoint tạo customer stub theo branch.
- Cập nhật JWT payload phân biệt CUSTOMER/STAFF.
- Viết tài liệu `docs/rbac-auth-events.md`.

## 2026-01-04 14:30
- Bật lại cơ chế refresh token ở FE (axios interceptor), gửi body `{ refreshToken }`.
- Lưu refresh token mới sau mỗi lần `/auth/refresh` để tránh logout bất ngờ.

## 2026-01-04 15:33
- Add static GroupName mapping from `branch-group-map.json` to infer `groupCode`, `branchCode`, and `branchName` during BIJLI sync.
- Save `branchName` on Customer and include it in profile responses.

## 2026-01-04 15:50
- Add admin debug endpoints to refresh/read member data by memberNo from BIJLI with DB fallback.
- Add branch-group map cache service and branchName in customer sync/profile.

## 2026-01-04 15:56
- Seed initial StaffUser accounts (1 admin, 4 branch managers) with default password.
