import { isJSON, isNotEmpty, isString } from "../is_test/index.js";
import { ButtonPanel } from "./button_panel.js";

const BUTTON_PANELS = new Map();

/**
 * Manages ButtonPanels, allowing operations such as show, hide, open, and close.
 * @class
 */
export class ButtonPanelManager {
  /**
   * Initializes a new instance of the ButtonPanelManager.
   * @constructor
   */
  constructor() {}

  /**
   * Applies a batch state to the registered ButtonPanels.
   * @param {Object} stateConfig - The configuration object that maps panel IDs to their desired state.
   *
   * @example
   *
   * // Example stateConfig:
   * {
   *   "controls_panel": {
   *     "show": true,
   *     "open": true
   *   },
   *   "notif_panel": {
   *     "show": false,
   *   }
   * }
   *
   * const manager = new ButtonPanelManager();
   * manager.batch(stateConfig);
   *
   */
  batch(stateConfig) {
    if (isJSON(stateConfig)) {
      stateConfig = JSON.parse(stateConfig);
    }

    for (const [panelId, config] of Object.entries(stateConfig)) {
      const panel = BUTTON_PANELS.get(panelId);

      if (!panel) {
        console.warn(`Panel with ID ${panelId} not found.`);
        continue;
      }

      for (const [action, value] of Object.entries(config)) {
        switch (action) {
          case "show":
            value ? panel.show() : panel.hide();
            break;
          case "open":
            value ? panel.open() : panel.close();
            break;
          case "close":
            value ? panel.close() : panel.open();
            break;
          case "hide":
            value ? panel.hide() : panel.show();
            break;
          default:
            console.warn(`Unknown action ${action} for panel ${panelId}.`);
        }
      }
    }
  }

  /**
   * Retrieves current state .
   * @returns {Object} stateConfig - The configuration object that maps panel IDs to their desired state.
   */
  getState() {
    const pm = this;
    const ids = pm.list();
    const state = {};

    for (const id of ids) {
      const open = pm.isOpen(id);
      const hidden = pm.isHidden(id);
      state[id] = { open, hide: hidden };
    }
    return state;
  }

  /**
   * Lists all registered ButtonPanel IDs.
   * @returns {Array<string>} Array of ButtonPanel IDs.
   */
  list() {
    return Array.from(BUTTON_PANELS.keys());
  }

  /**
   * Test IDs exists
   * @returns {boolean} The ID exists
   */
  idExists(id) {
    return this.list().includes(id);
  }

  /**
   * Retrieves one or more ButtonPanels by their ID or direct instance.
   * @param {(string|ButtonPanel|Array<string|ButtonPanel>)} panels - The panel ID(s), instance(s), or a mix of both.
   * @returns {Array<ButtonPanel>} The corresponding ButtonPanel instance(s).
   */
  get(panels) {
    if (Array.isArray(panels)) {
      return panels.map((panel) => this._getPanel(panel)).filter(isNotEmpty);
    }
    return [this._getPanel(panels)];
  }

  /**
   * Retrieves one ButtonPanels by their ID or direct instance.
   * @param {(string|ButtonPanel)} panel - The panel ID, instance(s), or a mix of both.
   * @returns {<ButtonPanel} The corresponding ButtonPanel instance.
   */
  getSingle(panel) {
    return this._getPanel(panel);
  }

  _getPanel(panel) {
    if (panel instanceof ButtonPanel) {
      return panel;
    }
    if (!isString(panel) || !this.idExists(panel)) {
      return;
    }
    return BUTTON_PANELS.get(panel);
  }

  /**
   * Registers a new ButtonPanel.
   * @param {ButtonPanel} panel - The ButtonPanel instance to register.
   */
  register(panel) {
    BUTTON_PANELS.set(panel.id, panel);
  }

  /**
   * Removes one or more ButtonPanels.
   * @param {(string|ButtonPanel|Array<string|ButtonPanel>)} panels - The panel ID(s), instance(s), or a mix of both.
   */
  remove(panels) {
    this._processPanels(panels, "destroy");
    this._processPanels(panels, (panel) => BUTTON_PANELS.delete(panel.id));
  }

  /**
   * Shows one or more ButtonPanels.
   * @param {(string|ButtonPanel|Array<string|ButtonPanel>)} panels - The panel ID(s), instance(s), or a mix of both.
   */
  show(panels) {
    this._processPanels(panels, "show");
  }

