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
