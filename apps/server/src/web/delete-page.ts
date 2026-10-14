/**
 * The public "Delete your account" page that Google Play asks for: a way to delete an account and its data
 * without installing the app. Plain HTML with one small script, in English and Russian.
 */

export type PageLang = 'en' | 'ru';

const TEXT = {
  en: {
    title: 'Delete your PokerALL account',
    intro:
      'Deleting your account removes your profile, sign-in methods, sessions, synced progress and settings from our servers. It can’t be undone. PokerALL has no real money: game chips have no value and are not refunded or paid out.',
    appTitle: 'From the app (fastest)',
    appText:
      'Open PokerALL → Profile → Settings → Account → Delete account. It works for every kind of account, including guest and Google.',
    passwordTitle: 'With email and password',
    email: 'Email',
    password: 'Password',
    confirm: 'I understand that this can’t be undone',
    deleteButton: 'Delete account permanently',
    requestTitle: 'Can’t open the app?',
    requestText:
      'Signed in with Google or as a guest, or lost your phone? Send a request. We’ll reply to the email you enter to confirm the account is yours and delete it within 30 days.',
    nickname: 'Nickname (if you remember it)',
    message: 'Anything that helps us find the account',
    requestButton: 'Send request',
    logs: 'Short-lived technical server logs (address and time of requests, without your profile or progress) are deleted automatically.',
    done: 'Your account and its data have been deleted.',
    requestDone: 'Request received. We’ll reply to the email you entered.',
    wrong: 'Email or password is wrong.',
    tooMany: 'Too many attempts. Try again in a minute.',
    failed: 'Something went wrong. Try again later.',
    otherLang: 'Русский',
  },
  ru: {
    title: 'Удаление аккаунта PokerALL',
    intro:
      'При удалении аккаунта с наших серверов стираются профиль, способы входа, сессии, синхронизированный прогресс и настройки. Отменить это нельзя. В PokerALL нет реальных денег: игровые фишки не имеют ценности, не возвращаются и не выводятся.',
    appTitle: 'Из приложения (быстрее всего)',
    appText:
      'Откройте PokerALL → Профиль → Настройки → Аккаунт → Удалить аккаунт. Работает для любого аккаунта, в том числе гостевого и Google.',
    passwordTitle: 'По почте и паролю',
    email: 'Почта',
    password: 'Пароль',
    confirm: 'Я понимаю, что удаление нельзя отменить',
    deleteButton: 'Удалить аккаунт навсегда',
    requestTitle: 'Нет доступа к приложению?',
    requestText:
      'Входили через Google или как гость, потеряли телефон? Отправьте заявку. Мы ответим на указанную почту, чтобы убедиться, что аккаунт ваш, и удалим его в течение 30 дней.',
    nickname: 'Ник (если помните)',
    message: 'Что поможет найти аккаунт',
    requestButton: 'Отправить заявку',
    logs: 'Технические журналы сервера (адрес и время запросов, без профиля и прогресса) хранятся недолго и удаляются автоматически.',
    done: 'Аккаунт и его данные удалены.',
    requestDone: 'Заявка принята. Мы ответим на указанную почту.',
    wrong: 'Неверная почта или пароль.',
    tooMany: 'Слишком много попыток. Попробуйте через минуту.',
    failed: 'Что-то пошло не так. Попробуйте позже.',
    otherLang: 'English',
  },
} as const;

/** Picks the language from ?lang=, then from the browser's Accept-Language. */
export function pickLang(query: unknown, acceptLanguage: string | undefined): PageLang {
  const q = (query as { lang?: unknown } | null)?.lang;
  if (q === 'ru' || q === 'en') return q;
  return /^\s*ru\b/i.test(acceptLanguage ?? '') ? 'ru' : 'en';
}

