# Codin

اجرا (فقط Node 18+ لازم است، بدون نصب پکیج):

    node server.js        # → http://localhost:3000

متغیرهای اختیاری: `PORT`، `SECRET`، `ADMIN_EMAIL` (برای دیدن پیام‌ها در `GET /api/messages`)، `TG_TOKEN` + `TG_CHAT` (اعلان تلگرام برای پیام‌های جدید).

داده‌ها در `data/db.json` ذخیره می‌شوند. نمونه‌کارها در `public/demos/` هستند و برای افزودن نمونه جدید، آرایه `DEMOS` را در `public/js/app.js` ویرایش کنید.
