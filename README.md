# MedBook Exchange — ₹0 MVP

A second-hand MBBS textbook marketplace with:
- 1st–4th year categories
- seller photo uploads
- seller asking price + automatic ₹50 marketplace fee
- public anonymous listings
- search and year filters
- WhatsApp buyer handoff
- owner-only admin dashboard
- approve / reject / sold / delete controls

## Architecture

Frontend: plain HTML/CSS/JavaScript  
Database + Auth + Storage: Supabase free tier  
Hosting: GitHub Pages  
Contact: WhatsApp `wa.me`

No paid domain is required.

## 1. Create Supabase project

Create a free project at https://supabase.com/

Then open **SQL Editor**, replace:

`YOUR_ADMIN_EMAIL`

with the email you will use for the owner/admin account, and run `supabase_setup.sql`.

## 2. Create your owner account

In Supabase:
Authentication → Users → Add user

Create the email/password account that you put in the SQL policy.

## 3. Get Supabase keys

In Supabase:
Project Settings → API

Copy:
- Project URL
- anon / public key

Put them into `config.js`.

NEVER put the `service_role` key in this website.

Also put your own WhatsApp number into:

`OWNER_WHATSAPP`

Example:

`919876543210`

Do not include `+`, spaces or dashes.

## 4. Test locally

You should serve the folder through a local web server rather than opening index.html directly.

If you have Python:

`python -m http.server 5500`

Then open:

`http://localhost:5500`

## 5. Deploy for free with GitHub Pages

Create a GitHub repository.

Upload:
- index.html
- styles.css
- app.js
- config.js
- README.md
- supabase_setup.sql

Repository → Settings → Pages → Deploy from branch → main → /(root)

Your site will get a free address similar to:

`https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/`

No domain purchase is needed.

## 6. Important security note

The public buyer page reads from a dedicated `public_books` database view that does NOT contain the seller WhatsApp number.

The private `books` table contains seller WhatsApp numbers and is only readable by the authenticated owner/admin policy.

This is important: simply hiding a field in JavaScript would not be sufficient privacy.

For a production version, consider requiring seller authentication before accepting uploads, adding rate limiting/CAPTCHA, validating image types server-side, and moving the owner WhatsApp number to a safer backend-controlled mechanism.

## 7. Change the branding

Search `MedBook Exchange` in index.html and replace it with your preferred name.

## 8. Buyer flow

Buyer → search book → open listing → Buy/Enquire → WhatsApp opens with:

Hi, I am interested in buying "BOOK" by AUTHOR.
Listed price: ₹PRICE.
Book link: LISTING LINK

The buyer's WhatsApp conversation then continues privately.

## 9. Money flow

If seller asks ₹350:
- public buyer price = ₹400
- seller receives/negotiates around ₹350
- ₹50 is your marketplace fee

The website itself does NOT process payment. Payment happens separately through the WhatsApp conversation.

## 10. Recommended next upgrades

- Seller login / OTP
- CAPTCHA or anti-spam
- Admin analytics
- Sold-book archive
- Book condition photos
- Location/college filters without exposing identity
- Automatic seller notification on WhatsApp
- Razorpay/UPI payment flow if you later decide to handle payments
