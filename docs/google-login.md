# Đăng nhập Google trên Android

Luồng: Google Sign-In native → Firebase `accounts:signInWithIdp` →
`POST /api/auth/google-login` → access/refresh token của FinViet.
Backend nhận **Firebase ID token**, không nhận Google ID token trực tiếp.

## Cấu hình một lần

1. Trong Firebase Authentication, bật provider Google.
2. Đăng ký Android app có package `com.finviet.mobile`. Thêm SHA-1 của chứng chỉ
   ký **đúng bản APK đang cài** (debug, EAS preview và release có thể khác nhau).
3. Trong Google Cloud cùng project, kiểm tra OAuth Android client có package/SHA-1
   tương ứng; cấu hình consent screen và test users nếu ứng dụng ở chế độ Testing.
4. Trong `.env.local`, đặt `EXPO_PUBLIC_FIREBASE_API_KEY` và
   `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (OAuth client loại **Web application**).
   Hai biến này đã có trong máy hiện tại; cần xác nhận chúng cùng Firebase project.
   Khi dùng EAS, khai báo các biến này trong EAS environment dùng cho bản build;
   file `.env.local` bị gitignore không được tự động gửi lên EAS.
5. Backend cần `Firebase__ProjectId` và `Firebase__ServiceAccountJsonPath`
   trỏ tới service-account JSON có thật trên máy/container chạy API, hoặc
   `GOOGLE_APPLICATION_CREDENTIALS` trỏ tới file đó. Nếu bỏ ProjectId, Firebase
   Admin lấy project từ credential. Không đưa service-account JSON/private key vào mobile
   hay commit vào Git. Khởi động lại/deploy backend đã sửa sau khi cấu hình.

## Chạy bằng development build

Expo Go không chứa native module Google Sign-In. Đã thêm `expo-dev-client` và
`@react-native-google-signin/google-signin` vào dependency.

Kết nối điện thoại bằng USB, bật USB debugging và chấp nhận hộp thoại trên điện thoại:

```powershell
adb devices
npx expo run:android --device
```

Lần đầu lệnh sẽ tạo project Android và build/cài ứng dụng; cần Android SDK/JDK.
Các lần tiếp theo có thể chạy:

```powershell
npx expo start --dev-client -c
```

Nếu build qua EAS, dùng profile `development` sẵn có, cài APK rồi chạy Metro với
`--dev-client`. Mỗi lần thêm/thay đổi native dependency cần build/cài lại.
Đảm bảo `EXPO_PUBLIC_API_BASE_URL` truy cập được từ điện thoại (LAN IP hoặc HTTPS).

## iOS

Thêm OAuth iOS client cho `com.finviet.mobile` và đặt
`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`. `app.config.js` tự đăng ký reversed client ID
qua config plugin. Không dùng Web client ID thay cho iOS client ID.
Android dùng autolinking và Web client ID, không cần thêm Google Services Gradle
plugin vì việc đổi token Firebase dùng REST API.

## Kiểm tra

- Chọn tài khoản Google: mở được màn hình chính/onboarding, gọi được API được bảo vệ.
- Hủy chọn tài khoản: không tạo phiên đăng nhập.
- Google báo `DEVELOPER_ERROR`/`10`: kiểm tra Web client ID, package và SHA-1.
- API trả 503 `google_auth_not_configured`: kiểm tra credential trên máy chạy backend.
- API trả 401: kiểm tra Firebase project của mobile và backend có trùng nhau không.

Tài liệu chính thức: https://docs.expo.dev/guides/google-authentication/
và https://firebase.google.com/docs/reference/rest/auth#section-sign-in-with-oauth-credential.
