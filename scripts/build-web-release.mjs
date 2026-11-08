import { spawnSync } from 'node:child_process';
// Export only public settings. Expo must never embed server environment values.
const result = spawnSync(
  process.execPath,
  ['node_modules/expo/bin/cli', 'export', '--platform', 'web'],
  {
    stdio: 'inherit',
    env: { ...process.env, EXPO_PUBLIC_WEB_API_URL: 'same-origin', EXPO_NO_DOTENV: '1' },
  },
);
if (result.status !== 0) process.exit(result.status ?? 1);
