import { isEmpty } from "../is_test";
import { isStringRange, isElement } from "../is_test";
import { el } from "./../el/src";
import "./style.css";
const def = {
  elContent: document.getElementsByTagName("body"),
  elInput: null,
  elContainer: null,
  selector: "div > ul > li",
  timeout: 300,
  modeFlex: false,
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
    sr.process = sr.process.bind(sr);
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
    sr._elInput.addEventListener("keyup", sr.process);
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
    if (sr.opt.modeFlex) {
      sr._elContent.classList.add("txt-filter--content-flex");
    }
    if (sr.opt.modeGrid) {
      sr._elContent.classList.add("txt-filter--content-grid");
    }
  }

  search(txt) {
    const sr = this;
    if (isEmpty(txt)) {
      sr.reset();
    }
    sr._elInput.value = txt;
    sr.process();
  }

  process() {
    const sr = this;
    const txt = sr._elInput.value;
    clearTimeout(sr._search_to_id);
    if (!isStringRange(txt, 3, 200)) {
      return sr.reset();
    }
    let count = 0;
    let elFirst = null;
    const substrings = txt.split(" ");
    const regex = new RegExp(`${substrings.join("|")}`, "i");

    const max = sr._elsTarget.length;
    sr._search_to_id = setTimeout(() => {
      sr.reset();
      for (const elTarget of sr._elsTarget) {
        if (!elTarget.dataset.cache) {
          elTarget.dataset.cache =
            elTarget.textContent + elTarget.innerText + elTarget.id;
        }
        const match = regex.test(elTarget.dataset.cache);

        if (!match) {
          if (sr.opt.modeFlex) {
            elTarget.style.order = max;
          } else {
            elTarget.style.display = "none";
          }
          continue;
        } else {
          count++;
          if (sr.opt.modeFlex) {
            elTarget.style.order = count;
          } else {
            elTarget.style.display = "block";
          }
          for (const elInner of elTarget.querySelectorAll("*")) {
            for (const node of elInner.childNodes) {
              if (node.nodeType == Node.TEXT_NODE) {
                const okNode = regex.test(node.textContent);
                if (okNode) {
                  elInner.classList.add("txt-filter--box");
                  if (!elFirst) {
                    elFirst = elInner;
                  }
                }
              }
            }
          }
        }
      }

      if (count === 0) {
        sr.reset();
      }

      if (elFirst) {
        if (elFirst.scrollIntoViewIfNeeded) {
          elFirst.scrollIntoViewIfNeeded();
        } else {
          elFirst.scrollIntoView();
        }
      }
    }, sr.opt.timeout);
  }

  reset() {
    const sr = this;
    let count = 0;
    for (const elTarget of sr._elsTarget) {
      if (sr.opt.modeFlex) {
        elTarget.style.order = count++;
      } else {
        elTarget.style.display = "block";
      }
    }
    const elsHl = sr._elContent.querySelectorAll(".txt-filter--box");
    for (const elHl of elsHl) {
      elHl.classList.remove("txt-filter--box");
    }
  }

  destroy() {
    const sr = this;
    sr._elInput.removeEventListener("keyup", sr.process);
    if (sr._mode_container) {
      sr._elContainer.innerHTML = "";
      sr._elContainer.classList.remove("txt-filter--wrapper");
    }
  }
}
