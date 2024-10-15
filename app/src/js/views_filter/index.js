import { getArrayDistinct, getArrayIntersect } from "../array_stat/index.js";
import { Checkbox } from "./components/checkbox.js";
import { Switch } from "./../switch/index.js";
import { ListenerStore } from "./../listener_store/index.js";
import { debouncePromise, path } from "./../mx_helper_misc.js";
import { el } from "../el/src/index.js";
import { getDictItem } from "./../language";
import { isElement, isEmpty } from "./../is_test/index.js";
import { setViewsComponents } from "./views_components.js";
import { elTitleKey, elGroup, elEmpty } from "./helpers_ui.js";
import { getFreqTable } from "./stats.js";

import "./style.less";
import { isViewOpen } from "../is_test_mapx/index.js";

const settingsDefault = {
  onFilter: (idViews) => {
    console.log(idViews);
  },
  onUpdateCount: (nTot, nFilter) => {
    console.table({ nTot: nTot, nFilter: nFilter });
  },
  typesTooltip: ["view_components"],
  mode: "intersection",
  elFilterText: document.body,
  elFilterTags: document.body,
  elFilterActivated: document.body,
  views: [],
  debug: false,
};

class ViewsFilter {
  constructor(views, opt) {
    const vf = this;
    vf.opt = { ...settingsDefault, ...opt };
    vf._lStore = new ListenerStore();
    vf.initStorage(views);
    vf.initListeners();
    vf.initSwitchMode();
    vf.update = debouncePromise(vf.update.bind(vf));
    vf.update();
  }

  /**
   * @returns {Promise<void>}
   */
  async update() {
    const vf = this;
    try {
      vf.removeRules();
      vf.updateViewsComponents();
      await vf.updateCheckboxes();
    } catch (e) {
      console.error("ViewsFilter update error", e);
    }
  }

  /**
   * @param {Array} views - Array of view objects
   */
  initStorage(views) {
    const vf = this;
    vf._views = views || vf.opt.views;
    vf._checkboxes = [];
    vf._rules = [];
    vf._previousState = [];
  }

  initListeners() {
    const vf = this;

    vf._lStore.addListener({
      target: vf.opt.elFilterActivated,
      type: ["click"],
      callback: vf.filterActivated,
      group: "view_filter",
      bind: vf,
    });

    vf._lStore.addListener({
      target: vf.opt.elFilterTags,
      type: ["change"],
      callback: vf.handleFilterViewIdByCheckbox,
      group: "view_filter",
      bind: vf,
    });

    vf._lStore.addListener({
      target: vf.opt.elFilterText,
      type: ["keyup"],
      callback: vf.handleFilterViewIdByText,
      group: "view_filter",
      debounce: true,
      debounceTime: 100,
      bind: vf,
    });
  }

  initSwitchMode() {
    const vf = this;
    vf.switchMode = new Switch(vf.opt.elFilterSwitch, {
      labelLeft: el(
        "div",
        { dataset: { lang_key: "filter_views_list_mode_intersection" } },
        "Intersection",
      ),
      labelRight: el(
        "div",
        { dataset: { lang_key: "filter_views_list_mode_union" } },
        "Union",
      ),
      onChange: (enabled) => {
        const op = enabled === true ? "union" : "intersection";
        vf.setMode(op, false);
        vf.apply("handler_switch_mode");
      },
    });
  }

  /**
   * @returns {void}
   */
  destroy() {
    const vf = this;
    if (vf._destroyed) {
      return;
    }
    vf._destroyed = true;
    vf.clear();
    vf._lStore.destroy();
    vf.switchMode.destroy();
  }

  /**
   * @param {string} from - Source of the apply action
   */
  apply(from) {
    const vf = this;
    const pState = vf._previousState;
    const state = vf.getViewsIdSubset();
    const rules = vf.getRules();
    if (pState !== state) {
      vf._previousState = state;
      vf.opt.onFilter(state, rules);
      vf.updateCount();
    }
    if (vf.opt.debug) {
      console.log("filter", from, rules);
    }
  }

  /**
   * @returns {Array} - Array of view objects
   */
  getViews() {
    return this._views;
  }

  /**
   * @returns {Array} - Array of view IDs
   */
  getViewsId() {
    return this._views.map((v) => v.id);
  }

  /**
   * @param {Array} views - Array of view objects
   * @returns {Array} - Array of view objects or empty array
   */
  setViews(views) {
    return (this._views = views || []);
  }

