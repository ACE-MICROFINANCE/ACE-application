# RBAC, Auth, and Events (Backend)

## Context
This backend adds RBAC support for staff users and branch-scoped events without changing customer auth flow. Customers still log in by `memberNo`, while staff users log in by email via the same `/auth/login` endpoint.

## Roles and Actors
Actor kinds:
- `CUSTOMER`
- `STAFF`

Staff roles:
- `ADMIN` (can manage staff users, no event creation)
- `BRANCH_MANAGER` (can manage events within their branch, can create customer stubs)

## JWT Payload
Customer token payload:
```json
{
  "sub": "customerId",
  "actorKind": "CUSTOMER",
  "memberNo": "100001",
  "branchCode": "003",
  "groupCode": "10000032"
}
```

Staff token payload:
```json
{
  "sub": "staffId",
  "actorKind": "STAFF",
  "role": "BRANCH_MANAGER",
  "branchCode": "003"
}
```

## Unified Login
`POST /auth/login`

Body:
```json
{
  "identifier": "staff@ace.vn",
  "password": "123456"
}
```

Behavior:
- If `identifier` contains `@` -> staff login by email.
- Otherwise -> customer login by `memberNo`.

Response (staff):
```json
{
  "accessToken": "...",
  "profile": {
    "actorKind": "STAFF",
    "role": "BRANCH_MANAGER",
    "branchCode": "003",
    "email": "staff@ace.vn",
    "fullName": "Branch Manager"
  }
}
```

Response (customer):
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "customer": { "id": 1, "memberNo": "100001", "fullName": "Nguyen Van A", "mustChangePassword": true },
  "profile": {
    "actorKind": "CUSTOMER",
    "memberNo": "100001",
    "fullName": "Nguyen Van A",
    "branchCode": "003",
    "groupCode": "10000032",
    "groupName": "NL-DOI 1A -BAN NOM"
  }
}
```

## Staff Users (ADMIN only)
All endpoints require JWT + `@Roles('ADMIN')`.

### GET /staff-users
List staff accounts.

### POST /staff-users
Create staff account.

Body:
```json
{
  "email": "staff@ace.vn",
  "password": "123456",
  "role": "BRANCH_MANAGER",
  "branchCode": "003",
  "fullName": "Branch Manager"
}
```

Rules:
- `BRANCH_MANAGER` requires `branchCode`.
- `ADMIN` must not have `branchCode`.

### PATCH /staff-users/:id
Update staff account.

### POST /staff-users/:id/reset-password
Reset staff password.

## Events (BRANCH_MANAGER only)
All endpoints require JWT + `@Roles('BRANCH_MANAGER')`.

### POST /events
Create branch event.

Body:
```json
{
  "title": "Group meeting",
  "description": "Monthly meeting",
  "eventType": "MEETING",
  "startDate": "2026-01-10T09:00:00.000Z",
  "durationMinutes": 120,
  "locationName": "Village house",
  "audienceType": "GROUPS",
  "targetGroups": [
    { "groupCode": "10000032", "groupName": "NL-DOI 1A -BAN NOM" }
  ]
}
```

Rules:
- `branchCode` is taken from staff token (client must not send it).
- If `audienceType=GROUPS`, `targetGroups` is required.
- `endDate` is derived from `startDate + durationMinutes`.

### GET /events
List events in staff branch. Optional filters:
`?from=...&to=...&eventType=...`

### PATCH /events/:id
Update event (only within staff branch).

### DELETE /events/:id
Delete event (only within staff branch).

## Customer Events
### GET /events/my
Returns upcoming events for the current customer.

Filter rules:
- Event must match `customer.branchCode`.
- `audienceType=BRANCH_ALL` always visible.
- `audienceType=GROUPS` visible if customer's `groupCode` is in event target groups.

## Customer Stub (BRANCH_MANAGER only)
### POST /customers/stub
Body:
```json
{ "memberNo": "100001" }
```

Behavior:
- Creates or updates a customer stub for the manager's branch.
- Creates a credential with default password (env `DEFAULT_CUSTOMER_PASSWORD`).
- `mustChangePassword` is set to true.

## Notes
- Events use `audienceType` + `EventTargetGroup` for targeting.
- There is no Branch table in this phase.
- Existing customer APIs remain unchanged.
