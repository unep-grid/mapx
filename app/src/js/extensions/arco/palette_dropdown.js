let paletteDropdownId = 0;

/**
 * Accessible palette picker with gradient previews.
 * Zartigl supplies palette metadata; presentation remains MapX-specific.
 */
export function createPaletteDropdown({ palettes, value, onChange }) {
  const root = document.createElement("div");
  root.className = "arco--palette_dropdown";

  const listId = `arco-palette-list-${++paletteDropdownId}`;
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "arco--palette_trigger form-control";
  trigger.setAttribute("role", "combobox");
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", listId);

  const list = document.createElement("div");
  list.id = listId;
  list.className = "arco--palette_list";
  list.setAttribute("role", "listbox");
  list.hidden = true;

  let selected = palettes.findIndex((palette) => palette.id === value);
  if (selected < 0) selected = 0;
  let active = selected;

  const gradient = (palette) =>
    `linear-gradient(to right, ${palette.colors.join(", ")})`;

  const renderTrigger = () => {
    const palette = palettes[selected];
    trigger.replaceChildren();
    if (!palette) return;
    const preview = document.createElement("span");
    preview.className = "arco--palette_preview";
    preview.style.background = gradient(palette);
    const label = document.createElement("span");
    label.className = "arco--palette_label";
    label.textContent = palette.label;
    trigger.append(preview, label);
    trigger.setAttribute("aria-activedescendant", `${listId}-${palette.id}`);
  };

  const options = palettes.map((palette, index) => {
    const option = document.createElement("div");
    option.id = `${listId}-${palette.id}`;
    option.className = "arco--palette_option";
    option.setAttribute("role", "option");
    option.tabIndex = -1;

    const preview = document.createElement("span");
    preview.className = "arco--palette_preview";
    preview.style.background = gradient(palette);
    const label = document.createElement("span");
    label.className = "arco--palette_label";
    label.textContent = palette.label;
    option.append(preview, label);
    option.addEventListener("click", () => select(index));
    return option;
  });
  list.append(...options);

  const syncOptions = () => {
    options.forEach((option, index) => {
      option.classList.toggle("active", index === active);
      option.setAttribute("aria-selected", String(index === selected));
    });
  };

  const focusActive = () => {
    syncOptions();
    options[active]?.focus();
    options[active]?.scrollIntoView({ block: "nearest" });
  };

  const open = () => {
    if (!palettes.length) return;
    list.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    active = selected;
    focusActive();
  };

  const close = ({ restoreFocus = false } = {}) => {
    list.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) trigger.focus();
  };

  function select(index) {
    const palette = palettes[index];
    if (!palette) return;
    selected = index;
    active = index;
    renderTrigger();
    syncOptions();
    close({ restoreFocus: true });
    onChange(palette.id);
  }

  const move = (offset) => {
    active = (active + offset + palettes.length) % palettes.length;
    focusActive();
  };

  const handleKeys = (event) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (list.hidden) open();
        else move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (list.hidden) open();
        else move(-1);
        break;
      case "Home":
        if (list.hidden) return;
        event.preventDefault();
        active = 0;
        focusActive();
        break;
      case "End":
        if (list.hidden) return;
        event.preventDefault();
        active = palettes.length - 1;
        focusActive();
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (list.hidden) open();
        else select(active);
        break;
      case "Escape":
        if (list.hidden) return;
        event.preventDefault();
        close({ restoreFocus: true });
        break;
    }
  };

  trigger.addEventListener("click", () => {
    if (list.hidden) open();
    else close();
  });
  trigger.addEventListener("keydown", handleKeys);
  list.addEventListener("keydown", handleKeys);
  root.addEventListener("focusout", (event) => {
    if (!root.contains(event.relatedTarget)) close();
  });

  const onDocumentPointerDown = (event) => {
    if (!root.contains(event.target)) close();
  };
  document.addEventListener("pointerdown", onDocumentPointerDown);

  renderTrigger();
  syncOptions();
  root.append(trigger, list);
  root.destroy = () =>
    document.removeEventListener("pointerdown", onDocumentPointerDown);
  return root;
}
