export const PRIVACY_UPDATED = 'November 9, 2026';
export const SUPPORT_URL = 'https://www.linkedin.com/in/david-wentao-wu/';
export const privacySections = [
  [
    'Who runs TraceRace',
    'TraceRace is an early educational app made by Wentao Wu. This policy describes the public beta and its development preview. Last updated: ' +
      PRIVACY_UPDATED +
      '.',
  ],
  [
    'Guest practice',
    'You can practice without an account. Lessons, XP, review dates and unfinished assessments are saved in this browser or device. Clearing browser or app data removes that local save. Joining online rankings as a guest creates a nickname and a device ticket on the backend.',
  ],
  [
    'Google and email accounts',
    'Google sign-in shares your name, email and profile information after your approval. TraceRace stores the account and provider records needed to sign you in, including encrypted provider tokens. It never receives your Google password. Password accounts, where enabled, store a password hash rather than the password. The public beta offers Google and guest use; password recovery email is not enabled there.',
  ],
  [
    'Your progress and public rankings',
    'Signed-in completed practice is backed up to your account. Assessment scores, review history and cloud-save revisions are stored with that account. Unfinished assessments stay on the original device. Public rankings are optional and show your chosen nickname, weekly XP and latest ranked assessment score. Your email and detailed answers are not displayed on the boards.',
  ],
  [
    'Course study and written answers',
    'Course progress includes lesson attempts, incorrect answers, hint use, review dates, and saved written or paper-practice responses. These stay on this device for guests and are included in private account progress backups when signed in. Self-review ratings are distinguished from automatically checked answers. They are not public ranking data. The app does not upload your lecture PDFs or run arbitrary submitted C++ code. Avoid entering passwords or unrelated private information in practice answers.',
  ],
  [
    'Why data is stored',
    'Account data supports sign-in, progress backup, conflict recovery and your ranking choices. Practice records let the server verify league scores. Session cookies keep you signed in; security counters limit repeated requests. There are no ads, advertising trackers, or product analytics in this beta.',
  ],
  [
    'Hosting and service providers',
    'The web beta runs on Render and stores account and practice data in Neon-hosted PostgreSQL in AWS US East (Ohio), United States. Better Auth provides the account software. Google processes Google sign-in. These providers may process connection information such as IP addresses and operational logs under their own policies. Data can be processed outside Canada.',
  ],
  [
    'Retention and deletion',
    'Account and practice records remain until you delete the account or the beta is closed. Sessions expire after 30 days unless refreshed or revoked sooner. Delete your account in You → Settings to remove its active account, synced progress and ranking records. Local guest saves and copies on other devices remain until cleared. Provider backups may retain deleted data for their configured recovery period; restored backups must reapply deletions before reopening access.',
  ],
  [
    'Your choices and contact',
    'You can hide public rankings, sign out, reset local practice or delete your account in Settings. Google access can also be removed from your Google Account. Contact Wentao privately through the linked LinkedIn profile for questions or account-data requests. Do not post passwords, session links, or private account details in public bug reports.',
  ],
] as const;
