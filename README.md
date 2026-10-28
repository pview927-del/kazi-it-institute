# KAZI IT AND INSTITUTE Website

Mobile-first Bengali website for the offline computer training institute.

## Pages
- `index.html` — redirects to `home.html` (GitHub Pages entry point)
- `home.html` — home page, notice banner, QR code and course cards
- `about.html` — about the institute
- `courses.html` — course directory
- Separate course pages: Computer Fundamentals, Microsoft Office, Graphic Design, Digital Marketing, Web Design and Custom Learning
- `apply.html` — Bengali admission application (name, active phone, occupation, age, gender, home address, course and branch)
- `student-login.html` — Student ID + registered phone lookup
- `notices.html` — public notice board
- `online-class.html` — Zoom/online-class information
- `branches.html` — Fulbaria and Bathandanga branch map section
- `admin.html` — admin dashboard for reviewing applications, issuing Student IDs and managing notices
- `logo.svg` — custom vector logo
- `supabase-setup.sql` — database tables and security policies

## Publish with GitHub Pages
In GitHub, open **Settings → Pages**, select **Deploy from a branch**, choose **main** and **/(root)**, then Save. After GitHub finishes deployment, the site should be at:
https://pview927-del.github.io/kazi-it-institute/

## Connect Supabase (needed for real student/admin data)
1. Create a Supabase project.
2. In **SQL Editor**, run all of `supabase-setup.sql`.
3. In `config.js`, set `SUPABASE_URL` and the project's public **anon/publishable key**. Never use a `service_role` key in frontend code.
4. In Supabase Authentication, create the admin user with a strong password.
5. Copy the admin user's UUID and run the profile insert at the end of `supabase-setup.sql` after replacing `PASTE_AUTH_USER_UUID_HERE`.
6. Set a NEW private admin security code directly in Supabase SQL Editor using the code-hash setup instructions at the bottom of `supabase-setup.sql`. Never put the code in this repository. The admin login needs the email, password, and this code.
7. Test a sample application, approve it from `admin.html` and assign a Student ID.

## Important notes
- The password/security code shared in chat should be considered exposed. Choose new ones before using this for real student data.
- The admission form collects personal information. Do not collect real student data until Supabase is configured and tested. Review privacy, backups and access permissions.
- Exact course fees, duration, terms, Zoom links, branch addresses and map pins must be confirmed by the institute before publishing them as final.
- Until Supabase is configured, the admission form falls back to opening WhatsApp; it does not save applications to a database.
- The QR image is generated from the expected GitHub Pages URL. Scan/test it after Pages deployment is active.
- This is a static site plus Supabase backend; it is not a substitute for verifying the site's security before production use.
