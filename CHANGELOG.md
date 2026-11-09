# Changelog

## 0.2.0 — 2026-11-09

- Adds the checkbox panel: **sidebar → More → 侧栏入口…**. Lists every current entry, untick to hide, with **全部显示 / 恢复默认** actions.
- Matching is now substring + case-insensitive (`[aria-label*="X" i]`), so long labels such as `Logcat 实机调试` no longer need to be typed in full.
- Adds `dshNavTidy.open()`; the `More` row itself is never hideable.
- Registers into the `sidebar.panellist.actions` slot; the browser half now declares `inject: ["slots"]`.

## 0.1.0 — 2026-11-09

- First release: hides sidebar panel rows by `aria-label`, persisted in `localStorage` under `dsh-nav-tidy:hidden`.
- Console API: `dshNavTidy.list() / hide() / show() / reset()`.
