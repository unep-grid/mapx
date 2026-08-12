// @ts-check
import { ElementCreator } from "../../el/src/index.js";

/**
 * Build the source metadata edit shortcut without coupling it to a window or
 * to the legacy editor transport.
 *
 * @param {{
 *   root: HTMLElement,
 *   label: string,
 *   onEdit: (idSource: string) => boolean|void|Promise<boolean|void>,
 *   onOpened?: () => void
 * }} options
 */
export function createSourceMetadataEditShortcut({
  root,
  label,
  onEdit,
  onOpened = () => {},
}) {
  const createElement = new ElementCreator({
    document: root.ownerDocument,
  }).el;
  const button = createElement(
    "button",
    {
      type: "button",
      class: ["btn", "btn-default"],
      disabled: true,
      style: { display: "none" },
      on: {
        click: async () => {
          const idSource = button.dataset.idSource;
          if (!idSource) return;
          button.disabled = true;
          try {
            const opened = await onEdit(idSource);
            if (opened !== false) onOpened();
            else button.disabled = false;
          } catch (error) {
            console.error("Could not open source metadata editor", error);
            button.disabled = false;
          }
        },
      },
    },
    label,
  );

  return {
    button,
    reveal(idSource) {
      button.dataset.idSource = idSource;
      button.disabled = false;
      button.style.display = "";
    },
  };
}
