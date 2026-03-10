## Gallabox WhatsApp Template Console

This app lists every WhatsApp template available in your Gallabox account, visualises the structure (components, variables, examples, attachments, buttons) and lets you trigger a template message to any recipient with a couple of clicks.

### Features

- Live fetch of templates from `/devapi/accounts/:accountId/whatsappTemplates`
- Categorised overview with status, language, category, last update and variable count
- Detail panel that highlights placeholders, example values, footer variables and non-body components (headers, media, buttons)
- Form-driven template message sender that posts to `/devapi/messages/whatsapp`
- Graceful error handling (Gallabox validation errors surface in the UI)

### Prerequisites

- Node.js 18.17+ (the repo was bootstrapped with Node 22)
- A Gallabox account with the API credentials (apiKey, apiSecret, accountId, channelId)

### Environment variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env.local
```

| Variable | Notes |
| --- | --- |
| `GALLABOX_BASE_URL` | Defaults to `https://server.gallabox.com`; change if you use a sandbox |
| `GALLABOX_ACCOUNT_ID` | The account ID returned by Gallabox |
| `GALLABOX_CHANNEL_ID` | The WhatsApp channel you want to send messages from |
| `GALLABOX_API_KEY` / `GALLABOX_API_SECRET` | API credentials generated in Gallabox |

> `GALLABOX_API_SECRET` and `GALLABOX_API_KEY` are **server-only**. They stay on the server via Next.js server components and API routes: nothing sensitive is exposed to the browser bundle.

### Local development

```bash
npm install
npm run dev
# open http://localhost:3000
```

The dashboard immediately calls Gallabox with your secrets and renders the template catalogue plus the sender form.

### Production build

```bash
npm run build
npm run start
```

### Template data model cheat-sheet

- `components`: Each template is composed of components (`BODY`, `HEADER`, `FOOTER`, `BUTTONS`). The dashboard exposes non-body components, media metadata and buttons (with their URLs or phone numbers).
- `variables`: Body placeholders are returned as a simple string array in the order they appear inside the body component (`{{variable_name}}`). The example values that Gallabox stores (if any) are displayed next to each variable and tucked into input placeholders.
- `footerVariables`: For button payloads (e.g. quick replies), Gallabox returns positional metadata: index, type and whether the slot is required. The UI surfaces that information so you know when a payload must be provided.
- `bodyValues`: When sending a message, Gallabox expects a key/value object where keys match the `variables` names. The POST helper in `/api/messages` merges whatever you enter into that object and submits it alongside the template name/language.

### Sending flow

1. Pick any template from the catalogue or via the dropdown.
2. Enter a full MSISDN (country code + number) for the recipient.
3. Fill in every placeholder value. The API rejects messages when required variables are missing or blank—errors bubble up in the UI.
4. Submit. Successful requests return the Gallabox message ID and show a green confirmation message.

Gallabox responds with status `202` when the payload is accepted; downstream delivery updates can be inspected in the Gallabox message tracker.

### Further improvements

- Extend the sender form to support header variables, button parameters and media uploads.
- Persist a send log locally (SQLite or Postgres) for audit trails.
- Add authentication if exposing the dashboard beyond internal use.
