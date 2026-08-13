# QQ Music Native Login Design

## Goal

Allow Android users to authenticate with an official QQ Music account and use
that account's entitlement when requesting QQ Music playback URLs for VIP
songs.

The first release is intentionally limited to native Android direct requests.
Web login, QQ personal playlists, QR login, and a new Capacitor plugin are out
of scope.

## User Flow

1. On Android, the Settings page shows a QQ Music account item.
2. The user pastes a complete QQ Music Cookie obtained after signing in to the
   official QQ Music website.
3. The app validates the Cookie against QQ Music's user information endpoint.
4. On success, the app persists the Cookie and a small user profile locally.
5. When a QQ track is played, the native vkey request uses the persisted Cookie
   and the authenticated `uin`.
6. The user can view the nickname/VIP status or log out from Settings.

The app must not log the Cookie or persist the raw QQ API response.

## Architecture

### QQ account store

Add `src/store/qq-store.ts`, following the existing persisted Netease store
pattern. Its state is:

- `cookie: string`
- `user: QqUserProfile | null`, containing `uin`, `nickname`, `avatarUrl`, and
  `isVip`

Its actions are `setLogin(cookie, user)` and `logout()`.

Add a store key for the persisted QQ state. The store is local-only and is not
sent to the Web proxy or Cloudflare functions.

### Authentication API

Add `src/lib/qqmusic/qqmusic-auth.ts` with native-oriented helpers:

- Parse `uin` from `uin`; when absent, derive it from `wxuin` using the existing
  QQ convention.
- Request QQ base user information and VIP information with the supplied
  Cookie.
- Return a normalized `QqUserProfile` on successful validation.
- Return `null` or a typed failure for missing/invalid credentials.

The implementation uses `CapacitorHttp` on native Android. It may use the
existing platform guard to avoid changing Web behavior. No authentication
response body is stored in the Zustand state.

### Settings UI

Add `src/components/settings/QqMusicLogin.tsx`, modeled on the existing
Netease settings item but limited to Cookie login:

- Guard the component with `IS_NATIVE`; Web renders no QQ login UI for now.
- Logged-out state provides a multiline Cookie input and a validation button.
- Logged-in state shows the nickname and VIP indicator, plus logout.
- Clear transient input and validation state when the drawer closes or login
  succeeds.
- Show user-facing errors for empty, invalid, or expired credentials.

Place the item in the existing account settings section next to Netease login.

## Playback Data Flow

Extend `shared/src/utils/music/qqmusic.ts` so
`buildVkeyRequestBody(songmid, qualityKeys, uin = "0")` writes the supplied
`uin` to both the vkey request parameters and the top-level `loginUin`/`comm`
fields. Existing callers remain anonymous through the default.

Update `src/lib/qqmusic/qqmusic-api.ts`:

- Read the QQ store only when constructing the native vkey request.
- Use the stored `uin` in the vkey body.
- Send the complete stored Cookie in the native request headers.
- Preserve the current anonymous request when no QQ account is logged in.
- Keep quality fallback and `null` behavior unchanged.

Search, playlist detail, lyrics, Web proxy routes, and Cloudflare functions do
not change in this release.

## Error Handling and Security

- Invalid or expired Cookies fail validation without replacing a valid
  existing login.
- A vkey response with no playable URL returns `null` through the existing
  provider contract; it does not automatically log the user out.
- Cookie values must never appear in logs, test snapshots, thrown error text,
  or persisted user profile fields beyond the dedicated store field.
- Logout clears both the Cookie and profile.
- This feature does not introduce a new native plugin or transmit credentials
  through a third-party proxy.

## Verification

Add or update tests for:

- Anonymous and authenticated vkey request body construction.
- Native QQ vkey requests including Cookie and authenticated `uin`.
- Cookie parsing, successful profile normalization, invalid credentials, and
  store logout.

Run:

- `npm run typecheck`
- `npm run lint`
- `npm run test`

Manual Android verification should confirm that a logged-in account can play a
known VIP QQ track, while the same track remains unavailable when logged out.
