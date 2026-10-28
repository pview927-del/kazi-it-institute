# KAZI IT AND INSTITUTE — Push Notification Setup

## 1. Database
Supabase Dashboard → SQL Editor → New query. Run all SQL from `push-notification-setup.sql`.

## 2. Generate VAPID keys
On a computer with Node.js installed, run:
```bash
npx web-push generate-vapid-keys
```
Keep the **Private Key secret**. Never place it in GitHub or config.js.

## 3. Configure Supabase Edge Function secrets
Deploy `supabase/functions/send-notification/index.ts` as an Edge Function named `send-notification`. Then set these function secrets in Supabase:
- `VAPID_PUBLIC_KEY` = generated public key
- `VAPID_PRIVATE_KEY` = generated private key (secret)
- `VAPID_SUBJECT` = `mailto:YOUR_REAL_ADMIN_EMAIL`

Use Supabase's Dashboard/CLI deployment process. The project URL and service role key are provided to the function by Supabase runtime; never put the service role key in client code.

## 4. Publish public key
Add the generated **public** key as `VAPID_PUBLIC_KEY: "..." ` inside the public `window.KAZI_CONFIG` object in `config.js`. Public key is okay to expose; private key is not.

## 5. Test
Open `install-app.html` on Android Chrome over HTTPS. Install the app if desired, then tap “নোটিফিকেশন চালু করুন” and allow permission. Then sign in to Admin and publish a public notice. Push is sent by the Edge Function to registered devices.

Note: browser permission alone does not send notifications. Push requires the Edge Function to be deployed and the VAPID secrets configured. On iPhone, install the web app to Home Screen first; Web Push requires iOS/iPadOS 16.4+ and user permission. A device/browser can disable notifications at any time.
