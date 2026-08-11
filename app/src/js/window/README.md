# MapX window system

`<mx-window-layer>` and `<mx-window>` are the dependency-free window boundary
for new MapX interfaces. Consumers create content as DOM nodes and open it with
an `MxWindowManager`; arbitrary HTML strings, Shiny binding, jQuery and widget
auto-initialisation are intentionally outside this API.

```js
const manager = getMapxWindowManager();
const content = manager.root.ownerDocument.createElement("section");
const windowElement = manager.open({
    key: "example",
    title: "Example",
    content,
    modal: true,
    draggable: true,
    resizable: true,
    collapsible: true,
    snappable: true,
    geometry: { width: 720, height: 600 },
});
```

The manager API is `open`, `close`, `closeAll`, `bringToFront` and `destroy`.
Window instances expose `show`, `hide`, `close`, `setTitle`, `collapse`,
`expand`, `snap` and `restore`. Lifecycle and geometry changes emit bubbling
`mx-window-*` DOM events.

Pass a single Bootstrap `.btn-group` node to `footerStart` for a connected tool
toolbar. Pass independent decision buttons to `footerEnd`, as the dialog helpers
do.

```js
const actionGroup = manager.el(
  "div",
  { class: "btn-group", role: "group", "aria-label": "Example actions" },
  [closeButton, importButton, exportButton],
);
manager.open({ content, footerStart: actionGroup });
```

Set `modal: false` for persistent tools that must allow interaction with the
map or application behind them. Non-modal windows do not create an
`mx-window-backdrop` and do not trap focus. Decision dialogs should remain
modal so their backdrop blocks unrelated interaction until they resolve.

## Promise-based dialogs

Use `openConfirmDialog` and `openChoiceDialog` for short modal decisions. Both
helpers require an existing manager so their DOM, focus handling and nested
windows remain scoped to the consumer's application root. Closing with Cancel,
the header button, Escape, replacement or the manager resolves to the configured
cancel value.

```js
const manager = getMapxWindowManager(appRoot);
const accepted = await openConfirmDialog({
  manager,
  title: "Publish theme?",
  content: manager.el("p", "This change is visible to the project."),
  confirmLabel: "Yes",
  cancelLabel: "No",
});

const storage = await openChoiceDialog({
  manager,
  title: "Storage",
  options: [
    { value: "session", label: "Session", checked: true },
    { value: "local", label: "This browser" },
  ],
});
```

`openConfirmDialog` returns `true` by default. Use `getValue` to return custom
data, `cancelValue` to distinguish cancellation, and `onReady` to receive the
window and its buttons for validation. `windowConfig` can override geometry or
enable resizing for larger content such as editors. `openChoiceDialog` accepts
text or DOM labels, disabled/default options, and returns a selected string or
`null`.

## Legacy capability mapping

| Legacy modal concern        | New window API                          |
| --------------------------- | --------------------------------------- |
| `id` / `replace`            | `key` / `replace`                       |
| background                  | `modal`                                 |
| style size and position     | `geometry`                              |
| draggable / resize callback | `draggable`, `resizable`, `onResize`    |
| collapse / half-screen move | `collapse`, `expand`, `snap`, `restore` |
| buttons / alternate buttons | `footerStart`, `footerEnd`              |
| close callback              | `onClose` and `mx-window-close`         |
| title mutation              | `setTitle`                              |

Migration is incremental. The project browser is the first consumer. Existing
legacy callers remain supported until migrated, but new interfaces must use
this boundary and must keep direct references to the DOM they own.
