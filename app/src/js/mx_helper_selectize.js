import { isArray } from "./is_test";
import { isFunction } from "./is_test";
import { isElement, isEmpty } from "./is_test";
import { moduleLoad } from "./modules_loader_async";
import { selectize } from "./mx";

export function updateSelectizeItems(_) {
  console.warn("updateSelectizeItems is deprecated");
}

export async function initSelectizeAll(opt) {
  opt = opt || {};
  await moduleLoad("selectize");
  const selector = isElement(opt.selector)
    ? opt.selector
    : document.querySelector(opt.selector);
  opt.id = opt.id || "global";
  if (!isEmpty(selectize[opt.id])) {
    removeSelectizeGroupById(opt.id);
  }
  const out = [];
  selectize[opt.id] = out;
  const selects = $(selector).find("select");
  selects.each(function (_, s) {
    const localOptions = {
      renderFun: null,
    };
    const options = {
      dropdownParent: "body",
    };
    if (s.id) {
      const script = selector.querySelector("script[data-for=" + s.id + "]");
      const data = script ? script.innerHTML : null;
      if (data) {
        Object.assign(localOptions, {}, JSON.parse(data));
        if (localOptions.renderFun) {
          localOptions.render = {
            option: mx.helpers[localOptions.renderFun],
          };
        }
      }
    }
    options.inputClass = "form-control selectize-input";
    Object.assign(options, opt.options, localOptions);
    const $select = $(s).selectize(options);
    const selectizeInstance = $select[0].selectize;
    out.push(selectizeInstance);
  });
  return out;
}

export function removeSelectizeGroupById(id) {
  id = id || "global";
  const group = selectize[id];
  if (!isArray(group)) {
    return;
  }
  for (const s of group) {
    if (isFunction(s.destroy)) {
      s.destroy();
    }
    if (isFunction(s.remove)) {
      s.remove();
    }
  }
  delete selectize[id];
}

export function closeSelectizeGroupById(id) {
  id = id || "global";
  const group = selectize[id];
  if (!isArray(group)) {
    return;
  }
  for (const s of group) {
    if (isFunction(s.close)) {
      s.close();
    }
  }
}
