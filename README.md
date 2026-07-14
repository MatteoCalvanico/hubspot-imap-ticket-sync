# HubSpot IMAP ticket sync

Script manuale che, dato un Ticket HubSpot, legge la sua Email associata e cerca la controparte non letta in IMAP. Per sicurezza opera in **dry-run**: per impostare `\\Seen` devi aggiungere `--apply`.

## Struttura dei file

| File | Responsabilità |
| --- | --- |
| `src/index.ts` | Punto di avvio CLI: coordina HubSpot, IMAP e l'eventuale marcatura `\\Seen`. |
| `src/config.ts` | Legge e valida le variabili d'ambiente. Supporta password e OAuth2 per IMAP. |
| `src/hubspot.service.ts` | Client SDK HubSpot: da un ticket recupera l'Email associata e i metadati necessari al match. |
| `src/imap.service.ts` | Client ImapFlow: legge le email non lette, estrae testo e metadati, quindi imposta `\\Seen`. |
| `src/matcher.ts` | Normalizza il testo, calcola l'hash SHA-256 e applica il fallback mittente + oggetto + timestamp. |
| `.env.example` | Elenco delle variabili necessarie, senza segreti. |
| `.gitignore` | Esclude segreti, dipendenze, build e log dal versionamento. |

## Flusso di elaborazione

Lo script riceve l'ID di un ticket come argomento e procede nell'ordine seguente:

1. Recupera il ticket tramite SDK HubSpot e legge l'associazione `ticket_to_email`.
2. Recupera l'attività Email HubSpot associata e verifica che sia `INCOMING_EMAIL`.
3. Estrae dall'Email HubSpot il mittente (`hs_email_headers.from.email`), l'oggetto (`hs_email_subject`), il testo (`hs_email_text`) e il timestamp (`hs_timestamp`).
4. Si connette alla mailbox IMAP e legge solo le email non lette, senza modificarle.
5. Cerca dapprima un match tramite hash SHA-256 del testo normalizzato.
6. Se non trova un hash identico, applica il fallback: mittente, oggetto e timestamp entro la tolleranza configurata (`MATCH_WINDOW_MINUTES`).
7. Quando trova **un solo** match, stampa il risultato. Con `--apply` imposta il flag IMAP `\\Seen`, marcando l'email come letta.
8. Se non trova alcun match o trova più match, non cambia nulla nella mailbox.

`hs_timestamp` è il valore usato nel confronto temporale: non `hs_createdate`, che indica invece quando HubSpot ha registrato l'attività Email.

## Preparazione

1. Copia `.env.example` in `.env` e inserisci il token della Private App HubSpot.
2. Per il test IMAP imposta `IMAP_AUTH_MODE=password` e `IMAP_PASSWORD`. Exchange Online normalmente rifiuta questo accesso: il passaggio a OAuth2 usa invece `IMAP_AUTH_MODE=oauth2` e `IMAP_ACCESS_TOKEN`.
3. Installa le dipendenze con `npm install`.

## Esecuzione

```bash
npm run dev -- 423101034719
npm run dev -- 423101034719 --apply
```

La prima esecuzione mostra il match senza modificare la casella. Solo `--apply` marca l'email come letta.
