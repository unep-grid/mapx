import { isStringRange } from "../is_test";
import { isElement } from "../is_test";
import { el } from "./../el/src";
import "./style.css";
const def = {
  elContent: document.getElementsByTagName("body"),
  elInput: null,
  elContainer: null,
  selector: "div > ul > li",
  timeout: 300,
};

export class TextFilter {
  constructor(opt) {
    const sr = this;
    sr.opt = Object.assign({}, def, opt);
    if (!isElement(sr.opt.elContent)) {
      throw new Error("elContent required");
    }
    if (!isElement(sr.opt.elInput)) {
      throw new Error("elInput required");
    }
    sr.search = sr.search.bind(sr);
    sr.init();
  }
  init() {
    const sr = this;
    if (sr._init) {
      return;
    }
    sr._init = true;
    sr._elContainer = sr.opt.elContainer;
    sr._elContent = sr.opt.elContent;
    sr._elInput = sr.opt.elInput;
    sr._mode_container = isElement(sr._elContainer);
    sr._elInput.addEventListener("keyup", sr.search);
    sr.build();
    sr.update();
  }

  update() {
    const sr = this;
    sr._elsTarget = sr._elContent.querySelectorAll(sr.opt.selector);
  }

  build() {
    const sr = this;
    if (sr._mode_container) {
      sr._elHeader = el("div", { class: "txt-filter--header" }, sr._elInput);
      sr._elContainer.appendChild(sr._elHeader);
      sr._elContent.classList.add("txt-filter--content");
      sr._elContainer.appendChild(sr._elContent);
    }
  }

  search() {
    const sr = this;
    const txt = sr._elInput.value;
    clearTimeout(sr._search_to_id);
    if (!isStringRange(txt, 3, 200)) {
      return sr.reset();
    }
    let count = 0;
    sr._search_to_id = setTimeout(() => {
      const re = new RegExp(`${txt}`, "gi");
      sr.reset();
      for (const el of sr._elsTarget) {
        if (!el.dataset._cache) {
          el.dataset._cache = el.textContent || el.innerText;
        }
        const match = el.dataset._cache.match(re);
        if (!match) {
          el.style.display = "none";
          continue;
        } else {
          count++;
          el.style.display = "block";
          for (const elInner of el.querySelectorAll("*")) {
            for (const node of elInner.childNodes) {
              if (node.nodeType == Node.TEXT_NODE) {
                const okNode = node.textContent.match(re);
                if (okNode) {
                  elInner.classList.add("txt-filter--box");
                }
              }
            }
          }
        }
      }
      if (count === 0) {
        sr.reset();
      }
      if (sr._mode_container) {
        sr._elContainer.scrollIntoView();
      }
    }, sr.opt.timeout);
  }

  reset() {
    const sr = this;
    for (const elTarget of sr._elsTarget) {
      elTarget.style.display = "block";
    }
    const elsHl = sr._elContent.querySelectorAll(".txt-filter--box");
    for (const elHl of elsHl) {
      elHl.classList.remove("txt-filter--box");
    }
  }

  destroy() {
    const sr = this;
    sr._elInput.removeEventListener("keyup", sr.search);
    if (sr._mode_container) {
      sr._elContainer.innerHTML = "";
      sr._elContainer.classList.remove("txt-filter--wrapper");
    }
  }
}
