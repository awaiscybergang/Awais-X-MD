# Changelog

## 2.1.0 (2026)
- Commands run only when a message starts with the prefix `.` (before: normal words like "Hai" could trigger commands).
- Anti-gali matches whole words only; anti-gali / anti-link / anti-emoji are OFF by default and owner-only.
- Telegram mode: sessions come back after a restart, private chats only, strict owner, `/stats`, `/logout` removes the linked device, user limit.
- Settings are stored per WhatsApp number (`sessions/<id>/settings.json`).
- Anti-delete and anti-edit rebuilt on the correct WhatsApp events.
- Web Pair: rate limits, capacity limit, safe page, better behaviour on slow internet.
- Works with npm 12 (`allow-git`), Termux and Node 24.
- Phone notifications are no longer suppressed while the bot runs.
- WhatsApp library: `~6.7.18` (newest 6.7.x, security fix + newer WhatsApp compatibility); old installs update themselves at start.
