# Staff Management API (Admin)

Base path: `/staff-users`  
Auth: `Authorization: Bearer <accessToken>` (role `ADMIN`)

## 1) List staff users
`GET /staff-users?q=...`

Query:
- `q` (optional): search by `email` or `fullName`.

Response (example):
```json
[
  {
    "id": 1,
    "email": "staff.area1@ace.vn",
    "role": "BRANCH_MANAGER",
    "branchCode": "003",
    "branchName": "Dien Bien 3",
    "fullName": "Nguyen Van A",
    "isActive": true,
    "createdAt": "2026-01-06T10:00:00.000Z",
    "updatedAt": "2026-01-06T10:00:00.000Z"
  }
]
```

## 2) Create staff user
`POST /staff-users`

Body:
```json
{
  "email": "staff.area2@ace.vn",
  "password": "123456",
  "role": "BRANCH_MANAGER",
  "branchCode": "003",
  "fullName": "Tran Thi B"
}
```

Rules:
- `role = BRANCH_MANAGER` => `branchCode` required.
- `role = ADMIN` => `branchCode` must be null/empty.

## 3) Update staff user
`PATCH /staff-users/{id}`

Body (any subset):
```json
{
  "fullName": "Tran Thi B",
  "email": "staff.area2@ace.vn",
  "role": "BRANCH_MANAGER",
  "branchCode": "003",
  "isActive": true
}
```

## 4) Lock / unlock staff user
`PATCH /staff-users/{id}/lock`

Body:
```json
{ "locked": true }
```

Notes:
- `locked = true` => `isActive = false`.
- `locked = false` => `isActive = true`.

## 5) Reset staff password
`POST /staff-users/{id}/reset-password`

Body:
```json
{ "newPassword": "654321" }
```

## 6) Delete staff user
`DELETE /staff-users/{id}`

Response:
```json
{ "success": true }
```

## 7) List branches (for staff assignment)
`GET /staff-users/branches`

Response:
```json
[
  { "branchCode": "001", "branchName": "Dien Bien 1", "displayName": "001-Dien Bien 1" },
  { "branchCode": "003", "branchName": "Dien Bien 3", "displayName": "003-Dien Bien 3" }
]
```

## Notes
- `branchName` is derived from `src/branch-group-map.json` (static mapping).
- No `phone` field in current schema; not returned by these endpoints.
