// Sends a character's name, code and QR code to an e-mail address.
// Called by the game with the session token; limits live in _email_request.
// Needs the RESEND_API_KEY secret (and optionally MAIL_FROM, GAME_URL).
import { createClient } from 'npm:@supabase/supabase-js@2';
import QRCode from 'npm:qrcode@1.5.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Zła metoda' }, 405);
  const { token, email } = await req.json().catch(() => ({}));
  if (typeof token !== 'string' || typeof email !== 'string') return reply({ error: 'Brak danych' }, 400);

  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return reply({ error: 'Wysyłanie maili jeszcze nie jest włączone. Zapisz kod albo zrób zdjęcie kodu QR.' });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await db.rpc('_email_request', { p_token: token, p_email: email });
  if (error) return reply({ error: 'Błąd serwera' }, 500);
  if (data.error) return reply({ error: data.error });

  const gameUrl = Deno.env.get('GAME_URL') ?? 'https://pgaszczyk-ctrl.github.io/erpeg/';
  const link = `${gameUrl}#postac=${encodeURIComponent(data.name)}&kod=${data.code}`;
  const png: string = await QRCode.toDataURL(link, { margin: 2, width: 320 });
  const name = esc(data.name);
  const html = `<div style="font-family:Arial,sans-serif;max-width:420px">
<h2>Erpeg – Twoja postać ${name}</h2>
<p>Żeby wczytać postać, wpisz w grze:</p>
<p>Imię: <b>${name}</b><br>Kod: <b style="font-size:24px;letter-spacing:3px">${data.code}</b></p>
<p>Albo zeskanuj kod QR telefonem:</p>
<img src="cid:qr" width="240" height="240" alt="kod QR">
<p><a href="${esc(link)}">Albo kliknij tutaj, żeby od razu grać</a></p>
<p style="color:#888;font-size:12px">Nie pokazuj tego kodu nikomu – kto go ma, może grać Twoją postacią.</p>
</div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('MAIL_FROM') ?? 'Erpeg <onboarding@resend.dev>',
      to: [data.email],
      subject: `Erpeg: kod postaci ${data.name}`,
      html,
      text: `Imię: ${data.name}\nKod: ${data.code}\nGraj: ${link}`,
      attachments: [{ filename: 'kod-qr.png', content: png.split(',')[1], content_id: 'qr' }],
    }),
  });
  if (!res.ok) {
    console.error('resend', res.status, await res.text());
    return reply({ error: 'Nie udało się wysłać maila. Spróbuj później.' });
  }
  return reply({ ok: true });
});
