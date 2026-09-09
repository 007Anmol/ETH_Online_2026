# H1-H8 Authentication and Persistence Acceptance

## Database setup

Apply `supabase/migrations/0009_manufacturing_reconciliation.sql` after the existing migrations. It adds recovery metadata to `manufacturing_operations`.

The legacy mock login is disabled by default. Only enable it for legacy API tests with `ALLOW_TEST_AUTH=true`; do not enable it for a real acceptance run.

## Automated security check

Start the frontend normally and run:

```powershell
cd frontend
npm run test:auth-security
```

This verifies that mock-login, unauthenticated batch writes, product reads, reconciliation, and deployment are rejected.

## Real acceptance run

1. Start the frontend with `npm run dev`.
2. Complete Privy wallet login and World ID verification in the browser.
3. In browser developer tools, copy the HTTP-only `verichain_session` cookie into `AUTH_TEST_COOKIE_FIRST_LOGIN` in the test process environment. Never commit it.
4. Create a fresh batch through the manufacturer UI, then log out and log in again.
5. Capture the new session cookie as `AUTH_TEST_COOKIE_RELOGIN`.
6. Optionally capture a second manufacturer's cookie as `AUTH_TEST_COOKIE_SECOND_MANUFACTURER`.
7. Run:

```powershell
cd frontend
npm run test:auth-flow
```

The test checks the backend role, creates a real batch, confirms products and persistent batch state, verifies manufacturer isolation when a second cookie is provided, and verifies persistence after re-login when the re-login cookie is provided.

## Failure recovery

If Hedera succeeds but a Supabase write fails, the batch operation remains `PENDING` in `manufacturing_operations` with both transaction hashes and recovery metadata. After fixing the database issue, submit the pending operation ID as an authenticated manufacturer:

```http
POST /api/manufacturing/reconcile
Content-Type: application/json

{"operationId":"<pending-operation-id>"}
```

The endpoint recreates the batch/products mirror and marks the pending operations successful.