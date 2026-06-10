# meritsg.com Domain and SMTP Setup

Merit uses Supabase Auth for signup confirmation, resend verification, and password reset emails. There is no app-side SMTP package to install; Supabase sends these emails after its Auth settings are configured.

## App URL

- Production app URL: `https://meritsg.com`
- Vercel env: `NEXT_PUBLIC_APP_URL=https://meritsg.com`
- Support display env:
  - `NEXT_PUBLIC_SUPPORT_EMAIL=hello@meritsg.com`
  - `NEXT_PUBLIC_SUPPORT_URL=mailto:hello@meritsg.com`
  - `NEXT_PUBLIC_SUPPORT_INSTAGRAM_HANDLE=@ryan.fahrein`
  - `NEXT_PUBLIC_SUPPORT_INSTAGRAM_URL=https://instagram.com/ryan.fahrein`

## Vercel Domain

Add both domains to the `merit_v2` Vercel project:

- `meritsg.com`
- `www.meritsg.com`

Vercel added both domains successfully, but GoDaddy DNS still needs these records:

- `A meritsg.com 76.76.21.21`
- `A www.meritsg.com 76.76.21.21`

Alternative: change the domain's nameservers from GoDaddy to Vercel's intended nameservers:

- `ns1.vercel-dns.com`
- `ns2.vercel-dns.com`

## Supabase Auth URL Configuration

In Supabase, open `Authentication -> URL Configuration`.

Set:

- `Site URL`: `https://meritsg.com`

Add redirect URLs:

- `https://meritsg.com/auth/callback`
- `https://meritsg.com/reset-password`
- `https://meritv3.vercel.app/auth/callback`
- `https://meritv3.vercel.app/reset-password`
- `http://localhost:3000/auth/callback`
- `http://localhost:3000/reset-password`
- `http://localhost:3004/auth/callback`
- `http://localhost:3004/reset-password`

Merit routes signup confirmation and password recovery through `/auth/callback` so Supabase can establish a session before the app redirects to `/home` or `/reset-password`. Keep `/reset-password` allow-listed too so direct or older recovery links can still load the reset form.

## Resend SMTP For Supabase Auth

Resend is the simplest fit here because Supabase Auth accepts normal SMTP credentials.

1. In Resend, add and verify `meritsg.com` or a dedicated auth subdomain such as `auth.meritsg.com`.
2. Add the SPF and DKIM records Resend provides. Add DMARC too once basic sending verifies.
3. Create a Resend API key.
4. In Supabase, open `Authentication -> Email -> SMTP Settings`.
5. Set:
   - Sender email: `hello@meritsg.com` or `no-reply@auth.meritsg.com`
   - Sender name: `Merit`
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: Resend API key

After saving, test signup, resend verification, and forgot password with a non-team email address.
