# Changelog

## 0.4.0 — 2026-11-10

Feature parity pass against the other sidebar managers on the list (`dsh-sidebar-manager`, `dsh-sidebar-panels`, `dsh-sidebar-overflow`):

- **Right-click to hide.** Right-click any panel row in the sidebar and it is hidden on the spot, with a 4-second **Undo** toast. Workspace and session rows keep their native context menu.
- **Search.** The panel has a search box; typing filters rows by label (case-insensitive).
- **Stale entries.** If a hidden label no longer matches any row (the plugin was uninstalled), the panel says how many are left over and offers one-click cleanup.
- **Bilingual.** Every string follows the host language (`<html lang>`): Chinese when the UI is Chinese, English otherwise. The More-menu row is translated too.
- `More` is never hideable in either language (`更多` / `More`).

## 0.3.0 — 2026-11-09

- **Nothing is hidden by default any more.** An entry a newly installed plugin adds now always appears in the sidebar first; hiding it is the user's decision. `DEFAULT_HIDDEN` is empty.
- The panel's **恢复默认** button is gone — with an empty default list it duplicated **全部显示**. The console `dshNavTidy.reset()` now clears the list too.
- The More-menu row is labelled **侧栏入口** (no trailing ellipsis) and carries the sidebar icon (`IconPanelLeftOutlineRegular`).

## 0.2.0 — 2026-11-09

- Adds the checkbox panel: **sidebar → More → 侧栏入口…**. Lists every current entry, untick to hide, with **全部显示 / 恢复默认** actions.
- Matching is now substring + case-insensitive (`[aria-label*="X" i]`), so long labels such as `Logcat 实机调试` no longer need to be typed in full.
- Adds `dshNavTidy.open()`; the `More` row itself is never hideable.
- Registers into the `sidebar.panellist.actions` slot; the browser half now declares `inject: ["slots"]`.

## 0.1.0 — 2026-11-09

- First release: hides sidebar panel rows by `aria-label`, persisted in `localStorage` under `dsh-nav-tidy:hidden`.
- Console API: `dshNavTidy.list() / hide() / show() / reset()`.