  /**
   * @param {string} hash - Hash of the rule to find
   * @returns {Object|null} - Found rule object or null
   */
  getRuleByHash(hash) {
    return this._rules.find((r) => r.hash === hash) || null;
  }

  /**
   * @returns {Array} - Array of rule objects
   */
  getRules() {
    return this._rules || [];
  }

  /**
   * @returns {void}
   */
  removeRules() {
    this._rules.length = 0;
  }

  /**
   * @param {Object} rule - Rule object to update
   */
  updateRule(rule) {
    const vf = this;
    rule = {
      idViews: [],
      type: null,
      id: null,
      group: null,
      enable: false,
      ...rule,
    };

    const hash = [rule.group, rule.type, rule.id].join(":");
    const rules = vf.getRules();
    const ruleStored = vf.getRuleByHash(hash);
    const ruleExists = !!ruleStored;

    if (ruleExists && rule.enable) {
      ruleStored.idViews = [...rule.idViews];
    }

    if (!ruleExists && rule.enable) {
      rule.hash = hash;
      rules.push(rule);
    }

    if (ruleExists && !rule.enable) {
      const pos = rules.indexOf(ruleStored);
      rules.splice(pos, 1);
    }
  }

  /**
   * @returns {Array} - Array of filtered view objects
   */
  getViewsSubset() {
    const vf = this;
    const idViews = vf.getViewsIdSubset();
    const views = vf.getViews();
    return views.filter((v) => idViews.includes(v.id));
  }

  /**
   * @returns {Array} - Array of filtered view IDs
   */
  getViewsIdSubset() {
    const vf = this;
    const rules = vf.getRules();
    const isIntersect = vf.opt.mode.toLowerCase() === "intersection";
    const viewsBase = isIntersect ? vf.getViewsId() : [];
    const subset = rules.reduce((a, r) => {
      const idViews = r.idViews;
      return isIntersect ? getArrayIntersect(a, idViews) : [...a, ...idViews];
    }, viewsBase);
    let distinct = getArrayDistinct(subset);

    if (!isIntersect && distinct.length === 0) {
      distinct = vf.getViewsId();
    }
    return distinct;
  }

  /**
   * @param {string} op - Operation mode ('intersection' or 'union')
   * @param {boolean} updateSwitch - Whether to update the switch state
   */
  setMode(op, updateSwitch) {
    const vf = this;
    const modes = ["intersection", "union"];
    const opfinal = modes.includes(op) ? op : modes[0];
    const enableSwitch = opfinal === "union";
    vf.opt.mode = opfinal;
    if (updateSwitch !== false) {
      vf.switchMode.setState(enableSwitch);
    }
  }

  /**
   * @param {Checkbox} checkbox - Checkbox object to add
   * @param {HTMLElement} elParent - Parent element to append the checkbox to
   */
  addCheckbox(checkbox, elParent) {
    this._checkboxes.push(checkbox);
    if (elParent) {
      elParent.appendChild(checkbox.el);
    }
  }

  /**
   * @returns {Array} - Array of Checkbox objects
   */
  getCheckboxes() {
    return this._checkboxes;
  }

  /**
   * @param {string} id - Checkbox ID
   * @param {string} type - Checkbox type
   * @returns {Checkbox|null} - Found Checkbox object or null
   */
  getCheckbox(id, type) {
    return (
      this.getCheckboxes().find((t) => t._id === id && t._type === type) || null
    );
  }

  /**
   * @param {Object} opt - Filter options
   */
  filterCombined(opt) {
    const vf = this;
    opt = {
      reset: false,
      rules: [],
      mode: "intersection",
      ...opt,
    };

    if (opt.reset) {
      vf.reset();
    }

    for (const r of opt.rules) {
      if (r.type === "view_collections" || r.type === "view_components") {
        vf.updateCheckboxState(r);
      }
      if (r.type === "text") {
        vf.updateRuleByText(r, true);
      }
    }

    for (const t of vf.getCheckboxes()) {
      vf.updateRuleByCheckbox(t);
    }

    vf.setMode(opt.mode);
    vf.apply("filter_combined");
  }

