# MTV Portal System

National Meat Inspection Service - Central Luzon Regional Office

A Next.js 14 portal for Meat Transport Vehicle (MTV) registration, GHP orientation, application submission, downloadable requirements, verification, and public contact support.

## Quick Start

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Environment Variables

Create or update `.env`:

```txt
NEXT_PUBLIC_DEMO_MODE=false

MAINTENANCE_MODE=false
MAINTENANCE_MESSAGE=The MTV Portal is temporarily unavailable while we perform system updates.
MAINTENANCE_ETA=Please check back shortly.

GOOGLE_SHEET_ID=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
GOOGLE_DRIVE_FOLDER_ID=...

GMAIL_USER=...
GMAIL_APP_PASSWORD=...
GMAIL_FROM_NAME=NMIS Central Luzon
CONTACT_RECIPIENT_EMAIL=nmis.clu@da.gov.ph
```

Do not commit real production credentials.

## Google Setup

The portal uses free Google services:

| Service | Purpose |
| --- | --- |
| Google Sheets API | Accredited, banned, applications, GHP completions, contact messages, and downloadables |
| Google Drive API | Uploaded application documents and admin-managed downloadable PDFs |
| Gmail SMTP | Application acknowledgements, GHP certificates, and contact notifications |

### OAuth

1. Create a Google Cloud project.
2. Enable Google Sheets API and Google Drive API.
3. Create an OAuth 2.0 Desktop Client.
4. Copy `client_id` and `client_secret` into `.env`.
5. Run:

```bash
node get-refresh-token.js
```

6. Copy the generated refresh token into `GOOGLE_REFRESH_TOKEN`.

### Gmail App Password

1. Enable 2-Step Verification on the Gmail account.
2. Create an App Password for Mail.
3. Put the 16-character password in `GMAIL_APP_PASSWORD`.

## Google Sheets Structure

Create these tabs in the spreadsheet connected to `GOOGLE_SHEET_ID`.

### `Accredited`

```txt
plate | business | type | owner | expiry | status
```

### `Banned`

```txt
plate | business | owner | reason | date | status
```

### `Applications`

Written automatically when an MTV application is submitted.

```txt
ref_number | timestamp | application_type | registered_owner | email | contact | address | region | province | ghp_cert_number | plate | vtype | vmake | vmodel | vyear | capacity | bname | btype | baddress | drive_folder_id | status | vcolor | vengine | vchassis | cr_number | or_number | lto_client_id | body_type | fuel_type | cooling | gross_weight | net_capacity | material | meat_establishment | intended_route
```

The app automatically keeps these headers on the `Applications` tab before saving a new application.

### `GHP_Completions`

Written automatically after a user passes the GHP quiz and claims a certificate.

```txt
cert_number | timestamp | name | email | score | pct | issued_date
```

### `Contact`

Written automatically when a user submits the contact form.

```txt
timestamp | name | email | phone | subject | message | status
```

### `Downloadables`

Used by `/requirements` to show admin-editable PDF downloads.

```txt
title | description | file_url | type | active | order
```

Example:

```txt
MTV Application Form | Printable application form for MTV registration. | https://drive.google.com/file/d/FILE_ID/view?usp=sharing | PDF | yes | 1
Requirements Checklist | Applicant checklist for required documents. | https://drive.google.com/file/d/FILE_ID/view?usp=sharing | PDF | yes | 2
```

Set `active` to `no` to hide an item. Change `order` to reorder the list.

## Google Drive Structure

Create a Drive folder for application uploads, then put its folder ID in `GOOGLE_DRIVE_FOLDER_ID`.

For downloadable PDFs, create a separate folder such as:

```txt
MTV Portal Downloadables
```

Upload the PDF files there. For each file:

1. Right-click the file and choose Share.
2. Set access to `Anyone with the link`.
3. Set role to Viewer.
4. Copy the file link.
5. Paste it into the `file_url` column in the `Downloadables` sheet tab.

The portal converts normal Google Drive share links into download links.

## Maintenance Mode

The portal includes a full-screen maintenance page at:

```txt
/maintenance
```

To show it for normal website pages:

```txt
MAINTENANCE_MODE=true
```

To disable it:

```txt
MAINTENANCE_MODE=false
```

Restart the server after changing `.env`.

You can customize the displayed text with:

```txt
MAINTENANCE_MESSAGE=...
MAINTENANCE_ETA=...
```

## Office Address And Map

The current office address is configured in `src/lib/constants.js`:

```txt
Diosdado Macapagal Government Center, Brgy. Maimpis, San Fernando, Pampanga
```

The contact page embeds Google Maps using `OFFICE_INFO.mapEmbedUrl`.

## Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Home page |
| `/requirements` | MTV requirements, registration guide, and PDF downloadables |
| `/guidelines` | MTV guidelines and memorandum references |
| `/ghp` | GHP orientation, quiz, and certificate claiming |
| `/apply` | MTV application submission and status lookup |
| `/verify` | Accredited MTV verification |
| `/banned` | Banned or suspended MTV list |
| `/contact` | Contact form, office details, FAQs, and map |
| `/maintenance` | Maintenance/update page |

## Project Structure

```txt
src/
  app/
    api/                  API routes
    apply/                MTV application page
    banned/               Banned list page
    contact/              Contact page with map
    ghp/                  GHP orientation page
    guidelines/           Guidelines page
    maintenance/          Maintenance page
    requirements/         Requirements and downloadables page
    verify/               MTV verification page
  components/
    apply/                Application form steps
    ghp/                  Orientation, quiz, and certificate UI
    home/                 Home page sections
    layout/               Header and footer
    ui/                   Shared UI components
    verify/               Verification search UI
  data/                   Required docs and quiz data
  hooks/                  Shared React hooks
  lib/                    Google, email, validation, constants, and helpers
  styles/                 Global styles
middleware.js             Maintenance mode routing
```

## Build

```bash
npm run build
```

## Deploy

Deploy to Vercel or another Next.js host. Add all `.env` values in the hosting provider dashboard before deploying.