  /**
   * Hides one or more ButtonPanels.
   * @param {(string|ButtonPanel|Array<string|ButtonPanel>)} panels - The panel ID(s), instance(s), or a mix of both.
   */
  hide(panels) {
    this._processPanels(panels, "hide");
  }

  /**
   * Opens one or more ButtonPanels.
   * @param {(string|ButtonPanel|Array<string|ButtonPanel>)} panels - The panel ID(s), instance(s), or a mix of both.
   */
  open(panels) {
    this._processPanels(panels, "open");
  }

  /**
   * Closes one or more ButtonPanels.
   * @param {(string|ButtonPanel|Array<string|ButtonPanel>)} panels - The panel ID(s), instance(s), or a mix of both.
   */
  close(panels) {
    this._processPanels(panels, "close");
  }

  /**
   * Test if a panel is visible.
   * @param {string|ButtonPanel} panel - The panel ID or instance
   */
  isVisible(panel) {
    return this.getSingle(panel)?.isVisible();
  }

  /**
   * Test if a panel is hidden.
   * @param {string|ButtonPanel} panel - The panel ID or instance
   */
  isHidden(panel) {
    return !this.isVisible(panel);
  }

  /**
   * Test if a panel is open
   * @param {string|ButtonPanel} panel - The panel ID or instance
   */
  isOpen(panel) {
    return this.getSingle(panel)?.isOpen();
  }

  /**
   * Test if a panel is closed
   * @param {string|ButtonPanel} panel - The panel ID or instance
   */
  isClosed(panel) {
    return !this.isOpen(panel);
  }

  /**
   * Shows all ButtonPanels.
   */
  showAll() {
    this._processAll("show");
  }

  /**
   * Hides all ButtonPanels.
   */
  hideAll() {
    this._processAll("hide");
  }

  /**
   * Opens all ButtonPanels.
   */
  openAll() {
    this._processAll("open");
  }

  /**
   * Closes all ButtonPanels.
   */
  closeAll() {
    this._processAll("close");
  }

  /**
   * Shows all ButtonPanels except the specified ones.
   * @param {(string|ButtonPanel|Array<string|ButtonPanel>)} panels - The panel ID(s), instance(s), or a mix of both to exclude.
   */
  showAllOther(panels) {
    this._processAllOther(panels, "show");
  }

  /**
   * Hides all ButtonPanels except the specified ones.
   * @param {(string|ButtonPanel|Array<string|ButtonPanel>)} panels - The panel ID(s), instance(s), or a mix of both to exclude.
   */
  hideAllOther(panels) {
    this._processAllOther(panels, "hide");
  }

  /**
   * Opens all ButtonPanels except the specified ones.
   * @param {(string|ButtonPanel|Array<string|ButtonPanel>)} panels - The panel ID(s), instance(s), or a mix of both to exclude.
   */
  openAllOther(panels) {
    this._processAllOther(panels, "open");
  }

  /**
   * Closes all ButtonPanels except the specified ones.
   * @param {(string|ButtonPanel|Array<string|ButtonPanel>)} panels - The panel ID(s), instance(s), or a mix of both to exclude.
   */
  closeAllOther(panels) {
    this._processAllOther(panels, "close");
  }

  /**
   * Reset size for all ButtonPanels.
   */
  resetSizeAll() {
    this._processAll("resetSize");
  }

  /**
   * Test of all hidden
   */
  areAllhidden() {
    return this._processAll("isVisible").every((visible) => visible === false);
  }

  /**
   * Test of all visible
   */
  areAllVisible() {
    return this._processAll("isVisible").every((visible) => visible === true);
  }

  // Helper method to process actions on all panels
  _processAll(action) {
    const res = [];
    for (let panel of BUTTON_PANELS.values()) {
      res.push(panel[action]());
    }
    return res;
  }

  // Helper method to process actions on all panels except specified ones
  _processAllOther(panels, action) {
    const excludePanels = new Set(this.get(panels));
    for (let panel of BUTTON_PANELS.values()) {
      if (!excludePanels.has(panel)) {
        panel[action]();
      }
    }
  }

  // Helper method to process panels
  _processPanels(panels, action) {
    const targetPanels = this.get(panels);
    if (Array.isArray(targetPanels)) {
      for (const panel of targetPanels) {
        if (typeof action === "function") {
          action(panel);
        } else {
          panel[action]();
        }
      }
      return;
    }

    if (typeof action === "function") {
      action(targetPanels);
    } else {
      targetPanels[action]();
    }
  }
}
