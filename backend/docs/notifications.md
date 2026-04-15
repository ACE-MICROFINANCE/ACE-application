# Notifications (Phase 1 - mobile push only)

## Goals
- Send push notifications when schedules are created/updated/canceled (and reminders), plus loan reminders.
- No inbox screen; mobile renders data from existing APIs. Notifications are still persisted for idempotency/audit and future realtime/inbox.

## Data model
- `Notification`: id, recipientActorKind (CUSTOMER|STAFF), recipientId, type, title, body, data (Json), isRead (future use), notificationKey (UNIQUE for idempotency), createdAt.
- `DeviceToken`: stores actorKind/actorId + push token + platform with lastSeenAt. Token is unique.

## Module layout
- `NotificationsModule` provides:
  - `NotificationsService`: persists notifications then dispatches to providers.
  - Providers: `PushNotificationProvider` (stub FCM/APNs, fetches DeviceToken) and `RealtimeNotificationProvider` (noop, future sockets).
  - `EmailNotificationService`: legacy mail for feedback/password reset (kept for existing flows).
- Templates: `notification-templates.ts` standardizes schedule/loan titles/bodies/notificationKey and data payload.
  - Idempotent keys:
    - SCHEDULE_REMINDER:${scheduleId}:${reminderDays}
    - LOAN_REMINDER:${loanIdOrMemberNo}:${dueDateISO}:${reminderDays}

## API
- `POST /notifications/device-token` (auth required): body `{ token, platform: 'android'|'ios' }`. Uses JWT payload actorKind/userId to upsert DeviceToken.

## Runtime config
- `PUSH_MODE=expo` (default): gửi push thật qua Expo Push API.
- `PUSH_MODE=stub`: tắt gửi push (chỉ lưu DB notification).
- `EXPO_PUSH_ENDPOINT` (optional, default `https://exp.host/--/api/v2/push/send`).
- `EXPO_ACCESS_TOKEN` (optional): Expo access token cho protected push projects.

## Idempotency
- Every send call must provide `notificationKey`; Notification has a UNIQUE constraint. Duplicates are skipped so reminder cron or repeated events do not spam users.

## Future realtime/web
- Realtime provider is a noop; to enable web realtime, implement a socket provider and toggle it without changing business logic or templates.

## Reminder jobs (Phase 2 skeleton)
- Config (defaults): ENABLE_SCHEDULE_REMINDER=false, SCHEDULE_REMINDER_DAYS=7, SCHEDULE_REMINDER_HOUR=8 (Asia/Bangkok).
- Cron runs hourly; only executes at configured hour. Queries schedules on target day (today + days) and sends SCHEDULE_REMINDER with idempotent key.
- Loan reminder job is stubbed (guarded by ENABLE_LOAN_REMINDER=false by default) to be wired when due date data is available.
