<div align="center">

# HubSpot IMAP Ticket Sync

[🇮🇹 Italiano](#italiano) · [🇬🇧 English](#english)

</div>

## Italiano

Questo repository contiene uno script CLI manuale che, dato un ticket HubSpot,
recupera la sua Email associata e cerca la controparte non letta in IMAP.

Per sicurezza lo script lavora in **dry-run**: mostra il match trovato ma non
modifica la mailbox finché non viene passato `--apply`.

### Architettura logica

Il flusso operativo è il seguente:

```text
Ticket HubSpot
  -> associazione ticket_to_email
  -> attività Email HubSpot
  -> estrazione metadati e corpo
  -> connessione IMAP
  -> ricerca tra email non lette
  -> match per hash oppure fallback metadati
  -> eventuale flag \Seen con --apply
```

Componenti principali:

- `src/index.ts`: entrypoint CLI e coordinamento del flusso.
- `src/config.ts`: caricamento e validazione delle variabili d'ambiente.
- `src/hubspot.service.ts`: accesso a ticket ed email tramite SDK HubSpot.
- `src/imap.service.ts`: lettura email IMAP e marcatura `\\Seen`.
- `src/matcher.ts`: matching tramite hash SHA-256 e fallback su metadati.

### Flusso di elaborazione

Lo script riceve l'ID di un ticket e procede nell'ordine seguente:

1. Recupera il ticket tramite SDK HubSpot.
2. Legge l'associazione `ticket_to_email`.
3. Recupera l'attività Email associata e verifica che sia `INCOMING_EMAIL`.
4. Estrae mittente, oggetto, testo e `hs_timestamp`.
5. Si connette alla mailbox IMAP e legge solo i messaggi non letti.
6. Cerca un match tramite hash SHA-256 del testo normalizzato.
7. Se non trova un hash identico, applica il fallback: mittente, oggetto e
   timestamp entro la tolleranza configurata con `MATCH_WINDOW_MINUTES`.
8. Se trova **un solo** match, lo stampa; con `--apply` imposta il flag IMAP
   `\\Seen`.
9. Se non trova match o ne trova più di uno, non modifica nulla.

`hs_timestamp` è il campo usato per il confronto temporale. `hs_createdate`
indica invece quando HubSpot ha registrato l'attività.

### Prerequisiti

- Node.js
- npm
- una Private App HubSpot con accesso a ticket ed email
- una mailbox IMAP accessibile
- credenziali IMAP via password oppure OAuth2

### Configurazione locale

Crea il file di ambiente partendo dal template:

```bash
cp .env.example .env
```

Compila i valori necessari:

```dotenv
HUBSPOT_ACCESS_TOKEN=
IMAP_HOST=outlook.office365.com
IMAP_PORT=993
IMAP_MAILBOX=INBOX
IMAP_USER=
IMAP_AUTH_MODE=password
IMAP_PASSWORD=
IMAP_ACCESS_TOKEN=
MATCH_WINDOW_MINUTES=2
```

Note:

- `HUBSPOT_ACCESS_TOKEN` è il token della Private App HubSpot.
- `IMAP_AUTH_MODE=password` è utile per test di connettività.
- Exchange Online normalmente richiede OAuth2 in ambienti reali.
- Con OAuth2 usa `IMAP_AUTH_MODE=oauth2` e `IMAP_ACCESS_TOKEN`.

### Installazione e verifica

```bash
npm install
npm run check
```

`npm run check` esegue il type-check del progetto con TypeScript.

### Esecuzione

Dry-run:

```bash
npm run dev -- 423101034719
```

Applicazione del flag `\\Seen`:

```bash
npm run dev -- 423101034719 --apply
```

La prima esecuzione mostra il match senza modificare la casella. Solo
`--apply` marca il messaggio IMAP come letto.

## English

This repository contains a manual CLI script that takes a HubSpot ticket,
retrieves its associated Email activity, and looks for the matching unread
message in IMAP.

For safety, the script runs in **dry-run** mode by default: it prints the match
but does not modify the mailbox unless `--apply` is provided.

### Logical architecture

The operational flow is:

```text
HubSpot ticket
  -> ticket_to_email association
  -> HubSpot Email activity
  -> metadata and body extraction
  -> IMAP connection
  -> unread email search
  -> hash match or metadata fallback
  -> optional \Seen flag with --apply
```

Main components:

- `src/index.ts`: CLI entrypoint and flow coordination.
- `src/config.ts`: environment variable loading and validation.
- `src/hubspot.service.ts`: access to tickets and emails through the HubSpot SDK.
- `src/imap.service.ts`: IMAP email reading and `\\Seen` flag updates.
- `src/matcher.ts`: matching via SHA-256 hash and metadata fallback.

### Processing flow

The script receives a ticket ID and proceeds in the following order:

1. Fetch the ticket through the HubSpot SDK.
2. Read the `ticket_to_email` association.
3. Fetch the linked Email activity and verify that it is `INCOMING_EMAIL`.
4. Extract sender, subject, body text, and `hs_timestamp`.
5. Connect to the IMAP mailbox and read unread messages only.
6. Try to match using a SHA-256 hash of the normalized body text.
7. If no exact hash match is found, fall back to sender, subject, and
   timestamp within the tolerance configured by `MATCH_WINDOW_MINUTES`.
8. If **exactly one** match is found, print it; with `--apply`, set the IMAP
   `\\Seen` flag.
9. If no match or multiple matches are found, nothing is changed.

`hs_timestamp` is the field used for time comparison. `hs_createdate` only
indicates when HubSpot stored the activity.

### Prerequisites

- Node.js
- npm
- a HubSpot Private App with ticket and email access
- an accessible IMAP mailbox
- IMAP credentials via password or OAuth2

### Local configuration

Create the environment file from the template:

```bash
cp .env.example .env
```

Fill in the required values:

```dotenv
HUBSPOT_ACCESS_TOKEN=
IMAP_HOST=outlook.office365.com
IMAP_PORT=993
IMAP_MAILBOX=INBOX
IMAP_USER=
IMAP_AUTH_MODE=password
IMAP_PASSWORD=
IMAP_ACCESS_TOKEN=
MATCH_WINDOW_MINUTES=2
```

Notes:

- `HUBSPOT_ACCESS_TOKEN` is the HubSpot Private App token.
- `IMAP_AUTH_MODE=password` is mainly useful for connectivity testing.
- Exchange Online usually requires OAuth2 in real environments.
- With OAuth2, use `IMAP_AUTH_MODE=oauth2` and `IMAP_ACCESS_TOKEN`.

### Installation and verification

```bash
npm install
npm run check
```

`npm run check` runs the TypeScript type-check for the project.

### Usage

Dry-run:

```bash
npm run dev -- 423101034719
```

Apply the `\\Seen` flag:

```bash
npm run dev -- 423101034719 --apply
```

The first command prints the match without changing the mailbox. Only
`--apply` marks the IMAP message as read.
