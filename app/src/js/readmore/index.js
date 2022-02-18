import {el} from './../el/src/index.js';
import {onNextFrame} from './../animation_frame/index.js';
import './style.less';
/**
 * Add a read more button under a div that is too high.
 * @param {Element|Selector} selector Select div to update or set content
 * @param {Object} options Options
 * @param {String|Element} options.content. Optional content to update the container with.
 * @param {String|Element} options.selectorParent. Selector of parent. default = document.
 * @param {Number} options.maxHeightClosed Maximum height when closed : if more, add the readmore div and hide the remaining
 * @param {Number} options.maxHeightOpened Maximum height when opened : if more, add a scrollbar
 * @param {Boolean} options.boxedContent Add a box around content
 */
export function uiReadMore(selector, options) {
  options = options || {};

  const selectorParent = options.selectorParent;
  const elParent = selectorParent
    ? selectorParent instanceof Node
      ? selectorParent
      : document.querySelector(selectorParent)
    : document;
  const elContainers =
    selector instanceof Node ? [selector] : elParent.querySelectorAll(selector);

  onNextFrame(build);

  function build() {
    let sty, pad, rect;
    /**
     * Iterate through all readmore divs
     */
    for (let i = 0, iL = elContainers.length; i < iL; i++) {
      /*
       * Set default divs and variables
       */
      let id = Math.random().toString(32);
      let elContainer = elContainers[i];
      let elReadMore = el('div');
      let elCheckbox = el('input');
      let elContent = el('div');
      let elLabelMore = el('label');
      let elLabelCaret = el('div');

      /**
       * Set content
       */
      if (!options.content) {
        /**
         * Default. Use first child.
         */
        elContent = elContainer.querySelector('*');
        /* if null, maybe a test content / text node outside
         * a div was found: extract innerHTML, remove it from container.
         */
        if (!elContent) {
          elContent = el('div');
          elContent.innerHTML = elContainer.innerHTML;
          elContainer.innerHTML = '';
        }
      } else {
        /**
         * If content is given as a node or as text,
         * set elContent
         */
        if (options.content instanceof Node) {
          elContent = options.content;
        } else {
          elContent.innerHTML = options.content;
        }
      }

      /**
       * If no content found or is already readmore, skip it
       */
      if (
        !elContent ||
        elContent.classList.contains('readmore') ||
        elContent.childElementCount === 0
      ) {
        //console.log("skip");
      } else {
        /**
         * Set elements attributes
         */
        elReadMore.className = 'readmore';
        elCheckbox.className = 'readmore-check';
        elContent.className = elContent.className + ' readmore-content';
        if (options.boxedContent) {
          elContent.classList.add('readmore-content-boxed');
        }
        elLabelMore.className = 'readmore-label';
        elLabelCaret.className = 'readmore-label-caret fa fa-chevron-down';

        elCheckbox.id = id;
        elCheckbox.setAttribute('type', 'checkbox');
        elCheckbox.setAttribute('role', 'button');
        elLabelMore.setAttribute('for', id);

        elReadMore.appendChild(elContent);
        elContainer.appendChild(elReadMore);
        /**
         * As the div is rendered, we can extract
         * the client rect values.
         */
        rect = elReadMore.getBoundingClientRect();
        sty = window.getComputedStyle(elReadMore);
        pad = parseFloat(sty.paddingTop) + parseFloat(sty.paddingBottom);
        /**
         * When the displayed height is higher than
         * the maximum allowed, add the read more div
         * else, keep it without the toggle.
         */
        if (rect.height - pad > options.maxHeightClosed) {
          /**
           * The max height of the container (elReadMore) is set to create
           * a starting point for the animation, as the content (elContent)
           * inherit max-height.
           */

          elReadMore.style.maxHeight = options.maxHeightOpened
            ? options.maxHeightOpened + 'px'
            : rect.height + pad + 'px';
          elLabelMore.appendChild(elLabelCaret);
          elContent.style.maxHeight = options.maxHeightClosed + 'px';
          elReadMore.insertBefore(elCheckbox, elContent);
          elReadMore.insertBefore(elLabelMore, elContent);
        }

        if (
          options.maxHeightOpened &&
          isFinite(options.maxHeightOpened) &&
          rect.height > options.maxHeightOpened
        ) {
          elContent.style.overflow = 'auto';
        }
      }
    }
  }
}
