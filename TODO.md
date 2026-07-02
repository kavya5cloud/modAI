# TODO

- [ ] Confirm login failure cause: NextAuth redirects to `/api/auth/error?error=...` due to client auth flow not establishing session.
- [ ] Update `src/lib/api.ts` `authWithCredentials()` to correctly handle NextAuth redirects (302) and then verify session via `/api/auth/session`.
- [ ] Add logging for redirect URL and session establishment.
- [ ] Run frontend/backend lint/build (and any existing auth test script) to ensure the change works.

