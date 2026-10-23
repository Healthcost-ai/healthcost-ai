# HealthCost AI

HealthCost AI helps people check the arithmetic on medical bills, keep a private report history, and optionally request a plain-language explanation of bill line items.

## Configure AI bill analysis

Gemini handles both uploaded-bill analysis and saved-bill explanations. In `server/.env`, set `GEMINI_API_KEY=...` and optionally set `GEMINI_MODEL` (defaults to `gemini-3.5-flash-lite`). Keep the key only in the server environment, never in client files, and restart the backend after changing settings.

Provider errors distinguish invalid keys, access/model problems, rate limits or quota, connection failures, and temporary outages. For other errors, check the backend console for the provider status, error code, model, and request ID. The backend does not log the uploaded bill contents or API key.
