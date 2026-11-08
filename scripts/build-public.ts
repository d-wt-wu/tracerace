import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { privacySections, SUPPORT_URL } from '../src/content/privacy';
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const page = (title: string, content: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#6654D9"><title>${escape(title)} · TraceRace</title><style>body{margin:0;background:#f8f5ff;color:#292337;font:16px/1.7 system-ui,sans-serif}main{max-width:680px;margin:auto;padding:32px 24px 64px}a{color:#5742bb}h1{font-size:36px;line-height:1.2;letter-spacing:-1px}h2{font-size:20px;margin-top:32px}nav{display:flex;gap:24px;margin-bottom:36px}p{color:#554d66}button{font:inherit}</style></head><body><main><nav><a href="/">TraceRace</a><a href="/privacy">Privacy</a><a href="/support">Support</a></nav><h1>${escape(title)}</h1>${content}<p><a href="/">Back to practice →</a></p></main></body></html>`;
async function main() {
  await mkdir('public', { recursive: true });
  await copyFile('assets/icon.png', 'public/app-icon.png');
  await writeFile(
    'public/manifest.webmanifest',
    JSON.stringify(
      {
        id: '/',
        name: 'TraceRace',
        short_name: 'TraceRace',
        description: 'Short CS practice, visual code traces and a daily review habit.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#F8F5FF',
        theme_color: '#6654D9',
        icons: [{ src: '/app-icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' }],
      },
      null,
      2,
    ) + '\n',
  );
  await writeFile(
    'public/privacy.html',
    page(
      'Your data',
      privacySections
        .map(
          ([title, copy]) => `<section><h2>${escape(title)}</h2><p>${escape(copy)}</p></section>`,
        )
        .join('') +
        `<p><a href="${SUPPORT_URL}" rel="noopener noreferrer">Contact Wentao privately on LinkedIn</a></p>`,
    ),
  );
  await writeFile(
    'public/support.html',
    page(
      'A little help',
      `<h2>Save and sign in</h2><p>Guest practice stays in this browser. Google sign-in backs up completed practice to your account. Use the same account when you return. Assessment drafts stay on the device where you started them.</p><h2>Install on your home screen</h2><p>On iPhone, open this address in Safari, choose Share, then Add to Home Screen. On Android, use Chrome’s menu and choose Install app or Add to Home screen when available. This beta needs an internet connection to load the app, sign in and sync; it does not promise offline installation or background sync.</p><h2>Something went wrong?</h2><p>Reload once and check your connection. Avoid clearing browser data if your only save is a guest save. Check account status under You → Settings before switching devices.</p><h2>Report a bug</h2><p><a href="https://github.com/d-wt-wu/tracerace/issues/new">Open a GitHub issue</a> with the screen, what you expected and what happened. Include browser/device details. Keep emails, passwords, sign-in URLs and account data out of public reports.</p><h2>Account and privacy help</h2><p>Delete your account or hide your public ranking in You → Settings. For private help or data requests, <a href="${SUPPORT_URL}" rel="noopener noreferrer">message Wentao on LinkedIn</a>.</p><h2>About the beta</h2><p>Practice titles are playful indicators from a short question set, not professional certifications. The question bank is curated; difficulty is still being calibrated with feedback. Free hosting may take a little time to wake after inactivity.</p>`,
    ),
  );
}
void main().catch(() => {
  console.error('Could not prepare public web files.');
  process.exit(1);
});
