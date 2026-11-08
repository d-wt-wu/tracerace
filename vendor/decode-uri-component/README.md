Compatibility backport of upstream decode-uri-component 0.5.1 from the npm distribution.

Only the ESM default export is changed to CommonJS module.exports. This preserves the callable API required by Expo Router SDK 57 through query-string 7 while using the patched linear decoder. Upstream MIT license is retained.

Source: https://github.com/SamVerschueren/decode-uri-component
Npm archive SHA-1: 7f66b25bf435df723f9af55713dcf860a1c297d2

Remove the override once an SDK-compatible Router release uses a patched decoder. The vendored decoder is third-party code, not an original TraceRace component.