  /**
   * @param {boolean} enable - Enable/disable the filter
   */
  filterActivated(enable) {
    const vf = this;
    const elBtn = vf.opt.elFilterActivated;
    const clActive = "active";
    const id = elBtn.id;
    const isActive = elBtn.classList.contains(clActive);
    const isToggle = typeof enable !== "boolean";

    if (isToggle) {
      enable = !isActive;
    } else if ((isActive && enable) || (!isActive && !enable)) {
      return;
    }

    if (enable) {
      elBtn.classList.add(clActive);
    } else {
      elBtn.classList.remove(clActive);
    }

    const views = vf.getViews();
    const idViews = views.reduce((a, v) => {
      const isOpen = isViewOpen(v);
      if (enable && isOpen) {
        a.push(v.id);
      }
      return a;
    }, []);

    vf.updateRule({
      group: "input",
      type: "views_activated",
      id: id,
      idViews: idViews,
      enable: enable,
    });

    vf.apply("handler_activated");
  }

  /**
   * @param {Object} opt - Checkbox state update options
   */
  updateCheckboxState(opt) {
    const vf = this;
    opt = {
      type: null,
      value: [],
      state: true,
      ...opt,
    };

    opt.state = opt.state !== false;
    opt.value = Array.isArray(opt.value) ? opt.value : [opt.value];

    for (const t of vf.getCheckboxes()) {
      const hasType = t._type === opt.type;
      if (!hasType) {
        continue;
      }
      const hasId = opt.value.includes(t.id);
      const enable = opt.state && hasId;
      if (t.getState() !== enable) {
        t.setState(enable);
      }
    }
  }

  /**
   * @param {Object} opt - Text rule update options
   * @param {boolean} update - Whether to update the text input element
   */
  updateRuleByText(opt, update) {
    const vf = this;
    const views = vf.getViews();
    const id = vf.opt.elFilterText.id;
    opt = {
      value: "",
      state: false,
      ...opt,
    };

    if (update) {
      vf.opt.elFilterText.value = opt.value;
    }

    const enable = opt.value.length > 0;
    const expr = vf.txtToRegex(opt.value);

    const idViews = views.reduce((a, v) => {
      const found =
        enable &&
        Object.values(path(v, "data.title", {}))
          .join(" ")
          .toLowerCase()
          .search(expr) > -1;

      if (found) {
        return [...a, v.id];
      }

      return a;
    }, []);

    vf.updateRule({
      group: "input",
      type: "text",
      id: id,
      idViews: idViews,
      enable: enable,
    });
  }

  /**
   * @param {Checkbox} cbx - Checkbox object to update rule for
   */
  updateRuleByCheckbox(cbx) {
    const vf = this;

    if (!(cbx instanceof Checkbox)) {
      return;
    }

    const views = vf.getViews();
    const type = cbx.getType();
    const id = cbx.getId();
    const state = cbx.getState();
    const idViews = [];

    if (state) {
      for (const v of views) {
        if (vf.isFound(v, id)) {
          idViews.push(v.id);
        }
      }
    }

    vf.updateRule({
      group: "checkbox",
      type: type,
      id: id,
      idViews: idViews,
      enable: state,
    });
  }

  /**
   * @param {Checkbox} checkbox - Checkbox object to remove
   */
  removeCheckbox(checkbox) {
    const checkboxes = this._checkboxes;
    const pos = checkboxes.indexOf(checkbox);
    if (pos > -1) {
      checkboxes.splice(pos, 1);
    }
  }

  /**
   * @returns {Promise<void>}
   */
  async updateCheckboxes() {
    const vf = this;
    const views = vf.getViews();
    const elContainer = vf.opt.elFilterTags;
    const table = getFreqTable(views);
    const elCheckboxes = document.createDocumentFragment();
    const labels = [];
    const groupsContent = {};
    const parts = [];
    vf._table = table;
    vf.clear();

    const idGroups = vf.tableKeys;
    for (const id of idGroups) {
      groupsContent[id] = elGroup();
      parts.push(elTitleKey(id));
      parts.push(groupsContent[id]);
    }

    for (const elPart of parts) {
      elCheckboxes.appendChild(elPart);
    }

    for (const type of idGroups) {
      const tableType = table[type];
      const addTooltip = true;
      const keys = Object.keys(tableType);
      const elParent = groupsContent[type];
      if (isEmpty(keys)) {
        elParent.appendChild(elEmpty());
      }
      let pos = 0;
      for (const key of keys) {
        const label = await getDictItem(key);
        const tooltipKey = addTooltip ? `${key}_desc` : null;
        const tooltipText = addTooltip ? await getDictItem(tooltipKey) : null;

        const checkbox = new Checkbox({
          order: pos++,
          id: key,
          label: label,
          label_key: key,
          tooltip_text: tooltipText,
          tooltip_key: tooltipKey,
          count: tableType[key],
          type: type,
        });
        vf.addCheckbox(checkbox, elParent);
        labels.push(label);
      }
    }

    elContainer.appendChild(elCheckboxes);

    await Promise.all(labels);

    vf.updateCheckboxesOrder();
  }

