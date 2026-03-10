`epic-oauth` exchanges Epic authorization codes and refresh tokens server-side so the mobile bundle never contains `EPIC_CLIENT_SECRET`.

Deploy it with Supabase and set these secrets first:

```bash
supabase secrets set EPIC_CLIENT_ID=your_epic_client_id EPIC_CLIENT_SECRET=your_epic_client_secret
supabase functions deploy epic-oauth
```

The client calls `POST /functions/v1/epic-oauth` with JSON:

```json
{ "action": "exchange", "code": "epic_code", "kind": "exchange_code" }
```

```json
{ "action": "refresh", "refreshToken": "epic_refresh_token" }
```
