import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  emitAsync: vi.fn(),
  close: vi.fn(),
  open: vi.fn(),
  getManager: vi.fn(),
}));

vi.mock("../../mx.js", () => ({
  ws: { emitAsync: mocks.emitAsync },
}));

vi.mock("../../window/index.js", () => ({
  getMapxWindowManager: mocks.getManager,
}));

import { MxSourcePickerElement, pickSources } from "./index.js";

describe("MxSourcePickerElement", () => {
  let picker;

  beforeEach(() => {
    vi.clearAllMocks();
    const browserWindow = document.createElement("mx-window");
    browserWindow.close = mocks.close;
    mocks.open.mockReturnValue(browserWindow);
    mocks.getManager.mockReturnValue({ open: mocks.open });
    mocks.emitAsync.mockResolvedValue({
      success: true,
      total: 0,
      facets: { tags: [] },
      items: [],
    });
    picker = new MxSourcePickerElement();
    picker.config = {
      value: ["mx_vector_a_b_c_d_e"],
      acceptedTypes: ["vector", "join"],
      label: "Layer",
    };
    document.body.append(picker);
  });

  afterEach(() => picker.remove());

  it("renders as a compact field and emits a typed bubbling change", async () => {
    await new Promise((resolve) => queueMicrotask(resolve));
    const listener = vi.fn();
    document.body.addEventListener("mx-source-picker-change", listener, {
      once: true,
    });
    picker.selectedItems = new Map([
      [
        "mx_vector_f_g_h_i_j",
        {
          id: "mx_vector_f_g_h_i_j",
          title: "Population",
          type: "vector",
        },
      ],
    ]);
    picker.commit();
    expect(picker.value).toBe("mx_vector_f_g_h_i_j");
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          value: "mx_vector_f_g_h_i_j",
        }),
      }),
    );
    expect(
      picker.querySelector(".mx-source-picker__selected-title").innerText,
    ).toBe("Population");
    const label = picker.querySelector(".control-label");
    const control = picker.querySelector(".mx-source-picker__value");
    expect(label.closest(".form-group")).not.toBeNull();
    expect(label.getAttribute("for")).toBe(control.id);
    expect(picker.querySelector(".mx-source-picker__open")).toBeNull();
    expect(
      picker.querySelector("[data-action='remove'] .fa-times"),
    ).not.toBeNull();
  });

  it("opens a compact always-on-top window with an explicit selection action", () => {
    picker.open();

    expect(mocks.open).toHaveBeenCalledWith(
      expect.objectContaining({
        content: picker.refs.browser,
        footerEnd: picker.refs.confirm,
        alwaysOnTop: true,
        geometry: { width: 640, height: 520 },
      }),
    );
    expect(picker.refs.confirm.innerText).toBe("Select");
    expect(picker.refs.filters.hidden).toBe(true);
  });

  it("closes its managed window when its application root disconnects", () => {
    picker.open();

    picker.remove();

    expect(mocks.close).toHaveBeenCalledWith("picker-disconnected");
  });

  it("sends only compact search criteria and hydrates the selected title", async () => {
    mocks.emitAsync.mockResolvedValue({
      success: true,
      total: 1,
      facets: { tags: [{ value: "transport", count: 1 }] },
      items: [
        {
          id: "mx_vector_a_b_c_d_e",
          title: "Road network",
          type: "vector",
          geometry_types: ["line"],
          editor_email: "editor@example.org",
          row_estimate: 291,
          column_count: 12,
        },
      ],
    });
    picker.buildBrowser();
    await picker.loadResults();
    expect(mocks.emitAsync).toHaveBeenCalledWith(
      "/client/source/search",
      expect.objectContaining({
        acceptedTypes: ["vector", "join"],
        geometryTypes: [],
        tags: [],
        limit: 50,
      }),
      15000,
    );
    expect(
      picker.querySelector(".mx-source-picker__selected-title").innerText,
    ).toBe("Road network");
    expect(picker.refs.results.children).toHaveLength(1);
    expect(picker.refs.tag.options[1].innerText).toBe("transport (1)");
    expect(
      picker.refs.results.querySelector(".mx-source-browser__meta").innerText,
    ).toContain("~291 rows · 12 fields");
  });

  it("hydrates an initial ID into its localized compact source record", async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    mocks.emitAsync.mockClear();
    mocks.emitAsync.mockResolvedValue({
      success: true,
      total: 1,
      facets: { tags: [] },
      items: [
        {
          id: "mx_vector_a_b_c_d_e",
          title: "Réseau routier",
          type: "vector",
          geometry_types: ["line"],
        },
      ],
    });

    await picker.hydrateSelectedItems();

    expect(mocks.emitAsync).toHaveBeenCalledWith(
      "/client/source/search",
      expect.objectContaining({
        selectedIds: ["mx_vector_a_b_c_d_e"],
        requiredCapabilities: ["geometry"],
        access: [],
        language: "en",
        limit: 1,
      }),
      15000,
    );
    expect(
      picker.querySelector(".mx-source-picker__selected-title").innerText,
    ).toBe("Réseau routier");
  });

  it("does not let stale initial hydration overwrite a newer selection", async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    let resolveHydration;
    mocks.emitAsync.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveHydration = resolve;
        }),
    );
    const hydration = picker.hydrateSelectedItems();
    picker.selectedItems = new Map([
      [
        "mx_vector_f_g_h_i_j",
        {
          id: "mx_vector_f_g_h_i_j",
          title: "Population",
          type: "vector",
        },
      ],
    ]);
    picker.commit();
    resolveHydration({
      success: true,
      items: [
        {
          id: "mx_vector_a_b_c_d_e",
          title: "Road network",
          type: "vector",
        },
      ],
    });
    await hydration;

    expect(picker.value).toBe("mx_vector_f_g_h_i_j");
    expect(
      picker.querySelector(".mx-source-picker__selected-title").innerText,
    ).toBe("Population");
  });

  it("keeps selected ID order when hydration results arrive out of order", async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    const ids = ["mx_vector_a_b_c_d_e", "mx_vector_f_g_h_i_j"];
    picker.config = {
      multiple: true,
      maxItems: 2,
      acceptedTypes: ["vector"],
      requiredCapabilities: ["geometry"],
    };
    picker.value = ids;
    mocks.emitAsync.mockResolvedValue({
      success: true,
      items: [
        { id: ids[1], title: "Population", type: "vector" },
        { id: ids[0], title: "Road network", type: "vector" },
      ],
    });

    await picker.hydrateSelectedItems();

    expect(picker.value).toEqual(ids);
    expect([...picker.selectedItems.values()].map((item) => item.title)).toEqual(
      ["Road network", "Population"],
    );
  });

  it("ignores search responses superseded by a newer request", async () => {
    let resolveFirst;
    let resolveSecond;
    mocks.emitAsync
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );
    picker.buildBrowser();
    picker.refs.search.value = "roads";
    const first = picker.loadResults();
    picker.refs.search.value = "population";
    const second = picker.loadResults();

    resolveSecond({
      success: true,
      total: 1,
      facets: { tags: [] },
      items: [
        {
          id: "mx_vector_f_g_h_i_j",
          title: "Population",
          type: "vector",
        },
      ],
    });
    await second;
    resolveFirst({
      success: true,
      total: 1,
      facets: { tags: [] },
      items: [
        {
          id: "mx_vector_a_b_c_d_e",
          title: "Road network",
          type: "vector",
        },
      ],
    });
    await first;

    expect(picker.items.map((item) => item.title)).toEqual(["Population"]);
    expect(
      [...picker.refs.results.querySelectorAll(".mx-source-browser__title")].map(
        (element) => element.innerText,
      ),
    ).toEqual(["Population"]);
  });

  it("clears a selected source when it becomes excluded", async () => {
    await new Promise((resolve) => queueMicrotask(resolve));
    const listener = vi.fn();
    picker.addEventListener("mx-source-picker-change", listener);

    expect(picker.setExcludedIds(["mx_vector_a_b_c_d_e"])).toBe(true);

    expect(picker.value).toBeNull();
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({ value: null }),
      }),
    );
  });

  it("keeps row selection pending until Select is pressed", () => {
    const replacement = {
      id: "mx_vector_f_g_h_i_j",
      title: "Population",
      type: "vector",
      geometry_types: ["polygon"],
    };
    picker.pendingSelectedItems = new Map(picker.selectedItems);
    picker.buildBrowser();
    picker.items = [replacement];
    picker.refs.results.replaceChildren(picker.buildResult(replacement));
    picker.browserWindow = { close: mocks.close };

    picker.refs.results.firstElementChild.click();

    expect(picker.value).toBe("mx_vector_a_b_c_d_e");
    expect([...picker.pendingSelectedItems.keys()]).toEqual([replacement.id]);

    picker.refs.confirm.click();

    expect(picker.value).toBe(replacement.id);
    expect(mocks.close).toHaveBeenCalledWith("selected");
  });

  it("marks the configured source selected after asynchronous list rendering", () => {
    const current = {
      id: "mx_vector_a_b_c_d_e",
      title: "Road network",
      type: "vector",
      geometry_types: ["line"],
    };
    picker.pendingSelectedItems = new Map(picker.selectedItems);
    picker.buildBrowser();
    picker.items = [current];
    picker.refs.results.replaceChildren(picker.buildResult(current, 0));
    picker.activeItem = current;

    picker.renderBrowserSelection();

    const row = picker.refs.results.firstElementChild;
    expect(row.getAttribute("aria-selected")).toBe("true");
    expect(row.classList.contains("is-selected")).toBe(true);
    expect(row.querySelector(".fa-check")).not.toBeNull();
  });

  it("uses arrow keys to update pending single selection and Enter to commit", () => {
    const items = ["Road network", "Population", "Protected areas"].map(
      (title, index) => ({
        id: `mx_vector_${String.fromCharCode(97 + index)}_b_c_d_e`,
        title,
        type: "vector",
        geometry_types: ["polygon"],
      }),
    );
    picker.pendingSelectedItems = new Map([[items[0].id, items[0]]]);
    picker.activeItem = items[0];
    picker.buildBrowser();
    picker.items = items;
    picker.refs.results.replaceChildren(
      ...items.map((item, index) => picker.buildResult(item, index)),
    );
    picker.renderBrowserSelection();
    picker.browserWindow = { close: mocks.close };
    const rows = picker.refs.results.children;
    const focusNext = vi.spyOn(rows[1], "focus");

    rows[0].dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );

    expect(picker.activeItem.id).toBe(items[1].id);
    expect([...picker.pendingSelectedItems.keys()]).toEqual([items[1].id]);
    expect(focusNext).toHaveBeenCalled();

    rows[1].dispatchEvent(
      new KeyboardEvent("keydown", { key: "End", bubbles: true }),
    );
    expect(picker.activeItem.id).toBe(items[2].id);
    rows[2].dispatchEvent(
      new KeyboardEvent("keydown", { key: "Home", bubbles: true }),
    );
    expect(picker.activeItem.id).toBe(items[0].id);
    rows[0].dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );

    rows[1].dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    expect(picker.value).toBe(items[1].id);
    expect(mocks.close).toHaveBeenCalledWith("selected");
  });

  it("keeps keyboard focus separate from selection in multiple mode", () => {
    picker.config = {
      multiple: true,
      maxItems: 2,
      value: [],
      acceptedTypes: ["vector"],
    };
    const items = ["A", "B"].map((title, index) => ({
      id: `mx_vector_${String.fromCharCode(97 + index)}_b_c_d_e`,
      title,
      type: "vector",
    }));
    picker.selectedItems = new Map();
    picker.pendingSelectedItems = new Map();
    picker.activeItem = items[0];
    picker.buildBrowser();
    picker.items = items;
    picker.refs.results.replaceChildren(
      ...items.map((item, index) => picker.buildResult(item, index)),
    );
    picker.renderBrowserSelection();
    const rows = picker.refs.results.children;

    rows[0].dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );
    expect(picker.activeItem.id).toBe(items[1].id);
    expect(picker.pendingSelectedItems.size).toBe(0);

    rows[1].dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", bubbles: true }),
    );
    expect([...picker.pendingSelectedItems.keys()]).toEqual([items[1].id]);
  });

  it("discards a pending selection when the browser closes", () => {
    picker.open();
    const options = mocks.open.mock.calls[0][0];
    picker.pendingSelectedItems = new Map([
      [
        "mx_vector_f_g_h_i_j",
        {
          id: "mx_vector_f_g_h_i_j",
          title: "Population",
          type: "vector",
        },
      ],
    ]);

    options.onClose();

    expect(picker.value).toBe("mx_vector_a_b_c_d_e");
    expect(picker.pendingSelectedItems).toBeNull();
  });

  it("supports touch selection without reacting to pointer hover", () => {
    const item = {
      id: "mx_vector_f_g_h_i_j",
      title: "Population",
      type: "vector",
    };
    picker.pendingSelectedItems = new Map(picker.selectedItems);
    picker.buildBrowser();
    picker.items = [item];
    picker.refs.results.replaceChildren(picker.buildResult(item));
    const preview = vi.spyOn(picker, "showPreview");

    picker.refs.results.firstElementChild.dispatchEvent(
      new MouseEvent("pointerover", { bubbles: true }),
    );
    expect(preview).not.toHaveBeenCalled();

    picker.refs.results.firstElementChild.click();
    expect(preview).toHaveBeenCalledWith(item);
  });

  it("keeps search visible while filters open and preserves it when clearing", () => {
    picker.pendingSelectedItems = new Map(picker.selectedItems);
    picker.buildBrowser();
    picker.refs.search.value = "roads";

    picker.refs.filtersButton.click();
    expect(picker.refs.filtersButton.getAttribute("aria-expanded")).toBe(
      "true",
    );
    picker.refs.geometry.value = "line";
    picker.refs.geometry.dispatchEvent(new Event("change"));
    expect(picker.refs.filtersButton.classList.contains("is-active")).toBe(true);

    picker.refs.clearFilters.click();

    expect(picker.refs.search.value).toBe("roads");
    expect(picker.refs.geometry.value).toBe("");
    expect(picker.refs.sort.value).toBe("relevance");
    expect(picker.refs.filters.hidden).toBe(true);
  });

  it("enforces maxItems for multiple pending selections", () => {
    picker.config = {
      multiple: true,
      maxItems: 2,
      value: [],
      acceptedTypes: ["vector"],
    };
    picker.selectedItems = new Map();
    picker.pendingSelectedItems = new Map();
    picker.buildBrowser();
    picker.items = ["a", "b", "c"].map((suffix) => ({
      id: `mx_vector_${suffix}_b_c_d_e`,
      title: suffix.toUpperCase(),
      type: "vector",
    }));
    picker.refs.results.replaceChildren(
      ...picker.items.map((item) => picker.buildResult(item)),
    );

    for (const row of picker.refs.results.children) row.click();

    expect([...picker.pendingSelectedItems.keys()]).toEqual([
      "mx_vector_a_b_c_d_e",
      "mx_vector_b_b_c_d_e",
    ]);
    expect(picker.value).toEqual([]);
  });

  it("reorders and removes committed multiple selections with one event", () => {
    const items = ["A", "B", "C"].map((title, index) => ({
      id: `mx_vector_${String.fromCharCode(97 + index)}_b_c_d_e`,
      title,
      type: "vector",
    }));
    picker.config = {
      multiple: true,
      maxItems: 3,
      reorderable: true,
      value: [],
      acceptedTypes: ["vector"],
    };
    picker.selectedItems = new Map(items.map((item) => [item.id, item]));
    picker.renderField();
    const listener = vi.fn();
    picker.addEventListener("mx-source-picker-change", listener);

    picker
      .querySelector(
        `[data-source-id="${items[1].id}"][data-action="move-up"]`,
      )
      .click();

    expect(picker.value).toEqual([items[1].id, items[0].id, items[2].id]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail.items.map((item) => item.id)).toEqual(
      picker.value,
    );
    expect(
      picker.querySelector(
        `[data-source-id="${items[1].id}"][data-action="move-down"]`,
      ),
    ).toBe(document.activeElement);

    listener.mockClear();
    picker
      .querySelector(
        `[data-source-id="${items[0].id}"][data-action="remove-item"]`,
      )
      .click();
    expect(picker.value).toEqual([items[1].id, items[2].id]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("reflects disabled state and blocks field and browser actions", () => {
    picker.open();
    picker.disabled = true;

    expect(picker.hasAttribute("disabled")).toBe(true);
    expect(picker.querySelector("[data-action='open']").disabled).toBe(true);
    expect(picker.refs.search.disabled).toBe(true);
    expect(picker.refs.confirm.disabled).toBe(true);

    picker.pendingSelectedItems = new Map([
      [
        "mx_vector_f_g_h_i_j",
        { id: "mx_vector_f_g_h_i_j", title: "Population", type: "vector" },
      ],
    ]);
    picker.confirmSelection();
    expect(picker.value).toBe("mx_vector_a_b_c_d_e");

    picker.disabled = false;
    expect(picker.refs.search.disabled).toBe(false);
    expect(picker.refs.confirm.disabled).toBe(false);
  });

  it("keeps the browser open when asynchronous confirmation is rejected", async () => {
    let resolveValidation;
    picker.config = {
      ...picker.config,
      validateSelection: vi.fn(
        () =>
          new Promise((resolve) => {
            resolveValidation = resolve;
          }),
      ),
    };
    picker.open();
    picker.pendingSelectedItems = new Map([
      [
        "mx_vector_f_g_h_i_j",
        { id: "mx_vector_f_g_h_i_j", title: "Population", type: "vector" },
      ],
    ]);

    picker.confirmSelection();
    expect(picker.refs.search.disabled).toBe(true);
    expect(picker.refs.confirm.disabled).toBe(true);
    resolveValidation({ valid: false, message: "Table is too large." });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(picker.value).toBe("mx_vector_a_b_c_d_e");
    expect(mocks.close).not.toHaveBeenCalled();
    expect(picker.refs.validationStatus.textContent).toBe(
      "Table is too large.",
    );
    expect(picker.refs.search.disabled).toBe(false);
    expect(picker.refs.confirm.disabled).toBe(false);
  });

  it("commits once after asynchronous confirmation succeeds", async () => {
    await new Promise((resolve) => queueMicrotask(resolve));
    const listener = vi.fn();
    picker.addEventListener("mx-source-picker-change", listener);
    picker.config = {
      ...picker.config,
      validateSelection: vi.fn(async () => ({ valid: true })),
    };
    picker.open();
    picker.pendingSelectedItems = new Map([
      [
        "mx_vector_f_g_h_i_j",
        { id: "mx_vector_f_g_h_i_j", title: "Population", type: "vector" },
      ],
    ]);

    picker.confirmSelection();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(picker.value).toBe("mx_vector_f_g_h_i_j");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(mocks.close).toHaveBeenCalledWith("selected");
  });

  it("ignores a late successful validation after cancellation", async () => {
    let resolveValidation;
    picker.config = {
      ...picker.config,
      validateSelection: () =>
        new Promise((resolve) => {
          resolveValidation = resolve;
        }),
    };
    picker.open();
    picker.pendingSelectedItems = new Map([
      [
        "mx_vector_f_g_h_i_j",
        { id: "mx_vector_f_g_h_i_j", title: "Population", type: "vector" },
      ],
    ]);
    picker.confirmSelection();
    const options = mocks.open.mock.calls.at(-1)[0];

    options.onClose("escape");
    resolveValidation({ valid: true });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(picker.value).toBe("mx_vector_a_b_c_d_e");
    expect(mocks.close).not.toHaveBeenCalled();
  });

  it("imperative helper resolves only confirmed windows and cleans up", async () => {
    const root = document.createElement("div");
    document.body.append(root);
    const pending = pickSources({
      root,
      multiple: false,
      acceptedTypes: ["vector"],
      requiredCapabilities: [],
    });
    await new Promise((resolve) => queueMicrotask(resolve));
    const temporary = root.querySelector("mx-source-picker");
    expect(mocks.getManager).toHaveBeenCalledWith(root);
    temporary.selectedItems = new Map([
      [
        "mx_vector_f_g_h_i_j",
        { id: "mx_vector_f_g_h_i_j", title: "Population", type: "vector" },
      ],
    ]);
    temporary.browserWindow.dispatchEvent(
      new CustomEvent("mx-window-close", {
        detail: { reason: "selected" },
      }),
    );

    await expect(pending).resolves.toEqual({
      value: "mx_vector_f_g_h_i_j",
      items: [
        {
          id: "mx_vector_f_g_h_i_j",
          title: "Population",
          type: "vector",
        },
      ],
    });
    expect(root.querySelector("mx-source-picker")).toBeNull();
    root.remove();
  });

  it("imperative helper returns ordered multiple selections", async () => {
    const root = document.createElement("div");
    document.body.append(root);
    const pending = pickSources({ root, multiple: true, maxItems: 3 });
    await new Promise((resolve) => queueMicrotask(resolve));
    const picker = root.querySelector("mx-source-picker");
    const items = ["A", "B"].map((title, index) => ({
      id: `mx_vector_${String.fromCharCode(97 + index)}_b_c_d_e`,
      title,
      type: "vector",
    }));
    picker.selectedItems = new Map(items.map((item) => [item.id, item]));
    picker.browserWindow.dispatchEvent(
      new CustomEvent("mx-window-close", {
        detail: { reason: "selected" },
      }),
    );

    await expect(pending).resolves.toEqual({
      value: items.map((item) => item.id),
      items,
    });
    root.remove();
  });

  it.each(["escape", "button", "api", "close-all"])(
    "imperative helper resolves null on %s cancellation",
    async (reason) => {
      const root = document.createElement("div");
      document.body.append(root);
      const pending = pickSources({ root });
      await new Promise((resolve) => queueMicrotask(resolve));
      root.querySelector("mx-source-picker").browserWindow.dispatchEvent(
        new CustomEvent("mx-window-close", {
          detail: { reason },
        }),
      );
      await expect(pending).resolves.toBeNull();
      expect(root.children).toHaveLength(0);
      root.remove();
    },
  );

  it("requests vector previews on demand and keeps a neutral fallback", async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    mocks.emitAsync.mockClear();
    mocks.emitAsync.mockResolvedValue({ success: true, preview: null });
    picker.buildBrowser();
    await picker.showPreview({
      id: "mx_vector_a_b_c_d_e",
      title: "Road network",
      type: "vector",
    });
    expect(
      picker.refs.previewCanvas.querySelector(".fa-clone"),
    ).not.toBeNull();
    expect(mocks.emitAsync).toHaveBeenCalledWith(
      "/client/source/preview/get",
      expect.objectContaining({ idSource: "mx_vector_a_b_c_d_e" }),
      10000,
    );
  });

  it("keeps joins neutral without previewing a potentially broader base", async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    mocks.emitAsync.mockClear();
    picker.buildBrowser();

    await picker.showPreview({
      id: "mx_join_k_l_m_n_o",
      title: "Filtered join",
      type: "join",
      geometry_types: ["polygon"],
    });

    expect(picker.refs.previewCanvas.querySelector(".fa-link")).not.toBeNull();
    expect(mocks.emitAsync).not.toHaveBeenCalled();
  });

  it("renders bounded aggregate SVG preview paths without HTML injection", () => {
    picker.buildBrowser();
    picker.renderPreview({
      kind: "vector",
      width: 64,
      height: 36,
      layers: [
        {
          kind: "path",
          geometryType: "polygon",
          d: "M0 0L10 -10Z",
        },
      ],
    });

    const path = picker.refs.previewCanvas.querySelector("svg g path");
    expect(path.getAttribute("d")).toBe("M0 0L10 -10Z");
    expect(path.closest("g").getAttribute("transform")).toBe(
      "translate(0 36)",
    );
  });

  it("renders deterministic point bins at the SQL-provided size", () => {
    picker.buildBrowser();
    picker.renderPreview({
      kind: "vector",
      width: 64,
      height: 36,
      layers: [
        {
          kind: "bins",
          geometryType: "point",
          size: 3,
          cells: [{ x: 6, y: 9, count: 4 }],
        },
      ],
    });

    const cell = picker.refs.previewCanvas.querySelector("svg rect");
    expect(cell.getAttribute("x")).toBe("6");
    expect(cell.getAttribute("y")).toBe("9");
    expect(cell.getAttribute("width")).toBe("3");
    expect(cell.getAttribute("height")).toBe("3");
  });
});