  get tableKeys() {
    return Object.keys(this._table || {});
  }

  /**
   * Updates the order of checkboxes
   */
  updateCheckboxesOrder() {
    const vf = this;
    const checkboxes = vf.getCheckboxes();
    const idGroups = vf.tableKeys;
    for (const id of idGroups) {
      const tt = checkboxes.filter((checkbox) => checkbox.getType() === id);
      let pos = 0;

      tt.sort((a, b) => {
        const aLabel = vf.normalise(a.getLabel());
        const bLabel = vf.normalise(b.getLabel());
        return aLabel.localeCompare(bLabel);
      });

      for (const t of tt) {
        t.setOrder(pos++);
      }
    }
  }

  /**
   * Resets the filter state
   */
  reset() {
    const vf = this;
    for (const t of vf.getCheckboxes()) {
      t.setState(false);
    }
    vf.removeRules();

    const elFilter = vf.opt.elFilterActivated;
    const elFilterText = vf.opt.elFilterText;

    elFilter.classList.remove("active");
    elFilterText.value = "";
    vf.apply("reset");
  }

  /**
   * Clears all checkboxes and resets the filter
   */
  clear() {
    const vf = this;
    vf.reset();

    for (const t of vf.getCheckboxes()) {
      t.destroy();
      vf.removeCheckbox(t);
    }
    const elCheckboxes = vf.opt.elFilterTags;
    if (isElement(elCheckboxes)) {
      elCheckboxes.replaceChildren();
    }
  }

  /**
   * Updates the count of filtered views
   */
  updateCount() {
    const vf = this;
    const views = vf.getViews();
    const viewsSubset = vf.getViewsSubset();
    const isIntersect = vf.opt.mode === "intersection";
    const viewsDisplayed = isIntersect ? viewsSubset : views;
    const checkboxes = vf.getCheckboxes();
    const checkboxesCount = getFreqTable(viewsDisplayed);

    for (const checkbox of checkboxes) {
      let count = 0;
      const byType = checkboxesCount[checkbox.getType()];
      if (byType) {
        const byId = byType[checkbox.getId()];
        if (byId) {
          count = byId;
        }
      }
      checkbox.setCount(count);
    }

    vf.opt.onUpdateCount({
      nTot: views.length,
      nSubset: viewsSubset.length,
    });
  }

  /**
   * Updates the components of views
   */
  updateViewsComponents() {
    const vf = this;
    const views = vf.getViews();
    setViewsComponents(views);
  }

  /**
   * Checks if a view matches a given filter
   * @param {Object} view - View object
   * @param {string} filter - Filter value
   * @returns {boolean} - True if the view matches the filter
   */
  isFound(view, filter) {
    return view._components.includes(filter);
  }

  /**
   * Normalizes text
   * @param {string} txt - Text to normalize
   * @returns {string} - Normalized text
   */
  normalise(txt) {
    if (!txt || typeof txt !== "string") {
      return txt;
    }
    return txt.toLowerCase().trim();
  }

  /**
   * Handles text input for filtering
   * @param {Event} event - Input event
   */
  handleFilterViewIdByText(event) {
    const vf = this;
    const text = event.target.value.toLowerCase();

    vf.updateRuleByText({
      value: text,
    });
    vf.apply("handler_text");
  }

  /**
   * Handles checkbox changes for filtering
   * @param {Event} event - Change event
   */
  handleFilterViewIdByCheckbox(event) {
    const vf = this;
    const cbx = event?.target?.checkbox;
    const isValid = cbx instanceof Checkbox;

    if (!isValid) {
      console.warn("Not a checkbox");
      return;
    }

    vf.updateRuleByCheckbox(cbx);
    vf.apply("handler_checkbox");
  }

  /**
   * Converts text to a regular expression
   * @param {string} txt - Text to convert
   * @returns {RegExp} - Resulting regular expression
   */
  txtToRegex(txt) {
    txt = txt || "";
    txt = txt.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

    if (txt.includes(" or ")) {
      txt = txt.split(" or ").join("|");
    }

    if (txt.includes(" and ")) {
      txt = "(?=" + txt.split(" and ").join(")(=?") + ")";
    }

    return new RegExp(txt);
  }
}

export { ViewsFilter };
