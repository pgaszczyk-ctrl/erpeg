# Maile kont Exp-lore (Supabase Auth) – do wklejenia w panelu

Dlaczego: domyślny mail Supabase wygląda jak podejrzany link („supabase.co/auth/v1/verify…”, nadawca „Supabase Auth”).
Od 11.10.2026 gra sama potwierdza link (`verifyEmailLink` w src/google.ts): **link w mailu prowadzi na exp-lore.app**, a nie na supabase.co.

Wszystko poniżej ustawia się w panelu Supabase, projekt **erpeg** (właściciel; nie da się tego zrobić z kodu ani z SQL).

## 1. Adresy (Authentication → URL Configuration)
- **Site URL:** `https://exp-lore.app`
- **Redirect URLs** (dodaj obie, jeśli ich nie ma):
  - `https://exp-lore.app/**`
  - `https://exp-lore.app/test/**`

## 2. Szablony (Authentication → Emails → Templates)
W każdym szablonie link to `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=…` – `RedirectTo` to adres gry z `?google=1` (gra go podaje), więc gracz zobaczy w mailu `https://exp-lore.app/?google=1&token_hash=…`.

### Confirm signup
**Subject:** `Exp-lore: potwierdź swoje konto / confirm your account`

```html
<div style="font-family:Georgia,serif;background:#efe3c4;padding:24px;color:#231a12">
  <div style="max-width:520px;margin:0 auto;background:#fbf4df;border:3px double #8e2318;padding:24px">
    <h1 style="margin:0 0 4px;font-size:30px;letter-spacing:2px">EXP-LORE</h1>
    <p style="margin:0 0 18px;font-style:italic">Przygoda palcem po mapie</p>
    <p>Witaj, exp-lorerze!</p>
    <p>Ktoś (mamy nadzieję, że ty) zakłada konto w grze <b>Exp-lore</b> na adres {{ .Email }}. Kliknij, żeby je potwierdzić – wrócisz prosto do gry:</p>
    <p style="text-align:center;margin:24px 0">
      <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup" style="background:#8e2318;color:#fbf4df;padding:12px 28px;text-decoration:none;font-weight:bold">Potwierdzam konto</a>
    </p>
    <p style="font-size:13px">Jeśli to nie ty – zignoruj tę wiadomość, konto nie powstanie.</p>
    <hr style="border:0;border-top:1px solid #b9a37a;margin:22px 0">
    <p>Hello, exp-lorer! Someone (hopefully you) is creating an <b>Exp-lore</b> account for {{ .Email }}.
      <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=signup" style="color:#8e2318">Confirm my account</a>.
      If it wasn’t you, just ignore this e-mail.</p>
    <p style="font-size:12px;color:#5b4a36">exp-lore.app</p>
  </div>
</div>
```

### Reset password
**Subject:** `Exp-lore: nowe hasło / new password`

```html
<div style="font-family:Georgia,serif;background:#efe3c4;padding:24px;color:#231a12">
  <div style="max-width:520px;margin:0 auto;background:#fbf4df;border:3px double #8e2318;padding:24px">
    <h1 style="margin:0 0 4px;font-size:30px;letter-spacing:2px">EXP-LORE</h1>
    <p style="margin:0 0 18px;font-style:italic">Przygoda palcem po mapie</p>
    <p>Ktoś poprosił o nowe hasło do konta Exp-lore ({{ .Email }}). Kliknij, a gra pozwoli ustawić nowe:</p>
    <p style="text-align:center;margin:24px 0">
      <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery" style="background:#8e2318;color:#fbf4df;padding:12px 28px;text-decoration:none;font-weight:bold">Ustaw nowe hasło</a>
    </p>
    <p style="font-size:13px">Nie prosiłeś? Zignoruj – stare hasło dalej działa.</p>
    <hr style="border:0;border-top:1px solid #b9a37a;margin:22px 0">
    <p>Someone asked for a new password for the Exp-lore account {{ .Email }}.
      <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery" style="color:#8e2318">Set a new password</a>.
      Didn’t ask? Ignore this – your old password still works.</p>
    <p style="font-size:12px;color:#5b4a36">exp-lore.app</p>
  </div>
</div>
```

### Magic link i Change email (gra ich dziś nie używa)
Wystarczy zmienić temat na `Exp-lore: …` i w linku `{{ .ConfirmationURL }}` zamienić na
`{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=magiclink` (Magic link) / `…&type=email_change` (Change email).

## 3. Nadawca (opcjonalnie, ale bardzo pomaga)
Bez własnej poczty Supabase wysyła jako „Supabase Auth <noreply@mail.app.supabase.io>” i najwyżej kilka maili na godzinę.
Ładniej i pewniej: **Authentication → Emails → SMTP Settings** z darmowym kontem np. Resend (resend.com) na domenie exp-lore.app:
nadawca `Exp-lore <konto@exp-lore.app>`. Resend poda 2–3 rekordy DNS do wpisania w Cloudflare (domena już tam jest).

## 4. Google
Authentication → Sign In / Providers → **Google**: włączony, z Client ID i Secret z Google Cloud Console
(OAuth consent screen: nazwa aplikacji **Exp-lore**, logo, domena exp-lore.app – wtedy Google pokazuje „Przejdź do Exp-lore”, a nie adres supabase.co).
W Google Cloud → Credentials → Authorized redirect URI: `https://iiffchuhrhsjjgmstypx.supabase.co/auth/v1/callback`.
Uwaga: na ekranie Google i tak może mignąć adres supabase.co, dopóki projekt nie ma własnej domeny Supabase (płatny dodatek „Custom domain”, np. auth.exp-lore.app).
