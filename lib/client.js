window.__ModuleLoader__.load({
	id: "dsh-nav-tidy",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		/**
		 * dsh-nav-tidy — browser half.
		 *
		 * 隐藏 dsh 左侧栏里选中的「全局面板」入口行，但不卸载插件：面板照常工作，
		 * 只是不再占侧栏那一行。
		 *
		 * 两个入口：
		 *   1) 侧栏「更多」菜单里的一行「侧栏入口」→ 勾选面板（推荐）；
		 *   2) 控制台 API：dshNavTidy.list() / hide() / show() / reset() / open()。
		 *
		 * 实现：给侧栏根节点贴 `data-nav-tidy-scope`，注入
		 * `[data-nav-tidy-scope] button[aria-label*="X" i]{display:none}` 样式表；
		 * MutationObserver 只负责在侧栏被整体替换后重贴标记。不 patch 官方代码。
		 */

		const STORAGE_KEY = "dsh-nav-tidy:hidden";
		const SCOPE_ATTR = "data-nav-tidy-scope";
		const STYLE_ID = "dsh-nav-tidy/rules";
		const PANEL_ATTR = "data-nav-tidy-panel";

		/**
		 * 默认隐藏清单：**空**。
		 * 新装的插件入口先照常显示，藏不藏由用户在面板里自己决定——
		 * 这个插件不替用户做减法。
		 */
		const DEFAULT_HIDDEN = [];

		/** 「更多」这种导航菜单不参与勾选，避免把唯一的入口也藏掉。 */
		const NEVER_HIDE = ["更多"];

		let React = null;
		let primitives = null;
		try {
			React = require("react");
		} catch (error) {
			React = null;
		}
		try {
			primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		} catch (error) {
			primitives = null;
		}

		/* ------------------------------------------------------------------ 清单 */

		function readHidden() {
			try {
				const raw = localStorage.getItem(STORAGE_KEY);
				if (raw === null) return DEFAULT_HIDDEN.slice();
				const parsed = JSON.parse(raw);
				if (!Array.isArray(parsed)) return DEFAULT_HIDDEN.slice();
				return parsed.filter((item) => typeof item === "string" && item !== "");
			} catch (error) {
				return DEFAULT_HIDDEN.slice();
			}
		}

		function writeHidden(list) {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
			} catch (error) {
				// 存不了就只在本页生效
			}
		}

		function normalize(value) {
			return String(value).trim().toLowerCase();
		}

		/** 一个标签是否被清单里的某条覆盖（子串 + 忽略大小写，与 CSS 规则一致）。 */
		function covered(label, list) {
			const target = normalize(label);
			if (target === "") return false;
			return list.some((entry) => {
				const want = normalize(entry);
				return want !== "" && target.includes(want);
			});
		}

		/* ------------------------------------------------------------------ 样式 */

		function escapeAttr(value) {
			return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
		}

		function buildCss(list) {
			const items = list.map((item) => String(item).trim()).filter((item) => item !== "");
			if (items.length === 0) return "";
			const selector = items
				.map((item) => "[" + SCOPE_ATTR + '] button[aria-label*="' + escapeAttr(item) + '" i]')
				.join(",");
			return selector + "{display:none !important}";
		}

		function ensureStyle(list) {
			if (typeof document === "undefined") return null;
			let tag = document.querySelector('style[data-plugin-css="' + STYLE_ID + '"]');
			if (tag === null) {
				tag = document.createElement("style");
				tag.setAttribute("data-plugin-css", STYLE_ID);
				tag.dataset.plugin = "dsh-nav-tidy";
				document.head.appendChild(tag);
			}
			const css = buildCss(list);
			if (tag.textContent !== css) tag.textContent = css;
			return tag;
		}

		/* ------------------------------------------------------------------ 侧栏 */

		function findPanelNav() {
			if (typeof document === "undefined") return null;
			const navs = [...document.querySelectorAll("nav")];
			return navs.find((nav) => nav.querySelector('button[class*="_panelRow"]')) ?? null;
		}

		function sidebarRoot() {
			const nav = findPanelNav();
			if (nav === null) return null;
			return nav.closest('[class*="_root"]') ?? nav.parentElement ?? null;
		}

		function markScope() {
			const root = sidebarRoot();
			if (root === null) return false;
			if (!root.hasAttribute(SCOPE_ATTR)) root.setAttribute(SCOPE_ATTR, "");
			return true;
		}

		/** 当前侧栏里所有可勾选的入口行（含被 CSS 藏起来的行 —— 它们仍在 DOM 里）。 */
		function collectRows() {
			const nav = findPanelNav();
			const root = sidebarRoot();
			if (nav === null || root === null) return [];
			const seen = new Set();
			const rows = [];
			const push = (button) => {
				const label = (button.getAttribute("aria-label") ?? "").trim();
				if (label === "" || seen.has(label)) return;
				if (NEVER_HIDE.includes(label)) return;
				seen.add(label);
				rows.push({ label, hidden: covered(label, hidden) });
			};
			for (const button of nav.querySelectorAll("button[aria-label]")) push(button);
			// Logcat 这类自己往侧栏根节点插行的插件：直接子按钮。
			for (const button of root.querySelectorAll(":scope > button[aria-label]")) push(button);
			return rows;
		}

		function refresh() {
			try {
				ensureStyle(hidden);
				markScope();
			} catch (error) {
				// 侧栏结构变了也不该影响其它 UI
			}
		}

		/* ------------------------------------------------------------------ 勾选面板 */

		let panel = null;

		function el(tag, style, text) {
			const node = document.createElement(tag);
			if (style !== void 0) Object.assign(node.style, style);
			if (text !== void 0) node.textContent = text;
			return node;
		}

		const FONT = '13px/1.6 system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif';

		function closePanel() {
			if (panel !== null) {
				panel.remove();
				panel = null;
				document.removeEventListener("keydown", onPanelKeydown, true);
			}
		}

		function onPanelKeydown(event) {
			if (event.key === "Escape") {
				event.stopPropagation();
				closePanel();
			}
		}

		function setHiddenList(next) {
			hidden = next;
			writeHidden(hidden);
			refresh();
		}

		function openPanel() {
			if (typeof document === "undefined") return;
			if (panel !== null) {
				renderList(panel.__list);
				return;
			}

			const overlay = el("div", {
				position: "fixed",
				inset: "0",
				zIndex: "2147483000",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "rgba(0, 0, 0, 0.32)"
			});
			overlay.setAttribute(PANEL_ATTR, "");
			overlay.addEventListener("mousedown", (event) => {
				if (event.target === overlay) closePanel();
			});

			const box = el("div", {
				width: "min(460px, calc(100vw - 40px))",
				maxHeight: "min(72vh, 660px)",
				display: "flex",
				flexDirection: "column",
				background: "Canvas",
				color: "CanvasText",
				border: "1px solid rgba(128, 128, 128, 0.35)",
				borderRadius: "12px",
				boxShadow: "0 18px 48px rgba(0, 0, 0, 0.3)",
				font: FONT,
				overflow: "hidden"
			});

			const head = el("div", { padding: "14px 18px 10px", borderBottom: "1px solid rgba(128, 128, 128, 0.22)" });
			head.appendChild(el("div", { fontSize: "15px", fontWeight: "600" }, "侧栏入口"));
			head.appendChild(
				el(
					"div",
					{ marginTop: "4px", opacity: "0.65", fontSize: "12px" },
					"新装的插件入口默认都会显示出来；取消勾选即从左侧栏隐藏，插件本身照常运行。"
				)
			);

			const list = el("div", { padding: "8px 10px", overflow: "auto", flex: "1 1 auto" });

			const foot = el("div", {
				padding: "10px 14px",
				display: "flex",
				gap: "8px",
				justifyContent: "flex-end",
				borderTop: "1px solid rgba(128, 128, 128, 0.22)"
			});

			const buttonStyle = {
				font: FONT,
				padding: "6px 12px",
				borderRadius: "8px",
				border: "1px solid rgba(128, 128, 128, 0.4)",
				background: "transparent",
				color: "inherit",
				cursor: "pointer"
			};

			const showAll = el("button", buttonStyle, "全部显示");
			showAll.type = "button";
			showAll.addEventListener("click", () => {
				setHiddenList([]);
				renderList(list);
			});

			const done = el("button", Object.assign({}, buttonStyle, { fontWeight: "600" }), "完成");
			done.type = "button";
			done.addEventListener("click", closePanel);

			foot.appendChild(showAll);
			foot.appendChild(done);
			box.appendChild(head);
			box.appendChild(list);
			box.appendChild(foot);
			overlay.appendChild(box);
			document.body.appendChild(overlay);
			panel = overlay;
			panel.__list = list;
			document.addEventListener("keydown", onPanelKeydown, true);
			renderList(list);
		}

		function renderList(list) {
			if (list === void 0 || list === null) return;
			list.textContent = "";
			const rows = collectRows();
			if (rows.length === 0) {
				list.appendChild(el("div", { padding: "12px 8px", opacity: "0.7" }, "没找到侧栏入口（侧栏可能被收起或还没渲染完）。"));
				return;
			}
			for (const row of rows) {
				const line = el("label", {
					display: "flex",
					alignItems: "center",
					gap: "10px",
					padding: "7px 8px",
					borderRadius: "8px",
					cursor: "pointer"
				});
				line.addEventListener("mouseenter", () => {
					line.style.background = "rgba(128, 128, 128, 0.14)";
				});
				line.addEventListener("mouseleave", () => {
					line.style.background = "transparent";
				});
				const box = el("input");
				box.type = "checkbox";
				box.checked = !row.hidden;
				box.style.margin = "0";
				box.addEventListener("change", () => {
					if (box.checked) {
						setHiddenList(hidden.filter((entry) => !covered(row.label, [entry])));
					} else if (!covered(row.label, hidden)) {
						setHiddenList(hidden.concat([row.label]));
					}
					refresh();
					renderList(list);
				});
				const text = el("span", { flex: "1 1 auto" }, row.label);
				line.appendChild(box);
				line.appendChild(text);
				list.appendChild(line);
			}
		}

		/* ------------------------------------------------------------------ API */

		const api = {
			list: () => hidden.slice(),
			hide: (...labels) => {
				const next = hidden.slice();
				for (const label of labels.flat()) {
					if (typeof label !== "string" || label.trim() === "") continue;
					if (covered(label, next)) continue;
					next.push(label.trim());
				}
				setHiddenList(next);
				return hidden.slice();
			},
			show: (...labels) => {
				const drop = labels.flat().filter((label) => typeof label === "string" && label.trim() !== "");
				setHiddenList(hidden.filter((entry) => !drop.some((label) => covered(entry, [label]))));
				return hidden.slice();
			},
			reset: () => {
				setHiddenList(DEFAULT_HIDDEN.slice());
				return hidden.slice();
			},
			open: openPanel
		};

		/* ------------------------------------------------------------------ 菜单行 */

		/** 「更多」菜单里的一行：左侧栏图标 + 「侧栏入口」，点开勾选面板。 */
		function TidyMenuContent(props) {
			const onSelect = () => {
				try {
					if (props && typeof props.onDismiss === "function") props.onDismiss();
				} catch (error) {
					// ignore
				}
				openPanel();
			};
			if (React !== null && primitives !== null && primitives.MenuItemButton) {
				const Icon = primitives.IconPanelLeftOutlineRegular;
				const icon =
					typeof Icon === "function" ? React.createElement(Icon, { size: 16 }) : undefined;
				return React.createElement(primitives.MenuItemButton, { onSelect, icon }, "侧栏入口");
			}
			return React.createElement(
				"button",
				{
					type: "button",
					onClick: onSelect,
					style: { font: "inherit", display: "block", width: "100%", textAlign: "left", padding: "7px 10px", background: "transparent", border: "0", color: "inherit", cursor: "pointer" }
				},
				"侧栏入口"
			);
		}

		/* ------------------------------------------------------------------ 挂载 */

		let hidden = readHidden();

		function apply(ctx) {
			hidden = readHidden();
			try {
				window.dshNavTidy = api;
			} catch (error) {
				// ignore
			}

			if (typeof React !== "undefined" && React !== null && ctx.slots) {
				try {
					ctx.slots.inject("sidebar.panellist.actions", () =>
						ctx.slots.register(
							{
								name: "sidebar.panellist.actions",
								id: "nav-tidy",
								inject: () => ({})
							},
							TidyMenuContent
						)
					);
				} catch (error) {
					// 菜单行注册失败不影响隐藏功能：控制台 dshNavTidy.open() 仍可打开面板
				}
			}

			ctx.effect(() => {
				let frame = 0;
				const schedule = () => {
					if (frame !== 0) return;
					try {
						frame = requestAnimationFrame(() => {
							frame = 0;
							refresh();
						});
					} catch (error) {
						refresh();
					}
				};
				const observer = new MutationObserver(schedule);
				try {
					observer.observe(document.body, { childList: true, subtree: true });
				} catch (error) {
					// 观察不了就只靠首次与手动 refresh
				}
				refresh();
				return () => {
					observer.disconnect();
					if (frame !== 0) {
						try {
							cancelAnimationFrame(frame);
						} catch (error) {
							// ignore
						}
						frame = 0;
					}
					closePanel();
					try {
						const tag = document.querySelector('style[data-plugin-css="' + STYLE_ID + '"]');
						if (tag !== null) tag.remove();
						for (const root of document.querySelectorAll("[" + SCOPE_ATTR + "]")) {
							root.removeAttribute(SCOPE_ATTR);
						}
						delete window.dshNavTidy;
					} catch (error) {
						// ignore
					}
				};
			}, "nav-tidy: hide selected panel rows");
		}

		exports.apply = apply;
		exports.inject = ["slots"];
		return module.exports;
	}
});
