# Push Notifications (Expo Managed)

## Credentials (production)
- iOS: tạo APNs Auth Key (.p8) trong Apple Developer → upload vào Firebase (Cloud Messaging) và EAS (`eas credentials` → iOS → production).
- Android: tạo Service Account key JSON (FCM v1) trong Firebase → upload vào EAS (`eas credentials` → Android → production).
- Nếu dùng Firebase features khác: đặt `google-services.json` ở repo root và khai báo trong `app.json`:
```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

## App config / code (đã có)
- Đã dùng `expo-notifications` trong `src/App.tsx`:
  - Android tạo notification channel trước khi lấy token.
  - Xin quyền, gọi `getExpoPushTokenAsync(projectId)` và gửi token + platform lên backend (`/notifications/device-token`) sau khi login.
  - Lắng nghe tap notification (kể cả cold start) để điều hướng Schedule/Loan.
- Giữ projectId từ EAS (`Constants.expoConfig?.extra?.eas?.projectId` fallback `easConfig.projectId`).

## Điều hướng từ push
- data.kind=`SCHEDULE` + scheduleId → tab Schedule (có params scheduleId).
- data.kind=`LOAN` → tab Loans.
- Nếu chưa đăng nhập, token/tap được giữ `pendingNotification` và xử lý sau khi auth xong.

## Kiểm thử end-to-end
- Dùng build EAS (dev/preview/prod), không dùng Expo Go để kết luận.
- Gửi thử qua Expo Push API / Expo Notifications Tool với ExpoPushToken.
- iOS foreground mặc định không hiện banner: nếu cần, hiển thị local notification thủ công.

## Lỗi thường gặp
- iOS không nhận: kiểm tra APNs key/bundle/team ID, bật Push + Background Remote Notifications.
- Android 13 không hiện: đảm bảo channel tạo trước khi lấy token và permission granted.
- Payload data-only: iOS không hiện banner; cần `notification` block hoặc tự show local.
