# Codin

بک‌اند بدون هیچ وابستگی (فقط Node.js نسخه 22.13 یا بالاتر).

## اجرا
    node server.js
بعد برو: http://localhost:3000

## ساختار
- `server.js` ← سرور و API
- `public/index.html` ← سایت (از همین سرور سرو می‌شود)
- `data/` ← دیتابیس SQLite و کلید امضای توکن (خودکار ساخته می‌شود، در گیت نگذار)

## API
| روش | مسیر | ورودی | خروجی |
|---|---|---|---|
| POST | /api/register | name, email, password | `{token, user}` |
| POST | /api/login | email, password | `{token, user}` |
| GET | /api/me | هدر `Authorization: Bearer <token>` | `{user}` |
| POST | /api/contact | name, email, subject, message | `{ok:true}` |

خطاها: status غیر 2xx با بدنه `{error: "..."}` (فارسی یا انگلیسی طبق زبان سایت).

## تنظیمات (متغیر محیطی)
- `PORT` (پیش‌فرض 3000)
- `JWT_SECRET` (اگر نگذاری، یک کلید تصادفی در data/ ساخته می‌شود)
- `ALLOWED_ORIGIN` (روی سرور واقعی دامنه‌ات را بگذار، مثل https://codin.ir)
- `TRUST_PROXY=1` (اگر پشت nginx هستی، برای تشخیص درست IP)
- `DATA_DIR` (مسیر ذخیره دیتابیس)

## پیام‌های فرم تماس
در جدول `contacts` دیتابیس ذخیره می‌شوند و در لاگ سرور هم چاپ می‌شوند.