function escape(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function deletePage(lang: PageLang): string {
  const t = TEXT[lang];
  const e = (k: keyof typeof t) => escape(t[k]);
  const other = lang === 'en' ? 'ru' : 'en';
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e('title')}</title>
<style>
  :root { color-scheme: dark; --bg:#07070D; --surface:#11111C; --line:#2A2A40; --text:#ECECF5; --muted:#9A9AB5; --cyan:#22E5FF; --magenta:#FF2BD6; --danger:#FF4D6D; --ok:#7CFF6B; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:16px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 560px; margin: 0 auto; padding: 32px 16px 48px; }
  h1 { font-size: 26px; line-height: 1.2; margin: 0 0 12px; color: var(--cyan); text-shadow: 0 0 18px rgba(34,229,255,.35); }
  h2 { font-size: 18px; margin: 0 0 8px; }
  p { margin: 0 0 12px; color: var(--muted); }
  section { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 18px 16px; margin-top: 16px; }
  label { display:block; font-size: 14px; color: var(--muted); margin: 10px 0 4px; }
  input, textarea { width:100%; background: var(--bg); color: var(--text); border:1px solid var(--line); border-radius: 10px; padding: 10px 12px; font: inherit; }
  input:focus, textarea:focus, button:focus-visible, a:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }
  .check { display:flex; gap:10px; align-items:flex-start; color: var(--text); }
  .check input { width:auto; margin-top: 4px; }
  button { margin-top: 14px; width:100%; border:0; border-radius: 12px; padding: 12px; font: 600 16px/1.2 inherit; cursor:pointer; color:#07070D; background: var(--cyan); }
  button.danger { background: var(--danger); color: #fff; }
  button:disabled { opacity:.5; cursor: default; }
  .result { min-height: 1.5em; margin: 10px 0 0; font-weight: 600; }
  .result.ok { color: var(--ok); } .result.err { color: var(--danger); }
  .lang { float: right; color: var(--magenta); }
  footer { margin-top: 20px; font-size: 13px; color: var(--muted); }
</style>
</head>
<body>
<main>
  <a class="lang" href="?lang=${other}">${e('otherLang')}</a>
  <h1>${e('title')}</h1>
  <p>${e('intro')}</p>

  <section>
    <h2>${e('appTitle')}</h2>
    <p>${e('appText')}</p>
  </section>

  <section>
    <h2>${e('passwordTitle')}</h2>
    <form id="delete-form" data-done="${e('done')}" data-wrong="${e('wrong')}" data-too-many="${e('tooMany')}" data-failed="${e('failed')}">
      <label for="d-email">${e('email')}</label>
      <input id="d-email" name="email" type="email" autocomplete="email" required>
      <label for="d-password">${e('password')}</label>
      <input id="d-password" name="password" type="password" autocomplete="current-password" required>
      <label class="check"><input id="d-confirm" type="checkbox" required> ${e('confirm')}</label>
      <button class="danger" type="submit">${e('deleteButton')}</button>
      <p class="result" role="status" aria-live="polite"></p>
    </form>
  </section>

  <section>
    <h2>${e('requestTitle')}</h2>
    <p>${e('requestText')}</p>
    <form id="request-form" data-lang="${lang}" data-done="${e('requestDone')}" data-too-many="${e('tooMany')}" data-failed="${e('failed')}">
      <label for="r-email">${e('email')}</label>
      <input id="r-email" name="email" type="email" autocomplete="email" required>
      <label for="r-nickname">${e('nickname')}</label>
      <input id="r-nickname" name="nickname" maxlength="32">
      <label for="r-message">${e('message')}</label>
      <textarea id="r-message" name="message" rows="3" maxlength="1000"></textarea>
      <button type="submit">${e('requestButton')}</button>
      <p class="result" role="status" aria-live="polite"></p>
    </form>
  </section>

  <footer>${e('logs')}</footer>
</main>
<script src="/account/delete.js"></script>
</body>
</html>`;
}

/** Sends the forms with fetch and shows the outcome without leaving the page. */
export const DELETE_PAGE_SCRIPT = `(() => {
  function wire(form, url, body, ok) {
    const out = form.querySelector('.result');
    const button = form.querySelector('button');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      button.disabled = true;
      out.className = 'result';
      out.textContent = '';
      try {
        const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body()) });
        if (res.status === ok) { out.textContent = form.dataset.done; out.className = 'result ok'; form.reset(); return; }
        const key = res.status === 401 ? 'wrong' : res.status === 429 ? 'tooMany' : 'failed';
        out.textContent = form.dataset[key] || form.dataset.failed;
        out.className = 'result err';
      } catch (e) {
        out.textContent = form.dataset.failed;
        out.className = 'result err';
      } finally {
        button.disabled = false;
      }
    });
  }
  const del = document.getElementById('delete-form');
  wire(del, '/v1/account/delete', () => ({ email: del.email.value, password: del.password.value }), 204);
  const req = document.getElementById('request-form');
  wire(req, '/v1/account/delete-request', () => ({
    email: req.email.value,
    nickname: req.nickname.value || undefined,
    message: req.message.value || undefined,
    locale: req.dataset.lang,
  }), 202);
})();
`;
