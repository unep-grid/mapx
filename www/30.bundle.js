webpackJsonp([30],{

/***/ 169:
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(process) {var __WEBPACK_AMD_DEFINE_RESULT__;/*global self, document, DOMException */

/*! @source http://purl.eligrey.com/github/classList.js/blob/master/classList.js */

// Full polyfill for browsers with no classList support
if (!("classList" in document.createElement("_"))) {
  (function (view) {

  "use strict";

  if (!('Element' in view)) return;

  var
      classListProp = "classList"
    , protoProp = "prototype"
    , elemCtrProto = view.Element[protoProp]
    , objCtr = Object
    , strTrim = String[protoProp].trim || function () {
      return this.replace(/^\s+|\s+$/g, "");
    }
    , arrIndexOf = Array[protoProp].indexOf || function (item) {
      var
          i = 0
        , len = this.length
      ;
      for (; i < len; i++) {
        if (i in this && this[i] === item) {
          return i;
        }
      }
      return -1;
    }
    // Vendors: please allow content code to instantiate DOMExceptions
    , DOMEx = function (type, message) {
      this.name = type;
      this.code = DOMException[type];
      this.message = message;
    }
    , checkTokenAndGetIndex = function (classList, token) {
      if (token === "") {
        throw new DOMEx(
            "SYNTAX_ERR"
          , "An invalid or illegal string was specified"
        );
      }
      if (/\s/.test(token)) {
        throw new DOMEx(
            "INVALID_CHARACTER_ERR"
          , "String contains an invalid character"
        );
      }
      return arrIndexOf.call(classList, token);
    }
    , ClassList = function (elem) {
      var
          trimmedClasses = strTrim.call(elem.getAttribute("class") || "")
        , classes = trimmedClasses ? trimmedClasses.split(/\s+/) : []
        , i = 0
        , len = classes.length
      ;
      for (; i < len; i++) {
        this.push(classes[i]);
      }
      this._updateClassName = function () {
        elem.setAttribute("class", this.toString());
      };
    }
    , classListProto = ClassList[protoProp] = []
    , classListGetter = function () {
      return new ClassList(this);
    }
  ;
  // Most DOMException implementations don't allow calling DOMException's toString()
  // on non-DOMExceptions. Error's toString() is sufficient here.
  DOMEx[protoProp] = Error[protoProp];
  classListProto.item = function (i) {
    return this[i] || null;
  };
  classListProto.contains = function (token) {
    token += "";
    return checkTokenAndGetIndex(this, token) !== -1;
  };
  classListProto.add = function () {
    var
        tokens = arguments
      , i = 0
      , l = tokens.length
      , token
      , updated = false
    ;
    do {
      token = tokens[i] + "";
      if (checkTokenAndGetIndex(this, token) === -1) {
        this.push(token);
        updated = true;
      }
    }
    while (++i < l);

    if (updated) {
      this._updateClassName();
    }
  };
  classListProto.remove = function () {
    var
        tokens = arguments
      , i = 0
      , l = tokens.length
      , token
      , updated = false
      , index
    ;
    do {
      token = tokens[i] + "";
      index = checkTokenAndGetIndex(this, token);
      while (index !== -1) {
        this.splice(index, 1);
        updated = true;
        index = checkTokenAndGetIndex(this, token);
      }
    }
    while (++i < l);

    if (updated) {
      this._updateClassName();
    }
  };
  classListProto.toggle = function (token, force) {
    token += "";

    var
        result = this.contains(token)
      , method = result ?
        force !== true && "remove"
      :
        force !== false && "add"
    ;

    if (method) {
      this[method](token);
    }

    if (force === true || force === false) {
      return force;
    } else {
      return !result;
    }
  };
  classListProto.toString = function () {
    return this.join(" ");
  };

  if (objCtr.defineProperty) {
    var classListPropDesc = {
        get: classListGetter
      , enumerable: true
      , configurable: true
    };
    try {
      objCtr.defineProperty(elemCtrProto, classListProp, classListPropDesc);
    } catch (ex) { // IE 8 doesn't support enumerable:true
      if (ex.number === -0x7FF5EC54) {
        classListPropDesc.enumerable = false;
        objCtr.defineProperty(elemCtrProto, classListProp, classListPropDesc);
      }
    }
  } else if (objCtr[protoProp].__defineGetter__) {
    elemCtrProto.__defineGetter__(classListProp, classListGetter);
  }

  }(self));
}

/* Blob.js
 * A Blob implementation.
 * 2014-07-24
 *
 * By Eli Grey, http://eligrey.com
 * By Devin Samarin, https://github.com/dsamarin
 * License: X11/MIT
 *   See https://github.com/eligrey/Blob.js/blob/master/LICENSE.md
 */

/*global self, unescape */
/*jslint bitwise: true, regexp: true, confusion: true, es5: true, vars: true, white: true,
  plusplus: true */

/*! @source http://purl.eligrey.com/github/Blob.js/blob/master/Blob.js */

(function (view) {
  "use strict";

  view.URL = view.URL || view.webkitURL;

  if (view.Blob && view.URL) {
    try {
      new Blob;
      return;
    } catch (e) {}
  }

  // Internally we use a BlobBuilder implementation to base Blob off of
  // in order to support older browsers that only have BlobBuilder
  var BlobBuilder = view.BlobBuilder || view.WebKitBlobBuilder || view.MozBlobBuilder || (function(view) {
    var
        get_class = function(object) {
        return Object.prototype.toString.call(object).match(/^\[object\s(.*)\]$/)[1];
      }
      , FakeBlobBuilder = function BlobBuilder() {
        this.data = [];
      }
      , FakeBlob = function Blob(data, type, encoding) {
        this.data = data;
        this.size = data.length;
        this.type = type;
        this.encoding = encoding;
      }
      , FBB_proto = FakeBlobBuilder.prototype
      , FB_proto = FakeBlob.prototype
      , FileReaderSync = view.FileReaderSync
      , FileException = function(type) {
        this.code = this[this.name = type];
      }
      , file_ex_codes = (
          "NOT_FOUND_ERR SECURITY_ERR ABORT_ERR NOT_READABLE_ERR ENCODING_ERR "
        + "NO_MODIFICATION_ALLOWED_ERR INVALID_STATE_ERR SYNTAX_ERR"
      ).split(" ")
      , file_ex_code = file_ex_codes.length
      , real_URL = view.URL || view.webkitURL || view
      , real_create_object_URL = real_URL.createObjectURL
      , real_revoke_object_URL = real_URL.revokeObjectURL
      , URL = real_URL
      , btoa = view.btoa
      , atob = view.atob

      , ArrayBuffer = view.ArrayBuffer
      , Uint8Array = view.Uint8Array

      , origin = /^[\w-]+:\/*\[?[\w\.:-]+\]?(?::[0-9]+)?/
    ;
    FakeBlob.fake = FB_proto.fake = true;
    while (file_ex_code--) {
      FileException.prototype[file_ex_codes[file_ex_code]] = file_ex_code + 1;
    }
    // Polyfill URL
    if (!real_URL.createObjectURL) {
      URL = view.URL = function(uri) {
        var
            uri_info = document.createElementNS("http://www.w3.org/1999/xhtml", "a")
          , uri_origin
        ;
        uri_info.href = uri;
        if (!("origin" in uri_info)) {
          if (uri_info.protocol.toLowerCase() === "data:") {
            uri_info.origin = null;
          } else {
            uri_origin = uri.match(origin);
            uri_info.origin = uri_origin && uri_origin[1];
          }
        }
        return uri_info;
      };
    }
    URL.createObjectURL = function(blob) {
      var
          type = blob.type
        , data_URI_header
      ;
      if (type === null) {
        type = "application/octet-stream";
      }
      if (blob instanceof FakeBlob) {
        data_URI_header = "data:" + type;
        if (blob.encoding === "base64") {
          return data_URI_header + ";base64," + blob.data;
        } else if (blob.encoding === "URI") {
          return data_URI_header + "," + decodeURIComponent(blob.data);
        } if (btoa) {
          return data_URI_header + ";base64," + btoa(blob.data);
        } else {
          return data_URI_header + "," + encodeURIComponent(blob.data);
        }
      } else if (real_create_object_URL) {
        return real_create_object_URL.call(real_URL, blob);
      }
    };
    URL.revokeObjectURL = function(object_URL) {
      if (object_URL.substring(0, 5) !== "data:" && real_revoke_object_URL) {
        real_revoke_object_URL.call(real_URL, object_URL);
      }
    };
    FBB_proto.append = function(data/*, endings*/) {
      var bb = this.data;
      // decode data to a binary string
      if (Uint8Array && (data instanceof ArrayBuffer || data instanceof Uint8Array)) {
        var
            str = ""
          , buf = new Uint8Array(data)
          , i = 0
          , buf_len = buf.length
        ;
        for (; i < buf_len; i++) {
          str += String.fromCharCode(buf[i]);
        }
        bb.push(str);
      } else if (get_class(data) === "Blob" || get_class(data) === "File") {
        if (FileReaderSync) {
          var fr = new FileReaderSync;
          bb.push(fr.readAsBinaryString(data));
        } else {
          // async FileReader won't work as BlobBuilder is sync
          throw new FileException("NOT_READABLE_ERR");
        }
      } else if (data instanceof FakeBlob) {
        if (data.encoding === "base64" && atob) {
          bb.push(atob(data.data));
        } else if (data.encoding === "URI") {
          bb.push(decodeURIComponent(data.data));
        } else if (data.encoding === "raw") {
          bb.push(data.data);
        }
      } else {
        if (typeof data !== "string") {
          data += ""; // convert unsupported types to strings
        }
        // decode UTF-16 to binary string
        bb.push(unescape(encodeURIComponent(data)));
      }
    };
    FBB_proto.getBlob = function(type) {
      if (!arguments.length) {
        type = null;
      }
      return new FakeBlob(this.data.join(""), type, "raw");
    };
    FBB_proto.toString = function() {
      return "[object BlobBuilder]";
    };
    FB_proto.slice = function(start, end, type) {
      var args = arguments.length;
      if (args < 3) {
        type = null;
      }
      return new FakeBlob(
          this.data.slice(start, args > 1 ? end : this.data.length)
        , type
        , this.encoding
      );
    };
    FB_proto.toString = function() {
      return "[object Blob]";
    };
    FB_proto.close = function() {
      this.size = 0;
      delete this.data;
    };
    return FakeBlobBuilder;
  }(view));

  view.Blob = function(blobParts, options) {
    var type = options ? (options.type || "") : "";
    var builder = new BlobBuilder();
    if (blobParts) {
      for (var i = 0, len = blobParts.length; i < len; i++) {
        if (Uint8Array && blobParts[i] instanceof Uint8Array) {
          builder.append(blobParts[i].buffer);
        }
        else {
          builder.append(blobParts[i]);
        }
      }
    }
    var blob = builder.getBlob(type);
    if (!blob.slice && blob.webkitSlice) {
      blob.slice = blob.webkitSlice;
    }
    return blob;
  };

  var getPrototypeOf = Object.getPrototypeOf || function(object) {
    return object.__proto__;
  };
  view.Blob.prototype = getPrototypeOf(new view.Blob());
}(typeof self !== "undefined" && self || typeof window !== "undefined" && window || this.content || this));

(function (root, factory) {
    'use strict';
    var isElectron = typeof module === 'object' && typeof process !== 'undefined' && process && process.versions && process.versions.electron;
    if (!isElectron && typeof module === 'object') {
        module.exports = factory;
    } else if (true) {
        !(__WEBPACK_AMD_DEFINE_RESULT__ = function () {
            return factory;
        }.call(exports, __webpack_require__, exports, module),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
    } else {
        root.MediumEditor = factory;
    }
}(this, function () {

    'use strict';

function MediumEditor(elements, options) {
    'use strict';
    return this.init(elements, options);
}

MediumEditor.extensions = {};
/*jshint unused: true */
(function (window) {
    'use strict';

    function copyInto(overwrite, dest) {
        var prop,
            sources = Array.prototype.slice.call(arguments, 2);
        dest = dest || {};
        for (var i = 0; i < sources.length; i++) {
            var source = sources[i];
            if (source) {
                for (prop in source) {
                    if (source.hasOwnProperty(prop) &&
                        typeof source[prop] !== 'undefined' &&
                        (overwrite || dest.hasOwnProperty(prop) === false)) {
                        dest[prop] = source[prop];
                    }
                }
            }
        }
        return dest;
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/Node/contains
    // Some browsers (including phantom) don't return true for Node.contains(child)
    // if child is a text node.  Detect these cases here and use a fallback
    // for calls to Util.isDescendant()
    var nodeContainsWorksWithTextNodes = false;
    try {
        var testParent = document.createElement('div'),
            testText = document.createTextNode(' ');
        testParent.appendChild(testText);
        nodeContainsWorksWithTextNodes = testParent.contains(testText);
    } catch (exc) {}

    var Util = {

        // http://stackoverflow.com/questions/17907445/how-to-detect-ie11#comment30165888_17907562
        // by rg89
        isIE: ((navigator.appName === 'Microsoft Internet Explorer') || ((navigator.appName === 'Netscape') && (new RegExp('Trident/.*rv:([0-9]{1,}[.0-9]{0,})').exec(navigator.userAgent) !== null))),

        isEdge: (/Edge\/\d+/).exec(navigator.userAgent) !== null,

        // if firefox
        isFF: (navigator.userAgent.toLowerCase().indexOf('firefox') > -1),

        // http://stackoverflow.com/a/11752084/569101
        isMac: (window.navigator.platform.toUpperCase().indexOf('MAC') >= 0),

        // https://github.com/jashkenas/underscore
        // Lonely letter MUST USE the uppercase code
        keyCode: {
            BACKSPACE: 8,
            TAB: 9,
            ENTER: 13,
            ESCAPE: 27,
            SPACE: 32,
            DELETE: 46,
            K: 75, // K keycode, and not k
            M: 77,
            V: 86
        },

        /**
         * Returns true if it's metaKey on Mac, or ctrlKey on non-Mac.
         * See #591
         */
        isMetaCtrlKey: function (event) {
            if ((Util.isMac && event.metaKey) || (!Util.isMac && event.ctrlKey)) {
                return true;
            }

            return false;
        },

        /**
         * Returns true if the key associated to the event is inside keys array
         *
         * @see : https://github.com/jquery/jquery/blob/0705be475092aede1eddae01319ec931fb9c65fc/src/event.js#L473-L484
         * @see : http://stackoverflow.com/q/4471582/569101
         */
        isKey: function (event, keys) {
            var keyCode = Util.getKeyCode(event);

            // it's not an array let's just compare strings!
            if (false === Array.isArray(keys)) {
                return keyCode === keys;
            }

            if (-1 === keys.indexOf(keyCode)) {
                return false;
            }

            return true;
        },

        getKeyCode: function (event) {
            var keyCode = event.which;

            // getting the key code from event
            if (null === keyCode) {
                keyCode = event.charCode !== null ? event.charCode : event.keyCode;
            }

            return keyCode;
        },

        blockContainerElementNames: [
            // elements our editor generates
            'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'ul', 'li', 'ol',
            // all other known block elements
            'address', 'article', 'aside', 'audio', 'canvas', 'dd', 'dl', 'dt', 'fieldset',
            'figcaption', 'figure', 'footer', 'form', 'header', 'hgroup', 'main', 'nav',
            'noscript', 'output', 'section', 'video',
            'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td'
        ],

        emptyElementNames: ['br', 'col', 'colgroup', 'hr', 'img', 'input', 'source', 'wbr'],

        extend: function extend(/* dest, source1, source2, ...*/) {
            var args = [true].concat(Array.prototype.slice.call(arguments));
            return copyInto.apply(this, args);
        },

        defaults: function defaults(/*dest, source1, source2, ...*/) {
            var args = [false].concat(Array.prototype.slice.call(arguments));
            return copyInto.apply(this, args);
        },

        /*
         * Create a link around the provided text nodes which must be adjacent to each other and all be
         * descendants of the same closest block container. If the preconditions are not met, unexpected
         * behavior will result.
         */
        createLink: function (document, textNodes, href, target) {
            var anchor = document.createElement('a');
            Util.moveTextRangeIntoElement(textNodes[0], textNodes[textNodes.length - 1], anchor);
            anchor.setAttribute('href', href);
            if (target) {
                if (target === '_blank') {
                    anchor.setAttribute('rel', 'noopener noreferrer');
                }
                anchor.setAttribute('target', target);
            }
            return anchor;
        },

        /*
         * Given the provided match in the format {start: 1, end: 2} where start and end are indices into the
         * textContent of the provided element argument, modify the DOM inside element to ensure that the text
         * identified by the provided match can be returned as text nodes that contain exactly that text, without
         * any additional text at the beginning or end of the returned array of adjacent text nodes.
         *
         * The only DOM manipulation performed by this function is splitting the text nodes, non-text nodes are
         * not affected in any way.
         */
        findOrCreateMatchingTextNodes: function (document, element, match) {
            var treeWalker = document.createTreeWalker(element, NodeFilter.SHOW_ALL, null, false),
                matchedNodes = [],
                currentTextIndex = 0,
                startReached = false,
                currentNode = null,
                newNode = null;

            while ((currentNode = treeWalker.nextNode()) !== null) {
                if (currentNode.nodeType > 3) {
                    continue;
                } else if (currentNode.nodeType === 3) {
                    if (!startReached && match.start < (currentTextIndex + currentNode.nodeValue.length)) {
                        startReached = true;
                        newNode = Util.splitStartNodeIfNeeded(currentNode, match.start, currentTextIndex);
                    }
                    if (startReached) {
                        Util.splitEndNodeIfNeeded(currentNode, newNode, match.end, currentTextIndex);
                    }
                    if (startReached && currentTextIndex === match.end) {
                        break; // Found the node(s) corresponding to the link. Break out and move on to the next.
                    } else if (startReached && currentTextIndex > (match.end + 1)) {
                        throw new Error('PerformLinking overshot the target!'); // should never happen...
                    }

                    if (startReached) {
                        matchedNodes.push(newNode || currentNode);
                    }

                    currentTextIndex += currentNode.nodeValue.length;
                    if (newNode !== null) {
                        currentTextIndex += newNode.nodeValue.length;
                        // Skip the newNode as we'll already have pushed it to the matches
                        treeWalker.nextNode();
                    }
                    newNode = null;
                } else if (currentNode.tagName.toLowerCase() === 'img') {
                    if (!startReached && (match.start <= currentTextIndex)) {
                        startReached = true;
                    }
                    if (startReached) {
                        matchedNodes.push(currentNode);
                    }
                }
            }
            return matchedNodes;
        },

        /*
         * Given the provided text node and text coordinates, split the text node if needed to make it align
         * precisely with the coordinates.
         *
         * This function is intended to be called from Util.findOrCreateMatchingTextNodes.
         */
        splitStartNodeIfNeeded: function (currentNode, matchStartIndex, currentTextIndex) {
            if (matchStartIndex !== currentTextIndex) {
                return currentNode.splitText(matchStartIndex - currentTextIndex);
            }
            return null;
        },

        /*
         * Given the provided text node and text coordinates, split the text node if needed to make it align
         * precisely with the coordinates. The newNode argument should from the result of Util.splitStartNodeIfNeeded,
         * if that function has been called on the same currentNode.
         *
         * This function is intended to be called from Util.findOrCreateMatchingTextNodes.
         */
        splitEndNodeIfNeeded: function (currentNode, newNode, matchEndIndex, currentTextIndex) {
            var textIndexOfEndOfFarthestNode,
                endSplitPoint;
            textIndexOfEndOfFarthestNode = currentTextIndex + currentNode.nodeValue.length +
                    (newNode ? newNode.nodeValue.length : 0) - 1;
            endSplitPoint = matchEndIndex - currentTextIndex -
                    (newNode ? currentNode.nodeValue.length : 0);
            if (textIndexOfEndOfFarthestNode >= matchEndIndex &&
                    currentTextIndex !== textIndexOfEndOfFarthestNode &&
                    endSplitPoint !== 0) {
                (newNode || currentNode).splitText(endSplitPoint);
            }
        },

        /*
        * Take an element, and break up all of its text content into unique pieces such that:
         * 1) All text content of the elements are in separate blocks. No piece of text content should span
         *    across multiple blocks. This means no element return by this function should have
         *    any blocks as children.
         * 2) The union of the textcontent of all of the elements returned here covers all
         *    of the text within the element.
         *
         *
         * EXAMPLE:
         * In the event that we have something like:
         *
         * <blockquote>
         *   <p>Some Text</p>
         *   <ol>
         *     <li>List Item 1</li>
         *     <li>List Item 2</li>
         *   </ol>
         * </blockquote>
         *
         * This function would return these elements as an array:
         *   [ <p>Some Text</p>, <li>List Item 1</li>, <li>List Item 2</li> ]
         *
         * Since the <blockquote> and <ol> elements contain blocks within them they are not returned.
         * Since the <p> and <li>'s don't contain block elements and cover all the text content of the
         * <blockquote> container, they are the elements returned.
         */
        splitByBlockElements: function (element) {
            if (element.nodeType !== 3 && element.nodeType !== 1) {
                return [];
            }

            var toRet = [],
                blockElementQuery = MediumEditor.util.blockContainerElementNames.join(',');

            if (element.nodeType === 3 || element.querySelectorAll(blockElementQuery).length === 0) {
                return [element];
            }

            for (var i = 0; i < element.childNodes.length; i++) {
                var child = element.childNodes[i];
                if (child.nodeType === 3) {
                    toRet.push(child);
                } else if (child.nodeType === 1) {
                    var blockElements = child.querySelectorAll(blockElementQuery);
                    if (blockElements.length === 0) {
                        toRet.push(child);
                    } else {
                        toRet = toRet.concat(MediumEditor.util.splitByBlockElements(child));
                    }
                }
            }

            return toRet;
        },

        // Find the next node in the DOM tree that represents any text that is being
        // displayed directly next to the targetNode (passed as an argument)
        // Text that appears directly next to the current node can be:
        //  - A sibling text node
        //  - A descendant of a sibling element
        //  - A sibling text node of an ancestor
        //  - A descendant of a sibling element of an ancestor
        findAdjacentTextNodeWithContent: function findAdjacentTextNodeWithContent(rootNode, targetNode, ownerDocument) {
            var pastTarget = false,
                nextNode,
                nodeIterator = ownerDocument.createNodeIterator(rootNode, NodeFilter.SHOW_TEXT, null, false);

            // Use a native NodeIterator to iterate over all the text nodes that are descendants
            // of the rootNode.  Once past the targetNode, choose the first non-empty text node
            nextNode = nodeIterator.nextNode();
            while (nextNode) {
                if (nextNode === targetNode) {
                    pastTarget = true;
                } else if (pastTarget) {
                    if (nextNode.nodeType === 3 && nextNode.nodeValue && nextNode.nodeValue.trim().length > 0) {
                        break;
                    }
                }
                nextNode = nodeIterator.nextNode();
            }

            return nextNode;
        },

        // Find an element's previous sibling within a medium-editor element
        // If one doesn't exist, find the closest ancestor's previous sibling
        findPreviousSibling: function (node) {
            if (!node || Util.isMediumEditorElement(node)) {
                return false;
            }

            var previousSibling = node.previousSibling;
            while (!previousSibling && !Util.isMediumEditorElement(node.parentNode)) {
                node = node.parentNode;
                previousSibling = node.previousSibling;
            }

            return previousSibling;
        },

        isDescendant: function isDescendant(parent, child, checkEquality) {
            if (!parent || !child) {
                return false;
            }
            if (parent === child) {
                return !!checkEquality;
            }
            // If parent is not an element, it can't have any descendants
            if (parent.nodeType !== 1) {
                return false;
            }
            if (nodeContainsWorksWithTextNodes || child.nodeType !== 3) {
                return parent.contains(child);
            }
            var node = child.parentNode;
            while (node !== null) {
                if (node === parent) {
                    return true;
                }
                node = node.parentNode;
            }
            return false;
        },

        // https://github.com/jashkenas/underscore
        isElement: function isElement(obj) {
            return !!(obj && obj.nodeType === 1);
        },

        // https://github.com/jashkenas/underscore
        throttle: function (func, wait) {
            var THROTTLE_INTERVAL = 50,
                context,
                args,
                result,
                timeout = null,
                previous = 0,
                later = function () {
                    previous = Date.now();
                    timeout = null;
                    result = func.apply(context, args);
                    if (!timeout) {
                        context = args = null;
                    }
                };

            if (!wait && wait !== 0) {
                wait = THROTTLE_INTERVAL;
            }

            return function () {
                var now = Date.now(),
                    remaining = wait - (now - previous);

                context = this;
                args = arguments;
                if (remaining <= 0 || remaining > wait) {
                    if (timeout) {
                        clearTimeout(timeout);
                        timeout = null;
                    }
                    previous = now;
                    result = func.apply(context, args);
                    if (!timeout) {
                        context = args = null;
                    }
                } else if (!timeout) {
                    timeout = setTimeout(later, remaining);
                }
                return result;
            };
        },

        traverseUp: function (current, testElementFunction) {
            if (!current) {
                return false;
            }

            do {
                if (current.nodeType === 1) {
                    if (testElementFunction(current)) {
                        return current;
                    }
                    // do not traverse upwards past the nearest containing editor
                    if (Util.isMediumEditorElement(current)) {
                        return false;
                    }
                }

                current = current.parentNode;
            } while (current);

            return false;
        },

        htmlEntities: function (str) {
            // converts special characters (like <) into their escaped/encoded values (like &lt;).
            // This allows you to show to display the string without the browser reading it as HTML.
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        },

        // http://stackoverflow.com/questions/6690752/insert-html-at-caret-in-a-contenteditable-div
        insertHTMLCommand: function (doc, html) {
            var selection, range, el, fragment, node, lastNode, toReplace,
                res = false,
                ecArgs = ['insertHTML', false, html];

            /* Edge's implementation of insertHTML is just buggy right now:
             * - Doesn't allow leading white space at the beginning of an element
             * - Found a case when a <font size="2"> tag was inserted when calling alignCenter inside a blockquote
             *
             * There are likely other bugs, these are just the ones we found so far.
             * For now, let's just use the same fallback we did for IE
             */
            if (!MediumEditor.util.isEdge && doc.queryCommandSupported('insertHTML')) {
                try {
                    return doc.execCommand.apply(doc, ecArgs);
                } catch (ignore) {}
            }

            selection = doc.getSelection();
            if (selection.rangeCount) {
                range = selection.getRangeAt(0);
                toReplace = range.commonAncestorContainer;

                // https://github.com/yabwe/medium-editor/issues/748
                // If the selection is an empty editor element, create a temporary text node inside of the editor
                // and select it so that we don't delete the editor element
                if (Util.isMediumEditorElement(toReplace) && !toReplace.firstChild) {
                    range.selectNode(toReplace.appendChild(doc.createTextNode('')));
                } else if ((toReplace.nodeType === 3 && range.startOffset === 0 && range.endOffset === toReplace.nodeValue.length) ||
                        (toReplace.nodeType !== 3 && toReplace.innerHTML === range.toString())) {
                    // Ensure range covers maximum amount of nodes as possible
                    // By moving up the DOM and selecting ancestors whose only child is the range
                    while (!Util.isMediumEditorElement(toReplace) &&
                            toReplace.parentNode &&
                            toReplace.parentNode.childNodes.length === 1 &&
                            !Util.isMediumEditorElement(toReplace.parentNode)) {
                        toReplace = toReplace.parentNode;
                    }
                    range.selectNode(toReplace);
                }
                range.deleteContents();

                el = doc.createElement('div');
                el.innerHTML = html;
                fragment = doc.createDocumentFragment();
                while (el.firstChild) {
                    node = el.firstChild;
                    lastNode = fragment.appendChild(node);
                }
                range.insertNode(fragment);

                // Preserve the selection:
                if (lastNode) {
                    range = range.cloneRange();
                    range.setStartAfter(lastNode);
                    range.collapse(true);
                    MediumEditor.selection.selectRange(doc, range);
                }
                res = true;
            }

            // https://github.com/yabwe/medium-editor/issues/992
            // If we're monitoring calls to execCommand, notify listeners as if a real call had happened
            if (doc.execCommand.callListeners) {
                doc.execCommand.callListeners(ecArgs, res);
            }
            return res;
        },

        execFormatBlock: function (doc, tagName) {
            // Get the top level block element that contains the selection
            var blockContainer = Util.getTopBlockContainer(MediumEditor.selection.getSelectionStart(doc)),
                childNodes;

            // Special handling for blockquote
            if (tagName === 'blockquote') {
                if (blockContainer) {
                    childNodes = Array.prototype.slice.call(blockContainer.childNodes);
                    // Check if the blockquote has a block element as a child (nested blocks)
                    if (childNodes.some(function (childNode) {
                        return Util.isBlockContainer(childNode);
                    })) {
                        // FF handles blockquote differently on formatBlock
                        // allowing nesting, we need to use outdent
                        // https://developer.mozilla.org/en-US/docs/Rich-Text_Editing_in_Mozilla
                        return doc.execCommand('outdent', false, null);
                    }
                }

                // When IE blockquote needs to be called as indent
                // http://stackoverflow.com/questions/1816223/rich-text-editor-with-blockquote-function/1821777#1821777
                if (Util.isIE) {
                    return doc.execCommand('indent', false, tagName);
                }
            }

            // If the blockContainer is already the element type being passed in
            // treat it as 'undo' formatting and just convert it to a <p>
            if (blockContainer && tagName === blockContainer.nodeName.toLowerCase()) {
                tagName = 'p';
            }

            // When IE we need to add <> to heading elements
            // http://stackoverflow.com/questions/10741831/execcommand-formatblock-headings-in-ie
            if (Util.isIE) {
                tagName = '<' + tagName + '>';
            }

            // When FF, IE and Edge, we have to handle blockquote node seperately as 'formatblock' does not work.
            // https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand#Commands
            if (blockContainer && blockContainer.nodeName.toLowerCase() === 'blockquote') {
                // For IE, just use outdent
                if (Util.isIE && tagName === '<p>') {
                    return doc.execCommand('outdent', false, tagName);
                }

                // For Firefox and Edge, make sure there's a nested block element before calling outdent
                if ((Util.isFF || Util.isEdge) && tagName === 'p') {
                    childNodes = Array.prototype.slice.call(blockContainer.childNodes);
                    // If there are some non-block elements we need to wrap everything in a <p> before we outdent
                    if (childNodes.some(function (childNode) {
                        return !Util.isBlockContainer(childNode);
                    })) {
                        doc.execCommand('formatBlock', false, tagName);
                    }
                    return doc.execCommand('outdent', false, tagName);
                }
            }

            return doc.execCommand('formatBlock', false, tagName);
        },

        /**
         * Set target to blank on the given el element
         *
         * TODO: not sure if this should be here
         *
         * When creating a link (using core -> createLink) the selection returned by Firefox will be the parent of the created link
         * instead of the created link itself (as it is for Chrome for example), so we retrieve all "a" children to grab the good one by
         * using `anchorUrl` to ensure that we are adding target="_blank" on the good one.
         * This isn't a bulletproof solution anyway ..
         */
        setTargetBlank: function (el, anchorUrl) {
            var i, url = anchorUrl || false;
            if (el.nodeName.toLowerCase() === 'a') {
                el.target = '_blank';
                el.rel = 'noopener noreferrer';
            } else {
                el = el.getElementsByTagName('a');

                for (i = 0; i < el.length; i += 1) {
                    if (false === url || url === el[i].attributes.href.value) {
                        el[i].target = '_blank';
                        el[i].rel = 'noopener noreferrer';
                    }
                }
            }
        },

        /*
         * this function is called to explicitly remove the target='_blank' as FF holds on to _blank value even
         * after unchecking the checkbox on anchor form
         */
        removeTargetBlank: function (el, anchorUrl) {
            var i;
            if (el.nodeName.toLowerCase() === 'a') {
                el.removeAttribute('target');
                el.removeAttribute('rel');
            } else {
                el = el.getElementsByTagName('a');

                for (i = 0; i < el.length; i += 1) {
                    if (anchorUrl === el[i].attributes.href.value) {
                        el[i].removeAttribute('target');
                        el[i].removeAttribute('rel');
                    }
                }
            }
        },

        /*
         * this function adds one or several classes on an a element.
         * if el parameter is not an a, it will look for a children of el.
         * if no a children are found, it will look for the a parent.
         */
        addClassToAnchors: function (el, buttonClass) {
            var classes = buttonClass.split(' '),
                i,
                j;
            if (el.nodeName.toLowerCase() === 'a') {
                for (j = 0; j < classes.length; j += 1) {
                    el.classList.add(classes[j]);
                }
            } else {
                var aChildren = el.getElementsByTagName('a');
                if (aChildren.length === 0) {
                    var parentAnchor = Util.getClosestTag(el, 'a');
                    el = parentAnchor ? [parentAnchor] : [];
                } else {
                    el = aChildren;
                }
                for (i = 0; i < el.length; i += 1) {
                    for (j = 0; j < classes.length; j += 1) {
                        el[i].classList.add(classes[j]);
                    }
                }
            }
        },

        isListItem: function (node) {
            if (!node) {
                return false;
            }
            if (node.nodeName.toLowerCase() === 'li') {
                return true;
            }

            var parentNode = node.parentNode,
                tagName = parentNode.nodeName.toLowerCase();
            while (tagName === 'li' || (!Util.isBlockContainer(parentNode) && tagName !== 'div')) {
                if (tagName === 'li') {
                    return true;
                }
                parentNode = parentNode.parentNode;
                if (parentNode) {
                    tagName = parentNode.nodeName.toLowerCase();
                } else {
                    return false;
                }
            }
            return false;
        },

        cleanListDOM: function (ownerDocument, element) {
            if (element.nodeName.toLowerCase() !== 'li') {
                return;
            }

            var list = element.parentElement;

            if (list.parentElement.nodeName.toLowerCase() === 'p') { // yes we need to clean up
                Util.unwrap(list.parentElement, ownerDocument);

                // move cursor at the end of the text inside the list
                // for some unknown reason, the cursor is moved to end of the "visual" line
                MediumEditor.selection.moveCursor(ownerDocument, element.firstChild, element.firstChild.textContent.length);
            }
        },

        /* splitDOMTree
         *
         * Given a root element some descendant element, split the root element
         * into its own element containing the descendant element and all elements
         * on the left or right side of the descendant ('right' is default)
         *
         * example:
         *
         *         <div>
         *      /    |   \
         *  <span> <span> <span>
         *   / \    / \    / \
         *  1   2  3   4  5   6
         *
         *  If I wanted to split this tree given the <div> as the root and "4" as the leaf
         *  the result would be (the prime ' marks indicates nodes that are created as clones):
         *
         *   SPLITTING OFF 'RIGHT' TREE       SPLITTING OFF 'LEFT' TREE
         *
         *     <div>            <div>'              <div>'      <div>
         *      / \              / \                 / \          |
         * <span> <span>   <span>' <span>       <span> <span>   <span>
         *   / \    |        |      / \           /\     /\       /\
         *  1   2   3        4     5   6         1  2   3  4     5  6
         *
         *  The above example represents splitting off the 'right' or 'left' part of a tree, where
         *  the <div>' would be returned as an element not appended to the DOM, and the <div>
         *  would remain in place where it was
         *
        */
        splitOffDOMTree: function (rootNode, leafNode, splitLeft) {
            var splitOnNode = leafNode,
                createdNode = null,
                splitRight = !splitLeft;

            // loop until we hit the root
            while (splitOnNode !== rootNode) {
                var currParent = splitOnNode.parentNode,
                    newParent = currParent.cloneNode(false),
                    targetNode = (splitRight ? splitOnNode : currParent.firstChild),
                    appendLast;

                // Create a new parent element which is a clone of the current parent
                if (createdNode) {
                    if (splitRight) {
                        // If we're splitting right, add previous created element before siblings
                        newParent.appendChild(createdNode);
                    } else {
                        // If we're splitting left, add previous created element last
                        appendLast = createdNode;
                    }
                }
                createdNode = newParent;

                while (targetNode) {
                    var sibling = targetNode.nextSibling;
                    // Special handling for the 'splitNode'
                    if (targetNode === splitOnNode) {
                        if (!targetNode.hasChildNodes()) {
                            targetNode.parentNode.removeChild(targetNode);
                        } else {
                            // For the node we're splitting on, if it has children, we need to clone it
                            // and not just move it
                            targetNode = targetNode.cloneNode(false);
                        }
                        // If the resulting split node has content, add it
                        if (targetNode.textContent) {
                            createdNode.appendChild(targetNode);
                        }

                        targetNode = (splitRight ? sibling : null);
                    } else {
                        // For general case, just remove the element and only
                        // add it to the split tree if it contains something
                        targetNode.parentNode.removeChild(targetNode);
                        if (targetNode.hasChildNodes() || targetNode.textContent) {
                            createdNode.appendChild(targetNode);
                        }

                        targetNode = sibling;
                    }
                }

                // If we had an element we wanted to append at the end, do that now
                if (appendLast) {
                    createdNode.appendChild(appendLast);
                }

                splitOnNode = currParent;
            }

            return createdNode;
        },

        moveTextRangeIntoElement: function (startNode, endNode, newElement) {
            if (!startNode || !endNode) {
                return false;
            }

            var rootNode = Util.findCommonRoot(startNode, endNode);
            if (!rootNode) {
                return false;
            }

            if (endNode === startNode) {
                var temp = startNode.parentNode,
                    sibling = startNode.nextSibling;
                temp.removeChild(startNode);
                newElement.appendChild(startNode);
                if (sibling) {
                    temp.insertBefore(newElement, sibling);
                } else {
                    temp.appendChild(newElement);
                }
                return newElement.hasChildNodes();
            }

            // create rootChildren array which includes all the children
            // we care about
            var rootChildren = [],
                firstChild,
                lastChild,
                nextNode;
            for (var i = 0; i < rootNode.childNodes.length; i++) {
                nextNode = rootNode.childNodes[i];
                if (!firstChild) {
                    if (Util.isDescendant(nextNode, startNode, true)) {
                        firstChild = nextNode;
                    }
                } else {
                    if (Util.isDescendant(nextNode, endNode, true)) {
                        lastChild = nextNode;
                        break;
                    } else {
                        rootChildren.push(nextNode);
                    }
                }
            }

            var afterLast = lastChild.nextSibling,
                fragment = rootNode.ownerDocument.createDocumentFragment();

            // build up fragment on startNode side of tree
            if (firstChild === startNode) {
                firstChild.parentNode.removeChild(firstChild);
                fragment.appendChild(firstChild);
            } else {
                fragment.appendChild(Util.splitOffDOMTree(firstChild, startNode));
            }

            // add any elements between firstChild & lastChild
            rootChildren.forEach(function (element) {
                element.parentNode.removeChild(element);
                fragment.appendChild(element);
            });

            // build up fragment on endNode side of the tree
            if (lastChild === endNode) {
                lastChild.parentNode.removeChild(lastChild);
                fragment.appendChild(lastChild);
            } else {
                fragment.appendChild(Util.splitOffDOMTree(lastChild, endNode, true));
            }

            // Add fragment into passed in element
            newElement.appendChild(fragment);

            if (lastChild.parentNode === rootNode) {
                // If last child is in the root, insert newElement in front of it
                rootNode.insertBefore(newElement, lastChild);
            } else if (afterLast) {
                // If last child was removed, but it had a sibling, insert in front of it
                rootNode.insertBefore(newElement, afterLast);
            } else {
                // lastChild was removed and was the last actual element just append
                rootNode.appendChild(newElement);
            }

            return newElement.hasChildNodes();
        },

        /* based on http://stackoverflow.com/a/6183069 */
        depthOfNode: function (inNode) {
            var theDepth = 0,
                node = inNode;
            while (node.parentNode !== null) {
                node = node.parentNode;
                theDepth++;
            }
            return theDepth;
        },

        findCommonRoot: function (inNode1, inNode2) {
            var depth1 = Util.depthOfNode(inNode1),
                depth2 = Util.depthOfNode(inNode2),
                node1 = inNode1,
                node2 = inNode2;

            while (depth1 !== depth2) {
                if (depth1 > depth2) {
                    node1 = node1.parentNode;
                    depth1 -= 1;
                } else {
                    node2 = node2.parentNode;
                    depth2 -= 1;
                }
            }

            while (node1 !== node2) {
                node1 = node1.parentNode;
                node2 = node2.parentNode;
            }

            return node1;
        },
        /* END - based on http://stackoverflow.com/a/6183069 */

        isElementAtBeginningOfBlock: function (node) {
            var textVal,
                sibling;
            while (!Util.isBlockContainer(node) && !Util.isMediumEditorElement(node)) {
                sibling = node;
                while (sibling = sibling.previousSibling) {
                    textVal = sibling.nodeType === 3 ? sibling.nodeValue : sibling.textContent;
                    if (textVal.length > 0) {
                        return false;
                    }
                }
                node = node.parentNode;
            }
            return true;
        },

        isMediumEditorElement: function (element) {
            return element && element.getAttribute && !!element.getAttribute('data-medium-editor-element');
        },

        getContainerEditorElement: function (element) {
            return Util.traverseUp(element, function (node) {
                return Util.isMediumEditorElement(node);
            });
        },

        isBlockContainer: function (element) {
            return element && element.nodeType !== 3 && Util.blockContainerElementNames.indexOf(element.nodeName.toLowerCase()) !== -1;
        },

        /* Finds the closest ancestor which is a block container element
         * If element is within editor element but not within any other block element,
         * the editor element is returned
         */
        getClosestBlockContainer: function (node) {
            return Util.traverseUp(node, function (node) {
                return Util.isBlockContainer(node) || Util.isMediumEditorElement(node);
            });
        },

        /* Finds highest level ancestor element which is a block container element
         * If element is within editor element but not within any other block element,
         * the editor element is returned
         */
        getTopBlockContainer: function (element) {
            var topBlock = Util.isBlockContainer(element) ? element : false;
            Util.traverseUp(element, function (el) {
                if (Util.isBlockContainer(el)) {
                    topBlock = el;
                }
                if (!topBlock && Util.isMediumEditorElement(el)) {
                    topBlock = el;
                    return true;
                }
                return false;
            });
            return topBlock;
        },

        getFirstSelectableLeafNode: function (element) {
            while (element && element.firstChild) {
                element = element.firstChild;
            }

            // We don't want to set the selection to an element that can't have children, this messes up Gecko.
            element = Util.traverseUp(element, function (el) {
                return Util.emptyElementNames.indexOf(el.nodeName.toLowerCase()) === -1;
            });
            // Selecting at the beginning of a table doesn't work in PhantomJS.
            if (element.nodeName.toLowerCase() === 'table') {
                var firstCell = element.querySelector('th, td');
                if (firstCell) {
                    element = firstCell;
                }
            }
            return element;
        },

        // TODO: remove getFirstTextNode AND _getFirstTextNode when jumping in 6.0.0 (no code references)
        getFirstTextNode: function (element) {
            Util.warn('getFirstTextNode is deprecated and will be removed in version 6.0.0');
            return Util._getFirstTextNode(element);
        },

        _getFirstTextNode: function (element) {
            if (element.nodeType === 3) {
                return element;
            }

            for (var i = 0; i < element.childNodes.length; i++) {
                var textNode = Util._getFirstTextNode(element.childNodes[i]);
                if (textNode !== null) {
                    return textNode;
                }
            }
            return null;
        },

        ensureUrlHasProtocol: function (url) {
            if (url.indexOf('://') === -1) {
                return 'http://' + url;
            }
            return url;
        },

        warn: function () {
            if (window.console !== undefined && typeof window.console.warn === 'function') {
                window.console.warn.apply(window.console, arguments);
            }
        },

        deprecated: function (oldName, newName, version) {
            // simple deprecation warning mechanism.
            var m = oldName + ' is deprecated, please use ' + newName + ' instead.';
            if (version) {
                m += ' Will be removed in ' + version;
            }
            Util.warn(m);
        },

        deprecatedMethod: function (oldName, newName, args, version) {
            // run the replacement and warn when someone calls a deprecated method
            Util.deprecated(oldName, newName, version);
            if (typeof this[newName] === 'function') {
                this[newName].apply(this, args);
            }
        },

        cleanupAttrs: function (el, attrs) {
            attrs.forEach(function (attr) {
                el.removeAttribute(attr);
            });
        },

        cleanupTags: function (el, tags) {
            if (tags.indexOf(el.nodeName.toLowerCase()) !== -1) {
                el.parentNode.removeChild(el);
            }
        },

        unwrapTags: function (el, tags) {
            if (tags.indexOf(el.nodeName.toLowerCase()) !== -1) {
                MediumEditor.util.unwrap(el, document);
            }
        },

        // get the closest parent
        getClosestTag: function (el, tag) {
            return Util.traverseUp(el, function (element) {
                return element.nodeName.toLowerCase() === tag.toLowerCase();
            });
        },

        unwrap: function (el, doc) {
            var fragment = doc.createDocumentFragment(),
                nodes = Array.prototype.slice.call(el.childNodes);

            // cast nodeList to array since appending child
            // to a different node will alter length of el.childNodes
            for (var i = 0; i < nodes.length; i++) {
                fragment.appendChild(nodes[i]);
            }

            if (fragment.childNodes.length) {
                el.parentNode.replaceChild(fragment, el);
            } else {
                el.parentNode.removeChild(el);
            }
        },

        guid: function () {
            function _s4() {
                return Math
                    .floor((1 + Math.random()) * 0x10000)
                    .toString(16)
                    .substring(1);
            }

            return _s4() + _s4() + '-' + _s4() + '-' + _s4() + '-' + _s4() + '-' + _s4() + _s4() + _s4();
        }
    };

    MediumEditor.util = Util;
}(window));

(function () {
    'use strict';

    var Extension = function (options) {
        MediumEditor.util.extend(this, options);
    };

    Extension.extend = function (protoProps) {
        // magic extender thinger. mostly borrowed from backbone/goog.inherits
        // place this function on some thing you want extend-able.
        //
        // example:
        //
        //      function Thing(args){
        //          this.options = args;
        //      }
        //
        //      Thing.prototype = { foo: "bar" };
        //      Thing.extend = extenderify;
        //
        //      var ThingTwo = Thing.extend({ foo: "baz" });
        //
        //      var thingOne = new Thing(); // foo === "bar"
        //      var thingTwo = new ThingTwo(); // foo === "baz"
        //
        //      which seems like some simply shallow copy nonsense
        //      at first, but a lot more is going on there.
        //
        //      passing a `constructor` to the extend props
        //      will cause the instance to instantiate through that
        //      instead of the parent's constructor.

        var parent = this,
            child;

        // The constructor function for the new subclass is either defined by you
        // (the "constructor" property in your `extend` definition), or defaulted
        // by us to simply call the parent's constructor.

        if (protoProps && protoProps.hasOwnProperty('constructor')) {
            child = protoProps.constructor;
        } else {
            child = function () {
                return parent.apply(this, arguments);
            };
        }

        // das statics (.extend comes over, so your subclass can have subclasses too)
        MediumEditor.util.extend(child, parent);

        // Set the prototype chain to inherit from `parent`, without calling
        // `parent`'s constructor function.
        var Surrogate = function () {
            this.constructor = child;
        };
        Surrogate.prototype = parent.prototype;
        child.prototype = new Surrogate();

        if (protoProps) {
            MediumEditor.util.extend(child.prototype, protoProps);
        }

        // todo: $super?

        return child;
    };

    Extension.prototype = {
        /* init: [function]
         *
         * Called by MediumEditor during initialization.
         * The .base property will already have been set to
         * current instance of MediumEditor when this is called.
         * All helper methods will exist as well
         */
        init: function () {},

        /* base: [MediumEditor instance]
         *
         * If not overriden, this will be set to the current instance
         * of MediumEditor, before the init method is called
         */
        base: undefined,

        /* name: [string]
         *
         * 'name' of the extension, used for retrieving the extension.
         * If not set, MediumEditor will set this to be the key
         * used when passing the extension into MediumEditor via the
         * 'extensions' option
         */
        name: undefined,

        /* checkState: [function (node)]
         *
         * If implemented, this function will be called one or more times
         * the state of the editor & toolbar are updated.
         * When the state is updated, the editor does the following:
         *
         * 1) Find the parent node containing the current selection
         * 2) Call checkState on the extension, passing the node as an argument
         * 3) Get the parent node of the previous node
         * 4) Repeat steps #2 and #3 until we move outside the parent contenteditable
         */
        checkState: undefined,

        /* destroy: [function ()]
         *
         * This method should remove any created html, custom event handlers
         * or any other cleanup tasks that should be performed.
         * If implemented, this function will be called when MediumEditor's
         * destroy method has been called.
         */
        destroy: undefined,

        /* As alternatives to checkState, these functions provide a more structured
         * path to updating the state of an extension (usually a button) whenever
         * the state of the editor & toolbar are updated.
         */

        /* queryCommandState: [function ()]
         *
         * If implemented, this function will be called once on each extension
         * when the state of the editor/toolbar is being updated.
         *
         * If this function returns a non-null value, the extension will
         * be ignored as the code climbs the dom tree.
         *
         * If this function returns true, and the setActive() function is defined
         * setActive() will be called
         */
        queryCommandState: undefined,

        /* isActive: [function ()]
         *
         * If implemented, this function will be called when MediumEditor
         * has determined that this extension is 'active' for the current selection.
         * This may be called when the editor & toolbar are being updated,
         * but only if queryCommandState() or isAlreadyApplied() functions
         * are implemented, and when called, return true.
         */
        isActive: undefined,

        /* isAlreadyApplied: [function (node)]
         *
         * If implemented, this function is similar to checkState() in
         * that it will be called repeatedly as MediumEditor moves up
         * the DOM to update the editor & toolbar after a state change.
         *
         * NOTE: This function will NOT be called if checkState() has
         * been implemented. This function will NOT be called if
         * queryCommandState() is implemented and returns a non-null
         * value when called
         */
        isAlreadyApplied: undefined,

        /* setActive: [function ()]
         *
         * If implemented, this function is called when MediumEditor knows
         * that this extension is currently enabled.  Currently, this
         * function is called when updating the editor & toolbar, and
         * only if queryCommandState() or isAlreadyApplied(node) return
         * true when called
         */
        setActive: undefined,

        /* setInactive: [function ()]
         *
         * If implemented, this function is called when MediumEditor knows
         * that this extension is currently disabled.  Curently, this
         * is called at the beginning of each state change for
         * the editor & toolbar. After calling this, MediumEditor
         * will attempt to update the extension, either via checkState()
         * or the combination of queryCommandState(), isAlreadyApplied(node),
         * isActive(), and setActive()
         */
        setInactive: undefined,

        /* getInteractionElements: [function ()]
         *
         * If the extension renders any elements that the user can interact with,
         * this method should be implemented and return the root element or an array
         * containing all of the root elements. MediumEditor will call this function
         * during interaction to see if the user clicked on something outside of the editor.
         * The elements are used to check if the target element of a click or
         * other user event is a descendant of any extension elements.
         * This way, the editor can also count user interaction within editor elements as
         * interactions with the editor, and thus not trigger 'blur'
         */
        getInteractionElements: undefined,

        /************************ Helpers ************************
         * The following are helpers that are either set by MediumEditor
         * during initialization, or are helper methods which either
         * route calls to the MediumEditor instance or provide common
         * functionality for all extensions
         *********************************************************/

        /* window: [Window]
         *
         * If not overriden, this will be set to the window object
         * to be used by MediumEditor and its extensions.  This is
         * passed via the 'contentWindow' option to MediumEditor
         * and is the global 'window' object by default
         */
        'window': undefined,

        /* document: [Document]
         *
         * If not overriden, this will be set to the document object
         * to be used by MediumEditor and its extensions. This is
         * passed via the 'ownerDocument' optin to MediumEditor
         * and is the global 'document' object by default
         */
        'document': undefined,

        /* getEditorElements: [function ()]
         *
         * Helper function which returns an array containing
         * all the contenteditable elements for this instance
         * of MediumEditor
         */
        getEditorElements: function () {
            return this.base.elements;
        },

        /* getEditorId: [function ()]
         *
         * Helper function which returns a unique identifier
         * for this instance of MediumEditor
         */
        getEditorId: function () {
            return this.base.id;
        },

        /* getEditorOptions: [function (option)]
         *
         * Helper function which returns the value of an option
         * used to initialize this instance of MediumEditor
         */
        getEditorOption: function (option) {
            return this.base.options[option];
        }
    };

    /* List of method names to add to the prototype of Extension
     * Each of these methods will be defined as helpers that
     * just call directly into the MediumEditor instance.
     *
     * example for 'on' method:
     * Extension.prototype.on = function () {
     *     return this.base.on.apply(this.base, arguments);
     * }
     */
    [
        // general helpers
        'execAction',

        // event handling
        'on',
        'off',
        'subscribe',
        'trigger'

    ].forEach(function (helper) {
        Extension.prototype[helper] = function () {
            return this.base[helper].apply(this.base, arguments);
        };
    });

    MediumEditor.Extension = Extension;
})();

(function () {
    'use strict';

    function filterOnlyParentElements(node) {
        if (MediumEditor.util.isBlockContainer(node)) {
            return NodeFilter.FILTER_ACCEPT;
        } else {
            return NodeFilter.FILTER_SKIP;
        }
    }

    var Selection = {
        findMatchingSelectionParent: function (testElementFunction, contentWindow) {
            var selection = contentWindow.getSelection(),
                range,
                current;

            if (selection.rangeCount === 0) {
                return false;
            }

            range = selection.getRangeAt(0);
            current = range.commonAncestorContainer;

            return MediumEditor.util.traverseUp(current, testElementFunction);
        },

        getSelectionElement: function (contentWindow) {
            return this.findMatchingSelectionParent(function (el) {
                return MediumEditor.util.isMediumEditorElement(el);
            }, contentWindow);
        },

        // http://stackoverflow.com/questions/17678843/cant-restore-selection-after-html-modify-even-if-its-the-same-html
        // Tim Down
        exportSelection: function (root, doc) {
            if (!root) {
                return null;
            }

            var selectionState = null,
                selection = doc.getSelection();

            if (selection.rangeCount > 0) {
                var range = selection.getRangeAt(0),
                    preSelectionRange = range.cloneRange(),
                    start;

                preSelectionRange.selectNodeContents(root);
                preSelectionRange.setEnd(range.startContainer, range.startOffset);
                start = preSelectionRange.toString().length;

                selectionState = {
                    start: start,
                    end: start + range.toString().length
                };

                // Check to see if the selection starts with any images
                // if so we need to make sure the the beginning of the selection is
                // set correctly when importing selection
                if (this.doesRangeStartWithImages(range, doc)) {
                    selectionState.startsWithImage = true;
                }

                // Check to see if the selection has any trailing images
                // if so, this this means we need to look for them when we import selection
                var trailingImageCount = this.getTrailingImageCount(root, selectionState, range.endContainer, range.endOffset);
                if (trailingImageCount) {
                    selectionState.trailingImageCount = trailingImageCount;
                }

                // If start = 0 there may still be an empty paragraph before it, but we don't care.
                if (start !== 0) {
                    var emptyBlocksIndex = this.getIndexRelativeToAdjacentEmptyBlocks(doc, root, range.startContainer, range.startOffset);
                    if (emptyBlocksIndex !== -1) {
                        selectionState.emptyBlocksIndex = emptyBlocksIndex;
                    }
                }
            }

            return selectionState;
        },

        // http://stackoverflow.com/questions/17678843/cant-restore-selection-after-html-modify-even-if-its-the-same-html
        // Tim Down
        //
        // {object} selectionState - the selection to import
        // {DOMElement} root - the root element the selection is being restored inside of
        // {Document} doc - the document to use for managing selection
        // {boolean} [favorLaterSelectionAnchor] - defaults to false. If true, import the cursor immediately
        //      subsequent to an anchor tag if it would otherwise be placed right at the trailing edge inside the
        //      anchor. This cursor positioning, even though visually equivalent to the user, can affect behavior
        //      in MS IE.
        importSelection: function (selectionState, root, doc, favorLaterSelectionAnchor) {
            if (!selectionState || !root) {
                return;
            }

            var range = doc.createRange();
            range.setStart(root, 0);
            range.collapse(true);

            var node = root,
                nodeStack = [],
                charIndex = 0,
                foundStart = false,
                foundEnd = false,
                trailingImageCount = 0,
                stop = false,
                nextCharIndex,
                allowRangeToStartAtEndOfNode = false,
                lastTextNode = null;

            // When importing selection, the start of the selection may lie at the end of an element
            // or at the beginning of an element.  Since visually there is no difference between these 2
            // we will try to move the selection to the beginning of an element since this is generally
            // what users will expect and it's a more predictable behavior.
            //
            // However, there are some specific cases when we don't want to do this:
            //  1) We're attempting to move the cursor outside of the end of an anchor [favorLaterSelectionAnchor = true]
            //  2) The selection starts with an image, which is special since an image doesn't have any 'content'
            //     as far as selection and ranges are concerned
            //  3) The selection starts after a specified number of empty block elements (selectionState.emptyBlocksIndex)
            //
            // For these cases, we want the selection to start at a very specific location, so we should NOT
            // automatically move the cursor to the beginning of the first actual chunk of text
            if (favorLaterSelectionAnchor || selectionState.startsWithImage || typeof selectionState.emptyBlocksIndex !== 'undefined') {
                allowRangeToStartAtEndOfNode = true;
            }

            while (!stop && node) {
                // Only iterate over elements and text nodes
                if (node.nodeType > 3) {
                    node = nodeStack.pop();
                    continue;
                }

                // If we hit a text node, we need to add the amount of characters to the overall count
                if (node.nodeType === 3 && !foundEnd) {
                    nextCharIndex = charIndex + node.length;
                    // Check if we're at or beyond the start of the selection we're importing
                    if (!foundStart && selectionState.start >= charIndex && selectionState.start <= nextCharIndex) {
                        // NOTE: We only want to allow a selection to start at the END of an element if
                        //  allowRangeToStartAtEndOfNode is true
                        if (allowRangeToStartAtEndOfNode || selectionState.start < nextCharIndex) {
                            range.setStart(node, selectionState.start - charIndex);
                            foundStart = true;
                        }
                        // We're at the end of a text node where the selection could start but we shouldn't
                        // make the selection start here because allowRangeToStartAtEndOfNode is false.
                        // However, we should keep a reference to this node in case there aren't any more
                        // text nodes after this, so that we have somewhere to import the selection to
                        else {
                            lastTextNode = node;
                        }
                    }
                    // We've found the start of the selection, check if we're at or beyond the end of the selection we're importing
                    if (foundStart && selectionState.end >= charIndex && selectionState.end <= nextCharIndex) {
                        if (!selectionState.trailingImageCount) {
                            range.setEnd(node, selectionState.end - charIndex);
                            stop = true;
                        } else {
                            foundEnd = true;
                        }
                    }
                    charIndex = nextCharIndex;
                } else {
                    if (selectionState.trailingImageCount && foundEnd) {
                        if (node.nodeName.toLowerCase() === 'img') {
                            trailingImageCount++;
                        }
                        if (trailingImageCount === selectionState.trailingImageCount) {
                            // Find which index the image is in its parent's children
                            var endIndex = 0;
                            while (node.parentNode.childNodes[endIndex] !== node) {
                                endIndex++;
                            }
                            range.setEnd(node.parentNode, endIndex + 1);
                            stop = true;
                        }
                    }

                    if (!stop && node.nodeType === 1) {
                        // this is an element
                        // add all its children to the stack
                        var i = node.childNodes.length - 1;
                        while (i >= 0) {
                            nodeStack.push(node.childNodes[i]);
                            i -= 1;
                        }
                    }
                }

                if (!stop) {
                    node = nodeStack.pop();
                }
            }

            // If we've gone through the entire text but didn't find the beginning of a text node
            // to make the selection start at, we should fall back to starting the selection
            // at the END of the last text node we found
            if (!foundStart && lastTextNode) {
                range.setStart(lastTextNode, lastTextNode.length);
                range.setEnd(lastTextNode, lastTextNode.length);
            }

            if (typeof selectionState.emptyBlocksIndex !== 'undefined') {
                range = this.importSelectionMoveCursorPastBlocks(doc, root, selectionState.emptyBlocksIndex, range);
            }

            // If the selection is right at the ending edge of a link, put it outside the anchor tag instead of inside.
            if (favorLaterSelectionAnchor) {
                range = this.importSelectionMoveCursorPastAnchor(selectionState, range);
            }

            this.selectRange(doc, range);
        },

        // Utility method called from importSelection only
        importSelectionMoveCursorPastAnchor: function (selectionState, range) {
            var nodeInsideAnchorTagFunction = function (node) {
                return node.nodeName.toLowerCase() === 'a';
            };
            if (selectionState.start === selectionState.end &&
                    range.startContainer.nodeType === 3 &&
                    range.startOffset === range.startContainer.nodeValue.length &&
                    MediumEditor.util.traverseUp(range.startContainer, nodeInsideAnchorTagFunction)) {
                var prevNode = range.startContainer,
                    currentNode = range.startContainer.parentNode;
                while (currentNode !== null && currentNode.nodeName.toLowerCase() !== 'a') {
                    if (currentNode.childNodes[currentNode.childNodes.length - 1] !== prevNode) {
                        currentNode = null;
                    } else {
                        prevNode = currentNode;
                        currentNode = currentNode.parentNode;
                    }
                }
                if (currentNode !== null && currentNode.nodeName.toLowerCase() === 'a') {
                    var currentNodeIndex = null;
                    for (var i = 0; currentNodeIndex === null && i < currentNode.parentNode.childNodes.length; i++) {
                        if (currentNode.parentNode.childNodes[i] === currentNode) {
                            currentNodeIndex = i;
                        }
                    }
                    range.setStart(currentNode.parentNode, currentNodeIndex + 1);
                    range.collapse(true);
                }
            }
            return range;
        },

        // Uses the emptyBlocksIndex calculated by getIndexRelativeToAdjacentEmptyBlocks
        // to move the cursor back to the start of the correct paragraph
        importSelectionMoveCursorPastBlocks: function (doc, root, index, range) {
            var treeWalker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, filterOnlyParentElements, false),
                startContainer = range.startContainer,
                startBlock,
                targetNode,
                currIndex = 0;
            index = index || 1; // If index is 0, we still want to move to the next block

            // Chrome counts newlines and spaces that separate block elements as actual elements.
            // If the selection is inside one of these text nodes, and it has a previous sibling
            // which is a block element, we want the treewalker to start at the previous sibling
            // and NOT at the parent of the textnode
            if (startContainer.nodeType === 3 && MediumEditor.util.isBlockContainer(startContainer.previousSibling)) {
                startBlock = startContainer.previousSibling;
            } else {
                startBlock = MediumEditor.util.getClosestBlockContainer(startContainer);
            }

            // Skip over empty blocks until we hit the block we want the selection to be in
            while (treeWalker.nextNode()) {
                if (!targetNode) {
                    // Loop through all blocks until we hit the starting block element
                    if (startBlock === treeWalker.currentNode) {
                        targetNode = treeWalker.currentNode;
                    }
                } else {
                    targetNode = treeWalker.currentNode;
                    currIndex++;
                    // We hit the target index, bail
                    if (currIndex === index) {
                        break;
                    }
                    // If we find a non-empty block, ignore the emptyBlocksIndex and just put selection here
                    if (targetNode.textContent.length > 0) {
                        break;
                    }
                }
            }

            if (!targetNode) {
                targetNode = startBlock;
            }

            // We're selecting a high-level block node, so make sure the cursor gets moved into the deepest
            // element at the beginning of the block
            range.setStart(MediumEditor.util.getFirstSelectableLeafNode(targetNode), 0);

            return range;
        },

        // Returns -1 unless the cursor is at the beginning of a paragraph/block
        // If the paragraph/block is preceeded by empty paragraphs/block (with no text)
        // it will return the number of empty paragraphs before the cursor.
        // Otherwise, it will return 0, which indicates the cursor is at the beginning
        // of a paragraph/block, and not at the end of the paragraph/block before it
        getIndexRelativeToAdjacentEmptyBlocks: function (doc, root, cursorContainer, cursorOffset) {
            // If there is text in front of the cursor, that means there isn't only empty blocks before it
            if (cursorContainer.textContent.length > 0 && cursorOffset > 0) {
                return -1;
            }

            // Check if the block that contains the cursor has any other text in front of the cursor
            var node = cursorContainer;
            if (node.nodeType !== 3) {
                node = cursorContainer.childNodes[cursorOffset];
            }
            if (node) {
                // The element isn't at the beginning of a block, so it has content before it
                if (!MediumEditor.util.isElementAtBeginningOfBlock(node)) {
                    return -1;
                }

                var previousSibling = MediumEditor.util.findPreviousSibling(node);
                // If there is no previous sibling, this is the first text element in the editor
                if (!previousSibling) {
                    return -1;
                }
                // If the previous sibling has text, then there are no empty blocks before this
                else if (previousSibling.nodeValue) {
                    return -1;
                }
            }

            // Walk over block elements, counting number of empty blocks between last piece of text
            // and the block the cursor is in
            var closestBlock = MediumEditor.util.getClosestBlockContainer(cursorContainer),
                treeWalker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, filterOnlyParentElements, false),
                emptyBlocksCount = 0;
            while (treeWalker.nextNode()) {
                var blockIsEmpty = treeWalker.currentNode.textContent === '';
                if (blockIsEmpty || emptyBlocksCount > 0) {
                    emptyBlocksCount += 1;
                }
                if (treeWalker.currentNode === closestBlock) {
                    return emptyBlocksCount;
                }
                if (!blockIsEmpty) {
                    emptyBlocksCount = 0;
                }
            }

            return emptyBlocksCount;
        },

        // Returns true if the selection range begins with an image tag
        // Returns false if the range starts with any non empty text nodes
        doesRangeStartWithImages: function (range, doc) {
            if (range.startOffset !== 0 || range.startContainer.nodeType !== 1) {
                return false;
            }

            if (range.startContainer.nodeName.toLowerCase() === 'img') {
                return true;
            }

            var img = range.startContainer.querySelector('img');
            if (!img) {
                return false;
            }

            var treeWalker = doc.createTreeWalker(range.startContainer, NodeFilter.SHOW_ALL, null, false);
            while (treeWalker.nextNode()) {
                var next = treeWalker.currentNode;
                // If we hit the image, then there isn't any text before the image so
                // the image is at the beginning of the range
                if (next === img) {
                    break;
                }
                // If we haven't hit the iamge, but found text that contains content
                // then the range doesn't start with an image
                if (next.nodeValue) {
                    return false;
                }
            }

            return true;
        },

        getTrailingImageCount: function (root, selectionState, endContainer, endOffset) {
            // If the endOffset of a range is 0, the endContainer doesn't contain images
            // If the endContainer is a text node, there are no trailing images
            if (endOffset === 0 || endContainer.nodeType !== 1) {
                return 0;
            }

            // If the endContainer isn't an image, and doesn't have an image descendants
            // there are no trailing images
            if (endContainer.nodeName.toLowerCase() !== 'img' && !endContainer.querySelector('img')) {
                return 0;
            }

            var lastNode = endContainer.childNodes[endOffset - 1];
            while (lastNode.hasChildNodes()) {
                lastNode = lastNode.lastChild;
            }

            var node = root,
                nodeStack = [],
                charIndex = 0,
                foundStart = false,
                foundEnd = false,
                stop = false,
                nextCharIndex,
                trailingImages = 0;

            while (!stop && node) {
                // Only iterate over elements and text nodes
                if (node.nodeType > 3) {
                    node = nodeStack.pop();
                    continue;
                }

                if (node.nodeType === 3 && !foundEnd) {
                    trailingImages = 0;
                    nextCharIndex = charIndex + node.length;
                    if (!foundStart && selectionState.start >= charIndex && selectionState.start <= nextCharIndex) {
                        foundStart = true;
                    }
                    if (foundStart && selectionState.end >= charIndex && selectionState.end <= nextCharIndex) {
                        foundEnd = true;
                    }
                    charIndex = nextCharIndex;
                } else {
                    if (node.nodeName.toLowerCase() === 'img') {
                        trailingImages++;
                    }

                    if (node === lastNode) {
                        stop = true;
                    } else if (node.nodeType === 1) {
                        // this is an element
                        // add all its children to the stack
                        var i = node.childNodes.length - 1;
                        while (i >= 0) {
                            nodeStack.push(node.childNodes[i]);
                            i -= 1;
                        }
                    }
                }

                if (!stop) {
                    node = nodeStack.pop();
                }
            }

            return trailingImages;
        },

        // determine if the current selection contains any 'content'
        // content being any non-white space text or an image
        selectionContainsContent: function (doc) {
            var sel = doc.getSelection();

            // collapsed selection or selection withour range doesn't contain content
            if (!sel || sel.isCollapsed || !sel.rangeCount) {
                return false;
            }

            // if toString() contains any text, the selection contains some content
            if (sel.toString().trim() !== '') {
                return true;
            }

            // if selection contains only image(s), it will return empty for toString()
            // so check for an image manually
            var selectionNode = this.getSelectedParentElement(sel.getRangeAt(0));
            if (selectionNode) {
                if (selectionNode.nodeName.toLowerCase() === 'img' ||
                    (selectionNode.nodeType === 1 && selectionNode.querySelector('img'))) {
                    return true;
                }
            }

            return false;
        },

        selectionInContentEditableFalse: function (contentWindow) {
            // determine if the current selection is exclusively inside
            // a contenteditable="false", though treat the case of an
            // explicit contenteditable="true" inside a "false" as false.
            var sawtrue,
                sawfalse = this.findMatchingSelectionParent(function (el) {
                    var ce = el && el.getAttribute('contenteditable');
                    if (ce === 'true') {
                        sawtrue = true;
                    }
                    return el.nodeName !== '#text' && ce === 'false';
                }, contentWindow);

            return !sawtrue && sawfalse;
        },

        // http://stackoverflow.com/questions/4176923/html-of-selected-text
        // by Tim Down
        getSelectionHtml: function getSelectionHtml(doc) {
            var i,
                html = '',
                sel = doc.getSelection(),
                len,
                container;
            if (sel.rangeCount) {
                container = doc.createElement('div');
                for (i = 0, len = sel.rangeCount; i < len; i += 1) {
                    container.appendChild(sel.getRangeAt(i).cloneContents());
                }
                html = container.innerHTML;
            }
            return html;
        },

        /**
         *  Find the caret position within an element irrespective of any inline tags it may contain.
         *
         *  @param {DOMElement} An element containing the cursor to find offsets relative to.
         *  @param {Range} A Range representing cursor position. Will window.getSelection if none is passed.
         *  @return {Object} 'left' and 'right' attributes contain offsets from begining and end of Element
         */
        getCaretOffsets: function getCaretOffsets(element, range) {
            var preCaretRange, postCaretRange;

            if (!range) {
                range = window.getSelection().getRangeAt(0);
            }

            preCaretRange = range.cloneRange();
            postCaretRange = range.cloneRange();

            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);

            postCaretRange.selectNodeContents(element);
            postCaretRange.setStart(range.endContainer, range.endOffset);

            return {
                left: preCaretRange.toString().length,
                right: postCaretRange.toString().length
            };
        },

        // http://stackoverflow.com/questions/15867542/range-object-get-selection-parent-node-chrome-vs-firefox
        rangeSelectsSingleNode: function (range) {
            var startNode = range.startContainer;
            return startNode === range.endContainer &&
                startNode.hasChildNodes() &&
                range.endOffset === range.startOffset + 1;
        },

        getSelectedParentElement: function (range) {
            if (!range) {
                return null;
            }

            // Selection encompasses a single element
            if (this.rangeSelectsSingleNode(range) && range.startContainer.childNodes[range.startOffset].nodeType !== 3) {
                return range.startContainer.childNodes[range.startOffset];
            }

            // Selection range starts inside a text node, so get its parent
            if (range.startContainer.nodeType === 3) {
                return range.startContainer.parentNode;
            }

            // Selection starts inside an element
            return range.startContainer;
        },

        getSelectedElements: function (doc) {
            var selection = doc.getSelection(),
                range,
                toRet,
                currNode;

            if (!selection.rangeCount || selection.isCollapsed || !selection.getRangeAt(0).commonAncestorContainer) {
                return [];
            }

            range = selection.getRangeAt(0);

            if (range.commonAncestorContainer.nodeType === 3) {
                toRet = [];
                currNode = range.commonAncestorContainer;
                while (currNode.parentNode && currNode.parentNode.childNodes.length === 1) {
                    toRet.push(currNode.parentNode);
                    currNode = currNode.parentNode;
                }

                return toRet;
            }

            return [].filter.call(range.commonAncestorContainer.getElementsByTagName('*'), function (el) {
                return (typeof selection.containsNode === 'function') ? selection.containsNode(el, true) : true;
            });
        },

        selectNode: function (node, doc) {
            var range = doc.createRange();
            range.selectNodeContents(node);
            this.selectRange(doc, range);
        },

        select: function (doc, startNode, startOffset, endNode, endOffset) {
            var range = doc.createRange();
            range.setStart(startNode, startOffset);
            if (endNode) {
                range.setEnd(endNode, endOffset);
            } else {
                range.collapse(true);
            }
            this.selectRange(doc, range);
            return range;
        },

        /**
         *  Clear the current highlighted selection and set the caret to the start or the end of that prior selection, defaults to end.
         *
         *  @param {DomDocument} doc            Current document
         *  @param {boolean} moveCursorToStart  A boolean representing whether or not to set the caret to the beginning of the prior selection.
         */
        clearSelection: function (doc, moveCursorToStart) {
            if (moveCursorToStart) {
                doc.getSelection().collapseToStart();
            } else {
                doc.getSelection().collapseToEnd();
            }
        },

        /**
         * Move cursor to the given node with the given offset.
         *
         * @param  {DomDocument} doc     Current document
         * @param  {DomElement}  node    Element where to jump
         * @param  {integer}     offset  Where in the element should we jump, 0 by default
         */
        moveCursor: function (doc, node, offset) {
            this.select(doc, node, offset);
        },

        getSelectionRange: function (ownerDocument) {
            var selection = ownerDocument.getSelection();
            if (selection.rangeCount === 0) {
                return null;
            }
            return selection.getRangeAt(0);
        },

        selectRange: function (ownerDocument, range) {
            var selection = ownerDocument.getSelection();

            selection.removeAllRanges();
            selection.addRange(range);
        },

        // http://stackoverflow.com/questions/1197401/how-can-i-get-the-element-the-caret-is-in-with-javascript-when-using-contentedi
        // by You
        getSelectionStart: function (ownerDocument) {
            var node = ownerDocument.getSelection().anchorNode,
                startNode = (node && node.nodeType === 3 ? node.parentNode : node);

            return startNode;
        }
    };

    MediumEditor.selection = Selection;
}());

(function () {
    'use strict';

    function isElementDescendantOfExtension(extensions, element) {
        return extensions.some(function (extension) {
            if (typeof extension.getInteractionElements !== 'function') {
                return false;
            }

            var extensionElements = extension.getInteractionElements();
            if (!extensionElements) {
                return false;
            }

            if (!Array.isArray(extensionElements)) {
                extensionElements = [extensionElements];
            }
            return extensionElements.some(function (el) {
                return MediumEditor.util.isDescendant(el, element, true);
            });
        });
    }

    var Events = function (instance) {
        this.base = instance;
        this.options = this.base.options;
        this.events = [];
        this.disabledEvents = {};
        this.customEvents = {};
        this.listeners = {};
    };

    Events.prototype = {
        InputEventOnContenteditableSupported: !MediumEditor.util.isIE && !MediumEditor.util.isEdge,

        // Helpers for event handling

        attachDOMEvent: function (targets, event, listener, useCapture) {
            var win = this.base.options.contentWindow,
                doc = this.base.options.ownerDocument;

            targets = MediumEditor.util.isElement(targets) || [win, doc].indexOf(targets) > -1 ? [targets] : targets;

            Array.prototype.forEach.call(targets, function (target) {
                target.addEventListener(event, listener, useCapture);
                this.events.push([target, event, listener, useCapture]);
            }.bind(this));
        },

        detachDOMEvent: function (targets, event, listener, useCapture) {
            var index, e,
                win = this.base.options.contentWindow,
                doc = this.base.options.ownerDocument;

            if (targets !== null) {
                targets = MediumEditor.util.isElement(targets) || [win, doc].indexOf(targets) > -1 ? [targets] : targets;

                Array.prototype.forEach.call(targets, function (target) {
                    index = this.indexOfListener(target, event, listener, useCapture);
                    if (index !== -1) {
                        e = this.events.splice(index, 1)[0];
                        e[0].removeEventListener(e[1], e[2], e[3]);
                    }
                }.bind(this));
            }
        },

        indexOfListener: function (target, event, listener, useCapture) {
            var i, n, item;
            for (i = 0, n = this.events.length; i < n; i = i + 1) {
                item = this.events[i];
                if (item[0] === target && item[1] === event && item[2] === listener && item[3] === useCapture) {
                    return i;
                }
            }
            return -1;
        },

        detachAllDOMEvents: function () {
            var e = this.events.pop();
            while (e) {
                e[0].removeEventListener(e[1], e[2], e[3]);
                e = this.events.pop();
            }
        },

        detachAllEventsFromElement: function (element) {
            var filtered = this.events.filter(function (e) {
                return e && e[0].getAttribute && e[0].getAttribute('medium-editor-index') === element.getAttribute('medium-editor-index');
            });

            for (var i = 0, len = filtered.length; i < len; i++) {
                var e = filtered[i];
                this.detachDOMEvent(e[0], e[1], e[2], e[3]);
            }
        },

        // Attach all existing handlers to a new element
        attachAllEventsToElement: function (element) {
            if (this.listeners['editableInput']) {
                this.contentCache[element.getAttribute('medium-editor-index')] = element.innerHTML;
            }

            if (this.eventsCache) {
                this.eventsCache.forEach(function (e) {
                    this.attachDOMEvent(element, e['name'], e['handler'].bind(this));
                }, this);
            }
        },

        enableCustomEvent: function (event) {
            if (this.disabledEvents[event] !== undefined) {
                delete this.disabledEvents[event];
            }
        },

        disableCustomEvent: function (event) {
            this.disabledEvents[event] = true;
        },

        // custom events
        attachCustomEvent: function (event, listener) {
            this.setupListener(event);
            if (!this.customEvents[event]) {
                this.customEvents[event] = [];
            }
            this.customEvents[event].push(listener);
        },

        detachCustomEvent: function (event, listener) {
            var index = this.indexOfCustomListener(event, listener);
            if (index !== -1) {
                this.customEvents[event].splice(index, 1);
                // TODO: If array is empty, should detach internal listeners via destroyListener()
            }
        },

        indexOfCustomListener: function (event, listener) {
            if (!this.customEvents[event] || !this.customEvents[event].length) {
                return -1;
            }

            return this.customEvents[event].indexOf(listener);
        },

        detachAllCustomEvents: function () {
            this.customEvents = {};
            // TODO: Should detach internal listeners here via destroyListener()
        },

        triggerCustomEvent: function (name, data, editable) {
            if (this.customEvents[name] && !this.disabledEvents[name]) {
                this.customEvents[name].forEach(function (listener) {
                    listener(data, editable);
                });
            }
        },

        // Cleaning up

        destroy: function () {
            this.detachAllDOMEvents();
            this.detachAllCustomEvents();
            this.detachExecCommand();

            if (this.base.elements) {
                this.base.elements.forEach(function (element) {
                    element.removeAttribute('data-medium-focused');
                });
            }
        },

        // Listening to calls to document.execCommand

        // Attach a listener to be notified when document.execCommand is called
        attachToExecCommand: function () {
            if (this.execCommandListener) {
                return;
            }

            // Store an instance of the listener so:
            // 1) We only attach to execCommand once
            // 2) We can remove the listener later
            this.execCommandListener = function (execInfo) {
                this.handleDocumentExecCommand(execInfo);
            }.bind(this);

            // Ensure that execCommand has been wrapped correctly
            this.wrapExecCommand();

            // Add listener to list of execCommand listeners
            this.options.ownerDocument.execCommand.listeners.push(this.execCommandListener);
        },

        // Remove our listener for calls to document.execCommand
        detachExecCommand: function () {
            var doc = this.options.ownerDocument;
            if (!this.execCommandListener || !doc.execCommand.listeners) {
                return;
            }

            // Find the index of this listener in the array of listeners so it can be removed
            var index = doc.execCommand.listeners.indexOf(this.execCommandListener);
            if (index !== -1) {
                doc.execCommand.listeners.splice(index, 1);
            }

            // If the list of listeners is now empty, put execCommand back to its original state
            if (!doc.execCommand.listeners.length) {
                this.unwrapExecCommand();
            }
        },

        // Wrap document.execCommand in a custom method so we can listen to calls to it
        wrapExecCommand: function () {
            var doc = this.options.ownerDocument;

            // Ensure all instance of MediumEditor only wrap execCommand once
            if (doc.execCommand.listeners) {
                return;
            }

            // Helper method to call all listeners to execCommand
            var callListeners = function (args, result) {
                if (doc.execCommand.listeners) {
                    doc.execCommand.listeners.forEach(function (listener) {
                        listener({
                            command: args[0],
                            value: args[2],
                            args: args,
                            result: result
                        });
                    });
                }
            },

                // Create a wrapper method for execCommand which will:
                // 1) Call document.execCommand with the correct arguments
                // 2) Loop through any listeners and notify them that execCommand was called
                //    passing extra info on the call
                // 3) Return the result
                wrapper = function () {
                    var result = doc.execCommand.orig.apply(this, arguments);

                    if (!doc.execCommand.listeners) {
                        return result;
                    }

                    var args = Array.prototype.slice.call(arguments);
                    callListeners(args, result);

                    return result;
                };

            // Store a reference to the original execCommand
            wrapper.orig = doc.execCommand;

            // Attach an array for storing listeners
            wrapper.listeners = [];

            // Helper for notifying listeners
            wrapper.callListeners = callListeners;

            // Overwrite execCommand
            doc.execCommand = wrapper;
        },

        // Revert document.execCommand back to its original self
        unwrapExecCommand: function () {
            var doc = this.options.ownerDocument;
            if (!doc.execCommand.orig) {
                return;
            }

            // Use the reference to the original execCommand to revert back
            doc.execCommand = doc.execCommand.orig;
        },

        // Listening to browser events to emit events medium-editor cares about
        setupListener: function (name) {
            if (this.listeners[name]) {
                return;
            }

            switch (name) {
                case 'externalInteraction':
                    // Detecting when user has interacted with elements outside of MediumEditor
                    this.attachDOMEvent(this.options.ownerDocument.body, 'mousedown', this.handleBodyMousedown.bind(this), true);
                    this.attachDOMEvent(this.options.ownerDocument.body, 'click', this.handleBodyClick.bind(this), true);
                    this.attachDOMEvent(this.options.ownerDocument.body, 'focus', this.handleBodyFocus.bind(this), true);
                    break;
                case 'blur':
                    // Detecting when focus is lost
                    this.setupListener('externalInteraction');
                    break;
                case 'focus':
                    // Detecting when focus moves into some part of MediumEditor
                    this.setupListener('externalInteraction');
                    break;
                case 'editableInput':
                    // setup cache for knowing when the content has changed
                    this.contentCache = {};
                    this.base.elements.forEach(function (element) {
                        this.contentCache[element.getAttribute('medium-editor-index')] = element.innerHTML;
                    }, this);

                    // Attach to the 'oninput' event, handled correctly by most browsers
                    if (this.InputEventOnContenteditableSupported) {
                        this.attachToEachElement('input', this.handleInput);
                    }

                    // For browsers which don't support the input event on contenteditable (IE)
                    // we'll attach to 'selectionchange' on the document and 'keypress' on the editables
                    if (!this.InputEventOnContenteditableSupported) {
                        this.setupListener('editableKeypress');
                        this.keypressUpdateInput = true;
                        this.attachDOMEvent(document, 'selectionchange', this.handleDocumentSelectionChange.bind(this));
                        // Listen to calls to execCommand
                        this.attachToExecCommand();
                    }
                    break;
                case 'editableClick':
                    // Detecting click in the contenteditables
                    this.attachToEachElement('click', this.handleClick);
                    break;
                case 'editableBlur':
                    // Detecting blur in the contenteditables
                    this.attachToEachElement('blur', this.handleBlur);
                    break;
                case 'editableKeypress':
                    // Detecting keypress in the contenteditables
                    this.attachToEachElement('keypress', this.handleKeypress);
                    break;
                case 'editableKeyup':
                    // Detecting keyup in the contenteditables
                    this.attachToEachElement('keyup', this.handleKeyup);
                    break;
                case 'editableKeydown':
                    // Detecting keydown on the contenteditables
                    this.attachToEachElement('keydown', this.handleKeydown);
                    break;
                case 'editableKeydownSpace':
                    // Detecting keydown for SPACE on the contenteditables
                    this.setupListener('editableKeydown');
                    break;
                case 'editableKeydownEnter':
                    // Detecting keydown for ENTER on the contenteditables
                    this.setupListener('editableKeydown');
                    break;
                case 'editableKeydownTab':
                    // Detecting keydown for TAB on the contenteditable
                    this.setupListener('editableKeydown');
                    break;
                case 'editableKeydownDelete':
                    // Detecting keydown for DELETE/BACKSPACE on the contenteditables
                    this.setupListener('editableKeydown');
                    break;
                case 'editableMouseover':
                    // Detecting mouseover on the contenteditables
                    this.attachToEachElement('mouseover', this.handleMouseover);
                    break;
                case 'editableDrag':
                    // Detecting dragover and dragleave on the contenteditables
                    this.attachToEachElement('dragover', this.handleDragging);
                    this.attachToEachElement('dragleave', this.handleDragging);
                    break;
                case 'editableDrop':
                    // Detecting drop on the contenteditables
                    this.attachToEachElement('drop', this.handleDrop);
                    break;
                // TODO: We need to have a custom 'paste' event separate from 'editablePaste'
                // Need to think about the way to introduce this without breaking folks
                case 'editablePaste':
                    // Detecting paste on the contenteditables
                    this.attachToEachElement('paste', this.handlePaste);
                    break;
            }
            this.listeners[name] = true;
        },

        attachToEachElement: function (name, handler) {
            // build our internal cache to know which element got already what handler attached
            if (!this.eventsCache) {
                this.eventsCache = [];
            }

            this.base.elements.forEach(function (element) {
                this.attachDOMEvent(element, name, handler.bind(this));
            }, this);

            this.eventsCache.push({ 'name': name, 'handler': handler });
        },

        cleanupElement: function (element) {
            var index = element.getAttribute('medium-editor-index');
            if (index) {
                this.detachAllEventsFromElement(element);
                if (this.contentCache) {
                    delete this.contentCache[index];
                }
            }
        },

        focusElement: function (element) {
            element.focus();
            this.updateFocus(element, { target: element, type: 'focus' });
        },

        updateFocus: function (target, eventObj) {
            var hadFocus = this.base.getFocusedElement(),
                toFocus;

            // For clicks, we need to know if the mousedown that caused the click happened inside the existing focused element
            // or one of the extension elements.  If so, we don't want to focus another element
            if (hadFocus &&
                eventObj.type === 'click' &&
                this.lastMousedownTarget &&
                (MediumEditor.util.isDescendant(hadFocus, this.lastMousedownTarget, true) ||
                    isElementDescendantOfExtension(this.base.extensions, this.lastMousedownTarget))) {
                toFocus = hadFocus;
            }

            if (!toFocus) {
                this.base.elements.some(function (element) {
                    // If the target is part of an editor element, this is the element getting focus
                    if (!toFocus && (MediumEditor.util.isDescendant(element, target, true))) {
                        toFocus = element;
                    }

                    // bail if we found an element that's getting focus
                    return !!toFocus;
                }, this);
            }

            // Check if the target is external (not part of the editor, toolbar, or any other extension)
            var externalEvent = !MediumEditor.util.isDescendant(hadFocus, target, true) &&
                !isElementDescendantOfExtension(this.base.extensions, target);

            if (toFocus !== hadFocus) {
                // If element has focus, and focus is going outside of editor
                // Don't blur focused element if clicking on editor, toolbar, or anchorpreview
                if (hadFocus && externalEvent) {
                    // Trigger blur on the editable that has lost focus
                    hadFocus.removeAttribute('data-medium-focused');
                    this.triggerCustomEvent('blur', eventObj, hadFocus);
                }

                // If focus is going into an editor element
                if (toFocus) {
                    // Trigger focus on the editable that now has focus
                    toFocus.setAttribute('data-medium-focused', true);
                    this.triggerCustomEvent('focus', eventObj, toFocus);
                }
            }

            if (externalEvent) {
                this.triggerCustomEvent('externalInteraction', eventObj);
            }
        },

        updateInput: function (target, eventObj) {
            if (!this.contentCache) {
                return;
            }
            // An event triggered which signifies that the user may have changed someting
            // Look in our cache of input for the contenteditables to see if something changed
            var index = target.getAttribute('medium-editor-index'),
                html = target.innerHTML;

            if (html !== this.contentCache[index]) {
                // The content has changed since the last time we checked, fire the event
                this.triggerCustomEvent('editableInput', eventObj, target);
            }
            this.contentCache[index] = html;
        },

        handleDocumentSelectionChange: function (event) {
            // When selectionchange fires, target and current target are set
            // to document, since this is where the event is handled
            // However, currentTarget will have an 'activeElement' property
            // which will point to whatever element has focus.
            if (event.currentTarget && event.currentTarget.activeElement) {
                var activeElement = event.currentTarget.activeElement,
                    currentTarget;
                // We can look at the 'activeElement' to determine if the selectionchange has
                // happened within a contenteditable owned by this instance of MediumEditor
                this.base.elements.some(function (element) {
                    if (MediumEditor.util.isDescendant(element, activeElement, true)) {
                        currentTarget = element;
                        return true;
                    }
                    return false;
                }, this);

                // We know selectionchange fired within one of our contenteditables
                if (currentTarget) {
                    this.updateInput(currentTarget, { target: activeElement, currentTarget: currentTarget });
                }
            }
        },

        handleDocumentExecCommand: function () {
            // document.execCommand has been called
            // If one of our contenteditables currently has focus, we should
            // attempt to trigger the 'editableInput' event
            var target = this.base.getFocusedElement();
            if (target) {
                this.updateInput(target, { target: target, currentTarget: target });
            }
        },

        handleBodyClick: function (event) {
            this.updateFocus(event.target, event);
        },

        handleBodyFocus: function (event) {
            this.updateFocus(event.target, event);
        },

        handleBodyMousedown: function (event) {
            this.lastMousedownTarget = event.target;
        },

        handleInput: function (event) {
            this.updateInput(event.currentTarget, event);
        },

        handleClick: function (event) {
            this.triggerCustomEvent('editableClick', event, event.currentTarget);
        },

        handleBlur: function (event) {
            this.triggerCustomEvent('editableBlur', event, event.currentTarget);
        },

        handleKeypress: function (event) {
            this.triggerCustomEvent('editableKeypress', event, event.currentTarget);

            // If we're doing manual detection of the editableInput event we need
            // to check for input changes during 'keypress'
            if (this.keypressUpdateInput) {
                var eventObj = { target: event.target, currentTarget: event.currentTarget };

                // In IE, we need to let the rest of the event stack complete before we detect
                // changes to input, so using setTimeout here
                setTimeout(function () {
                    this.updateInput(eventObj.currentTarget, eventObj);
                }.bind(this), 0);
            }
        },

        handleKeyup: function (event) {
            this.triggerCustomEvent('editableKeyup', event, event.currentTarget);
        },

        handleMouseover: function (event) {
            this.triggerCustomEvent('editableMouseover', event, event.currentTarget);
        },

        handleDragging: function (event) {
            this.triggerCustomEvent('editableDrag', event, event.currentTarget);
        },

        handleDrop: function (event) {
            this.triggerCustomEvent('editableDrop', event, event.currentTarget);
        },

        handlePaste: function (event) {
            this.triggerCustomEvent('editablePaste', event, event.currentTarget);
        },

        handleKeydown: function (event) {

            this.triggerCustomEvent('editableKeydown', event, event.currentTarget);

            if (MediumEditor.util.isKey(event, MediumEditor.util.keyCode.SPACE)) {
                return this.triggerCustomEvent('editableKeydownSpace', event, event.currentTarget);
            }

            if (MediumEditor.util.isKey(event, MediumEditor.util.keyCode.ENTER) || (event.ctrlKey && MediumEditor.util.isKey(event, MediumEditor.util.keyCode.M))) {
                return this.triggerCustomEvent('editableKeydownEnter', event, event.currentTarget);
            }

            if (MediumEditor.util.isKey(event, MediumEditor.util.keyCode.TAB)) {
                return this.triggerCustomEvent('editableKeydownTab', event, event.currentTarget);
            }

            if (MediumEditor.util.isKey(event, [MediumEditor.util.keyCode.DELETE, MediumEditor.util.keyCode.BACKSPACE])) {
                return this.triggerCustomEvent('editableKeydownDelete', event, event.currentTarget);
            }
        }
    };

    MediumEditor.Events = Events;
}());

(function () {
    'use strict';

    var Button = MediumEditor.Extension.extend({

        /* Button Options */

        /* action: [string]
         * The action argument to pass to MediumEditor.execAction()
         * when the button is clicked
         */
        action: undefined,

        /* aria: [string]
         * The value to add as the aria-label attribute of the button
         * element displayed in the toolbar.
         * This is also used as the tooltip for the button
         */
        aria: undefined,

        /* tagNames: [Array]
         * NOTE: This is not used if useQueryState is set to true.
         *
         * Array of element tag names that would indicate that this
         * button has already been applied. If this action has already
         * been applied, the button will be displayed as 'active' in the toolbar
         *
         * Example:
         * For 'bold', if the text is ever within a <b> or <strong>
         * tag that indicates the text is already bold. So the array
         * of tagNames for bold would be: ['b', 'strong']
         */
        tagNames: undefined,

        /* style: [Object]
         * NOTE: This is not used if useQueryState is set to true.
         *
         * A pair of css property & value(s) that indicate that this
         * button has already been applied. If this action has already
         * been applied, the button will be displayed as 'active' in the toolbar
         * Properties of the object:
         *   prop [String]: name of the css property
         *   value [String]: value(s) of the css property
         *                   multiple values can be separated by a '|'
         *
         * Example:
         * For 'bold', if the text is ever within an element with a 'font-weight'
         * style property set to '700' or 'bold', that indicates the text
         * is already bold.  So the style object for bold would be:
         * { prop: 'font-weight', value: '700|bold' }
         */
        style: undefined,

        /* useQueryState: [boolean]
         * Enables/disables whether this button should use the built-in
         * document.queryCommandState() method to determine whether
         * the action has already been applied.  If the action has already
         * been applied, the button will be displayed as 'active' in the toolbar
         *
         * Example:
         * For 'bold', if this is set to true, the code will call:
         * document.queryCommandState('bold') which will return true if the
         * browser thinks the text is already bold, and false otherwise
         */
        useQueryState: undefined,

        /* contentDefault: [string]
         * Default innerHTML to put inside the button
         */
        contentDefault: undefined,

        /* contentFA: [string]
         * The innerHTML to use for the content of the button
         * if the `buttonLabels` option for MediumEditor is set to 'fontawesome'
         */
        contentFA: undefined,

        /* classList: [Array]
         * An array of classNames (strings) to be added to the button
         */
        classList: undefined,

        /* attrs: [object]
         * A set of key-value pairs to add to the button as custom attributes
         */
        attrs: undefined,

        // The button constructor can optionally accept the name of a built-in button
        // (ie 'bold', 'italic', etc.)
        // When the name of a button is passed, it will initialize itself with the
        // configuration for that button
        constructor: function (options) {
            if (Button.isBuiltInButton(options)) {
                MediumEditor.Extension.call(this, this.defaults[options]);
            } else {
                MediumEditor.Extension.call(this, options);
            }
        },

        init: function () {
            MediumEditor.Extension.prototype.init.apply(this, arguments);

            this.button = this.createButton();
            this.on(this.button, 'click', this.handleClick.bind(this));
        },

        /* getButton: [function ()]
         *
         * If implemented, this function will be called when
         * the toolbar is being created.  The DOM Element returned
         * by this function will be appended to the toolbar along
         * with any other buttons.
         */
        getButton: function () {
            return this.button;
        },

        getAction: function () {
            return (typeof this.action === 'function') ? this.action(this.base.options) : this.action;
        },

        getAria: function () {
            return (typeof this.aria === 'function') ? this.aria(this.base.options) : this.aria;
        },

        getTagNames: function () {
            return (typeof this.tagNames === 'function') ? this.tagNames(this.base.options) : this.tagNames;
        },

        createButton: function () {
            var button = this.document.createElement('button'),
                content = this.contentDefault,
                ariaLabel = this.getAria(),
                buttonLabels = this.getEditorOption('buttonLabels');
            // Add class names
            button.classList.add('medium-editor-action');
            button.classList.add('medium-editor-action-' + this.name);
            if (this.classList) {
                this.classList.forEach(function (className) {
                    button.classList.add(className);
                });
            }

            // Add attributes
            button.setAttribute('data-action', this.getAction());
            if (ariaLabel) {
                button.setAttribute('title', ariaLabel);
                button.setAttribute('aria-label', ariaLabel);
            }
            if (this.attrs) {
                Object.keys(this.attrs).forEach(function (attr) {
                    button.setAttribute(attr, this.attrs[attr]);
                }, this);
            }

            if (buttonLabels === 'fontawesome' && this.contentFA) {
                content = this.contentFA;
            }
            button.innerHTML = content;
            return button;
        },

        handleClick: function (event) {
            event.preventDefault();
            event.stopPropagation();

            var action = this.getAction();

            if (action) {
                this.execAction(action);
            }
        },

        isActive: function () {
            return this.button.classList.contains(this.getEditorOption('activeButtonClass'));
        },

        setInactive: function () {
            this.button.classList.remove(this.getEditorOption('activeButtonClass'));
            delete this.knownState;
        },

        setActive: function () {
            this.button.classList.add(this.getEditorOption('activeButtonClass'));
            delete this.knownState;
        },

        queryCommandState: function () {
            var queryState = null;
            if (this.useQueryState) {
                queryState = this.base.queryCommandState(this.getAction());
            }
            return queryState;
        },

        isAlreadyApplied: function (node) {
            var isMatch = false,
                tagNames = this.getTagNames(),
                styleVals,
                computedStyle;

            if (this.knownState === false || this.knownState === true) {
                return this.knownState;
            }

            if (tagNames && tagNames.length > 0) {
                isMatch = tagNames.indexOf(node.nodeName.toLowerCase()) !== -1;
            }

            if (!isMatch && this.style) {
                styleVals = this.style.value.split('|');
                computedStyle = this.window.getComputedStyle(node, null).getPropertyValue(this.style.prop);
                styleVals.forEach(function (val) {
                    if (!this.knownState) {
                        isMatch = (computedStyle.indexOf(val) !== -1);
                        // text-decoration is not inherited by default
                        // so if the computed style for text-decoration doesn't match
                        // don't write to knownState so we can fallback to other checks
                        if (isMatch || this.style.prop !== 'text-decoration') {
                            this.knownState = isMatch;
                        }
                    }
                }, this);
            }

            return isMatch;
        }
    });

    Button.isBuiltInButton = function (name) {
        return (typeof name === 'string') && MediumEditor.extensions.button.prototype.defaults.hasOwnProperty(name);
    };

    MediumEditor.extensions.button = Button;
}());

(function () {
    'use strict';

    /* MediumEditor.extensions.button.defaults: [Object]
     * Set of default config options for all of the built-in MediumEditor buttons
     */
    MediumEditor.extensions.button.prototype.defaults = {
        'bold': {
            name: 'bold',
            action: 'bold',
            aria: 'bold',
            tagNames: ['b', 'strong'],
            style: {
                prop: 'font-weight',
                value: '700|bold'
            },
            useQueryState: true,
            contentDefault: '<b>B</b>',
            contentFA: '<i class="fa fa-bold"></i>'
        },
        'italic': {
            name: 'italic',
            action: 'italic',
            aria: 'italic',
            tagNames: ['i', 'em'],
            style: {
                prop: 'font-style',
                value: 'italic'
            },
            useQueryState: true,
            contentDefault: '<b><i>I</i></b>',
            contentFA: '<i class="fa fa-italic"></i>'
        },
        'underline': {
            name: 'underline',
            action: 'underline',
            aria: 'underline',
            tagNames: ['u'],
            style: {
                prop: 'text-decoration',
                value: 'underline'
            },
            useQueryState: true,
            contentDefault: '<b><u>U</u></b>',
            contentFA: '<i class="fa fa-underline"></i>'
        },
        'strikethrough': {
            name: 'strikethrough',
            action: 'strikethrough',
            aria: 'strike through',
            tagNames: ['strike'],
            style: {
                prop: 'text-decoration',
                value: 'line-through'
            },
            useQueryState: true,
            contentDefault: '<s>A</s>',
            contentFA: '<i class="fa fa-strikethrough"></i>'
        },
        'superscript': {
            name: 'superscript',
            action: 'superscript',
            aria: 'superscript',
            tagNames: ['sup'],
            /* firefox doesn't behave the way we want it to, so we CAN'T use queryCommandState for superscript
               https://github.com/guardian/scribe/blob/master/BROWSERINCONSISTENCIES.md#documentquerycommandstate */
            // useQueryState: true
            contentDefault: '<b>x<sup>1</sup></b>',
            contentFA: '<i class="fa fa-superscript"></i>'
        },
        'subscript': {
            name: 'subscript',
            action: 'subscript',
            aria: 'subscript',
            tagNames: ['sub'],
            /* firefox doesn't behave the way we want it to, so we CAN'T use queryCommandState for subscript
               https://github.com/guardian/scribe/blob/master/BROWSERINCONSISTENCIES.md#documentquerycommandstate */
            // useQueryState: true
            contentDefault: '<b>x<sub>1</sub></b>',
            contentFA: '<i class="fa fa-subscript"></i>'
        },
        'image': {
            name: 'image',
            action: 'image',
            aria: 'image',
            tagNames: ['img'],
            contentDefault: '<b>image</b>',
            contentFA: '<i class="fa fa-picture-o"></i>'
        },
        'html': {
            name: 'html',
            action: 'html',
            aria: 'evaluate html',
            tagNames: ['iframe', 'object'],
            contentDefault: '<b>html</b>',
            contentFA: '<i class="fa fa-code"></i>'
        },
        'orderedlist': {
            name: 'orderedlist',
            action: 'insertorderedlist',
            aria: 'ordered list',
            tagNames: ['ol'],
            useQueryState: true,
            contentDefault: '<b>1.</b>',
            contentFA: '<i class="fa fa-list-ol"></i>'
        },
        'unorderedlist': {
            name: 'unorderedlist',
            action: 'insertunorderedlist',
            aria: 'unordered list',
            tagNames: ['ul'],
            useQueryState: true,
            contentDefault: '<b>&bull;</b>',
            contentFA: '<i class="fa fa-list-ul"></i>'
        },
        'indent': {
            name: 'indent',
            action: 'indent',
            aria: 'indent',
            tagNames: [],
            contentDefault: '<b>&rarr;</b>',
            contentFA: '<i class="fa fa-indent"></i>'
        },
        'outdent': {
            name: 'outdent',
            action: 'outdent',
            aria: 'outdent',
            tagNames: [],
            contentDefault: '<b>&larr;</b>',
            contentFA: '<i class="fa fa-outdent"></i>'
        },
        'justifyCenter': {
            name: 'justifyCenter',
            action: 'justifyCenter',
            aria: 'center justify',
            tagNames: [],
            style: {
                prop: 'text-align',
                value: 'center'
            },
            contentDefault: '<b>C</b>',
            contentFA: '<i class="fa fa-align-center"></i>'
        },
        'justifyFull': {
            name: 'justifyFull',
            action: 'justifyFull',
            aria: 'full justify',
            tagNames: [],
            style: {
                prop: 'text-align',
                value: 'justify'
            },
            contentDefault: '<b>J</b>',
            contentFA: '<i class="fa fa-align-justify"></i>'
        },
        'justifyLeft': {
            name: 'justifyLeft',
            action: 'justifyLeft',
            aria: 'left justify',
            tagNames: [],
            style: {
                prop: 'text-align',
                value: 'left'
            },
            contentDefault: '<b>L</b>',
            contentFA: '<i class="fa fa-align-left"></i>'
        },
        'justifyRight': {
            name: 'justifyRight',
            action: 'justifyRight',
            aria: 'right justify',
            tagNames: [],
            style: {
                prop: 'text-align',
                value: 'right'
            },
            contentDefault: '<b>R</b>',
            contentFA: '<i class="fa fa-align-right"></i>'
        },
        // Known inline elements that are not removed, or not removed consistantly across browsers:
        // <span>, <label>, <br>
        'removeFormat': {
            name: 'removeFormat',
            aria: 'remove formatting',
            action: 'removeFormat',
            contentDefault: '<b>X</b>',
            contentFA: '<i class="fa fa-eraser"></i>'
        },

        /***** Buttons for appending block elements (append-<element> action) *****/

        'quote': {
            name: 'quote',
            action: 'append-blockquote',
            aria: 'blockquote',
            tagNames: ['blockquote'],
            contentDefault: '<b>&ldquo;</b>',
            contentFA: '<i class="fa fa-quote-right"></i>'
        },
        'pre': {
            name: 'pre',
            action: 'append-pre',
            aria: 'preformatted text',
            tagNames: ['pre'],
            contentDefault: '<b>0101</b>',
            contentFA: '<i class="fa fa-code fa-lg"></i>'
        },
        'h1': {
            name: 'h1',
            action: 'append-h1',
            aria: 'header type one',
            tagNames: ['h1'],
            contentDefault: '<b>H1</b>',
            contentFA: '<i class="fa fa-header"><sup>1</sup>'
        },
        'h2': {
            name: 'h2',
            action: 'append-h2',
            aria: 'header type two',
            tagNames: ['h2'],
            contentDefault: '<b>H2</b>',
            contentFA: '<i class="fa fa-header"><sup>2</sup>'
        },
        'h3': {
            name: 'h3',
            action: 'append-h3',
            aria: 'header type three',
            tagNames: ['h3'],
            contentDefault: '<b>H3</b>',
            contentFA: '<i class="fa fa-header"><sup>3</sup>'
        },
        'h4': {
            name: 'h4',
            action: 'append-h4',
            aria: 'header type four',
            tagNames: ['h4'],
            contentDefault: '<b>H4</b>',
            contentFA: '<i class="fa fa-header"><sup>4</sup>'
        },
        'h5': {
            name: 'h5',
            action: 'append-h5',
            aria: 'header type five',
            tagNames: ['h5'],
            contentDefault: '<b>H5</b>',
            contentFA: '<i class="fa fa-header"><sup>5</sup>'
        },
        'h6': {
            name: 'h6',
            action: 'append-h6',
            aria: 'header type six',
            tagNames: ['h6'],
            contentDefault: '<b>H6</b>',
            contentFA: '<i class="fa fa-header"><sup>6</sup>'
        }
    };

})();

(function () {
    'use strict';

    /* Base functionality for an extension which will display
     * a 'form' inside the toolbar
     */
    var FormExtension = MediumEditor.extensions.button.extend({

        init: function () {
            MediumEditor.extensions.button.prototype.init.apply(this, arguments);
        },

        // default labels for the form buttons
        formSaveLabel: '&#10003;',
        formCloseLabel: '&times;',

        /* activeClass: [string]
         * set class which added to shown form
         */
        activeClass: 'medium-editor-toolbar-form-active',

        /* hasForm: [boolean]
         *
         * Setting this to true will cause getForm() to be called
         * when the toolbar is created, so the form can be appended
         * inside the toolbar container
         */
        hasForm: true,

        /* getForm: [function ()]
         *
         * When hasForm is true, this function must be implemented
         * and return a DOM Element which will be appended to
         * the toolbar container. The form should start hidden, and
         * the extension can choose when to hide/show it
         */
        getForm: function () {},

        /* isDisplayed: [function ()]
         *
         * This function should return true/false reflecting
         * whether the form is currently displayed
         */
        isDisplayed: function () {
            if (this.hasForm) {
                return this.getForm().classList.contains(this.activeClass);
            }
            return false;
        },

        /* hideForm: [function ()]
         *
         * This function should show the form element inside
         * the toolbar container
         */
        showForm: function () {
            if (this.hasForm) {
                this.getForm().classList.add(this.activeClass);
            }
        },

        /* hideForm: [function ()]
         *
         * This function should hide the form element inside
         * the toolbar container
         */
        hideForm: function () {
            if (this.hasForm) {
                this.getForm().classList.remove(this.activeClass);
            }
        },

        /************************ Helpers ************************
         * The following are helpers that are either set by MediumEditor
         * during initialization, or are helper methods which either
         * route calls to the MediumEditor instance or provide common
         * functionality for all form extensions
         *********************************************************/

        /* showToolbarDefaultActions: [function ()]
         *
         * Helper method which will turn back the toolbar after canceling
         * the customized form
         */
        showToolbarDefaultActions: function () {
            var toolbar = this.base.getExtensionByName('toolbar');
            if (toolbar) {
                toolbar.showToolbarDefaultActions();
            }
        },

        /* hideToolbarDefaultActions: [function ()]
         *
         * Helper function which will hide the default contents of the
         * toolbar, but leave the toolbar container in the same state
         * to allow a form to display its custom contents inside the toolbar
         */
        hideToolbarDefaultActions: function () {
            var toolbar = this.base.getExtensionByName('toolbar');
            if (toolbar) {
                toolbar.hideToolbarDefaultActions();
            }
        },

        /* setToolbarPosition: [function ()]
         *
         * Helper function which will update the size and position
         * of the toolbar based on the toolbar content and the current
         * position of the user's selection
         */
        setToolbarPosition: function () {
            var toolbar = this.base.getExtensionByName('toolbar');
            if (toolbar) {
                toolbar.setToolbarPosition();
            }
        }
    });

    MediumEditor.extensions.form = FormExtension;
})();
(function () {
    'use strict';

    var AnchorForm = MediumEditor.extensions.form.extend({
        /* Anchor Form Options */

        /* customClassOption: [string]  (previously options.anchorButton + options.anchorButtonClass)
         * Custom class name the user can optionally have added to their created links (ie 'button').
         * If passed as a non-empty string, a checkbox will be displayed allowing the user to choose
         * whether to have the class added to the created link or not.
         */
        customClassOption: null,

        /* customClassOptionText: [string]
         * text to be shown in the checkbox when the __customClassOption__ is being used.
         */
        customClassOptionText: 'Button',

        /* linkValidation: [boolean]  (previously options.checkLinkFormat)
         * enables/disables check for common URL protocols on anchor links.
         */
        linkValidation: false,

        /* placeholderText: [string]  (previously options.anchorInputPlaceholder)
         * text to be shown as placeholder of the anchor input.
         */
        placeholderText: 'Paste or type a link',

        /* targetCheckbox: [boolean]  (previously options.anchorTarget)
         * enables/disables displaying a "Open in new window" checkbox, which when checked
         * changes the `target` attribute of the created link.
         */
        targetCheckbox: false,

        /* targetCheckboxText: [string]  (previously options.anchorInputCheckboxLabel)
         * text to be shown in the checkbox enabled via the __targetCheckbox__ option.
         */
        targetCheckboxText: 'Open in new window',

        // Options for the Button base class
        name: 'anchor',
        action: 'createLink',
        aria: 'link',
        tagNames: ['a'],
        contentDefault: '<b>#</b>',
        contentFA: '<i class="fa fa-link"></i>',

        init: function () {
            MediumEditor.extensions.form.prototype.init.apply(this, arguments);

            this.subscribe('editableKeydown', this.handleKeydown.bind(this));
        },

        // Called when the button the toolbar is clicked
        // Overrides ButtonExtension.handleClick
        handleClick: function (event) {
            event.preventDefault();
            event.stopPropagation();

            var range = MediumEditor.selection.getSelectionRange(this.document);

            if (range.startContainer.nodeName.toLowerCase() === 'a' ||
                range.endContainer.nodeName.toLowerCase() === 'a' ||
                MediumEditor.util.getClosestTag(MediumEditor.selection.getSelectedParentElement(range), 'a')) {
                return this.execAction('unlink');
            }

            if (!this.isDisplayed()) {
                this.showForm();
            }

            return false;
        },

        // Called when user hits the defined shortcut (CTRL / COMMAND + K)
        handleKeydown: function (event) {
            if (MediumEditor.util.isKey(event, MediumEditor.util.keyCode.K) && MediumEditor.util.isMetaCtrlKey(event) && !event.shiftKey) {
                this.handleClick(event);
            }
        },

        // Called by medium-editor to append form to the toolbar
        getForm: function () {
            if (!this.form) {
                this.form = this.createForm();
            }
            return this.form;
        },

        getTemplate: function () {
            var template = [
                '<input type="text" class="medium-editor-toolbar-input" placeholder="', this.placeholderText, '">'
            ];

            template.push(
                '<a href="#" class="medium-editor-toolbar-save">',
                this.getEditorOption('buttonLabels') === 'fontawesome' ? '<i class="fa fa-check"></i>' : this.formSaveLabel,
                '</a>'
            );

            template.push('<a href="#" class="medium-editor-toolbar-close">',
                this.getEditorOption('buttonLabels') === 'fontawesome' ? '<i class="fa fa-times"></i>' : this.formCloseLabel,
                '</a>');

            // both of these options are slightly moot with the ability to
            // override the various form buildup/serialize functions.

            if (this.targetCheckbox) {
                // fixme: ideally, this targetCheckboxText would be a formLabel too,
                // figure out how to deprecate? also consider `fa-` icon default implcations.
                template.push(
                    '<div class="medium-editor-toolbar-form-row">',
                    '<input type="checkbox" class="medium-editor-toolbar-anchor-target" id="medium-editor-toolbar-anchor-target-field-' + this.getEditorId() + '">',
                    '<label for="medium-editor-toolbar-anchor-target-field-' + this.getEditorId() + '">',
                    this.targetCheckboxText,
                    '</label>',
                    '</div>'
                );
            }

            if (this.customClassOption) {
                // fixme: expose this `Button` text as a formLabel property, too
                // and provide similar access to a `fa-` icon default.
                template.push(
                    '<div class="medium-editor-toolbar-form-row">',
                    '<input type="checkbox" class="medium-editor-toolbar-anchor-button">',
                    '<label>',
                    this.customClassOptionText,
                    '</label>',
                    '</div>'
                );
            }

            return template.join('');

        },

        // Used by medium-editor when the default toolbar is to be displayed
        isDisplayed: function () {
            return MediumEditor.extensions.form.prototype.isDisplayed.apply(this);
        },

        hideForm: function () {
            MediumEditor.extensions.form.prototype.hideForm.apply(this);
            this.getInput().value = '';
        },

        showForm: function (opts) {
            var input = this.getInput(),
                targetCheckbox = this.getAnchorTargetCheckbox(),
                buttonCheckbox = this.getAnchorButtonCheckbox();

            opts = opts || { value: '' };
            // TODO: This is for backwards compatability
            // We don't need to support the 'string' argument in 6.0.0
            if (typeof opts === 'string') {
                opts = {
                    value: opts
                };
            }

            this.base.saveSelection();
            this.hideToolbarDefaultActions();
            MediumEditor.extensions.form.prototype.showForm.apply(this);
            this.setToolbarPosition();

            input.value = opts.value;
            input.focus();

            // If we have a target checkbox, we want it to be checked/unchecked
            // based on whether the existing link has target=_blank
            if (targetCheckbox) {
                targetCheckbox.checked = opts.target === '_blank';
            }

            // If we have a custom class checkbox, we want it to be checked/unchecked
            // based on whether an existing link already has the class
            if (buttonCheckbox) {
                var classList = opts.buttonClass ? opts.buttonClass.split(' ') : [];
                buttonCheckbox.checked = (classList.indexOf(this.customClassOption) !== -1);
            }
        },

        // Called by core when tearing down medium-editor (destroy)
        destroy: function () {
            if (!this.form) {
                return false;
            }

            if (this.form.parentNode) {
                this.form.parentNode.removeChild(this.form);
            }

            delete this.form;
        },

        // core methods

        getFormOpts: function () {
            // no notion of private functions? wanted `_getFormOpts`
            var targetCheckbox = this.getAnchorTargetCheckbox(),
                buttonCheckbox = this.getAnchorButtonCheckbox(),
                opts = {
                    value: this.getInput().value.trim()
                };

            if (this.linkValidation) {
                opts.value = this.checkLinkFormat(opts.value);
            }

            opts.target = '_self';
            if (targetCheckbox && targetCheckbox.checked) {
                opts.target = '_blank';
            }

            if (buttonCheckbox && buttonCheckbox.checked) {
                opts.buttonClass = this.customClassOption;
            }

            return opts;
        },

        doFormSave: function () {
            var opts = this.getFormOpts();
            this.completeFormSave(opts);
        },

        completeFormSave: function (opts) {
            this.base.restoreSelection();
            this.execAction(this.action, opts);
            this.base.checkSelection();
        },

        ensureEncodedUri: function (str) {
            return str === decodeURI(str) ? encodeURI(str) : str;
        },

        ensureEncodedUriComponent: function (str) {
            return str === decodeURIComponent(str) ? encodeURIComponent(str) : str;
        },

        ensureEncodedParam: function (param) {
            var split = param.split('='),
                key = split[0],
                val = split[1];

            return key + (val === undefined ? '' : '=' + this.ensureEncodedUriComponent(val));
        },

        ensureEncodedQuery: function (queryString) {
            return queryString.split('&').map(this.ensureEncodedParam.bind(this)).join('&');
        },

        checkLinkFormat: function (value) {
            // Matches any alphabetical characters followed by ://
            // Matches protocol relative "//"
            // Matches common external protocols "mailto:" "tel:" "maps:"
            // Matches relative hash link, begins with "#"
            var urlSchemeRegex = /^([a-z]+:)?\/\/|^(mailto|tel|maps):|^\#/i,
                hasScheme = urlSchemeRegex.test(value),
                scheme = '',
                // telRegex is a regex for checking if the string is a telephone number
                telRegex = /^\+?\s?\(?(?:\d\s?\-?\)?){3,20}$/,
                urlParts = value.match(/^(.*?)(?:\?(.*?))?(?:#(.*))?$/),
                path = urlParts[1],
                query = urlParts[2],
                fragment = urlParts[3];

            if (telRegex.test(value)) {
                return 'tel:' + value;
            }

            if (!hasScheme) {
                var host = path.split('/')[0];
                // if the host part of the path looks like a hostname
                if (host.match(/.+(\.|:).+/) || host === 'localhost') {
                    scheme = 'http://';
                }
            }

            return scheme +
                // Ensure path is encoded
                this.ensureEncodedUri(path) +
                // Ensure query is encoded
                (query === undefined ? '' : '?' + this.ensureEncodedQuery(query)) +
                // Include fragment unencoded as encodeUriComponent is too
                // heavy handed for the many characters allowed in a fragment
                (fragment === undefined ? '' : '#' + fragment);
        },

        doFormCancel: function () {
            this.base.restoreSelection();
            this.base.checkSelection();
        },

        // form creation and event handling
        attachFormEvents: function (form) {
            var close = form.querySelector('.medium-editor-toolbar-close'),
                save = form.querySelector('.medium-editor-toolbar-save'),
                input = form.querySelector('.medium-editor-toolbar-input');

            // Handle clicks on the form itself
            this.on(form, 'click', this.handleFormClick.bind(this));

            // Handle typing in the textbox
            this.on(input, 'keyup', this.handleTextboxKeyup.bind(this));

            // Handle close button clicks
            this.on(close, 'click', this.handleCloseClick.bind(this));

            // Handle save button clicks (capture)
            this.on(save, 'click', this.handleSaveClick.bind(this), true);

        },

        createForm: function () {
            var doc = this.document,
                form = doc.createElement('div');

            // Anchor Form (div)
            form.className = 'medium-editor-toolbar-form';
            form.id = 'medium-editor-toolbar-form-anchor-' + this.getEditorId();
            form.innerHTML = this.getTemplate();
            this.attachFormEvents(form);

            return form;
        },

        getInput: function () {
            return this.getForm().querySelector('input.medium-editor-toolbar-input');
        },

        getAnchorTargetCheckbox: function () {
            return this.getForm().querySelector('.medium-editor-toolbar-anchor-target');
        },

        getAnchorButtonCheckbox: function () {
            return this.getForm().querySelector('.medium-editor-toolbar-anchor-button');
        },

        handleTextboxKeyup: function (event) {
            // For ENTER -> create the anchor
            if (event.keyCode === MediumEditor.util.keyCode.ENTER) {
                event.preventDefault();
                this.doFormSave();
                return;
            }

            // For ESCAPE -> close the form
            if (event.keyCode === MediumEditor.util.keyCode.ESCAPE) {
                event.preventDefault();
                this.doFormCancel();
            }
        },

        handleFormClick: function (event) {
            // make sure not to hide form when clicking inside the form
            event.stopPropagation();
        },

        handleSaveClick: function (event) {
            // Clicking Save -> create the anchor
            event.preventDefault();
            this.doFormSave();
        },

        handleCloseClick: function (event) {
            // Click Close -> close the form
            event.preventDefault();
            this.doFormCancel();
        }
    });

    MediumEditor.extensions.anchor = AnchorForm;
}());

(function () {
    'use strict';

    var AnchorPreview = MediumEditor.Extension.extend({
        name: 'anchor-preview',

        // Anchor Preview Options

        /* hideDelay: [number]  (previously options.anchorPreviewHideDelay)
         * time in milliseconds to show the anchor tag preview after the mouse has left the anchor tag.
         */
        hideDelay: 500,

        /* previewValueSelector: [string]
         * the default selector to locate where to put the activeAnchor value in the preview
         */
        previewValueSelector: 'a',

        /* showWhenToolbarIsVisible: [boolean]
         * determines whether the anchor tag preview shows up when the toolbar is visible
         */
        showWhenToolbarIsVisible: false,

        /* showOnEmptyLinks: [boolean]
        * determines whether the anchor tag preview shows up on links with href="" or href="#something"
        */
        showOnEmptyLinks: true,

        init: function () {
            this.anchorPreview = this.createPreview();

            this.getEditorOption('elementsContainer').appendChild(this.anchorPreview);

            this.attachToEditables();
        },

        getInteractionElements: function () {
            return this.getPreviewElement();
        },

        // TODO: Remove this function in 6.0.0
        getPreviewElement: function () {
            return this.anchorPreview;
        },

        createPreview: function () {
            var el = this.document.createElement('div');

            el.id = 'medium-editor-anchor-preview-' + this.getEditorId();
            el.className = 'medium-editor-anchor-preview';
            el.innerHTML = this.getTemplate();

            this.on(el, 'click', this.handleClick.bind(this));

            return el;
        },

        getTemplate: function () {
            return '<div class="medium-editor-toolbar-anchor-preview" id="medium-editor-toolbar-anchor-preview">' +
                '    <a class="medium-editor-toolbar-anchor-preview-inner"></a>' +
                '</div>';
        },

        destroy: function () {
            if (this.anchorPreview) {
                if (this.anchorPreview.parentNode) {
                    this.anchorPreview.parentNode.removeChild(this.anchorPreview);
                }
                delete this.anchorPreview;
            }
        },

        hidePreview: function () {
            if (this.anchorPreview) {
                this.anchorPreview.classList.remove('medium-editor-anchor-preview-active');
            }
            this.activeAnchor = null;
        },

        showPreview: function (anchorEl) {
            if (this.anchorPreview.classList.contains('medium-editor-anchor-preview-active') ||
                    anchorEl.getAttribute('data-disable-preview')) {
                return true;
            }

            if (this.previewValueSelector) {
                this.anchorPreview.querySelector(this.previewValueSelector).textContent = anchorEl.attributes.href.value;
                this.anchorPreview.querySelector(this.previewValueSelector).href = anchorEl.attributes.href.value;
            }

            this.anchorPreview.classList.add('medium-toolbar-arrow-over');
            this.anchorPreview.classList.remove('medium-toolbar-arrow-under');

            if (!this.anchorPreview.classList.contains('medium-editor-anchor-preview-active')) {
                this.anchorPreview.classList.add('medium-editor-anchor-preview-active');
            }

            this.activeAnchor = anchorEl;

            this.positionPreview();
            this.attachPreviewHandlers();

            return this;
        },

        positionPreview: function (activeAnchor) {
            activeAnchor = activeAnchor || this.activeAnchor;
            var containerWidth = this.window.innerWidth,
                buttonHeight = this.anchorPreview.offsetHeight,
                boundary = activeAnchor.getBoundingClientRect(),
                diffLeft = this.diffLeft,
                diffTop = this.diffTop,
                elementsContainer = this.getEditorOption('elementsContainer'),
                elementsContainerAbsolute = ['absolute', 'fixed'].indexOf(window.getComputedStyle(elementsContainer).getPropertyValue('position')) > -1,
                relativeBoundary = {},
                halfOffsetWidth, defaultLeft, middleBoundary, elementsContainerBoundary, top;

            halfOffsetWidth = this.anchorPreview.offsetWidth / 2;
            var toolbarExtension = this.base.getExtensionByName('toolbar');
            if (toolbarExtension) {
                diffLeft = toolbarExtension.diffLeft;
                diffTop = toolbarExtension.diffTop;
            }
            defaultLeft = diffLeft - halfOffsetWidth;

            // If container element is absolute / fixed, recalculate boundaries to be relative to the container
            if (elementsContainerAbsolute) {
                elementsContainerBoundary = elementsContainer.getBoundingClientRect();
                ['top', 'left'].forEach(function (key) {
                    relativeBoundary[key] = boundary[key] - elementsContainerBoundary[key];
                });

                relativeBoundary.width = boundary.width;
                relativeBoundary.height = boundary.height;
                boundary = relativeBoundary;

                containerWidth = elementsContainerBoundary.width;

                // Adjust top position according to container scroll position
                top = elementsContainer.scrollTop;
            } else {
                // Adjust top position according to window scroll position
                top = this.window.pageYOffset;
            }

            middleBoundary = boundary.left + boundary.width / 2;
            top += buttonHeight + boundary.top + boundary.height - diffTop - this.anchorPreview.offsetHeight;

            this.anchorPreview.style.top = Math.round(top) + 'px';
            this.anchorPreview.style.right = 'initial';
            if (middleBoundary < halfOffsetWidth) {
                this.anchorPreview.style.left = defaultLeft + halfOffsetWidth + 'px';
                this.anchorPreview.style.right = 'initial';
            } else if ((containerWidth - middleBoundary) < halfOffsetWidth) {
                this.anchorPreview.style.left = 'auto';
                this.anchorPreview.style.right = 0;
            } else {
                this.anchorPreview.style.left = defaultLeft + middleBoundary + 'px';
                this.anchorPreview.style.right = 'initial';
            }
        },

        attachToEditables: function () {
            this.subscribe('editableMouseover', this.handleEditableMouseover.bind(this));
            this.subscribe('positionedToolbar', this.handlePositionedToolbar.bind(this));
        },

        handlePositionedToolbar: function () {
            // If the toolbar is visible and positioned, we don't need to hide the preview
            // when showWhenToolbarIsVisible is true
            if (!this.showWhenToolbarIsVisible) {
                this.hidePreview();
            }
        },

        handleClick: function (event) {
            var anchorExtension = this.base.getExtensionByName('anchor'),
                activeAnchor = this.activeAnchor;

            if (anchorExtension && activeAnchor) {
                event.preventDefault();

                this.base.selectElement(this.activeAnchor);

                // Using setTimeout + delay because:
                // We may actually be displaying the anchor form, which should be controlled by delay
                this.base.delay(function () {
                    if (activeAnchor) {
                        var opts = {
                            value: activeAnchor.attributes.href.value,
                            target: activeAnchor.getAttribute('target'),
                            buttonClass: activeAnchor.getAttribute('class')
                        };
                        anchorExtension.showForm(opts);
                        activeAnchor = null;
                    }
                }.bind(this));
            }

            this.hidePreview();
        },

        handleAnchorMouseout: function () {
            this.anchorToPreview = null;
            this.off(this.activeAnchor, 'mouseout', this.instanceHandleAnchorMouseout);
            this.instanceHandleAnchorMouseout = null;
        },

        handleEditableMouseover: function (event) {
            var target = MediumEditor.util.getClosestTag(event.target, 'a');

            if (false === target) {
                return;
            }

            // Detect empty href attributes
            // The browser will make href="" or href="#top"
            // into absolute urls when accessed as event.target.href, so check the html
            if (!this.showOnEmptyLinks &&
                (!/href=["']\S+["']/.test(target.outerHTML) || /href=["']#\S+["']/.test(target.outerHTML))) {
                return true;
            }

            // only show when toolbar is not present
            var toolbar = this.base.getExtensionByName('toolbar');
            if (!this.showWhenToolbarIsVisible && toolbar && toolbar.isDisplayed && toolbar.isDisplayed()) {
                return true;
            }

            // detach handler for other anchor in case we hovered multiple anchors quickly
            if (this.activeAnchor && this.activeAnchor !== target) {
                this.detachPreviewHandlers();
            }

            this.anchorToPreview = target;

            this.instanceHandleAnchorMouseout = this.handleAnchorMouseout.bind(this);
            this.on(this.anchorToPreview, 'mouseout', this.instanceHandleAnchorMouseout);
            // Using setTimeout + delay because:
            // - We're going to show the anchor preview according to the configured delay
            //   if the mouse has not left the anchor tag in that time
            this.base.delay(function () {
                if (this.anchorToPreview) {
                    this.showPreview(this.anchorToPreview);
                }
            }.bind(this));
        },

        handlePreviewMouseover: function () {
            this.lastOver = (new Date()).getTime();
            this.hovering = true;
        },

        handlePreviewMouseout: function (event) {
            if (!event.relatedTarget || !/anchor-preview/.test(event.relatedTarget.className)) {
                this.hovering = false;
            }
        },

        updatePreview: function () {
            if (this.hovering) {
                return true;
            }
            var durr = (new Date()).getTime() - this.lastOver;
            if (durr > this.hideDelay) {
                // hide the preview 1/2 second after mouse leaves the link
                this.detachPreviewHandlers();
            }
        },

        detachPreviewHandlers: function () {
            // cleanup
            clearInterval(this.intervalTimer);
            if (this.instanceHandlePreviewMouseover) {
                this.off(this.anchorPreview, 'mouseover', this.instanceHandlePreviewMouseover);
                this.off(this.anchorPreview, 'mouseout', this.instanceHandlePreviewMouseout);
                if (this.activeAnchor) {
                    this.off(this.activeAnchor, 'mouseover', this.instanceHandlePreviewMouseover);
                    this.off(this.activeAnchor, 'mouseout', this.instanceHandlePreviewMouseout);
                }
            }

            this.hidePreview();

            this.hovering = this.instanceHandlePreviewMouseover = this.instanceHandlePreviewMouseout = null;
        },

        // TODO: break up method and extract out handlers
        attachPreviewHandlers: function () {
            this.lastOver = (new Date()).getTime();
            this.hovering = true;

            this.instanceHandlePreviewMouseover = this.handlePreviewMouseover.bind(this);
            this.instanceHandlePreviewMouseout = this.handlePreviewMouseout.bind(this);

            this.intervalTimer = setInterval(this.updatePreview.bind(this), 200);

            this.on(this.anchorPreview, 'mouseover', this.instanceHandlePreviewMouseover);
            this.on(this.anchorPreview, 'mouseout', this.instanceHandlePreviewMouseout);
            this.on(this.activeAnchor, 'mouseover', this.instanceHandlePreviewMouseover);
            this.on(this.activeAnchor, 'mouseout', this.instanceHandlePreviewMouseout);
        }
    });

    MediumEditor.extensions.anchorPreview = AnchorPreview;
}());

(function () {
    'use strict';

    var WHITESPACE_CHARS,
        KNOWN_TLDS_FRAGMENT,
        LINK_REGEXP_TEXT,
        KNOWN_TLDS_REGEXP,
        LINK_REGEXP;

    WHITESPACE_CHARS = [' ', '\t', '\n', '\r', '\u00A0', '\u2000', '\u2001', '\u2002', '\u2003',
                                    '\u2028', '\u2029'];
    KNOWN_TLDS_FRAGMENT = 'com|net|org|edu|gov|mil|aero|asia|biz|cat|coop|info|int|jobs|mobi|museum|name|post|pro|tel|travel|' +
        'xxx|ac|ad|ae|af|ag|ai|al|am|an|ao|aq|ar|as|at|au|aw|ax|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|' +
        'bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cs|cu|cv|cx|cy|cz|dd|de|dj|dk|dm|do|dz|ec|ee|eg|eh|er|es|et|eu|fi|fj|' +
        'fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|' +
        'is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|' +
        'mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|' +
        'pt|pw|py|qa|re|ro|rs|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|ja|sk|sl|sm|sn|so|sr|ss|st|su|sv|sx|sy|sz|tc|td|tf|tg|th|' +
        'tj|tk|tl|tm|tn|to|tp|tr|tt|tv|tw|tz|ua|ug|uk|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|yu|za|zm|zw';

    LINK_REGEXP_TEXT =
        '(' +
        // Version of Gruber URL Regexp optimized for JS: http://stackoverflow.com/a/17733640
        '((?:(https?://|ftps?://|nntp://)|www\\d{0,3}[.]|[a-z0-9.\\-]+[.](' + KNOWN_TLDS_FRAGMENT + ')\\\/)\\S+(?:[^\\s`!\\[\\]{};:\'\".,?\u00AB\u00BB\u201C\u201D\u2018\u2019]))' +
        // Addition to above Regexp to support bare domains/one level subdomains with common non-i18n TLDs and without www prefix:
        ')|(([a-z0-9\\-]+\\.)?[a-z0-9\\-]+\\.(' + KNOWN_TLDS_FRAGMENT + '))';

    KNOWN_TLDS_REGEXP = new RegExp('^(' + KNOWN_TLDS_FRAGMENT + ')$', 'i');

    LINK_REGEXP = new RegExp(LINK_REGEXP_TEXT, 'gi');

    function nodeIsNotInsideAnchorTag(node) {
        return !MediumEditor.util.getClosestTag(node, 'a');
    }

    var AutoLink = MediumEditor.Extension.extend({
        init: function () {
            MediumEditor.Extension.prototype.init.apply(this, arguments);

            this.disableEventHandling = false;
            this.subscribe('editableKeypress', this.onKeypress.bind(this));
            this.subscribe('editableBlur', this.onBlur.bind(this));
            // MS IE has it's own auto-URL detect feature but ours is better in some ways. Be consistent.
            this.document.execCommand('AutoUrlDetect', false, false);
        },

        isLastInstance: function () {
            var activeInstances = 0;
            for (var i = 0; i < this.window._mediumEditors.length; i++) {
                var editor = this.window._mediumEditors[i];
                if (editor !== null && editor.getExtensionByName('autoLink') !== undefined) {
                    activeInstances++;
                }
            }
            return activeInstances === 1;
        },

        destroy: function () {
            // Turn AutoUrlDetect back on
            if (this.document.queryCommandSupported('AutoUrlDetect') && this.isLastInstance()) {
                this.document.execCommand('AutoUrlDetect', false, true);
            }
        },

        onBlur: function (blurEvent, editable) {
            this.performLinking(editable);
        },

        onKeypress: function (keyPressEvent) {
            if (this.disableEventHandling) {
                return;
            }

            if (MediumEditor.util.isKey(keyPressEvent, [MediumEditor.util.keyCode.SPACE, MediumEditor.util.keyCode.ENTER])) {
                clearTimeout(this.performLinkingTimeout);
                // Saving/restoring the selection in the middle of a keypress doesn't work well...
                this.performLinkingTimeout = setTimeout(function () {
                    try {
                        var sel = this.base.exportSelection();
                        if (this.performLinking(keyPressEvent.target)) {
                            // pass true for favorLaterSelectionAnchor - this is needed for links at the end of a
                            // paragraph in MS IE, or MS IE causes the link to be deleted right after adding it.
                            this.base.importSelection(sel, true);
                        }
                    } catch (e) {
                        if (window.console) {
                            window.console.error('Failed to perform linking', e);
                        }
                        this.disableEventHandling = true;
                    }
                }.bind(this), 0);
            }
        },

        performLinking: function (contenteditable) {
            /*
            Perform linking on blockElement basis, blockElements are HTML elements with text content and without
            child element.

            Example:
            - HTML content
            <blockquote>
              <p>link.</p>
              <p>my</p>
            </blockquote>

            - blockElements
            [<p>link.</p>, <p>my</p>]

            otherwise the detection can wrongly find the end of one paragraph and the beginning of another paragraph
            to constitute a link, such as a paragraph ending "link." and the next paragraph beginning with "my" is
            interpreted into "link.my" and the code tries to create a link across blockElements - which doesn't work
            and is terrible.
            (Medium deletes the spaces/returns between P tags so the textContent ends up without paragraph spacing)
            */
            var blockElements = MediumEditor.util.splitByBlockElements(contenteditable),
                documentModified = false;
            if (blockElements.length === 0) {
                blockElements = [contenteditable];
            }
            for (var i = 0; i < blockElements.length; i++) {
                documentModified = this.removeObsoleteAutoLinkSpans(blockElements[i]) || documentModified;
                documentModified = this.performLinkingWithinElement(blockElements[i]) || documentModified;
            }
            this.base.events.updateInput(contenteditable, { target: contenteditable, currentTarget: contenteditable });
            return documentModified;
        },

        removeObsoleteAutoLinkSpans: function (element) {
            if (!element || element.nodeType === 3) {
                return false;
            }

            var spans = element.querySelectorAll('span[data-auto-link="true"]'),
                documentModified = false;

            for (var i = 0; i < spans.length; i++) {
                var textContent = spans[i].textContent;
                if (textContent.indexOf('://') === -1) {
                    textContent = MediumEditor.util.ensureUrlHasProtocol(textContent);
                }
                if (spans[i].getAttribute('data-href') !== textContent && nodeIsNotInsideAnchorTag(spans[i])) {
                    documentModified = true;
                    var trimmedTextContent = textContent.replace(/\s+$/, '');
                    if (spans[i].getAttribute('data-href') === trimmedTextContent) {
                        var charactersTrimmed = textContent.length - trimmedTextContent.length,
                            subtree = MediumEditor.util.splitOffDOMTree(spans[i], this.splitTextBeforeEnd(spans[i], charactersTrimmed));
                        spans[i].parentNode.insertBefore(subtree, spans[i].nextSibling);
                    } else {
                        // Some editing has happened to the span, so just remove it entirely. The user can put it back
                        // around just the href content if they need to prevent it from linking
                        MediumEditor.util.unwrap(spans[i], this.document);
                    }
                }
            }
            return documentModified;
        },

        splitTextBeforeEnd: function (element, characterCount) {
            var treeWalker = this.document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false),
                lastChildNotExhausted = true;

            // Start the tree walker at the last descendant of the span
            while (lastChildNotExhausted) {
                lastChildNotExhausted = treeWalker.lastChild() !== null;
            }

            var currentNode,
                currentNodeValue,
                previousNode;
            while (characterCount > 0 && previousNode !== null) {
                currentNode = treeWalker.currentNode;
                currentNodeValue = currentNode.nodeValue;
                if (currentNodeValue.length > characterCount) {
                    previousNode = currentNode.splitText(currentNodeValue.length - characterCount);
                    characterCount = 0;
                } else {
                    previousNode = treeWalker.previousNode();
                    characterCount -= currentNodeValue.length;
                }
            }
            return previousNode;
        },

        performLinkingWithinElement: function (element) {
            var matches = this.findLinkableText(element),
                linkCreated = false;

            for (var matchIndex = 0; matchIndex < matches.length; matchIndex++) {
                var matchingTextNodes = MediumEditor.util.findOrCreateMatchingTextNodes(this.document, element,
                        matches[matchIndex]);
                if (this.shouldNotLink(matchingTextNodes)) {
                    continue;
                }
                this.createAutoLink(matchingTextNodes, matches[matchIndex].href);
            }
            return linkCreated;
        },

        shouldNotLink: function (textNodes) {
            var shouldNotLink = false;
            for (var i = 0; i < textNodes.length && shouldNotLink === false; i++) {
                // Do not link if the text node is either inside an anchor or inside span[data-auto-link]
                shouldNotLink = !!MediumEditor.util.traverseUp(textNodes[i], function (node) {
                    return node.nodeName.toLowerCase() === 'a' ||
                        (node.getAttribute && node.getAttribute('data-auto-link') === 'true');
                });
            }
            return shouldNotLink;
        },

        findLinkableText: function (contenteditable) {
            var textContent = contenteditable.textContent,
                match = null,
                matches = [];

            while ((match = LINK_REGEXP.exec(textContent)) !== null) {
                var matchOk = true,
                    matchEnd = match.index + match[0].length;
                // If the regexp detected something as a link that has text immediately preceding/following it, bail out.
                matchOk = (match.index === 0 || WHITESPACE_CHARS.indexOf(textContent[match.index - 1]) !== -1) &&
                    (matchEnd === textContent.length || WHITESPACE_CHARS.indexOf(textContent[matchEnd]) !== -1);
                // If the regexp detected a bare domain that doesn't use one of our expected TLDs, bail out.
                matchOk = matchOk && (match[0].indexOf('/') !== -1 ||
                    KNOWN_TLDS_REGEXP.test(match[0].split('.').pop().split('?').shift()));

                if (matchOk) {
                    matches.push({
                        href: match[0],
                        start: match.index,
                        end: matchEnd
                    });
                }
            }
            return matches;
        },

        createAutoLink: function (textNodes, href) {
            href = MediumEditor.util.ensureUrlHasProtocol(href);
            var anchor = MediumEditor.util.createLink(this.document, textNodes, href, this.getEditorOption('targetBlank') ? '_blank' : null),
                span = this.document.createElement('span');
            span.setAttribute('data-auto-link', 'true');
            span.setAttribute('data-href', href);
            anchor.insertBefore(span, anchor.firstChild);
            while (anchor.childNodes.length > 1) {
                span.appendChild(anchor.childNodes[1]);
            }
        }

    });

    MediumEditor.extensions.autoLink = AutoLink;
}());

(function () {
    'use strict';

    var CLASS_DRAG_OVER = 'medium-editor-dragover';

    function clearClassNames(element) {
        var editable = MediumEditor.util.getContainerEditorElement(element),
            existing = Array.prototype.slice.call(editable.parentElement.querySelectorAll('.' + CLASS_DRAG_OVER));

        existing.forEach(function (el) {
            el.classList.remove(CLASS_DRAG_OVER);
        });
    }

    var FileDragging = MediumEditor.Extension.extend({
        name: 'fileDragging',

        allowedTypes: ['image'],

        init: function () {
            MediumEditor.Extension.prototype.init.apply(this, arguments);

            this.subscribe('editableDrag', this.handleDrag.bind(this));
            this.subscribe('editableDrop', this.handleDrop.bind(this));
        },

        handleDrag: function (event) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';

            var target = event.target.classList ? event.target : event.target.parentElement;

            // Ensure the class gets removed from anything that had it before
            clearClassNames(target);

            if (event.type === 'dragover') {
                target.classList.add(CLASS_DRAG_OVER);
            }
        },

        handleDrop: function (event) {
            // Prevent file from opening in the current window
            event.preventDefault();
            event.stopPropagation();
            // Select the dropping target, and set the selection to the end of the target
            // https://github.com/yabwe/medium-editor/issues/980
            this.base.selectElement(event.target);
            var selection = this.base.exportSelection();
            selection.start = selection.end;
            this.base.importSelection(selection);
            // IE9 does not support the File API, so prevent file from opening in the window
            // but also don't try to actually get the file
            if (event.dataTransfer.files) {
                Array.prototype.slice.call(event.dataTransfer.files).forEach(function (file) {
                    if (this.isAllowedFile(file)) {
                        if (file.type.match('image')) {
                            this.insertImageFile(file);
                        }
                    }
                }, this);
            }

            // Make sure we remove our class from everything
            clearClassNames(event.target);
        },

        isAllowedFile: function (file) {
            return this.allowedTypes.some(function (fileType) {
                return !!file.type.match(fileType);
            });
        },

        insertImageFile: function (file) {
            if (typeof FileReader !== 'function') {
                return;
            }
            var fileReader = new FileReader();
            fileReader.readAsDataURL(file);

            // attach the onload event handler, makes it easier to listen in with jasmine
            fileReader.addEventListener('load', function (e) {
                var addImageElement = this.document.createElement('img');
                addImageElement.src = e.target.result;
                MediumEditor.util.insertHTMLCommand(this.document, addImageElement.outerHTML);
            }.bind(this));
        }
    });

    MediumEditor.extensions.fileDragging = FileDragging;
}());

(function () {
    'use strict';

    var KeyboardCommands = MediumEditor.Extension.extend({
        name: 'keyboard-commands',

        /* KeyboardCommands Options */

        /* commands: [Array]
         * Array of objects describing each command and the combination of keys that will trigger it
         * Required for each object:
         *   command [String] (argument passed to editor.execAction())
         *   key [String] (keyboard character that triggers this command)
         *   meta [boolean] (whether the ctrl/meta key has to be active or inactive)
         *   shift [boolean] (whether the shift key has to be active or inactive)
         *   alt [boolean] (whether the alt key has to be active or inactive)
         */
        commands: [
            {
                command: 'bold',
                key: 'B',
                meta: true,
                shift: false,
                alt: false
            },
            {
                command: 'italic',
                key: 'I',
                meta: true,
                shift: false,
                alt: false
            },
            {
                command: 'underline',
                key: 'U',
                meta: true,
                shift: false,
                alt: false
            }
        ],

        init: function () {
            MediumEditor.Extension.prototype.init.apply(this, arguments);

            this.subscribe('editableKeydown', this.handleKeydown.bind(this));
            this.keys = {};
            this.commands.forEach(function (command) {
                var keyCode = command.key.charCodeAt(0);
                if (!this.keys[keyCode]) {
                    this.keys[keyCode] = [];
                }
                this.keys[keyCode].push(command);
            }, this);
        },

        handleKeydown: function (event) {
            var keyCode = MediumEditor.util.getKeyCode(event);
            if (!this.keys[keyCode]) {
                return;
            }

            var isMeta = MediumEditor.util.isMetaCtrlKey(event),
                isShift = !!event.shiftKey,
                isAlt = !!event.altKey;

            this.keys[keyCode].forEach(function (data) {
                if (data.meta === isMeta &&
                    data.shift === isShift &&
                    (data.alt === isAlt ||
                     undefined === data.alt)) { // TODO deprecated: remove check for undefined === data.alt when jumping to 6.0.0
                    event.preventDefault();
                    event.stopPropagation();

                    // command can be a function to execute
                    if (typeof data.command === 'function') {
                        data.command.apply(this);
                    }
                    // command can be false so the shortcut is just disabled
                    else if (false !== data.command) {
                        this.execAction(data.command);
                    }
                }
            }, this);
        }
    });

    MediumEditor.extensions.keyboardCommands = KeyboardCommands;
}());

(function () {
    'use strict';

    var FontNameForm = MediumEditor.extensions.form.extend({

        name: 'fontname',
        action: 'fontName',
        aria: 'change font name',
        contentDefault: '&#xB1;', // ±
        contentFA: '<i class="fa fa-font"></i>',

        fonts: ['', 'Arial', 'Verdana', 'Times New Roman'],

        init: function () {
            MediumEditor.extensions.form.prototype.init.apply(this, arguments);
        },

        // Called when the button the toolbar is clicked
        // Overrides ButtonExtension.handleClick
        handleClick: function (event) {
            event.preventDefault();
            event.stopPropagation();

            if (!this.isDisplayed()) {
                // Get FontName of current selection (convert to string since IE returns this as number)
                var fontName = this.document.queryCommandValue('fontName') + '';
                this.showForm(fontName);
            }

            return false;
        },

        // Called by medium-editor to append form to the toolbar
        getForm: function () {
            if (!this.form) {
                this.form = this.createForm();
            }
            return this.form;
        },

        // Used by medium-editor when the default toolbar is to be displayed
        isDisplayed: function () {
            return this.getForm().style.display === 'block';
        },

        hideForm: function () {
            this.getForm().style.display = 'none';
            this.getSelect().value = '';
        },

        showForm: function (fontName) {
            var select = this.getSelect();

            this.base.saveSelection();
            this.hideToolbarDefaultActions();
            this.getForm().style.display = 'block';
            this.setToolbarPosition();

            select.value = fontName || '';
            select.focus();
        },

        // Called by core when tearing down medium-editor (destroy)
        destroy: function () {
            if (!this.form) {
                return false;
            }

            if (this.form.parentNode) {
                this.form.parentNode.removeChild(this.form);
            }

            delete this.form;
        },

        // core methods

        doFormSave: function () {
            this.base.restoreSelection();
            this.base.checkSelection();
        },

        doFormCancel: function () {
            this.base.restoreSelection();
            this.clearFontName();
            this.base.checkSelection();
        },

        // form creation and event handling
        createForm: function () {
            var doc = this.document,
                form = doc.createElement('div'),
                select = doc.createElement('select'),
                close = doc.createElement('a'),
                save = doc.createElement('a'),
                option;

            // Font Name Form (div)
            form.className = 'medium-editor-toolbar-form';
            form.id = 'medium-editor-toolbar-form-fontname-' + this.getEditorId();

            // Handle clicks on the form itself
            this.on(form, 'click', this.handleFormClick.bind(this));

            // Add font names
            for (var i = 0; i<this.fonts.length; i++) {
                option = doc.createElement('option');
                option.innerHTML = this.fonts[i];
                option.value = this.fonts[i];
                select.appendChild(option);
            }

            select.className = 'medium-editor-toolbar-select';
            form.appendChild(select);

            // Handle typing in the textbox
            this.on(select, 'change', this.handleFontChange.bind(this));

            // Add save buton
            save.setAttribute('href', '#');
            save.className = 'medium-editor-toobar-save';
            save.innerHTML = this.getEditorOption('buttonLabels') === 'fontawesome' ?
                             '<i class="fa fa-check"></i>' :
                             '&#10003;';
            form.appendChild(save);

            // Handle save button clicks (capture)
            this.on(save, 'click', this.handleSaveClick.bind(this), true);

            // Add close button
            close.setAttribute('href', '#');
            close.className = 'medium-editor-toobar-close';
            close.innerHTML = this.getEditorOption('buttonLabels') === 'fontawesome' ?
                              '<i class="fa fa-times"></i>' :
                              '&times;';
            form.appendChild(close);

            // Handle close button clicks
            this.on(close, 'click', this.handleCloseClick.bind(this));

            return form;
        },

        getSelect: function () {
            return this.getForm().querySelector('select.medium-editor-toolbar-select');
        },

        clearFontName: function () {
            MediumEditor.selection.getSelectedElements(this.document).forEach(function (el) {
                if (el.nodeName.toLowerCase() === 'font' && el.hasAttribute('face')) {
                    el.removeAttribute('face');
                }
            });
        },

        handleFontChange: function () {
            var font = this.getSelect().value;
            if (font === '') {
                this.clearFontName();
            } else {
                this.execAction('fontName', { value: font });
            }
        },

        handleFormClick: function (event) {
            // make sure not to hide form when clicking inside the form
            event.stopPropagation();
        },

        handleSaveClick: function (event) {
            // Clicking Save -> create the font size
            event.preventDefault();
            this.doFormSave();
        },

        handleCloseClick: function (event) {
            // Click Close -> close the form
            event.preventDefault();
            this.doFormCancel();
        }
    });

    MediumEditor.extensions.fontName = FontNameForm;
}());

(function () {
    'use strict';

    var FontSizeForm = MediumEditor.extensions.form.extend({

        name: 'fontsize',
        action: 'fontSize',
        aria: 'increase/decrease font size',
        contentDefault: '&#xB1;', // ±
        contentFA: '<i class="fa fa-text-height"></i>',

        init: function () {
            MediumEditor.extensions.form.prototype.init.apply(this, arguments);
        },

        // Called when the button the toolbar is clicked
        // Overrides ButtonExtension.handleClick
        handleClick: function (event) {
            event.preventDefault();
            event.stopPropagation();

            if (!this.isDisplayed()) {
                // Get fontsize of current selection (convert to string since IE returns this as number)
                var fontSize = this.document.queryCommandValue('fontSize') + '';
                this.showForm(fontSize);
            }

            return false;
        },

        // Called by medium-editor to append form to the toolbar
        getForm: function () {
            if (!this.form) {
                this.form = this.createForm();
            }
            return this.form;
        },

        // Used by medium-editor when the default toolbar is to be displayed
        isDisplayed: function () {
            return this.getForm().style.display === 'block';
        },

        hideForm: function () {
            this.getForm().style.display = 'none';
            this.getInput().value = '';
        },

        showForm: function (fontSize) {
            var input = this.getInput();

            this.base.saveSelection();
            this.hideToolbarDefaultActions();
            this.getForm().style.display = 'block';
            this.setToolbarPosition();

            input.value = fontSize || '';
            input.focus();
        },

        // Called by core when tearing down medium-editor (destroy)
        destroy: function () {
            if (!this.form) {
                return false;
            }

            if (this.form.parentNode) {
                this.form.parentNode.removeChild(this.form);
            }

            delete this.form;
        },

        // core methods

        doFormSave: function () {
            this.base.restoreSelection();
            this.base.checkSelection();
        },

        doFormCancel: function () {
            this.base.restoreSelection();
            this.clearFontSize();
            this.base.checkSelection();
        },

        // form creation and event handling
        createForm: function () {
            var doc = this.document,
                form = doc.createElement('div'),
                input = doc.createElement('input'),
                close = doc.createElement('a'),
                save = doc.createElement('a');

            // Font Size Form (div)
            form.className = 'medium-editor-toolbar-form';
            form.id = 'medium-editor-toolbar-form-fontsize-' + this.getEditorId();

            // Handle clicks on the form itself
            this.on(form, 'click', this.handleFormClick.bind(this));

            // Add font size slider
            input.setAttribute('type', 'range');
            input.setAttribute('min', '1');
            input.setAttribute('max', '7');
            input.className = 'medium-editor-toolbar-input';
            form.appendChild(input);

            // Handle typing in the textbox
            this.on(input, 'change', this.handleSliderChange.bind(this));

            // Add save buton
            save.setAttribute('href', '#');
            save.className = 'medium-editor-toobar-save';
            save.innerHTML = this.getEditorOption('buttonLabels') === 'fontawesome' ?
                             '<i class="fa fa-check"></i>' :
                             '&#10003;';
            form.appendChild(save);

            // Handle save button clicks (capture)
            this.on(save, 'click', this.handleSaveClick.bind(this), true);

            // Add close button
            close.setAttribute('href', '#');
            close.className = 'medium-editor-toobar-close';
            close.innerHTML = this.getEditorOption('buttonLabels') === 'fontawesome' ?
                              '<i class="fa fa-times"></i>' :
                              '&times;';
            form.appendChild(close);

            // Handle close button clicks
            this.on(close, 'click', this.handleCloseClick.bind(this));

            return form;
        },

        getInput: function () {
            return this.getForm().querySelector('input.medium-editor-toolbar-input');
        },

        clearFontSize: function () {
            MediumEditor.selection.getSelectedElements(this.document).forEach(function (el) {
                if (el.nodeName.toLowerCase() === 'font' && el.hasAttribute('size')) {
                    el.removeAttribute('size');
                }
            });
        },

        handleSliderChange: function () {
            var size = this.getInput().value;
            if (size === '4') {
                this.clearFontSize();
            } else {
                this.execAction('fontSize', { value: size });
            }
        },

        handleFormClick: function (event) {
            // make sure not to hide form when clicking inside the form
            event.stopPropagation();
        },

        handleSaveClick: function (event) {
            // Clicking Save -> create the font size
            event.preventDefault();
            this.doFormSave();
        },

        handleCloseClick: function (event) {
            // Click Close -> close the form
            event.preventDefault();
            this.doFormCancel();
        }
    });

    MediumEditor.extensions.fontSize = FontSizeForm;
}());
(function () {
    'use strict';

    /* Helpers and internal variables that don't need to be members of actual paste handler */

    var pasteBinDefaultContent = '%ME_PASTEBIN%',
        lastRange = null,
        keyboardPasteEditable = null,
        stopProp = function (event) {
            event.stopPropagation();
        };

    /*jslint regexp: true*/
    /*
        jslint does not allow character negation, because the negation
        will not match any unicode characters. In the regexes in this
        block, negation is used specifically to match the end of an html
        tag, and in fact unicode characters *should* be allowed.
    */
    function createReplacements() {
        return [
            // Remove anything but the contents within the BODY element
            [new RegExp(/^[\s\S]*<body[^>]*>\s*|\s*<\/body[^>]*>[\s\S]*$/g), ''],

            // cleanup comments added by Chrome when pasting html
            [new RegExp(/<!--StartFragment-->|<!--EndFragment-->/g), ''],

            // Trailing BR elements
            [new RegExp(/<br>$/i), ''],

            // replace two bogus tags that begin pastes from google docs
            [new RegExp(/<[^>]*docs-internal-guid[^>]*>/gi), ''],
            [new RegExp(/<\/b>(<br[^>]*>)?$/gi), ''],

             // un-html spaces and newlines inserted by OS X
            [new RegExp(/<span class="Apple-converted-space">\s+<\/span>/g), ' '],
            [new RegExp(/<br class="Apple-interchange-newline">/g), '<br>'],

            // replace google docs italics+bold with a span to be replaced once the html is inserted
            [new RegExp(/<span[^>]*(font-style:italic;font-weight:(bold|700)|font-weight:(bold|700);font-style:italic)[^>]*>/gi), '<span class="replace-with italic bold">'],

            // replace google docs italics with a span to be replaced once the html is inserted
            [new RegExp(/<span[^>]*font-style:italic[^>]*>/gi), '<span class="replace-with italic">'],

            //[replace google docs bolds with a span to be replaced once the html is inserted
            [new RegExp(/<span[^>]*font-weight:(bold|700)[^>]*>/gi), '<span class="replace-with bold">'],

             // replace manually entered b/i/a tags with real ones
            [new RegExp(/&lt;(\/?)(i|b|a)&gt;/gi), '<$1$2>'],

             // replace manually a tags with real ones, converting smart-quotes from google docs
            [new RegExp(/&lt;a(?:(?!href).)+href=(?:&quot;|&rdquo;|&ldquo;|"|“|”)(((?!&quot;|&rdquo;|&ldquo;|"|“|”).)*)(?:&quot;|&rdquo;|&ldquo;|"|“|”)(?:(?!&gt;).)*&gt;/gi), '<a href="$1">'],

            // Newlines between paragraphs in html have no syntactic value,
            // but then have a tendency to accidentally become additional paragraphs down the line
            [new RegExp(/<\/p>\n+/gi), '</p>'],
            [new RegExp(/\n+<p/gi), '<p'],

            // Microsoft Word makes these odd tags, like <o:p></o:p>
            [new RegExp(/<\/?o:[a-z]*>/gi), ''],

            // Microsoft Word adds some special elements around list items
            [new RegExp(/<!\[if !supportLists\]>(((?!<!).)*)<!\[endif]\>/gi), '$1']
        ];
    }
    /*jslint regexp: false*/

    /**
     * Gets various content types out of the Clipboard API. It will also get the
     * plain text using older IE and WebKit API.
     *
     * @param {event} event Event fired on paste.
     * @param {win} reference to window
     * @param {doc} reference to document
     * @return {Object} Object with mime types and data for those mime types.
     */
    function getClipboardContent(event, win, doc) {
        var dataTransfer = event.clipboardData || win.clipboardData || doc.dataTransfer,
            data = {};

        if (!dataTransfer) {
            return data;
        }

        // Use old WebKit/IE API
        if (dataTransfer.getData) {
            var legacyText = dataTransfer.getData('Text');
            if (legacyText && legacyText.length > 0) {
                data['text/plain'] = legacyText;
            }
        }

        if (dataTransfer.types) {
            for (var i = 0; i < dataTransfer.types.length; i++) {
                var contentType = dataTransfer.types[i];
                data[contentType] = dataTransfer.getData(contentType);
            }
        }

        return data;
    }

    var PasteHandler = MediumEditor.Extension.extend({
        /* Paste Options */

        /* forcePlainText: [boolean]
         * Forces pasting as plain text.
         */
        forcePlainText: true,

        /* cleanPastedHTML: [boolean]
         * cleans pasted content from different sources, like google docs etc.
         */
        cleanPastedHTML: false,

        /* preCleanReplacements: [Array]
         * custom pairs (2 element arrays) of RegExp and replacement text to use during past when
         * __forcePlainText__ or __cleanPastedHTML__ are `true` OR when calling `cleanPaste(text)` helper method.
         * These replacements are executed before any medium editor defined replacements.
         */
        preCleanReplacements: [],

        /* cleanReplacements: [Array]
         * custom pairs (2 element arrays) of RegExp and replacement text to use during paste when
         * __forcePlainText__ or __cleanPastedHTML__ are `true` OR when calling `cleanPaste(text)` helper method.
         * These replacements are executed after any medium editor defined replacements.
         */
        cleanReplacements: [],

        /* cleanAttrs:: [Array]
         * list of element attributes to remove during paste when __cleanPastedHTML__ is `true` or when
         * calling `cleanPaste(text)` or `pasteHTML(html, options)` helper methods.
         */
        cleanAttrs: ['class', 'style', 'dir'],

        /* cleanTags: [Array]
         * list of element tag names to remove during paste when __cleanPastedHTML__ is `true` or when
         * calling `cleanPaste(text)` or `pasteHTML(html, options)` helper methods.
         */
        cleanTags: ['meta'],

        /* unwrapTags: [Array]
         * list of element tag names to unwrap (remove the element tag but retain its child elements)
         * during paste when __cleanPastedHTML__ is `true` or when
         * calling `cleanPaste(text)` or `pasteHTML(html, options)` helper methods.
         */
        unwrapTags: [],

        init: function () {
            MediumEditor.Extension.prototype.init.apply(this, arguments);

            if (this.forcePlainText || this.cleanPastedHTML) {
                this.subscribe('editableKeydown', this.handleKeydown.bind(this));
                // We need access to the full event data in paste
                // so we can't use the editablePaste event here
                this.getEditorElements().forEach(function (element) {
                    this.on(element, 'paste', this.handlePaste.bind(this));
                }, this);
                this.subscribe('addElement', this.handleAddElement.bind(this));
            }
        },

        handleAddElement: function (event, editable) {
            this.on(editable, 'paste', this.handlePaste.bind(this));
        },

        destroy: function () {
            // Make sure pastebin is destroyed in case it's still around for some reason
            if (this.forcePlainText || this.cleanPastedHTML) {
                this.removePasteBin();
            }
        },

        handlePaste: function (event, editable) {
            if (event.defaultPrevented) {
                return;
            }

            var clipboardContent = getClipboardContent(event, this.window, this.document),
                pastedHTML = clipboardContent['text/html'],
                pastedPlain = clipboardContent['text/plain'];

            if (this.window.clipboardData && event.clipboardData === undefined && !pastedHTML) {
                // If window.clipboardData exists, but event.clipboardData doesn't exist,
                // we're probably in IE. IE only has two possibilities for clipboard
                // data format: 'Text' and 'URL'.
                //
                // For IE, we'll fallback to 'Text' for text/html
                pastedHTML = pastedPlain;
            }

            if (pastedHTML || pastedPlain) {
                event.preventDefault();

                this.doPaste(pastedHTML, pastedPlain, editable);
            }
        },

        doPaste: function (pastedHTML, pastedPlain, editable) {
            var paragraphs,
                html = '',
                p;

            if (this.cleanPastedHTML && pastedHTML) {
                return this.cleanPaste(pastedHTML);
            }

            if (!(this.getEditorOption('disableReturn') || (editable && editable.getAttribute('data-disable-return')))) {
                paragraphs = pastedPlain.split(/[\r\n]+/g);
                // If there are no \r\n in data, don't wrap in <p>
                if (paragraphs.length > 1) {
                    for (p = 0; p < paragraphs.length; p += 1) {
                        if (paragraphs[p] !== '') {
                            html += '<p>' + MediumEditor.util.htmlEntities(paragraphs[p]) + '</p>';
                        }
                    }
                } else {
                    html = MediumEditor.util.htmlEntities(paragraphs[0]);
                }
            } else {
                html = MediumEditor.util.htmlEntities(pastedPlain);
            }
            MediumEditor.util.insertHTMLCommand(this.document, html);
        },

        handlePasteBinPaste: function (event) {
            if (event.defaultPrevented) {
                this.removePasteBin();
                return;
            }

            var clipboardContent = getClipboardContent(event, this.window, this.document),
                pastedHTML = clipboardContent['text/html'],
                pastedPlain = clipboardContent['text/plain'],
                editable = keyboardPasteEditable;

            // If we have valid html already, or we're not in cleanPastedHTML mode
            // we can ignore the paste bin and just paste now
            if (!this.cleanPastedHTML || pastedHTML) {
                event.preventDefault();
                this.removePasteBin();
                this.doPaste(pastedHTML, pastedPlain, editable);

                // The event handling code listens for paste on the editable element
                // in order to trigger the editablePaste event.  Since this paste event
                // is happening on the pastebin, the event handling code never knows about it
                // So, we have to trigger editablePaste manually
                this.trigger('editablePaste', { currentTarget: editable, target: editable }, editable);
                return;
            }

            // We need to look at the paste bin, so do a setTimeout to let the paste
            // fall through into the paste bin
            setTimeout(function () {
                // Only look for HTML if we're in cleanPastedHTML mode
                if (this.cleanPastedHTML) {
                    // If clipboard didn't have HTML, try the paste bin
                    pastedHTML = this.getPasteBinHtml();
                }

                // If we needed the paste bin, we're done with it now, remove it
                this.removePasteBin();

                // Handle the paste with the html from the paste bin
                this.doPaste(pastedHTML, pastedPlain, editable);

                // The event handling code listens for paste on the editable element
                // in order to trigger the editablePaste event.  Since this paste event
                // is happening on the pastebin, the event handling code never knows about it
                // So, we have to trigger editablePaste manually
                this.trigger('editablePaste', { currentTarget: editable, target: editable }, editable);
            }.bind(this), 0);
        },

        handleKeydown: function (event, editable) {
            // if it's not Ctrl+V, do nothing
            if (!(MediumEditor.util.isKey(event, MediumEditor.util.keyCode.V) && MediumEditor.util.isMetaCtrlKey(event))) {
                return;
            }

            event.stopImmediatePropagation();

            this.removePasteBin();
            this.createPasteBin(editable);
        },

        createPasteBin: function (editable) {
            var rects,
                range = MediumEditor.selection.getSelectionRange(this.document),
                top = this.window.pageYOffset;

            keyboardPasteEditable = editable;

            if (range) {
                rects = range.getClientRects();

                // on empty line, rects is empty so we grab information from the first container of the range
                if (rects.length) {
                    top += rects[0].top;
                } else if (range.startContainer.getBoundingClientRect !== undefined) {
                    top += range.startContainer.getBoundingClientRect().top;
                } else {
                    top += range.getBoundingClientRect().top;
                }
            }

            lastRange = range;

            var pasteBinElm = this.document.createElement('div');
            pasteBinElm.id = this.pasteBinId = 'medium-editor-pastebin-' + (+Date.now());
            pasteBinElm.setAttribute('style', 'border: 1px red solid; position: absolute; top: ' + top + 'px; width: 10px; height: 10px; overflow: hidden; opacity: 0');
            pasteBinElm.setAttribute('contentEditable', true);
            pasteBinElm.innerHTML = pasteBinDefaultContent;

            this.document.body.appendChild(pasteBinElm);

            // avoid .focus() to stop other event (actually the paste event)
            this.on(pasteBinElm, 'focus', stopProp);
            this.on(pasteBinElm, 'focusin', stopProp);
            this.on(pasteBinElm, 'focusout', stopProp);

            pasteBinElm.focus();

            MediumEditor.selection.selectNode(pasteBinElm, this.document);

            if (!this.boundHandlePaste) {
                this.boundHandlePaste = this.handlePasteBinPaste.bind(this);
            }

            this.on(pasteBinElm, 'paste', this.boundHandlePaste);
        },

        removePasteBin: function () {
            if (null !== lastRange) {
                MediumEditor.selection.selectRange(this.document, lastRange);
                lastRange = null;
            }

            if (null !== keyboardPasteEditable) {
                keyboardPasteEditable = null;
            }

            var pasteBinElm = this.getPasteBin();
            if (!pasteBinElm) {
                return;
            }

            if (pasteBinElm) {
                this.off(pasteBinElm, 'focus', stopProp);
                this.off(pasteBinElm, 'focusin', stopProp);
                this.off(pasteBinElm, 'focusout', stopProp);
                this.off(pasteBinElm, 'paste', this.boundHandlePaste);
                pasteBinElm.parentElement.removeChild(pasteBinElm);
            }
        },

        getPasteBin: function () {
            return this.document.getElementById(this.pasteBinId);
        },

        getPasteBinHtml: function () {
            var pasteBinElm = this.getPasteBin();

            if (!pasteBinElm) {
                return false;
            }

            // WebKit has a nice bug where it clones the paste bin if you paste from for example notepad
            // so we need to force plain text mode in this case
            if (pasteBinElm.firstChild && pasteBinElm.firstChild.id === 'mcepastebin') {
                return false;
            }

            var pasteBinHtml = pasteBinElm.innerHTML;

            // If paste bin is empty try using plain text mode
            // since that is better than nothing right
            if (!pasteBinHtml || pasteBinHtml === pasteBinDefaultContent) {
                return false;
            }

            return pasteBinHtml;
        },

        cleanPaste: function (text) {
            var i, elList, tmp, workEl,
                multiline = /<p|<br|<div/.test(text),
                replacements = [].concat(
                    this.preCleanReplacements || [],
                    createReplacements(),
                    this.cleanReplacements || []);

            for (i = 0; i < replacements.length; i += 1) {
                text = text.replace(replacements[i][0], replacements[i][1]);
            }

            if (!multiline) {
                return this.pasteHTML(text);
            }

            // create a temporary div to cleanup block elements
            tmp = this.document.createElement('div');

            // double br's aren't converted to p tags, but we want paragraphs.
            tmp.innerHTML = '<p>' + text.split('<br><br>').join('</p><p>') + '</p>';

            // block element cleanup
            elList = tmp.querySelectorAll('a,p,div,br');
            for (i = 0; i < elList.length; i += 1) {
                workEl = elList[i];

                // Microsoft Word replaces some spaces with newlines.
                // While newlines between block elements are meaningless, newlines within
                // elements are sometimes actually spaces.
                workEl.innerHTML = workEl.innerHTML.replace(/\n/gi, ' ');

                switch (workEl.nodeName.toLowerCase()) {
                    case 'p':
                    case 'div':
                        this.filterCommonBlocks(workEl);
                        break;
                    case 'br':
                        this.filterLineBreak(workEl);
                        break;
                }
            }

            this.pasteHTML(tmp.innerHTML);
        },

        pasteHTML: function (html, options) {
            options = MediumEditor.util.defaults({}, options, {
                cleanAttrs: this.cleanAttrs,
                cleanTags: this.cleanTags,
                unwrapTags: this.unwrapTags
            });

            var elList, workEl, i, fragmentBody, pasteBlock = this.document.createDocumentFragment();

            pasteBlock.appendChild(this.document.createElement('body'));

            fragmentBody = pasteBlock.querySelector('body');
            fragmentBody.innerHTML = html;

            this.cleanupSpans(fragmentBody);

            elList = fragmentBody.querySelectorAll('*');
            for (i = 0; i < elList.length; i += 1) {
                workEl = elList[i];

                if ('a' === workEl.nodeName.toLowerCase() && this.getEditorOption('targetBlank')) {
                    MediumEditor.util.setTargetBlank(workEl);
                }

                MediumEditor.util.cleanupAttrs(workEl, options.cleanAttrs);
                MediumEditor.util.cleanupTags(workEl, options.cleanTags);
                MediumEditor.util.unwrapTags(workEl, options.unwrapTags);
            }

            MediumEditor.util.insertHTMLCommand(this.document, fragmentBody.innerHTML.replace(/&nbsp;/g, ' '));
        },

        // TODO (6.0): Make this an internal helper instead of member of paste handler
        isCommonBlock: function (el) {
            return (el && (el.nodeName.toLowerCase() === 'p' || el.nodeName.toLowerCase() === 'div'));
        },

        // TODO (6.0): Make this an internal helper instead of member of paste handler
        filterCommonBlocks: function (el) {
            if (/^\s*$/.test(el.textContent) && el.parentNode) {
                el.parentNode.removeChild(el);
            }
        },

        // TODO (6.0): Make this an internal helper instead of member of paste handler
        filterLineBreak: function (el) {
            if (this.isCommonBlock(el.previousElementSibling)) {
                // remove stray br's following common block elements
                this.removeWithParent(el);
            } else if (this.isCommonBlock(el.parentNode) && (el.parentNode.firstChild === el || el.parentNode.lastChild === el)) {
                // remove br's just inside open or close tags of a div/p
                this.removeWithParent(el);
            } else if (el.parentNode && el.parentNode.childElementCount === 1 && el.parentNode.textContent === '') {
                // and br's that are the only child of elements other than div/p
                this.removeWithParent(el);
            }
        },

        // TODO (6.0): Make this an internal helper instead of member of paste handler
        // remove an element, including its parent, if it is the only element within its parent
        removeWithParent: function (el) {
            if (el && el.parentNode) {
                if (el.parentNode.parentNode && el.parentNode.childElementCount === 1) {
                    el.parentNode.parentNode.removeChild(el.parentNode);
                } else {
                    el.parentNode.removeChild(el);
                }
            }
        },

        // TODO (6.0): Make this an internal helper instead of member of paste handler
        cleanupSpans: function (containerEl) {
            var i,
                el,
                newEl,
                spans = containerEl.querySelectorAll('.replace-with'),
                isCEF = function (el) {
                    return (el && el.nodeName !== '#text' && el.getAttribute('contenteditable') === 'false');
                };

            for (i = 0; i < spans.length; i += 1) {
                el = spans[i];
                newEl = this.document.createElement(el.classList.contains('bold') ? 'b' : 'i');

                if (el.classList.contains('bold') && el.classList.contains('italic')) {
                    // add an i tag as well if this has both italics and bold
                    newEl.innerHTML = '<i>' + el.innerHTML + '</i>';
                } else {
                    newEl.innerHTML = el.innerHTML;
                }
                el.parentNode.replaceChild(newEl, el);
            }

            spans = containerEl.querySelectorAll('span');
            for (i = 0; i < spans.length; i += 1) {
                el = spans[i];

                // bail if span is in contenteditable = false
                if (MediumEditor.util.traverseUp(el, isCEF)) {
                    return false;
                }

                // remove empty spans, replace others with their contents
                MediumEditor.util.unwrap(el, this.document);
            }
        }
    });

    MediumEditor.extensions.paste = PasteHandler;
}());

(function () {
    'use strict';

    var Placeholder = MediumEditor.Extension.extend({
        name: 'placeholder',

        /* Placeholder Options */

        /* text: [string]
         * Text to display in the placeholder
         */
        text: 'Type your text',

        /* hideOnClick: [boolean]
         * Should we hide the placeholder on click (true) or when user starts typing (false)
         */
        hideOnClick: true,

        init: function () {
            MediumEditor.Extension.prototype.init.apply(this, arguments);

            this.initPlaceholders();
            this.attachEventHandlers();
        },

        initPlaceholders: function () {
            this.getEditorElements().forEach(this.initElement, this);
        },

        handleAddElement: function (event, editable) {
            this.initElement(editable);
        },

        initElement: function (el) {
            if (!el.getAttribute('data-placeholder')) {
                el.setAttribute('data-placeholder', this.text);
            }
            this.updatePlaceholder(el);
        },

        destroy: function () {
            this.getEditorElements().forEach(this.cleanupElement, this);
        },

        handleRemoveElement: function (event, editable) {
            this.cleanupElement(editable);
        },

        cleanupElement: function (el) {
            if (el.getAttribute('data-placeholder') === this.text) {
                el.removeAttribute('data-placeholder');
            }
        },

        showPlaceholder: function (el) {
            if (el) {
                // https://github.com/yabwe/medium-editor/issues/234
                // In firefox, styling the placeholder with an absolutely positioned
                // pseudo element causes the cursor to appear in a bad location
                // when the element is completely empty, so apply a different class to
                // style it with a relatively positioned pseudo element
                if (MediumEditor.util.isFF && el.childNodes.length === 0) {
                    el.classList.add('medium-editor-placeholder-relative');
                    el.classList.remove('medium-editor-placeholder');
                } else {
                    el.classList.add('medium-editor-placeholder');
                    el.classList.remove('medium-editor-placeholder-relative');
                }
            }
        },

        hidePlaceholder: function (el) {
            if (el) {
                el.classList.remove('medium-editor-placeholder');
                el.classList.remove('medium-editor-placeholder-relative');
            }
        },

        updatePlaceholder: function (el, dontShow) {
            // If the element has content, hide the placeholder
            if (el.querySelector('img, blockquote, ul, ol, table') || (el.textContent.replace(/^\s+|\s+$/g, '') !== '')) {
                return this.hidePlaceholder(el);
            }

            if (!dontShow) {
                this.showPlaceholder(el);
            }
        },

        attachEventHandlers: function () {
            if (this.hideOnClick) {
                // For the 'hideOnClick' option, the placeholder should always be hidden on focus
                this.subscribe('focus', this.handleFocus.bind(this));
            }

            // If the editor has content, it should always hide the placeholder
            this.subscribe('editableInput', this.handleInput.bind(this));

            // When the editor loses focus, check if the placeholder should be visible
            this.subscribe('blur', this.handleBlur.bind(this));

            // Need to know when elements are added/removed from the editor
            this.subscribe('addElement', this.handleAddElement.bind(this));
            this.subscribe('removeElement', this.handleRemoveElement.bind(this));
        },

        handleInput: function (event, element) {
            // If the placeholder should be hidden on focus and the
            // element has focus, don't show the placeholder
            var dontShow = this.hideOnClick && (element === this.base.getFocusedElement());

            // Editor's content has changed, check if the placeholder should be hidden
            this.updatePlaceholder(element, dontShow);
        },

        handleFocus: function (event, element) {
            // Editor has focus, hide the placeholder
            this.hidePlaceholder(element);
        },

        handleBlur: function (event, element) {
            // Editor has lost focus, check if the placeholder should be shown
            this.updatePlaceholder(element);
        }
    });

    MediumEditor.extensions.placeholder = Placeholder;
}());

(function () {
    'use strict';

    var Toolbar = MediumEditor.Extension.extend({
        name: 'toolbar',

        /* Toolbar Options */

        /* align: ['left'|'center'|'right']
         * When the __static__ option is true, this aligns the static toolbar
         * relative to the medium-editor element.
         */
        align: 'center',

        /* allowMultiParagraphSelection: [boolean]
         * enables/disables whether the toolbar should be displayed when
         * selecting multiple paragraphs/block elements
         */
        allowMultiParagraphSelection: true,

        /* buttons: [Array]
         * the names of the set of buttons to display on the toolbar.
         */
        buttons: ['bold', 'italic', 'underline', 'anchor', 'h2', 'h3', 'quote'],

        /* diffLeft: [Number]
         * value in pixels to be added to the X axis positioning of the toolbar.
         */
        diffLeft: 0,

        /* diffTop: [Number]
         * value in pixels to be added to the Y axis positioning of the toolbar.
         */
        diffTop: -10,

        /* firstButtonClass: [string]
         * CSS class added to the first button in the toolbar.
         */
        firstButtonClass: 'medium-editor-button-first',

        /* lastButtonClass: [string]
         * CSS class added to the last button in the toolbar.
         */
        lastButtonClass: 'medium-editor-button-last',

        /* standardizeSelectionStart: [boolean]
         * enables/disables standardizing how the beginning of a range is decided
         * between browsers whenever the selected text is analyzed for updating toolbar buttons status.
         */
        standardizeSelectionStart: false,

        /* static: [boolean]
         * enable/disable the toolbar always displaying in the same location
         * relative to the medium-editor element.
         */
        static: false,

        /* sticky: [boolean]
         * When the __static__ option is true, this enables/disables the toolbar
         * "sticking" to the viewport and staying visible on the screen while
         * the page scrolls.
         */
        sticky: false,

        /* stickyTopOffset: [Number]
         * Value in pixel of the top offset above the toolbar
         */
        stickyTopOffset: 0,

        /* updateOnEmptySelection: [boolean]
         * When the __static__ option is true, this enables/disables updating
         * the state of the toolbar buttons even when the selection is collapsed
         * (there is no selection, just a cursor).
         */
        updateOnEmptySelection: false,

        /* relativeContainer: [node]
         * appending the toolbar to a given node instead of body
         */
        relativeContainer: null,

        init: function () {
            MediumEditor.Extension.prototype.init.apply(this, arguments);

            this.initThrottledMethods();

            if (!this.relativeContainer) {
                this.getEditorOption('elementsContainer').appendChild(this.getToolbarElement());
            } else {
                this.relativeContainer.appendChild(this.getToolbarElement());
            }
        },

        // Helper method to execute method for every extension, but ignoring the toolbar extension
        forEachExtension: function (iterator, context) {
            return this.base.extensions.forEach(function (command) {
                if (command === this) {
                    return;
                }
                return iterator.apply(context || this, arguments);
            }, this);
        },

        // Toolbar creation/deletion

        createToolbar: function () {
            var toolbar = this.document.createElement('div');

            toolbar.id = 'medium-editor-toolbar-' + this.getEditorId();
            toolbar.className = 'medium-editor-toolbar';

            if (this.static) {
                toolbar.className += ' static-toolbar';
            } else if (this.relativeContainer) {
                toolbar.className += ' medium-editor-relative-toolbar';
            } else {
                toolbar.className += ' medium-editor-stalker-toolbar';
            }

            toolbar.appendChild(this.createToolbarButtons());

            // Add any forms that extensions may have
            this.forEachExtension(function (extension) {
                if (extension.hasForm) {
                    toolbar.appendChild(extension.getForm());
                }
            });

            this.attachEventHandlers();

            return toolbar;
        },

        createToolbarButtons: function () {
            var ul = this.document.createElement('ul'),
                li,
                btn,
                buttons,
                extension,
                buttonName,
                buttonOpts;

            ul.id = 'medium-editor-toolbar-actions' + this.getEditorId();
            ul.className = 'medium-editor-toolbar-actions';
            ul.style.display = 'block';

            this.buttons.forEach(function (button) {
                if (typeof button === 'string') {
                    buttonName = button;
                    buttonOpts = null;
                } else {
                    buttonName = button.name;
                    buttonOpts = button;
                }

                // If the button already exists as an extension, it'll be returned
                // othwerise it'll create the default built-in button
                extension = this.base.addBuiltInExtension(buttonName, buttonOpts);

                if (extension && typeof extension.getButton === 'function') {
                    btn = extension.getButton(this.base);
                    li = this.document.createElement('li');
                    if (MediumEditor.util.isElement(btn)) {
                        li.appendChild(btn);
                    } else {
                        li.innerHTML = btn;
                    }
                    ul.appendChild(li);
                }
            }, this);

            buttons = ul.querySelectorAll('button');
            if (buttons.length > 0) {
                buttons[0].classList.add(this.firstButtonClass);
                buttons[buttons.length - 1].classList.add(this.lastButtonClass);
            }

            return ul;
        },

        destroy: function () {
            if (this.toolbar) {
                if (this.toolbar.parentNode) {
                    this.toolbar.parentNode.removeChild(this.toolbar);
                }
                delete this.toolbar;
            }
        },

        // Toolbar accessors

        getInteractionElements: function () {
            return this.getToolbarElement();
        },

        getToolbarElement: function () {
            if (!this.toolbar) {
                this.toolbar = this.createToolbar();
            }

            return this.toolbar;
        },

        getToolbarActionsElement: function () {
            return this.getToolbarElement().querySelector('.medium-editor-toolbar-actions');
        },

        // Toolbar event handlers

        initThrottledMethods: function () {
            // throttledPositionToolbar is throttled because:
            // - It will be called when the browser is resizing, which can fire many times very quickly
            // - For some event (like resize) a slight lag in UI responsiveness is OK and provides performance benefits
            this.throttledPositionToolbar = MediumEditor.util.throttle(function () {
                if (this.base.isActive) {
                    this.positionToolbarIfShown();
                }
            }.bind(this));
        },

        attachEventHandlers: function () {
            // MediumEditor custom events for when user beings and ends interaction with a contenteditable and its elements
            this.subscribe('blur', this.handleBlur.bind(this));
            this.subscribe('focus', this.handleFocus.bind(this));

            // Updating the state of the toolbar as things change
            this.subscribe('editableClick', this.handleEditableClick.bind(this));
            this.subscribe('editableKeyup', this.handleEditableKeyup.bind(this));

            // Handle mouseup on document for updating the selection in the toolbar
            this.on(this.document.documentElement, 'mouseup', this.handleDocumentMouseup.bind(this));

            // Add a scroll event for sticky toolbar
            if (this.static && this.sticky) {
                // On scroll (capture), re-position the toolbar
                this.on(this.window, 'scroll', this.handleWindowScroll.bind(this), true);
            }

            // On resize, re-position the toolbar
            this.on(this.window, 'resize', this.handleWindowResize.bind(this));
        },

        handleWindowScroll: function () {
            this.positionToolbarIfShown();
        },

        handleWindowResize: function () {
            this.throttledPositionToolbar();
        },

        handleDocumentMouseup: function (event) {
            // Do not trigger checkState when mouseup fires over the toolbar
            if (event &&
                    event.target &&
                    MediumEditor.util.isDescendant(this.getToolbarElement(), event.target)) {
                return false;
            }
            this.checkState();
        },

        handleEditableClick: function () {
            // Delay the call to checkState to handle bug where selection is empty
            // immediately after clicking inside a pre-existing selection
            setTimeout(function () {
                this.checkState();
            }.bind(this), 0);
        },

        handleEditableKeyup: function () {
            this.checkState();
        },

        handleBlur: function () {
            // Kill any previously delayed calls to hide the toolbar
            clearTimeout(this.hideTimeout);

            // Blur may fire even if we have a selection, so we want to prevent any delayed showToolbar
            // calls from happening in this specific case
            clearTimeout(this.delayShowTimeout);

            // Delay the call to hideToolbar to handle bug with multiple editors on the page at once
            this.hideTimeout = setTimeout(function () {
                this.hideToolbar();
            }.bind(this), 1);
        },

        handleFocus: function () {
            this.checkState();
        },

        // Hiding/showing toolbar

        isDisplayed: function () {
            return this.getToolbarElement().classList.contains('medium-editor-toolbar-active');
        },

        showToolbar: function () {
            clearTimeout(this.hideTimeout);
            if (!this.isDisplayed()) {
                this.getToolbarElement().classList.add('medium-editor-toolbar-active');
                this.trigger('showToolbar', {}, this.base.getFocusedElement());
            }
        },

        hideToolbar: function () {
            if (this.isDisplayed()) {
                this.getToolbarElement().classList.remove('medium-editor-toolbar-active');
                this.trigger('hideToolbar', {}, this.base.getFocusedElement());
            }
        },

        isToolbarDefaultActionsDisplayed: function () {
            return this.getToolbarActionsElement().style.display === 'block';
        },

        hideToolbarDefaultActions: function () {
            if (this.isToolbarDefaultActionsDisplayed()) {
                this.getToolbarActionsElement().style.display = 'none';
            }
        },

        showToolbarDefaultActions: function () {
            this.hideExtensionForms();

            if (!this.isToolbarDefaultActionsDisplayed()) {
                this.getToolbarActionsElement().style.display = 'block';
            }

            // Using setTimeout + options.delay because:
            // We will actually be displaying the toolbar, which should be controlled by options.delay
            this.delayShowTimeout = this.base.delay(function () {
                this.showToolbar();
            }.bind(this));
        },

        hideExtensionForms: function () {
            // Hide all extension forms
            this.forEachExtension(function (extension) {
                if (extension.hasForm && extension.isDisplayed()) {
                    extension.hideForm();
                }
            });
        },

        // Responding to changes in user selection

        // Checks for existance of multiple block elements in the current selection
        multipleBlockElementsSelected: function () {
            var regexEmptyHTMLTags = /<[^\/>][^>]*><\/[^>]+>/gim, // http://stackoverflow.com/questions/3129738/remove-empty-tags-using-regex
                regexBlockElements = new RegExp('<(' + MediumEditor.util.blockContainerElementNames.join('|') + ')[^>]*>', 'g'),
                selectionHTML = MediumEditor.selection.getSelectionHtml(this.document).replace(regexEmptyHTMLTags, ''), // Filter out empty blocks from selection
                hasMultiParagraphs = selectionHTML.match(regexBlockElements); // Find how many block elements are within the html

            return !!hasMultiParagraphs && hasMultiParagraphs.length > 1;
        },

        modifySelection: function () {
            var selection = this.window.getSelection(),
                selectionRange = selection.getRangeAt(0);

            /*
            * In firefox, there are cases (ie doubleclick of a word) where the selectionRange start
            * will be at the very end of an element.  In other browsers, the selectionRange start
            * would instead be at the very beginning of an element that actually has content.
            * example:
            *   <span>foo</span><span>bar</span>
            *
            * If the text 'bar' is selected, most browsers will have the selectionRange start at the beginning
            * of the 'bar' span.  However, there are cases where firefox will have the selectionRange start
            * at the end of the 'foo' span.  The contenteditable behavior will be ok, but if there are any
            * properties on the 'bar' span, they won't be reflected accurately in the toolbar
            * (ie 'Bold' button wouldn't be active)
            *
            * So, for cases where the selectionRange start is at the end of an element/node, find the next
            * adjacent text node that actually has content in it, and move the selectionRange start there.
            */
            if (this.standardizeSelectionStart &&
                    selectionRange.startContainer.nodeValue &&
                    (selectionRange.startOffset === selectionRange.startContainer.nodeValue.length)) {
                var adjacentNode = MediumEditor.util.findAdjacentTextNodeWithContent(MediumEditor.selection.getSelectionElement(this.window), selectionRange.startContainer, this.document);
                if (adjacentNode) {
                    var offset = 0;
                    while (adjacentNode.nodeValue.substr(offset, 1).trim().length === 0) {
                        offset = offset + 1;
                    }
                    selectionRange = MediumEditor.selection.select(this.document, adjacentNode, offset,
                        selectionRange.endContainer, selectionRange.endOffset);
                }
            }
        },

        checkState: function () {
            if (this.base.preventSelectionUpdates) {
                return;
            }

            // If no editable has focus OR selection is inside contenteditable = false
            // hide toolbar
            if (!this.base.getFocusedElement() ||
                    MediumEditor.selection.selectionInContentEditableFalse(this.window)) {
                return this.hideToolbar();
            }

            // If there's no selection element, selection element doesn't belong to this editor
            // or toolbar is disabled for this selection element
            // hide toolbar
            var selectionElement = MediumEditor.selection.getSelectionElement(this.window);
            if (!selectionElement ||
                    this.getEditorElements().indexOf(selectionElement) === -1 ||
                    selectionElement.getAttribute('data-disable-toolbar')) {
                return this.hideToolbar();
            }

            // Now we know there's a focused editable with a selection

            // If the updateOnEmptySelection option is true, show the toolbar
            if (this.updateOnEmptySelection && this.static) {
                return this.showAndUpdateToolbar();
            }

            // If we don't have a 'valid' selection -> hide toolbar
            if (!MediumEditor.selection.selectionContainsContent(this.document) ||
                (this.allowMultiParagraphSelection === false && this.multipleBlockElementsSelected())) {
                return this.hideToolbar();
            }

            this.showAndUpdateToolbar();
        },

        // Updating the toolbar

        showAndUpdateToolbar: function () {
            this.modifySelection();
            this.setToolbarButtonStates();
            this.trigger('positionToolbar', {}, this.base.getFocusedElement());
            this.showToolbarDefaultActions();
            this.setToolbarPosition();
        },

        setToolbarButtonStates: function () {
            this.forEachExtension(function (extension) {
                if (typeof extension.isActive === 'function' &&
                    typeof extension.setInactive === 'function') {
                    extension.setInactive();
                }
            });

            this.checkActiveButtons();
        },

        checkActiveButtons: function () {
            var manualStateChecks = [],
                queryState = null,
                selectionRange = MediumEditor.selection.getSelectionRange(this.document),
                parentNode,
                updateExtensionState = function (extension) {
                    if (typeof extension.checkState === 'function') {
                        extension.checkState(parentNode);
                    } else if (typeof extension.isActive === 'function' &&
                               typeof extension.isAlreadyApplied === 'function' &&
                               typeof extension.setActive === 'function') {
                        if (!extension.isActive() && extension.isAlreadyApplied(parentNode)) {
                            extension.setActive();
                        }
                    }
                };

            if (!selectionRange) {
                return;
            }

            // Loop through all extensions
            this.forEachExtension(function (extension) {
                // For those extensions where we can use document.queryCommandState(), do so
                if (typeof extension.queryCommandState === 'function') {
                    queryState = extension.queryCommandState();
                    // If queryCommandState returns a valid value, we can trust the browser
                    // and don't need to do our manual checks
                    if (queryState !== null) {
                        if (queryState && typeof extension.setActive === 'function') {
                            extension.setActive();
                        }
                        return;
                    }
                }
                // We can't use queryCommandState for this extension, so add to manualStateChecks
                manualStateChecks.push(extension);
            });

            parentNode = MediumEditor.selection.getSelectedParentElement(selectionRange);

            // Make sure the selection parent isn't outside of the contenteditable
            if (!this.getEditorElements().some(function (element) {
                    return MediumEditor.util.isDescendant(element, parentNode, true);
                })) {
                return;
            }

            // Climb up the DOM and do manual checks for whether a certain extension is currently enabled for this node
            while (parentNode) {
                manualStateChecks.forEach(updateExtensionState);

                // we can abort the search upwards if we leave the contentEditable element
                if (MediumEditor.util.isMediumEditorElement(parentNode)) {
                    break;
                }
                parentNode = parentNode.parentNode;
            }
        },

        // Positioning toolbar

        positionToolbarIfShown: function () {
            if (this.isDisplayed()) {
                this.setToolbarPosition();
            }
        },

        setToolbarPosition: function () {
            var container = this.base.getFocusedElement(),
                selection = this.window.getSelection();

            // If there isn't a valid selection, bail
            if (!container) {
                return this;
            }

            if (this.static || !selection.isCollapsed) {
                this.showToolbar();

                // we don't need any absolute positioning if relativeContainer is set
                if (!this.relativeContainer) {
                    if (this.static) {
                        this.positionStaticToolbar(container);
                    } else {
                        this.positionToolbar(selection);
                    }
                }

                this.trigger('positionedToolbar', {}, this.base.getFocusedElement());
            }
        },

        positionStaticToolbar: function (container) {
            // position the toolbar at left 0, so we can get the real width of the toolbar
            this.getToolbarElement().style.left = '0';

            // document.documentElement for IE 9
            var scrollTop = (this.document.documentElement && this.document.documentElement.scrollTop) || this.document.body.scrollTop,
                windowWidth = this.window.innerWidth,
                toolbarElement = this.getToolbarElement(),
                containerRect = container.getBoundingClientRect(),
                containerTop = containerRect.top + scrollTop,
                containerCenter = (containerRect.left + (containerRect.width / 2)),
                toolbarHeight = toolbarElement.offsetHeight,
                toolbarWidth = toolbarElement.offsetWidth,
                halfOffsetWidth = toolbarWidth / 2,
                targetLeft;

            if (this.sticky) {
                // If it's beyond the height of the editor, position it at the bottom of the editor
                if (scrollTop > (containerTop + container.offsetHeight - toolbarHeight - this.stickyTopOffset)) {
                    toolbarElement.style.top = (containerTop + container.offsetHeight - toolbarHeight) + 'px';
                    toolbarElement.classList.remove('medium-editor-sticky-toolbar');
                // Stick the toolbar to the top of the window
                } else if (scrollTop > (containerTop - toolbarHeight - this.stickyTopOffset)) {
                    toolbarElement.classList.add('medium-editor-sticky-toolbar');
                    toolbarElement.style.top = this.stickyTopOffset + 'px';
                // Normal static toolbar position
                } else {
                    toolbarElement.classList.remove('medium-editor-sticky-toolbar');
                    toolbarElement.style.top = containerTop - toolbarHeight + 'px';
                }
            } else {
                toolbarElement.style.top = containerTop - toolbarHeight + 'px';
            }

            switch (this.align) {
                case 'left':
                    targetLeft = containerRect.left;
                    break;

                case 'right':
                    targetLeft = containerRect.right - toolbarWidth;
                    break;

                case 'center':
                    targetLeft = containerCenter - halfOffsetWidth;
                    break;
            }

            if (targetLeft < 0) {
                targetLeft = 0;
            } else if ((targetLeft + toolbarWidth) > windowWidth) {
                targetLeft = (windowWidth - Math.ceil(toolbarWidth) - 1);
            }

            toolbarElement.style.left = targetLeft + 'px';
        },

        positionToolbar: function (selection) {
            // position the toolbar at left 0, so we can get the real width of the toolbar
            this.getToolbarElement().style.left = '0';
            this.getToolbarElement().style.right = 'initial';

            var range = selection.getRangeAt(0),
                boundary = range.getBoundingClientRect();

            // Handle selections with just images
            if (!boundary || ((boundary.height === 0 && boundary.width === 0) && range.startContainer === range.endContainer)) {
                // If there's a nested image, use that for the bounding rectangle
                if (range.startContainer.nodeType === 1 && range.startContainer.querySelector('img')) {
                    boundary = range.startContainer.querySelector('img').getBoundingClientRect();
                } else {
                    boundary = range.startContainer.getBoundingClientRect();
                }
            }

            var containerWidth = this.window.innerWidth,
                toolbarElement = this.getToolbarElement(),
                toolbarHeight = toolbarElement.offsetHeight,
                toolbarWidth = toolbarElement.offsetWidth,
                halfOffsetWidth = toolbarWidth / 2,
                buttonHeight = 50,
                defaultLeft = this.diffLeft - halfOffsetWidth,
                elementsContainer = this.getEditorOption('elementsContainer'),
                elementsContainerAbsolute = ['absolute', 'fixed'].indexOf(window.getComputedStyle(elementsContainer).getPropertyValue('position')) > -1,
                positions = {},
                relativeBoundary = {},
                middleBoundary, elementsContainerBoundary;

            // If container element is absolute / fixed, recalculate boundaries to be relative to the container
            if (elementsContainerAbsolute) {
                elementsContainerBoundary = elementsContainer.getBoundingClientRect();
                ['top', 'left'].forEach(function (key) {
                    relativeBoundary[key] = boundary[key] - elementsContainerBoundary[key];
                });

                relativeBoundary.width = boundary.width;
                relativeBoundary.height = boundary.height;
                boundary = relativeBoundary;

                containerWidth = elementsContainerBoundary.width;

                // Adjust top position according to container scroll position
                positions.top = elementsContainer.scrollTop;
            } else {
                // Adjust top position according to window scroll position
                positions.top = this.window.pageYOffset;
            }

            middleBoundary = boundary.left + boundary.width / 2;
            positions.top += boundary.top - toolbarHeight;

            if (boundary.top < buttonHeight) {
                toolbarElement.classList.add('medium-toolbar-arrow-over');
                toolbarElement.classList.remove('medium-toolbar-arrow-under');
                positions.top += buttonHeight + boundary.height - this.diffTop;
            } else {
                toolbarElement.classList.add('medium-toolbar-arrow-under');
                toolbarElement.classList.remove('medium-toolbar-arrow-over');
                positions.top += this.diffTop;
            }

            if (middleBoundary < halfOffsetWidth) {
                positions.left = defaultLeft + halfOffsetWidth;
                positions.right = 'initial';
            } else if ((containerWidth - middleBoundary) < halfOffsetWidth) {
                positions.left = 'auto';
                positions.right = 0;
            } else {
                positions.left = defaultLeft + middleBoundary;
                positions.right = 'initial';
            }

            ['top', 'left', 'right'].forEach(function (key) {
                toolbarElement.style[key] = positions[key] + (isNaN(positions[key]) ? '' : 'px');
            });
        }
    });

    MediumEditor.extensions.toolbar = Toolbar;
}());

(function () {
    'use strict';

    var ImageDragging = MediumEditor.Extension.extend({
        init: function () {
            MediumEditor.Extension.prototype.init.apply(this, arguments);

            this.subscribe('editableDrag', this.handleDrag.bind(this));
            this.subscribe('editableDrop', this.handleDrop.bind(this));
        },

        handleDrag: function (event) {
            var className = 'medium-editor-dragover';
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';

            if (event.type === 'dragover') {
                event.target.classList.add(className);
            } else if (event.type === 'dragleave') {
                event.target.classList.remove(className);
            }
        },

        handleDrop: function (event) {
            var className = 'medium-editor-dragover',
                files;
            event.preventDefault();
            event.stopPropagation();

            // IE9 does not support the File API, so prevent file from opening in a new window
            // but also don't try to actually get the file
            if (event.dataTransfer.files) {
                files = Array.prototype.slice.call(event.dataTransfer.files, 0);
                files.some(function (file) {
                    if (file.type.match('image')) {
                        var fileReader, id;
                        fileReader = new FileReader();
                        fileReader.readAsDataURL(file);

                        id = 'medium-img-' + (+new Date());
                        MediumEditor.util.insertHTMLCommand(this.document, '<img class="medium-editor-image-loading" id="' + id + '" />');

                        fileReader.onload = function () {
                            var img = this.document.getElementById(id);
                            if (img) {
                                img.removeAttribute('id');
                                img.removeAttribute('class');
                                img.src = fileReader.result;
                            }
                        }.bind(this);
                    }
                }.bind(this));
            }
            event.target.classList.remove(className);
        }
    });

    MediumEditor.extensions.imageDragging = ImageDragging;
}());

(function () {
    'use strict';

    // Event handlers that shouldn't be exposed externally

    function handleDisableExtraSpaces(event) {
        var node = MediumEditor.selection.getSelectionStart(this.options.ownerDocument),
            textContent = node.textContent,
            caretPositions = MediumEditor.selection.getCaretOffsets(node);

        if ((textContent[caretPositions.left - 1] === undefined) || (textContent[caretPositions.left - 1].trim() === '') || (textContent[caretPositions.left] !== undefined && textContent[caretPositions.left].trim() === '')) {
            event.preventDefault();
        }
    }

    function handleDisabledEnterKeydown(event, element) {
        if (this.options.disableReturn || element.getAttribute('data-disable-return')) {
            event.preventDefault();
        } else if (this.options.disableDoubleReturn || element.getAttribute('data-disable-double-return')) {
            var node = MediumEditor.selection.getSelectionStart(this.options.ownerDocument);

            // if current text selection is empty OR previous sibling text is empty OR it is not a list
            if ((node && node.textContent.trim() === '' && node.nodeName.toLowerCase() !== 'li') ||
                (node.previousElementSibling && node.previousElementSibling.nodeName.toLowerCase() !== 'br' &&
                 node.previousElementSibling.textContent.trim() === '')) {
                event.preventDefault();
            }
        }
    }

    function handleTabKeydown(event) {
        // Override tab only for pre nodes
        var node = MediumEditor.selection.getSelectionStart(this.options.ownerDocument),
            tag = node && node.nodeName.toLowerCase();

        if (tag === 'pre') {
            event.preventDefault();
            MediumEditor.util.insertHTMLCommand(this.options.ownerDocument, '    ');
        }

        // Tab to indent list structures!
        if (MediumEditor.util.isListItem(node)) {
            event.preventDefault();

            // If Shift is down, outdent, otherwise indent
            if (event.shiftKey) {
                this.options.ownerDocument.execCommand('outdent', false, null);
            } else {
                this.options.ownerDocument.execCommand('indent', false, null);
            }
        }
    }

    function handleBlockDeleteKeydowns(event) {
        var p, node = MediumEditor.selection.getSelectionStart(this.options.ownerDocument),
            tagName = node.nodeName.toLowerCase(),
            isEmpty = /^(\s+|<br\/?>)?$/i,
            isHeader = /h\d/i;

        if (MediumEditor.util.isKey(event, [MediumEditor.util.keyCode.BACKSPACE, MediumEditor.util.keyCode.ENTER]) &&
                // has a preceeding sibling
                node.previousElementSibling &&
                // in a header
                isHeader.test(tagName) &&
                // at the very end of the block
                MediumEditor.selection.getCaretOffsets(node).left === 0) {
            if (MediumEditor.util.isKey(event, MediumEditor.util.keyCode.BACKSPACE) && isEmpty.test(node.previousElementSibling.innerHTML)) {
                // backspacing the begining of a header into an empty previous element will
                // change the tagName of the current node to prevent one
                // instead delete previous node and cancel the event.
                node.previousElementSibling.parentNode.removeChild(node.previousElementSibling);
                event.preventDefault();
            } else if (!this.options.disableDoubleReturn && MediumEditor.util.isKey(event, MediumEditor.util.keyCode.ENTER)) {
                // hitting return in the begining of a header will create empty header elements before the current one
                // instead, make "<p><br></p>" element, which are what happens if you hit return in an empty paragraph
                p = this.options.ownerDocument.createElement('p');
                p.innerHTML = '<br>';
                node.previousElementSibling.parentNode.insertBefore(p, node);
                event.preventDefault();
            }
        } else if (MediumEditor.util.isKey(event, MediumEditor.util.keyCode.DELETE) &&
                    // between two sibling elements
                    node.nextElementSibling &&
                    node.previousElementSibling &&
                    // not in a header
                    !isHeader.test(tagName) &&
                    // in an empty tag
                    isEmpty.test(node.innerHTML) &&
                    // when the next tag *is* a header
                    isHeader.test(node.nextElementSibling.nodeName.toLowerCase())) {
            // hitting delete in an empty element preceding a header, ex:
            //  <p>[CURSOR]</p><h1>Header</h1>
            // Will cause the h1 to become a paragraph.
            // Instead, delete the paragraph node and move the cursor to the begining of the h1

            // remove node and move cursor to start of header
            MediumEditor.selection.moveCursor(this.options.ownerDocument, node.nextElementSibling);

            node.previousElementSibling.parentNode.removeChild(node);

            event.preventDefault();
        } else if (MediumEditor.util.isKey(event, MediumEditor.util.keyCode.BACKSPACE) &&
                tagName === 'li' &&
                // hitting backspace inside an empty li
                isEmpty.test(node.innerHTML) &&
                // is first element (no preceeding siblings)
                !node.previousElementSibling &&
                // parent also does not have a sibling
                !node.parentElement.previousElementSibling &&
                // is not the only li in a list
                node.nextElementSibling &&
                node.nextElementSibling.nodeName.toLowerCase() === 'li') {
            // backspacing in an empty first list element in the first list (with more elements) ex:
            //  <ul><li>[CURSOR]</li><li>List Item 2</li></ul>
            // will remove the first <li> but add some extra element before (varies based on browser)
            // Instead, this will:
            // 1) remove the list element
            // 2) create a paragraph before the list
            // 3) move the cursor into the paragraph

            // create a paragraph before the list
            p = this.options.ownerDocument.createElement('p');
            p.innerHTML = '<br>';
            node.parentElement.parentElement.insertBefore(p, node.parentElement);

            // move the cursor into the new paragraph
            MediumEditor.selection.moveCursor(this.options.ownerDocument, p);

            // remove the list element
            node.parentElement.removeChild(node);

            event.preventDefault();
        } else if (MediumEditor.util.isKey(event, MediumEditor.util.keyCode.BACKSPACE) &&
                (MediumEditor.util.getClosestTag(node, 'blockquote') !== false) &&
                MediumEditor.selection.getCaretOffsets(node).left === 0) {

            // when cursor is at the begining of the element and the element is <blockquote>
            // then pressing backspace key should change the <blockquote> to a <p> tag
            event.preventDefault();
            MediumEditor.util.execFormatBlock(this.options.ownerDocument, 'p');
        } else if (MediumEditor.util.isKey(event, MediumEditor.util.keyCode.ENTER) &&
                (MediumEditor.util.getClosestTag(node, 'blockquote') !== false) &&
                MediumEditor.selection.getCaretOffsets(node).right === 0) {

            // when cursor is at the end of <blockquote>,
            // then pressing enter key should create <p> tag, not <blockquote>
            p = this.options.ownerDocument.createElement('p');
            p.innerHTML = '<br>';
            node.parentElement.insertBefore(p, node.nextSibling);

            // move the cursor into the new paragraph
            MediumEditor.selection.moveCursor(this.options.ownerDocument, p);

            event.preventDefault();
        } else if (MediumEditor.util.isKey(event, MediumEditor.util.keyCode.BACKSPACE) &&
                MediumEditor.util.isMediumEditorElement(node.parentElement) &&
                !node.previousElementSibling &&
                node.nextElementSibling &&
                isEmpty.test(node.innerHTML)) {

            // when cursor is in the first element, it's empty and user presses backspace,
            // do delete action instead to get rid of the first element and move caret to 2nd
            event.preventDefault();
            MediumEditor.selection.moveCursor(this.options.ownerDocument, node.nextSibling);
            node.parentElement.removeChild(node);
        }
    }

    function handleKeyup(event) {
        var node = MediumEditor.selection.getSelectionStart(this.options.ownerDocument),
            tagName;

        if (!node) {
            return;
        }

        // https://github.com/yabwe/medium-editor/issues/994
        // Firefox thrown an error when calling `formatBlock` on an empty editable blockContainer that's not a <div>
        if (MediumEditor.util.isMediumEditorElement(node) && node.children.length === 0 && !MediumEditor.util.isBlockContainer(node)) {
            this.options.ownerDocument.execCommand('formatBlock', false, 'p');
        }

        // https://github.com/yabwe/medium-editor/issues/834
        // https://github.com/yabwe/medium-editor/pull/382
        // Don't call format block if this is a block element (ie h1, figCaption, etc.)
        if (MediumEditor.util.isKey(event, MediumEditor.util.keyCode.ENTER) &&
            !MediumEditor.util.isListItem(node) &&
            !MediumEditor.util.isBlockContainer(node)) {

            tagName = node.nodeName.toLowerCase();
            // For anchor tags, unlink
            if (tagName === 'a') {
                this.options.ownerDocument.execCommand('unlink', false, null);
            } else if (!event.shiftKey && !event.ctrlKey) {
                this.options.ownerDocument.execCommand('formatBlock', false, 'p');
            }
        }
    }

    function handleEditableInput(event, editable) {
        var textarea = editable.parentNode.querySelector('textarea[medium-editor-textarea-id="' + editable.getAttribute('medium-editor-textarea-id') + '"]');
        if (textarea) {
            textarea.value = editable.innerHTML.trim();
        }
    }

    // Internal helper methods which shouldn't be exposed externally

    function addToEditors(win) {
        if (!win._mediumEditors) {
            // To avoid breaking users who are assuming that the unique id on
            // medium-editor elements will start at 1, inserting a 'null' in the
            // array so the unique-id can always map to the index of the editor instance
            win._mediumEditors = [null];
        }

        // If this already has a unique id, re-use it
        if (!this.id) {
            this.id = win._mediumEditors.length;
        }

        win._mediumEditors[this.id] = this;
    }

    function removeFromEditors(win) {
        if (!win._mediumEditors || !win._mediumEditors[this.id]) {
            return;
        }

        /* Setting the instance to null in the array instead of deleting it allows:
         * 1) Each instance to preserve its own unique-id, even after being destroyed
         *    and initialized again
         * 2) The unique-id to always correspond to an index in the array of medium-editor
         *    instances. Thus, we will be able to look at a contenteditable, and determine
         *    which instance it belongs to, by indexing into the global array.
         */
        win._mediumEditors[this.id] = null;
    }

    function createElementsArray(selector, doc, filterEditorElements) {
        var elements = [];

        if (!selector) {
            selector = [];
        }
        // If string, use as query selector
        if (typeof selector === 'string') {
            selector = doc.querySelectorAll(selector);
        }
        // If element, put into array
        if (MediumEditor.util.isElement(selector)) {
            selector = [selector];
        }

        if (filterEditorElements) {
            // Remove elements that have already been initialized by the editor
            // selecotr might not be an array (ie NodeList) so use for loop
            for (var i = 0; i < selector.length; i++) {
                var el = selector[i];
                if (MediumEditor.util.isElement(el) &&
                    !el.getAttribute('data-medium-editor-element') &&
                    !el.getAttribute('medium-editor-textarea-id')) {
                    elements.push(el);
                }
            }
        } else {
            // Convert NodeList (or other array like object) into an array
            elements = Array.prototype.slice.apply(selector);
        }

        return elements;
    }

    function cleanupTextareaElement(element) {
        var textarea = element.parentNode.querySelector('textarea[medium-editor-textarea-id="' + element.getAttribute('medium-editor-textarea-id') + '"]');
        if (textarea) {
            // Un-hide the textarea
            textarea.classList.remove('medium-editor-hidden');
            textarea.removeAttribute('medium-editor-textarea-id');
        }
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }

    function setExtensionDefaults(extension, defaults) {
        Object.keys(defaults).forEach(function (prop) {
            if (extension[prop] === undefined) {
                extension[prop] = defaults[prop];
            }
        });
        return extension;
    }

    function initExtension(extension, name, instance) {
        var extensionDefaults = {
            'window': instance.options.contentWindow,
            'document': instance.options.ownerDocument,
            'base': instance
        };

        // Add default options into the extension
        extension = setExtensionDefaults(extension, extensionDefaults);

        // Call init on the extension
        if (typeof extension.init === 'function') {
            extension.init();
        }

        // Set extension name (if not already set)
        if (!extension.name) {
            extension.name = name;
        }
        return extension;
    }

    function isToolbarEnabled() {
        // If any of the elements don't have the toolbar disabled
        // We need a toolbar
        if (this.elements.every(function (element) {
                return !!element.getAttribute('data-disable-toolbar');
            })) {
            return false;
        }

        return this.options.toolbar !== false;
    }

    function isAnchorPreviewEnabled() {
        // If toolbar is disabled, don't add
        if (!isToolbarEnabled.call(this)) {
            return false;
        }

        return this.options.anchorPreview !== false;
    }

    function isPlaceholderEnabled() {
        return this.options.placeholder !== false;
    }

    function isAutoLinkEnabled() {
        return this.options.autoLink !== false;
    }

    function isImageDraggingEnabled() {
        return this.options.imageDragging !== false;
    }

    function isKeyboardCommandsEnabled() {
        return this.options.keyboardCommands !== false;
    }

    function shouldUseFileDraggingExtension() {
        // Since the file-dragging extension replaces the image-dragging extension,
        // we need to check if the user passed an overrided image-dragging extension.
        // If they have, to avoid breaking users, we won't use file-dragging extension.
        return !this.options.extensions['imageDragging'];
    }

    function createContentEditable(textarea) {
        var div = this.options.ownerDocument.createElement('div'),
            now = Date.now(),
            uniqueId = 'medium-editor-' + now,
            atts = textarea.attributes;

        // Some browsers can move pretty fast, since we're using a timestamp
        // to make a unique-id, ensure that the id is actually unique on the page
        while (this.options.ownerDocument.getElementById(uniqueId)) {
            now++;
            uniqueId = 'medium-editor-' + now;
        }

        div.className = textarea.className;
        div.id = uniqueId;
        div.innerHTML = textarea.value;

        textarea.setAttribute('medium-editor-textarea-id', uniqueId);

        // re-create all attributes from the textearea to the new created div
        for (var i = 0, n = atts.length; i < n; i++) {
            // do not re-create existing attributes
            if (!div.hasAttribute(atts[i].nodeName)) {
                div.setAttribute(atts[i].nodeName, atts[i].nodeValue);
            }
        }

        // If textarea has a form, listen for reset on the form to clear
        // the content of the created div
        if (textarea.form) {
            this.on(textarea.form, 'reset', function (event) {
                if (!event.defaultPrevented) {
                    this.resetContent(this.options.ownerDocument.getElementById(uniqueId));
                }
            }.bind(this));
        }

        textarea.classList.add('medium-editor-hidden');
        textarea.parentNode.insertBefore(
            div,
            textarea
        );

        return div;
    }

    function initElement(element, editorId) {
        if (!element.getAttribute('data-medium-editor-element')) {
            if (element.nodeName.toLowerCase() === 'textarea') {
                element = createContentEditable.call(this, element);

                // Make sure we only attach to editableInput once for <textarea> elements
                if (!this.instanceHandleEditableInput) {
                    this.instanceHandleEditableInput = handleEditableInput.bind(this);
                    this.subscribe('editableInput', this.instanceHandleEditableInput);
                }
            }

            if (!this.options.disableEditing && !element.getAttribute('data-disable-editing')) {
                element.setAttribute('contentEditable', true);
                element.setAttribute('spellcheck', this.options.spellcheck);
            }

            // Make sure we only attach to editableKeydownEnter once for disable-return options
            if (!this.instanceHandleEditableKeydownEnter) {
                if (element.getAttribute('data-disable-return') || element.getAttribute('data-disable-double-return')) {
                    this.instanceHandleEditableKeydownEnter = handleDisabledEnterKeydown.bind(this);
                    this.subscribe('editableKeydownEnter', this.instanceHandleEditableKeydownEnter);
                }
            }

            // if we're not disabling return, add a handler to help handle cleanup
            // for certain cases when enter is pressed
            if (!this.options.disableReturn && !element.getAttribute('data-disable-return')) {
                this.on(element, 'keyup', handleKeyup.bind(this));
            }

            var elementId = MediumEditor.util.guid();

            element.setAttribute('data-medium-editor-element', true);
            element.classList.add('medium-editor-element');
            element.setAttribute('role', 'textbox');
            element.setAttribute('aria-multiline', true);
            element.setAttribute('data-medium-editor-editor-index', editorId);
            // TODO: Merge data-medium-editor-element and medium-editor-index attributes for 6.0.0
            // medium-editor-index is not named correctly anymore and can be re-purposed to signify
            // whether the element has been initialized or not
            element.setAttribute('medium-editor-index', elementId);
            initialContent[elementId] = element.innerHTML;

            this.events.attachAllEventsToElement(element);
        }

        return element;
    }

    function attachHandlers() {
        // attach to tabs
        this.subscribe('editableKeydownTab', handleTabKeydown.bind(this));

        // Bind keys which can create or destroy a block element: backspace, delete, return
        this.subscribe('editableKeydownDelete', handleBlockDeleteKeydowns.bind(this));
        this.subscribe('editableKeydownEnter', handleBlockDeleteKeydowns.bind(this));

        // Bind double space event
        if (this.options.disableExtraSpaces) {
            this.subscribe('editableKeydownSpace', handleDisableExtraSpaces.bind(this));
        }

        // Make sure we only attach to editableKeydownEnter once for disable-return options
        if (!this.instanceHandleEditableKeydownEnter) {
            // disabling return or double return
            if (this.options.disableReturn || this.options.disableDoubleReturn) {
                this.instanceHandleEditableKeydownEnter = handleDisabledEnterKeydown.bind(this);
                this.subscribe('editableKeydownEnter', this.instanceHandleEditableKeydownEnter);
            }
        }
    }

    function initExtensions() {

        this.extensions = [];

        // Passed in extensions
        Object.keys(this.options.extensions).forEach(function (name) {
            // Always save the toolbar extension for last
            if (name !== 'toolbar' && this.options.extensions[name]) {
                this.extensions.push(initExtension(this.options.extensions[name], name, this));
            }
        }, this);

        // 4 Cases for imageDragging + fileDragging extensons:
        //
        // 1. ImageDragging ON + No Custom Image Dragging Extension:
        //    * Use fileDragging extension (default options)
        // 2. ImageDragging OFF + No Custom Image Dragging Extension:
        //    * Use fileDragging extension w/ images turned off
        // 3. ImageDragging ON + Custom Image Dragging Extension:
        //    * Don't use fileDragging (could interfere with custom image dragging extension)
        // 4. ImageDragging OFF + Custom Image Dragging:
        //    * Don't use fileDragging (could interfere with custom image dragging extension)
        if (shouldUseFileDraggingExtension.call(this)) {
            var opts = this.options.fileDragging;
            if (!opts) {
                opts = {};

                // Image is in the 'allowedTypes' list by default.
                // If imageDragging is off override the 'allowedTypes' list with an empty one
                if (!isImageDraggingEnabled.call(this)) {
                    opts.allowedTypes = [];
                }
            }
            this.addBuiltInExtension('fileDragging', opts);
        }

        // Built-in extensions
        var builtIns = {
            paste: true,
            'anchor-preview': isAnchorPreviewEnabled.call(this),
            autoLink: isAutoLinkEnabled.call(this),
            keyboardCommands: isKeyboardCommandsEnabled.call(this),
            placeholder: isPlaceholderEnabled.call(this)
        };
        Object.keys(builtIns).forEach(function (name) {
            if (builtIns[name]) {
                this.addBuiltInExtension(name);
            }
        }, this);

        // Users can pass in a custom toolbar extension
        // so check for that first and if it's not present
        // just create the default toolbar
        var toolbarExtension = this.options.extensions['toolbar'];
        if (!toolbarExtension && isToolbarEnabled.call(this)) {
            // Backwards compatability
            var toolbarOptions = MediumEditor.util.extend({}, this.options.toolbar, {
                allowMultiParagraphSelection: this.options.allowMultiParagraphSelection // deprecated
            });
            toolbarExtension = new MediumEditor.extensions.toolbar(toolbarOptions);
        }

        // If the toolbar is not disabled, so we actually have an extension
        // initialize it and add it to the extensions array
        if (toolbarExtension) {
            this.extensions.push(initExtension(toolbarExtension, 'toolbar', this));
        }
    }

    function mergeOptions(defaults, options) {
        var deprecatedProperties = [
            ['allowMultiParagraphSelection', 'toolbar.allowMultiParagraphSelection']
        ];
        // warn about using deprecated properties
        if (options) {
            deprecatedProperties.forEach(function (pair) {
                if (options.hasOwnProperty(pair[0]) && options[pair[0]] !== undefined) {
                    MediumEditor.util.deprecated(pair[0], pair[1], 'v6.0.0');
                }
            });
        }

        return MediumEditor.util.defaults({}, options, defaults);
    }

    function execActionInternal(action, opts) {
        /*jslint regexp: true*/
        var appendAction = /^append-(.+)$/gi,
            justifyAction = /justify([A-Za-z]*)$/g, /* Detecting if is justifyCenter|Right|Left */
            match,
            cmdValueArgument;
        /*jslint regexp: false*/

        // Actions starting with 'append-' should attempt to format a block of text ('formatBlock') using a specific
        // type of block element (ie append-blockquote, append-h1, append-pre, etc.)
        match = appendAction.exec(action);
        if (match) {
            return MediumEditor.util.execFormatBlock(this.options.ownerDocument, match[1]);
        }

        if (action === 'fontSize') {
            // TODO: Deprecate support for opts.size in 6.0.0
            if (opts.size) {
                MediumEditor.util.deprecated('.size option for fontSize command', '.value', '6.0.0');
            }
            cmdValueArgument = opts.value || opts.size;
            return this.options.ownerDocument.execCommand('fontSize', false, cmdValueArgument);
        }

        if (action === 'fontName') {
            // TODO: Deprecate support for opts.name in 6.0.0
            if (opts.name) {
                MediumEditor.util.deprecated('.name option for fontName command', '.value', '6.0.0');
            }
            cmdValueArgument = opts.value || opts.name;
            return this.options.ownerDocument.execCommand('fontName', false, cmdValueArgument);
        }

        if (action === 'createLink') {
            return this.createLink(opts);
        }

        if (action === 'image') {
            var src = this.options.contentWindow.getSelection().toString().trim();
            return this.options.ownerDocument.execCommand('insertImage', false, src);
        }

        if (action === 'html') {
            var html = this.options.contentWindow.getSelection().toString().trim();
            return MediumEditor.util.insertHTMLCommand(this.options.ownerDocument, html);
        }

        /* Issue: https://github.com/yabwe/medium-editor/issues/595
         * If the action is to justify the text */
        if (justifyAction.exec(action)) {
            var result = this.options.ownerDocument.execCommand(action, false, null),
                parentNode = MediumEditor.selection.getSelectedParentElement(MediumEditor.selection.getSelectionRange(this.options.ownerDocument));
            if (parentNode) {
                cleanupJustifyDivFragments.call(this, MediumEditor.util.getTopBlockContainer(parentNode));
            }

            return result;
        }

        cmdValueArgument = opts && opts.value;
        return this.options.ownerDocument.execCommand(action, false, cmdValueArgument);
    }

    /* If we've just justified text within a container block
     * Chrome may have removed <br> elements and instead wrapped lines in <div> elements
     * with a text-align property.  If so, we want to fix this
     */
    function cleanupJustifyDivFragments(blockContainer) {
        if (!blockContainer) {
            return;
        }

        var textAlign,
            childDivs = Array.prototype.slice.call(blockContainer.childNodes).filter(function (element) {
                var isDiv = element.nodeName.toLowerCase() === 'div';
                if (isDiv && !textAlign) {
                    textAlign = element.style.textAlign;
                }
                return isDiv;
            });

        /* If we found child <div> elements with text-align style attributes
         * we should fix this by:
         *
         * 1) Unwrapping each <div> which has a text-align style
         * 2) Insert a <br> element after each set of 'unwrapped' div children
         * 3) Set the text-align style of the parent block element
         */
        if (childDivs.length) {
            // Since we're mucking with the HTML, preserve selection
            this.saveSelection();
            childDivs.forEach(function (div) {
                if (div.style.textAlign === textAlign) {
                    var lastChild = div.lastChild;
                    if (lastChild) {
                        // Instead of a div, extract the child elements and add a <br>
                        MediumEditor.util.unwrap(div, this.options.ownerDocument);
                        var br = this.options.ownerDocument.createElement('BR');
                        lastChild.parentNode.insertBefore(br, lastChild.nextSibling);
                    }
                }
            }, this);
            blockContainer.style.textAlign = textAlign;
            // We're done, so restore selection
            this.restoreSelection();
        }
    }

    var initialContent = {};

    MediumEditor.prototype = {
        // NOT DOCUMENTED - exposed for backwards compatability
        init: function (elements, options) {
            this.options = mergeOptions.call(this, this.defaults, options);
            this.origElements = elements;

            if (!this.options.elementsContainer) {
                this.options.elementsContainer = this.options.ownerDocument.body;
            }

            return this.setup();
        },

        setup: function () {
            if (this.isActive) {
                return;
            }

            addToEditors.call(this, this.options.contentWindow);
            this.events = new MediumEditor.Events(this);
            this.elements = [];

            this.addElements(this.origElements);

            if (this.elements.length === 0) {
                return;
            }

            this.isActive = true;

            // Call initialization helpers
            initExtensions.call(this);
            attachHandlers.call(this);
        },

        destroy: function () {
            if (!this.isActive) {
                return;
            }

            this.isActive = false;

            this.extensions.forEach(function (extension) {
                if (typeof extension.destroy === 'function') {
                    extension.destroy();
                }
            }, this);

            this.events.destroy();

            this.elements.forEach(function (element) {
                // Reset elements content, fix for issue where after editor destroyed the red underlines on spelling errors are left
                if (this.options.spellcheck) {
                    element.innerHTML = element.innerHTML;
                }

                // cleanup extra added attributes
                element.removeAttribute('contentEditable');
                element.removeAttribute('spellcheck');
                element.removeAttribute('data-medium-editor-element');
                element.classList.remove('medium-editor-element');
                element.removeAttribute('role');
                element.removeAttribute('aria-multiline');
                element.removeAttribute('medium-editor-index');
                element.removeAttribute('data-medium-editor-editor-index');

                // Remove any elements created for textareas
                if (element.getAttribute('medium-editor-textarea-id')) {
                    cleanupTextareaElement(element);
                }
            }, this);
            this.elements = [];
            this.instanceHandleEditableKeydownEnter = null;
            this.instanceHandleEditableInput = null;

            removeFromEditors.call(this, this.options.contentWindow);
        },

        on: function (target, event, listener, useCapture) {
            this.events.attachDOMEvent(target, event, listener, useCapture);

            return this;
        },

        off: function (target, event, listener, useCapture) {
            this.events.detachDOMEvent(target, event, listener, useCapture);

            return this;
        },

        subscribe: function (event, listener) {
            this.events.attachCustomEvent(event, listener);

            return this;
        },

        unsubscribe: function (event, listener) {
            this.events.detachCustomEvent(event, listener);

            return this;
        },

        trigger: function (name, data, editable) {
            this.events.triggerCustomEvent(name, data, editable);

            return this;
        },

        delay: function (fn) {
            var self = this;
            return setTimeout(function () {
                if (self.isActive) {
                    fn();
                }
            }, this.options.delay);
        },

        serialize: function () {
            var i,
                elementid,
                content = {},
                len = this.elements.length;

            for (i = 0; i < len; i += 1) {
                elementid = (this.elements[i].id !== '') ? this.elements[i].id : 'element-' + i;
                content[elementid] = {
                    value: this.elements[i].innerHTML.trim()
                };
            }
            return content;
        },

        getExtensionByName: function (name) {
            var extension;
            if (this.extensions && this.extensions.length) {
                this.extensions.some(function (ext) {
                    if (ext.name === name) {
                        extension = ext;
                        return true;
                    }
                    return false;
                });
            }
            return extension;
        },

        /**
         * NOT DOCUMENTED - exposed as a helper for other extensions to use
         */
        addBuiltInExtension: function (name, opts) {
            var extension = this.getExtensionByName(name),
                merged;
            if (extension) {
                return extension;
            }

            switch (name) {
                case 'anchor':
                    merged = MediumEditor.util.extend({}, this.options.anchor, opts);
                    extension = new MediumEditor.extensions.anchor(merged);
                    break;
                case 'anchor-preview':
                    extension = new MediumEditor.extensions.anchorPreview(this.options.anchorPreview);
                    break;
                case 'autoLink':
                    extension = new MediumEditor.extensions.autoLink();
                    break;
                case 'fileDragging':
                    extension = new MediumEditor.extensions.fileDragging(opts);
                    break;
                case 'fontname':
                    extension = new MediumEditor.extensions.fontName(this.options.fontName);
                    break;
                case 'fontsize':
                    extension = new MediumEditor.extensions.fontSize(opts);
                    break;
                case 'keyboardCommands':
                    extension = new MediumEditor.extensions.keyboardCommands(this.options.keyboardCommands);
                    break;
                case 'paste':
                    extension = new MediumEditor.extensions.paste(this.options.paste);
                    break;
                case 'placeholder':
                    extension = new MediumEditor.extensions.placeholder(this.options.placeholder);
                    break;
                default:
                    // All of the built-in buttons for MediumEditor are extensions
                    // so check to see if the extension we're creating is a built-in button
                    if (MediumEditor.extensions.button.isBuiltInButton(name)) {
                        if (opts) {
                            merged = MediumEditor.util.defaults({}, opts, MediumEditor.extensions.button.prototype.defaults[name]);
                            extension = new MediumEditor.extensions.button(merged);
                        } else {
                            extension = new MediumEditor.extensions.button(name);
                        }
                    }
            }

            if (extension) {
                this.extensions.push(initExtension(extension, name, this));
            }

            return extension;
        },

        stopSelectionUpdates: function () {
            this.preventSelectionUpdates = true;
        },

        startSelectionUpdates: function () {
            this.preventSelectionUpdates = false;
        },

        checkSelection: function () {
            var toolbar = this.getExtensionByName('toolbar');
            if (toolbar) {
                toolbar.checkState();
            }
            return this;
        },

        // Wrapper around document.queryCommandState for checking whether an action has already
        // been applied to the current selection
        queryCommandState: function (action) {
            var fullAction = /^full-(.+)$/gi,
                match,
                queryState = null;

            // Actions starting with 'full-' need to be modified since this is a medium-editor concept
            match = fullAction.exec(action);
            if (match) {
                action = match[1];
            }

            try {
                queryState = this.options.ownerDocument.queryCommandState(action);
            } catch (exc) {
                queryState = null;
            }

            return queryState;
        },

        execAction: function (action, opts) {
            /*jslint regexp: true*/
            var fullAction = /^full-(.+)$/gi,
                match,
                result;
            /*jslint regexp: false*/

            // Actions starting with 'full-' should be applied to to the entire contents of the editable element
            // (ie full-bold, full-append-pre, etc.)
            match = fullAction.exec(action);
            if (match) {
                // Store the current selection to be restored after applying the action
                this.saveSelection();
                // Select all of the contents before calling the action
                this.selectAllContents();
                result = execActionInternal.call(this, match[1], opts);
                // Restore the previous selection
                this.restoreSelection();
            } else {
                result = execActionInternal.call(this, action, opts);
            }

            // do some DOM clean-up for known browser issues after the action
            if (action === 'insertunorderedlist' || action === 'insertorderedlist') {
                MediumEditor.util.cleanListDOM(this.options.ownerDocument, this.getSelectedParentElement());
            }

            this.checkSelection();
            return result;
        },

        getSelectedParentElement: function (range) {
            if (range === undefined) {
                range = this.options.contentWindow.getSelection().getRangeAt(0);
            }
            return MediumEditor.selection.getSelectedParentElement(range);
        },

        selectAllContents: function () {
            var currNode = MediumEditor.selection.getSelectionElement(this.options.contentWindow);

            if (currNode) {
                // Move to the lowest descendant node that still selects all of the contents
                while (currNode.children.length === 1) {
                    currNode = currNode.children[0];
                }

                this.selectElement(currNode);
            }
        },

        selectElement: function (element) {
            MediumEditor.selection.selectNode(element, this.options.ownerDocument);

            var selElement = MediumEditor.selection.getSelectionElement(this.options.contentWindow);
            if (selElement) {
                this.events.focusElement(selElement);
            }
        },

        getFocusedElement: function () {
            var focused;
            this.elements.some(function (element) {
                // Find the element that has focus
                if (!focused && element.getAttribute('data-medium-focused')) {
                    focused = element;
                }

                // bail if we found the element that had focus
                return !!focused;
            }, this);

            return focused;
        },

        // Export the state of the selection in respect to one of this
        // instance of MediumEditor's elements
        exportSelection: function () {
            var selectionElement = MediumEditor.selection.getSelectionElement(this.options.contentWindow),
                editableElementIndex = this.elements.indexOf(selectionElement),
                selectionState = null;

            if (editableElementIndex >= 0) {
                selectionState = MediumEditor.selection.exportSelection(selectionElement, this.options.ownerDocument);
            }

            if (selectionState !== null && editableElementIndex !== 0) {
                selectionState.editableElementIndex = editableElementIndex;
            }

            return selectionState;
        },

        saveSelection: function () {
            this.selectionState = this.exportSelection();
        },

        // Restore a selection based on a selectionState returned by a call
        // to MediumEditor.exportSelection
        importSelection: function (selectionState, favorLaterSelectionAnchor) {
            if (!selectionState) {
                return;
            }

            var editableElement = this.elements[selectionState.editableElementIndex || 0];
            MediumEditor.selection.importSelection(selectionState, editableElement, this.options.ownerDocument, favorLaterSelectionAnchor);
        },

        restoreSelection: function () {
            this.importSelection(this.selectionState);
        },

        createLink: function (opts) {
            var currentEditor = MediumEditor.selection.getSelectionElement(this.options.contentWindow),
                customEvent = {},
                targetUrl;

            // Make sure the selection is within an element this editor is tracking
            if (this.elements.indexOf(currentEditor) === -1) {
                return;
            }

            try {
                this.events.disableCustomEvent('editableInput');
                // TODO: Deprecate support for opts.url in 6.0.0
                if (opts.url) {
                    MediumEditor.util.deprecated('.url option for createLink', '.value', '6.0.0');
                }
                targetUrl = opts.url || opts.value;
                if (targetUrl && targetUrl.trim().length > 0) {
                    var currentSelection = this.options.contentWindow.getSelection();
                    if (currentSelection) {
                        var currRange = currentSelection.getRangeAt(0),
                            commonAncestorContainer = currRange.commonAncestorContainer,
                            exportedSelection,
                            startContainerParentElement,
                            endContainerParentElement,
                            textNodes;

                        // If the selection is contained within a single text node
                        // and the selection starts at the beginning of the text node,
                        // MSIE still says the startContainer is the parent of the text node.
                        // If the selection is contained within a single text node, we
                        // want to just use the default browser 'createLink', so we need
                        // to account for this case and adjust the commonAncestorContainer accordingly
                        if (currRange.endContainer.nodeType === 3 &&
                            currRange.startContainer.nodeType !== 3 &&
                            currRange.startOffset === 0 &&
                            currRange.startContainer.firstChild === currRange.endContainer) {
                            commonAncestorContainer = currRange.endContainer;
                        }

                        startContainerParentElement = MediumEditor.util.getClosestBlockContainer(currRange.startContainer);
                        endContainerParentElement = MediumEditor.util.getClosestBlockContainer(currRange.endContainer);

                        // If the selection is not contained within a single text node
                        // but the selection is contained within the same block element
                        // we want to make sure we create a single link, and not multiple links
                        // which can happen with the built in browser functionality
                        if (commonAncestorContainer.nodeType !== 3 && commonAncestorContainer.textContent.length !== 0 && startContainerParentElement === endContainerParentElement) {
                            var parentElement = (startContainerParentElement || currentEditor),
                                fragment = this.options.ownerDocument.createDocumentFragment();

                            // since we are going to create a link from an extracted text,
                            // be sure that if we are updating a link, we won't let an empty link behind (see #754)
                            // (Workaroung for Chrome)
                            this.execAction('unlink');

                            exportedSelection = this.exportSelection();
                            fragment.appendChild(parentElement.cloneNode(true));

                            if (currentEditor === parentElement) {
                                // We have to avoid the editor itself being wiped out when it's the only block element,
                                // as our reference inside this.elements gets detached from the page when insertHTML runs.
                                // If we just use [parentElement, 0] and [parentElement, parentElement.childNodes.length]
                                // as the range boundaries, this happens whenever parentElement === currentEditor.
                                // The tradeoff to this workaround is that a orphaned tag can sometimes be left behind at
                                // the end of the editor's content.
                                // In Gecko:
                                // as an empty <strong></strong> if parentElement.lastChild is a <strong> tag.
                                // In WebKit:
                                // an invented <br /> tag at the end in the same situation
                                MediumEditor.selection.select(
                                    this.options.ownerDocument,
                                    parentElement.firstChild,
                                    0,
                                    parentElement.lastChild,
                                    parentElement.lastChild.nodeType === 3 ?
                                    parentElement.lastChild.nodeValue.length : parentElement.lastChild.childNodes.length
                                );
                            } else {
                                MediumEditor.selection.select(
                                    this.options.ownerDocument,
                                    parentElement,
                                    0,
                                    parentElement,
                                    parentElement.childNodes.length
                                );
                            }

                            var modifiedExportedSelection = this.exportSelection();

                            textNodes = MediumEditor.util.findOrCreateMatchingTextNodes(
                                this.options.ownerDocument,
                                fragment,
                                {
                                    start: exportedSelection.start - modifiedExportedSelection.start,
                                    end: exportedSelection.end - modifiedExportedSelection.start,
                                    editableElementIndex: exportedSelection.editableElementIndex
                                }
                            );
                            // If textNodes are not present, when changing link on images
                            // ex: <a><img src="http://image.test.com"></a>, change fragment to currRange.startContainer
                            // and set textNodes array to [imageElement, imageElement]
                            if (textNodes.length === 0) {
                                fragment = this.options.ownerDocument.createDocumentFragment();
                                fragment.appendChild(commonAncestorContainer.cloneNode(true));
                                textNodes = [fragment.firstChild.firstChild, fragment.firstChild.lastChild];
                            }

                            // Creates the link in the document fragment
                            MediumEditor.util.createLink(this.options.ownerDocument, textNodes, targetUrl.trim());

                            // Chrome trims the leading whitespaces when inserting HTML, which messes up restoring the selection.
                            var leadingWhitespacesCount = (fragment.firstChild.innerHTML.match(/^\s+/) || [''])[0].length;

                            // Now move the created link back into the original document in a way to preserve undo/redo history
                            MediumEditor.util.insertHTMLCommand(this.options.ownerDocument, fragment.firstChild.innerHTML.replace(/^\s+/, ''));
                            exportedSelection.start -= leadingWhitespacesCount;
                            exportedSelection.end -= leadingWhitespacesCount;

                            this.importSelection(exportedSelection);
                        } else {
                            this.options.ownerDocument.execCommand('createLink', false, targetUrl);
                        }

                        if (this.options.targetBlank || opts.target === '_blank') {
                            MediumEditor.util.setTargetBlank(MediumEditor.selection.getSelectionStart(this.options.ownerDocument), targetUrl);
                        } else {
                            MediumEditor.util.removeTargetBlank(MediumEditor.selection.getSelectionStart(this.options.ownerDocument), targetUrl);
                        }

                        if (opts.buttonClass) {
                            MediumEditor.util.addClassToAnchors(MediumEditor.selection.getSelectionStart(this.options.ownerDocument), opts.buttonClass);
                        }
                    }
                }
                // Fire input event for backwards compatibility if anyone was listening directly to the DOM input event
                if (this.options.targetBlank || opts.target === '_blank' || opts.buttonClass) {
                    customEvent = this.options.ownerDocument.createEvent('HTMLEvents');
                    customEvent.initEvent('input', true, true, this.options.contentWindow);
                    for (var i = 0, len = this.elements.length; i < len; i += 1) {
                        this.elements[i].dispatchEvent(customEvent);
                    }
                }
            } finally {
                this.events.enableCustomEvent('editableInput');
            }
            // Fire our custom editableInput event
            this.events.triggerCustomEvent('editableInput', customEvent, currentEditor);
        },

        cleanPaste: function (text) {
            this.getExtensionByName('paste').cleanPaste(text);
        },

        pasteHTML: function (html, options) {
            this.getExtensionByName('paste').pasteHTML(html, options);
        },

        setContent: function (html, index) {
            index = index || 0;

            if (this.elements[index]) {
                var target = this.elements[index];
                target.innerHTML = html;
                this.checkContentChanged(target);
            }
        },

        getContent: function (index) {
            index = index || 0;

            if (this.elements[index]) {
                return this.elements[index].innerHTML.trim();
            }
            return null;
        },

        checkContentChanged: function (editable) {
            editable = editable || MediumEditor.selection.getSelectionElement(this.options.contentWindow);
            this.events.updateInput(editable, { target: editable, currentTarget: editable });
        },

        resetContent: function (element) {
            // For all elements that exist in the this.elements array, we can assume:
            // - Its initial content has been set in the initialContent object
            // - It has a medium-editor-index attribute which is the key value in the initialContent object

            if (element) {
                var index = this.elements.indexOf(element);
                if (index !== -1) {
                    this.setContent(initialContent[element.getAttribute('medium-editor-index')], index);
                }
                return;
            }

            this.elements.forEach(function (el, idx) {
                this.setContent(initialContent[el.getAttribute('medium-editor-index')], idx);
            }, this);
        },

        addElements: function (selector) {
            // Convert elements into an array
            var elements = createElementsArray(selector, this.options.ownerDocument, true);

            // Do we have elements to add now?
            if (elements.length === 0) {
                return false;
            }

            elements.forEach(function (element) {
                // Initialize all new elements (we check that in those functions don't worry)
                element = initElement.call(this, element, this.id);

                // Add new elements to our internal elements array
                this.elements.push(element);

                // Trigger event so extensions can know when an element has been added
                this.trigger('addElement', { target: element, currentTarget: element }, element);
            }, this);
        },

        removeElements: function (selector) {
            // Convert elements into an array
            var elements = createElementsArray(selector, this.options.ownerDocument),
                toRemove = elements.map(function (el) {
                    // For textareas, make sure we're looking at the editor div and not the textarea itself
                    if (el.getAttribute('medium-editor-textarea-id') && el.parentNode) {
                        return el.parentNode.querySelector('div[medium-editor-textarea-id="' + el.getAttribute('medium-editor-textarea-id') + '"]');
                    } else {
                        return el;
                    }
                });

            this.elements = this.elements.filter(function (element) {
                // If this is an element we want to remove
                if (toRemove.indexOf(element) !== -1) {
                    this.events.cleanupElement(element);
                    if (element.getAttribute('medium-editor-textarea-id')) {
                        cleanupTextareaElement(element);
                    }
                    // Trigger event so extensions can clean-up elements that are being removed
                    this.trigger('removeElement', { target: element, currentTarget: element }, element);
                    return false;
                }
                return true;
            }, this);
        }
    };

    MediumEditor.getEditorFromElement = function (element) {
        var index = element.getAttribute('data-medium-editor-editor-index'),
            win = element && element.ownerDocument && (element.ownerDocument.defaultView || element.ownerDocument.parentWindow);
        if (win && win._mediumEditors && win._mediumEditors[index]) {
            return win._mediumEditors[index];
        }
        return null;
    };
}());

(function () {
    // summary: The default options hash used by the Editor

    MediumEditor.prototype.defaults = {
        activeButtonClass: 'medium-editor-button-active',
        buttonLabels: false,
        delay: 0,
        disableReturn: false,
        disableDoubleReturn: false,
        disableExtraSpaces: false,
        disableEditing: false,
        autoLink: false,
        elementsContainer: false,
        contentWindow: window,
        ownerDocument: document,
        targetBlank: false,
        extensions: {},
        spellcheck: true
    };
})();

MediumEditor.parseVersionString = function (release) {
    var split = release.split('-'),
        version = split[0].split('.'),
        preRelease = (split.length > 1) ? split[1] : '';
    return {
        major: parseInt(version[0], 10),
        minor: parseInt(version[1], 10),
        revision: parseInt(version[2], 10),
        preRelease: preRelease,
        toString: function () {
            return [version[0], version[1], version[2]].join('.') + (preRelease ? '-' + preRelease : '');
        }
    };
};

MediumEditor.version = MediumEditor.parseVersionString.call(this, ({
    // grunt-bump looks for this:
    'version': '5.23.2'
}).version);

    return MediumEditor;
}()));

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(97)))

/***/ }),

/***/ 97:
/***/ (function(module, exports) {

// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };


/***/ })

});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9ub2RlX21vZHVsZXMvbWVkaXVtLWVkaXRvci9kaXN0L2pzL21lZGl1bS1lZGl0b3IuanMiLCJ3ZWJwYWNrOi8vLy4vbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OzsrQ0FBQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxZQUFZLFNBQVM7QUFDckI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxZQUFZLFNBQVM7QUFDckI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLLGFBQWE7QUFDbEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBOztBQUVBLEdBQUc7QUFDSDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQ0FBcUM7QUFDckMsU0FBUztBQUNUO0FBQ0EsU0FBUztBQUNULHFDQUFxQztBQUNyQyxTQUFTO0FBQ1Q7QUFDQTtBQUNBLE9BQU87QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxjQUFjLGFBQWE7QUFDM0I7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0EscUJBQXFCO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQSw2Q0FBNkMsU0FBUztBQUN0RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSxTQUFTO0FBQUE7QUFDVCxLQUFLO0FBQ0w7QUFDQTtBQUNBLENBQUM7O0FBRUQ7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSx1QkFBdUIsb0JBQW9CO0FBQzNDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSzs7QUFFTDs7QUFFQTtBQUNBO0FBQ0EsZ0pBQWdKLEdBQUcsT0FBTyxHQUFHOztBQUU3Sjs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQSxtREFBbUQsaUJBQWlCO0FBQ3BFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw4QkFBOEI7QUFDOUIscUJBQXFCO0FBQ3JCLCtFQUErRTtBQUMvRTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUEsMkJBQTJCLCtCQUErQjtBQUMxRDtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0EscUJBQXFCO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxhQUFhOztBQUViO0FBQ0EsU0FBUzs7QUFFVDtBQUNBLGdHQUFnRztBQUNoRztBQUNBLG1EQUFtRCxzQkFBc0Isc0JBQXNCLHdCQUF3QjtBQUN2SCxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHFCQUFxQjtBQUNyQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQkFBcUI7QUFDckI7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiOztBQUVBLDJCQUEyQixlQUFlO0FBQzFDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiOztBQUVBLDJCQUEyQixlQUFlO0FBQzFDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwyQkFBMkIsb0JBQW9CO0FBQy9DO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBLDJCQUEyQixlQUFlO0FBQzFDLCtCQUErQixvQkFBb0I7QUFDbkQ7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUEsb0VBQW9FO0FBQ3BFOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHFCQUFxQjtBQUNyQjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHlCQUF5QjtBQUN6QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EscUJBQXFCO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsMkJBQTJCLGdDQUFnQztBQUMzRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBLHFCQUFxQjtBQUNyQjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhOztBQUViO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLFNBQVM7QUFDVDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2IsU0FBUzs7QUFFVDtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYixTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTs7QUFFQSwyQkFBMkIsK0JBQStCO0FBQzFEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYixTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2IsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLDJCQUEyQixrQkFBa0I7QUFDN0M7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLENBQUM7O0FBRUQ7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBbUM7QUFDbkM7QUFDQTtBQUNBLDZDQUE2QyxhQUFhO0FBQzFEO0FBQ0EsMkNBQTJDO0FBQzNDLDhDQUE4QztBQUM5QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDRCQUE0Qjs7QUFFNUI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQSxDQUFDOztBQUVEO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2IsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQSxZQUFZLE9BQU87QUFDbkIsWUFBWSxXQUFXO0FBQ3ZCLFlBQVksU0FBUztBQUNyQixZQUFZLFFBQVE7QUFDcEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5QkFBeUI7QUFDekI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQkFBcUI7QUFDckI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsbUNBQW1DLDJFQUEyRTtBQUM5RztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwrQkFBK0I7O0FBRS9CO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EscUJBQXFCO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCOztBQUVqQjtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpREFBaUQsU0FBUztBQUMxRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQSxvQkFBb0IsV0FBVztBQUMvQixvQkFBb0IsTUFBTTtBQUMxQixxQkFBcUIsT0FBTztBQUM1QjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLGFBQWE7QUFDYixTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQSxvQkFBb0IsWUFBWTtBQUNoQyxvQkFBb0IsUUFBUTtBQUM1QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQSxvQkFBb0IsWUFBWTtBQUNoQyxvQkFBb0IsV0FBVztBQUMvQixvQkFBb0IsUUFBUTtBQUM1QjtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLENBQUM7O0FBRUQ7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2IsU0FBUztBQUNUOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQSwrQ0FBK0MsT0FBTztBQUN0RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0EsYUFBYTs7QUFFYixrREFBa0QsU0FBUztBQUMzRDtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQSxTQUFTOztBQUVUOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBLFNBQVM7O0FBRVQ7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTs7QUFFYjtBQUNBOztBQUVBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EseUJBQXlCO0FBQ3pCLHFCQUFxQjtBQUNyQjtBQUNBLGFBQWE7O0FBRWI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EscUJBQXFCOztBQUVyQjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsYUFBYTs7QUFFYixtQ0FBbUMsbUNBQW1DO0FBQ3RFLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBLHVDQUF1QyxpQ0FBaUM7QUFDeEUsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjs7QUFFakI7QUFDQTtBQUNBLHFEQUFxRCxzREFBc0Q7QUFDM0c7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsMENBQTBDLHdDQUF3QztBQUNsRjtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxnQ0FBZ0M7O0FBRWhDO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0EsU0FBUzs7QUFFVDs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFlBQVk7QUFDWjtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7O0FBRUE7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQTtBQUNBOztBQUVBO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxzQ0FBc0M7QUFDdEM7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHNDQUFzQztBQUN0QztBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esc0NBQXNDO0FBQ3RDO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsdUNBQXVDO0FBQ3ZDO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxDQUFDOztBQUVEO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQSxnQ0FBZ0M7QUFDaEMsZ0NBQWdDOztBQUVoQztBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLCtCQUErQjs7QUFFL0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQSxDQUFDO0FBQ0Q7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBOztBQUVBLDRCQUE0QjtBQUM1QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLFNBQVM7O0FBRVQ7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHNEQUFzRCxLQUFLO0FBQzNEO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBLENBQUM7O0FBRUQ7QUFDQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQ0FBcUM7QUFDckM7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjs7QUFFakI7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjs7QUFFQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLOztBQUVMO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsaURBQWlELElBQUksNkVBQTZFO0FBQ2xJO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0EsMkJBQTJCLHVDQUF1QztBQUNsRTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQkFBcUI7QUFDckI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDJCQUEyQiwwQkFBMEI7QUFDckQ7QUFDQTtBQUNBO0FBQ0EsMkRBQTJELDBEQUEwRDtBQUNySDtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSwyQkFBMkIsa0JBQWtCO0FBQzdDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQkFBcUI7QUFDckI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBOztBQUVBLG9DQUFvQyw2QkFBNkI7QUFDakU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBLDJCQUEyQixpREFBaUQ7QUFDNUU7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQkFBcUI7QUFDckI7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLEtBQUs7O0FBRUw7QUFDQSxDQUFDOztBQUVEO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7O0FBRUE7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQSxLQUFLOztBQUVMO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSwrQ0FBK0M7QUFDL0M7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQSxLQUFLOztBQUVMO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLCtCQUErQjtBQUMvQjs7QUFFQTs7QUFFQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxTQUFTOztBQUVUOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSwyQkFBMkIscUJBQXFCO0FBQ2hEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxzQ0FBc0M7QUFDdEM7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esc0NBQXNDO0FBQ3RDOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2IsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYiw2Q0FBNkMsY0FBYztBQUMzRDtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQSxDQUFDOztBQUVEO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsK0JBQStCO0FBQy9COztBQUVBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLFNBQVM7O0FBRVQ7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHNDQUFzQztBQUN0Qzs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxzQ0FBc0M7QUFDdEM7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYixTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiLDZDQUE2QyxjQUFjO0FBQzNEO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBLENBQUM7QUFDRDtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0Esc0RBQXNELDhDQUE4Qzs7QUFFcEc7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsNkJBQTZCLGdCQUFnQjs7QUFFN0M7QUFDQSw2QkFBNkIsNkJBQTZCLFFBQVEsUUFBUSxrQkFBa0IsUUFBUSxRQUFRLG9CQUFvQixRQUFRLFFBQVEsaUJBQWlCLFFBQVE7O0FBRXpLO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGVBQWUsTUFBTTtBQUNyQixlQUFlLElBQUk7QUFDbkIsZUFBZSxJQUFJO0FBQ25CLGdCQUFnQixPQUFPO0FBQ3ZCO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLDJCQUEyQiwrQkFBK0I7QUFDMUQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLCtCQUErQix1QkFBdUI7QUFDdEQ7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsK0NBQStDLDRDQUE0QztBQUMzRjtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsK0NBQStDLDRDQUE0QztBQUMzRixhQUFhO0FBQ2IsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0EscUVBQXFFLG9CQUFvQixvQkFBb0IsYUFBYSxjQUFjLGtCQUFrQjtBQUMxSjtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsdUJBQXVCLHlCQUF5QjtBQUNoRDtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLHVCQUF1QixtQkFBbUI7QUFDMUM7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxTQUFTOztBQUVUO0FBQ0EsbURBQW1EO0FBQ25EO0FBQ0E7QUFDQTtBQUNBLGFBQWE7O0FBRWI7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBLHVCQUF1QixtQkFBbUI7QUFDMUM7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLHFHQUFxRztBQUNyRyxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLHVCQUF1QixrQkFBa0I7QUFDekM7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSx1QkFBdUIsa0JBQWtCO0FBQ3pDOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBLENBQUM7O0FBRUQ7QUFDQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBLENBQUM7O0FBRUQ7QUFDQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2IsU0FBUzs7QUFFVDs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBLGFBQWE7QUFDYjtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhOztBQUViOztBQUVBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQkFBcUI7QUFDckI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhOztBQUViO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDs7QUFFQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYixTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYixTQUFTOztBQUVUO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiLFNBQVM7O0FBRVQ7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7O0FBRUE7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQSw4Q0FBOEM7QUFDOUM7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBLDhDQUE4QztBQUM5QztBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiLFNBQVM7O0FBRVQ7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDZFQUE2RTs7QUFFN0U7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxTQUFTOztBQUVUOztBQUVBO0FBQ0E7QUFDQTtBQUNBLDhDQUE4QztBQUM5QztBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhOztBQUViO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EscUJBQXFCO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7O0FBRWI7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EscUJBQXFCO0FBQ3JCO0FBQ0E7QUFDQTs7QUFFQSxvREFBb0Q7QUFDcEQ7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTs7QUFFQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw4QkFBOEI7QUFDOUIscUNBQXFDO0FBQ3JDOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7O0FBRWpCO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0EsS0FBSzs7QUFFTDtBQUNBLENBQUM7O0FBRUQ7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EseUJBQXlCO0FBQ3pCO0FBQ0EsaUJBQWlCO0FBQ2pCO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQSxDQUFDOztBQUVEO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSxTQUFTO0FBQ1Q7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsMkJBQTJCLHFCQUFxQjtBQUNoRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0Esd0NBQXdDLE9BQU87QUFDL0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNERBQTREO0FBQzVEO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiOztBQUVBLDRDQUE0QztBQUM1Qzs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhOztBQUViO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTs7QUFFYjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxTQUFTOztBQUVUO0FBQ0E7O0FBRUE7QUFDQSxTQUFTOztBQUVUO0FBQ0E7O0FBRUE7QUFDQSxTQUFTOztBQUVUO0FBQ0E7O0FBRUE7QUFDQSxTQUFTOztBQUVUO0FBQ0E7O0FBRUE7QUFDQSxTQUFTOztBQUVUO0FBQ0E7O0FBRUE7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYixTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBLDRCQUE0QjtBQUM1Qjs7QUFFQSx1QkFBdUIsU0FBUztBQUNoQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLHdEQUF3RDtBQUN4RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGtFQUFrRTtBQUNsRTtBQUNBLHlCQUF5QjtBQUN6QjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBOztBQUVBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsYUFBYTs7QUFFYjtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0EsZ0NBQWdDO0FBQ2hDOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw2QkFBNkI7QUFDN0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLHlCQUF5QjtBQUN6QjtBQUNBOztBQUVBO0FBQ0E7QUFDQSx5QkFBeUI7QUFDekI7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwrREFBK0QsU0FBUztBQUN4RTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7QUFDQSxTQUFTOztBQUVUO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBLCtDQUErQyw0Q0FBNEM7QUFDM0YsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsYUFBYTtBQUNiLFNBQVM7O0FBRVQ7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsNENBQTRDLDBDQUEwQztBQUN0RixhQUFhO0FBQ2IsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHFCQUFxQjtBQUNyQjtBQUNBO0FBQ0EsaUJBQWlCOztBQUVqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsbURBQW1ELDBDQUEwQztBQUM3RjtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esc0JBQXNCO0FBQ3RCO0FBQ0E7QUFDQSxDQUFDOztBQUVEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBLENBQUM7Ozs7Ozs7OztBQzVzUEQ7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSxDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLHVCQUF1QixzQkFBc0I7QUFDN0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQkFBcUI7QUFDckI7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLHFDQUFxQzs7QUFFckM7QUFDQTtBQUNBOztBQUVBLDJCQUEyQjtBQUMzQjtBQUNBO0FBQ0E7QUFDQSw0QkFBNEIsVUFBVSIsImZpbGUiOiIzMC5idW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKmdsb2JhbCBzZWxmLCBkb2N1bWVudCwgRE9NRXhjZXB0aW9uICovXG5cbi8qISBAc291cmNlIGh0dHA6Ly9wdXJsLmVsaWdyZXkuY29tL2dpdGh1Yi9jbGFzc0xpc3QuanMvYmxvYi9tYXN0ZXIvY2xhc3NMaXN0LmpzICovXG5cbi8vIEZ1bGwgcG9seWZpbGwgZm9yIGJyb3dzZXJzIHdpdGggbm8gY2xhc3NMaXN0IHN1cHBvcnRcbmlmICghKFwiY2xhc3NMaXN0XCIgaW4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIl9cIikpKSB7XG4gIChmdW5jdGlvbiAodmlldykge1xuXG4gIFwidXNlIHN0cmljdFwiO1xuXG4gIGlmICghKCdFbGVtZW50JyBpbiB2aWV3KSkgcmV0dXJuO1xuXG4gIHZhclxuICAgICAgY2xhc3NMaXN0UHJvcCA9IFwiY2xhc3NMaXN0XCJcbiAgICAsIHByb3RvUHJvcCA9IFwicHJvdG90eXBlXCJcbiAgICAsIGVsZW1DdHJQcm90byA9IHZpZXcuRWxlbWVudFtwcm90b1Byb3BdXG4gICAgLCBvYmpDdHIgPSBPYmplY3RcbiAgICAsIHN0clRyaW0gPSBTdHJpbmdbcHJvdG9Qcm9wXS50cmltIHx8IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlcGxhY2UoL15cXHMrfFxccyskL2csIFwiXCIpO1xuICAgIH1cbiAgICAsIGFyckluZGV4T2YgPSBBcnJheVtwcm90b1Byb3BdLmluZGV4T2YgfHwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIHZhclxuICAgICAgICAgIGkgPSAwXG4gICAgICAgICwgbGVuID0gdGhpcy5sZW5ndGhcbiAgICAgIDtcbiAgICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgaWYgKGkgaW4gdGhpcyAmJiB0aGlzW2ldID09PSBpdGVtKSB7XG4gICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiAtMTtcbiAgICB9XG4gICAgLy8gVmVuZG9yczogcGxlYXNlIGFsbG93IGNvbnRlbnQgY29kZSB0byBpbnN0YW50aWF0ZSBET01FeGNlcHRpb25zXG4gICAgLCBET01FeCA9IGZ1bmN0aW9uICh0eXBlLCBtZXNzYWdlKSB7XG4gICAgICB0aGlzLm5hbWUgPSB0eXBlO1xuICAgICAgdGhpcy5jb2RlID0gRE9NRXhjZXB0aW9uW3R5cGVdO1xuICAgICAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcbiAgICB9XG4gICAgLCBjaGVja1Rva2VuQW5kR2V0SW5kZXggPSBmdW5jdGlvbiAoY2xhc3NMaXN0LCB0b2tlbikge1xuICAgICAgaWYgKHRva2VuID09PSBcIlwiKSB7XG4gICAgICAgIHRocm93IG5ldyBET01FeChcbiAgICAgICAgICAgIFwiU1lOVEFYX0VSUlwiXG4gICAgICAgICAgLCBcIkFuIGludmFsaWQgb3IgaWxsZWdhbCBzdHJpbmcgd2FzIHNwZWNpZmllZFwiXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBpZiAoL1xccy8udGVzdCh0b2tlbikpIHtcbiAgICAgICAgdGhyb3cgbmV3IERPTUV4KFxuICAgICAgICAgICAgXCJJTlZBTElEX0NIQVJBQ1RFUl9FUlJcIlxuICAgICAgICAgICwgXCJTdHJpbmcgY29udGFpbnMgYW4gaW52YWxpZCBjaGFyYWN0ZXJcIlxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGFyckluZGV4T2YuY2FsbChjbGFzc0xpc3QsIHRva2VuKTtcbiAgICB9XG4gICAgLCBDbGFzc0xpc3QgPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgdmFyXG4gICAgICAgICAgdHJpbW1lZENsYXNzZXMgPSBzdHJUcmltLmNhbGwoZWxlbS5nZXRBdHRyaWJ1dGUoXCJjbGFzc1wiKSB8fCBcIlwiKVxuICAgICAgICAsIGNsYXNzZXMgPSB0cmltbWVkQ2xhc3NlcyA/IHRyaW1tZWRDbGFzc2VzLnNwbGl0KC9cXHMrLykgOiBbXVxuICAgICAgICAsIGkgPSAwXG4gICAgICAgICwgbGVuID0gY2xhc3Nlcy5sZW5ndGhcbiAgICAgIDtcbiAgICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdGhpcy5wdXNoKGNsYXNzZXNbaV0pO1xuICAgICAgfVxuICAgICAgdGhpcy5fdXBkYXRlQ2xhc3NOYW1lID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBlbGVtLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIHRoaXMudG9TdHJpbmcoKSk7XG4gICAgICB9O1xuICAgIH1cbiAgICAsIGNsYXNzTGlzdFByb3RvID0gQ2xhc3NMaXN0W3Byb3RvUHJvcF0gPSBbXVxuICAgICwgY2xhc3NMaXN0R2V0dGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5ldyBDbGFzc0xpc3QodGhpcyk7XG4gICAgfVxuICA7XG4gIC8vIE1vc3QgRE9NRXhjZXB0aW9uIGltcGxlbWVudGF0aW9ucyBkb24ndCBhbGxvdyBjYWxsaW5nIERPTUV4Y2VwdGlvbidzIHRvU3RyaW5nKClcbiAgLy8gb24gbm9uLURPTUV4Y2VwdGlvbnMuIEVycm9yJ3MgdG9TdHJpbmcoKSBpcyBzdWZmaWNpZW50IGhlcmUuXG4gIERPTUV4W3Byb3RvUHJvcF0gPSBFcnJvcltwcm90b1Byb3BdO1xuICBjbGFzc0xpc3RQcm90by5pdGVtID0gZnVuY3Rpb24gKGkpIHtcbiAgICByZXR1cm4gdGhpc1tpXSB8fCBudWxsO1xuICB9O1xuICBjbGFzc0xpc3RQcm90by5jb250YWlucyA9IGZ1bmN0aW9uICh0b2tlbikge1xuICAgIHRva2VuICs9IFwiXCI7XG4gICAgcmV0dXJuIGNoZWNrVG9rZW5BbmRHZXRJbmRleCh0aGlzLCB0b2tlbikgIT09IC0xO1xuICB9O1xuICBjbGFzc0xpc3RQcm90by5hZGQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyXG4gICAgICAgIHRva2VucyA9IGFyZ3VtZW50c1xuICAgICAgLCBpID0gMFxuICAgICAgLCBsID0gdG9rZW5zLmxlbmd0aFxuICAgICAgLCB0b2tlblxuICAgICAgLCB1cGRhdGVkID0gZmFsc2VcbiAgICA7XG4gICAgZG8ge1xuICAgICAgdG9rZW4gPSB0b2tlbnNbaV0gKyBcIlwiO1xuICAgICAgaWYgKGNoZWNrVG9rZW5BbmRHZXRJbmRleCh0aGlzLCB0b2tlbikgPT09IC0xKSB7XG4gICAgICAgIHRoaXMucHVzaCh0b2tlbik7XG4gICAgICAgIHVwZGF0ZWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICB3aGlsZSAoKytpIDwgbCk7XG5cbiAgICBpZiAodXBkYXRlZCkge1xuICAgICAgdGhpcy5fdXBkYXRlQ2xhc3NOYW1lKCk7XG4gICAgfVxuICB9O1xuICBjbGFzc0xpc3RQcm90by5yZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyXG4gICAgICAgIHRva2VucyA9IGFyZ3VtZW50c1xuICAgICAgLCBpID0gMFxuICAgICAgLCBsID0gdG9rZW5zLmxlbmd0aFxuICAgICAgLCB0b2tlblxuICAgICAgLCB1cGRhdGVkID0gZmFsc2VcbiAgICAgICwgaW5kZXhcbiAgICA7XG4gICAgZG8ge1xuICAgICAgdG9rZW4gPSB0b2tlbnNbaV0gKyBcIlwiO1xuICAgICAgaW5kZXggPSBjaGVja1Rva2VuQW5kR2V0SW5kZXgodGhpcywgdG9rZW4pO1xuICAgICAgd2hpbGUgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICB0aGlzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIHVwZGF0ZWQgPSB0cnVlO1xuICAgICAgICBpbmRleCA9IGNoZWNrVG9rZW5BbmRHZXRJbmRleCh0aGlzLCB0b2tlbik7XG4gICAgICB9XG4gICAgfVxuICAgIHdoaWxlICgrK2kgPCBsKTtcblxuICAgIGlmICh1cGRhdGVkKSB7XG4gICAgICB0aGlzLl91cGRhdGVDbGFzc05hbWUoKTtcbiAgICB9XG4gIH07XG4gIGNsYXNzTGlzdFByb3RvLnRvZ2dsZSA9IGZ1bmN0aW9uICh0b2tlbiwgZm9yY2UpIHtcbiAgICB0b2tlbiArPSBcIlwiO1xuXG4gICAgdmFyXG4gICAgICAgIHJlc3VsdCA9IHRoaXMuY29udGFpbnModG9rZW4pXG4gICAgICAsIG1ldGhvZCA9IHJlc3VsdCA/XG4gICAgICAgIGZvcmNlICE9PSB0cnVlICYmIFwicmVtb3ZlXCJcbiAgICAgIDpcbiAgICAgICAgZm9yY2UgIT09IGZhbHNlICYmIFwiYWRkXCJcbiAgICA7XG5cbiAgICBpZiAobWV0aG9kKSB7XG4gICAgICB0aGlzW21ldGhvZF0odG9rZW4pO1xuICAgIH1cblxuICAgIGlmIChmb3JjZSA9PT0gdHJ1ZSB8fCBmb3JjZSA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybiBmb3JjZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICFyZXN1bHQ7XG4gICAgfVxuICB9O1xuICBjbGFzc0xpc3RQcm90by50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5qb2luKFwiIFwiKTtcbiAgfTtcblxuICBpZiAob2JqQ3RyLmRlZmluZVByb3BlcnR5KSB7XG4gICAgdmFyIGNsYXNzTGlzdFByb3BEZXNjID0ge1xuICAgICAgICBnZXQ6IGNsYXNzTGlzdEdldHRlclxuICAgICAgLCBlbnVtZXJhYmxlOiB0cnVlXG4gICAgICAsIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH07XG4gICAgdHJ5IHtcbiAgICAgIG9iakN0ci5kZWZpbmVQcm9wZXJ0eShlbGVtQ3RyUHJvdG8sIGNsYXNzTGlzdFByb3AsIGNsYXNzTGlzdFByb3BEZXNjKTtcbiAgICB9IGNhdGNoIChleCkgeyAvLyBJRSA4IGRvZXNuJ3Qgc3VwcG9ydCBlbnVtZXJhYmxlOnRydWVcbiAgICAgIGlmIChleC5udW1iZXIgPT09IC0weDdGRjVFQzU0KSB7XG4gICAgICAgIGNsYXNzTGlzdFByb3BEZXNjLmVudW1lcmFibGUgPSBmYWxzZTtcbiAgICAgICAgb2JqQ3RyLmRlZmluZVByb3BlcnR5KGVsZW1DdHJQcm90bywgY2xhc3NMaXN0UHJvcCwgY2xhc3NMaXN0UHJvcERlc2MpO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIGlmIChvYmpDdHJbcHJvdG9Qcm9wXS5fX2RlZmluZUdldHRlcl9fKSB7XG4gICAgZWxlbUN0clByb3RvLl9fZGVmaW5lR2V0dGVyX18oY2xhc3NMaXN0UHJvcCwgY2xhc3NMaXN0R2V0dGVyKTtcbiAgfVxuXG4gIH0oc2VsZikpO1xufVxuXG4vKiBCbG9iLmpzXG4gKiBBIEJsb2IgaW1wbGVtZW50YXRpb24uXG4gKiAyMDE0LTA3LTI0XG4gKlxuICogQnkgRWxpIEdyZXksIGh0dHA6Ly9lbGlncmV5LmNvbVxuICogQnkgRGV2aW4gU2FtYXJpbiwgaHR0cHM6Ly9naXRodWIuY29tL2RzYW1hcmluXG4gKiBMaWNlbnNlOiBYMTEvTUlUXG4gKiAgIFNlZSBodHRwczovL2dpdGh1Yi5jb20vZWxpZ3JleS9CbG9iLmpzL2Jsb2IvbWFzdGVyL0xJQ0VOU0UubWRcbiAqL1xuXG4vKmdsb2JhbCBzZWxmLCB1bmVzY2FwZSAqL1xuLypqc2xpbnQgYml0d2lzZTogdHJ1ZSwgcmVnZXhwOiB0cnVlLCBjb25mdXNpb246IHRydWUsIGVzNTogdHJ1ZSwgdmFyczogdHJ1ZSwgd2hpdGU6IHRydWUsXG4gIHBsdXNwbHVzOiB0cnVlICovXG5cbi8qISBAc291cmNlIGh0dHA6Ly9wdXJsLmVsaWdyZXkuY29tL2dpdGh1Yi9CbG9iLmpzL2Jsb2IvbWFzdGVyL0Jsb2IuanMgKi9cblxuKGZ1bmN0aW9uICh2aWV3KSB7XG4gIFwidXNlIHN0cmljdFwiO1xuXG4gIHZpZXcuVVJMID0gdmlldy5VUkwgfHwgdmlldy53ZWJraXRVUkw7XG5cbiAgaWYgKHZpZXcuQmxvYiAmJiB2aWV3LlVSTCkge1xuICAgIHRyeSB7XG4gICAgICBuZXcgQmxvYjtcbiAgICAgIHJldHVybjtcbiAgICB9IGNhdGNoIChlKSB7fVxuICB9XG5cbiAgLy8gSW50ZXJuYWxseSB3ZSB1c2UgYSBCbG9iQnVpbGRlciBpbXBsZW1lbnRhdGlvbiB0byBiYXNlIEJsb2Igb2ZmIG9mXG4gIC8vIGluIG9yZGVyIHRvIHN1cHBvcnQgb2xkZXIgYnJvd3NlcnMgdGhhdCBvbmx5IGhhdmUgQmxvYkJ1aWxkZXJcbiAgdmFyIEJsb2JCdWlsZGVyID0gdmlldy5CbG9iQnVpbGRlciB8fCB2aWV3LldlYktpdEJsb2JCdWlsZGVyIHx8IHZpZXcuTW96QmxvYkJ1aWxkZXIgfHwgKGZ1bmN0aW9uKHZpZXcpIHtcbiAgICB2YXJcbiAgICAgICAgZ2V0X2NsYXNzID0gZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqZWN0KS5tYXRjaCgvXlxcW29iamVjdFxccyguKilcXF0kLylbMV07XG4gICAgICB9XG4gICAgICAsIEZha2VCbG9iQnVpbGRlciA9IGZ1bmN0aW9uIEJsb2JCdWlsZGVyKCkge1xuICAgICAgICB0aGlzLmRhdGEgPSBbXTtcbiAgICAgIH1cbiAgICAgICwgRmFrZUJsb2IgPSBmdW5jdGlvbiBCbG9iKGRhdGEsIHR5cGUsIGVuY29kaW5nKSB7XG4gICAgICAgIHRoaXMuZGF0YSA9IGRhdGE7XG4gICAgICAgIHRoaXMuc2l6ZSA9IGRhdGEubGVuZ3RoO1xuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgICAgICB0aGlzLmVuY29kaW5nID0gZW5jb2Rpbmc7XG4gICAgICB9XG4gICAgICAsIEZCQl9wcm90byA9IEZha2VCbG9iQnVpbGRlci5wcm90b3R5cGVcbiAgICAgICwgRkJfcHJvdG8gPSBGYWtlQmxvYi5wcm90b3R5cGVcbiAgICAgICwgRmlsZVJlYWRlclN5bmMgPSB2aWV3LkZpbGVSZWFkZXJTeW5jXG4gICAgICAsIEZpbGVFeGNlcHRpb24gPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgICAgIHRoaXMuY29kZSA9IHRoaXNbdGhpcy5uYW1lID0gdHlwZV07XG4gICAgICB9XG4gICAgICAsIGZpbGVfZXhfY29kZXMgPSAoXG4gICAgICAgICAgXCJOT1RfRk9VTkRfRVJSIFNFQ1VSSVRZX0VSUiBBQk9SVF9FUlIgTk9UX1JFQURBQkxFX0VSUiBFTkNPRElOR19FUlIgXCJcbiAgICAgICAgKyBcIk5PX01PRElGSUNBVElPTl9BTExPV0VEX0VSUiBJTlZBTElEX1NUQVRFX0VSUiBTWU5UQVhfRVJSXCJcbiAgICAgICkuc3BsaXQoXCIgXCIpXG4gICAgICAsIGZpbGVfZXhfY29kZSA9IGZpbGVfZXhfY29kZXMubGVuZ3RoXG4gICAgICAsIHJlYWxfVVJMID0gdmlldy5VUkwgfHwgdmlldy53ZWJraXRVUkwgfHwgdmlld1xuICAgICAgLCByZWFsX2NyZWF0ZV9vYmplY3RfVVJMID0gcmVhbF9VUkwuY3JlYXRlT2JqZWN0VVJMXG4gICAgICAsIHJlYWxfcmV2b2tlX29iamVjdF9VUkwgPSByZWFsX1VSTC5yZXZva2VPYmplY3RVUkxcbiAgICAgICwgVVJMID0gcmVhbF9VUkxcbiAgICAgICwgYnRvYSA9IHZpZXcuYnRvYVxuICAgICAgLCBhdG9iID0gdmlldy5hdG9iXG5cbiAgICAgICwgQXJyYXlCdWZmZXIgPSB2aWV3LkFycmF5QnVmZmVyXG4gICAgICAsIFVpbnQ4QXJyYXkgPSB2aWV3LlVpbnQ4QXJyYXlcblxuICAgICAgLCBvcmlnaW4gPSAvXltcXHctXSs6XFwvKlxcWz9bXFx3XFwuOi1dK1xcXT8oPzo6WzAtOV0rKT8vXG4gICAgO1xuICAgIEZha2VCbG9iLmZha2UgPSBGQl9wcm90by5mYWtlID0gdHJ1ZTtcbiAgICB3aGlsZSAoZmlsZV9leF9jb2RlLS0pIHtcbiAgICAgIEZpbGVFeGNlcHRpb24ucHJvdG90eXBlW2ZpbGVfZXhfY29kZXNbZmlsZV9leF9jb2RlXV0gPSBmaWxlX2V4X2NvZGUgKyAxO1xuICAgIH1cbiAgICAvLyBQb2x5ZmlsbCBVUkxcbiAgICBpZiAoIXJlYWxfVVJMLmNyZWF0ZU9iamVjdFVSTCkge1xuICAgICAgVVJMID0gdmlldy5VUkwgPSBmdW5jdGlvbih1cmkpIHtcbiAgICAgICAgdmFyXG4gICAgICAgICAgICB1cmlfaW5mbyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWxcIiwgXCJhXCIpXG4gICAgICAgICAgLCB1cmlfb3JpZ2luXG4gICAgICAgIDtcbiAgICAgICAgdXJpX2luZm8uaHJlZiA9IHVyaTtcbiAgICAgICAgaWYgKCEoXCJvcmlnaW5cIiBpbiB1cmlfaW5mbykpIHtcbiAgICAgICAgICBpZiAodXJpX2luZm8ucHJvdG9jb2wudG9Mb3dlckNhc2UoKSA9PT0gXCJkYXRhOlwiKSB7XG4gICAgICAgICAgICB1cmlfaW5mby5vcmlnaW4gPSBudWxsO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB1cmlfb3JpZ2luID0gdXJpLm1hdGNoKG9yaWdpbik7XG4gICAgICAgICAgICB1cmlfaW5mby5vcmlnaW4gPSB1cmlfb3JpZ2luICYmIHVyaV9vcmlnaW5bMV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1cmlfaW5mbztcbiAgICAgIH07XG4gICAgfVxuICAgIFVSTC5jcmVhdGVPYmplY3RVUkwgPSBmdW5jdGlvbihibG9iKSB7XG4gICAgICB2YXJcbiAgICAgICAgICB0eXBlID0gYmxvYi50eXBlXG4gICAgICAgICwgZGF0YV9VUklfaGVhZGVyXG4gICAgICA7XG4gICAgICBpZiAodHlwZSA9PT0gbnVsbCkge1xuICAgICAgICB0eXBlID0gXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIjtcbiAgICAgIH1cbiAgICAgIGlmIChibG9iIGluc3RhbmNlb2YgRmFrZUJsb2IpIHtcbiAgICAgICAgZGF0YV9VUklfaGVhZGVyID0gXCJkYXRhOlwiICsgdHlwZTtcbiAgICAgICAgaWYgKGJsb2IuZW5jb2RpbmcgPT09IFwiYmFzZTY0XCIpIHtcbiAgICAgICAgICByZXR1cm4gZGF0YV9VUklfaGVhZGVyICsgXCI7YmFzZTY0LFwiICsgYmxvYi5kYXRhO1xuICAgICAgICB9IGVsc2UgaWYgKGJsb2IuZW5jb2RpbmcgPT09IFwiVVJJXCIpIHtcbiAgICAgICAgICByZXR1cm4gZGF0YV9VUklfaGVhZGVyICsgXCIsXCIgKyBkZWNvZGVVUklDb21wb25lbnQoYmxvYi5kYXRhKTtcbiAgICAgICAgfSBpZiAoYnRvYSkge1xuICAgICAgICAgIHJldHVybiBkYXRhX1VSSV9oZWFkZXIgKyBcIjtiYXNlNjQsXCIgKyBidG9hKGJsb2IuZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGRhdGFfVVJJX2hlYWRlciArIFwiLFwiICsgZW5jb2RlVVJJQ29tcG9uZW50KGJsb2IuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocmVhbF9jcmVhdGVfb2JqZWN0X1VSTCkge1xuICAgICAgICByZXR1cm4gcmVhbF9jcmVhdGVfb2JqZWN0X1VSTC5jYWxsKHJlYWxfVVJMLCBibG9iKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIFVSTC5yZXZva2VPYmplY3RVUkwgPSBmdW5jdGlvbihvYmplY3RfVVJMKSB7XG4gICAgICBpZiAob2JqZWN0X1VSTC5zdWJzdHJpbmcoMCwgNSkgIT09IFwiZGF0YTpcIiAmJiByZWFsX3Jldm9rZV9vYmplY3RfVVJMKSB7XG4gICAgICAgIHJlYWxfcmV2b2tlX29iamVjdF9VUkwuY2FsbChyZWFsX1VSTCwgb2JqZWN0X1VSTCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBGQkJfcHJvdG8uYXBwZW5kID0gZnVuY3Rpb24oZGF0YS8qLCBlbmRpbmdzKi8pIHtcbiAgICAgIHZhciBiYiA9IHRoaXMuZGF0YTtcbiAgICAgIC8vIGRlY29kZSBkYXRhIHRvIGEgYmluYXJ5IHN0cmluZ1xuICAgICAgaWYgKFVpbnQ4QXJyYXkgJiYgKGRhdGEgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlciB8fCBkYXRhIGluc3RhbmNlb2YgVWludDhBcnJheSkpIHtcbiAgICAgICAgdmFyXG4gICAgICAgICAgICBzdHIgPSBcIlwiXG4gICAgICAgICAgLCBidWYgPSBuZXcgVWludDhBcnJheShkYXRhKVxuICAgICAgICAgICwgaSA9IDBcbiAgICAgICAgICAsIGJ1Zl9sZW4gPSBidWYubGVuZ3RoXG4gICAgICAgIDtcbiAgICAgICAgZm9yICg7IGkgPCBidWZfbGVuOyBpKyspIHtcbiAgICAgICAgICBzdHIgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pO1xuICAgICAgICB9XG4gICAgICAgIGJiLnB1c2goc3RyKTtcbiAgICAgIH0gZWxzZSBpZiAoZ2V0X2NsYXNzKGRhdGEpID09PSBcIkJsb2JcIiB8fCBnZXRfY2xhc3MoZGF0YSkgPT09IFwiRmlsZVwiKSB7XG4gICAgICAgIGlmIChGaWxlUmVhZGVyU3luYykge1xuICAgICAgICAgIHZhciBmciA9IG5ldyBGaWxlUmVhZGVyU3luYztcbiAgICAgICAgICBiYi5wdXNoKGZyLnJlYWRBc0JpbmFyeVN0cmluZyhkYXRhKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gYXN5bmMgRmlsZVJlYWRlciB3b24ndCB3b3JrIGFzIEJsb2JCdWlsZGVyIGlzIHN5bmNcbiAgICAgICAgICB0aHJvdyBuZXcgRmlsZUV4Y2VwdGlvbihcIk5PVF9SRUFEQUJMRV9FUlJcIik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoZGF0YSBpbnN0YW5jZW9mIEZha2VCbG9iKSB7XG4gICAgICAgIGlmIChkYXRhLmVuY29kaW5nID09PSBcImJhc2U2NFwiICYmIGF0b2IpIHtcbiAgICAgICAgICBiYi5wdXNoKGF0b2IoZGF0YS5kYXRhKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YS5lbmNvZGluZyA9PT0gXCJVUklcIikge1xuICAgICAgICAgIGJiLnB1c2goZGVjb2RlVVJJQ29tcG9uZW50KGRhdGEuZGF0YSkpO1xuICAgICAgICB9IGVsc2UgaWYgKGRhdGEuZW5jb2RpbmcgPT09IFwicmF3XCIpIHtcbiAgICAgICAgICBiYi5wdXNoKGRhdGEuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0eXBlb2YgZGF0YSAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgIGRhdGEgKz0gXCJcIjsgLy8gY29udmVydCB1bnN1cHBvcnRlZCB0eXBlcyB0byBzdHJpbmdzXG4gICAgICAgIH1cbiAgICAgICAgLy8gZGVjb2RlIFVURi0xNiB0byBiaW5hcnkgc3RyaW5nXG4gICAgICAgIGJiLnB1c2godW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KGRhdGEpKSk7XG4gICAgICB9XG4gICAgfTtcbiAgICBGQkJfcHJvdG8uZ2V0QmxvYiA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICB0eXBlID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgRmFrZUJsb2IodGhpcy5kYXRhLmpvaW4oXCJcIiksIHR5cGUsIFwicmF3XCIpO1xuICAgIH07XG4gICAgRkJCX3Byb3RvLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gXCJbb2JqZWN0IEJsb2JCdWlsZGVyXVwiO1xuICAgIH07XG4gICAgRkJfcHJvdG8uc2xpY2UgPSBmdW5jdGlvbihzdGFydCwgZW5kLCB0eXBlKSB7XG4gICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICBpZiAoYXJncyA8IDMpIHtcbiAgICAgICAgdHlwZSA9IG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IEZha2VCbG9iKFxuICAgICAgICAgIHRoaXMuZGF0YS5zbGljZShzdGFydCwgYXJncyA+IDEgPyBlbmQgOiB0aGlzLmRhdGEubGVuZ3RoKVxuICAgICAgICAsIHR5cGVcbiAgICAgICAgLCB0aGlzLmVuY29kaW5nXG4gICAgICApO1xuICAgIH07XG4gICAgRkJfcHJvdG8udG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBcIltvYmplY3QgQmxvYl1cIjtcbiAgICB9O1xuICAgIEZCX3Byb3RvLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnNpemUgPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuZGF0YTtcbiAgICB9O1xuICAgIHJldHVybiBGYWtlQmxvYkJ1aWxkZXI7XG4gIH0odmlldykpO1xuXG4gIHZpZXcuQmxvYiA9IGZ1bmN0aW9uKGJsb2JQYXJ0cywgb3B0aW9ucykge1xuICAgIHZhciB0eXBlID0gb3B0aW9ucyA/IChvcHRpb25zLnR5cGUgfHwgXCJcIikgOiBcIlwiO1xuICAgIHZhciBidWlsZGVyID0gbmV3IEJsb2JCdWlsZGVyKCk7XG4gICAgaWYgKGJsb2JQYXJ0cykge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGJsb2JQYXJ0cy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBpZiAoVWludDhBcnJheSAmJiBibG9iUGFydHNbaV0gaW5zdGFuY2VvZiBVaW50OEFycmF5KSB7XG4gICAgICAgICAgYnVpbGRlci5hcHBlbmQoYmxvYlBhcnRzW2ldLmJ1ZmZlcik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgYnVpbGRlci5hcHBlbmQoYmxvYlBhcnRzW2ldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB2YXIgYmxvYiA9IGJ1aWxkZXIuZ2V0QmxvYih0eXBlKTtcbiAgICBpZiAoIWJsb2Iuc2xpY2UgJiYgYmxvYi53ZWJraXRTbGljZSkge1xuICAgICAgYmxvYi5zbGljZSA9IGJsb2Iud2Via2l0U2xpY2U7XG4gICAgfVxuICAgIHJldHVybiBibG9iO1xuICB9O1xuXG4gIHZhciBnZXRQcm90b3R5cGVPZiA9IE9iamVjdC5nZXRQcm90b3R5cGVPZiB8fCBmdW5jdGlvbihvYmplY3QpIHtcbiAgICByZXR1cm4gb2JqZWN0Ll9fcHJvdG9fXztcbiAgfTtcbiAgdmlldy5CbG9iLnByb3RvdHlwZSA9IGdldFByb3RvdHlwZU9mKG5ldyB2aWV3LkJsb2IoKSk7XG59KHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiICYmIHNlbGYgfHwgdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiAmJiB3aW5kb3cgfHwgdGhpcy5jb250ZW50IHx8IHRoaXMpKTtcblxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIHZhciBpc0VsZWN0cm9uID0gdHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHByb2Nlc3MgJiYgcHJvY2Vzcy52ZXJzaW9ucyAmJiBwcm9jZXNzLnZlcnNpb25zLmVsZWN0cm9uO1xuICAgIGlmICghaXNFbGVjdHJvbiAmJiB0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0Jykge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3Rvcnk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWN0b3J5O1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByb290Lk1lZGl1bUVkaXRvciA9IGZhY3Rvcnk7XG4gICAgfVxufSh0aGlzLCBmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIE1lZGl1bUVkaXRvcihlbGVtZW50cywgb3B0aW9ucykge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICByZXR1cm4gdGhpcy5pbml0KGVsZW1lbnRzLCBvcHRpb25zKTtcbn1cblxuTWVkaXVtRWRpdG9yLmV4dGVuc2lvbnMgPSB7fTtcbi8qanNoaW50IHVudXNlZDogdHJ1ZSAqL1xuKGZ1bmN0aW9uICh3aW5kb3cpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBmdW5jdGlvbiBjb3B5SW50byhvdmVyd3JpdGUsIGRlc3QpIHtcbiAgICAgICAgdmFyIHByb3AsXG4gICAgICAgICAgICBzb3VyY2VzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICAgICAgZGVzdCA9IGRlc3QgfHwge307XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc291cmNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IHNvdXJjZXNbaV07XG4gICAgICAgICAgICBpZiAoc291cmNlKSB7XG4gICAgICAgICAgICAgICAgZm9yIChwcm9wIGluIHNvdXJjZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KHByb3ApICYmXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlb2Ygc291cmNlW3Byb3BdICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgKG92ZXJ3cml0ZSB8fCBkZXN0Lmhhc093blByb3BlcnR5KHByb3ApID09PSBmYWxzZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc3RbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRlc3Q7XG4gICAgfVxuXG4gICAgLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL05vZGUvY29udGFpbnNcbiAgICAvLyBTb21lIGJyb3dzZXJzIChpbmNsdWRpbmcgcGhhbnRvbSkgZG9uJ3QgcmV0dXJuIHRydWUgZm9yIE5vZGUuY29udGFpbnMoY2hpbGQpXG4gICAgLy8gaWYgY2hpbGQgaXMgYSB0ZXh0IG5vZGUuICBEZXRlY3QgdGhlc2UgY2FzZXMgaGVyZSBhbmQgdXNlIGEgZmFsbGJhY2tcbiAgICAvLyBmb3IgY2FsbHMgdG8gVXRpbC5pc0Rlc2NlbmRhbnQoKVxuICAgIHZhciBub2RlQ29udGFpbnNXb3Jrc1dpdGhUZXh0Tm9kZXMgPSBmYWxzZTtcbiAgICB0cnkge1xuICAgICAgICB2YXIgdGVzdFBhcmVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLFxuICAgICAgICAgICAgdGVzdFRleHQgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnICcpO1xuICAgICAgICB0ZXN0UGFyZW50LmFwcGVuZENoaWxkKHRlc3RUZXh0KTtcbiAgICAgICAgbm9kZUNvbnRhaW5zV29ya3NXaXRoVGV4dE5vZGVzID0gdGVzdFBhcmVudC5jb250YWlucyh0ZXN0VGV4dCk7XG4gICAgfSBjYXRjaCAoZXhjKSB7fVxuXG4gICAgdmFyIFV0aWwgPSB7XG5cbiAgICAgICAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xNzkwNzQ0NS9ob3ctdG8tZGV0ZWN0LWllMTEjY29tbWVudDMwMTY1ODg4XzE3OTA3NTYyXG4gICAgICAgIC8vIGJ5IHJnODlcbiAgICAgICAgaXNJRTogKChuYXZpZ2F0b3IuYXBwTmFtZSA9PT0gJ01pY3Jvc29mdCBJbnRlcm5ldCBFeHBsb3JlcicpIHx8ICgobmF2aWdhdG9yLmFwcE5hbWUgPT09ICdOZXRzY2FwZScpICYmIChuZXcgUmVnRXhwKCdUcmlkZW50Ly4qcnY6KFswLTldezEsfVsuMC05XXswLH0pJykuZXhlYyhuYXZpZ2F0b3IudXNlckFnZW50KSAhPT0gbnVsbCkpKSxcblxuICAgICAgICBpc0VkZ2U6ICgvRWRnZVxcL1xcZCsvKS5leGVjKG5hdmlnYXRvci51c2VyQWdlbnQpICE9PSBudWxsLFxuXG4gICAgICAgIC8vIGlmIGZpcmVmb3hcbiAgICAgICAgaXNGRjogKG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKS5pbmRleE9mKCdmaXJlZm94JykgPiAtMSksXG5cbiAgICAgICAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMTE3NTIwODQvNTY5MTAxXG4gICAgICAgIGlzTWFjOiAod2luZG93Lm5hdmlnYXRvci5wbGF0Zm9ybS50b1VwcGVyQ2FzZSgpLmluZGV4T2YoJ01BQycpID49IDApLFxuXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNoa2VuYXMvdW5kZXJzY29yZVxuICAgICAgICAvLyBMb25lbHkgbGV0dGVyIE1VU1QgVVNFIHRoZSB1cHBlcmNhc2UgY29kZVxuICAgICAgICBrZXlDb2RlOiB7XG4gICAgICAgICAgICBCQUNLU1BBQ0U6IDgsXG4gICAgICAgICAgICBUQUI6IDksXG4gICAgICAgICAgICBFTlRFUjogMTMsXG4gICAgICAgICAgICBFU0NBUEU6IDI3LFxuICAgICAgICAgICAgU1BBQ0U6IDMyLFxuICAgICAgICAgICAgREVMRVRFOiA0NixcbiAgICAgICAgICAgIEs6IDc1LCAvLyBLIGtleWNvZGUsIGFuZCBub3Qga1xuICAgICAgICAgICAgTTogNzcsXG4gICAgICAgICAgICBWOiA4NlxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXR1cm5zIHRydWUgaWYgaXQncyBtZXRhS2V5IG9uIE1hYywgb3IgY3RybEtleSBvbiBub24tTWFjLlxuICAgICAgICAgKiBTZWUgIzU5MVxuICAgICAgICAgKi9cbiAgICAgICAgaXNNZXRhQ3RybEtleTogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBpZiAoKFV0aWwuaXNNYWMgJiYgZXZlbnQubWV0YUtleSkgfHwgKCFVdGlsLmlzTWFjICYmIGV2ZW50LmN0cmxLZXkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBrZXkgYXNzb2NpYXRlZCB0byB0aGUgZXZlbnQgaXMgaW5zaWRlIGtleXMgYXJyYXlcbiAgICAgICAgICpcbiAgICAgICAgICogQHNlZSA6IGh0dHBzOi8vZ2l0aHViLmNvbS9qcXVlcnkvanF1ZXJ5L2Jsb2IvMDcwNWJlNDc1MDkyYWVkZTFlZGRhZTAxMzE5ZWM5MzFmYjljNjVmYy9zcmMvZXZlbnQuanMjTDQ3My1MNDg0XG4gICAgICAgICAqIEBzZWUgOiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcS80NDcxNTgyLzU2OTEwMVxuICAgICAgICAgKi9cbiAgICAgICAgaXNLZXk6IGZ1bmN0aW9uIChldmVudCwga2V5cykge1xuICAgICAgICAgICAgdmFyIGtleUNvZGUgPSBVdGlsLmdldEtleUNvZGUoZXZlbnQpO1xuXG4gICAgICAgICAgICAvLyBpdCdzIG5vdCBhbiBhcnJheSBsZXQncyBqdXN0IGNvbXBhcmUgc3RyaW5ncyFcbiAgICAgICAgICAgIGlmIChmYWxzZSA9PT0gQXJyYXkuaXNBcnJheShrZXlzKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBrZXlDb2RlID09PSBrZXlzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoLTEgPT09IGtleXMuaW5kZXhPZihrZXlDb2RlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0S2V5Q29kZTogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICB2YXIga2V5Q29kZSA9IGV2ZW50LndoaWNoO1xuXG4gICAgICAgICAgICAvLyBnZXR0aW5nIHRoZSBrZXkgY29kZSBmcm9tIGV2ZW50XG4gICAgICAgICAgICBpZiAobnVsbCA9PT0ga2V5Q29kZSkge1xuICAgICAgICAgICAgICAgIGtleUNvZGUgPSBldmVudC5jaGFyQ29kZSAhPT0gbnVsbCA/IGV2ZW50LmNoYXJDb2RlIDogZXZlbnQua2V5Q29kZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGtleUNvZGU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYmxvY2tDb250YWluZXJFbGVtZW50TmFtZXM6IFtcbiAgICAgICAgICAgIC8vIGVsZW1lbnRzIG91ciBlZGl0b3IgZ2VuZXJhdGVzXG4gICAgICAgICAgICAncCcsICdoMScsICdoMicsICdoMycsICdoNCcsICdoNScsICdoNicsICdibG9ja3F1b3RlJywgJ3ByZScsICd1bCcsICdsaScsICdvbCcsXG4gICAgICAgICAgICAvLyBhbGwgb3RoZXIga25vd24gYmxvY2sgZWxlbWVudHNcbiAgICAgICAgICAgICdhZGRyZXNzJywgJ2FydGljbGUnLCAnYXNpZGUnLCAnYXVkaW8nLCAnY2FudmFzJywgJ2RkJywgJ2RsJywgJ2R0JywgJ2ZpZWxkc2V0JyxcbiAgICAgICAgICAgICdmaWdjYXB0aW9uJywgJ2ZpZ3VyZScsICdmb290ZXInLCAnZm9ybScsICdoZWFkZXInLCAnaGdyb3VwJywgJ21haW4nLCAnbmF2JyxcbiAgICAgICAgICAgICdub3NjcmlwdCcsICdvdXRwdXQnLCAnc2VjdGlvbicsICd2aWRlbycsXG4gICAgICAgICAgICAndGFibGUnLCAndGhlYWQnLCAndGJvZHknLCAndGZvb3QnLCAndHInLCAndGgnLCAndGQnXG4gICAgICAgIF0sXG5cbiAgICAgICAgZW1wdHlFbGVtZW50TmFtZXM6IFsnYnInLCAnY29sJywgJ2NvbGdyb3VwJywgJ2hyJywgJ2ltZycsICdpbnB1dCcsICdzb3VyY2UnLCAnd2JyJ10sXG5cbiAgICAgICAgZXh0ZW5kOiBmdW5jdGlvbiBleHRlbmQoLyogZGVzdCwgc291cmNlMSwgc291cmNlMiwgLi4uKi8pIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gW3RydWVdLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcbiAgICAgICAgICAgIHJldHVybiBjb3B5SW50by5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBkZWZhdWx0czogZnVuY3Rpb24gZGVmYXVsdHMoLypkZXN0LCBzb3VyY2UxLCBzb3VyY2UyLCAuLi4qLykge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBbZmFsc2VdLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcbiAgICAgICAgICAgIHJldHVybiBjb3B5SW50by5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKlxuICAgICAgICAgKiBDcmVhdGUgYSBsaW5rIGFyb3VuZCB0aGUgcHJvdmlkZWQgdGV4dCBub2RlcyB3aGljaCBtdXN0IGJlIGFkamFjZW50IHRvIGVhY2ggb3RoZXIgYW5kIGFsbCBiZVxuICAgICAgICAgKiBkZXNjZW5kYW50cyBvZiB0aGUgc2FtZSBjbG9zZXN0IGJsb2NrIGNvbnRhaW5lci4gSWYgdGhlIHByZWNvbmRpdGlvbnMgYXJlIG5vdCBtZXQsIHVuZXhwZWN0ZWRcbiAgICAgICAgICogYmVoYXZpb3Igd2lsbCByZXN1bHQuXG4gICAgICAgICAqL1xuICAgICAgICBjcmVhdGVMaW5rOiBmdW5jdGlvbiAoZG9jdW1lbnQsIHRleHROb2RlcywgaHJlZiwgdGFyZ2V0KSB7XG4gICAgICAgICAgICB2YXIgYW5jaG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgICAgICAgVXRpbC5tb3ZlVGV4dFJhbmdlSW50b0VsZW1lbnQodGV4dE5vZGVzWzBdLCB0ZXh0Tm9kZXNbdGV4dE5vZGVzLmxlbmd0aCAtIDFdLCBhbmNob3IpO1xuICAgICAgICAgICAgYW5jaG9yLnNldEF0dHJpYnV0ZSgnaHJlZicsIGhyZWYpO1xuICAgICAgICAgICAgaWYgKHRhcmdldCkge1xuICAgICAgICAgICAgICAgIGlmICh0YXJnZXQgPT09ICdfYmxhbmsnKSB7XG4gICAgICAgICAgICAgICAgICAgIGFuY2hvci5zZXRBdHRyaWJ1dGUoJ3JlbCcsICdub29wZW5lciBub3JlZmVycmVyJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFuY2hvci5zZXRBdHRyaWJ1dGUoJ3RhcmdldCcsIHRhcmdldCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYW5jaG9yO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qXG4gICAgICAgICAqIEdpdmVuIHRoZSBwcm92aWRlZCBtYXRjaCBpbiB0aGUgZm9ybWF0IHtzdGFydDogMSwgZW5kOiAyfSB3aGVyZSBzdGFydCBhbmQgZW5kIGFyZSBpbmRpY2VzIGludG8gdGhlXG4gICAgICAgICAqIHRleHRDb250ZW50IG9mIHRoZSBwcm92aWRlZCBlbGVtZW50IGFyZ3VtZW50LCBtb2RpZnkgdGhlIERPTSBpbnNpZGUgZWxlbWVudCB0byBlbnN1cmUgdGhhdCB0aGUgdGV4dFxuICAgICAgICAgKiBpZGVudGlmaWVkIGJ5IHRoZSBwcm92aWRlZCBtYXRjaCBjYW4gYmUgcmV0dXJuZWQgYXMgdGV4dCBub2RlcyB0aGF0IGNvbnRhaW4gZXhhY3RseSB0aGF0IHRleHQsIHdpdGhvdXRcbiAgICAgICAgICogYW55IGFkZGl0aW9uYWwgdGV4dCBhdCB0aGUgYmVnaW5uaW5nIG9yIGVuZCBvZiB0aGUgcmV0dXJuZWQgYXJyYXkgb2YgYWRqYWNlbnQgdGV4dCBub2Rlcy5cbiAgICAgICAgICpcbiAgICAgICAgICogVGhlIG9ubHkgRE9NIG1hbmlwdWxhdGlvbiBwZXJmb3JtZWQgYnkgdGhpcyBmdW5jdGlvbiBpcyBzcGxpdHRpbmcgdGhlIHRleHQgbm9kZXMsIG5vbi10ZXh0IG5vZGVzIGFyZVxuICAgICAgICAgKiBub3QgYWZmZWN0ZWQgaW4gYW55IHdheS5cbiAgICAgICAgICovXG4gICAgICAgIGZpbmRPckNyZWF0ZU1hdGNoaW5nVGV4dE5vZGVzOiBmdW5jdGlvbiAoZG9jdW1lbnQsIGVsZW1lbnQsIG1hdGNoKSB7XG4gICAgICAgICAgICB2YXIgdHJlZVdhbGtlciA9IGRvY3VtZW50LmNyZWF0ZVRyZWVXYWxrZXIoZWxlbWVudCwgTm9kZUZpbHRlci5TSE9XX0FMTCwgbnVsbCwgZmFsc2UpLFxuICAgICAgICAgICAgICAgIG1hdGNoZWROb2RlcyA9IFtdLFxuICAgICAgICAgICAgICAgIGN1cnJlbnRUZXh0SW5kZXggPSAwLFxuICAgICAgICAgICAgICAgIHN0YXJ0UmVhY2hlZCA9IGZhbHNlLFxuICAgICAgICAgICAgICAgIGN1cnJlbnROb2RlID0gbnVsbCxcbiAgICAgICAgICAgICAgICBuZXdOb2RlID0gbnVsbDtcblxuICAgICAgICAgICAgd2hpbGUgKChjdXJyZW50Tm9kZSA9IHRyZWVXYWxrZXIubmV4dE5vZGUoKSkgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudE5vZGUubm9kZVR5cGUgPiAzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VycmVudE5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzdGFydFJlYWNoZWQgJiYgbWF0Y2guc3RhcnQgPCAoY3VycmVudFRleHRJbmRleCArIGN1cnJlbnROb2RlLm5vZGVWYWx1ZS5sZW5ndGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydFJlYWNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3Tm9kZSA9IFV0aWwuc3BsaXRTdGFydE5vZGVJZk5lZWRlZChjdXJyZW50Tm9kZSwgbWF0Y2guc3RhcnQsIGN1cnJlbnRUZXh0SW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGFydFJlYWNoZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFV0aWwuc3BsaXRFbmROb2RlSWZOZWVkZWQoY3VycmVudE5vZGUsIG5ld05vZGUsIG1hdGNoLmVuZCwgY3VycmVudFRleHRJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXJ0UmVhY2hlZCAmJiBjdXJyZW50VGV4dEluZGV4ID09PSBtYXRjaC5lbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrOyAvLyBGb3VuZCB0aGUgbm9kZShzKSBjb3JyZXNwb25kaW5nIHRvIHRoZSBsaW5rLiBCcmVhayBvdXQgYW5kIG1vdmUgb24gdG8gdGhlIG5leHQuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RhcnRSZWFjaGVkICYmIGN1cnJlbnRUZXh0SW5kZXggPiAobWF0Y2guZW5kICsgMSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUGVyZm9ybUxpbmtpbmcgb3ZlcnNob3QgdGhlIHRhcmdldCEnKTsgLy8gc2hvdWxkIG5ldmVyIGhhcHBlbi4uLlxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXJ0UmVhY2hlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZE5vZGVzLnB1c2gobmV3Tm9kZSB8fCBjdXJyZW50Tm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50VGV4dEluZGV4ICs9IGN1cnJlbnROb2RlLm5vZGVWYWx1ZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXdOb2RlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50VGV4dEluZGV4ICs9IG5ld05vZGUubm9kZVZhbHVlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNraXAgdGhlIG5ld05vZGUgYXMgd2UnbGwgYWxyZWFkeSBoYXZlIHB1c2hlZCBpdCB0byB0aGUgbWF0Y2hlc1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJlZVdhbGtlci5uZXh0Tm9kZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG5ld05vZGUgPSBudWxsO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VycmVudE5vZGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnaW1nJykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXN0YXJ0UmVhY2hlZCAmJiAobWF0Y2guc3RhcnQgPD0gY3VycmVudFRleHRJbmRleCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0UmVhY2hlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXJ0UmVhY2hlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZE5vZGVzLnB1c2goY3VycmVudE5vZGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1hdGNoZWROb2RlcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKlxuICAgICAgICAgKiBHaXZlbiB0aGUgcHJvdmlkZWQgdGV4dCBub2RlIGFuZCB0ZXh0IGNvb3JkaW5hdGVzLCBzcGxpdCB0aGUgdGV4dCBub2RlIGlmIG5lZWRlZCB0byBtYWtlIGl0IGFsaWduXG4gICAgICAgICAqIHByZWNpc2VseSB3aXRoIHRoZSBjb29yZGluYXRlcy5cbiAgICAgICAgICpcbiAgICAgICAgICogVGhpcyBmdW5jdGlvbiBpcyBpbnRlbmRlZCB0byBiZSBjYWxsZWQgZnJvbSBVdGlsLmZpbmRPckNyZWF0ZU1hdGNoaW5nVGV4dE5vZGVzLlxuICAgICAgICAgKi9cbiAgICAgICAgc3BsaXRTdGFydE5vZGVJZk5lZWRlZDogZnVuY3Rpb24gKGN1cnJlbnROb2RlLCBtYXRjaFN0YXJ0SW5kZXgsIGN1cnJlbnRUZXh0SW5kZXgpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaFN0YXJ0SW5kZXggIT09IGN1cnJlbnRUZXh0SW5kZXgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY3VycmVudE5vZGUuc3BsaXRUZXh0KG1hdGNoU3RhcnRJbmRleCAtIGN1cnJlbnRUZXh0SW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLypcbiAgICAgICAgICogR2l2ZW4gdGhlIHByb3ZpZGVkIHRleHQgbm9kZSBhbmQgdGV4dCBjb29yZGluYXRlcywgc3BsaXQgdGhlIHRleHQgbm9kZSBpZiBuZWVkZWQgdG8gbWFrZSBpdCBhbGlnblxuICAgICAgICAgKiBwcmVjaXNlbHkgd2l0aCB0aGUgY29vcmRpbmF0ZXMuIFRoZSBuZXdOb2RlIGFyZ3VtZW50IHNob3VsZCBmcm9tIHRoZSByZXN1bHQgb2YgVXRpbC5zcGxpdFN0YXJ0Tm9kZUlmTmVlZGVkLFxuICAgICAgICAgKiBpZiB0aGF0IGZ1bmN0aW9uIGhhcyBiZWVuIGNhbGxlZCBvbiB0aGUgc2FtZSBjdXJyZW50Tm9kZS5cbiAgICAgICAgICpcbiAgICAgICAgICogVGhpcyBmdW5jdGlvbiBpcyBpbnRlbmRlZCB0byBiZSBjYWxsZWQgZnJvbSBVdGlsLmZpbmRPckNyZWF0ZU1hdGNoaW5nVGV4dE5vZGVzLlxuICAgICAgICAgKi9cbiAgICAgICAgc3BsaXRFbmROb2RlSWZOZWVkZWQ6IGZ1bmN0aW9uIChjdXJyZW50Tm9kZSwgbmV3Tm9kZSwgbWF0Y2hFbmRJbmRleCwgY3VycmVudFRleHRJbmRleCkge1xuICAgICAgICAgICAgdmFyIHRleHRJbmRleE9mRW5kT2ZGYXJ0aGVzdE5vZGUsXG4gICAgICAgICAgICAgICAgZW5kU3BsaXRQb2ludDtcbiAgICAgICAgICAgIHRleHRJbmRleE9mRW5kT2ZGYXJ0aGVzdE5vZGUgPSBjdXJyZW50VGV4dEluZGV4ICsgY3VycmVudE5vZGUubm9kZVZhbHVlLmxlbmd0aCArXG4gICAgICAgICAgICAgICAgICAgIChuZXdOb2RlID8gbmV3Tm9kZS5ub2RlVmFsdWUubGVuZ3RoIDogMCkgLSAxO1xuICAgICAgICAgICAgZW5kU3BsaXRQb2ludCA9IG1hdGNoRW5kSW5kZXggLSBjdXJyZW50VGV4dEluZGV4IC1cbiAgICAgICAgICAgICAgICAgICAgKG5ld05vZGUgPyBjdXJyZW50Tm9kZS5ub2RlVmFsdWUubGVuZ3RoIDogMCk7XG4gICAgICAgICAgICBpZiAodGV4dEluZGV4T2ZFbmRPZkZhcnRoZXN0Tm9kZSA+PSBtYXRjaEVuZEluZGV4ICYmXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRUZXh0SW5kZXggIT09IHRleHRJbmRleE9mRW5kT2ZGYXJ0aGVzdE5vZGUgJiZcbiAgICAgICAgICAgICAgICAgICAgZW5kU3BsaXRQb2ludCAhPT0gMCkge1xuICAgICAgICAgICAgICAgIChuZXdOb2RlIHx8IGN1cnJlbnROb2RlKS5zcGxpdFRleHQoZW5kU3BsaXRQb2ludCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLypcbiAgICAgICAgKiBUYWtlIGFuIGVsZW1lbnQsIGFuZCBicmVhayB1cCBhbGwgb2YgaXRzIHRleHQgY29udGVudCBpbnRvIHVuaXF1ZSBwaWVjZXMgc3VjaCB0aGF0OlxuICAgICAgICAgKiAxKSBBbGwgdGV4dCBjb250ZW50IG9mIHRoZSBlbGVtZW50cyBhcmUgaW4gc2VwYXJhdGUgYmxvY2tzLiBObyBwaWVjZSBvZiB0ZXh0IGNvbnRlbnQgc2hvdWxkIHNwYW5cbiAgICAgICAgICogICAgYWNyb3NzIG11bHRpcGxlIGJsb2Nrcy4gVGhpcyBtZWFucyBubyBlbGVtZW50IHJldHVybiBieSB0aGlzIGZ1bmN0aW9uIHNob3VsZCBoYXZlXG4gICAgICAgICAqICAgIGFueSBibG9ja3MgYXMgY2hpbGRyZW4uXG4gICAgICAgICAqIDIpIFRoZSB1bmlvbiBvZiB0aGUgdGV4dGNvbnRlbnQgb2YgYWxsIG9mIHRoZSBlbGVtZW50cyByZXR1cm5lZCBoZXJlIGNvdmVycyBhbGxcbiAgICAgICAgICogICAgb2YgdGhlIHRleHQgd2l0aGluIHRoZSBlbGVtZW50LlxuICAgICAgICAgKlxuICAgICAgICAgKlxuICAgICAgICAgKiBFWEFNUExFOlxuICAgICAgICAgKiBJbiB0aGUgZXZlbnQgdGhhdCB3ZSBoYXZlIHNvbWV0aGluZyBsaWtlOlxuICAgICAgICAgKlxuICAgICAgICAgKiA8YmxvY2txdW90ZT5cbiAgICAgICAgICogICA8cD5Tb21lIFRleHQ8L3A+XG4gICAgICAgICAqICAgPG9sPlxuICAgICAgICAgKiAgICAgPGxpPkxpc3QgSXRlbSAxPC9saT5cbiAgICAgICAgICogICAgIDxsaT5MaXN0IEl0ZW0gMjwvbGk+XG4gICAgICAgICAqICAgPC9vbD5cbiAgICAgICAgICogPC9ibG9ja3F1b3RlPlxuICAgICAgICAgKlxuICAgICAgICAgKiBUaGlzIGZ1bmN0aW9uIHdvdWxkIHJldHVybiB0aGVzZSBlbGVtZW50cyBhcyBhbiBhcnJheTpcbiAgICAgICAgICogICBbIDxwPlNvbWUgVGV4dDwvcD4sIDxsaT5MaXN0IEl0ZW0gMTwvbGk+LCA8bGk+TGlzdCBJdGVtIDI8L2xpPiBdXG4gICAgICAgICAqXG4gICAgICAgICAqIFNpbmNlIHRoZSA8YmxvY2txdW90ZT4gYW5kIDxvbD4gZWxlbWVudHMgY29udGFpbiBibG9ja3Mgd2l0aGluIHRoZW0gdGhleSBhcmUgbm90IHJldHVybmVkLlxuICAgICAgICAgKiBTaW5jZSB0aGUgPHA+IGFuZCA8bGk+J3MgZG9uJ3QgY29udGFpbiBibG9jayBlbGVtZW50cyBhbmQgY292ZXIgYWxsIHRoZSB0ZXh0IGNvbnRlbnQgb2YgdGhlXG4gICAgICAgICAqIDxibG9ja3F1b3RlPiBjb250YWluZXIsIHRoZXkgYXJlIHRoZSBlbGVtZW50cyByZXR1cm5lZC5cbiAgICAgICAgICovXG4gICAgICAgIHNwbGl0QnlCbG9ja0VsZW1lbnRzOiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICAgICAgaWYgKGVsZW1lbnQubm9kZVR5cGUgIT09IDMgJiYgZWxlbWVudC5ub2RlVHlwZSAhPT0gMSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHRvUmV0ID0gW10sXG4gICAgICAgICAgICAgICAgYmxvY2tFbGVtZW50UXVlcnkgPSBNZWRpdW1FZGl0b3IudXRpbC5ibG9ja0NvbnRhaW5lckVsZW1lbnROYW1lcy5qb2luKCcsJyk7XG5cbiAgICAgICAgICAgIGlmIChlbGVtZW50Lm5vZGVUeXBlID09PSAzIHx8IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbChibG9ja0VsZW1lbnRRdWVyeSkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtlbGVtZW50XTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50LmNoaWxkTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgY2hpbGQgPSBlbGVtZW50LmNoaWxkTm9kZXNbaV07XG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvUmV0LnB1c2goY2hpbGQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2hpbGQubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGJsb2NrRWxlbWVudHMgPSBjaGlsZC5xdWVyeVNlbGVjdG9yQWxsKGJsb2NrRWxlbWVudFF1ZXJ5KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJsb2NrRWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b1JldC5wdXNoKGNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvUmV0ID0gdG9SZXQuY29uY2F0KE1lZGl1bUVkaXRvci51dGlsLnNwbGl0QnlCbG9ja0VsZW1lbnRzKGNoaWxkKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0b1JldDtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBGaW5kIHRoZSBuZXh0IG5vZGUgaW4gdGhlIERPTSB0cmVlIHRoYXQgcmVwcmVzZW50cyBhbnkgdGV4dCB0aGF0IGlzIGJlaW5nXG4gICAgICAgIC8vIGRpc3BsYXllZCBkaXJlY3RseSBuZXh0IHRvIHRoZSB0YXJnZXROb2RlIChwYXNzZWQgYXMgYW4gYXJndW1lbnQpXG4gICAgICAgIC8vIFRleHQgdGhhdCBhcHBlYXJzIGRpcmVjdGx5IG5leHQgdG8gdGhlIGN1cnJlbnQgbm9kZSBjYW4gYmU6XG4gICAgICAgIC8vICAtIEEgc2libGluZyB0ZXh0IG5vZGVcbiAgICAgICAgLy8gIC0gQSBkZXNjZW5kYW50IG9mIGEgc2libGluZyBlbGVtZW50XG4gICAgICAgIC8vICAtIEEgc2libGluZyB0ZXh0IG5vZGUgb2YgYW4gYW5jZXN0b3JcbiAgICAgICAgLy8gIC0gQSBkZXNjZW5kYW50IG9mIGEgc2libGluZyBlbGVtZW50IG9mIGFuIGFuY2VzdG9yXG4gICAgICAgIGZpbmRBZGphY2VudFRleHROb2RlV2l0aENvbnRlbnQ6IGZ1bmN0aW9uIGZpbmRBZGphY2VudFRleHROb2RlV2l0aENvbnRlbnQocm9vdE5vZGUsIHRhcmdldE5vZGUsIG93bmVyRG9jdW1lbnQpIHtcbiAgICAgICAgICAgIHZhciBwYXN0VGFyZ2V0ID0gZmFsc2UsXG4gICAgICAgICAgICAgICAgbmV4dE5vZGUsXG4gICAgICAgICAgICAgICAgbm9kZUl0ZXJhdG9yID0gb3duZXJEb2N1bWVudC5jcmVhdGVOb2RlSXRlcmF0b3Iocm9vdE5vZGUsIE5vZGVGaWx0ZXIuU0hPV19URVhULCBudWxsLCBmYWxzZSk7XG5cbiAgICAgICAgICAgIC8vIFVzZSBhIG5hdGl2ZSBOb2RlSXRlcmF0b3IgdG8gaXRlcmF0ZSBvdmVyIGFsbCB0aGUgdGV4dCBub2RlcyB0aGF0IGFyZSBkZXNjZW5kYW50c1xuICAgICAgICAgICAgLy8gb2YgdGhlIHJvb3ROb2RlLiAgT25jZSBwYXN0IHRoZSB0YXJnZXROb2RlLCBjaG9vc2UgdGhlIGZpcnN0IG5vbi1lbXB0eSB0ZXh0IG5vZGVcbiAgICAgICAgICAgIG5leHROb2RlID0gbm9kZUl0ZXJhdG9yLm5leHROb2RlKCk7XG4gICAgICAgICAgICB3aGlsZSAobmV4dE5vZGUpIHtcbiAgICAgICAgICAgICAgICBpZiAobmV4dE5vZGUgPT09IHRhcmdldE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFzdFRhcmdldCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwYXN0VGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXh0Tm9kZS5ub2RlVHlwZSA9PT0gMyAmJiBuZXh0Tm9kZS5ub2RlVmFsdWUgJiYgbmV4dE5vZGUubm9kZVZhbHVlLnRyaW0oKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBuZXh0Tm9kZSA9IG5vZGVJdGVyYXRvci5uZXh0Tm9kZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gbmV4dE5vZGU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gRmluZCBhbiBlbGVtZW50J3MgcHJldmlvdXMgc2libGluZyB3aXRoaW4gYSBtZWRpdW0tZWRpdG9yIGVsZW1lbnRcbiAgICAgICAgLy8gSWYgb25lIGRvZXNuJ3QgZXhpc3QsIGZpbmQgdGhlIGNsb3Nlc3QgYW5jZXN0b3IncyBwcmV2aW91cyBzaWJsaW5nXG4gICAgICAgIGZpbmRQcmV2aW91c1NpYmxpbmc6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICBpZiAoIW5vZGUgfHwgVXRpbC5pc01lZGl1bUVkaXRvckVsZW1lbnQobm9kZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBwcmV2aW91c1NpYmxpbmcgPSBub2RlLnByZXZpb3VzU2libGluZztcbiAgICAgICAgICAgIHdoaWxlICghcHJldmlvdXNTaWJsaW5nICYmICFVdGlsLmlzTWVkaXVtRWRpdG9yRWxlbWVudChub2RlLnBhcmVudE5vZGUpKSB7XG4gICAgICAgICAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICBwcmV2aW91c1NpYmxpbmcgPSBub2RlLnByZXZpb3VzU2libGluZztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHByZXZpb3VzU2libGluZztcbiAgICAgICAgfSxcblxuICAgICAgICBpc0Rlc2NlbmRhbnQ6IGZ1bmN0aW9uIGlzRGVzY2VuZGFudChwYXJlbnQsIGNoaWxkLCBjaGVja0VxdWFsaXR5KSB7XG4gICAgICAgICAgICBpZiAoIXBhcmVudCB8fCAhY2hpbGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocGFyZW50ID09PSBjaGlsZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhIWNoZWNrRXF1YWxpdHk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBJZiBwYXJlbnQgaXMgbm90IGFuIGVsZW1lbnQsIGl0IGNhbid0IGhhdmUgYW55IGRlc2NlbmRhbnRzXG4gICAgICAgICAgICBpZiAocGFyZW50Lm5vZGVUeXBlICE9PSAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5vZGVDb250YWluc1dvcmtzV2l0aFRleHROb2RlcyB8fCBjaGlsZC5ub2RlVHlwZSAhPT0gMykge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXJlbnQuY29udGFpbnMoY2hpbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIG5vZGUgPSBjaGlsZC5wYXJlbnROb2RlO1xuICAgICAgICAgICAgd2hpbGUgKG5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZSA9PT0gcGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNoa2VuYXMvdW5kZXJzY29yZVxuICAgICAgICBpc0VsZW1lbnQ6IGZ1bmN0aW9uIGlzRWxlbWVudChvYmopIHtcbiAgICAgICAgICAgIHJldHVybiAhIShvYmogJiYgb2JqLm5vZGVUeXBlID09PSAxKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vamFzaGtlbmFzL3VuZGVyc2NvcmVcbiAgICAgICAgdGhyb3R0bGU6IGZ1bmN0aW9uIChmdW5jLCB3YWl0KSB7XG4gICAgICAgICAgICB2YXIgVEhST1RUTEVfSU5URVJWQUwgPSA1MCxcbiAgICAgICAgICAgICAgICBjb250ZXh0LFxuICAgICAgICAgICAgICAgIGFyZ3MsXG4gICAgICAgICAgICAgICAgcmVzdWx0LFxuICAgICAgICAgICAgICAgIHRpbWVvdXQgPSBudWxsLFxuICAgICAgICAgICAgICAgIHByZXZpb3VzID0gMCxcbiAgICAgICAgICAgICAgICBsYXRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJldmlvdXMgPSBEYXRlLm5vdygpO1xuICAgICAgICAgICAgICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aW1lb3V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAoIXdhaXQgJiYgd2FpdCAhPT0gMCkge1xuICAgICAgICAgICAgICAgIHdhaXQgPSBUSFJPVFRMRV9JTlRFUlZBTDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgbm93ID0gRGF0ZS5ub3coKSxcbiAgICAgICAgICAgICAgICAgICAgcmVtYWluaW5nID0gd2FpdCAtIChub3cgLSBwcmV2aW91cyk7XG5cbiAgICAgICAgICAgICAgICBjb250ZXh0ID0gdGhpcztcbiAgICAgICAgICAgICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgICAgIGlmIChyZW1haW5pbmcgPD0gMCB8fCByZW1haW5pbmcgPiB3YWl0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aW1lb3V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBwcmV2aW91cyA9IG5vdztcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aW1lb3V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCF0aW1lb3V0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCByZW1haW5pbmcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSxcblxuICAgICAgICB0cmF2ZXJzZVVwOiBmdW5jdGlvbiAoY3VycmVudCwgdGVzdEVsZW1lbnRGdW5jdGlvbikge1xuICAgICAgICAgICAgaWYgKCFjdXJyZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnQubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRlc3RFbGVtZW50RnVuY3Rpb24oY3VycmVudCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjdXJyZW50O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIGRvIG5vdCB0cmF2ZXJzZSB1cHdhcmRzIHBhc3QgdGhlIG5lYXJlc3QgY29udGFpbmluZyBlZGl0b3JcbiAgICAgICAgICAgICAgICAgICAgaWYgKFV0aWwuaXNNZWRpdW1FZGl0b3JFbGVtZW50KGN1cnJlbnQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjdXJyZW50ID0gY3VycmVudC5wYXJlbnROb2RlO1xuICAgICAgICAgICAgfSB3aGlsZSAoY3VycmVudCk7XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcblxuICAgICAgICBodG1sRW50aXRpZXM6IGZ1bmN0aW9uIChzdHIpIHtcbiAgICAgICAgICAgIC8vIGNvbnZlcnRzIHNwZWNpYWwgY2hhcmFjdGVycyAobGlrZSA8KSBpbnRvIHRoZWlyIGVzY2FwZWQvZW5jb2RlZCB2YWx1ZXMgKGxpa2UgJmx0OykuXG4gICAgICAgICAgICAvLyBUaGlzIGFsbG93cyB5b3UgdG8gc2hvdyB0byBkaXNwbGF5IHRoZSBzdHJpbmcgd2l0aG91dCB0aGUgYnJvd3NlciByZWFkaW5nIGl0IGFzIEhUTUwuXG4gICAgICAgICAgICByZXR1cm4gU3RyaW5nKHN0cikucmVwbGFjZSgvJi9nLCAnJmFtcDsnKS5yZXBsYWNlKC88L2csICcmbHQ7JykucmVwbGFjZSgvPi9nLCAnJmd0OycpLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzY2OTA3NTIvaW5zZXJ0LWh0bWwtYXQtY2FyZXQtaW4tYS1jb250ZW50ZWRpdGFibGUtZGl2XG4gICAgICAgIGluc2VydEhUTUxDb21tYW5kOiBmdW5jdGlvbiAoZG9jLCBodG1sKSB7XG4gICAgICAgICAgICB2YXIgc2VsZWN0aW9uLCByYW5nZSwgZWwsIGZyYWdtZW50LCBub2RlLCBsYXN0Tm9kZSwgdG9SZXBsYWNlLFxuICAgICAgICAgICAgICAgIHJlcyA9IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVjQXJncyA9IFsnaW5zZXJ0SFRNTCcsIGZhbHNlLCBodG1sXTtcblxuICAgICAgICAgICAgLyogRWRnZSdzIGltcGxlbWVudGF0aW9uIG9mIGluc2VydEhUTUwgaXMganVzdCBidWdneSByaWdodCBub3c6XG4gICAgICAgICAgICAgKiAtIERvZXNuJ3QgYWxsb3cgbGVhZGluZyB3aGl0ZSBzcGFjZSBhdCB0aGUgYmVnaW5uaW5nIG9mIGFuIGVsZW1lbnRcbiAgICAgICAgICAgICAqIC0gRm91bmQgYSBjYXNlIHdoZW4gYSA8Zm9udCBzaXplPVwiMlwiPiB0YWcgd2FzIGluc2VydGVkIHdoZW4gY2FsbGluZyBhbGlnbkNlbnRlciBpbnNpZGUgYSBibG9ja3F1b3RlXG4gICAgICAgICAgICAgKlxuICAgICAgICAgICAgICogVGhlcmUgYXJlIGxpa2VseSBvdGhlciBidWdzLCB0aGVzZSBhcmUganVzdCB0aGUgb25lcyB3ZSBmb3VuZCBzbyBmYXIuXG4gICAgICAgICAgICAgKiBGb3Igbm93LCBsZXQncyBqdXN0IHVzZSB0aGUgc2FtZSBmYWxsYmFjayB3ZSBkaWQgZm9yIElFXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlmICghTWVkaXVtRWRpdG9yLnV0aWwuaXNFZGdlICYmIGRvYy5xdWVyeUNvbW1hbmRTdXBwb3J0ZWQoJ2luc2VydEhUTUwnKSkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkb2MuZXhlY0NvbW1hbmQuYXBwbHkoZG9jLCBlY0FyZ3MpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge31cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2VsZWN0aW9uID0gZG9jLmdldFNlbGVjdGlvbigpO1xuICAgICAgICAgICAgaWYgKHNlbGVjdGlvbi5yYW5nZUNvdW50KSB7XG4gICAgICAgICAgICAgICAgcmFuZ2UgPSBzZWxlY3Rpb24uZ2V0UmFuZ2VBdCgwKTtcbiAgICAgICAgICAgICAgICB0b1JlcGxhY2UgPSByYW5nZS5jb21tb25BbmNlc3RvckNvbnRhaW5lcjtcblxuICAgICAgICAgICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS95YWJ3ZS9tZWRpdW0tZWRpdG9yL2lzc3Vlcy83NDhcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgc2VsZWN0aW9uIGlzIGFuIGVtcHR5IGVkaXRvciBlbGVtZW50LCBjcmVhdGUgYSB0ZW1wb3JhcnkgdGV4dCBub2RlIGluc2lkZSBvZiB0aGUgZWRpdG9yXG4gICAgICAgICAgICAgICAgLy8gYW5kIHNlbGVjdCBpdCBzbyB0aGF0IHdlIGRvbid0IGRlbGV0ZSB0aGUgZWRpdG9yIGVsZW1lbnRcbiAgICAgICAgICAgICAgICBpZiAoVXRpbC5pc01lZGl1bUVkaXRvckVsZW1lbnQodG9SZXBsYWNlKSAmJiAhdG9SZXBsYWNlLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2Uuc2VsZWN0Tm9kZSh0b1JlcGxhY2UuYXBwZW5kQ2hpbGQoZG9jLmNyZWF0ZVRleHROb2RlKCcnKSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoKHRvUmVwbGFjZS5ub2RlVHlwZSA9PT0gMyAmJiByYW5nZS5zdGFydE9mZnNldCA9PT0gMCAmJiByYW5nZS5lbmRPZmZzZXQgPT09IHRvUmVwbGFjZS5ub2RlVmFsdWUubGVuZ3RoKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKHRvUmVwbGFjZS5ub2RlVHlwZSAhPT0gMyAmJiB0b1JlcGxhY2UuaW5uZXJIVE1MID09PSByYW5nZS50b1N0cmluZygpKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBFbnN1cmUgcmFuZ2UgY292ZXJzIG1heGltdW0gYW1vdW50IG9mIG5vZGVzIGFzIHBvc3NpYmxlXG4gICAgICAgICAgICAgICAgICAgIC8vIEJ5IG1vdmluZyB1cCB0aGUgRE9NIGFuZCBzZWxlY3RpbmcgYW5jZXN0b3JzIHdob3NlIG9ubHkgY2hpbGQgaXMgdGhlIHJhbmdlXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlICghVXRpbC5pc01lZGl1bUVkaXRvckVsZW1lbnQodG9SZXBsYWNlKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvUmVwbGFjZS5wYXJlbnROb2RlICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9SZXBsYWNlLnBhcmVudE5vZGUuY2hpbGROb2Rlcy5sZW5ndGggPT09IDEgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAhVXRpbC5pc01lZGl1bUVkaXRvckVsZW1lbnQodG9SZXBsYWNlLnBhcmVudE5vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b1JlcGxhY2UgPSB0b1JlcGxhY2UucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByYW5nZS5zZWxlY3ROb2RlKHRvUmVwbGFjZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJhbmdlLmRlbGV0ZUNvbnRlbnRzKCk7XG5cbiAgICAgICAgICAgICAgICBlbCA9IGRvYy5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICBlbC5pbm5lckhUTUwgPSBodG1sO1xuICAgICAgICAgICAgICAgIGZyYWdtZW50ID0gZG9jLmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoZWwuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICBub2RlID0gZWwuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgICAgICAgICAgbGFzdE5vZGUgPSBmcmFnbWVudC5hcHBlbmRDaGlsZChub2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmFuZ2UuaW5zZXJ0Tm9kZShmcmFnbWVudCk7XG5cbiAgICAgICAgICAgICAgICAvLyBQcmVzZXJ2ZSB0aGUgc2VsZWN0aW9uOlxuICAgICAgICAgICAgICAgIGlmIChsYXN0Tm9kZSkge1xuICAgICAgICAgICAgICAgICAgICByYW5nZSA9IHJhbmdlLmNsb25lUmFuZ2UoKTtcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2Uuc2V0U3RhcnRBZnRlcihsYXN0Tm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIHJhbmdlLmNvbGxhcHNlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBNZWRpdW1FZGl0b3Iuc2VsZWN0aW9uLnNlbGVjdFJhbmdlKGRvYywgcmFuZ2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXMgPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20veWFid2UvbWVkaXVtLWVkaXRvci9pc3N1ZXMvOTkyXG4gICAgICAgICAgICAvLyBJZiB3ZSdyZSBtb25pdG9yaW5nIGNhbGxzIHRvIGV4ZWNDb21tYW5kLCBub3RpZnkgbGlzdGVuZXJzIGFzIGlmIGEgcmVhbCBjYWxsIGhhZCBoYXBwZW5lZFxuICAgICAgICAgICAgaWYgKGRvYy5leGVjQ29tbWFuZC5jYWxsTGlzdGVuZXJzKSB7XG4gICAgICAgICAgICAgICAgZG9jLmV4ZWNDb21tYW5kLmNhbGxMaXN0ZW5lcnMoZWNBcmdzLCByZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfSxcblxuICAgICAgICBleGVjRm9ybWF0QmxvY2s6IGZ1bmN0aW9uIChkb2MsIHRhZ05hbWUpIHtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgdG9wIGxldmVsIGJsb2NrIGVsZW1lbnQgdGhhdCBjb250YWlucyB0aGUgc2VsZWN0aW9uXG4gICAgICAgICAgICB2YXIgYmxvY2tDb250YWluZXIgPSBVdGlsLmdldFRvcEJsb2NrQ29udGFpbmVyKE1lZGl1bUVkaXRvci5zZWxlY3Rpb24uZ2V0U2VsZWN0aW9uU3RhcnQoZG9jKSksXG4gICAgICAgICAgICAgICAgY2hpbGROb2RlcztcblxuICAgICAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgYmxvY2txdW90ZVxuICAgICAgICAgICAgaWYgKHRhZ05hbWUgPT09ICdibG9ja3F1b3RlJykge1xuICAgICAgICAgICAgICAgIGlmIChibG9ja0NvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgICAgICBjaGlsZE5vZGVzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYmxvY2tDb250YWluZXIuY2hpbGROb2Rlcyk7XG4gICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBibG9ja3F1b3RlIGhhcyBhIGJsb2NrIGVsZW1lbnQgYXMgYSBjaGlsZCAobmVzdGVkIGJsb2NrcylcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoaWxkTm9kZXMuc29tZShmdW5jdGlvbiAoY2hpbGROb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gVXRpbC5pc0Jsb2NrQ29udGFpbmVyKGNoaWxkTm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGRiBoYW5kbGVzIGJsb2NrcXVvdGUgZGlmZmVyZW50bHkgb24gZm9ybWF0QmxvY2tcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFsbG93aW5nIG5lc3RpbmcsIHdlIG5lZWQgdG8gdXNlIG91dGRlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvUmljaC1UZXh0X0VkaXRpbmdfaW5fTW96aWxsYVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRvYy5leGVjQ29tbWFuZCgnb3V0ZGVudCcsIGZhbHNlLCBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFdoZW4gSUUgYmxvY2txdW90ZSBuZWVkcyB0byBiZSBjYWxsZWQgYXMgaW5kZW50XG4gICAgICAgICAgICAgICAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xODE2MjIzL3JpY2gtdGV4dC1lZGl0b3Itd2l0aC1ibG9ja3F1b3RlLWZ1bmN0aW9uLzE4MjE3NzcjMTgyMTc3N1xuICAgICAgICAgICAgICAgIGlmIChVdGlsLmlzSUUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRvYy5leGVjQ29tbWFuZCgnaW5kZW50JywgZmFsc2UsIHRhZ05hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSWYgdGhlIGJsb2NrQ29udGFpbmVyIGlzIGFscmVhZHkgdGhlIGVsZW1lbnQgdHlwZSBiZWluZyBwYXNzZWQgaW5cbiAgICAgICAgICAgIC8vIHRyZWF0IGl0IGFzICd1bmRvJyBmb3JtYXR0aW5nIGFuZCBqdXN0IGNvbnZlcnQgaXQgdG8gYSA8cD5cbiAgICAgICAgICAgIGlmIChibG9ja0NvbnRhaW5lciAmJiB0YWdOYW1lID09PSBibG9ja0NvbnRhaW5lci5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgICAgICAgICAgICAgdGFnTmFtZSA9ICdwJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gV2hlbiBJRSB3ZSBuZWVkIHRvIGFkZCA8PiB0byBoZWFkaW5nIGVsZW1lbnRzXG4gICAgICAgICAgICAvLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzEwNzQxODMxL2V4ZWNjb21tYW5kLWZvcm1hdGJsb2NrLWhlYWRpbmdzLWluLWllXG4gICAgICAgICAgICBpZiAoVXRpbC5pc0lFKSB7XG4gICAgICAgICAgICAgICAgdGFnTmFtZSA9ICc8JyArIHRhZ05hbWUgKyAnPic7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFdoZW4gRkYsIElFIGFuZCBFZGdlLCB3ZSBoYXZlIHRvIGhhbmRsZSBibG9ja3F1b3RlIG5vZGUgc2VwZXJhdGVseSBhcyAnZm9ybWF0YmxvY2snIGRvZXMgbm90IHdvcmsuXG4gICAgICAgICAgICAvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvRG9jdW1lbnQvZXhlY0NvbW1hbmQjQ29tbWFuZHNcbiAgICAgICAgICAgIGlmIChibG9ja0NvbnRhaW5lciAmJiBibG9ja0NvbnRhaW5lci5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnYmxvY2txdW90ZScpIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgSUUsIGp1c3QgdXNlIG91dGRlbnRcbiAgICAgICAgICAgICAgICBpZiAoVXRpbC5pc0lFICYmIHRhZ05hbWUgPT09ICc8cD4nKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkb2MuZXhlY0NvbW1hbmQoJ291dGRlbnQnLCBmYWxzZSwgdGFnTmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gRm9yIEZpcmVmb3ggYW5kIEVkZ2UsIG1ha2Ugc3VyZSB0aGVyZSdzIGEgbmVzdGVkIGJsb2NrIGVsZW1lbnQgYmVmb3JlIGNhbGxpbmcgb3V0ZGVudFxuICAgICAgICAgICAgICAgIGlmICgoVXRpbC5pc0ZGIHx8IFV0aWwuaXNFZGdlKSAmJiB0YWdOYW1lID09PSAncCcpIHtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGROb2RlcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGJsb2NrQ29udGFpbmVyLmNoaWxkTm9kZXMpO1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGVyZSBhcmUgc29tZSBub24tYmxvY2sgZWxlbWVudHMgd2UgbmVlZCB0byB3cmFwIGV2ZXJ5dGhpbmcgaW4gYSA8cD4gYmVmb3JlIHdlIG91dGRlbnRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoaWxkTm9kZXMuc29tZShmdW5jdGlvbiAoY2hpbGROb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gIVV0aWwuaXNCbG9ja0NvbnRhaW5lcihjaGlsZE5vZGUpO1xuICAgICAgICAgICAgICAgICAgICB9KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9jLmV4ZWNDb21tYW5kKCdmb3JtYXRCbG9jaycsIGZhbHNlLCB0YWdOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZG9jLmV4ZWNDb21tYW5kKCdvdXRkZW50JywgZmFsc2UsIHRhZ05hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGRvYy5leGVjQ29tbWFuZCgnZm9ybWF0QmxvY2snLCBmYWxzZSwgdGFnTmFtZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNldCB0YXJnZXQgdG8gYmxhbmsgb24gdGhlIGdpdmVuIGVsIGVsZW1lbnRcbiAgICAgICAgICpcbiAgICAgICAgICogVE9ETzogbm90IHN1cmUgaWYgdGhpcyBzaG91bGQgYmUgaGVyZVxuICAgICAgICAgKlxuICAgICAgICAgKiBXaGVuIGNyZWF0aW5nIGEgbGluayAodXNpbmcgY29yZSAtPiBjcmVhdGVMaW5rKSB0aGUgc2VsZWN0aW9uIHJldHVybmVkIGJ5IEZpcmVmb3ggd2lsbCBiZSB0aGUgcGFyZW50IG9mIHRoZSBjcmVhdGVkIGxpbmtcbiAgICAgICAgICogaW5zdGVhZCBvZiB0aGUgY3JlYXRlZCBsaW5rIGl0c2VsZiAoYXMgaXQgaXMgZm9yIENocm9tZSBmb3IgZXhhbXBsZSksIHNvIHdlIHJldHJpZXZlIGFsbCBcImFcIiBjaGlsZHJlbiB0byBncmFiIHRoZSBnb29kIG9uZSBieVxuICAgICAgICAgKiB1c2luZyBgYW5jaG9yVXJsYCB0byBlbnN1cmUgdGhhdCB3ZSBhcmUgYWRkaW5nIHRhcmdldD1cIl9ibGFua1wiIG9uIHRoZSBnb29kIG9uZS5cbiAgICAgICAgICogVGhpcyBpc24ndCBhIGJ1bGxldHByb29mIHNvbHV0aW9uIGFueXdheSAuLlxuICAgICAgICAgKi9cbiAgICAgICAgc2V0VGFyZ2V0Qmxhbms6IGZ1bmN0aW9uIChlbCwgYW5jaG9yVXJsKSB7XG4gICAgICAgICAgICB2YXIgaSwgdXJsID0gYW5jaG9yVXJsIHx8IGZhbHNlO1xuICAgICAgICAgICAgaWYgKGVsLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdhJykge1xuICAgICAgICAgICAgICAgIGVsLnRhcmdldCA9ICdfYmxhbmsnO1xuICAgICAgICAgICAgICAgIGVsLnJlbCA9ICdub29wZW5lciBub3JlZmVycmVyJztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZWwgPSBlbC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnYScpO1xuXG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGVsLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmYWxzZSA9PT0gdXJsIHx8IHVybCA9PT0gZWxbaV0uYXR0cmlidXRlcy5ocmVmLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbFtpXS50YXJnZXQgPSAnX2JsYW5rJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsW2ldLnJlbCA9ICdub29wZW5lciBub3JlZmVycmVyJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKlxuICAgICAgICAgKiB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCB0byBleHBsaWNpdGx5IHJlbW92ZSB0aGUgdGFyZ2V0PSdfYmxhbmsnIGFzIEZGIGhvbGRzIG9uIHRvIF9ibGFuayB2YWx1ZSBldmVuXG4gICAgICAgICAqIGFmdGVyIHVuY2hlY2tpbmcgdGhlIGNoZWNrYm94IG9uIGFuY2hvciBmb3JtXG4gICAgICAgICAqL1xuICAgICAgICByZW1vdmVUYXJnZXRCbGFuazogZnVuY3Rpb24gKGVsLCBhbmNob3JVcmwpIHtcbiAgICAgICAgICAgIHZhciBpO1xuICAgICAgICAgICAgaWYgKGVsLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdhJykge1xuICAgICAgICAgICAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZSgndGFyZ2V0Jyk7XG4gICAgICAgICAgICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKCdyZWwnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZWwgPSBlbC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnYScpO1xuXG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGVsLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhbmNob3JVcmwgPT09IGVsW2ldLmF0dHJpYnV0ZXMuaHJlZi52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxbaV0ucmVtb3ZlQXR0cmlidXRlKCd0YXJnZXQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsW2ldLnJlbW92ZUF0dHJpYnV0ZSgncmVsJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLypcbiAgICAgICAgICogdGhpcyBmdW5jdGlvbiBhZGRzIG9uZSBvciBzZXZlcmFsIGNsYXNzZXMgb24gYW4gYSBlbGVtZW50LlxuICAgICAgICAgKiBpZiBlbCBwYXJhbWV0ZXIgaXMgbm90IGFuIGEsIGl0IHdpbGwgbG9vayBmb3IgYSBjaGlsZHJlbiBvZiBlbC5cbiAgICAgICAgICogaWYgbm8gYSBjaGlsZHJlbiBhcmUgZm91bmQsIGl0IHdpbGwgbG9vayBmb3IgdGhlIGEgcGFyZW50LlxuICAgICAgICAgKi9cbiAgICAgICAgYWRkQ2xhc3NUb0FuY2hvcnM6IGZ1bmN0aW9uIChlbCwgYnV0dG9uQ2xhc3MpIHtcbiAgICAgICAgICAgIHZhciBjbGFzc2VzID0gYnV0dG9uQ2xhc3Muc3BsaXQoJyAnKSxcbiAgICAgICAgICAgICAgICBpLFxuICAgICAgICAgICAgICAgIGo7XG4gICAgICAgICAgICBpZiAoZWwubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ2EnKSB7XG4gICAgICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IGNsYXNzZXMubGVuZ3RoOyBqICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuY2xhc3NMaXN0LmFkZChjbGFzc2VzW2pdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBhQ2hpbGRyZW4gPSBlbC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnYScpO1xuICAgICAgICAgICAgICAgIGlmIChhQ2hpbGRyZW4ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJlbnRBbmNob3IgPSBVdGlsLmdldENsb3Nlc3RUYWcoZWwsICdhJyk7XG4gICAgICAgICAgICAgICAgICAgIGVsID0gcGFyZW50QW5jaG9yID8gW3BhcmVudEFuY2hvcl0gOiBbXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbCA9IGFDaGlsZHJlbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGVsLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBjbGFzc2VzLmxlbmd0aDsgaiArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbFtpXS5jbGFzc0xpc3QuYWRkKGNsYXNzZXNbal0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGlzTGlzdEl0ZW06IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobm9kZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnbGknKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBwYXJlbnROb2RlID0gbm9kZS5wYXJlbnROb2RlLFxuICAgICAgICAgICAgICAgIHRhZ05hbWUgPSBwYXJlbnROb2RlLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB3aGlsZSAodGFnTmFtZSA9PT0gJ2xpJyB8fCAoIVV0aWwuaXNCbG9ja0NvbnRhaW5lcihwYXJlbnROb2RlKSAmJiB0YWdOYW1lICE9PSAnZGl2JykpIHtcbiAgICAgICAgICAgICAgICBpZiAodGFnTmFtZSA9PT0gJ2xpJykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGFyZW50Tm9kZSA9IHBhcmVudE5vZGUucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgICAgICB0YWdOYW1lID0gcGFyZW50Tm9kZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2xlYW5MaXN0RE9NOiBmdW5jdGlvbiAob3duZXJEb2N1bWVudCwgZWxlbWVudCkge1xuICAgICAgICAgICAgaWYgKGVsZW1lbnQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSAhPT0gJ2xpJykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGxpc3QgPSBlbGVtZW50LnBhcmVudEVsZW1lbnQ7XG5cbiAgICAgICAgICAgIGlmIChsaXN0LnBhcmVudEVsZW1lbnQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ3AnKSB7IC8vIHllcyB3ZSBuZWVkIHRvIGNsZWFuIHVwXG4gICAgICAgICAgICAgICAgVXRpbC51bndyYXAobGlzdC5wYXJlbnRFbGVtZW50LCBvd25lckRvY3VtZW50KTtcblxuICAgICAgICAgICAgICAgIC8vIG1vdmUgY3Vyc29yIGF0IHRoZSBlbmQgb2YgdGhlIHRleHQgaW5zaWRlIHRoZSBsaXN0XG4gICAgICAgICAgICAgICAgLy8gZm9yIHNvbWUgdW5rbm93biByZWFzb24sIHRoZSBjdXJzb3IgaXMgbW92ZWQgdG8gZW5kIG9mIHRoZSBcInZpc3VhbFwiIGxpbmVcbiAgICAgICAgICAgICAgICBNZWRpdW1FZGl0b3Iuc2VsZWN0aW9uLm1vdmVDdXJzb3Iob3duZXJEb2N1bWVudCwgZWxlbWVudC5maXJzdENoaWxkLCBlbGVtZW50LmZpcnN0Q2hpbGQudGV4dENvbnRlbnQubGVuZ3RoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKiBzcGxpdERPTVRyZWVcbiAgICAgICAgICpcbiAgICAgICAgICogR2l2ZW4gYSByb290IGVsZW1lbnQgc29tZSBkZXNjZW5kYW50IGVsZW1lbnQsIHNwbGl0IHRoZSByb290IGVsZW1lbnRcbiAgICAgICAgICogaW50byBpdHMgb3duIGVsZW1lbnQgY29udGFpbmluZyB0aGUgZGVzY2VuZGFudCBlbGVtZW50IGFuZCBhbGwgZWxlbWVudHNcbiAgICAgICAgICogb24gdGhlIGxlZnQgb3IgcmlnaHQgc2lkZSBvZiB0aGUgZGVzY2VuZGFudCAoJ3JpZ2h0JyBpcyBkZWZhdWx0KVxuICAgICAgICAgKlxuICAgICAgICAgKiBleGFtcGxlOlxuICAgICAgICAgKlxuICAgICAgICAgKiAgICAgICAgIDxkaXY+XG4gICAgICAgICAqICAgICAgLyAgICB8ICAgXFxcbiAgICAgICAgICogIDxzcGFuPiA8c3Bhbj4gPHNwYW4+XG4gICAgICAgICAqICAgLyBcXCAgICAvIFxcICAgIC8gXFxcbiAgICAgICAgICogIDEgICAyICAzICAgNCAgNSAgIDZcbiAgICAgICAgICpcbiAgICAgICAgICogIElmIEkgd2FudGVkIHRvIHNwbGl0IHRoaXMgdHJlZSBnaXZlbiB0aGUgPGRpdj4gYXMgdGhlIHJvb3QgYW5kIFwiNFwiIGFzIHRoZSBsZWFmXG4gICAgICAgICAqICB0aGUgcmVzdWx0IHdvdWxkIGJlICh0aGUgcHJpbWUgJyBtYXJrcyBpbmRpY2F0ZXMgbm9kZXMgdGhhdCBhcmUgY3JlYXRlZCBhcyBjbG9uZXMpOlxuICAgICAgICAgKlxuICAgICAgICAgKiAgIFNQTElUVElORyBPRkYgJ1JJR0hUJyBUUkVFICAgICAgIFNQTElUVElORyBPRkYgJ0xFRlQnIFRSRUVcbiAgICAgICAgICpcbiAgICAgICAgICogICAgIDxkaXY+ICAgICAgICAgICAgPGRpdj4nICAgICAgICAgICAgICA8ZGl2PicgICAgICA8ZGl2PlxuICAgICAgICAgKiAgICAgIC8gXFwgICAgICAgICAgICAgIC8gXFwgICAgICAgICAgICAgICAgIC8gXFwgICAgICAgICAgfFxuICAgICAgICAgKiA8c3Bhbj4gPHNwYW4+ICAgPHNwYW4+JyA8c3Bhbj4gICAgICAgPHNwYW4+IDxzcGFuPiAgIDxzcGFuPlxuICAgICAgICAgKiAgIC8gXFwgICAgfCAgICAgICAgfCAgICAgIC8gXFwgICAgICAgICAgIC9cXCAgICAgL1xcICAgICAgIC9cXFxuICAgICAgICAgKiAgMSAgIDIgICAzICAgICAgICA0ICAgICA1ICAgNiAgICAgICAgIDEgIDIgICAzICA0ICAgICA1ICA2XG4gICAgICAgICAqXG4gICAgICAgICAqICBUaGUgYWJvdmUgZXhhbXBsZSByZXByZXNlbnRzIHNwbGl0dGluZyBvZmYgdGhlICdyaWdodCcgb3IgJ2xlZnQnIHBhcnQgb2YgYSB0cmVlLCB3aGVyZVxuICAgICAgICAgKiAgdGhlIDxkaXY+JyB3b3VsZCBiZSByZXR1cm5lZCBhcyBhbiBlbGVtZW50IG5vdCBhcHBlbmRlZCB0byB0aGUgRE9NLCBhbmQgdGhlIDxkaXY+XG4gICAgICAgICAqICB3b3VsZCByZW1haW4gaW4gcGxhY2Ugd2hlcmUgaXQgd2FzXG4gICAgICAgICAqXG4gICAgICAgICovXG4gICAgICAgIHNwbGl0T2ZmRE9NVHJlZTogZnVuY3Rpb24gKHJvb3ROb2RlLCBsZWFmTm9kZSwgc3BsaXRMZWZ0KSB7XG4gICAgICAgICAgICB2YXIgc3BsaXRPbk5vZGUgPSBsZWFmTm9kZSxcbiAgICAgICAgICAgICAgICBjcmVhdGVkTm9kZSA9IG51bGwsXG4gICAgICAgICAgICAgICAgc3BsaXRSaWdodCA9ICFzcGxpdExlZnQ7XG5cbiAgICAgICAgICAgIC8vIGxvb3AgdW50aWwgd2UgaGl0IHRoZSByb290XG4gICAgICAgICAgICB3aGlsZSAoc3BsaXRPbk5vZGUgIT09IHJvb3ROb2RlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGN1cnJQYXJlbnQgPSBzcGxpdE9uTm9kZS5wYXJlbnROb2RlLFxuICAgICAgICAgICAgICAgICAgICBuZXdQYXJlbnQgPSBjdXJyUGFyZW50LmNsb25lTm9kZShmYWxzZSksXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldE5vZGUgPSAoc3BsaXRSaWdodCA/IHNwbGl0T25Ob2RlIDogY3VyclBhcmVudC5maXJzdENoaWxkKSxcbiAgICAgICAgICAgICAgICAgICAgYXBwZW5kTGFzdDtcblxuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBhIG5ldyBwYXJlbnQgZWxlbWVudCB3aGljaCBpcyBhIGNsb25lIG9mIHRoZSBjdXJyZW50IHBhcmVudFxuICAgICAgICAgICAgICAgIGlmIChjcmVhdGVkTm9kZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3BsaXRSaWdodCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgd2UncmUgc3BsaXR0aW5nIHJpZ2h0LCBhZGQgcHJldmlvdXMgY3JlYXRlZCBlbGVtZW50IGJlZm9yZSBzaWJsaW5nc1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3UGFyZW50LmFwcGVuZENoaWxkKGNyZWF0ZWROb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIHdlJ3JlIHNwbGl0dGluZyBsZWZ0LCBhZGQgcHJldmlvdXMgY3JlYXRlZCBlbGVtZW50IGxhc3RcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcGVuZExhc3QgPSBjcmVhdGVkTm9kZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjcmVhdGVkTm9kZSA9IG5ld1BhcmVudDtcblxuICAgICAgICAgICAgICAgIHdoaWxlICh0YXJnZXROb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzaWJsaW5nID0gdGFyZ2V0Tm9kZS5uZXh0U2libGluZztcbiAgICAgICAgICAgICAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgdGhlICdzcGxpdE5vZGUnXG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXJnZXROb2RlID09PSBzcGxpdE9uTm9kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0YXJnZXROb2RlLmhhc0NoaWxkTm9kZXMoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldE5vZGUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0YXJnZXROb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIHRoZSBub2RlIHdlJ3JlIHNwbGl0dGluZyBvbiwgaWYgaXQgaGFzIGNoaWxkcmVuLCB3ZSBuZWVkIHRvIGNsb25lIGl0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYW5kIG5vdCBqdXN0IG1vdmUgaXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXROb2RlID0gdGFyZ2V0Tm9kZS5jbG9uZU5vZGUoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIHJlc3VsdGluZyBzcGxpdCBub2RlIGhhcyBjb250ZW50LCBhZGQgaXRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXJnZXROb2RlLnRleHRDb250ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlZE5vZGUuYXBwZW5kQ2hpbGQodGFyZ2V0Tm9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldE5vZGUgPSAoc3BsaXRSaWdodCA/IHNpYmxpbmcgOiBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBnZW5lcmFsIGNhc2UsIGp1c3QgcmVtb3ZlIHRoZSBlbGVtZW50IGFuZCBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhZGQgaXQgdG8gdGhlIHNwbGl0IHRyZWUgaWYgaXQgY29udGFpbnMgc29tZXRoaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXROb2RlLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGFyZ2V0Tm9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFyZ2V0Tm9kZS5oYXNDaGlsZE5vZGVzKCkgfHwgdGFyZ2V0Tm9kZS50ZXh0Q29udGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZWROb2RlLmFwcGVuZENoaWxkKHRhcmdldE5vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXROb2RlID0gc2libGluZztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIElmIHdlIGhhZCBhbiBlbGVtZW50IHdlIHdhbnRlZCB0byBhcHBlbmQgYXQgdGhlIGVuZCwgZG8gdGhhdCBub3dcbiAgICAgICAgICAgICAgICBpZiAoYXBwZW5kTGFzdCkge1xuICAgICAgICAgICAgICAgICAgICBjcmVhdGVkTm9kZS5hcHBlbmRDaGlsZChhcHBlbmRMYXN0KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzcGxpdE9uTm9kZSA9IGN1cnJQYXJlbnQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVkTm9kZTtcbiAgICAgICAgfSxcblxuICAgICAgICBtb3ZlVGV4dFJhbmdlSW50b0VsZW1lbnQ6IGZ1bmN0aW9uIChzdGFydE5vZGUsIGVuZE5vZGUsIG5ld0VsZW1lbnQpIHtcbiAgICAgICAgICAgIGlmICghc3RhcnROb2RlIHx8ICFlbmROb2RlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgcm9vdE5vZGUgPSBVdGlsLmZpbmRDb21tb25Sb290KHN0YXJ0Tm9kZSwgZW5kTm9kZSk7XG4gICAgICAgICAgICBpZiAoIXJvb3ROb2RlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZW5kTm9kZSA9PT0gc3RhcnROb2RlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRlbXAgPSBzdGFydE5vZGUucGFyZW50Tm9kZSxcbiAgICAgICAgICAgICAgICAgICAgc2libGluZyA9IHN0YXJ0Tm9kZS5uZXh0U2libGluZztcbiAgICAgICAgICAgICAgICB0ZW1wLnJlbW92ZUNoaWxkKHN0YXJ0Tm9kZSk7XG4gICAgICAgICAgICAgICAgbmV3RWxlbWVudC5hcHBlbmRDaGlsZChzdGFydE5vZGUpO1xuICAgICAgICAgICAgICAgIGlmIChzaWJsaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRlbXAuaW5zZXJ0QmVmb3JlKG5ld0VsZW1lbnQsIHNpYmxpbmcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRlbXAuYXBwZW5kQ2hpbGQobmV3RWxlbWVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBuZXdFbGVtZW50Lmhhc0NoaWxkTm9kZXMoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gY3JlYXRlIHJvb3RDaGlsZHJlbiBhcnJheSB3aGljaCBpbmNsdWRlcyBhbGwgdGhlIGNoaWxkcmVuXG4gICAgICAgICAgICAvLyB3ZSBjYXJlIGFib3V0XG4gICAgICAgICAgICB2YXIgcm9vdENoaWxkcmVuID0gW10sXG4gICAgICAgICAgICAgICAgZmlyc3RDaGlsZCxcbiAgICAgICAgICAgICAgICBsYXN0Q2hpbGQsXG4gICAgICAgICAgICAgICAgbmV4dE5vZGU7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJvb3ROb2RlLmNoaWxkTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBuZXh0Tm9kZSA9IHJvb3ROb2RlLmNoaWxkTm9kZXNbaV07XG4gICAgICAgICAgICAgICAgaWYgKCFmaXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChVdGlsLmlzRGVzY2VuZGFudChuZXh0Tm9kZSwgc3RhcnROb2RlLCB0cnVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RDaGlsZCA9IG5leHROb2RlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKFV0aWwuaXNEZXNjZW5kYW50KG5leHROb2RlLCBlbmROb2RlLCB0cnVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGFzdENoaWxkID0gbmV4dE5vZGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvb3RDaGlsZHJlbi5wdXNoKG5leHROb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGFmdGVyTGFzdCA9IGxhc3RDaGlsZC5uZXh0U2libGluZyxcbiAgICAgICAgICAgICAgICBmcmFnbWVudCA9IHJvb3ROb2RlLm93bmVyRG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuXG4gICAgICAgICAgICAvLyBidWlsZCB1cCBmcmFnbWVudCBvbiBzdGFydE5vZGUgc2lkZSBvZiB0cmVlXG4gICAgICAgICAgICBpZiAoZmlyc3RDaGlsZCA9PT0gc3RhcnROb2RlKSB7XG4gICAgICAgICAgICAgICAgZmlyc3RDaGlsZC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChVdGlsLnNwbGl0T2ZmRE9NVHJlZShmaXJzdENoaWxkLCBzdGFydE5vZGUpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gYWRkIGFueSBlbGVtZW50cyBiZXR3ZWVuIGZpcnN0Q2hpbGQgJiBsYXN0Q2hpbGRcbiAgICAgICAgICAgIHJvb3RDaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKGVsZW1lbnQpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIGJ1aWxkIHVwIGZyYWdtZW50IG9uIGVuZE5vZGUgc2lkZSBvZiB0aGUgdHJlZVxuICAgICAgICAgICAgaWYgKGxhc3RDaGlsZCA9PT0gZW5kTm9kZSkge1xuICAgICAgICAgICAgICAgIGxhc3RDaGlsZC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGxhc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQobGFzdENoaWxkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQoVXRpbC5zcGxpdE9mZkRPTVRyZWUobGFzdENoaWxkLCBlbmROb2RlLCB0cnVlKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEFkZCBmcmFnbWVudCBpbnRvIHBhc3NlZCBpbiBlbGVtZW50XG4gICAgICAgICAgICBuZXdFbGVtZW50LmFwcGVuZENoaWxkKGZyYWdtZW50KTtcblxuICAgICAgICAgICAgaWYgKGxhc3RDaGlsZC5wYXJlbnROb2RlID09PSByb290Tm9kZSkge1xuICAgICAgICAgICAgICAgIC8vIElmIGxhc3QgY2hpbGQgaXMgaW4gdGhlIHJvb3QsIGluc2VydCBuZXdFbGVtZW50IGluIGZyb250IG9mIGl0XG4gICAgICAgICAgICAgICAgcm9vdE5vZGUuaW5zZXJ0QmVmb3JlKG5ld0VsZW1lbnQsIGxhc3RDaGlsZCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGFmdGVyTGFzdCkge1xuICAgICAgICAgICAgICAgIC8vIElmIGxhc3QgY2hpbGQgd2FzIHJlbW92ZWQsIGJ1dCBpdCBoYWQgYSBzaWJsaW5nLCBpbnNlcnQgaW4gZnJvbnQgb2YgaXRcbiAgICAgICAgICAgICAgICByb290Tm9kZS5pbnNlcnRCZWZvcmUobmV3RWxlbWVudCwgYWZ0ZXJMYXN0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gbGFzdENoaWxkIHdhcyByZW1vdmVkIGFuZCB3YXMgdGhlIGxhc3QgYWN0dWFsIGVsZW1lbnQganVzdCBhcHBlbmRcbiAgICAgICAgICAgICAgICByb290Tm9kZS5hcHBlbmRDaGlsZChuZXdFbGVtZW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIG5ld0VsZW1lbnQuaGFzQ2hpbGROb2RlcygpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qIGJhc2VkIG9uIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzYxODMwNjkgKi9cbiAgICAgICAgZGVwdGhPZk5vZGU6IGZ1bmN0aW9uIChpbk5vZGUpIHtcbiAgICAgICAgICAgIHZhciB0aGVEZXB0aCA9IDAsXG4gICAgICAgICAgICAgICAgbm9kZSA9IGluTm9kZTtcbiAgICAgICAgICAgIHdoaWxlIChub2RlLnBhcmVudE5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlO1xuICAgICAgICAgICAgICAgIHRoZURlcHRoKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhlRGVwdGg7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZmluZENvbW1vblJvb3Q6IGZ1bmN0aW9uIChpbk5vZGUxLCBpbk5vZGUyKSB7XG4gICAgICAgICAgICB2YXIgZGVwdGgxID0gVXRpbC5kZXB0aE9mTm9kZShpbk5vZGUxKSxcbiAgICAgICAgICAgICAgICBkZXB0aDIgPSBVdGlsLmRlcHRoT2ZOb2RlKGluTm9kZTIpLFxuICAgICAgICAgICAgICAgIG5vZGUxID0gaW5Ob2RlMSxcbiAgICAgICAgICAgICAgICBub2RlMiA9IGluTm9kZTI7XG5cbiAgICAgICAgICAgIHdoaWxlIChkZXB0aDEgIT09IGRlcHRoMikge1xuICAgICAgICAgICAgICAgIGlmIChkZXB0aDEgPiBkZXB0aDIpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZTEgPSBub2RlMS5wYXJlbnROb2RlO1xuICAgICAgICAgICAgICAgICAgICBkZXB0aDEgLT0gMTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBub2RlMiA9IG5vZGUyLnBhcmVudE5vZGU7XG4gICAgICAgICAgICAgICAgICAgIGRlcHRoMiAtPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgd2hpbGUgKG5vZGUxICE9PSBub2RlMikge1xuICAgICAgICAgICAgICAgIG5vZGUxID0gbm9kZTEucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICBub2RlMiA9IG5vZGUyLnBhcmVudE5vZGU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBub2RlMTtcbiAgICAgICAgfSxcbiAgICAgICAgLyogRU5EIC0gYmFzZWQgb24gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvNjE4MzA2OSAqL1xuXG4gICAgICAgIGlzRWxlbWVudEF0QmVnaW5uaW5nT2ZCbG9jazogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHZhciB0ZXh0VmFsLFxuICAgICAgICAgICAgICAgIHNpYmxpbmc7XG4gICAgICAgICAgICB3aGlsZSAoIVV0aWwuaXNCbG9ja0NvbnRhaW5lcihub2RlKSAmJiAhVXRpbC5pc01lZGl1bUVkaXRvckVsZW1lbnQobm9kZSkpIHtcbiAgICAgICAgICAgICAgICBzaWJsaW5nID0gbm9kZTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoc2libGluZyA9IHNpYmxpbmcucHJldmlvdXNTaWJsaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRleHRWYWwgPSBzaWJsaW5nLm5vZGVUeXBlID09PSAzID8gc2libGluZy5ub2RlVmFsdWUgOiBzaWJsaW5nLnRleHRDb250ZW50O1xuICAgICAgICAgICAgICAgICAgICBpZiAodGV4dFZhbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzTWVkaXVtRWRpdG9yRWxlbWVudDogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBlbGVtZW50ICYmIGVsZW1lbnQuZ2V0QXR0cmlidXRlICYmICEhZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtbWVkaXVtLWVkaXRvci1lbGVtZW50Jyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0Q29udGFpbmVyRWRpdG9yRWxlbWVudDogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBVdGlsLnRyYXZlcnNlVXAoZWxlbWVudCwgZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gVXRpbC5pc01lZGl1bUVkaXRvckVsZW1lbnQobm9kZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBpc0Jsb2NrQ29udGFpbmVyOiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQgJiYgZWxlbWVudC5ub2RlVHlwZSAhPT0gMyAmJiBVdGlsLmJsb2NrQ29udGFpbmVyRWxlbWVudE5hbWVzLmluZGV4T2YoZWxlbWVudC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpKSAhPT0gLTE7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyogRmluZHMgdGhlIGNsb3Nlc3QgYW5jZXN0b3Igd2hpY2ggaXMgYSBibG9jayBjb250YWluZXIgZWxlbWVudFxuICAgICAgICAgKiBJZiBlbGVtZW50IGlzIHdpdGhpbiBlZGl0b3IgZWxlbWVudCBidXQgbm90IHdpdGhpbiBhbnkgb3RoZXIgYmxvY2sgZWxlbWVudCxcbiAgICAgICAgICogdGhlIGVkaXRvciBlbGVtZW50IGlzIHJldHVybmVkXG4gICAgICAgICAqL1xuICAgICAgICBnZXRDbG9zZXN0QmxvY2tDb250YWluZXI6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gVXRpbC50cmF2ZXJzZVVwKG5vZGUsIGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFV0aWwuaXNCbG9ja0NvbnRhaW5lcihub2RlKSB8fCBVdGlsLmlzTWVkaXVtRWRpdG9yRWxlbWVudChub2RlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qIEZpbmRzIGhpZ2hlc3QgbGV2ZWwgYW5jZXN0b3IgZWxlbWVudCB3aGljaCBpcyBhIGJsb2NrIGNvbnRhaW5lciBlbGVtZW50XG4gICAgICAgICAqIElmIGVsZW1lbnQgaXMgd2l0aGluIGVkaXRvciBlbGVtZW50IGJ1dCBub3Qgd2l0aGluIGFueSBvdGhlciBibG9jayBlbGVtZW50LFxuICAgICAgICAgKiB0aGUgZWRpdG9yIGVsZW1lbnQgaXMgcmV0dXJuZWRcbiAgICAgICAgICovXG4gICAgICAgIGdldFRvcEJsb2NrQ29udGFpbmVyOiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICAgICAgdmFyIHRvcEJsb2NrID0gVXRpbC5pc0Jsb2NrQ29udGFpbmVyKGVsZW1lbnQpID8gZWxlbWVudCA6IGZhbHNlO1xuICAgICAgICAgICAgVXRpbC50cmF2ZXJzZVVwKGVsZW1lbnQsIGZ1bmN0aW9uIChlbCkge1xuICAgICAgICAgICAgICAgIGlmIChVdGlsLmlzQmxvY2tDb250YWluZXIoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvcEJsb2NrID0gZWw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghdG9wQmxvY2sgJiYgVXRpbC5pc01lZGl1bUVkaXRvckVsZW1lbnQoZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvcEJsb2NrID0gZWw7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiB0b3BCbG9jaztcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRGaXJzdFNlbGVjdGFibGVMZWFmTm9kZTogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIHdoaWxlIChlbGVtZW50ICYmIGVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50LmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFdlIGRvbid0IHdhbnQgdG8gc2V0IHRoZSBzZWxlY3Rpb24gdG8gYW4gZWxlbWVudCB0aGF0IGNhbid0IGhhdmUgY2hpbGRyZW4sIHRoaXMgbWVzc2VzIHVwIEdlY2tvLlxuICAgICAgICAgICAgZWxlbWVudCA9IFV0aWwudHJhdmVyc2VVcChlbGVtZW50LCBmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gVXRpbC5lbXB0eUVsZW1lbnROYW1lcy5pbmRleE9mKGVsLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkpID09PSAtMTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gU2VsZWN0aW5nIGF0IHRoZSBiZWdpbm5pbmcgb2YgYSB0YWJsZSBkb2Vzbid0IHdvcmsgaW4gUGhhbnRvbUpTLlxuICAgICAgICAgICAgaWYgKGVsZW1lbnQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ3RhYmxlJykge1xuICAgICAgICAgICAgICAgIHZhciBmaXJzdENlbGwgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJ3RoLCB0ZCcpO1xuICAgICAgICAgICAgICAgIGlmIChmaXJzdENlbGwpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IGZpcnN0Q2VsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBUT0RPOiByZW1vdmUgZ2V0Rmlyc3RUZXh0Tm9kZSBBTkQgX2dldEZpcnN0VGV4dE5vZGUgd2hlbiBqdW1waW5nIGluIDYuMC4wIChubyBjb2RlIHJlZmVyZW5jZXMpXG4gICAgICAgIGdldEZpcnN0VGV4dE5vZGU6IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgICAgICBVdGlsLndhcm4oJ2dldEZpcnN0VGV4dE5vZGUgaXMgZGVwcmVjYXRlZCBhbmQgd2lsbCBiZSByZW1vdmVkIGluIHZlcnNpb24gNi4wLjAnKTtcbiAgICAgICAgICAgIHJldHVybiBVdGlsLl9nZXRGaXJzdFRleHROb2RlKGVsZW1lbnQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIF9nZXRGaXJzdFRleHROb2RlOiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICAgICAgaWYgKGVsZW1lbnQubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50LmNoaWxkTm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgdGV4dE5vZGUgPSBVdGlsLl9nZXRGaXJzdFRleHROb2RlKGVsZW1lbnQuY2hpbGROb2Rlc1tpXSk7XG4gICAgICAgICAgICAgICAgaWYgKHRleHROb2RlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0ZXh0Tm9kZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSxcblxuICAgICAgICBlbnN1cmVVcmxIYXNQcm90b2NvbDogZnVuY3Rpb24gKHVybCkge1xuICAgICAgICAgICAgaWYgKHVybC5pbmRleE9mKCc6Ly8nKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2h0dHA6Ly8nICsgdXJsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHVybDtcbiAgICAgICAgfSxcblxuICAgICAgICB3YXJuOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAod2luZG93LmNvbnNvbGUgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygd2luZG93LmNvbnNvbGUud2FybiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5jb25zb2xlLndhcm4uYXBwbHkod2luZG93LmNvbnNvbGUsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGVwcmVjYXRlZDogZnVuY3Rpb24gKG9sZE5hbWUsIG5ld05hbWUsIHZlcnNpb24pIHtcbiAgICAgICAgICAgIC8vIHNpbXBsZSBkZXByZWNhdGlvbiB3YXJuaW5nIG1lY2hhbmlzbS5cbiAgICAgICAgICAgIHZhciBtID0gb2xkTmFtZSArICcgaXMgZGVwcmVjYXRlZCwgcGxlYXNlIHVzZSAnICsgbmV3TmFtZSArICcgaW5zdGVhZC4nO1xuICAgICAgICAgICAgaWYgKHZlcnNpb24pIHtcbiAgICAgICAgICAgICAgICBtICs9ICcgV2lsbCBiZSByZW1vdmVkIGluICcgKyB2ZXJzaW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgVXRpbC53YXJuKG0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRlcHJlY2F0ZWRNZXRob2Q6IGZ1bmN0aW9uIChvbGROYW1lLCBuZXdOYW1lLCBhcmdzLCB2ZXJzaW9uKSB7XG4gICAgICAgICAgICAvLyBydW4gdGhlIHJlcGxhY2VtZW50IGFuZCB3YXJuIHdoZW4gc29tZW9uZSBjYWxscyBhIGRlcHJlY2F0ZWQgbWV0aG9kXG4gICAgICAgICAgICBVdGlsLmRlcHJlY2F0ZWQob2xkTmFtZSwgbmV3TmFtZSwgdmVyc2lvbik7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXNbbmV3TmFtZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICB0aGlzW25ld05hbWVdLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGNsZWFudXBBdHRyczogZnVuY3Rpb24gKGVsLCBhdHRycykge1xuICAgICAgICAgICAgYXR0cnMuZm9yRWFjaChmdW5jdGlvbiAoYXR0cikge1xuICAgICAgICAgICAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShhdHRyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNsZWFudXBUYWdzOiBmdW5jdGlvbiAoZWwsIHRhZ3MpIHtcbiAgICAgICAgICAgIGlmICh0YWdzLmluZGV4T2YoZWwubm9kZU5hbWUudG9Mb3dlckNhc2UoKSkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgZWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgdW53cmFwVGFnczogZnVuY3Rpb24gKGVsLCB0YWdzKSB7XG4gICAgICAgICAgICBpZiAodGFncy5pbmRleE9mKGVsLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIE1lZGl1bUVkaXRvci51dGlsLnVud3JhcChlbCwgZG9jdW1lbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIGdldCB0aGUgY2xvc2VzdCBwYXJlbnRcbiAgICAgICAgZ2V0Q2xvc2VzdFRhZzogZnVuY3Rpb24gKGVsLCB0YWcpIHtcbiAgICAgICAgICAgIHJldHVybiBVdGlsLnRyYXZlcnNlVXAoZWwsIGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gdGFnLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICB1bndyYXA6IGZ1bmN0aW9uIChlbCwgZG9jKSB7XG4gICAgICAgICAgICB2YXIgZnJhZ21lbnQgPSBkb2MuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpLFxuICAgICAgICAgICAgICAgIG5vZGVzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWwuY2hpbGROb2Rlcyk7XG5cbiAgICAgICAgICAgIC8vIGNhc3Qgbm9kZUxpc3QgdG8gYXJyYXkgc2luY2UgYXBwZW5kaW5nIGNoaWxkXG4gICAgICAgICAgICAvLyB0byBhIGRpZmZlcmVudCBub2RlIHdpbGwgYWx0ZXIgbGVuZ3RoIG9mIGVsLmNoaWxkTm9kZXNcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChub2Rlc1tpXSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChmcmFnbWVudC5jaGlsZE5vZGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGVsLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKGZyYWdtZW50LCBlbCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGd1aWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGZ1bmN0aW9uIF9zNCgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gTWF0aFxuICAgICAgICAgICAgICAgICAgICAuZmxvb3IoKDEgKyBNYXRoLnJhbmRvbSgpKSAqIDB4MTAwMDApXG4gICAgICAgICAgICAgICAgICAgIC50b1N0cmluZygxNilcbiAgICAgICAgICAgICAgICAgICAgLnN1YnN0cmluZygxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIF9zNCgpICsgX3M0KCkgKyAnLScgKyBfczQoKSArICctJyArIF9zNCgpICsgJy0nICsgX3M0KCkgKyAnLScgKyBfczQoKSArIF9zNCgpICsgX3M0KCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgTWVkaXVtRWRpdG9yLnV0aWwgPSBVdGlsO1xufSh3aW5kb3cpKTtcblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgRXh0ZW5zaW9uID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgTWVkaXVtRWRpdG9yLnV0aWwuZXh0ZW5kKHRoaXMsIG9wdGlvbnMpO1xuICAgIH07XG5cbiAgICBFeHRlbnNpb24uZXh0ZW5kID0gZnVuY3Rpb24gKHByb3RvUHJvcHMpIHtcbiAgICAgICAgLy8gbWFnaWMgZXh0ZW5kZXIgdGhpbmdlci4gbW9zdGx5IGJvcnJvd2VkIGZyb20gYmFja2JvbmUvZ29vZy5pbmhlcml0c1xuICAgICAgICAvLyBwbGFjZSB0aGlzIGZ1bmN0aW9uIG9uIHNvbWUgdGhpbmcgeW91IHdhbnQgZXh0ZW5kLWFibGUuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIGV4YW1wbGU6XG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICAgZnVuY3Rpb24gVGhpbmcoYXJncyl7XG4gICAgICAgIC8vICAgICAgICAgIHRoaXMub3B0aW9ucyA9IGFyZ3M7XG4gICAgICAgIC8vICAgICAgfVxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgIFRoaW5nLnByb3RvdHlwZSA9IHsgZm9vOiBcImJhclwiIH07XG4gICAgICAgIC8vICAgICAgVGhpbmcuZXh0ZW5kID0gZXh0ZW5kZXJpZnk7XG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICAgdmFyIFRoaW5nVHdvID0gVGhpbmcuZXh0ZW5kKHsgZm9vOiBcImJhelwiIH0pO1xuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgIHZhciB0aGluZ09uZSA9IG5ldyBUaGluZygpOyAvLyBmb28gPT09IFwiYmFyXCJcbiAgICAgICAgLy8gICAgICB2YXIgdGhpbmdUd28gPSBuZXcgVGhpbmdUd28oKTsgLy8gZm9vID09PSBcImJhelwiXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICAgd2hpY2ggc2VlbXMgbGlrZSBzb21lIHNpbXBseSBzaGFsbG93IGNvcHkgbm9uc2Vuc2VcbiAgICAgICAgLy8gICAgICBhdCBmaXJzdCwgYnV0IGEgbG90IG1vcmUgaXMgZ29pbmcgb24gdGhlcmUuXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICAgcGFzc2luZyBhIGBjb25zdHJ1Y3RvcmAgdG8gdGhlIGV4dGVuZCBwcm9wc1xuICAgICAgICAvLyAgICAgIHdpbGwgY2F1c2UgdGhlIGluc3RhbmNlIHRvIGluc3RhbnRpYXRlIHRocm91Z2ggdGhhdFxuICAgICAgICAvLyAgICAgIGluc3RlYWQgb2YgdGhlIHBhcmVudCdzIGNvbnN0cnVjdG9yLlxuXG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLFxuICAgICAgICAgICAgY2hpbGQ7XG5cbiAgICAgICAgLy8gVGhlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIGZvciB0aGUgbmV3IHN1YmNsYXNzIGlzIGVpdGhlciBkZWZpbmVkIGJ5IHlvdVxuICAgICAgICAvLyAodGhlIFwiY29uc3RydWN0b3JcIiBwcm9wZXJ0eSBpbiB5b3VyIGBleHRlbmRgIGRlZmluaXRpb24pLCBvciBkZWZhdWx0ZWRcbiAgICAgICAgLy8gYnkgdXMgdG8gc2ltcGx5IGNhbGwgdGhlIHBhcmVudCdzIGNvbnN0cnVjdG9yLlxuXG4gICAgICAgIGlmIChwcm90b1Byb3BzICYmIHByb3RvUHJvcHMuaGFzT3duUHJvcGVydHkoJ2NvbnN0cnVjdG9yJykpIHtcbiAgICAgICAgICAgIGNoaWxkID0gcHJvdG9Qcm9wcy5jb25zdHJ1Y3RvcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNoaWxkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXJlbnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkYXMgc3RhdGljcyAoLmV4dGVuZCBjb21lcyBvdmVyLCBzbyB5b3VyIHN1YmNsYXNzIGNhbiBoYXZlIHN1YmNsYXNzZXMgdG9vKVxuICAgICAgICBNZWRpdW1FZGl0b3IudXRpbC5leHRlbmQoY2hpbGQsIHBhcmVudCk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBwcm90b3R5cGUgY2hhaW4gdG8gaW5oZXJpdCBmcm9tIGBwYXJlbnRgLCB3aXRob3V0IGNhbGxpbmdcbiAgICAgICAgLy8gYHBhcmVudGAncyBjb25zdHJ1Y3RvciBmdW5jdGlvbi5cbiAgICAgICAgdmFyIFN1cnJvZ2F0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuY29uc3RydWN0b3IgPSBjaGlsZDtcbiAgICAgICAgfTtcbiAgICAgICAgU3Vycm9nYXRlLnByb3RvdHlwZSA9IHBhcmVudC5wcm90b3R5cGU7XG4gICAgICAgIGNoaWxkLnByb3RvdHlwZSA9IG5ldyBTdXJyb2dhdGUoKTtcblxuICAgICAgICBpZiAocHJvdG9Qcm9wcykge1xuICAgICAgICAgICAgTWVkaXVtRWRpdG9yLnV0aWwuZXh0ZW5kKGNoaWxkLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyB0b2RvOiAkc3VwZXI/XG5cbiAgICAgICAgcmV0dXJuIGNoaWxkO1xuICAgIH07XG5cbiAgICBFeHRlbnNpb24ucHJvdG90eXBlID0ge1xuICAgICAgICAvKiBpbml0OiBbZnVuY3Rpb25dXG4gICAgICAgICAqXG4gICAgICAgICAqIENhbGxlZCBieSBNZWRpdW1FZGl0b3IgZHVyaW5nIGluaXRpYWxpemF0aW9uLlxuICAgICAgICAgKiBUaGUgLmJhc2UgcHJvcGVydHkgd2lsbCBhbHJlYWR5IGhhdmUgYmVlbiBzZXQgdG9cbiAgICAgICAgICogY3VycmVudCBpbnN0YW5jZSBvZiBNZWRpdW1FZGl0b3Igd2hlbiB0aGlzIGlzIGNhbGxlZC5cbiAgICAgICAgICogQWxsIGhlbHBlciBtZXRob2RzIHdpbGwgZXhpc3QgYXMgd2VsbFxuICAgICAgICAgKi9cbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge30sXG5cbiAgICAgICAgLyogYmFzZTogW01lZGl1bUVkaXRvciBpbnN0YW5jZV1cbiAgICAgICAgICpcbiAgICAgICAgICogSWYgbm90IG92ZXJyaWRlbiwgdGhpcyB3aWxsIGJlIHNldCB0byB0aGUgY3VycmVudCBpbnN0YW5jZVxuICAgICAgICAgKiBvZiBNZWRpdW1FZGl0b3IsIGJlZm9yZSB0aGUgaW5pdCBtZXRob2QgaXMgY2FsbGVkXG4gICAgICAgICAqL1xuICAgICAgICBiYXNlOiB1bmRlZmluZWQsXG5cbiAgICAgICAgLyogbmFtZTogW3N0cmluZ11cbiAgICAgICAgICpcbiAgICAgICAgICogJ25hbWUnIG9mIHRoZSBleHRlbnNpb24sIHVzZWQgZm9yIHJldHJpZXZpbmcgdGhlIGV4dGVuc2lvbi5cbiAgICAgICAgICogSWYgbm90IHNldCwgTWVkaXVtRWRpdG9yIHdpbGwgc2V0IHRoaXMgdG8gYmUgdGhlIGtleVxuICAgICAgICAgKiB1c2VkIHdoZW4gcGFzc2luZyB0aGUgZXh0ZW5zaW9uIGludG8gTWVkaXVtRWRpdG9yIHZpYSB0aGVcbiAgICAgICAgICogJ2V4dGVuc2lvbnMnIG9wdGlvblxuICAgICAgICAgKi9cbiAgICAgICAgbmFtZTogdW5kZWZpbmVkLFxuXG4gICAgICAgIC8qIGNoZWNrU3RhdGU6IFtmdW5jdGlvbiAobm9kZSldXG4gICAgICAgICAqXG4gICAgICAgICAqIElmIGltcGxlbWVudGVkLCB0aGlzIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIG9uZSBvciBtb3JlIHRpbWVzXG4gICAgICAgICAqIHRoZSBzdGF0ZSBvZiB0aGUgZWRpdG9yICYgdG9vbGJhciBhcmUgdXBkYXRlZC5cbiAgICAgICAgICogV2hlbiB0aGUgc3RhdGUgaXMgdXBkYXRlZCwgdGhlIGVkaXRvciBkb2VzIHRoZSBmb2xsb3dpbmc6XG4gICAgICAgICAqXG4gICAgICAgICAqIDEpIEZpbmQgdGhlIHBhcmVudCBub2RlIGNvbnRhaW5pbmcgdGhlIGN1cnJlbnQgc2VsZWN0aW9uXG4gICAgICAgICAqIDIpIENhbGwgY2hlY2tTdGF0ZSBvbiB0aGUgZXh0ZW5zaW9uLCBwYXNzaW5nIHRoZSBub2RlIGFzIGFuIGFyZ3VtZW50XG4gICAgICAgICAqIDMpIEdldCB0aGUgcGFyZW50IG5vZGUgb2YgdGhlIHByZXZpb3VzIG5vZGVcbiAgICAgICAgICogNCkgUmVwZWF0IHN0ZXBzICMyIGFuZCAjMyB1bnRpbCB3ZSBtb3ZlIG91dHNpZGUgdGhlIHBhcmVudCBjb250ZW50ZWRpdGFibGVcbiAgICAgICAgICovXG4gICAgICAgIGNoZWNrU3RhdGU6IHVuZGVmaW5lZCxcblxuICAgICAgICAvKiBkZXN0cm95OiBbZnVuY3Rpb24gKCldXG4gICAgICAgICAqXG4gICAgICAgICAqIFRoaXMgbWV0aG9kIHNob3VsZCByZW1vdmUgYW55IGNyZWF0ZWQgaHRtbCwgY3VzdG9tIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgICAqIG9yIGFueSBvdGhlciBjbGVhbnVwIHRhc2tzIHRoYXQgc2hvdWxkIGJlIHBlcmZvcm1lZC5cbiAgICAgICAgICogSWYgaW1wbGVtZW50ZWQsIHRoaXMgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgd2hlbiBNZWRpdW1FZGl0b3Inc1xuICAgICAgICAgKiBkZXN0cm95IG1ldGhvZCBoYXMgYmVlbiBjYWxsZWQuXG4gICAgICAgICAqL1xuICAgICAgICBkZXN0cm95OiB1bmRlZmluZWQsXG5cbiAgICAgICAgLyogQXMgYWx0ZXJuYXRpdmVzIHRvIGNoZWNrU3RhdGUsIHRoZXNlIGZ1bmN0aW9ucyBwcm92aWRlIGEgbW9yZSBzdHJ1Y3R1cmVkXG4gICAgICAgICAqIHBhdGggdG8gdXBkYXRpbmcgdGhlIHN0YXRlIG9mIGFuIGV4dGVuc2lvbiAodXN1YWxseSBhIGJ1dHRvbikgd2hlbmV2ZXJcbiAgICAgICAgICogdGhlIHN0YXRlIG9mIHRoZSBlZGl0b3IgJiB0b29sYmFyIGFyZSB1cGRhdGVkLlxuICAgICAgICAgKi9cblxuICAgICAgICAvKiBxdWVyeUNvbW1hbmRTdGF0ZTogW2Z1bmN0aW9uICgpXVxuICAgICAgICAgKlxuICAgICAgICAgKiBJZiBpbXBsZW1lbnRlZCwgdGhpcyBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCBvbmNlIG9uIGVhY2ggZXh0ZW5zaW9uXG4gICAgICAgICAqIHdoZW4gdGhlIHN0YXRlIG9mIHRoZSBlZGl0b3IvdG9vbGJhciBpcyBiZWluZyB1cGRhdGVkLlxuICAgICAgICAgKlxuICAgICAgICAgKiBJZiB0aGlzIGZ1bmN0aW9uIHJldHVybnMgYSBub24tbnVsbCB2YWx1ZSwgdGhlIGV4dGVuc2lvbiB3aWxsXG4gICAgICAgICAqIGJlIGlnbm9yZWQgYXMgdGhlIGNvZGUgY2xpbWJzIHRoZSBkb20gdHJlZS5cbiAgICAgICAgICpcbiAgICAgICAgICogSWYgdGhpcyBmdW5jdGlvbiByZXR1cm5zIHRydWUsIGFuZCB0aGUgc2V0QWN0aXZlKCkgZnVuY3Rpb24gaXMgZGVmaW5lZFxuICAgICAgICAgKiBzZXRBY3RpdmUoKSB3aWxsIGJlIGNhbGxlZFxuICAgICAgICAgKi9cbiAgICAgICAgcXVlcnlDb21tYW5kU3RhdGU6IHVuZGVmaW5lZCxcblxuICAgICAgICAvKiBpc0FjdGl2ZTogW2Z1bmN0aW9uICgpXVxuICAgICAgICAgKlxuICAgICAgICAgKiBJZiBpbXBsZW1lbnRlZCwgdGhpcyBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCB3aGVuIE1lZGl1bUVkaXRvclxuICAgICAgICAgKiBoYXMgZGV0ZXJtaW5lZCB0aGF0IHRoaXMgZXh0ZW5zaW9uIGlzICdhY3RpdmUnIGZvciB0aGUgY3VycmVudCBzZWxlY3Rpb24uXG4gICAgICAgICAqIFRoaXMgbWF5IGJlIGNhbGxlZCB3aGVuIHRoZSBlZGl0b3IgJiB0b29sYmFyIGFyZSBiZWluZyB1cGRhdGVkLFxuICAgICAgICAgKiBidXQgb25seSBpZiBxdWVyeUNvbW1hbmRTdGF0ZSgpIG9yIGlzQWxyZWFkeUFwcGxpZWQoKSBmdW5jdGlvbnNcbiAgICAgICAgICogYXJlIGltcGxlbWVudGVkLCBhbmQgd2hlbiBjYWxsZWQsIHJldHVybiB0cnVlLlxuICAgICAgICAgKi9cbiAgICAgICAgaXNBY3RpdmU6IHVuZGVmaW5lZCxcblxuICAgICAgICAvKiBpc0FscmVhZHlBcHBsaWVkOiBbZnVuY3Rpb24gKG5vZGUpXVxuICAgICAgICAgKlxuICAgICAgICAgKiBJZiBpbXBsZW1lbnRlZCwgdGhpcyBmdW5jdGlvbiBpcyBzaW1pbGFyIHRvIGNoZWNrU3RhdGUoKSBpblxuICAgICAgICAgKiB0aGF0IGl0IHdpbGwgYmUgY2FsbGVkIHJlcGVhdGVkbHkgYXMgTWVkaXVtRWRpdG9yIG1vdmVzIHVwXG4gICAgICAgICAqIHRoZSBET00gdG8gdXBkYXRlIHRoZSBlZGl0b3IgJiB0b29sYmFyIGFmdGVyIGEgc3RhdGUgY2hhbmdlLlxuICAgICAgICAgKlxuICAgICAgICAgKiBOT1RFOiBUaGlzIGZ1bmN0aW9uIHdpbGwgTk9UIGJlIGNhbGxlZCBpZiBjaGVja1N0YXRlKCkgaGFzXG4gICAgICAgICAqIGJlZW4gaW1wbGVtZW50ZWQuIFRoaXMgZnVuY3Rpb24gd2lsbCBOT1QgYmUgY2FsbGVkIGlmXG4gICAgICAgICAqIHF1ZXJ5Q29tbWFuZFN0YXRlKCkgaXMgaW1wbGVtZW50ZWQgYW5kIHJldHVybnMgYSBub24tbnVsbFxuICAgICAgICAgKiB2YWx1ZSB3aGVuIGNhbGxlZFxuICAgICAgICAgKi9cbiAgICAgICAgaXNBbHJlYWR5QXBwbGllZDogdW5kZWZpbmVkLFxuXG4gICAgICAgIC8qIHNldEFjdGl2ZTogW2Z1bmN0aW9uICgpXVxuICAgICAgICAgKlxuICAgICAgICAgKiBJZiBpbXBsZW1lbnRlZCwgdGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgd2hlbiBNZWRpdW1FZGl0b3Iga25vd3NcbiAgICAgICAgICogdGhhdCB0aGlzIGV4dGVuc2lvbiBpcyBjdXJyZW50bHkgZW5hYmxlZC4gIEN1cnJlbnRseSwgdGhpc1xuICAgICAgICAgKiBmdW5jdGlvbiBpcyBjYWxsZWQgd2hlbiB1cGRhdGluZyB0aGUgZWRpdG9yICYgdG9vbGJhciwgYW5kXG4gICAgICAgICAqIG9ubHkgaWYgcXVlcnlDb21tYW5kU3RhdGUoKSBvciBpc0FscmVhZHlBcHBsaWVkKG5vZGUpIHJldHVyblxuICAgICAgICAgKiB0cnVlIHdoZW4gY2FsbGVkXG4gICAgICAgICAqL1xuICAgICAgICBzZXRBY3RpdmU6IHVuZGVmaW5lZCxcblxuICAgICAgICAvKiBzZXRJbmFjdGl2ZTogW2Z1bmN0aW9uICgpXVxuICAgICAgICAgKlxuICAgICAgICAgKiBJZiBpbXBsZW1lbnRlZCwgdGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgd2hlbiBNZWRpdW1FZGl0b3Iga25vd3NcbiAgICAgICAgICogdGhhdCB0aGlzIGV4dGVuc2lvbiBpcyBjdXJyZW50bHkgZGlzYWJsZWQuICBDdXJlbnRseSwgdGhpc1xuICAgICAgICAgKiBpcyBjYWxsZWQgYXQgdGhlIGJlZ2lubmluZyBvZiBlYWNoIHN0YXRlIGNoYW5nZSBmb3JcbiAgICAgICAgICogdGhlIGVkaXRvciAmIHRvb2xiYXIuIEFmdGVyIGNhbGxpbmcgdGhpcywgTWVkaXVtRWRpdG9yXG4gICAgICAgICAqIHdpbGwgYXR0ZW1wdCB0byB1cGRhdGUgdGhlIGV4dGVuc2lvbiwgZWl0aGVyIHZpYSBjaGVja1N0YXRlKClcbiAgICAgICAgICogb3IgdGhlIGNvbWJpbmF0aW9uIG9mIHF1ZXJ5Q29tbWFuZFN0YXRlKCksIGlzQWxyZWFkeUFwcGxpZWQobm9kZSksXG4gICAgICAgICAqIGlzQWN0aXZlKCksIGFuZCBzZXRBY3RpdmUoKVxuICAgICAgICAgKi9cbiAgICAgICAgc2V0SW5hY3RpdmU6IHVuZGVmaW5lZCxcblxuICAgICAgICAvKiBnZXRJbnRlcmFjdGlvbkVsZW1lbnRzOiBbZnVuY3Rpb24gKCldXG4gICAgICAgICAqXG4gICAgICAgICAqIElmIHRoZSBleHRlbnNpb24gcmVuZGVycyBhbnkgZWxlbWVudHMgdGhhdCB0aGUgdXNlciBjYW4gaW50ZXJhY3Qgd2l0aCxcbiAgICAgICAgICogdGhpcyBtZXRob2Qgc2hvdWxkIGJlIGltcGxlbWVudGVkIGFuZCByZXR1cm4gdGhlIHJvb3QgZWxlbWVudCBvciBhbiBhcnJheVxuICAgICAgICAgKiBjb250YWluaW5nIGFsbCBvZiB0aGUgcm9vdCBlbGVtZW50cy4gTWVkaXVtRWRpdG9yIHdpbGwgY2FsbCB0aGlzIGZ1bmN0aW9uXG4gICAgICAgICAqIGR1cmluZyBpbnRlcmFjdGlvbiB0byBzZWUgaWYgdGhlIHVzZXIgY2xpY2tlZCBvbiBzb21ldGhpbmcgb3V0c2lkZSBvZiB0aGUgZWRpdG9yLlxuICAgICAgICAgKiBUaGUgZWxlbWVudHMgYXJlIHVzZWQgdG8gY2hlY2sgaWYgdGhlIHRhcmdldCBlbGVtZW50IG9mIGEgY2xpY2sgb3JcbiAgICAgICAgICogb3RoZXIgdXNlciBldmVudCBpcyBhIGRlc2NlbmRhbnQgb2YgYW55IGV4dGVuc2lvbiBlbGVtZW50cy5cbiAgICAgICAgICogVGhpcyB3YXksIHRoZSBlZGl0b3IgY2FuIGFsc28gY291bnQgdXNlciBpbnRlcmFjdGlvbiB3aXRoaW4gZWRpdG9yIGVsZW1lbnRzIGFzXG4gICAgICAgICAqIGludGVyYWN0aW9ucyB3aXRoIHRoZSBlZGl0b3IsIGFuZCB0aHVzIG5vdCB0cmlnZ2VyICdibHVyJ1xuICAgICAgICAgKi9cbiAgICAgICAgZ2V0SW50ZXJhY3Rpb25FbGVtZW50czogdW5kZWZpbmVkLFxuXG4gICAgICAgIC8qKioqKioqKioqKioqKioqKioqKioqKiogSGVscGVycyAqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgICAgICogVGhlIGZvbGxvd2luZyBhcmUgaGVscGVycyB0aGF0IGFyZSBlaXRoZXIgc2V0IGJ5IE1lZGl1bUVkaXRvclxuICAgICAgICAgKiBkdXJpbmcgaW5pdGlhbGl6YXRpb24sIG9yIGFyZSBoZWxwZXIgbWV0aG9kcyB3aGljaCBlaXRoZXJcbiAgICAgICAgICogcm91dGUgY2FsbHMgdG8gdGhlIE1lZGl1bUVkaXRvciBpbnN0YW5jZSBvciBwcm92aWRlIGNvbW1vblxuICAgICAgICAgKiBmdW5jdGlvbmFsaXR5IGZvciBhbGwgZXh0ZW5zaW9uc1xuICAgICAgICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4gICAgICAgIC8qIHdpbmRvdzogW1dpbmRvd11cbiAgICAgICAgICpcbiAgICAgICAgICogSWYgbm90IG92ZXJyaWRlbiwgdGhpcyB3aWxsIGJlIHNldCB0byB0aGUgd2luZG93IG9iamVjdFxuICAgICAgICAgKiB0byBiZSB1c2VkIGJ5IE1lZGl1bUVkaXRvciBhbmQgaXRzIGV4dGVuc2lvbnMuICBUaGlzIGlzXG4gICAgICAgICAqIHBhc3NlZCB2aWEgdGhlICdjb250ZW50V2luZG93JyBvcHRpb24gdG8gTWVkaXVtRWRpdG9yXG4gICAgICAgICAqIGFuZCBpcyB0aGUgZ2xvYmFsICd3aW5kb3cnIG9iamVjdCBieSBkZWZhdWx0XG4gICAgICAgICAqL1xuICAgICAgICAnd2luZG93JzogdW5kZWZpbmVkLFxuXG4gICAgICAgIC8qIGRvY3VtZW50OiBbRG9jdW1lbnRdXG4gICAgICAgICAqXG4gICAgICAgICAqIElmIG5vdCBvdmVycmlkZW4sIHRoaXMgd2lsbCBiZSBzZXQgdG8gdGhlIGRvY3VtZW50IG9iamVjdFxuICAgICAgICAgKiB0byBiZSB1c2VkIGJ5IE1lZGl1bUVkaXRvciBhbmQgaXRzIGV4dGVuc2lvbnMuIFRoaXMgaXNcbiAgICAgICAgICogcGFzc2VkIHZpYSB0aGUgJ293bmVyRG9jdW1lbnQnIG9wdGluIHRvIE1lZGl1bUVkaXRvclxuICAgICAgICAgKiBhbmQgaXMgdGhlIGdsb2JhbCAnZG9jdW1lbnQnIG9iamVjdCBieSBkZWZhdWx0XG4gICAgICAgICAqL1xuICAgICAgICAnZG9jdW1lbnQnOiB1bmRlZmluZWQsXG5cbiAgICAgICAgLyogZ2V0RWRpdG9yRWxlbWVudHM6IFtmdW5jdGlvbiAoKV1cbiAgICAgICAgICpcbiAgICAgICAgICogSGVscGVyIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYW4gYXJyYXkgY29udGFpbmluZ1xuICAgICAgICAgKiBhbGwgdGhlIGNvbnRlbnRlZGl0YWJsZSBlbGVtZW50cyBmb3IgdGhpcyBpbnN0YW5jZVxuICAgICAgICAgKiBvZiBNZWRpdW1FZGl0b3JcbiAgICAgICAgICovXG4gICAgICAgIGdldEVkaXRvckVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5iYXNlLmVsZW1lbnRzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qIGdldEVkaXRvcklkOiBbZnVuY3Rpb24gKCldXG4gICAgICAgICAqXG4gICAgICAgICAqIEhlbHBlciBmdW5jdGlvbiB3aGljaCByZXR1cm5zIGEgdW5pcXVlIGlkZW50aWZpZXJcbiAgICAgICAgICogZm9yIHRoaXMgaW5zdGFuY2Ugb2YgTWVkaXVtRWRpdG9yXG4gICAgICAgICAqL1xuICAgICAgICBnZXRFZGl0b3JJZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYmFzZS5pZDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKiBnZXRFZGl0b3JPcHRpb25zOiBbZnVuY3Rpb24gKG9wdGlvbildXG4gICAgICAgICAqXG4gICAgICAgICAqIEhlbHBlciBmdW5jdGlvbiB3aGljaCByZXR1cm5zIHRoZSB2YWx1ZSBvZiBhbiBvcHRpb25cbiAgICAgICAgICogdXNlZCB0byBpbml0aWFsaXplIHRoaXMgaW5zdGFuY2Ugb2YgTWVkaXVtRWRpdG9yXG4gICAgICAgICAqL1xuICAgICAgICBnZXRFZGl0b3JPcHRpb246IGZ1bmN0aW9uIChvcHRpb24pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmJhc2Uub3B0aW9uc1tvcHRpb25dO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qIExpc3Qgb2YgbWV0aG9kIG5hbWVzIHRvIGFkZCB0byB0aGUgcHJvdG90eXBlIG9mIEV4dGVuc2lvblxuICAgICAqIEVhY2ggb2YgdGhlc2UgbWV0aG9kcyB3aWxsIGJlIGRlZmluZWQgYXMgaGVscGVycyB0aGF0XG4gICAgICoganVzdCBjYWxsIGRpcmVjdGx5IGludG8gdGhlIE1lZGl1bUVkaXRvciBpbnN0YW5jZS5cbiAgICAgKlxuICAgICAqIGV4YW1wbGUgZm9yICdvbicgbWV0aG9kOlxuICAgICAqIEV4dGVuc2lvbi5wcm90b3R5cGUub24gPSBmdW5jdGlvbiAoKSB7XG4gICAgICogICAgIHJldHVybiB0aGlzLmJhc2Uub24uYXBwbHkodGhpcy5iYXNlLCBhcmd1bWVudHMpO1xuICAgICAqIH1cbiAgICAgKi9cbiAgICBbXG4gICAgICAgIC8vIGdlbmVyYWwgaGVscGVyc1xuICAgICAgICAnZXhlY0FjdGlvbicsXG5cbiAgICAgICAgLy8gZXZlbnQgaGFuZGxpbmdcbiAgICAgICAgJ29uJyxcbiAgICAgICAgJ29mZicsXG4gICAgICAgICdzdWJzY3JpYmUnLFxuICAgICAgICAndHJpZ2dlcidcblxuICAgIF0uZm9yRWFjaChmdW5jdGlvbiAoaGVscGVyKSB7XG4gICAgICAgIEV4dGVuc2lvbi5wcm90b3R5cGVbaGVscGVyXSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmJhc2VbaGVscGVyXS5hcHBseSh0aGlzLmJhc2UsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBNZWRpdW1FZGl0b3IuRXh0ZW5zaW9uID0gRXh0ZW5zaW9uO1xufSkoKTtcblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBmdW5jdGlvbiBmaWx0ZXJPbmx5UGFyZW50RWxlbWVudHMobm9kZSkge1xuICAgICAgICBpZiAoTWVkaXVtRWRpdG9yLnV0aWwuaXNCbG9ja0NvbnRhaW5lcihub2RlKSkge1xuICAgICAgICAgICAgcmV0dXJuIE5vZGVGaWx0ZXIuRklMVEVSX0FDQ0VQVDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBOb2RlRmlsdGVyLkZJTFRFUl9TS0lQO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIFNlbGVjdGlvbiA9IHtcbiAgICAgICAgZmluZE1hdGNoaW5nU2VsZWN0aW9uUGFyZW50OiBmdW5jdGlvbiAodGVzdEVsZW1lbnRGdW5jdGlvbiwgY29udGVudFdpbmRvdykge1xuICAgICAgICAgICAgdmFyIHNlbGVjdGlvbiA9IGNvbnRlbnRXaW5kb3cuZ2V0U2VsZWN0aW9uKCksXG4gICAgICAgICAgICAgICAgcmFuZ2UsXG4gICAgICAgICAgICAgICAgY3VycmVudDtcblxuICAgICAgICAgICAgaWYgKHNlbGVjdGlvbi5yYW5nZUNvdW50ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByYW5nZSA9IHNlbGVjdGlvbi5nZXRSYW5nZUF0KDApO1xuICAgICAgICAgICAgY3VycmVudCA9IHJhbmdlLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyO1xuXG4gICAgICAgICAgICByZXR1cm4gTWVkaXVtRWRpdG9yLnV0aWwudHJhdmVyc2VVcChjdXJyZW50LCB0ZXN0RWxlbWVudEZ1bmN0aW9uKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRTZWxlY3Rpb25FbGVtZW50OiBmdW5jdGlvbiAoY29udGVudFdpbmRvdykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmluZE1hdGNoaW5nU2VsZWN0aW9uUGFyZW50KGZ1bmN0aW9uIChlbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBNZWRpdW1FZGl0b3IudXRpbC5pc01lZGl1bUVkaXRvckVsZW1lbnQoZWwpO1xuICAgICAgICAgICAgfSwgY29udGVudFdpbmRvdyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xNzY3ODg0My9jYW50LXJlc3RvcmUtc2VsZWN0aW9uLWFmdGVyLWh0bWwtbW9kaWZ5LWV2ZW4taWYtaXRzLXRoZS1zYW1lLWh0bWxcbiAgICAgICAgLy8gVGltIERvd25cbiAgICAgICAgZXhwb3J0U2VsZWN0aW9uOiBmdW5jdGlvbiAocm9vdCwgZG9jKSB7XG4gICAgICAgICAgICBpZiAoIXJvb3QpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHNlbGVjdGlvblN0YXRlID0gbnVsbCxcbiAgICAgICAgICAgICAgICBzZWxlY3Rpb24gPSBkb2MuZ2V0U2VsZWN0aW9uKCk7XG5cbiAgICAgICAgICAgIGlmIChzZWxlY3Rpb24ucmFuZ2VDb3VudCA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgcmFuZ2UgPSBzZWxlY3Rpb24uZ2V0UmFuZ2VBdCgwKSxcbiAgICAgICAgICAgICAgICAgICAgcHJlU2VsZWN0aW9uUmFuZ2UgPSByYW5nZS5jbG9uZVJhbmdlKCksXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0O1xuXG4gICAgICAgICAgICAgICAgcHJlU2VsZWN0aW9uUmFuZ2Uuc2VsZWN0Tm9kZUNvbnRlbnRzKHJvb3QpO1xuICAgICAgICAgICAgICAgIHByZVNlbGVjdGlvblJhbmdlLnNldEVuZChyYW5nZS5zdGFydENvbnRhaW5lciwgcmFuZ2Uuc3RhcnRPZmZzZXQpO1xuICAgICAgICAgICAgICAgIHN0YXJ0ID0gcHJlU2VsZWN0aW9uUmFuZ2UudG9TdHJpbmcoKS5sZW5ndGg7XG5cbiAgICAgICAgICAgICAgICBzZWxlY3Rpb25TdGF0ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICBlbmQ6IHN0YXJ0ICsgcmFuZ2UudG9TdHJpbmcoKS5sZW5ndGhcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgdG8gc2VlIGlmIHRoZSBzZWxlY3Rpb24gc3RhcnRzIHdpdGggYW55IGltYWdlc1xuICAgICAgICAgICAgICAgIC8vIGlmIHNvIHdlIG5lZWQgdG8gbWFrZSBzdXJlIHRoZSB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzZWxlY3Rpb24gaXNcbiAgICAgICAgICAgICAgICAvLyBzZXQgY29ycmVjdGx5IHdoZW4gaW1wb3J0aW5nIHNlbGVjdGlvblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRvZXNSYW5nZVN0YXJ0V2l0aEltYWdlcyhyYW5nZSwgZG9jKSkge1xuICAgICAgICAgICAgICAgICAgICBzZWxlY3Rpb25TdGF0ZS5zdGFydHNXaXRoSW1hZ2UgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIHRvIHNlZSBpZiB0aGUgc2VsZWN0aW9uIGhhcyBhbnkgdHJhaWxpbmcgaW1hZ2VzXG4gICAgICAgICAgICAgICAgLy8gaWYgc28sIHRoaXMgdGhpcyBtZWFucyB3ZSBuZWVkIHRvIGxvb2sgZm9yIHRoZW0gd2hlbiB3ZSBpbXBvcnQgc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgdmFyIHRyYWlsaW5nSW1hZ2VDb3VudCA9IHRoaXMuZ2V0VHJhaWxpbmdJbWFnZUNvdW50KHJvb3QsIHNlbGVjdGlvblN0YXRlLCByYW5nZS5lbmRDb250YWluZXIsIHJhbmdlLmVuZE9mZnNldCk7XG4gICAgICAgICAgICAgICAgaWYgKHRyYWlsaW5nSW1hZ2VDb3VudCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxlY3Rpb25TdGF0ZS50cmFpbGluZ0ltYWdlQ291bnQgPSB0cmFpbGluZ0ltYWdlQ291bnQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gSWYgc3RhcnQgPSAwIHRoZXJlIG1heSBzdGlsbCBiZSBhbiBlbXB0eSBwYXJhZ3JhcGggYmVmb3JlIGl0LCBidXQgd2UgZG9uJ3QgY2FyZS5cbiAgICAgICAgICAgICAgICBpZiAoc3RhcnQgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVtcHR5QmxvY2tzSW5kZXggPSB0aGlzLmdldEluZGV4UmVsYXRpdmVUb0FkamFjZW50RW1wdHlCbG9ja3MoZG9jLCByb290LCByYW5nZS5zdGFydENvbnRhaW5lciwgcmFuZ2Uuc3RhcnRPZmZzZXQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZW1wdHlCbG9ja3NJbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGlvblN0YXRlLmVtcHR5QmxvY2tzSW5kZXggPSBlbXB0eUJsb2Nrc0luZGV4O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gc2VsZWN0aW9uU3RhdGU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xNzY3ODg0My9jYW50LXJlc3RvcmUtc2VsZWN0aW9uLWFmdGVyLWh0bWwtbW9kaWZ5LWV2ZW4taWYtaXRzLXRoZS1zYW1lLWh0bWxcbiAgICAgICAgLy8gVGltIERvd25cbiAgICAgICAgLy9cbiAgICAgICAgLy8ge29iamVjdH0gc2VsZWN0aW9uU3RhdGUgLSB0aGUgc2VsZWN0aW9uIHRvIGltcG9ydFxuICAgICAgICAvLyB7RE9NRWxlbWVudH0gcm9vdCAtIHRoZSByb290IGVsZW1lbnQgdGhlIHNlbGVjdGlvbiBpcyBiZWluZyByZXN0b3JlZCBpbnNpZGUgb2ZcbiAgICAgICAgLy8ge0RvY3VtZW50fSBkb2MgLSB0aGUgZG9jdW1lbnQgdG8gdXNlIGZvciBtYW5hZ2luZyBzZWxlY3Rpb25cbiAgICAgICAgLy8ge2Jvb2xlYW59IFtmYXZvckxhdGVyU2VsZWN0aW9uQW5jaG9yXSAtIGRlZmF1bHRzIHRvIGZhbHNlLiBJZiB0cnVlLCBpbXBvcnQgdGhlIGN1cnNvciBpbW1lZGlhdGVseVxuICAgICAgICAvLyAgICAgIHN1YnNlcXVlbnQgdG8gYW4gYW5jaG9yIHRhZyBpZiBpdCB3b3VsZCBvdGhlcndpc2UgYmUgcGxhY2VkIHJpZ2h0IGF0IHRoZSB0cmFpbGluZyBlZGdlIGluc2lkZSB0aGVcbiAgICAgICAgLy8gICAgICBhbmNob3IuIFRoaXMgY3Vyc29yIHBvc2l0aW9uaW5nLCBldmVuIHRob3VnaCB2aXN1YWxseSBlcXVpdmFsZW50IHRvIHRoZSB1c2VyLCBjYW4gYWZmZWN0IGJlaGF2aW9yXG4gICAgICAgIC8vICAgICAgaW4gTVMgSUUuXG4gICAgICAgIGltcG9ydFNlbGVjdGlvbjogZnVuY3Rpb24gKHNlbGVjdGlvblN0YXRlLCByb290LCBkb2MsIGZhdm9yTGF0ZXJTZWxlY3Rpb25BbmNob3IpIHtcbiAgICAgICAgICAgIGlmICghc2VsZWN0aW9uU3RhdGUgfHwgIXJvb3QpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciByYW5nZSA9IGRvYy5jcmVhdGVSYW5nZSgpO1xuICAgICAgICAgICAgcmFuZ2Uuc2V0U3RhcnQocm9vdCwgMCk7XG4gICAgICAgICAgICByYW5nZS5jb2xsYXBzZSh0cnVlKTtcblxuICAgICAgICAgICAgdmFyIG5vZGUgPSByb290LFxuICAgICAgICAgICAgICAgIG5vZGVTdGFjayA9IFtdLFxuICAgICAgICAgICAgICAgIGNoYXJJbmRleCA9IDAsXG4gICAgICAgICAgICAgICAgZm91bmRTdGFydCA9IGZhbHNlLFxuICAgICAgICAgICAgICAgIGZvdW5kRW5kID0gZmFsc2UsXG4gICAgICAgICAgICAgICAgdHJhaWxpbmdJbWFnZUNvdW50ID0gMCxcbiAgICAgICAgICAgICAgICBzdG9wID0gZmFsc2UsXG4gICAgICAgICAgICAgICAgbmV4dENoYXJJbmRleCxcbiAgICAgICAgICAgICAgICBhbGxvd1JhbmdlVG9TdGFydEF0RW5kT2ZOb2RlID0gZmFsc2UsXG4gICAgICAgICAgICAgICAgbGFzdFRleHROb2RlID0gbnVsbDtcblxuICAgICAgICAgICAgLy8gV2hlbiBpbXBvcnRpbmcgc2VsZWN0aW9uLCB0aGUgc3RhcnQgb2YgdGhlIHNlbGVjdGlvbiBtYXkgbGllIGF0IHRoZSBlbmQgb2YgYW4gZWxlbWVudFxuICAgICAgICAgICAgLy8gb3IgYXQgdGhlIGJlZ2lubmluZyBvZiBhbiBlbGVtZW50LiAgU2luY2UgdmlzdWFsbHkgdGhlcmUgaXMgbm8gZGlmZmVyZW5jZSBiZXR3ZWVuIHRoZXNlIDJcbiAgICAgICAgICAgIC8vIHdlIHdpbGwgdHJ5IHRvIG1vdmUgdGhlIHNlbGVjdGlvbiB0byB0aGUgYmVnaW5uaW5nIG9mIGFuIGVsZW1lbnQgc2luY2UgdGhpcyBpcyBnZW5lcmFsbHlcbiAgICAgICAgICAgIC8vIHdoYXQgdXNlcnMgd2lsbCBleHBlY3QgYW5kIGl0J3MgYSBtb3JlIHByZWRpY3RhYmxlIGJlaGF2aW9yLlxuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vIEhvd2V2ZXIsIHRoZXJlIGFyZSBzb21lIHNwZWNpZmljIGNhc2VzIHdoZW4gd2UgZG9uJ3Qgd2FudCB0byBkbyB0aGlzOlxuICAgICAgICAgICAgLy8gIDEpIFdlJ3JlIGF0dGVtcHRpbmcgdG8gbW92ZSB0aGUgY3Vyc29yIG91dHNpZGUgb2YgdGhlIGVuZCBvZiBhbiBhbmNob3IgW2Zhdm9yTGF0ZXJTZWxlY3Rpb25BbmNob3IgPSB0cnVlXVxuICAgICAgICAgICAgLy8gIDIpIFRoZSBzZWxlY3Rpb24gc3RhcnRzIHdpdGggYW4gaW1hZ2UsIHdoaWNoIGlzIHNwZWNpYWwgc2luY2UgYW4gaW1hZ2UgZG9lc24ndCBoYXZlIGFueSAnY29udGVudCdcbiAgICAgICAgICAgIC8vICAgICBhcyBmYXIgYXMgc2VsZWN0aW9uIGFuZCByYW5nZXMgYXJlIGNvbmNlcm5lZFxuICAgICAgICAgICAgLy8gIDMpIFRoZSBzZWxlY3Rpb24gc3RhcnRzIGFmdGVyIGEgc3BlY2lmaWVkIG51bWJlciBvZiBlbXB0eSBibG9jayBlbGVtZW50cyAoc2VsZWN0aW9uU3RhdGUuZW1wdHlCbG9ja3NJbmRleClcbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyBGb3IgdGhlc2UgY2FzZXMsIHdlIHdhbnQgdGhlIHNlbGVjdGlvbiB0byBzdGFydCBhdCBhIHZlcnkgc3BlY2lmaWMgbG9jYXRpb24sIHNvIHdlIHNob3VsZCBOT1RcbiAgICAgICAgICAgIC8vIGF1dG9tYXRpY2FsbHkgbW92ZSB0aGUgY3Vyc29yIHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIGZpcnN0IGFjdHVhbCBjaHVuayBvZiB0ZXh0XG4gICAgICAgICAgICBpZiAoZmF2b3JMYXRlclNlbGVjdGlvbkFuY2hvciB8fCBzZWxlY3Rpb25TdGF0ZS5zdGFydHNXaXRoSW1hZ2UgfHwgdHlwZW9mIHNlbGVjdGlvblN0YXRlLmVtcHR5QmxvY2tzSW5kZXggIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgYWxsb3dSYW5nZVRvU3RhcnRBdEVuZE9mTm9kZSA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHdoaWxlICghc3RvcCAmJiBub2RlKSB7XG4gICAgICAgICAgICAgICAgLy8gT25seSBpdGVyYXRlIG92ZXIgZWxlbWVudHMgYW5kIHRleHQgbm9kZXNcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5ub2RlVHlwZSA+IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZSA9IG5vZGVTdGFjay5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gSWYgd2UgaGl0IGEgdGV4dCBub2RlLCB3ZSBuZWVkIHRvIGFkZCB0aGUgYW1vdW50IG9mIGNoYXJhY3RlcnMgdG8gdGhlIG92ZXJhbGwgY291bnRcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMyAmJiAhZm91bmRFbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dENoYXJJbmRleCA9IGNoYXJJbmRleCArIG5vZGUubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB3ZSdyZSBhdCBvciBiZXlvbmQgdGhlIHN0YXJ0IG9mIHRoZSBzZWxlY3Rpb24gd2UncmUgaW1wb3J0aW5nXG4gICAgICAgICAgICAgICAgICAgIGlmICghZm91bmRTdGFydCAmJiBzZWxlY3Rpb25TdGF0ZS5zdGFydCA+PSBjaGFySW5kZXggJiYgc2VsZWN0aW9uU3RhdGUuc3RhcnQgPD0gbmV4dENoYXJJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTk9URTogV2Ugb25seSB3YW50IHRvIGFsbG93IGEgc2VsZWN0aW9uIHRvIHN0YXJ0IGF0IHRoZSBFTkQgb2YgYW4gZWxlbWVudCBpZlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gIGFsbG93UmFuZ2VUb1N0YXJ0QXRFbmRPZk5vZGUgaXMgdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFsbG93UmFuZ2VUb1N0YXJ0QXRFbmRPZk5vZGUgfHwgc2VsZWN0aW9uU3RhdGUuc3RhcnQgPCBuZXh0Q2hhckluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2Uuc2V0U3RhcnQobm9kZSwgc2VsZWN0aW9uU3RhdGUuc3RhcnQgLSBjaGFySW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kU3RhcnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2UncmUgYXQgdGhlIGVuZCBvZiBhIHRleHQgbm9kZSB3aGVyZSB0aGUgc2VsZWN0aW9uIGNvdWxkIHN0YXJ0IGJ1dCB3ZSBzaG91bGRuJ3RcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1ha2UgdGhlIHNlbGVjdGlvbiBzdGFydCBoZXJlIGJlY2F1c2UgYWxsb3dSYW5nZVRvU3RhcnRBdEVuZE9mTm9kZSBpcyBmYWxzZS5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhvd2V2ZXIsIHdlIHNob3VsZCBrZWVwIGEgcmVmZXJlbmNlIHRvIHRoaXMgbm9kZSBpbiBjYXNlIHRoZXJlIGFyZW4ndCBhbnkgbW9yZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGV4dCBub2RlcyBhZnRlciB0aGlzLCBzbyB0aGF0IHdlIGhhdmUgc29tZXdoZXJlIHRvIGltcG9ydCB0aGUgc2VsZWN0aW9uIHRvXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXN0VGV4dE5vZGUgPSBub2RlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIFdlJ3ZlIGZvdW5kIHRoZSBzdGFydCBvZiB0aGUgc2VsZWN0aW9uLCBjaGVjayBpZiB3ZSdyZSBhdCBvciBiZXlvbmQgdGhlIGVuZCBvZiB0aGUgc2VsZWN0aW9uIHdlJ3JlIGltcG9ydGluZ1xuICAgICAgICAgICAgICAgICAgICBpZiAoZm91bmRTdGFydCAmJiBzZWxlY3Rpb25TdGF0ZS5lbmQgPj0gY2hhckluZGV4ICYmIHNlbGVjdGlvblN0YXRlLmVuZCA8PSBuZXh0Q2hhckluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXNlbGVjdGlvblN0YXRlLnRyYWlsaW5nSW1hZ2VDb3VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlLnNldEVuZChub2RlLCBzZWxlY3Rpb25TdGF0ZS5lbmQgLSBjaGFySW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3AgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3VuZEVuZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2hhckluZGV4ID0gbmV4dENoYXJJbmRleDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZWN0aW9uU3RhdGUudHJhaWxpbmdJbWFnZUNvdW50ICYmIGZvdW5kRW5kKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnaW1nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYWlsaW5nSW1hZ2VDb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRyYWlsaW5nSW1hZ2VDb3VudCA9PT0gc2VsZWN0aW9uU3RhdGUudHJhaWxpbmdJbWFnZUNvdW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmluZCB3aGljaCBpbmRleCB0aGUgaW1hZ2UgaXMgaW4gaXRzIHBhcmVudCdzIGNoaWxkcmVuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVuZEluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAobm9kZS5wYXJlbnROb2RlLmNoaWxkTm9kZXNbZW5kSW5kZXhdICE9PSBub2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZEluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlLnNldEVuZChub2RlLnBhcmVudE5vZGUsIGVuZEluZGV4ICsgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoIXN0b3AgJiYgbm9kZS5ub2RlVHlwZSA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhpcyBpcyBhbiBlbGVtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhZGQgYWxsIGl0cyBjaGlsZHJlbiB0byB0aGUgc3RhY2tcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpID0gbm9kZS5jaGlsZE5vZGVzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoaSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVN0YWNrLnB1c2gobm9kZS5jaGlsZE5vZGVzW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpIC09IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoIXN0b3ApIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZSA9IG5vZGVTdGFjay5wb3AoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElmIHdlJ3ZlIGdvbmUgdGhyb3VnaCB0aGUgZW50aXJlIHRleHQgYnV0IGRpZG4ndCBmaW5kIHRoZSBiZWdpbm5pbmcgb2YgYSB0ZXh0IG5vZGVcbiAgICAgICAgICAgIC8vIHRvIG1ha2UgdGhlIHNlbGVjdGlvbiBzdGFydCBhdCwgd2Ugc2hvdWxkIGZhbGwgYmFjayB0byBzdGFydGluZyB0aGUgc2VsZWN0aW9uXG4gICAgICAgICAgICAvLyBhdCB0aGUgRU5EIG9mIHRoZSBsYXN0IHRleHQgbm9kZSB3ZSBmb3VuZFxuICAgICAgICAgICAgaWYgKCFmb3VuZFN0YXJ0ICYmIGxhc3RUZXh0Tm9kZSkge1xuICAgICAgICAgICAgICAgIHJhbmdlLnNldFN0YXJ0KGxhc3RUZXh0Tm9kZSwgbGFzdFRleHROb2RlLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgcmFuZ2Uuc2V0RW5kKGxhc3RUZXh0Tm9kZSwgbGFzdFRleHROb2RlLmxlbmd0aCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc2VsZWN0aW9uU3RhdGUuZW1wdHlCbG9ja3NJbmRleCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICByYW5nZSA9IHRoaXMuaW1wb3J0U2VsZWN0aW9uTW92ZUN1cnNvclBhc3RCbG9ja3MoZG9jLCByb290LCBzZWxlY3Rpb25TdGF0ZS5lbXB0eUJsb2Nrc0luZGV4LCByYW5nZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElmIHRoZSBzZWxlY3Rpb24gaXMgcmlnaHQgYXQgdGhlIGVuZGluZyBlZGdlIG9mIGEgbGluaywgcHV0IGl0IG91dHNpZGUgdGhlIGFuY2hvciB0YWcgaW5zdGVhZCBvZiBpbnNpZGUuXG4gICAgICAgICAgICBpZiAoZmF2b3JMYXRlclNlbGVjdGlvbkFuY2hvcikge1xuICAgICAgICAgICAgICAgIHJhbmdlID0gdGhpcy5pbXBvcnRTZWxlY3Rpb25Nb3ZlQ3Vyc29yUGFzdEFuY2hvcihzZWxlY3Rpb25TdGF0ZSwgcmFuZ2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnNlbGVjdFJhbmdlKGRvYywgcmFuZ2UpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIFV0aWxpdHkgbWV0aG9kIGNhbGxlZCBmcm9tIGltcG9ydFNlbGVjdGlvbiBvbmx5XG4gICAgICAgIGltcG9ydFNlbGVjdGlvbk1vdmVDdXJzb3JQYXN0QW5jaG9yOiBmdW5jdGlvbiAoc2VsZWN0aW9uU3RhdGUsIHJhbmdlKSB7XG4gICAgICAgICAgICB2YXIgbm9kZUluc2lkZUFuY2hvclRhZ0Z1bmN0aW9uID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnYSc7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHNlbGVjdGlvblN0YXRlLnN0YXJ0ID09PSBzZWxlY3Rpb25TdGF0ZS5lbmQgJiZcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2Uuc3RhcnRDb250YWluZXIubm9kZVR5cGUgPT09IDMgJiZcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2Uuc3RhcnRPZmZzZXQgPT09IHJhbmdlLnN0YXJ0Q29udGFpbmVyLm5vZGVWYWx1ZS5sZW5ndGggJiZcbiAgICAgICAgICAgICAgICAgICAgTWVkaXVtRWRpdG9yLnV0aWwudHJhdmVyc2VVcChyYW5nZS5zdGFydENvbnRhaW5lciwgbm9kZUluc2lkZUFuY2hvclRhZ0Z1bmN0aW9uKSkge1xuICAgICAgICAgICAgICAgIHZhciBwcmV2Tm9kZSA9IHJhbmdlLnN0YXJ0Q29udGFpbmVyLFxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50Tm9kZSA9IHJhbmdlLnN0YXJ0Q29udGFpbmVyLnBhcmVudE5vZGU7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGN1cnJlbnROb2RlICE9PSBudWxsICYmIGN1cnJlbnROb2RlLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgIT09ICdhJykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY3VycmVudE5vZGUuY2hpbGROb2Rlc1tjdXJyZW50Tm9kZS5jaGlsZE5vZGVzLmxlbmd0aCAtIDFdICE9PSBwcmV2Tm9kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudE5vZGUgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJldk5vZGUgPSBjdXJyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnROb2RlID0gY3VycmVudE5vZGUucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudE5vZGUgIT09IG51bGwgJiYgY3VycmVudE5vZGUubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ2EnKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjdXJyZW50Tm9kZUluZGV4ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGN1cnJlbnROb2RlSW5kZXggPT09IG51bGwgJiYgaSA8IGN1cnJlbnROb2RlLnBhcmVudE5vZGUuY2hpbGROb2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJlbnROb2RlLnBhcmVudE5vZGUuY2hpbGROb2Rlc1tpXSA9PT0gY3VycmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50Tm9kZUluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByYW5nZS5zZXRTdGFydChjdXJyZW50Tm9kZS5wYXJlbnROb2RlLCBjdXJyZW50Tm9kZUluZGV4ICsgMSk7XG4gICAgICAgICAgICAgICAgICAgIHJhbmdlLmNvbGxhcHNlKHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByYW5nZTtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBVc2VzIHRoZSBlbXB0eUJsb2Nrc0luZGV4IGNhbGN1bGF0ZWQgYnkgZ2V0SW5kZXhSZWxhdGl2ZVRvQWRqYWNlbnRFbXB0eUJsb2Nrc1xuICAgICAgICAvLyB0byBtb3ZlIHRoZSBjdXJzb3IgYmFjayB0byB0aGUgc3RhcnQgb2YgdGhlIGNvcnJlY3QgcGFyYWdyYXBoXG4gICAgICAgIGltcG9ydFNlbGVjdGlvbk1vdmVDdXJzb3JQYXN0QmxvY2tzOiBmdW5jdGlvbiAoZG9jLCByb290LCBpbmRleCwgcmFuZ2UpIHtcbiAgICAgICAgICAgIHZhciB0cmVlV2Fsa2VyID0gZG9jLmNyZWF0ZVRyZWVXYWxrZXIocm9vdCwgTm9kZUZpbHRlci5TSE9XX0VMRU1FTlQsIGZpbHRlck9ubHlQYXJlbnRFbGVtZW50cywgZmFsc2UpLFxuICAgICAgICAgICAgICAgIHN0YXJ0Q29udGFpbmVyID0gcmFuZ2Uuc3RhcnRDb250YWluZXIsXG4gICAgICAgICAgICAgICAgc3RhcnRCbG9jayxcbiAgICAgICAgICAgICAgICB0YXJnZXROb2RlLFxuICAgICAgICAgICAgICAgIGN1cnJJbmRleCA9IDA7XG4gICAgICAgICAgICBpbmRleCA9IGluZGV4IHx8IDE7IC8vIElmIGluZGV4IGlzIDAsIHdlIHN0aWxsIHdhbnQgdG8gbW92ZSB0byB0aGUgbmV4dCBibG9ja1xuXG4gICAgICAgICAgICAvLyBDaHJvbWUgY291bnRzIG5ld2xpbmVzIGFuZCBzcGFjZXMgdGhhdCBzZXBhcmF0ZSBibG9jayBlbGVtZW50cyBhcyBhY3R1YWwgZWxlbWVudHMuXG4gICAgICAgICAgICAvLyBJZiB0aGUgc2VsZWN0aW9uIGlzIGluc2lkZSBvbmUgb2YgdGhlc2UgdGV4dCBub2RlcywgYW5kIGl0IGhhcyBhIHByZXZpb3VzIHNpYmxpbmdcbiAgICAgICAgICAgIC8vIHdoaWNoIGlzIGEgYmxvY2sgZWxlbWVudCwgd2Ugd2FudCB0aGUgdHJlZXdhbGtlciB0byBzdGFydCBhdCB0aGUgcHJldmlvdXMgc2libGluZ1xuICAgICAgICAgICAgLy8gYW5kIE5PVCBhdCB0aGUgcGFyZW50IG9mIHRoZSB0ZXh0bm9kZVxuICAgICAgICAgICAgaWYgKHN0YXJ0Q29udGFpbmVyLm5vZGVUeXBlID09PSAzICYmIE1lZGl1bUVkaXRvci51dGlsLmlzQmxvY2tDb250YWluZXIoc3RhcnRDb250YWluZXIucHJldmlvdXNTaWJsaW5nKSkge1xuICAgICAgICAgICAgICAgIHN0YXJ0QmxvY2sgPSBzdGFydENvbnRhaW5lci5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0YXJ0QmxvY2sgPSBNZWRpdW1FZGl0b3IudXRpbC5nZXRDbG9zZXN0QmxvY2tDb250YWluZXIoc3RhcnRDb250YWluZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTa2lwIG92ZXIgZW1wdHkgYmxvY2tzIHVudGlsIHdlIGhpdCB0aGUgYmxvY2sgd2Ugd2FudCB0aGUgc2VsZWN0aW9uIHRvIGJlIGluXG4gICAgICAgICAgICB3aGlsZSAodHJlZVdhbGtlci5uZXh0Tm9kZSgpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0YXJnZXROb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIExvb3AgdGhyb3VnaCBhbGwgYmxvY2tzIHVudGlsIHdlIGhpdCB0aGUgc3RhcnRpbmcgYmxvY2sgZWxlbWVudFxuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhcnRCbG9jayA9PT0gdHJlZVdhbGtlci5jdXJyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0Tm9kZSA9IHRyZWVXYWxrZXIuY3VycmVudE5vZGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXROb2RlID0gdHJlZVdhbGtlci5jdXJyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICAgICAgY3VyckluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgIC8vIFdlIGhpdCB0aGUgdGFyZ2V0IGluZGV4LCBiYWlsXG4gICAgICAgICAgICAgICAgICAgIGlmIChjdXJySW5kZXggPT09IGluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB3ZSBmaW5kIGEgbm9uLWVtcHR5IGJsb2NrLCBpZ25vcmUgdGhlIGVtcHR5QmxvY2tzSW5kZXggYW5kIGp1c3QgcHV0IHNlbGVjdGlvbiBoZXJlXG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXJnZXROb2RlLnRleHRDb250ZW50Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIXRhcmdldE5vZGUpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXROb2RlID0gc3RhcnRCbG9jaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gV2UncmUgc2VsZWN0aW5nIGEgaGlnaC1sZXZlbCBibG9jayBub2RlLCBzbyBtYWtlIHN1cmUgdGhlIGN1cnNvciBnZXRzIG1vdmVkIGludG8gdGhlIGRlZXBlc3RcbiAgICAgICAgICAgIC8vIGVsZW1lbnQgYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgYmxvY2tcbiAgICAgICAgICAgIHJhbmdlLnNldFN0YXJ0KE1lZGl1bUVkaXRvci51dGlsLmdldEZpcnN0U2VsZWN0YWJsZUxlYWZOb2RlKHRhcmdldE5vZGUpLCAwKTtcblxuICAgICAgICAgICAgcmV0dXJuIHJhbmdlO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIFJldHVybnMgLTEgdW5sZXNzIHRoZSBjdXJzb3IgaXMgYXQgdGhlIGJlZ2lubmluZyBvZiBhIHBhcmFncmFwaC9ibG9ja1xuICAgICAgICAvLyBJZiB0aGUgcGFyYWdyYXBoL2Jsb2NrIGlzIHByZWNlZWRlZCBieSBlbXB0eSBwYXJhZ3JhcGhzL2Jsb2NrICh3aXRoIG5vIHRleHQpXG4gICAgICAgIC8vIGl0IHdpbGwgcmV0dXJuIHRoZSBudW1iZXIgb2YgZW1wdHkgcGFyYWdyYXBocyBiZWZvcmUgdGhlIGN1cnNvci5cbiAgICAgICAgLy8gT3RoZXJ3aXNlLCBpdCB3aWxsIHJldHVybiAwLCB3aGljaCBpbmRpY2F0ZXMgdGhlIGN1cnNvciBpcyBhdCB0aGUgYmVnaW5uaW5nXG4gICAgICAgIC8vIG9mIGEgcGFyYWdyYXBoL2Jsb2NrLCBhbmQgbm90IGF0IHRoZSBlbmQgb2YgdGhlIHBhcmFncmFwaC9ibG9jayBiZWZvcmUgaXRcbiAgICAgICAgZ2V0SW5kZXhSZWxhdGl2ZVRvQWRqYWNlbnRFbXB0eUJsb2NrczogZnVuY3Rpb24gKGRvYywgcm9vdCwgY3Vyc29yQ29udGFpbmVyLCBjdXJzb3JPZmZzZXQpIHtcbiAgICAgICAgICAgIC8vIElmIHRoZXJlIGlzIHRleHQgaW4gZnJvbnQgb2YgdGhlIGN1cnNvciwgdGhhdCBtZWFucyB0aGVyZSBpc24ndCBvbmx5IGVtcHR5IGJsb2NrcyBiZWZvcmUgaXRcbiAgICAgICAgICAgIGlmIChjdXJzb3JDb250YWluZXIudGV4dENvbnRlbnQubGVuZ3RoID4gMCAmJiBjdXJzb3JPZmZzZXQgPiAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgYmxvY2sgdGhhdCBjb250YWlucyB0aGUgY3Vyc29yIGhhcyBhbnkgb3RoZXIgdGV4dCBpbiBmcm9udCBvZiB0aGUgY3Vyc29yXG4gICAgICAgICAgICB2YXIgbm9kZSA9IGN1cnNvckNvbnRhaW5lcjtcbiAgICAgICAgICAgIGlmIChub2RlLm5vZGVUeXBlICE9PSAzKSB7XG4gICAgICAgICAgICAgICAgbm9kZSA9IGN1cnNvckNvbnRhaW5lci5jaGlsZE5vZGVzW2N1cnNvck9mZnNldF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobm9kZSkge1xuICAgICAgICAgICAgICAgIC8vIFRoZSBlbGVtZW50IGlzbid0IGF0IHRoZSBiZWdpbm5pbmcgb2YgYSBibG9jaywgc28gaXQgaGFzIGNvbnRlbnQgYmVmb3JlIGl0XG4gICAgICAgICAgICAgICAgaWYgKCFNZWRpdW1FZGl0b3IudXRpbC5pc0VsZW1lbnRBdEJlZ2lubmluZ09mQmxvY2sobm9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBwcmV2aW91c1NpYmxpbmcgPSBNZWRpdW1FZGl0b3IudXRpbC5maW5kUHJldmlvdXNTaWJsaW5nKG5vZGUpO1xuICAgICAgICAgICAgICAgIC8vIElmIHRoZXJlIGlzIG5vIHByZXZpb3VzIHNpYmxpbmcsIHRoaXMgaXMgdGhlIGZpcnN0IHRleHQgZWxlbWVudCBpbiB0aGUgZWRpdG9yXG4gICAgICAgICAgICAgICAgaWYgKCFwcmV2aW91c1NpYmxpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgcHJldmlvdXMgc2libGluZyBoYXMgdGV4dCwgdGhlbiB0aGVyZSBhcmUgbm8gZW1wdHkgYmxvY2tzIGJlZm9yZSB0aGlzXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAocHJldmlvdXNTaWJsaW5nLm5vZGVWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBXYWxrIG92ZXIgYmxvY2sgZWxlbWVudHMsIGNvdW50aW5nIG51bWJlciBvZiBlbXB0eSBibG9ja3MgYmV0d2VlbiBsYXN0IHBpZWNlIG9mIHRleHRcbiAgICAgICAgICAgIC8vIGFuZCB0aGUgYmxvY2sgdGhlIGN1cnNvciBpcyBpblxuICAgICAgICAgICAgdmFyIGNsb3Nlc3RCbG9jayA9IE1lZGl1bUVkaXRvci51dGlsLmdldENsb3Nlc3RCbG9ja0NvbnRhaW5lcihjdXJzb3JDb250YWluZXIpLFxuICAgICAgICAgICAgICAgIHRyZWVXYWxrZXIgPSBkb2MuY3JlYXRlVHJlZVdhbGtlcihyb290LCBOb2RlRmlsdGVyLlNIT1dfRUxFTUVOVCwgZmlsdGVyT25seVBhcmVudEVsZW1lbnRzLCBmYWxzZSksXG4gICAgICAgICAgICAgICAgZW1wdHlCbG9ja3NDb3VudCA9IDA7XG4gICAgICAgICAgICB3aGlsZSAodHJlZVdhbGtlci5uZXh0Tm9kZSgpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGJsb2NrSXNFbXB0eSA9IHRyZWVXYWxrZXIuY3VycmVudE5vZGUudGV4dENvbnRlbnQgPT09ICcnO1xuICAgICAgICAgICAgICAgIGlmIChibG9ja0lzRW1wdHkgfHwgZW1wdHlCbG9ja3NDb3VudCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZW1wdHlCbG9ja3NDb3VudCArPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodHJlZVdhbGtlci5jdXJyZW50Tm9kZSA9PT0gY2xvc2VzdEJsb2NrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlbXB0eUJsb2Nrc0NvdW50O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIWJsb2NrSXNFbXB0eSkge1xuICAgICAgICAgICAgICAgICAgICBlbXB0eUJsb2Nrc0NvdW50ID0gMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBlbXB0eUJsb2Nrc0NvdW50O1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIFJldHVybnMgdHJ1ZSBpZiB0aGUgc2VsZWN0aW9uIHJhbmdlIGJlZ2lucyB3aXRoIGFuIGltYWdlIHRhZ1xuICAgICAgICAvLyBSZXR1cm5zIGZhbHNlIGlmIHRoZSByYW5nZSBzdGFydHMgd2l0aCBhbnkgbm9uIGVtcHR5IHRleHQgbm9kZXNcbiAgICAgICAgZG9lc1JhbmdlU3RhcnRXaXRoSW1hZ2VzOiBmdW5jdGlvbiAocmFuZ2UsIGRvYykge1xuICAgICAgICAgICAgaWYgKHJhbmdlLnN0YXJ0T2Zmc2V0ICE9PSAwIHx8IHJhbmdlLnN0YXJ0Q29udGFpbmVyLm5vZGVUeXBlICE9PSAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocmFuZ2Uuc3RhcnRDb250YWluZXIubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ2ltZycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGltZyA9IHJhbmdlLnN0YXJ0Q29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJ2ltZycpO1xuICAgICAgICAgICAgaWYgKCFpbWcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciB0cmVlV2Fsa2VyID0gZG9jLmNyZWF0ZVRyZWVXYWxrZXIocmFuZ2Uuc3RhcnRDb250YWluZXIsIE5vZGVGaWx0ZXIuU0hPV19BTEwsIG51bGwsIGZhbHNlKTtcbiAgICAgICAgICAgIHdoaWxlICh0cmVlV2Fsa2VyLm5leHROb2RlKCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV4dCA9IHRyZWVXYWxrZXIuY3VycmVudE5vZGU7XG4gICAgICAgICAgICAgICAgLy8gSWYgd2UgaGl0IHRoZSBpbWFnZSwgdGhlbiB0aGVyZSBpc24ndCBhbnkgdGV4dCBiZWZvcmUgdGhlIGltYWdlIHNvXG4gICAgICAgICAgICAgICAgLy8gdGhlIGltYWdlIGlzIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHJhbmdlXG4gICAgICAgICAgICAgICAgaWYgKG5leHQgPT09IGltZykge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZW4ndCBoaXQgdGhlIGlhbWdlLCBidXQgZm91bmQgdGV4dCB0aGF0IGNvbnRhaW5zIGNvbnRlbnRcbiAgICAgICAgICAgICAgICAvLyB0aGVuIHRoZSByYW5nZSBkb2Vzbid0IHN0YXJ0IHdpdGggYW4gaW1hZ2VcbiAgICAgICAgICAgICAgICBpZiAobmV4dC5ub2RlVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0VHJhaWxpbmdJbWFnZUNvdW50OiBmdW5jdGlvbiAocm9vdCwgc2VsZWN0aW9uU3RhdGUsIGVuZENvbnRhaW5lciwgZW5kT2Zmc2V0KSB7XG4gICAgICAgICAgICAvLyBJZiB0aGUgZW5kT2Zmc2V0IG9mIGEgcmFuZ2UgaXMgMCwgdGhlIGVuZENvbnRhaW5lciBkb2Vzbid0IGNvbnRhaW4gaW1hZ2VzXG4gICAgICAgICAgICAvLyBJZiB0aGUgZW5kQ29udGFpbmVyIGlzIGEgdGV4dCBub2RlLCB0aGVyZSBhcmUgbm8gdHJhaWxpbmcgaW1hZ2VzXG4gICAgICAgICAgICBpZiAoZW5kT2Zmc2V0ID09PSAwIHx8IGVuZENvbnRhaW5lci5ub2RlVHlwZSAhPT0gMSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJZiB0aGUgZW5kQ29udGFpbmVyIGlzbid0IGFuIGltYWdlLCBhbmQgZG9lc24ndCBoYXZlIGFuIGltYWdlIGRlc2NlbmRhbnRzXG4gICAgICAgICAgICAvLyB0aGVyZSBhcmUgbm8gdHJhaWxpbmcgaW1hZ2VzXG4gICAgICAgICAgICBpZiAoZW5kQ29udGFpbmVyLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgIT09ICdpbWcnICYmICFlbmRDb250YWluZXIucXVlcnlTZWxlY3RvcignaW1nJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGxhc3ROb2RlID0gZW5kQ29udGFpbmVyLmNoaWxkTm9kZXNbZW5kT2Zmc2V0IC0gMV07XG4gICAgICAgICAgICB3aGlsZSAobGFzdE5vZGUuaGFzQ2hpbGROb2RlcygpKSB7XG4gICAgICAgICAgICAgICAgbGFzdE5vZGUgPSBsYXN0Tm9kZS5sYXN0Q2hpbGQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBub2RlID0gcm9vdCxcbiAgICAgICAgICAgICAgICBub2RlU3RhY2sgPSBbXSxcbiAgICAgICAgICAgICAgICBjaGFySW5kZXggPSAwLFxuICAgICAgICAgICAgICAgIGZvdW5kU3RhcnQgPSBmYWxzZSxcbiAgICAgICAgICAgICAgICBmb3VuZEVuZCA9IGZhbHNlLFxuICAgICAgICAgICAgICAgIHN0b3AgPSBmYWxzZSxcbiAgICAgICAgICAgICAgICBuZXh0Q2hhckluZGV4LFxuICAgICAgICAgICAgICAgIHRyYWlsaW5nSW1hZ2VzID0gMDtcblxuICAgICAgICAgICAgd2hpbGUgKCFzdG9wICYmIG5vZGUpIHtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGl0ZXJhdGUgb3ZlciBlbGVtZW50cyBhbmQgdGV4dCBub2Rlc1xuICAgICAgICAgICAgICAgIGlmIChub2RlLm5vZGVUeXBlID4gMykge1xuICAgICAgICAgICAgICAgICAgICBub2RlID0gbm9kZVN0YWNrLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAobm9kZS5ub2RlVHlwZSA9PT0gMyAmJiAhZm91bmRFbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJhaWxpbmdJbWFnZXMgPSAwO1xuICAgICAgICAgICAgICAgICAgICBuZXh0Q2hhckluZGV4ID0gY2hhckluZGV4ICsgbm9kZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZm91bmRTdGFydCAmJiBzZWxlY3Rpb25TdGF0ZS5zdGFydCA+PSBjaGFySW5kZXggJiYgc2VsZWN0aW9uU3RhdGUuc3RhcnQgPD0gbmV4dENoYXJJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm91bmRTdGFydCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGZvdW5kU3RhcnQgJiYgc2VsZWN0aW9uU3RhdGUuZW5kID49IGNoYXJJbmRleCAmJiBzZWxlY3Rpb25TdGF0ZS5lbmQgPD0gbmV4dENoYXJJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm91bmRFbmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNoYXJJbmRleCA9IG5leHRDaGFySW5kZXg7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ2ltZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYWlsaW5nSW1hZ2VzKys7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZSA9PT0gbGFzdE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0b3AgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRoaXMgaXMgYW4gZWxlbWVudFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYWRkIGFsbCBpdHMgY2hpbGRyZW4gdG8gdGhlIHN0YWNrXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaSA9IG5vZGUuY2hpbGROb2Rlcy5sZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVTdGFjay5wdXNoKG5vZGUuY2hpbGROb2Rlc1tpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaSAtPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCFzdG9wKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUgPSBub2RlU3RhY2sucG9wKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdHJhaWxpbmdJbWFnZXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gZGV0ZXJtaW5lIGlmIHRoZSBjdXJyZW50IHNlbGVjdGlvbiBjb250YWlucyBhbnkgJ2NvbnRlbnQnXG4gICAgICAgIC8vIGNvbnRlbnQgYmVpbmcgYW55IG5vbi13aGl0ZSBzcGFjZSB0ZXh0IG9yIGFuIGltYWdlXG4gICAgICAgIHNlbGVjdGlvbkNvbnRhaW5zQ29udGVudDogZnVuY3Rpb24gKGRvYykge1xuICAgICAgICAgICAgdmFyIHNlbCA9IGRvYy5nZXRTZWxlY3Rpb24oKTtcblxuICAgICAgICAgICAgLy8gY29sbGFwc2VkIHNlbGVjdGlvbiBvciBzZWxlY3Rpb24gd2l0aG91ciByYW5nZSBkb2Vzbid0IGNvbnRhaW4gY29udGVudFxuICAgICAgICAgICAgaWYgKCFzZWwgfHwgc2VsLmlzQ29sbGFwc2VkIHx8ICFzZWwucmFuZ2VDb3VudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgdG9TdHJpbmcoKSBjb250YWlucyBhbnkgdGV4dCwgdGhlIHNlbGVjdGlvbiBjb250YWlucyBzb21lIGNvbnRlbnRcbiAgICAgICAgICAgIGlmIChzZWwudG9TdHJpbmcoKS50cmltKCkgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGlmIHNlbGVjdGlvbiBjb250YWlucyBvbmx5IGltYWdlKHMpLCBpdCB3aWxsIHJldHVybiBlbXB0eSBmb3IgdG9TdHJpbmcoKVxuICAgICAgICAgICAgLy8gc28gY2hlY2sgZm9yIGFuIGltYWdlIG1hbnVhbGx5XG4gICAgICAgICAgICB2YXIgc2VsZWN0aW9uTm9kZSA9IHRoaXMuZ2V0U2VsZWN0ZWRQYXJlbnRFbGVtZW50KHNlbC5nZXRSYW5nZUF0KDApKTtcbiAgICAgICAgICAgIGlmIChzZWxlY3Rpb25Ob2RlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGVjdGlvbk5vZGUubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ2ltZycgfHxcbiAgICAgICAgICAgICAgICAgICAgKHNlbGVjdGlvbk5vZGUubm9kZVR5cGUgPT09IDEgJiYgc2VsZWN0aW9uTm9kZS5xdWVyeVNlbGVjdG9yKCdpbWcnKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2VsZWN0aW9uSW5Db250ZW50RWRpdGFibGVGYWxzZTogZnVuY3Rpb24gKGNvbnRlbnRXaW5kb3cpIHtcbiAgICAgICAgICAgIC8vIGRldGVybWluZSBpZiB0aGUgY3VycmVudCBzZWxlY3Rpb24gaXMgZXhjbHVzaXZlbHkgaW5zaWRlXG4gICAgICAgICAgICAvLyBhIGNvbnRlbnRlZGl0YWJsZT1cImZhbHNlXCIsIHRob3VnaCB0cmVhdCB0aGUgY2FzZSBvZiBhblxuICAgICAgICAgICAgLy8gZXhwbGljaXQgY29udGVudGVkaXRhYmxlPVwidHJ1ZVwiIGluc2lkZSBhIFwiZmFsc2VcIiBhcyBmYWxzZS5cbiAgICAgICAgICAgIHZhciBzYXd0cnVlLFxuICAgICAgICAgICAgICAgIHNhd2ZhbHNlID0gdGhpcy5maW5kTWF0Y2hpbmdTZWxlY3Rpb25QYXJlbnQoZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjZSA9IGVsICYmIGVsLmdldEF0dHJpYnV0ZSgnY29udGVudGVkaXRhYmxlJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjZSA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzYXd0cnVlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWwubm9kZU5hbWUgIT09ICcjdGV4dCcgJiYgY2UgPT09ICdmYWxzZSc7XG4gICAgICAgICAgICAgICAgfSwgY29udGVudFdpbmRvdyk7XG5cbiAgICAgICAgICAgIHJldHVybiAhc2F3dHJ1ZSAmJiBzYXdmYWxzZTtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzQxNzY5MjMvaHRtbC1vZi1zZWxlY3RlZC10ZXh0XG4gICAgICAgIC8vIGJ5IFRpbSBEb3duXG4gICAgICAgIGdldFNlbGVjdGlvbkh0bWw6IGZ1bmN0aW9uIGdldFNlbGVjdGlvbkh0bWwoZG9jKSB7XG4gICAgICAgICAgICB2YXIgaSxcbiAgICAgICAgICAgICAgICBodG1sID0gJycsXG4gICAgICAgICAgICAgICAgc2VsID0gZG9jLmdldFNlbGVjdGlvbigpLFxuICAgICAgICAgICAgICAgIGxlbixcbiAgICAgICAgICAgICAgICBjb250YWluZXI7XG4gICAgICAgICAgICBpZiAoc2VsLnJhbmdlQ291bnQpIHtcbiAgICAgICAgICAgICAgICBjb250YWluZXIgPSBkb2MuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMCwgbGVuID0gc2VsLnJhbmdlQ291bnQ7IGkgPCBsZW47IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoc2VsLmdldFJhbmdlQXQoaSkuY2xvbmVDb250ZW50cygpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaHRtbCA9IGNvbnRhaW5lci5pbm5lckhUTUw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaHRtbDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogIEZpbmQgdGhlIGNhcmV0IHBvc2l0aW9uIHdpdGhpbiBhbiBlbGVtZW50IGlycmVzcGVjdGl2ZSBvZiBhbnkgaW5saW5lIHRhZ3MgaXQgbWF5IGNvbnRhaW4uXG4gICAgICAgICAqXG4gICAgICAgICAqICBAcGFyYW0ge0RPTUVsZW1lbnR9IEFuIGVsZW1lbnQgY29udGFpbmluZyB0aGUgY3Vyc29yIHRvIGZpbmQgb2Zmc2V0cyByZWxhdGl2ZSB0by5cbiAgICAgICAgICogIEBwYXJhbSB7UmFuZ2V9IEEgUmFuZ2UgcmVwcmVzZW50aW5nIGN1cnNvciBwb3NpdGlvbi4gV2lsbCB3aW5kb3cuZ2V0U2VsZWN0aW9uIGlmIG5vbmUgaXMgcGFzc2VkLlxuICAgICAgICAgKiAgQHJldHVybiB7T2JqZWN0fSAnbGVmdCcgYW5kICdyaWdodCcgYXR0cmlidXRlcyBjb250YWluIG9mZnNldHMgZnJvbSBiZWdpbmluZyBhbmQgZW5kIG9mIEVsZW1lbnRcbiAgICAgICAgICovXG4gICAgICAgIGdldENhcmV0T2Zmc2V0czogZnVuY3Rpb24gZ2V0Q2FyZXRPZmZzZXRzKGVsZW1lbnQsIHJhbmdlKSB7XG4gICAgICAgICAgICB2YXIgcHJlQ2FyZXRSYW5nZSwgcG9zdENhcmV0UmFuZ2U7XG5cbiAgICAgICAgICAgIGlmICghcmFuZ2UpIHtcbiAgICAgICAgICAgICAgICByYW5nZSA9IHdpbmRvdy5nZXRTZWxlY3Rpb24oKS5nZXRSYW5nZUF0KDApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcmVDYXJldFJhbmdlID0gcmFuZ2UuY2xvbmVSYW5nZSgpO1xuICAgICAgICAgICAgcG9zdENhcmV0UmFuZ2UgPSByYW5nZS5jbG9uZVJhbmdlKCk7XG5cbiAgICAgICAgICAgIHByZUNhcmV0UmFuZ2Uuc2VsZWN0Tm9kZUNvbnRlbnRzKGVsZW1lbnQpO1xuICAgICAgICAgICAgcHJlQ2FyZXRSYW5nZS5zZXRFbmQocmFuZ2UuZW5kQ29udGFpbmVyLCByYW5nZS5lbmRPZmZzZXQpO1xuXG4gICAgICAgICAgICBwb3N0Q2FyZXRSYW5nZS5zZWxlY3ROb2RlQ29udGVudHMoZWxlbWVudCk7XG4gICAgICAgICAgICBwb3N0Q2FyZXRSYW5nZS5zZXRTdGFydChyYW5nZS5lbmRDb250YWluZXIsIHJhbmdlLmVuZE9mZnNldCk7XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgbGVmdDogcHJlQ2FyZXRSYW5nZS50b1N0cmluZygpLmxlbmd0aCxcbiAgICAgICAgICAgICAgICByaWdodDogcG9zdENhcmV0UmFuZ2UudG9TdHJpbmcoKS5sZW5ndGhcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xNTg2NzU0Mi9yYW5nZS1vYmplY3QtZ2V0LXNlbGVjdGlvbi1wYXJlbnQtbm9kZS1jaHJvbWUtdnMtZmlyZWZveFxuICAgICAgICByYW5nZVNlbGVjdHNTaW5nbGVOb2RlOiBmdW5jdGlvbiAocmFuZ2UpIHtcbiAgICAgICAgICAgIHZhciBzdGFydE5vZGUgPSByYW5nZS5zdGFydENvbnRhaW5lcjtcbiAgICAgICAgICAgIHJldHVybiBzdGFydE5vZGUgPT09IHJhbmdlLmVuZENvbnRhaW5lciAmJlxuICAgICAgICAgICAgICAgIHN0YXJ0Tm9kZS5oYXNDaGlsZE5vZGVzKCkgJiZcbiAgICAgICAgICAgICAgICByYW5nZS5lbmRPZmZzZXQgPT09IHJhbmdlLnN0YXJ0T2Zmc2V0ICsgMTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRTZWxlY3RlZFBhcmVudEVsZW1lbnQ6IGZ1bmN0aW9uIChyYW5nZSkge1xuICAgICAgICAgICAgaWYgKCFyYW5nZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTZWxlY3Rpb24gZW5jb21wYXNzZXMgYSBzaW5nbGUgZWxlbWVudFxuICAgICAgICAgICAgaWYgKHRoaXMucmFuZ2VTZWxlY3RzU2luZ2xlTm9kZShyYW5nZSkgJiYgcmFuZ2Uuc3RhcnRDb250YWluZXIuY2hpbGROb2Rlc1tyYW5nZS5zdGFydE9mZnNldF0ubm9kZVR5cGUgIT09IDMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmFuZ2Uuc3RhcnRDb250YWluZXIuY2hpbGROb2Rlc1tyYW5nZS5zdGFydE9mZnNldF07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNlbGVjdGlvbiByYW5nZSBzdGFydHMgaW5zaWRlIGEgdGV4dCBub2RlLCBzbyBnZXQgaXRzIHBhcmVudFxuICAgICAgICAgICAgaWYgKHJhbmdlLnN0YXJ0Q29udGFpbmVyLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJhbmdlLnN0YXJ0Q29udGFpbmVyLnBhcmVudE5vZGU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNlbGVjdGlvbiBzdGFydHMgaW5zaWRlIGFuIGVsZW1lbnRcbiAgICAgICAgICAgIHJldHVybiByYW5nZS5zdGFydENvbnRhaW5lcjtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRTZWxlY3RlZEVsZW1lbnRzOiBmdW5jdGlvbiAoZG9jKSB7XG4gICAgICAgICAgICB2YXIgc2VsZWN0aW9uID0gZG9jLmdldFNlbGVjdGlvbigpLFxuICAgICAgICAgICAgICAgIHJhbmdlLFxuICAgICAgICAgICAgICAgIHRvUmV0LFxuICAgICAgICAgICAgICAgIGN1cnJOb2RlO1xuXG4gICAgICAgICAgICBpZiAoIXNlbGVjdGlvbi5yYW5nZUNvdW50IHx8IHNlbGVjdGlvbi5pc0NvbGxhcHNlZCB8fCAhc2VsZWN0aW9uLmdldFJhbmdlQXQoMCkuY29tbW9uQW5jZXN0b3JDb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJhbmdlID0gc2VsZWN0aW9uLmdldFJhbmdlQXQoMCk7XG5cbiAgICAgICAgICAgIGlmIChyYW5nZS5jb21tb25BbmNlc3RvckNvbnRhaW5lci5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICAgICAgICAgIHRvUmV0ID0gW107XG4gICAgICAgICAgICAgICAgY3Vyck5vZGUgPSByYW5nZS5jb21tb25BbmNlc3RvckNvbnRhaW5lcjtcbiAgICAgICAgICAgICAgICB3aGlsZSAoY3Vyck5vZGUucGFyZW50Tm9kZSAmJiBjdXJyTm9kZS5wYXJlbnROb2RlLmNoaWxkTm9kZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvUmV0LnB1c2goY3Vyck5vZGUucGFyZW50Tm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJOb2RlID0gY3Vyck5vZGUucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdG9SZXQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBbXS5maWx0ZXIuY2FsbChyYW5nZS5jb21tb25BbmNlc3RvckNvbnRhaW5lci5nZXRFbGVtZW50c0J5VGFnTmFtZSgnKicpLCBmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHR5cGVvZiBzZWxlY3Rpb24uY29udGFpbnNOb2RlID09PSAnZnVuY3Rpb24nKSA/IHNlbGVjdGlvbi5jb250YWluc05vZGUoZWwsIHRydWUpIDogdHJ1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNlbGVjdE5vZGU6IGZ1bmN0aW9uIChub2RlLCBkb2MpIHtcbiAgICAgICAgICAgIHZhciByYW5nZSA9IGRvYy5jcmVhdGVSYW5nZSgpO1xuICAgICAgICAgICAgcmFuZ2Uuc2VsZWN0Tm9kZUNvbnRlbnRzKG5vZGUpO1xuICAgICAgICAgICAgdGhpcy5zZWxlY3RSYW5nZShkb2MsIHJhbmdlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZWxlY3Q6IGZ1bmN0aW9uIChkb2MsIHN0YXJ0Tm9kZSwgc3RhcnRPZmZzZXQsIGVuZE5vZGUsIGVuZE9mZnNldCkge1xuICAgICAgICAgICAgdmFyIHJhbmdlID0gZG9jLmNyZWF0ZVJhbmdlKCk7XG4gICAgICAgICAgICByYW5nZS5zZXRTdGFydChzdGFydE5vZGUsIHN0YXJ0T2Zmc2V0KTtcbiAgICAgICAgICAgIGlmIChlbmROb2RlKSB7XG4gICAgICAgICAgICAgICAgcmFuZ2Uuc2V0RW5kKGVuZE5vZGUsIGVuZE9mZnNldCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJhbmdlLmNvbGxhcHNlKHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zZWxlY3RSYW5nZShkb2MsIHJhbmdlKTtcbiAgICAgICAgICAgIHJldHVybiByYW5nZTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogIENsZWFyIHRoZSBjdXJyZW50IGhpZ2hsaWdodGVkIHNlbGVjdGlvbiBhbmQgc2V0IHRoZSBjYXJldCB0byB0aGUgc3RhcnQgb3IgdGhlIGVuZCBvZiB0aGF0IHByaW9yIHNlbGVjdGlvbiwgZGVmYXVsdHMgdG8gZW5kLlxuICAgICAgICAgKlxuICAgICAgICAgKiAgQHBhcmFtIHtEb21Eb2N1bWVudH0gZG9jICAgICAgICAgICAgQ3VycmVudCBkb2N1bWVudFxuICAgICAgICAgKiAgQHBhcmFtIHtib29sZWFufSBtb3ZlQ3Vyc29yVG9TdGFydCAgQSBib29sZWFuIHJlcHJlc2VudGluZyB3aGV0aGVyIG9yIG5vdCB0byBzZXQgdGhlIGNhcmV0IHRvIHRoZSBiZWdpbm5pbmcgb2YgdGhlIHByaW9yIHNlbGVjdGlvbi5cbiAgICAgICAgICovXG4gICAgICAgIGNsZWFyU2VsZWN0aW9uOiBmdW5jdGlvbiAoZG9jLCBtb3ZlQ3Vyc29yVG9TdGFydCkge1xuICAgICAgICAgICAgaWYgKG1vdmVDdXJzb3JUb1N0YXJ0KSB7XG4gICAgICAgICAgICAgICAgZG9jLmdldFNlbGVjdGlvbigpLmNvbGxhcHNlVG9TdGFydCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkb2MuZ2V0U2VsZWN0aW9uKCkuY29sbGFwc2VUb0VuZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNb3ZlIGN1cnNvciB0byB0aGUgZ2l2ZW4gbm9kZSB3aXRoIHRoZSBnaXZlbiBvZmZzZXQuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSAge0RvbURvY3VtZW50fSBkb2MgICAgIEN1cnJlbnQgZG9jdW1lbnRcbiAgICAgICAgICogQHBhcmFtICB7RG9tRWxlbWVudH0gIG5vZGUgICAgRWxlbWVudCB3aGVyZSB0byBqdW1wXG4gICAgICAgICAqIEBwYXJhbSAge2ludGVnZXJ9ICAgICBvZmZzZXQgIFdoZXJlIGluIHRoZSBlbGVtZW50IHNob3VsZCB3ZSBqdW1wLCAwIGJ5IGRlZmF1bHRcbiAgICAgICAgICovXG4gICAgICAgIG1vdmVDdXJzb3I6IGZ1bmN0aW9uIChkb2MsIG5vZGUsIG9mZnNldCkge1xuICAgICAgICAgICAgdGhpcy5zZWxlY3QoZG9jLCBub2RlLCBvZmZzZXQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFNlbGVjdGlvblJhbmdlOiBmdW5jdGlvbiAob3duZXJEb2N1bWVudCkge1xuICAgICAgICAgICAgdmFyIHNlbGVjdGlvbiA9IG93bmVyRG9jdW1lbnQuZ2V0U2VsZWN0aW9uKCk7XG4gICAgICAgICAgICBpZiAoc2VsZWN0aW9uLnJhbmdlQ291bnQgPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzZWxlY3Rpb24uZ2V0UmFuZ2VBdCgwKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZWxlY3RSYW5nZTogZnVuY3Rpb24gKG93bmVyRG9jdW1lbnQsIHJhbmdlKSB7XG4gICAgICAgICAgICB2YXIgc2VsZWN0aW9uID0gb3duZXJEb2N1bWVudC5nZXRTZWxlY3Rpb24oKTtcblxuICAgICAgICAgICAgc2VsZWN0aW9uLnJlbW92ZUFsbFJhbmdlcygpO1xuICAgICAgICAgICAgc2VsZWN0aW9uLmFkZFJhbmdlKHJhbmdlKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzExOTc0MDEvaG93LWNhbi1pLWdldC10aGUtZWxlbWVudC10aGUtY2FyZXQtaXMtaW4td2l0aC1qYXZhc2NyaXB0LXdoZW4tdXNpbmctY29udGVudGVkaVxuICAgICAgICAvLyBieSBZb3VcbiAgICAgICAgZ2V0U2VsZWN0aW9uU3RhcnQ6IGZ1bmN0aW9uIChvd25lckRvY3VtZW50KSB7XG4gICAgICAgICAgICB2YXIgbm9kZSA9IG93bmVyRG9jdW1lbnQuZ2V0U2VsZWN0aW9uKCkuYW5jaG9yTm9kZSxcbiAgICAgICAgICAgICAgICBzdGFydE5vZGUgPSAobm9kZSAmJiBub2RlLm5vZGVUeXBlID09PSAzID8gbm9kZS5wYXJlbnROb2RlIDogbm9kZSk7XG5cbiAgICAgICAgICAgIHJldHVybiBzdGFydE5vZGU7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgTWVkaXVtRWRpdG9yLnNlbGVjdGlvbiA9IFNlbGVjdGlvbjtcbn0oKSk7XG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgZnVuY3Rpb24gaXNFbGVtZW50RGVzY2VuZGFudE9mRXh0ZW5zaW9uKGV4dGVuc2lvbnMsIGVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuIGV4dGVuc2lvbnMuc29tZShmdW5jdGlvbiAoZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGV4dGVuc2lvbi5nZXRJbnRlcmFjdGlvbkVsZW1lbnRzICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZXh0ZW5zaW9uRWxlbWVudHMgPSBleHRlbnNpb24uZ2V0SW50ZXJhY3Rpb25FbGVtZW50cygpO1xuICAgICAgICAgICAgaWYgKCFleHRlbnNpb25FbGVtZW50cykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGV4dGVuc2lvbkVsZW1lbnRzKSkge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbkVsZW1lbnRzID0gW2V4dGVuc2lvbkVsZW1lbnRzXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBleHRlbnNpb25FbGVtZW50cy5zb21lKGZ1bmN0aW9uIChlbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBNZWRpdW1FZGl0b3IudXRpbC5pc0Rlc2NlbmRhbnQoZWwsIGVsZW1lbnQsIHRydWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHZhciBFdmVudHMgPSBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcbiAgICAgICAgdGhpcy5iYXNlID0gaW5zdGFuY2U7XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IHRoaXMuYmFzZS5vcHRpb25zO1xuICAgICAgICB0aGlzLmV2ZW50cyA9IFtdO1xuICAgICAgICB0aGlzLmRpc2FibGVkRXZlbnRzID0ge307XG4gICAgICAgIHRoaXMuY3VzdG9tRXZlbnRzID0ge307XG4gICAgICAgIHRoaXMubGlzdGVuZXJzID0ge307XG4gICAgfTtcblxuICAgIEV2ZW50cy5wcm90b3R5cGUgPSB7XG4gICAgICAgIElucHV0RXZlbnRPbkNvbnRlbnRlZGl0YWJsZVN1cHBvcnRlZDogIU1lZGl1bUVkaXRvci51dGlsLmlzSUUgJiYgIU1lZGl1bUVkaXRvci51dGlsLmlzRWRnZSxcblxuICAgICAgICAvLyBIZWxwZXJzIGZvciBldmVudCBoYW5kbGluZ1xuXG4gICAgICAgIGF0dGFjaERPTUV2ZW50OiBmdW5jdGlvbiAodGFyZ2V0cywgZXZlbnQsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKSB7XG4gICAgICAgICAgICB2YXIgd2luID0gdGhpcy5iYXNlLm9wdGlvbnMuY29udGVudFdpbmRvdyxcbiAgICAgICAgICAgICAgICBkb2MgPSB0aGlzLmJhc2Uub3B0aW9ucy5vd25lckRvY3VtZW50O1xuXG4gICAgICAgICAgICB0YXJnZXRzID0gTWVkaXVtRWRpdG9yLnV0aWwuaXNFbGVtZW50KHRhcmdldHMpIHx8IFt3aW4sIGRvY10uaW5kZXhPZih0YXJnZXRzKSA+IC0xID8gW3RhcmdldHNdIDogdGFyZ2V0cztcblxuICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLmZvckVhY2guY2FsbCh0YXJnZXRzLCBmdW5jdGlvbiAodGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKTtcbiAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cy5wdXNoKFt0YXJnZXQsIGV2ZW50LCBsaXN0ZW5lciwgdXNlQ2FwdHVyZV0pO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBkZXRhY2hET01FdmVudDogZnVuY3Rpb24gKHRhcmdldHMsIGV2ZW50LCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSkge1xuICAgICAgICAgICAgdmFyIGluZGV4LCBlLFxuICAgICAgICAgICAgICAgIHdpbiA9IHRoaXMuYmFzZS5vcHRpb25zLmNvbnRlbnRXaW5kb3csXG4gICAgICAgICAgICAgICAgZG9jID0gdGhpcy5iYXNlLm9wdGlvbnMub3duZXJEb2N1bWVudDtcblxuICAgICAgICAgICAgaWYgKHRhcmdldHMgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRzID0gTWVkaXVtRWRpdG9yLnV0aWwuaXNFbGVtZW50KHRhcmdldHMpIHx8IFt3aW4sIGRvY10uaW5kZXhPZih0YXJnZXRzKSA+IC0xID8gW3RhcmdldHNdIDogdGFyZ2V0cztcblxuICAgICAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5mb3JFYWNoLmNhbGwodGFyZ2V0cywgZnVuY3Rpb24gKHRhcmdldCkge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCA9IHRoaXMuaW5kZXhPZkxpc3RlbmVyKHRhcmdldCwgZXZlbnQsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZSA9IHRoaXMuZXZlbnRzLnNwbGljZShpbmRleCwgMSlbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICBlWzBdLnJlbW92ZUV2ZW50TGlzdGVuZXIoZVsxXSwgZVsyXSwgZVszXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGluZGV4T2ZMaXN0ZW5lcjogZnVuY3Rpb24gKHRhcmdldCwgZXZlbnQsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKSB7XG4gICAgICAgICAgICB2YXIgaSwgbiwgaXRlbTtcbiAgICAgICAgICAgIGZvciAoaSA9IDAsIG4gPSB0aGlzLmV2ZW50cy5sZW5ndGg7IGkgPCBuOyBpID0gaSArIDEpIHtcbiAgICAgICAgICAgICAgICBpdGVtID0gdGhpcy5ldmVudHNbaV07XG4gICAgICAgICAgICAgICAgaWYgKGl0ZW1bMF0gPT09IHRhcmdldCAmJiBpdGVtWzFdID09PSBldmVudCAmJiBpdGVtWzJdID09PSBsaXN0ZW5lciAmJiBpdGVtWzNdID09PSB1c2VDYXB0dXJlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfSxcblxuICAgICAgICBkZXRhY2hBbGxET01FdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBlID0gdGhpcy5ldmVudHMucG9wKCk7XG4gICAgICAgICAgICB3aGlsZSAoZSkge1xuICAgICAgICAgICAgICAgIGVbMF0ucmVtb3ZlRXZlbnRMaXN0ZW5lcihlWzFdLCBlWzJdLCBlWzNdKTtcbiAgICAgICAgICAgICAgICBlID0gdGhpcy5ldmVudHMucG9wKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGV0YWNoQWxsRXZlbnRzRnJvbUVsZW1lbnQ6IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgICAgICB2YXIgZmlsdGVyZWQgPSB0aGlzLmV2ZW50cy5maWx0ZXIoZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZSAmJiBlWzBdLmdldEF0dHJpYnV0ZSAmJiBlWzBdLmdldEF0dHJpYnV0ZSgnbWVkaXVtLWVkaXRvci1pbmRleCcpID09PSBlbGVtZW50LmdldEF0dHJpYnV0ZSgnbWVkaXVtLWVkaXRvci1pbmRleCcpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBmaWx0ZXJlZC5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBlID0gZmlsdGVyZWRbaV07XG4gICAgICAgICAgICAgICAgdGhpcy5kZXRhY2hET01FdmVudChlWzBdLCBlWzFdLCBlWzJdLCBlWzNdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvLyBBdHRhY2ggYWxsIGV4aXN0aW5nIGhhbmRsZXJzIHRvIGEgbmV3IGVsZW1lbnRcbiAgICAgICAgYXR0YWNoQWxsRXZlbnRzVG9FbGVtZW50OiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICAgICAgaWYgKHRoaXMubGlzdGVuZXJzWydlZGl0YWJsZUlucHV0J10pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRlbnRDYWNoZVtlbGVtZW50LmdldEF0dHJpYnV0ZSgnbWVkaXVtLWVkaXRvci1pbmRleCcpXSA9IGVsZW1lbnQuaW5uZXJIVE1MO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5ldmVudHNDYWNoZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzQ2FjaGUuZm9yRWFjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmF0dGFjaERPTUV2ZW50KGVsZW1lbnQsIGVbJ25hbWUnXSwgZVsnaGFuZGxlciddLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGVuYWJsZUN1c3RvbUV2ZW50OiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRpc2FibGVkRXZlbnRzW2V2ZW50XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuZGlzYWJsZWRFdmVudHNbZXZlbnRdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGRpc2FibGVDdXN0b21FdmVudDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICB0aGlzLmRpc2FibGVkRXZlbnRzW2V2ZW50XSA9IHRydWU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gY3VzdG9tIGV2ZW50c1xuICAgICAgICBhdHRhY2hDdXN0b21FdmVudDogZnVuY3Rpb24gKGV2ZW50LCBsaXN0ZW5lcikge1xuICAgICAgICAgICAgdGhpcy5zZXR1cExpc3RlbmVyKGV2ZW50KTtcbiAgICAgICAgICAgIGlmICghdGhpcy5jdXN0b21FdmVudHNbZXZlbnRdKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXN0b21FdmVudHNbZXZlbnRdID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmN1c3RvbUV2ZW50c1tldmVudF0ucHVzaChsaXN0ZW5lcik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGV0YWNoQ3VzdG9tRXZlbnQ6IGZ1bmN0aW9uIChldmVudCwgbGlzdGVuZXIpIHtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IHRoaXMuaW5kZXhPZkN1c3RvbUxpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcik7XG4gICAgICAgICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXN0b21FdmVudHNbZXZlbnRdLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICAgICAgLy8gVE9ETzogSWYgYXJyYXkgaXMgZW1wdHksIHNob3VsZCBkZXRhY2ggaW50ZXJuYWwgbGlzdGVuZXJzIHZpYSBkZXN0cm95TGlzdGVuZXIoKVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGluZGV4T2ZDdXN0b21MaXN0ZW5lcjogZnVuY3Rpb24gKGV2ZW50LCBsaXN0ZW5lcikge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmN1c3RvbUV2ZW50c1tldmVudF0gfHwgIXRoaXMuY3VzdG9tRXZlbnRzW2V2ZW50XS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmN1c3RvbUV2ZW50c1tldmVudF0uaW5kZXhPZihsaXN0ZW5lcik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGV0YWNoQWxsQ3VzdG9tRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmN1c3RvbUV2ZW50cyA9IHt9O1xuICAgICAgICAgICAgLy8gVE9ETzogU2hvdWxkIGRldGFjaCBpbnRlcm5hbCBsaXN0ZW5lcnMgaGVyZSB2aWEgZGVzdHJveUxpc3RlbmVyKClcbiAgICAgICAgfSxcblxuICAgICAgICB0cmlnZ2VyQ3VzdG9tRXZlbnQ6IGZ1bmN0aW9uIChuYW1lLCBkYXRhLCBlZGl0YWJsZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuY3VzdG9tRXZlbnRzW25hbWVdICYmICF0aGlzLmRpc2FibGVkRXZlbnRzW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXN0b21FdmVudHNbbmFtZV0uZm9yRWFjaChmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXIoZGF0YSwgZWRpdGFibGUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIENsZWFuaW5nIHVwXG5cbiAgICAgICAgZGVzdHJveTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5kZXRhY2hBbGxET01FdmVudHMoKTtcbiAgICAgICAgICAgIHRoaXMuZGV0YWNoQWxsQ3VzdG9tRXZlbnRzKCk7XG4gICAgICAgICAgICB0aGlzLmRldGFjaEV4ZWNDb21tYW5kKCk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmJhc2UuZWxlbWVudHMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmJhc2UuZWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnJlbW92ZUF0dHJpYnV0ZSgnZGF0YS1tZWRpdW0tZm9jdXNlZCcpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIExpc3RlbmluZyB0byBjYWxscyB0byBkb2N1bWVudC5leGVjQ29tbWFuZFxuXG4gICAgICAgIC8vIEF0dGFjaCBhIGxpc3RlbmVyIHRvIGJlIG5vdGlmaWVkIHdoZW4gZG9jdW1lbnQuZXhlY0NvbW1hbmQgaXMgY2FsbGVkXG4gICAgICAgIGF0dGFjaFRvRXhlY0NvbW1hbmQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmV4ZWNDb21tYW5kTGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFN0b3JlIGFuIGluc3RhbmNlIG9mIHRoZSBsaXN0ZW5lciBzbzpcbiAgICAgICAgICAgIC8vIDEpIFdlIG9ubHkgYXR0YWNoIHRvIGV4ZWNDb21tYW5kIG9uY2VcbiAgICAgICAgICAgIC8vIDIpIFdlIGNhbiByZW1vdmUgdGhlIGxpc3RlbmVyIGxhdGVyXG4gICAgICAgICAgICB0aGlzLmV4ZWNDb21tYW5kTGlzdGVuZXIgPSBmdW5jdGlvbiAoZXhlY0luZm8pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZURvY3VtZW50RXhlY0NvbW1hbmQoZXhlY0luZm8pO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpO1xuXG4gICAgICAgICAgICAvLyBFbnN1cmUgdGhhdCBleGVjQ29tbWFuZCBoYXMgYmVlbiB3cmFwcGVkIGNvcnJlY3RseVxuICAgICAgICAgICAgdGhpcy53cmFwRXhlY0NvbW1hbmQoKTtcblxuICAgICAgICAgICAgLy8gQWRkIGxpc3RlbmVyIHRvIGxpc3Qgb2YgZXhlY0NvbW1hbmQgbGlzdGVuZXJzXG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMub3duZXJEb2N1bWVudC5leGVjQ29tbWFuZC5saXN0ZW5lcnMucHVzaCh0aGlzLmV4ZWNDb21tYW5kTGlzdGVuZXIpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIFJlbW92ZSBvdXIgbGlzdGVuZXIgZm9yIGNhbGxzIHRvIGRvY3VtZW50LmV4ZWNDb21tYW5kXG4gICAgICAgIGRldGFjaEV4ZWNDb21tYW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZG9jID0gdGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQ7XG4gICAgICAgICAgICBpZiAoIXRoaXMuZXhlY0NvbW1hbmRMaXN0ZW5lciB8fCAhZG9jLmV4ZWNDb21tYW5kLmxpc3RlbmVycykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRmluZCB0aGUgaW5kZXggb2YgdGhpcyBsaXN0ZW5lciBpbiB0aGUgYXJyYXkgb2YgbGlzdGVuZXJzIHNvIGl0IGNhbiBiZSByZW1vdmVkXG4gICAgICAgICAgICB2YXIgaW5kZXggPSBkb2MuZXhlY0NvbW1hbmQubGlzdGVuZXJzLmluZGV4T2YodGhpcy5leGVjQ29tbWFuZExpc3RlbmVyKTtcbiAgICAgICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBkb2MuZXhlY0NvbW1hbmQubGlzdGVuZXJzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElmIHRoZSBsaXN0IG9mIGxpc3RlbmVycyBpcyBub3cgZW1wdHksIHB1dCBleGVjQ29tbWFuZCBiYWNrIHRvIGl0cyBvcmlnaW5hbCBzdGF0ZVxuICAgICAgICAgICAgaWYgKCFkb2MuZXhlY0NvbW1hbmQubGlzdGVuZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMudW53cmFwRXhlY0NvbW1hbmQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvLyBXcmFwIGRvY3VtZW50LmV4ZWNDb21tYW5kIGluIGEgY3VzdG9tIG1ldGhvZCBzbyB3ZSBjYW4gbGlzdGVuIHRvIGNhbGxzIHRvIGl0XG4gICAgICAgIHdyYXBFeGVjQ29tbWFuZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGRvYyA9IHRoaXMub3B0aW9ucy5vd25lckRvY3VtZW50O1xuXG4gICAgICAgICAgICAvLyBFbnN1cmUgYWxsIGluc3RhbmNlIG9mIE1lZGl1bUVkaXRvciBvbmx5IHdyYXAgZXhlY0NvbW1hbmQgb25jZVxuICAgICAgICAgICAgaWYgKGRvYy5leGVjQ29tbWFuZC5saXN0ZW5lcnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEhlbHBlciBtZXRob2QgdG8gY2FsbCBhbGwgbGlzdGVuZXJzIHRvIGV4ZWNDb21tYW5kXG4gICAgICAgICAgICB2YXIgY2FsbExpc3RlbmVycyA9IGZ1bmN0aW9uIChhcmdzLCByZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZG9jLmV4ZWNDb21tYW5kLmxpc3RlbmVycykge1xuICAgICAgICAgICAgICAgICAgICBkb2MuZXhlY0NvbW1hbmQubGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24gKGxpc3RlbmVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lcih7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tbWFuZDogYXJnc1swXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogYXJnc1syXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdzOiBhcmdzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDogcmVzdWx0XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBhIHdyYXBwZXIgbWV0aG9kIGZvciBleGVjQ29tbWFuZCB3aGljaCB3aWxsOlxuICAgICAgICAgICAgICAgIC8vIDEpIENhbGwgZG9jdW1lbnQuZXhlY0NvbW1hbmQgd2l0aCB0aGUgY29ycmVjdCBhcmd1bWVudHNcbiAgICAgICAgICAgICAgICAvLyAyKSBMb29wIHRocm91Z2ggYW55IGxpc3RlbmVycyBhbmQgbm90aWZ5IHRoZW0gdGhhdCBleGVjQ29tbWFuZCB3YXMgY2FsbGVkXG4gICAgICAgICAgICAgICAgLy8gICAgcGFzc2luZyBleHRyYSBpbmZvIG9uIHRoZSBjYWxsXG4gICAgICAgICAgICAgICAgLy8gMykgUmV0dXJuIHRoZSByZXN1bHRcbiAgICAgICAgICAgICAgICB3cmFwcGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gZG9jLmV4ZWNDb21tYW5kLm9yaWcuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoIWRvYy5leGVjQ29tbWFuZC5saXN0ZW5lcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxMaXN0ZW5lcnMoYXJncywgcmVzdWx0KTtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIFN0b3JlIGEgcmVmZXJlbmNlIHRvIHRoZSBvcmlnaW5hbCBleGVjQ29tbWFuZFxuICAgICAgICAgICAgd3JhcHBlci5vcmlnID0gZG9jLmV4ZWNDb21tYW5kO1xuXG4gICAgICAgICAgICAvLyBBdHRhY2ggYW4gYXJyYXkgZm9yIHN0b3JpbmcgbGlzdGVuZXJzXG4gICAgICAgICAgICB3cmFwcGVyLmxpc3RlbmVycyA9IFtdO1xuXG4gICAgICAgICAgICAvLyBIZWxwZXIgZm9yIG5vdGlmeWluZyBsaXN0ZW5lcnNcbiAgICAgICAgICAgIHdyYXBwZXIuY2FsbExpc3RlbmVycyA9IGNhbGxMaXN0ZW5lcnM7XG5cbiAgICAgICAgICAgIC8vIE92ZXJ3cml0ZSBleGVjQ29tbWFuZFxuICAgICAgICAgICAgZG9jLmV4ZWNDb21tYW5kID0gd3JhcHBlcjtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBSZXZlcnQgZG9jdW1lbnQuZXhlY0NvbW1hbmQgYmFjayB0byBpdHMgb3JpZ2luYWwgc2VsZlxuICAgICAgICB1bndyYXBFeGVjQ29tbWFuZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGRvYyA9IHRoaXMub3B0aW9ucy5vd25lckRvY3VtZW50O1xuICAgICAgICAgICAgaWYgKCFkb2MuZXhlY0NvbW1hbmQub3JpZykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXNlIHRoZSByZWZlcmVuY2UgdG8gdGhlIG9yaWdpbmFsIGV4ZWNDb21tYW5kIHRvIHJldmVydCBiYWNrXG4gICAgICAgICAgICBkb2MuZXhlY0NvbW1hbmQgPSBkb2MuZXhlY0NvbW1hbmQub3JpZztcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBMaXN0ZW5pbmcgdG8gYnJvd3NlciBldmVudHMgdG8gZW1pdCBldmVudHMgbWVkaXVtLWVkaXRvciBjYXJlcyBhYm91dFxuICAgICAgICBzZXR1cExpc3RlbmVyOiBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMubGlzdGVuZXJzW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzd2l0Y2ggKG5hbWUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdleHRlcm5hbEludGVyYWN0aW9uJzpcbiAgICAgICAgICAgICAgICAgICAgLy8gRGV0ZWN0aW5nIHdoZW4gdXNlciBoYXMgaW50ZXJhY3RlZCB3aXRoIGVsZW1lbnRzIG91dHNpZGUgb2YgTWVkaXVtRWRpdG9yXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNoRE9NRXZlbnQodGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQuYm9keSwgJ21vdXNlZG93bicsIHRoaXMuaGFuZGxlQm9keU1vdXNlZG93bi5iaW5kKHRoaXMpLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hdHRhY2hET01FdmVudCh0aGlzLm9wdGlvbnMub3duZXJEb2N1bWVudC5ib2R5LCAnY2xpY2snLCB0aGlzLmhhbmRsZUJvZHlDbGljay5iaW5kKHRoaXMpLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hdHRhY2hET01FdmVudCh0aGlzLm9wdGlvbnMub3duZXJEb2N1bWVudC5ib2R5LCAnZm9jdXMnLCB0aGlzLmhhbmRsZUJvZHlGb2N1cy5iaW5kKHRoaXMpLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnYmx1cic6XG4gICAgICAgICAgICAgICAgICAgIC8vIERldGVjdGluZyB3aGVuIGZvY3VzIGlzIGxvc3RcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR1cExpc3RlbmVyKCdleHRlcm5hbEludGVyYWN0aW9uJyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2ZvY3VzJzpcbiAgICAgICAgICAgICAgICAgICAgLy8gRGV0ZWN0aW5nIHdoZW4gZm9jdXMgbW92ZXMgaW50byBzb21lIHBhcnQgb2YgTWVkaXVtRWRpdG9yXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dXBMaXN0ZW5lcignZXh0ZXJuYWxJbnRlcmFjdGlvbicpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdlZGl0YWJsZUlucHV0JzpcbiAgICAgICAgICAgICAgICAgICAgLy8gc2V0dXAgY2FjaGUgZm9yIGtub3dpbmcgd2hlbiB0aGUgY29udGVudCBoYXMgY2hhbmdlZFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbnRlbnRDYWNoZSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmJhc2UuZWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb250ZW50Q2FjaGVbZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ21lZGl1bS1lZGl0b3ItaW5kZXgnKV0gPSBlbGVtZW50LmlubmVySFRNTDtcbiAgICAgICAgICAgICAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQXR0YWNoIHRvIHRoZSAnb25pbnB1dCcgZXZlbnQsIGhhbmRsZWQgY29ycmVjdGx5IGJ5IG1vc3QgYnJvd3NlcnNcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuSW5wdXRFdmVudE9uQ29udGVudGVkaXRhYmxlU3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmF0dGFjaFRvRWFjaEVsZW1lbnQoJ2lucHV0JywgdGhpcy5oYW5kbGVJbnB1dCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBGb3IgYnJvd3NlcnMgd2hpY2ggZG9uJ3Qgc3VwcG9ydCB0aGUgaW5wdXQgZXZlbnQgb24gY29udGVudGVkaXRhYmxlIChJRSlcbiAgICAgICAgICAgICAgICAgICAgLy8gd2UnbGwgYXR0YWNoIHRvICdzZWxlY3Rpb25jaGFuZ2UnIG9uIHRoZSBkb2N1bWVudCBhbmQgJ2tleXByZXNzJyBvbiB0aGUgZWRpdGFibGVzXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5JbnB1dEV2ZW50T25Db250ZW50ZWRpdGFibGVTdXBwb3J0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dXBMaXN0ZW5lcignZWRpdGFibGVLZXlwcmVzcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5rZXlwcmVzc1VwZGF0ZUlucHV0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNoRE9NRXZlbnQoZG9jdW1lbnQsICdzZWxlY3Rpb25jaGFuZ2UnLCB0aGlzLmhhbmRsZURvY3VtZW50U2VsZWN0aW9uQ2hhbmdlLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTGlzdGVuIHRvIGNhbGxzIHRvIGV4ZWNDb21tYW5kXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmF0dGFjaFRvRXhlY0NvbW1hbmQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdlZGl0YWJsZUNsaWNrJzpcbiAgICAgICAgICAgICAgICAgICAgLy8gRGV0ZWN0aW5nIGNsaWNrIGluIHRoZSBjb250ZW50ZWRpdGFibGVzXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNoVG9FYWNoRWxlbWVudCgnY2xpY2snLCB0aGlzLmhhbmRsZUNsaWNrKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnZWRpdGFibGVCbHVyJzpcbiAgICAgICAgICAgICAgICAgICAgLy8gRGV0ZWN0aW5nIGJsdXIgaW4gdGhlIGNvbnRlbnRlZGl0YWJsZXNcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hdHRhY2hUb0VhY2hFbGVtZW50KCdibHVyJywgdGhpcy5oYW5kbGVCbHVyKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnZWRpdGFibGVLZXlwcmVzcyc6XG4gICAgICAgICAgICAgICAgICAgIC8vIERldGVjdGluZyBrZXlwcmVzcyBpbiB0aGUgY29udGVudGVkaXRhYmxlc1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmF0dGFjaFRvRWFjaEVsZW1lbnQoJ2tleXByZXNzJywgdGhpcy5oYW5kbGVLZXlwcmVzcyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2VkaXRhYmxlS2V5dXAnOlxuICAgICAgICAgICAgICAgICAgICAvLyBEZXRlY3Rpbmcga2V5dXAgaW4gdGhlIGNvbnRlbnRlZGl0YWJsZXNcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hdHRhY2hUb0VhY2hFbGVtZW50KCdrZXl1cCcsIHRoaXMuaGFuZGxlS2V5dXApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdlZGl0YWJsZUtleWRvd24nOlxuICAgICAgICAgICAgICAgICAgICAvLyBEZXRlY3Rpbmcga2V5ZG93biBvbiB0aGUgY29udGVudGVkaXRhYmxlc1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmF0dGFjaFRvRWFjaEVsZW1lbnQoJ2tleWRvd24nLCB0aGlzLmhhbmRsZUtleWRvd24pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdlZGl0YWJsZUtleWRvd25TcGFjZSc6XG4gICAgICAgICAgICAgICAgICAgIC8vIERldGVjdGluZyBrZXlkb3duIGZvciBTUEFDRSBvbiB0aGUgY29udGVudGVkaXRhYmxlc1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHVwTGlzdGVuZXIoJ2VkaXRhYmxlS2V5ZG93bicpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdlZGl0YWJsZUtleWRvd25FbnRlcic6XG4gICAgICAgICAgICAgICAgICAgIC8vIERldGVjdGluZyBrZXlkb3duIGZvciBFTlRFUiBvbiB0aGUgY29udGVudGVkaXRhYmxlc1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHVwTGlzdGVuZXIoJ2VkaXRhYmxlS2V5ZG93bicpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdlZGl0YWJsZUtleWRvd25UYWInOlxuICAgICAgICAgICAgICAgICAgICAvLyBEZXRlY3Rpbmcga2V5ZG93biBmb3IgVEFCIG9uIHRoZSBjb250ZW50ZWRpdGFibGVcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR1cExpc3RlbmVyKCdlZGl0YWJsZUtleWRvd24nKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnZWRpdGFibGVLZXlkb3duRGVsZXRlJzpcbiAgICAgICAgICAgICAgICAgICAgLy8gRGV0ZWN0aW5nIGtleWRvd24gZm9yIERFTEVURS9CQUNLU1BBQ0Ugb24gdGhlIGNvbnRlbnRlZGl0YWJsZXNcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR1cExpc3RlbmVyKCdlZGl0YWJsZUtleWRvd24nKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnZWRpdGFibGVNb3VzZW92ZXInOlxuICAgICAgICAgICAgICAgICAgICAvLyBEZXRlY3RpbmcgbW91c2VvdmVyIG9uIHRoZSBjb250ZW50ZWRpdGFibGVzXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNoVG9FYWNoRWxlbWVudCgnbW91c2VvdmVyJywgdGhpcy5oYW5kbGVNb3VzZW92ZXIpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdlZGl0YWJsZURyYWcnOlxuICAgICAgICAgICAgICAgICAgICAvLyBEZXRlY3RpbmcgZHJhZ292ZXIgYW5kIGRyYWdsZWF2ZSBvbiB0aGUgY29udGVudGVkaXRhYmxlc1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmF0dGFjaFRvRWFjaEVsZW1lbnQoJ2RyYWdvdmVyJywgdGhpcy5oYW5kbGVEcmFnZ2luZyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNoVG9FYWNoRWxlbWVudCgnZHJhZ2xlYXZlJywgdGhpcy5oYW5kbGVEcmFnZ2luZyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2VkaXRhYmxlRHJvcCc6XG4gICAgICAgICAgICAgICAgICAgIC8vIERldGVjdGluZyBkcm9wIG9uIHRoZSBjb250ZW50ZWRpdGFibGVzXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNoVG9FYWNoRWxlbWVudCgnZHJvcCcsIHRoaXMuaGFuZGxlRHJvcCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIC8vIFRPRE86IFdlIG5lZWQgdG8gaGF2ZSBhIGN1c3RvbSAncGFzdGUnIGV2ZW50IHNlcGFyYXRlIGZyb20gJ2VkaXRhYmxlUGFzdGUnXG4gICAgICAgICAgICAgICAgLy8gTmVlZCB0byB0aGluayBhYm91dCB0aGUgd2F5IHRvIGludHJvZHVjZSB0aGlzIHdpdGhvdXQgYnJlYWtpbmcgZm9sa3NcbiAgICAgICAgICAgICAgICBjYXNlICdlZGl0YWJsZVBhc3RlJzpcbiAgICAgICAgICAgICAgICAgICAgLy8gRGV0ZWN0aW5nIHBhc3RlIG9uIHRoZSBjb250ZW50ZWRpdGFibGVzXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNoVG9FYWNoRWxlbWVudCgncGFzdGUnLCB0aGlzLmhhbmRsZVBhc3RlKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmxpc3RlbmVyc1tuYW1lXSA9IHRydWU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYXR0YWNoVG9FYWNoRWxlbWVudDogZnVuY3Rpb24gKG5hbWUsIGhhbmRsZXIpIHtcbiAgICAgICAgICAgIC8vIGJ1aWxkIG91ciBpbnRlcm5hbCBjYWNoZSB0byBrbm93IHdoaWNoIGVsZW1lbnQgZ290IGFscmVhZHkgd2hhdCBoYW5kbGVyIGF0dGFjaGVkXG4gICAgICAgICAgICBpZiAoIXRoaXMuZXZlbnRzQ2FjaGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmV2ZW50c0NhY2hlID0gW107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuYmFzZS5lbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hdHRhY2hET01FdmVudChlbGVtZW50LCBuYW1lLCBoYW5kbGVyLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgICAgIHRoaXMuZXZlbnRzQ2FjaGUucHVzaCh7ICduYW1lJzogbmFtZSwgJ2hhbmRsZXInOiBoYW5kbGVyIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNsZWFudXBFbGVtZW50OiBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ21lZGl1bS1lZGl0b3ItaW5kZXgnKTtcbiAgICAgICAgICAgIGlmIChpbmRleCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZGV0YWNoQWxsRXZlbnRzRnJvbUVsZW1lbnQoZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29udGVudENhY2hlKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmNvbnRlbnRDYWNoZVtpbmRleF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGZvY3VzRWxlbWVudDogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIGVsZW1lbnQuZm9jdXMoKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlRm9jdXMoZWxlbWVudCwgeyB0YXJnZXQ6IGVsZW1lbnQsIHR5cGU6ICdmb2N1cycgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdXBkYXRlRm9jdXM6IGZ1bmN0aW9uICh0YXJnZXQsIGV2ZW50T2JqKSB7XG4gICAgICAgICAgICB2YXIgaGFkRm9jdXMgPSB0aGlzLmJhc2UuZ2V0Rm9jdXNlZEVsZW1lbnQoKSxcbiAgICAgICAgICAgICAgICB0b0ZvY3VzO1xuXG4gICAgICAgICAgICAvLyBGb3IgY2xpY2tzLCB3ZSBuZWVkIHRvIGtub3cgaWYgdGhlIG1vdXNlZG93biB0aGF0IGNhdXNlZCB0aGUgY2xpY2sgaGFwcGVuZWQgaW5zaWRlIHRoZSBleGlzdGluZyBmb2N1c2VkIGVsZW1lbnRcbiAgICAgICAgICAgIC8vIG9yIG9uZSBvZiB0aGUgZXh0ZW5zaW9uIGVsZW1lbnRzLiAgSWYgc28sIHdlIGRvbid0IHdhbnQgdG8gZm9jdXMgYW5vdGhlciBlbGVtZW50XG4gICAgICAgICAgICBpZiAoaGFkRm9jdXMgJiZcbiAgICAgICAgICAgICAgICBldmVudE9iai50eXBlID09PSAnY2xpY2snICYmXG4gICAgICAgICAgICAgICAgdGhpcy5sYXN0TW91c2Vkb3duVGFyZ2V0ICYmXG4gICAgICAgICAgICAgICAgKE1lZGl1bUVkaXRvci51dGlsLmlzRGVzY2VuZGFudChoYWRGb2N1cywgdGhpcy5sYXN0TW91c2Vkb3duVGFyZ2V0LCB0cnVlKSB8fFxuICAgICAgICAgICAgICAgICAgICBpc0VsZW1lbnREZXNjZW5kYW50T2ZFeHRlbnNpb24odGhpcy5iYXNlLmV4dGVuc2lvbnMsIHRoaXMubGFzdE1vdXNlZG93blRhcmdldCkpKSB7XG4gICAgICAgICAgICAgICAgdG9Gb2N1cyA9IGhhZEZvY3VzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIXRvRm9jdXMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmJhc2UuZWxlbWVudHMuc29tZShmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgdGFyZ2V0IGlzIHBhcnQgb2YgYW4gZWRpdG9yIGVsZW1lbnQsIHRoaXMgaXMgdGhlIGVsZW1lbnQgZ2V0dGluZyBmb2N1c1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXRvRm9jdXMgJiYgKE1lZGl1bUVkaXRvci51dGlsLmlzRGVzY2VuZGFudChlbGVtZW50LCB0YXJnZXQsIHRydWUpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdG9Gb2N1cyA9IGVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBiYWlsIGlmIHdlIGZvdW5kIGFuIGVsZW1lbnQgdGhhdCdzIGdldHRpbmcgZm9jdXNcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICEhdG9Gb2N1cztcbiAgICAgICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHRhcmdldCBpcyBleHRlcm5hbCAobm90IHBhcnQgb2YgdGhlIGVkaXRvciwgdG9vbGJhciwgb3IgYW55IG90aGVyIGV4dGVuc2lvbilcbiAgICAgICAgICAgIHZhciBleHRlcm5hbEV2ZW50ID0gIU1lZGl1bUVkaXRvci51dGlsLmlzRGVzY2VuZGFudChoYWRGb2N1cywgdGFyZ2V0LCB0cnVlKSAmJlxuICAgICAgICAgICAgICAgICFpc0VsZW1lbnREZXNjZW5kYW50T2ZFeHRlbnNpb24odGhpcy5iYXNlLmV4dGVuc2lvbnMsIHRhcmdldCk7XG5cbiAgICAgICAgICAgIGlmICh0b0ZvY3VzICE9PSBoYWRGb2N1cykge1xuICAgICAgICAgICAgICAgIC8vIElmIGVsZW1lbnQgaGFzIGZvY3VzLCBhbmQgZm9jdXMgaXMgZ29pbmcgb3V0c2lkZSBvZiBlZGl0b3JcbiAgICAgICAgICAgICAgICAvLyBEb24ndCBibHVyIGZvY3VzZWQgZWxlbWVudCBpZiBjbGlja2luZyBvbiBlZGl0b3IsIHRvb2xiYXIsIG9yIGFuY2hvcnByZXZpZXdcbiAgICAgICAgICAgICAgICBpZiAoaGFkRm9jdXMgJiYgZXh0ZXJuYWxFdmVudCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGJsdXIgb24gdGhlIGVkaXRhYmxlIHRoYXQgaGFzIGxvc3QgZm9jdXNcbiAgICAgICAgICAgICAgICAgICAgaGFkRm9jdXMucmVtb3ZlQXR0cmlidXRlKCdkYXRhLW1lZGl1bS1mb2N1c2VkJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlckN1c3RvbUV2ZW50KCdibHVyJywgZXZlbnRPYmosIGhhZEZvY3VzKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBJZiBmb2N1cyBpcyBnb2luZyBpbnRvIGFuIGVkaXRvciBlbGVtZW50XG4gICAgICAgICAgICAgICAgaWYgKHRvRm9jdXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBmb2N1cyBvbiB0aGUgZWRpdGFibGUgdGhhdCBub3cgaGFzIGZvY3VzXG4gICAgICAgICAgICAgICAgICAgIHRvRm9jdXMuc2V0QXR0cmlidXRlKCdkYXRhLW1lZGl1bS1mb2N1c2VkJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlckN1c3RvbUV2ZW50KCdmb2N1cycsIGV2ZW50T2JqLCB0b0ZvY3VzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChleHRlcm5hbEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyQ3VzdG9tRXZlbnQoJ2V4dGVybmFsSW50ZXJhY3Rpb24nLCBldmVudE9iaik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgdXBkYXRlSW5wdXQ6IGZ1bmN0aW9uICh0YXJnZXQsIGV2ZW50T2JqKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuY29udGVudENhY2hlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQW4gZXZlbnQgdHJpZ2dlcmVkIHdoaWNoIHNpZ25pZmllcyB0aGF0IHRoZSB1c2VyIG1heSBoYXZlIGNoYW5nZWQgc29tZXRpbmdcbiAgICAgICAgICAgIC8vIExvb2sgaW4gb3VyIGNhY2hlIG9mIGlucHV0IGZvciB0aGUgY29udGVudGVkaXRhYmxlcyB0byBzZWUgaWYgc29tZXRoaW5nIGNoYW5nZWRcbiAgICAgICAgICAgIHZhciBpbmRleCA9IHRhcmdldC5nZXRBdHRyaWJ1dGUoJ21lZGl1bS1lZGl0b3ItaW5kZXgnKSxcbiAgICAgICAgICAgICAgICBodG1sID0gdGFyZ2V0LmlubmVySFRNTDtcblxuICAgICAgICAgICAgaWYgKGh0bWwgIT09IHRoaXMuY29udGVudENhY2hlW2luZGV4XSkge1xuICAgICAgICAgICAgICAgIC8vIFRoZSBjb250ZW50IGhhcyBjaGFuZ2VkIHNpbmNlIHRoZSBsYXN0IHRpbWUgd2UgY2hlY2tlZCwgZmlyZSB0aGUgZXZlbnRcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXJDdXN0b21FdmVudCgnZWRpdGFibGVJbnB1dCcsIGV2ZW50T2JqLCB0YXJnZXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jb250ZW50Q2FjaGVbaW5kZXhdID0gaHRtbDtcbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVEb2N1bWVudFNlbGVjdGlvbkNoYW5nZTogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAvLyBXaGVuIHNlbGVjdGlvbmNoYW5nZSBmaXJlcywgdGFyZ2V0IGFuZCBjdXJyZW50IHRhcmdldCBhcmUgc2V0XG4gICAgICAgICAgICAvLyB0byBkb2N1bWVudCwgc2luY2UgdGhpcyBpcyB3aGVyZSB0aGUgZXZlbnQgaXMgaGFuZGxlZFxuICAgICAgICAgICAgLy8gSG93ZXZlciwgY3VycmVudFRhcmdldCB3aWxsIGhhdmUgYW4gJ2FjdGl2ZUVsZW1lbnQnIHByb3BlcnR5XG4gICAgICAgICAgICAvLyB3aGljaCB3aWxsIHBvaW50IHRvIHdoYXRldmVyIGVsZW1lbnQgaGFzIGZvY3VzLlxuICAgICAgICAgICAgaWYgKGV2ZW50LmN1cnJlbnRUYXJnZXQgJiYgZXZlbnQuY3VycmVudFRhcmdldC5hY3RpdmVFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgdmFyIGFjdGl2ZUVsZW1lbnQgPSBldmVudC5jdXJyZW50VGFyZ2V0LmFjdGl2ZUVsZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRUYXJnZXQ7XG4gICAgICAgICAgICAgICAgLy8gV2UgY2FuIGxvb2sgYXQgdGhlICdhY3RpdmVFbGVtZW50JyB0byBkZXRlcm1pbmUgaWYgdGhlIHNlbGVjdGlvbmNoYW5nZSBoYXNcbiAgICAgICAgICAgICAgICAvLyBoYXBwZW5lZCB3aXRoaW4gYSBjb250ZW50ZWRpdGFibGUgb3duZWQgYnkgdGhpcyBpbnN0YW5jZSBvZiBNZWRpdW1FZGl0b3JcbiAgICAgICAgICAgICAgICB0aGlzLmJhc2UuZWxlbWVudHMuc29tZShmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoTWVkaXVtRWRpdG9yLnV0aWwuaXNEZXNjZW5kYW50KGVsZW1lbnQsIGFjdGl2ZUVsZW1lbnQsIHRydWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50VGFyZ2V0ID0gZWxlbWVudDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9LCB0aGlzKTtcblxuICAgICAgICAgICAgICAgIC8vIFdlIGtub3cgc2VsZWN0aW9uY2hhbmdlIGZpcmVkIHdpdGhpbiBvbmUgb2Ygb3VyIGNvbnRlbnRlZGl0YWJsZXNcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFRhcmdldCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUlucHV0KGN1cnJlbnRUYXJnZXQsIHsgdGFyZ2V0OiBhY3RpdmVFbGVtZW50LCBjdXJyZW50VGFyZ2V0OiBjdXJyZW50VGFyZ2V0IH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVEb2N1bWVudEV4ZWNDb21tYW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBkb2N1bWVudC5leGVjQ29tbWFuZCBoYXMgYmVlbiBjYWxsZWRcbiAgICAgICAgICAgIC8vIElmIG9uZSBvZiBvdXIgY29udGVudGVkaXRhYmxlcyBjdXJyZW50bHkgaGFzIGZvY3VzLCB3ZSBzaG91bGRcbiAgICAgICAgICAgIC8vIGF0dGVtcHQgdG8gdHJpZ2dlciB0aGUgJ2VkaXRhYmxlSW5wdXQnIGV2ZW50XG4gICAgICAgICAgICB2YXIgdGFyZ2V0ID0gdGhpcy5iYXNlLmdldEZvY3VzZWRFbGVtZW50KCk7XG4gICAgICAgICAgICBpZiAodGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVJbnB1dCh0YXJnZXQsIHsgdGFyZ2V0OiB0YXJnZXQsIGN1cnJlbnRUYXJnZXQ6IHRhcmdldCB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVCb2R5Q2xpY2s6IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVGb2N1cyhldmVudC50YXJnZXQsIGV2ZW50KTtcbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVCb2R5Rm9jdXM6IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVGb2N1cyhldmVudC50YXJnZXQsIGV2ZW50KTtcbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVCb2R5TW91c2Vkb3duOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHRoaXMubGFzdE1vdXNlZG93blRhcmdldCA9IGV2ZW50LnRhcmdldDtcbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVJbnB1dDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUlucHV0KGV2ZW50LmN1cnJlbnRUYXJnZXQsIGV2ZW50KTtcbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVDbGljazogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXJDdXN0b21FdmVudCgnZWRpdGFibGVDbGljaycsIGV2ZW50LCBldmVudC5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVCbHVyOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlckN1c3RvbUV2ZW50KCdlZGl0YWJsZUJsdXInLCBldmVudCwgZXZlbnQuY3VycmVudFRhcmdldCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaGFuZGxlS2V5cHJlc3M6IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyQ3VzdG9tRXZlbnQoJ2VkaXRhYmxlS2V5cHJlc3MnLCBldmVudCwgZXZlbnQuY3VycmVudFRhcmdldCk7XG5cbiAgICAgICAgICAgIC8vIElmIHdlJ3JlIGRvaW5nIG1hbnVhbCBkZXRlY3Rpb24gb2YgdGhlIGVkaXRhYmxlSW5wdXQgZXZlbnQgd2UgbmVlZFxuICAgICAgICAgICAgLy8gdG8gY2hlY2sgZm9yIGlucHV0IGNoYW5nZXMgZHVyaW5nICdrZXlwcmVzcydcbiAgICAgICAgICAgIGlmICh0aGlzLmtleXByZXNzVXBkYXRlSW5wdXQpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnRPYmogPSB7IHRhcmdldDogZXZlbnQudGFyZ2V0LCBjdXJyZW50VGFyZ2V0OiBldmVudC5jdXJyZW50VGFyZ2V0IH07XG5cbiAgICAgICAgICAgICAgICAvLyBJbiBJRSwgd2UgbmVlZCB0byBsZXQgdGhlIHJlc3Qgb2YgdGhlIGV2ZW50IHN0YWNrIGNvbXBsZXRlIGJlZm9yZSB3ZSBkZXRlY3RcbiAgICAgICAgICAgICAgICAvLyBjaGFuZ2VzIHRvIGlucHV0LCBzbyB1c2luZyBzZXRUaW1lb3V0IGhlcmVcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVJbnB1dChldmVudE9iai5jdXJyZW50VGFyZ2V0LCBldmVudE9iaik7XG4gICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpLCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVLZXl1cDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXJDdXN0b21FdmVudCgnZWRpdGFibGVLZXl1cCcsIGV2ZW50LCBldmVudC5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVNb3VzZW92ZXI6IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyQ3VzdG9tRXZlbnQoJ2VkaXRhYmxlTW91c2VvdmVyJywgZXZlbnQsIGV2ZW50LmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGhhbmRsZURyYWdnaW5nOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlckN1c3RvbUV2ZW50KCdlZGl0YWJsZURyYWcnLCBldmVudCwgZXZlbnQuY3VycmVudFRhcmdldCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaGFuZGxlRHJvcDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXJDdXN0b21FdmVudCgnZWRpdGFibGVEcm9wJywgZXZlbnQsIGV2ZW50LmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGhhbmRsZVBhc3RlOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlckN1c3RvbUV2ZW50KCdlZGl0YWJsZVBhc3RlJywgZXZlbnQsIGV2ZW50LmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGhhbmRsZUtleWRvd246IGZ1bmN0aW9uIChldmVudCkge1xuXG4gICAgICAgICAgICB0aGlzLnRyaWdnZXJDdXN0b21FdmVudCgnZWRpdGFibGVLZXlkb3duJywgZXZlbnQsIGV2ZW50LmN1cnJlbnRUYXJnZXQpO1xuXG4gICAgICAgICAgICBpZiAoTWVkaXVtRWRpdG9yLnV0aWwuaXNLZXkoZXZlbnQsIE1lZGl1bUVkaXRvci51dGlsLmtleUNvZGUuU1BBQ0UpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudHJpZ2dlckN1c3RvbUV2ZW50KCdlZGl0YWJsZUtleWRvd25TcGFjZScsIGV2ZW50LCBldmVudC5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKE1lZGl1bUVkaXRvci51dGlsLmlzS2V5KGV2ZW50LCBNZWRpdW1FZGl0b3IudXRpbC5rZXlDb2RlLkVOVEVSKSB8fCAoZXZlbnQuY3RybEtleSAmJiBNZWRpdW1FZGl0b3IudXRpbC5pc0tleShldmVudCwgTWVkaXVtRWRpdG9yLnV0aWwua2V5Q29kZS5NKSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy50cmlnZ2VyQ3VzdG9tRXZlbnQoJ2VkaXRhYmxlS2V5ZG93bkVudGVyJywgZXZlbnQsIGV2ZW50LmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoTWVkaXVtRWRpdG9yLnV0aWwuaXNLZXkoZXZlbnQsIE1lZGl1bUVkaXRvci51dGlsLmtleUNvZGUuVEFCKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnRyaWdnZXJDdXN0b21FdmVudCgnZWRpdGFibGVLZXlkb3duVGFiJywgZXZlbnQsIGV2ZW50LmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoTWVkaXVtRWRpdG9yLnV0aWwuaXNLZXkoZXZlbnQsIFtNZWRpdW1FZGl0b3IudXRpbC5rZXlDb2RlLkRFTEVURSwgTWVkaXVtRWRpdG9yLnV0aWwua2V5Q29kZS5CQUNLU1BBQ0VdKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnRyaWdnZXJDdXN0b21FdmVudCgnZWRpdGFibGVLZXlkb3duRGVsZXRlJywgZXZlbnQsIGV2ZW50LmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIE1lZGl1bUVkaXRvci5FdmVudHMgPSBFdmVudHM7XG59KCkpO1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBCdXR0b24gPSBNZWRpdW1FZGl0b3IuRXh0ZW5zaW9uLmV4dGVuZCh7XG5cbiAgICAgICAgLyogQnV0dG9uIE9wdGlvbnMgKi9cblxuICAgICAgICAvKiBhY3Rpb246IFtzdHJpbmddXG4gICAgICAgICAqIFRoZSBhY3Rpb24gYXJndW1lbnQgdG8gcGFzcyB0byBNZWRpdW1FZGl0b3IuZXhlY0FjdGlvbigpXG4gICAgICAgICAqIHdoZW4gdGhlIGJ1dHRvbiBpcyBjbGlja2VkXG4gICAgICAgICAqL1xuICAgICAgICBhY3Rpb246IHVuZGVmaW5lZCxcblxuICAgICAgICAvKiBhcmlhOiBbc3RyaW5nXVxuICAgICAgICAgKiBUaGUgdmFsdWUgdG8gYWRkIGFzIHRoZSBhcmlhLWxhYmVsIGF0dHJpYnV0ZSBvZiB0aGUgYnV0dG9uXG4gICAgICAgICAqIGVsZW1lbnQgZGlzcGxheWVkIGluIHRoZSB0b29sYmFyLlxuICAgICAgICAgKiBUaGlzIGlzIGFsc28gdXNlZCBhcyB0aGUgdG9vbHRpcCBmb3IgdGhlIGJ1dHRvblxuICAgICAgICAgKi9cbiAgICAgICAgYXJpYTogdW5kZWZpbmVkLFxuXG4gICAgICAgIC8qIHRhZ05hbWVzOiBbQXJyYXldXG4gICAgICAgICAqIE5PVEU6IFRoaXMgaXMgbm90IHVzZWQgaWYgdXNlUXVlcnlTdGF0ZSBpcyBzZXQgdG8gdHJ1ZS5cbiAgICAgICAgICpcbiAgICAgICAgICogQXJyYXkgb2YgZWxlbWVudCB0YWcgbmFtZXMgdGhhdCB3b3VsZCBpbmRpY2F0ZSB0aGF0IHRoaXNcbiAgICAgICAgICogYnV0dG9uIGhhcyBhbHJlYWR5IGJlZW4gYXBwbGllZC4gSWYgdGhpcyBhY3Rpb24gaGFzIGFscmVhZHlcbiAgICAgICAgICogYmVlbiBhcHBsaWVkLCB0aGUgYnV0dG9uIHdpbGwgYmUgZGlzcGxheWVkIGFzICdhY3RpdmUnIGluIHRoZSB0b29sYmFyXG4gICAgICAgICAqXG4gICAgICAgICAqIEV4YW1wbGU6XG4gICAgICAgICAqIEZvciAnYm9sZCcsIGlmIHRoZSB0ZXh0IGlzIGV2ZXIgd2l0aGluIGEgPGI+IG9yIDxzdHJvbmc+XG4gICAgICAgICAqIHRhZyB0aGF0IGluZGljYXRlcyB0aGUgdGV4dCBpcyBhbHJlYWR5IGJvbGQuIFNvIHRoZSBhcnJheVxuICAgICAgICAgKiBvZiB0YWdOYW1lcyBmb3IgYm9sZCB3b3VsZCBiZTogWydiJywgJ3N0cm9uZyddXG4gICAgICAgICAqL1xuICAgICAgICB0YWdOYW1lczogdW5kZWZpbmVkLFxuXG4gICAgICAgIC8qIHN0eWxlOiBbT2JqZWN0XVxuICAgICAgICAgKiBOT1RFOiBUaGlzIGlzIG5vdCB1c2VkIGlmIHVzZVF1ZXJ5U3RhdGUgaXMgc2V0IHRvIHRydWUuXG4gICAgICAgICAqXG4gICAgICAgICAqIEEgcGFpciBvZiBjc3MgcHJvcGVydHkgJiB2YWx1ZShzKSB0aGF0IGluZGljYXRlIHRoYXQgdGhpc1xuICAgICAgICAgKiBidXR0b24gaGFzIGFscmVhZHkgYmVlbiBhcHBsaWVkLiBJZiB0aGlzIGFjdGlvbiBoYXMgYWxyZWFkeVxuICAgICAgICAgKiBiZWVuIGFwcGxpZWQsIHRoZSBidXR0b24gd2lsbCBiZSBkaXNwbGF5ZWQgYXMgJ2FjdGl2ZScgaW4gdGhlIHRvb2xiYXJcbiAgICAgICAgICogUHJvcGVydGllcyBvZiB0aGUgb2JqZWN0OlxuICAgICAgICAgKiAgIHByb3AgW1N0cmluZ106IG5hbWUgb2YgdGhlIGNzcyBwcm9wZXJ0eVxuICAgICAgICAgKiAgIHZhbHVlIFtTdHJpbmddOiB2YWx1ZShzKSBvZiB0aGUgY3NzIHByb3BlcnR5XG4gICAgICAgICAqICAgICAgICAgICAgICAgICAgIG11bHRpcGxlIHZhbHVlcyBjYW4gYmUgc2VwYXJhdGVkIGJ5IGEgJ3wnXG4gICAgICAgICAqXG4gICAgICAgICAqIEV4YW1wbGU6XG4gICAgICAgICAqIEZvciAnYm9sZCcsIGlmIHRoZSB0ZXh0IGlzIGV2ZXIgd2l0aGluIGFuIGVsZW1lbnQgd2l0aCBhICdmb250LXdlaWdodCdcbiAgICAgICAgICogc3R5bGUgcHJvcGVydHkgc2V0IHRvICc3MDAnIG9yICdib2xkJywgdGhhdCBpbmRpY2F0ZXMgdGhlIHRleHRcbiAgICAgICAgICogaXMgYWxyZWFkeSBib2xkLiAgU28gdGhlIHN0eWxlIG9iamVjdCBmb3IgYm9sZCB3b3VsZCBiZTpcbiAgICAgICAgICogeyBwcm9wOiAnZm9udC13ZWlnaHQnLCB2YWx1ZTogJzcwMHxib2xkJyB9XG4gICAgICAgICAqL1xuICAgICAgICBzdHlsZTogdW5kZWZpbmVkLFxuXG4gICAgICAgIC8qIHVzZVF1ZXJ5U3RhdGU6IFtib29sZWFuXVxuICAgICAgICAgKiBFbmFibGVzL2Rpc2FibGVzIHdoZXRoZXIgdGhpcyBidXR0b24gc2hvdWxkIHVzZSB0aGUgYnVpbHQtaW5cbiAgICAgICAgICogZG9jdW1lbnQucXVlcnlDb21tYW5kU3RhdGUoKSBtZXRob2QgdG8gZGV0ZXJtaW5lIHdoZXRoZXJcbiAgICAgICAgICogdGhlIGFjdGlvbiBoYXMgYWxyZWFkeSBiZWVuIGFwcGxpZWQuICBJZiB0aGUgYWN0aW9uIGhhcyBhbHJlYWR5XG4gICAgICAgICAqIGJlZW4gYXBwbGllZCwgdGhlIGJ1dHRvbiB3aWxsIGJlIGRpc3BsYXllZCBhcyAnYWN0aXZlJyBpbiB0aGUgdG9vbGJhclxuICAgICAgICAgKlxuICAgICAgICAgKiBFeGFtcGxlOlxuICAgICAgICAgKiBGb3IgJ2JvbGQnLCBpZiB0aGlzIGlzIHNldCB0byB0cnVlLCB0aGUgY29kZSB3aWxsIGNhbGw6XG4gICAgICAgICAqIGRvY3VtZW50LnF1ZXJ5Q29tbWFuZFN0YXRlKCdib2xkJykgd2hpY2ggd2lsbCByZXR1cm4gdHJ1ZSBpZiB0aGVcbiAgICAgICAgICogYnJvd3NlciB0aGlua3MgdGhlIHRleHQgaXMgYWxyZWFkeSBib2xkLCBhbmQgZmFsc2Ugb3RoZXJ3aXNlXG4gICAgICAgICAqL1xuICAgICAgICB1c2VRdWVyeVN0YXRlOiB1bmRlZmluZWQsXG5cbiAgICAgICAgLyogY29udGVudERlZmF1bHQ6IFtzdHJpbmddXG4gICAgICAgICAqIERlZmF1bHQgaW5uZXJIVE1MIHRvIHB1dCBpbnNpZGUgdGhlIGJ1dHRvblxuICAgICAgICAgKi9cbiAgICAgICAgY29udGVudERlZmF1bHQ6IHVuZGVmaW5lZCxcblxuICAgICAgICAvKiBjb250ZW50RkE6IFtzdHJpbmddXG4gICAgICAgICAqIFRoZSBpbm5lckhUTUwgdG8gdXNlIGZvciB0aGUgY29udGVudCBvZiB0aGUgYnV0dG9uXG4gICAgICAgICAqIGlmIHRoZSBgYnV0dG9uTGFiZWxzYCBvcHRpb24gZm9yIE1lZGl1bUVkaXRvciBpcyBzZXQgdG8gJ2ZvbnRhd2Vzb21lJ1xuICAgICAgICAgKi9cbiAgICAgICAgY29udGVudEZBOiB1bmRlZmluZWQsXG5cbiAgICAgICAgLyogY2xhc3NMaXN0OiBbQXJyYXldXG4gICAgICAgICAqIEFuIGFycmF5IG9mIGNsYXNzTmFtZXMgKHN0cmluZ3MpIHRvIGJlIGFkZGVkIHRvIHRoZSBidXR0b25cbiAgICAgICAgICovXG4gICAgICAgIGNsYXNzTGlzdDogdW5kZWZpbmVkLFxuXG4gICAgICAgIC8qIGF0dHJzOiBbb2JqZWN0XVxuICAgICAgICAgKiBBIHNldCBvZiBrZXktdmFsdWUgcGFpcnMgdG8gYWRkIHRvIHRoZSBidXR0b24gYXMgY3VzdG9tIGF0dHJpYnV0ZXNcbiAgICAgICAgICovXG4gICAgICAgIGF0dHJzOiB1bmRlZmluZWQsXG5cbiAgICAgICAgLy8gVGhlIGJ1dHRvbiBjb25zdHJ1Y3RvciBjYW4gb3B0aW9uYWxseSBhY2NlcHQgdGhlIG5hbWUgb2YgYSBidWlsdC1pbiBidXR0b25cbiAgICAgICAgLy8gKGllICdib2xkJywgJ2l0YWxpYycsIGV0Yy4pXG4gICAgICAgIC8vIFdoZW4gdGhlIG5hbWUgb2YgYSBidXR0b24gaXMgcGFzc2VkLCBpdCB3aWxsIGluaXRpYWxpemUgaXRzZWxmIHdpdGggdGhlXG4gICAgICAgIC8vIGNvbmZpZ3VyYXRpb24gZm9yIHRoYXQgYnV0dG9uXG4gICAgICAgIGNvbnN0cnVjdG9yOiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKEJ1dHRvbi5pc0J1aWx0SW5CdXR0b24ob3B0aW9ucykpIHtcbiAgICAgICAgICAgICAgICBNZWRpdW1FZGl0b3IuRXh0ZW5zaW9uLmNhbGwodGhpcywgdGhpcy5kZWZhdWx0c1tvcHRpb25zXSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIE1lZGl1bUVkaXRvci5FeHRlbnNpb24uY2FsbCh0aGlzLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBNZWRpdW1FZGl0b3IuRXh0ZW5zaW9uLnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICAgICAgICAgIHRoaXMuYnV0dG9uID0gdGhpcy5jcmVhdGVCdXR0b24oKTtcbiAgICAgICAgICAgIHRoaXMub24odGhpcy5idXR0b24sICdjbGljaycsIHRoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyogZ2V0QnV0dG9uOiBbZnVuY3Rpb24gKCldXG4gICAgICAgICAqXG4gICAgICAgICAqIElmIGltcGxlbWVudGVkLCB0aGlzIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIHdoZW5cbiAgICAgICAgICogdGhlIHRvb2xiYXIgaXMgYmVpbmcgY3JlYXRlZC4gIFRoZSBET00gRWxlbWVudCByZXR1cm5lZFxuICAgICAgICAgKiBieSB0aGlzIGZ1bmN0aW9uIHdpbGwgYmUgYXBwZW5kZWQgdG8gdGhlIHRvb2xiYXIgYWxvbmdcbiAgICAgICAgICogd2l0aCBhbnkgb3RoZXIgYnV0dG9ucy5cbiAgICAgICAgICovXG4gICAgICAgIGdldEJ1dHRvbjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYnV0dG9uO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldEFjdGlvbjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICh0eXBlb2YgdGhpcy5hY3Rpb24gPT09ICdmdW5jdGlvbicpID8gdGhpcy5hY3Rpb24odGhpcy5iYXNlLm9wdGlvbnMpIDogdGhpcy5hY3Rpb247XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0QXJpYTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICh0eXBlb2YgdGhpcy5hcmlhID09PSAnZnVuY3Rpb24nKSA/IHRoaXMuYXJpYSh0aGlzLmJhc2Uub3B0aW9ucykgOiB0aGlzLmFyaWE7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0VGFnTmFtZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAodHlwZW9mIHRoaXMudGFnTmFtZXMgPT09ICdmdW5jdGlvbicpID8gdGhpcy50YWdOYW1lcyh0aGlzLmJhc2Uub3B0aW9ucykgOiB0aGlzLnRhZ05hbWVzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNyZWF0ZUJ1dHRvbjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGJ1dHRvbiA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyksXG4gICAgICAgICAgICAgICAgY29udGVudCA9IHRoaXMuY29udGVudERlZmF1bHQsXG4gICAgICAgICAgICAgICAgYXJpYUxhYmVsID0gdGhpcy5nZXRBcmlhKCksXG4gICAgICAgICAgICAgICAgYnV0dG9uTGFiZWxzID0gdGhpcy5nZXRFZGl0b3JPcHRpb24oJ2J1dHRvbkxhYmVscycpO1xuICAgICAgICAgICAgLy8gQWRkIGNsYXNzIG5hbWVzXG4gICAgICAgICAgICBidXR0b24uY2xhc3NMaXN0LmFkZCgnbWVkaXVtLWVkaXRvci1hY3Rpb24nKTtcbiAgICAgICAgICAgIGJ1dHRvbi5jbGFzc0xpc3QuYWRkKCdtZWRpdW0tZWRpdG9yLWFjdGlvbi0nICsgdGhpcy5uYW1lKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmNsYXNzTGlzdCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2xhc3NMaXN0LmZvckVhY2goZnVuY3Rpb24gKGNsYXNzTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBidXR0b24uY2xhc3NMaXN0LmFkZChjbGFzc05hbWUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBZGQgYXR0cmlidXRlc1xuICAgICAgICAgICAgYnV0dG9uLnNldEF0dHJpYnV0ZSgnZGF0YS1hY3Rpb24nLCB0aGlzLmdldEFjdGlvbigpKTtcbiAgICAgICAgICAgIGlmIChhcmlhTGFiZWwpIHtcbiAgICAgICAgICAgICAgICBidXR0b24uc2V0QXR0cmlidXRlKCd0aXRsZScsIGFyaWFMYWJlbCk7XG4gICAgICAgICAgICAgICAgYnV0dG9uLnNldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcsIGFyaWFMYWJlbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5hdHRycykge1xuICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKHRoaXMuYXR0cnMpLmZvckVhY2goZnVuY3Rpb24gKGF0dHIpIHtcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9uLnNldEF0dHJpYnV0ZShhdHRyLCB0aGlzLmF0dHJzW2F0dHJdKTtcbiAgICAgICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGJ1dHRvbkxhYmVscyA9PT0gJ2ZvbnRhd2Vzb21lJyAmJiB0aGlzLmNvbnRlbnRGQSkge1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgPSB0aGlzLmNvbnRlbnRGQTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJ1dHRvbi5pbm5lckhUTUwgPSBjb250ZW50O1xuICAgICAgICAgICAgcmV0dXJuIGJ1dHRvbjtcbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVDbGljazogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cbiAgICAgICAgICAgIHZhciBhY3Rpb24gPSB0aGlzLmdldEFjdGlvbigpO1xuXG4gICAgICAgICAgICBpZiAoYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5leGVjQWN0aW9uKGFjdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNBY3RpdmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmJ1dHRvbi5jbGFzc0xpc3QuY29udGFpbnModGhpcy5nZXRFZGl0b3JPcHRpb24oJ2FjdGl2ZUJ1dHRvbkNsYXNzJykpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNldEluYWN0aXZlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmJ1dHRvbi5jbGFzc0xpc3QucmVtb3ZlKHRoaXMuZ2V0RWRpdG9yT3B0aW9uKCdhY3RpdmVCdXR0b25DbGFzcycpKTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmtub3duU3RhdGU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2V0QWN0aXZlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmJ1dHRvbi5jbGFzc0xpc3QuYWRkKHRoaXMuZ2V0RWRpdG9yT3B0aW9uKCdhY3RpdmVCdXR0b25DbGFzcycpKTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmtub3duU3RhdGU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcXVlcnlDb21tYW5kU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBxdWVyeVN0YXRlID0gbnVsbDtcbiAgICAgICAgICAgIGlmICh0aGlzLnVzZVF1ZXJ5U3RhdGUpIHtcbiAgICAgICAgICAgICAgICBxdWVyeVN0YXRlID0gdGhpcy5iYXNlLnF1ZXJ5Q29tbWFuZFN0YXRlKHRoaXMuZ2V0QWN0aW9uKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHF1ZXJ5U3RhdGU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNBbHJlYWR5QXBwbGllZDogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHZhciBpc01hdGNoID0gZmFsc2UsXG4gICAgICAgICAgICAgICAgdGFnTmFtZXMgPSB0aGlzLmdldFRhZ05hbWVzKCksXG4gICAgICAgICAgICAgICAgc3R5bGVWYWxzLFxuICAgICAgICAgICAgICAgIGNvbXB1dGVkU3R5bGU7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmtub3duU3RhdGUgPT09IGZhbHNlIHx8IHRoaXMua25vd25TdGF0ZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmtub3duU3RhdGU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0YWdOYW1lcyAmJiB0YWdOYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaXNNYXRjaCA9IHRhZ05hbWVzLmluZGV4T2Yobm9kZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpKSAhPT0gLTE7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghaXNNYXRjaCAmJiB0aGlzLnN0eWxlKSB7XG4gICAgICAgICAgICAgICAgc3R5bGVWYWxzID0gdGhpcy5zdHlsZS52YWx1ZS5zcGxpdCgnfCcpO1xuICAgICAgICAgICAgICAgIGNvbXB1dGVkU3R5bGUgPSB0aGlzLndpbmRvdy5nZXRDb21wdXRlZFN0eWxlKG5vZGUsIG51bGwpLmdldFByb3BlcnR5VmFsdWUodGhpcy5zdHlsZS5wcm9wKTtcbiAgICAgICAgICAgICAgICBzdHlsZVZhbHMuZm9yRWFjaChmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5rbm93blN0YXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc01hdGNoID0gKGNvbXB1dGVkU3R5bGUuaW5kZXhPZih2YWwpICE9PSAtMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB0ZXh0LWRlY29yYXRpb24gaXMgbm90IGluaGVyaXRlZCBieSBkZWZhdWx0XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzbyBpZiB0aGUgY29tcHV0ZWQgc3R5bGUgZm9yIHRleHQtZGVjb3JhdGlvbiBkb2Vzbid0IG1hdGNoXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBkb24ndCB3cml0ZSB0byBrbm93blN0YXRlIHNvIHdlIGNhbiBmYWxsYmFjayB0byBvdGhlciBjaGVja3NcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc01hdGNoIHx8IHRoaXMuc3R5bGUucHJvcCAhPT0gJ3RleHQtZGVjb3JhdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmtub3duU3RhdGUgPSBpc01hdGNoO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBpc01hdGNoO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBCdXR0b24uaXNCdWlsdEluQnV0dG9uID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgcmV0dXJuICh0eXBlb2YgbmFtZSA9PT0gJ3N0cmluZycpICYmIE1lZGl1bUVkaXRvci5leHRlbnNpb25zLmJ1dHRvbi5wcm90b3R5cGUuZGVmYXVsdHMuaGFzT3duUHJvcGVydHkobmFtZSk7XG4gICAgfTtcblxuICAgIE1lZGl1bUVkaXRvci5leHRlbnNpb25zLmJ1dHRvbiA9IEJ1dHRvbjtcbn0oKSk7XG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLyogTWVkaXVtRWRpdG9yLmV4dGVuc2lvbnMuYnV0dG9uLmRlZmF1bHRzOiBbT2JqZWN0XVxuICAgICAqIFNldCBvZiBkZWZhdWx0IGNvbmZpZyBvcHRpb25zIGZvciBhbGwgb2YgdGhlIGJ1aWx0LWluIE1lZGl1bUVkaXRvciBidXR0b25zXG4gICAgICovXG4gICAgTWVkaXVtRWRpdG9yLmV4dGVuc2lvbnMuYnV0dG9uLnByb3RvdHlwZS5kZWZhdWx0cyA9IHtcbiAgICAgICAgJ2JvbGQnOiB7XG4gICAgICAgICAgICBuYW1lOiAnYm9sZCcsXG4gICAgICAgICAgICBhY3Rpb246ICdib2xkJyxcbiAgICAgICAgICAgIGFyaWE6ICdib2xkJyxcbiAgICAgICAgICAgIHRhZ05hbWVzOiBbJ2InLCAnc3Ryb25nJ10sXG4gICAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgICAgIHByb3A6ICdmb250LXdlaWdodCcsXG4gICAgICAgICAgICAgICAgdmFsdWU6ICc3MDB8Ym9sZCdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1c2VRdWVyeVN0YXRlOiB0cnVlLFxuICAgICAgICAgICAgY29udGVudERlZmF1bHQ6ICc8Yj5CPC9iPicsXG4gICAgICAgICAgICBjb250ZW50RkE6ICc8aSBjbGFzcz1cImZhIGZhLWJvbGRcIj48L2k+J1xuICAgICAgICB9LFxuICAgICAgICAnaXRhbGljJzoge1xuICAgICAgICAgICAgbmFtZTogJ2l0YWxpYycsXG4gICAgICAgICAgICBhY3Rpb246ICdpdGFsaWMnLFxuICAgICAgICAgICAgYXJpYTogJ2l0YWxpYycsXG4gICAgICAgICAgICB0YWdOYW1lczogWydpJywgJ2VtJ10sXG4gICAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgICAgIHByb3A6ICdmb250LXN0eWxlJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogJ2l0YWxpYydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1c2VRdWVyeVN0YXRlOiB0cnVlLFxuICAgICAgICAgICAgY29udGVudERlZmF1bHQ6ICc8Yj48aT5JPC9pPjwvYj4nLFxuICAgICAgICAgICAgY29udGVudEZBOiAnPGkgY2xhc3M9XCJmYSBmYS1pdGFsaWNcIj48L2k+J1xuICAgICAgICB9LFxuICAgICAgICAndW5kZXJsaW5lJzoge1xuICAgICAgICAgICAgbmFtZTogJ3VuZGVybGluZScsXG4gICAgICAgICAgICBhY3Rpb246ICd1bmRlcmxpbmUnLFxuICAgICAgICAgICAgYXJpYTogJ3VuZGVybGluZScsXG4gICAgICAgICAgICB0YWdOYW1lczogWyd1J10sXG4gICAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgICAgIHByb3A6ICd0ZXh0LWRlY29yYXRpb24nLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAndW5kZXJsaW5lJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVzZVF1ZXJ5U3RhdGU6IHRydWUsXG4gICAgICAgICAgICBjb250ZW50RGVmYXVsdDogJzxiPjx1PlU8L3U+PC9iPicsXG4gICAgICAgICAgICBjb250ZW50RkE6ICc8aSBjbGFzcz1cImZhIGZhLXVuZGVybGluZVwiPjwvaT4nXG4gICAgICAgIH0sXG4gICAgICAgICdzdHJpa2V0aHJvdWdoJzoge1xuICAgICAgICAgICAgbmFtZTogJ3N0cmlrZXRocm91Z2gnLFxuICAgICAgICAgICAgYWN0aW9uOiAnc3RyaWtldGhyb3VnaCcsXG4gICAgICAgICAgICBhcmlhOiAnc3RyaWtlIHRocm91Z2gnLFxuICAgICAgICAgICAgdGFnTmFtZXM6IFsnc3RyaWtlJ10sXG4gICAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgICAgIHByb3A6ICd0ZXh0LWRlY29yYXRpb24nLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAnbGluZS10aHJvdWdoJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVzZVF1ZXJ5U3RhdGU6IHRydWUsXG4gICAgICAgICAgICBjb250ZW50RGVmYXVsdDogJzxzPkE8L3M+JyxcbiAgICAgICAgICAgIGNvbnRlbnRGQTogJzxpIGNsYXNzPVwiZmEgZmEtc3RyaWtldGhyb3VnaFwiPjwvaT4nXG4gICAgICAgIH0sXG4gICAgICAgICdzdXBlcnNjcmlwdCc6IHtcbiAgICAgICAgICAgIG5hbWU6ICdzdXBlcnNjcmlwdCcsXG4gICAgICAgICAgICBhY3Rpb246ICdzdXBlcnNjcmlwdCcsXG4gICAgICAgICAgICBhcmlhOiAnc3VwZXJzY3JpcHQnLFxuICAgICAgICAgICAgdGFnTmFtZXM6IFsnc3VwJ10sXG4gICAgICAgICAgICAvKiBmaXJlZm94IGRvZXNuJ3QgYmVoYXZlIHRoZSB3YXkgd2Ugd2FudCBpdCB0bywgc28gd2UgQ0FOJ1QgdXNlIHF1ZXJ5Q29tbWFuZFN0YXRlIGZvciBzdXBlcnNjcmlwdFxuICAgICAgICAgICAgICAgaHR0cHM6Ly9naXRodWIuY29tL2d1YXJkaWFuL3NjcmliZS9ibG9iL21hc3Rlci9CUk9XU0VSSU5DT05TSVNURU5DSUVTLm1kI2RvY3VtZW50cXVlcnljb21tYW5kc3RhdGUgKi9cbiAgICAgICAgICAgIC8vIHVzZVF1ZXJ5U3RhdGU6IHRydWVcbiAgICAgICAgICAgIGNvbnRlbnREZWZhdWx0OiAnPGI+eDxzdXA+MTwvc3VwPjwvYj4nLFxuICAgICAgICAgICAgY29udGVudEZBOiAnPGkgY2xhc3M9XCJmYSBmYS1zdXBlcnNjcmlwdFwiPjwvaT4nXG4gICAgICAgIH0sXG4gICAgICAgICdzdWJzY3JpcHQnOiB7XG4gICAgICAgICAgICBuYW1lOiAnc3Vic2NyaXB0JyxcbiAgICAgICAgICAgIGFjdGlvbjogJ3N1YnNjcmlwdCcsXG4gICAgICAgICAgICBhcmlhOiAnc3Vic2NyaXB0JyxcbiAgICAgICAgICAgIHRhZ05hbWVzOiBbJ3N1YiddLFxuICAgICAgICAgICAgLyogZmlyZWZveCBkb2Vzbid0IGJlaGF2ZSB0aGUgd2F5IHdlIHdhbnQgaXQgdG8sIHNvIHdlIENBTidUIHVzZSBxdWVyeUNvbW1hbmRTdGF0ZSBmb3Igc3Vic2NyaXB0XG4gICAgICAgICAgICAgICBodHRwczovL2dpdGh1Yi5jb20vZ3VhcmRpYW4vc2NyaWJlL2Jsb2IvbWFzdGVyL0JST1dTRVJJTkNPTlNJU1RFTkNJRVMubWQjZG9jdW1lbnRxdWVyeWNvbW1hbmRzdGF0ZSAqL1xuICAgICAgICAgICAgLy8gdXNlUXVlcnlTdGF0ZTogdHJ1ZVxuICAgICAgICAgICAgY29udGVudERlZmF1bHQ6ICc8Yj54PHN1Yj4xPC9zdWI+PC9iPicsXG4gICAgICAgICAgICBjb250ZW50RkE6ICc8aSBjbGFzcz1cImZhIGZhLXN1YnNjcmlwdFwiPjwvaT4nXG4gICAgICAgIH0sXG4gICAgICAgICdpbWFnZSc6IHtcbiAgICAgICAgICAgIG5hbWU6ICdpbWFnZScsXG4gICAgICAgICAgICBhY3Rpb246ICdpbWFnZScsXG4gICAgICAgICAgICBhcmlhOiAnaW1hZ2UnLFxuICAgICAgICAgICAgdGFnTmFtZXM6IFsnaW1nJ10sXG4gICAgICAgICAgICBjb250ZW50RGVmYXVsdDogJzxiPmltYWdlPC9iPicsXG4gICAgICAgICAgICBjb250ZW50RkE6ICc8aSBjbGFzcz1cImZhIGZhLXBpY3R1cmUtb1wiPjwvaT4nXG4gICAgICAgIH0sXG4gICAgICAgICdodG1sJzoge1xuICAgICAgICAgICAgbmFtZTogJ2h0bWwnLFxuICAgICAgICAgICAgYWN0aW9uOiAnaHRtbCcsXG4gICAgICAgICAgICBhcmlhOiAnZXZhbHVhdGUgaHRtbCcsXG4gICAgICAgICAgICB0YWdOYW1lczogWydpZnJhbWUnLCAnb2JqZWN0J10sXG4gICAgICAgICAgICBjb250ZW50RGVmYXVsdDogJzxiPmh0bWw8L2I+JyxcbiAgICAgICAgICAgIGNvbnRlbnRGQTogJzxpIGNsYXNzPVwiZmEgZmEtY29kZVwiPjwvaT4nXG4gICAgICAgIH0sXG4gICAgICAgICdvcmRlcmVkbGlzdCc6IHtcbiAgICAgICAgICAgIG5hbWU6ICdvcmRlcmVkbGlzdCcsXG4gICAgICAgICAgICBhY3Rpb246ICdpbnNlcnRvcmRlcmVkbGlzdCcsXG4gICAgICAgICAgICBhcmlhOiAnb3JkZXJlZCBsaXN0JyxcbiAgICAgICAgICAgIHRhZ05hbWVzOiBbJ29sJ10sXG4gICAgICAgICAgICB1c2VRdWVyeVN0YXRlOiB0cnVlLFxuICAgICAgICAgICAgY29udGVudERlZmF1bHQ6ICc8Yj4xLjwvYj4nLFxuICAgICAgICAgICAgY29udGVudEZBOiAnPGkgY2xhc3M9XCJmYSBmYS1saXN0LW9sXCI+PC9pPidcbiAgICAgICAgfSxcbiAgICAgICAgJ3Vub3JkZXJlZGxpc3QnOiB7XG4gICAgICAgICAgICBuYW1lOiAndW5vcmRlcmVkbGlzdCcsXG4gICAgICAgICAgICBhY3Rpb246ICdpbnNlcnR1bm9yZGVyZWRsaXN0JyxcbiAgICAgICAgICAgIGFyaWE6ICd1bm9yZGVyZWQgbGlzdCcsXG4gICAgICAgICAgICB0YWdOYW1lczogWyd1bCddLFxuICAgICAgICAgICAgdXNlUXVlcnlTdGF0ZTogdHJ1ZSxcbiAgICAgICAgICAgIGNvbnRlbnREZWZhdWx0OiAnPGI+JmJ1bGw7PC9iPicsXG4gICAgICAgICAgICBjb250ZW50RkE6ICc8aSBjbGFzcz1cImZhIGZhLWxpc3QtdWxcIj48L2k+J1xuICAgICAgICB9LFxuICAgICAgICAnaW5kZW50Jzoge1xuICAgICAgICAgICAgbmFtZTogJ2luZGVudCcsXG4gICAgICAgICAgICBhY3Rpb246ICdpbmRlbnQnLFxuICAgICAgICAgICAgYXJpYTogJ2luZGVudCcsXG4gICAgICAgICAgICB0YWdOYW1lczogW10sXG4gICAgICAgICAgICBjb250ZW50RGVmYXVsdDogJzxiPiZyYXJyOzwvYj4nLFxuICAgICAgICAgICAgY29udGVudEZBOiAnPGkgY2xhc3M9XCJmYSBmYS1pbmRlbnRcIj48L2k+J1xuICAgICAgICB9LFxuICAgICAgICAnb3V0ZGVudCc6IHtcbiAgICAgICAgICAgIG5hbWU6ICdvdXRkZW50JyxcbiAgICAgICAgICAgIGFjdGlvbjogJ291dGRlbnQnLFxuICAgICAgICAgICAgYXJpYTogJ291dGRlbnQnLFxuICAgICAgICAgICAgdGFnTmFtZXM6IFtdLFxuICAgICAgICAgICAgY29udGVudERlZmF1bHQ6ICc8Yj4mbGFycjs8L2I+JyxcbiAgICAgICAgICAgIGNvbnRlbnRGQTogJzxpIGNsYXNzPVwiZmEgZmEtb3V0ZGVudFwiPjwvaT4nXG4gICAgICAgIH0sXG4gICAgICAgICdqdXN0aWZ5Q2VudGVyJzoge1xuICAgICAgICAgICAgbmFtZTogJ2p1c3RpZnlDZW50ZXInLFxuICAgICAgICAgICAgYWN0aW9uOiAnanVzdGlmeUNlbnRlcicsXG4gICAgICAgICAgICBhcmlhOiAnY2VudGVyIGp1c3RpZnknLFxuICAgICAgICAgICAgdGFnTmFtZXM6IFtdLFxuICAgICAgICAgICAgc3R5bGU6IHtcbiAgICAgICAgICAgICAgICBwcm9wOiAndGV4dC1hbGlnbicsXG4gICAgICAgICAgICAgICAgdmFsdWU6ICdjZW50ZXInXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29udGVudERlZmF1bHQ6ICc8Yj5DPC9iPicsXG4gICAgICAgICAgICBjb250ZW50RkE6ICc8aSBjbGFzcz1cImZhIGZhLWFsaWduLWNlbnRlclwiPjwvaT4nXG4gICAgICAgIH0sXG4gICAgICAgICdqdXN0aWZ5RnVsbCc6IHtcbiAgICAgICAgICAgIG5hbWU6ICdqdXN0aWZ5RnVsbCcsXG4gICAgICAgICAgICBhY3Rpb246ICdqdXN0aWZ5RnVsbCcsXG4gICAgICAgICAgICBhcmlhOiAnZnVsbCBqdXN0aWZ5JyxcbiAgICAgICAgICAgIHRhZ05hbWVzOiBbXSxcbiAgICAgICAgICAgIHN0eWxlOiB7XG4gICAgICAgICAgICAgICAgcHJvcDogJ3RleHQtYWxpZ24nLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAnanVzdGlmeSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb250ZW50RGVmYXVsdDogJzxiPko8L2I+JyxcbiAgICAgICAgICAgIGNvbnRlbnRGQTogJzxpIGNsYXNzPVwiZmEgZmEtYWxpZ24tanVzdGlmeVwiPjwvaT4nXG4gICAgICAgIH0sXG4gICAgICAgICdqdXN0aWZ5TGVmdCc6IHtcbiAgICAgICAgICAgIG5hbWU6ICdqdXN0aWZ5TGVmdCcsXG4gICAgICAgICAgICBhY3Rpb246ICdqdXN0aWZ5TGVmdCcsXG4gICAgICAgICAgICBhcmlhOiAnbGVmdCBqdXN0aWZ5JyxcbiAgICAgICAgICAgIHRhZ05hbWVzOiBbXSxcbiAgICAgICAgICAgIHN0eWxlOiB7XG4gICAgICAgICAgICAgICAgcHJvcDogJ3RleHQtYWxpZ24nLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAnbGVmdCdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb250ZW50RGVmYXVsdDogJzxiPkw8L2I+JyxcbiAgICAgICAgICAgIGNvbnRlbnRGQTogJzxpIGNsYXNzPVwiZmEgZmEtYWxpZ24tbGVmdFwiPjwvaT4nXG4gICAgICAgIH0sXG4gICAgICAgICdqdXN0aWZ5UmlnaHQnOiB7XG4gICAgICAgICAgICBuYW1lOiAnanVzdGlmeVJpZ2h0JyxcbiAgICAgICAgICAgIGFjdGlvbjogJ2p1c3RpZnlSaWdodCcsXG4gICAgICAgICAgICBhcmlhOiAncmlnaHQganVzdGlmeScsXG4gICAgICAgICAgICB0YWdOYW1lczogW10sXG4gICAgICAgICAgICBzdHlsZToge1xuICAgICAgICAgICAgICAgIHByb3A6ICd0ZXh0LWFsaWduJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogJ3JpZ2h0J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbnRlbnREZWZhdWx0OiAnPGI+UjwvYj4nLFxuICAgICAgICAgICAgY29udGVudEZBOiAnPGkgY2xhc3M9XCJmYSBmYS1hbGlnbi1yaWdodFwiPjwvaT4nXG4gICAgICAgIH0sXG4gICAgICAgIC8vIEtub3duIGlubGluZSBlbGVtZW50cyB0aGF0IGFyZSBub3QgcmVtb3ZlZCwgb3Igbm90IHJlbW92ZWQgY29uc2lzdGFudGx5IGFjcm9zcyBicm93c2VyczpcbiAgICAgICAgLy8gPHNwYW4+LCA8bGFiZWw+LCA8YnI+XG4gICAgICAgICdyZW1vdmVGb3JtYXQnOiB7XG4gICAgICAgICAgICBuYW1lOiAncmVtb3ZlRm9ybWF0JyxcbiAgICAgICAgICAgIGFyaWE6ICdyZW1vdmUgZm9ybWF0dGluZycsXG4gICAgICAgICAgICBhY3Rpb246ICdyZW1vdmVGb3JtYXQnLFxuICAgICAgICAgICAgY29udGVudERlZmF1bHQ6ICc8Yj5YPC9iPicsXG4gICAgICAgICAgICBjb250ZW50RkE6ICc8aSBjbGFzcz1cImZhIGZhLWVyYXNlclwiPjwvaT4nXG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqKioqIEJ1dHRvbnMgZm9yIGFwcGVuZGluZyBibG9jayBlbGVtZW50cyAoYXBwZW5kLTxlbGVtZW50PiBhY3Rpb24pICoqKioqL1xuXG4gICAgICAgICdxdW90ZSc6IHtcbiAgICAgICAgICAgIG5hbWU6ICdxdW90ZScsXG4gICAgICAgICAgICBhY3Rpb246ICdhcHBlbmQtYmxvY2txdW90ZScsXG4gICAgICAgICAgICBhcmlhOiAnYmxvY2txdW90ZScsXG4gICAgICAgICAgICB0YWdOYW1lczogWydibG9ja3F1b3RlJ10sXG4gICAgICAgICAgICBjb250ZW50RGVmYXVsdDogJzxiPiZsZHF1bzs8L2I+JyxcbiAgICAgICAgICAgIGNvbnRlbnRGQTogJzxpIGNsYXNzPVwiZmEgZmEtcXVvdGUtcmlnaHRcIj48L2k+J1xuICAgICAgICB9LFxuICAgICAgICAncHJlJzoge1xuICAgICAgICAgICAgbmFtZTogJ3ByZScsXG4gICAgICAgICAgICBhY3Rpb246ICdhcHBlbmQtcHJlJyxcbiAgICAgICAgICAgIGFyaWE6ICdwcmVmb3JtYXR0ZWQgdGV4dCcsXG4gICAgICAgICAgICB0YWdOYW1lczogWydwcmUnXSxcbiAgICAgICAgICAgIGNvbnRlbnREZWZhdWx0OiAnPGI+MDEwMTwvYj4nLFxuICAgICAgICAgICAgY29udGVudEZBOiAnPGkgY2xhc3M9XCJmYSBmYS1jb2RlIGZhLWxnXCI+PC9pPidcbiAgICAgICAgfSxcbiAgICAgICAgJ2gxJzoge1xuICAgICAgICAgICAgbmFtZTogJ2gxJyxcbiAgICAgICAgICAgIGFjdGlvbjogJ2FwcGVuZC1oMScsXG4gICAgICAgICAgICBhcmlhOiAnaGVhZGVyIHR5cGUgb25lJyxcbiAgICAgICAgICAgIHRhZ05hbWVzOiBbJ2gxJ10sXG4gICAgICAgICAgICBjb250ZW50RGVmYXVsdDogJzxiPkgxPC9iPicsXG4gICAgICAgICAgICBjb250ZW50RkE6ICc8aSBjbGFzcz1cImZhIGZhLWhlYWRlclwiPjxzdXA+MTwvc3VwPidcbiAgICAgICAgfSxcbiAgICAgICAgJ2gyJzoge1xuICAgICAgICAgICAgbmFtZTogJ2gyJyxcbiAgICAgICAgICAgIGFjdGlvbjogJ2FwcGVuZC1oMicsXG4gICAgICAgICAgICBhcmlhOiAnaGVhZGVyIHR5cGUgdHdvJyxcbiAgICAgICAgICAgIHRhZ05hbWVzOiBbJ2gyJ10sXG4gICAgICAgICAgICBjb250ZW50RGVmYXVsdDogJzxiPkgyPC9iPicsXG4gICAgICAgICAgICBjb250ZW50RkE6ICc8aSBjbGFzcz1cImZhIGZhLWhlYWRlclwiPjxzdXA+Mjwvc3VwPidcbiAgICAgICAgfSxcbiAgICAgICAgJ2gzJzoge1xuICAgICAgICAgICAgbmFtZTogJ2gzJyxcbiAgICAgICAgICAgIGFjdGlvbjogJ2FwcGVuZC1oMycsXG4gICAgICAgICAgICBhcmlhOiAnaGVhZGVyIHR5cGUgdGhyZWUnLFxuICAgICAgICAgICAgdGFnTmFtZXM6IFsnaDMnXSxcbiAgICAgICAgICAgIGNvbnRlbnREZWZhdWx0OiAnPGI+SDM8L2I+JyxcbiAgICAgICAgICAgIGNvbnRlbnRGQTogJzxpIGNsYXNzPVwiZmEgZmEtaGVhZGVyXCI+PHN1cD4zPC9zdXA+J1xuICAgICAgICB9LFxuICAgICAgICAnaDQnOiB7XG4gICAgICAgICAgICBuYW1lOiAnaDQnLFxuICAgICAgICAgICAgYWN0aW9uOiAnYXBwZW5kLWg0JyxcbiAgICAgICAgICAgIGFyaWE6ICdoZWFkZXIgdHlwZSBmb3VyJyxcbiAgICAgICAgICAgIHRhZ05hbWVzOiBbJ2g0J10sXG4gICAgICAgICAgICBjb250ZW50RGVmYXVsdDogJzxiPkg0PC9iPicsXG4gICAgICAgICAgICBjb250ZW50RkE6ICc8aSBjbGFzcz1cImZhIGZhLWhlYWRlclwiPjxzdXA+NDwvc3VwPidcbiAgICAgICAgfSxcbiAgICAgICAgJ2g1Jzoge1xuICAgICAgICAgICAgbmFtZTogJ2g1JyxcbiAgICAgICAgICAgIGFjdGlvbjogJ2FwcGVuZC1oNScsXG4gICAgICAgICAgICBhcmlhOiAnaGVhZGVyIHR5cGUgZml2ZScsXG4gICAgICAgICAgICB0YWdOYW1lczogWydoNSddLFxuICAgICAgICAgICAgY29udGVudERlZmF1bHQ6ICc8Yj5INTwvYj4nLFxuICAgICAgICAgICAgY29udGVudEZBOiAnPGkgY2xhc3M9XCJmYSBmYS1oZWFkZXJcIj48c3VwPjU8L3N1cD4nXG4gICAgICAgIH0sXG4gICAgICAgICdoNic6IHtcbiAgICAgICAgICAgIG5hbWU6ICdoNicsXG4gICAgICAgICAgICBhY3Rpb246ICdhcHBlbmQtaDYnLFxuICAgICAgICAgICAgYXJpYTogJ2hlYWRlciB0eXBlIHNpeCcsXG4gICAgICAgICAgICB0YWdOYW1lczogWydoNiddLFxuICAgICAgICAgICAgY29udGVudERlZmF1bHQ6ICc8Yj5INjwvYj4nLFxuICAgICAgICAgICAgY29udGVudEZBOiAnPGkgY2xhc3M9XCJmYSBmYS1oZWFkZXJcIj48c3VwPjY8L3N1cD4nXG4gICAgICAgIH1cbiAgICB9O1xuXG59KSgpO1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8qIEJhc2UgZnVuY3Rpb25hbGl0eSBmb3IgYW4gZXh0ZW5zaW9uIHdoaWNoIHdpbGwgZGlzcGxheVxuICAgICAqIGEgJ2Zvcm0nIGluc2lkZSB0aGUgdG9vbGJhclxuICAgICAqL1xuICAgIHZhciBGb3JtRXh0ZW5zaW9uID0gTWVkaXVtRWRpdG9yLmV4dGVuc2lvbnMuYnV0dG9uLmV4dGVuZCh7XG5cbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgTWVkaXVtRWRpdG9yLmV4dGVuc2lvbnMuYnV0dG9uLnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gZGVmYXVsdCBsYWJlbHMgZm9yIHRoZSBmb3JtIGJ1dHRvbnNcbiAgICAgICAgZm9ybVNhdmVMYWJlbDogJyYjMTAwMDM7JyxcbiAgICAgICAgZm9ybUNsb3NlTGFiZWw6ICcmdGltZXM7JyxcblxuICAgICAgICAvKiBhY3RpdmVDbGFzczogW3N0cmluZ11cbiAgICAgICAgICogc2V0IGNsYXNzIHdoaWNoIGFkZGVkIHRvIHNob3duIGZvcm1cbiAgICAgICAgICovXG4gICAgICAgIGFjdGl2ZUNsYXNzOiAnbWVkaXVtLWVkaXRvci10b29sYmFyLWZvcm0tYWN0aXZlJyxcblxuICAgICAgICAvKiBoYXNGb3JtOiBbYm9vbGVhbl1cbiAgICAgICAgICpcbiAgICAgICAgICogU2V0dGluZyB0aGlzIHRvIHRydWUgd2lsbCBjYXVzZSBnZXRGb3JtKCkgdG8gYmUgY2FsbGVkXG4gICAgICAgICAqIHdoZW4gdGhlIHRvb2xiYXIgaXMgY3JlYXRlZCwgc28gdGhlIGZvcm0gY2FuIGJlIGFwcGVuZGVkXG4gICAgICAgICAqIGluc2lkZSB0aGUgdG9vbGJhciBjb250YWluZXJcbiAgICAgICAgICovXG4gICAgICAgIGhhc0Zvcm06IHRydWUsXG5cbiAgICAgICAgLyogZ2V0Rm9ybTogW2Z1bmN0aW9uICgpXVxuICAgICAgICAgKlxuICAgICAgICAgKiBXaGVuIGhhc0Zvcm0gaXMgdHJ1ZSwgdGhpcyBmdW5jdGlvbiBtdXN0IGJlIGltcGxlbWVudGVkXG4gICAgICAgICAqIGFuZCByZXR1cm4gYSBET00gRWxlbWVudCB3aGljaCB3aWxsIGJlIGFwcGVuZGVkIHRvXG4gICAgICAgICAqIHRoZSB0b29sYmFyIGNvbnRhaW5lci4gVGhlIGZvcm0gc2hvdWxkIHN0YXJ0IGhpZGRlbiwgYW5kXG4gICAgICAgICAqIHRoZSBleHRlbnNpb24gY2FuIGNob29zZSB3aGVuIHRvIGhpZGUvc2hvdyBpdFxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0Rm9ybTogZnVuY3Rpb24gKCkge30sXG5cbiAgICAgICAgLyogaXNEaXNwbGF5ZWQ6IFtmdW5jdGlvbiAoKV1cbiAgICAgICAgICpcbiAgICAgICAgICogVGhpcyBmdW5jdGlvbiBzaG91bGQgcmV0dXJuIHRydWUvZmFsc2UgcmVmbGVjdGluZ1xuICAgICAgICAgKiB3aGV0aGVyIHRoZSBmb3JtIGlzIGN1cnJlbnRseSBkaXNwbGF5ZWRcbiAgICAgICAgICovXG4gICAgICAgIGlzRGlzcGxheWVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5oYXNGb3JtKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0Rm9ybSgpLmNsYXNzTGlzdC5jb250YWlucyh0aGlzLmFjdGl2ZUNsYXNzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKiBoaWRlRm9ybTogW2Z1bmN0aW9uICgpXVxuICAgICAgICAgKlxuICAgICAgICAgKiBUaGlzIGZ1bmN0aW9uIHNob3VsZCBzaG93IHRoZSBmb3JtIGVsZW1lbnQgaW5zaWRlXG4gICAgICAgICAqIHRoZSB0b29sYmFyIGNvbnRhaW5lclxuICAgICAgICAgKi9cbiAgICAgICAgc2hvd0Zvcm06IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmhhc0Zvcm0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmdldEZvcm0oKS5jbGFzc0xpc3QuYWRkKHRoaXMuYWN0aXZlQ2xhc3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qIGhpZGVGb3JtOiBbZnVuY3Rpb24gKCldXG4gICAgICAgICAqXG4gICAgICAgICAqIFRoaXMgZnVuY3Rpb24gc2hvdWxkIGhpZGUgdGhlIGZvcm0gZWxlbWVudCBpbnNpZGVcbiAgICAgICAgICogdGhlIHRvb2xiYXIgY29udGFpbmVyXG4gICAgICAgICAqL1xuICAgICAgICBoaWRlRm9ybTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaGFzRm9ybSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZ2V0Rm9ybSgpLmNsYXNzTGlzdC5yZW1vdmUodGhpcy5hY3RpdmVDbGFzcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqKioqKioqKioqKioqKioqKioqKioqKiBIZWxwZXJzICoqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICAgICAgKiBUaGUgZm9sbG93aW5nIGFyZSBoZWxwZXJzIHRoYXQgYXJlIGVpdGhlciBzZXQgYnkgTWVkaXVtRWRpdG9yXG4gICAgICAgICAqIGR1cmluZyBpbml0aWFsaXphdGlvbiwgb3IgYXJlIGhlbHBlciBtZXRob2RzIHdoaWNoIGVpdGhlclxuICAgICAgICAgKiByb3V0ZSBjYWxscyB0byB0aGUgTWVkaXVtRWRpdG9yIGluc3RhbmNlIG9yIHByb3ZpZGUgY29tbW9uXG4gICAgICAgICAqIGZ1bmN0aW9uYWxpdHkgZm9yIGFsbCBmb3JtIGV4dGVuc2lvbnNcbiAgICAgICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuICAgICAgICAvKiBzaG93VG9vbGJhckRlZmF1bHRBY3Rpb25zOiBbZnVuY3Rpb24gKCldXG4gICAgICAgICAqXG4gICAgICAgICAqIEhlbHBlciBtZXRob2Qgd2hpY2ggd2lsbCB0dXJuIGJhY2sgdGhlIHRvb2xiYXIgYWZ0ZXIgY2FuY2VsaW5nXG4gICAgICAgICAqIHRoZSBjdXN0b21pemVkIGZvcm1cbiAgICAgICAgICovXG4gICAgICAgIHNob3dUb29sYmFyRGVmYXVsdEFjdGlvbnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB0b29sYmFyID0gdGhpcy5iYXNlLmdldEV4dGVuc2lvbkJ5TmFtZSgndG9vbGJhcicpO1xuICAgICAgICAgICAgaWYgKHRvb2xiYXIpIHtcbiAgICAgICAgICAgICAgICB0b29sYmFyLnNob3dUb29sYmFyRGVmYXVsdEFjdGlvbnMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKiBoaWRlVG9vbGJhckRlZmF1bHRBY3Rpb25zOiBbZnVuY3Rpb24gKCldXG4gICAgICAgICAqXG4gICAgICAgICAqIEhlbHBlciBmdW5jdGlvbiB3aGljaCB3aWxsIGhpZGUgdGhlIGRlZmF1bHQgY29udGVudHMgb2YgdGhlXG4gICAgICAgICAqIHRvb2xiYXIsIGJ1dCBsZWF2ZSB0aGUgdG9vbGJhciBjb250YWluZXIgaW4gdGhlIHNhbWUgc3RhdGVcbiAgICAgICAgICogdG8gYWxsb3cgYSBmb3JtIHRvIGRpc3BsYXkgaXRzIGN1c3RvbSBjb250ZW50cyBpbnNpZGUgdGhlIHRvb2xiYXJcbiAgICAgICAgICovXG4gICAgICAgIGhpZGVUb29sYmFyRGVmYXVsdEFjdGlvbnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB0b29sYmFyID0gdGhpcy5iYXNlLmdldEV4dGVuc2lvbkJ5TmFtZSgndG9vbGJhcicpO1xuICAgICAgICAgICAgaWYgKHRvb2xiYXIpIHtcbiAgICAgICAgICAgICAgICB0b29sYmFyLmhpZGVUb29sYmFyRGVmYXVsdEFjdGlvbnMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKiBzZXRUb29sYmFyUG9zaXRpb246IFtmdW5jdGlvbiAoKV1cbiAgICAgICAgICpcbiAgICAgICAgICogSGVscGVyIGZ1bmN0aW9uIHdoaWNoIHdpbGwgdXBkYXRlIHRoZSBzaXplIGFuZCBwb3NpdGlvblxuICAgICAgICAgKiBvZiB0aGUgdG9vbGJhciBiYXNlZCBvbiB0aGUgdG9vbGJhciBjb250ZW50IGFuZCB0aGUgY3VycmVudFxuICAgICAgICAgKiBwb3NpdGlvbiBvZiB0aGUgdXNlcidzIHNlbGVjdGlvblxuICAgICAgICAgKi9cbiAgICAgICAgc2V0VG9vbGJhclBvc2l0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgdG9vbGJhciA9IHRoaXMuYmFzZS5nZXRFeHRlbnNpb25CeU5hbWUoJ3Rvb2xiYXInKTtcbiAgICAgICAgICAgIGlmICh0b29sYmFyKSB7XG4gICAgICAgICAgICAgICAgdG9vbGJhci5zZXRUb29sYmFyUG9zaXRpb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgTWVkaXVtRWRpdG9yLmV4dGVuc2lvbnMuZm9ybSA9IEZvcm1FeHRlbnNpb247XG59KSgpO1xuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgQW5jaG9yRm9ybSA9IE1lZGl1bUVkaXRvci5leHRlbnNpb25zLmZvcm0uZXh0ZW5kKHtcbiAgICAgICAgLyogQW5jaG9yIEZvcm0gT3B0aW9ucyAqL1xuXG4gICAgICAgIC8qIGN1c3RvbUNsYXNzT3B0aW9uOiBbc3RyaW5nXSAgKHByZXZpb3VzbHkgb3B0aW9ucy5hbmNob3JCdXR0b24gKyBvcHRpb25zLmFuY2hvckJ1dHRvbkNsYXNzKVxuICAgICAgICAgKiBDdXN0b20gY2xhc3MgbmFtZSB0aGUgdXNlciBjYW4gb3B0aW9uYWxseSBoYXZlIGFkZGVkIHRvIHRoZWlyIGNyZWF0ZWQgbGlua3MgKGllICdidXR0b24nKS5cbiAgICAgICAgICogSWYgcGFzc2VkIGFzIGEgbm9uLWVtcHR5IHN0cmluZywgYSBjaGVja2JveCB3aWxsIGJlIGRpc3BsYXllZCBhbGxvd2luZyB0aGUgdXNlciB0byBjaG9vc2VcbiAgICAgICAgICogd2hldGhlciB0byBoYXZlIHRoZSBjbGFzcyBhZGRlZCB0byB0aGUgY3JlYXRlZCBsaW5rIG9yIG5vdC5cbiAgICAgICAgICovXG4gICAgICAgIGN1c3RvbUNsYXNzT3B0aW9uOiBudWxsLFxuXG4gICAgICAgIC8qIGN1c3RvbUNsYXNzT3B0aW9uVGV4dDogW3N0cmluZ11cbiAgICAgICAgICogdGV4dCB0byBiZSBzaG93biBpbiB0aGUgY2hlY2tib3ggd2hlbiB0aGUgX19jdXN0b21DbGFzc09wdGlvbl9fIGlzIGJlaW5nIHVzZWQuXG4gICAgICAgICAqL1xuICAgICAgICBjdXN0b21DbGFzc09wdGlvblRleHQ6ICdCdXR0b24nLFxuXG4gICAgICAgIC8qIGxpbmtWYWxpZGF0aW9uOiBbYm9vbGVhbl0gIChwcmV2aW91c2x5IG9wdGlvbnMuY2hlY2tMaW5rRm9ybWF0KVxuICAgICAgICAgKiBlbmFibGVzL2Rpc2FibGVzIGNoZWNrIGZvciBjb21tb24gVVJMIHByb3RvY29scyBvbiBhbmNob3IgbGlua3MuXG4gICAgICAgICAqL1xuICAgICAgICBsaW5rVmFsaWRhdGlvbjogZmFsc2UsXG5cbiAgICAgICAgLyogcGxhY2Vob2xkZXJUZXh0OiBbc3RyaW5nXSAgKHByZXZpb3VzbHkgb3B0aW9ucy5hbmNob3JJbnB1dFBsYWNlaG9sZGVyKVxuICAgICAgICAgKiB0ZXh0IHRvIGJlIHNob3duIGFzIHBsYWNlaG9sZGVyIG9mIHRoZSBhbmNob3IgaW5wdXQuXG4gICAgICAgICAqL1xuICAgICAgICBwbGFjZWhvbGRlclRleHQ6ICdQYXN0ZSBvciB0eXBlIGEgbGluaycsXG5cbiAgICAgICAgLyogdGFyZ2V0Q2hlY2tib3g6IFtib29sZWFuXSAgKHByZXZpb3VzbHkgb3B0aW9ucy5hbmNob3JUYXJnZXQpXG4gICAgICAgICAqIGVuYWJsZXMvZGlzYWJsZXMgZGlzcGxheWluZyBhIFwiT3BlbiBpbiBuZXcgd2luZG93XCIgY2hlY2tib3gsIHdoaWNoIHdoZW4gY2hlY2tlZFxuICAgICAgICAgKiBjaGFuZ2VzIHRoZSBgdGFyZ2V0YCBhdHRyaWJ1dGUgb2YgdGhlIGNyZWF0ZWQgbGluay5cbiAgICAgICAgICovXG4gICAgICAgIHRhcmdldENoZWNrYm94OiBmYWxzZSxcblxuICAgICAgICAvKiB0YXJnZXRDaGVja2JveFRleHQ6IFtzdHJpbmddICAocHJldmlvdXNseSBvcHRpb25zLmFuY2hvcklucHV0Q2hlY2tib3hMYWJlbClcbiAgICAgICAgICogdGV4dCB0byBiZSBzaG93biBpbiB0aGUgY2hlY2tib3ggZW5hYmxlZCB2aWEgdGhlIF9fdGFyZ2V0Q2hlY2tib3hfXyBvcHRpb24uXG4gICAgICAgICAqL1xuICAgICAgICB0YXJnZXRDaGVja2JveFRleHQ6ICdPcGVuIGluIG5ldyB3aW5kb3cnLFxuXG4gICAgICAgIC8vIE9wdGlvbnMgZm9yIHRoZSBCdXR0b24gYmFzZSBjbGFzc1xuICAgICAgICBuYW1lOiAnYW5jaG9yJyxcbiAgICAgICAgYWN0aW9uOiAnY3JlYXRlTGluaycsXG4gICAgICAgIGFyaWE6ICdsaW5rJyxcbiAgICAgICAgdGFnTmFtZXM6IFsnYSddLFxuICAgICAgICBjb250ZW50RGVmYXVsdDogJzxiPiM8L2I+JyxcbiAgICAgICAgY29udGVudEZBOiAnPGkgY2xhc3M9XCJmYSBmYS1saW5rXCI+PC9pPicsXG5cbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgTWVkaXVtRWRpdG9yLmV4dGVuc2lvbnMuZm9ybS5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgICAgICAgICB0aGlzLnN1YnNjcmliZSgnZWRpdGFibGVLZXlkb3duJywgdGhpcy5oYW5kbGVLZXlkb3duLmJpbmQodGhpcykpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIENhbGxlZCB3aGVuIHRoZSBidXR0b24gdGhlIHRvb2xiYXIgaXMgY2xpY2tlZFxuICAgICAgICAvLyBPdmVycmlkZXMgQnV0dG9uRXh0ZW5zaW9uLmhhbmRsZUNsaWNrXG4gICAgICAgIGhhbmRsZUNsaWNrOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblxuICAgICAgICAgICAgdmFyIHJhbmdlID0gTWVkaXVtRWRpdG9yLnNlbGVjdGlvbi5nZXRTZWxlY3Rpb25SYW5nZSh0aGlzLmRvY3VtZW50KTtcblxuICAgICAgICAgICAgaWYgKHJhbmdlLnN0YXJ0Q29udGFpbmVyLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdhJyB8fFxuICAgICAgICAgICAgICAgIHJhbmdlLmVuZENvbnRhaW5lci5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnYScgfHxcbiAgICAgICAgICAgICAgICBNZWRpdW1FZGl0b3IudXRpbC5nZXRDbG9zZXN0VGFnKE1lZGl1bUVkaXRvci5zZWxlY3Rpb24uZ2V0U2VsZWN0ZWRQYXJlbnRFbGVtZW50KHJhbmdlKSwgJ2EnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmV4ZWNBY3Rpb24oJ3VubGluaycpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIXRoaXMuaXNEaXNwbGF5ZWQoKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2hvd0Zvcm0oKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIENhbGxlZCB3aGVuIHVzZXIgaGl0cyB0aGUgZGVmaW5lZCBzaG9ydGN1dCAoQ1RSTCAvIENPTU1BTkQgKyBLKVxuICAgICAgICBoYW5kbGVLZXlkb3duOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGlmIChNZWRpdW1FZGl0b3IudXRpbC5pc0tleShldmVudCwgTWVkaXVtRWRpdG9yLnV0aWwua2V5Q29kZS5LKSAmJiBNZWRpdW1FZGl0b3IudXRpbC5pc01ldGFDdHJsS2V5KGV2ZW50KSAmJiAhZXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUNsaWNrKGV2ZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvLyBDYWxsZWQgYnkgbWVkaXVtLWVkaXRvciB0byBhcHBlbmQgZm9ybSB0byB0aGUgdG9vbGJhclxuICAgICAgICBnZXRGb3JtOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuZm9ybSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZm9ybSA9IHRoaXMuY3JlYXRlRm9ybSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZm9ybTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRUZW1wbGF0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHRlbXBsYXRlID0gW1xuICAgICAgICAgICAgICAgICc8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cIm1lZGl1bS1lZGl0b3ItdG9vbGJhci1pbnB1dFwiIHBsYWNlaG9sZGVyPVwiJywgdGhpcy5wbGFjZWhvbGRlclRleHQsICdcIj4nXG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICB0ZW1wbGF0ZS5wdXNoKFxuICAgICAgICAgICAgICAgICc8YSBocmVmPVwiI1wiIGNsYXNzPVwibWVkaXVtLWVkaXRvci10b29sYmFyLXNhdmVcIj4nLFxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0RWRpdG9yT3B0aW9uKCdidXR0b25MYWJlbHMnKSA9PT0gJ2ZvbnRhd2Vzb21lJyA/ICc8aSBjbGFzcz1cImZhIGZhLWNoZWNrXCI+PC9pPicgOiB0aGlzLmZvcm1TYXZlTGFiZWwsXG4gICAgICAgICAgICAgICAgJzwvYT4nXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICB0ZW1wbGF0ZS5wdXNoKCc8YSBocmVmPVwiI1wiIGNsYXNzPVwibWVkaXVtLWVkaXRvci10b29sYmFyLWNsb3NlXCI+JyxcbiAgICAgICAgICAgICAgICB0aGlzLmdldEVkaXRvck9wdGlvbignYnV0dG9uTGFiZWxzJykgPT09ICdmb250YXdlc29tZScgPyAnPGkgY2xhc3M9XCJmYSBmYS10aW1lc1wiPjwvaT4nIDogdGhpcy5mb3JtQ2xvc2VMYWJlbCxcbiAgICAgICAgICAgICAgICAnPC9hPicpO1xuXG4gICAgICAgICAgICAvLyBib3RoIG9mIHRoZXNlIG9wdGlvbnMgYXJlIHNsaWdodGx5IG1vb3Qgd2l0aCB0aGUgYWJpbGl0eSB0b1xuICAgICAgICAgICAgLy8gb3ZlcnJpZGUgdGhlIHZhcmlvdXMgZm9ybSBidWlsZHVwL3NlcmlhbGl6ZSBmdW5jdGlvbnMuXG5cbiAgICAgICAgICAgIGlmICh0aGlzLnRhcmdldENoZWNrYm94KSB7XG4gICAgICAgICAgICAgICAgLy8gZml4bWU6IGlkZWFsbHksIHRoaXMgdGFyZ2V0Q2hlY2tib3hUZXh0IHdvdWxkIGJlIGEgZm9ybUxhYmVsIHRvbyxcbiAgICAgICAgICAgICAgICAvLyBmaWd1cmUgb3V0IGhvdyB0byBkZXByZWNhdGU/IGFsc28gY29uc2lkZXIgYGZhLWAgaWNvbiBkZWZhdWx0IGltcGxjYXRpb25zLlxuICAgICAgICAgICAgICAgIHRlbXBsYXRlLnB1c2goXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwibWVkaXVtLWVkaXRvci10b29sYmFyLWZvcm0tcm93XCI+JyxcbiAgICAgICAgICAgICAgICAgICAgJzxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjbGFzcz1cIm1lZGl1bS1lZGl0b3ItdG9vbGJhci1hbmNob3ItdGFyZ2V0XCIgaWQ9XCJtZWRpdW0tZWRpdG9yLXRvb2xiYXItYW5jaG9yLXRhcmdldC1maWVsZC0nICsgdGhpcy5nZXRFZGl0b3JJZCgpICsgJ1wiPicsXG4gICAgICAgICAgICAgICAgICAgICc8bGFiZWwgZm9yPVwibWVkaXVtLWVkaXRvci10b29sYmFyLWFuY2hvci10YXJnZXQtZmllbGQtJyArIHRoaXMuZ2V0RWRpdG9ySWQoKSArICdcIj4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRhcmdldENoZWNrYm94VGV4dCxcbiAgICAgICAgICAgICAgICAgICAgJzwvbGFiZWw+JyxcbiAgICAgICAgICAgICAgICAgICAgJzwvZGl2PidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5jdXN0b21DbGFzc09wdGlvbikge1xuICAgICAgICAgICAgICAgIC8vIGZpeG1lOiBleHBvc2UgdGhpcyBgQnV0dG9uYCB0ZXh0IGFzIGEgZm9ybUxhYmVsIHByb3BlcnR5LCB0b29cbiAgICAgICAgICAgICAgICAvLyBhbmQgcHJvdmlkZSBzaW1pbGFyIGFjY2VzcyB0byBhIGBmYS1gIGljb24gZGVmYXVsdC5cbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZS5wdXNoKFxuICAgICAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cIm1lZGl1bS1lZGl0b3ItdG9vbGJhci1mb3JtLXJvd1wiPicsXG4gICAgICAgICAgICAgICAgICAgICc8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2xhc3M9XCJtZWRpdW0tZWRpdG9yLXRvb2xiYXItYW5jaG9yLWJ1dHRvblwiPicsXG4gICAgICAgICAgICAgICAgICAgICc8bGFiZWw+JyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXN0b21DbGFzc09wdGlvblRleHQsXG4gICAgICAgICAgICAgICAgICAgICc8L2xhYmVsPicsXG4gICAgICAgICAgICAgICAgICAgICc8L2Rpdj4nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRlbXBsYXRlLmpvaW4oJycpO1xuXG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gVXNlZCBieSBtZWRpdW0tZWRpdG9yIHdoZW4gdGhlIGRlZmF1bHQgdG9vbGJhciBpcyB0byBiZSBkaXNwbGF5ZWRcbiAgICAgICAgaXNEaXNwbGF5ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBNZWRpdW1FZGl0b3IuZXh0ZW5zaW9ucy5mb3JtLnByb3RvdHlwZS5pc0Rpc3BsYXllZC5hcHBseSh0aGlzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBoaWRlRm9ybTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgTWVkaXVtRWRpdG9yLmV4dGVuc2lvbnMuZm9ybS5wcm90b3R5cGUuaGlkZUZvcm0uYXBwbHkodGhpcyk7XG4gICAgICAgICAgICB0aGlzLmdldElucHV0KCkudmFsdWUgPSAnJztcbiAgICAgICAgfSxcblxuICAgICAgICBzaG93Rm9ybTogZnVuY3Rpb24gKG9wdHMpIHtcbiAgICAgICAgICAgIHZhciBpbnB1dCA9IHRoaXMuZ2V0SW5wdXQoKSxcbiAgICAgICAgICAgICAgICB0YXJnZXRDaGVja2JveCA9IHRoaXMuZ2V0QW5jaG9yVGFyZ2V0Q2hlY2tib3goKSxcbiAgICAgICAgICAgICAgICBidXR0b25DaGVja2JveCA9IHRoaXMuZ2V0QW5jaG9yQnV0dG9uQ2hlY2tib3goKTtcblxuICAgICAgICAgICAgb3B0cyA9IG9wdHMgfHwgeyB2YWx1ZTogJycgfTtcbiAgICAgICAgICAgIC8vIFRPRE86IFRoaXMgaXMgZm9yIGJhY2t3YXJkcyBjb21wYXRhYmlsaXR5XG4gICAgICAgICAgICAvLyBXZSBkb24ndCBuZWVkIHRvIHN1cHBvcnQgdGhlICdzdHJpbmcnIGFyZ3VtZW50IGluIDYuMC4wXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdHMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgb3B0cyA9IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IG9wdHNcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmJhc2Uuc2F2ZVNlbGVjdGlvbigpO1xuICAgICAgICAgICAgdGhpcy5oaWRlVG9vbGJhckRlZmF1bHRBY3Rpb25zKCk7XG4gICAgICAgICAgICBNZWRpdW1FZGl0b3IuZXh0ZW5zaW9ucy5mb3JtLnByb3RvdHlwZS5zaG93Rm9ybS5hcHBseSh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMuc2V0VG9vbGJhclBvc2l0aW9uKCk7XG5cbiAgICAgICAgICAgIGlucHV0LnZhbHVlID0gb3B0cy52YWx1ZTtcbiAgICAgICAgICAgIGlucHV0LmZvY3VzKCk7XG5cbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgYSB0YXJnZXQgY2hlY2tib3gsIHdlIHdhbnQgaXQgdG8gYmUgY2hlY2tlZC91bmNoZWNrZWRcbiAgICAgICAgICAgIC8vIGJhc2VkIG9uIHdoZXRoZXIgdGhlIGV4aXN0aW5nIGxpbmsgaGFzIHRhcmdldD1fYmxhbmtcbiAgICAgICAgICAgIGlmICh0YXJnZXRDaGVja2JveCkge1xuICAgICAgICAgICAgICAgIHRhcmdldENoZWNrYm94LmNoZWNrZWQgPSBvcHRzLnRhcmdldCA9PT0gJ19ibGFuayc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgYSBjdXN0b20gY2xhc3MgY2hlY2tib3gsIHdlIHdhbnQgaXQgdG8gYmUgY2hlY2tlZC91bmNoZWNrZWRcbiAgICAgICAgICAgIC8vIGJhc2VkIG9uIHdoZXRoZXIgYW4gZXhpc3RpbmcgbGluayBhbHJlYWR5IGhhcyB0aGUgY2xhc3NcbiAgICAgICAgICAgIGlmIChidXR0b25DaGVja2JveCkge1xuICAgICAgICAgICAgICAgIHZhciBjbGFzc0xpc3QgPSBvcHRzLmJ1dHRvbkNsYXNzID8gb3B0cy5idXR0b25DbGFzcy5zcGxpdCgnICcpIDogW107XG4gICAgICAgICAgICAgICAgYnV0dG9uQ2hlY2tib3guY2hlY2tlZCA9IChjbGFzc0xpc3QuaW5kZXhPZih0aGlzLmN1c3RvbUNsYXNzT3B0aW9uKSAhPT0gLTEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIENhbGxlZCBieSBjb3JlIHdoZW4gdGVhcmluZyBkb3duIG1lZGl1bS1lZGl0b3IgKGRlc3Ryb3kpXG4gICAgICAgIGRlc3Ryb3k6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5mb3JtKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5mb3JtLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZvcm0ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmZvcm0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5mb3JtO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIGNvcmUgbWV0aG9kc1xuXG4gICAgICAgIGdldEZvcm1PcHRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBubyBub3Rpb24gb2YgcHJpdmF0ZSBmdW5jdGlvbnM/IHdhbnRlZCBgX2dldEZvcm1PcHRzYFxuICAgICAgICAgICAgdmFyIHRhcmdldENoZWNrYm94ID0gdGhpcy5nZXRBbmNob3JUYXJnZXRDaGVja2JveCgpLFxuICAgICAgICAgICAgICAgIGJ1dHRvbkNoZWNrYm94ID0gdGhpcy5nZXRBbmNob3JCdXR0b25DaGVja2JveCgpLFxuICAgICAgICAgICAgICAgIG9wdHMgPSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmdldElucHV0KCkudmFsdWUudHJpbSgpXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKHRoaXMubGlua1ZhbGlkYXRpb24pIHtcbiAgICAgICAgICAgICAgICBvcHRzLnZhbHVlID0gdGhpcy5jaGVja0xpbmtGb3JtYXQob3B0cy52YWx1ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG9wdHMudGFyZ2V0ID0gJ19zZWxmJztcbiAgICAgICAgICAgIGlmICh0YXJnZXRDaGVja2JveCAmJiB0YXJnZXRDaGVja2JveC5jaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgb3B0cy50YXJnZXQgPSAnX2JsYW5rJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGJ1dHRvbkNoZWNrYm94ICYmIGJ1dHRvbkNoZWNrYm94LmNoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICBvcHRzLmJ1dHRvbkNsYXNzID0gdGhpcy5jdXN0b21DbGFzc09wdGlvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIG9wdHM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZG9Gb3JtU2F2ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG9wdHMgPSB0aGlzLmdldEZvcm1PcHRzKCk7XG4gICAgICAgICAgICB0aGlzLmNvbXBsZXRlRm9ybVNhdmUob3B0cyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY29tcGxldGVGb3JtU2F2ZTogZnVuY3Rpb24gKG9wdHMpIHtcbiAgICAgICAgICAgIHRoaXMuYmFzZS5yZXN0b3JlU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICB0aGlzLmV4ZWNBY3Rpb24odGhpcy5hY3Rpb24sIG9wdHMpO1xuICAgICAgICAgICAgdGhpcy5iYXNlLmNoZWNrU2VsZWN0aW9uKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZW5zdXJlRW5jb2RlZFVyaTogZnVuY3Rpb24gKHN0cikge1xuICAgICAgICAgICAgcmV0dXJuIHN0ciA9PT0gZGVjb2RlVVJJKHN0cikgPyBlbmNvZGVVUkkoc3RyKSA6IHN0cjtcbiAgICAgICAgfSxcblxuICAgICAgICBlbnN1cmVFbmNvZGVkVXJpQ29tcG9uZW50OiBmdW5jdGlvbiAoc3RyKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RyID09PSBkZWNvZGVVUklDb21wb25lbnQoc3RyKSA/IGVuY29kZVVSSUNvbXBvbmVudChzdHIpIDogc3RyO1xuICAgICAgICB9LFxuXG4gICAgICAgIGVuc3VyZUVuY29kZWRQYXJhbTogZnVuY3Rpb24gKHBhcmFtKSB7XG4gICAgICAgICAgICB2YXIgc3BsaXQgPSBwYXJhbS5zcGxpdCgnPScpLFxuICAgICAgICAgICAgICAgIGtleSA9IHNwbGl0WzBdLFxuICAgICAgICAgICAgICAgIHZhbCA9IHNwbGl0WzFdO1xuXG4gICAgICAgICAgICByZXR1cm4ga2V5ICsgKHZhbCA9PT0gdW5kZWZpbmVkID8gJycgOiAnPScgKyB0aGlzLmVuc3VyZUVuY29kZWRVcmlDb21wb25lbnQodmFsKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZW5zdXJlRW5jb2RlZFF1ZXJ5OiBmdW5jdGlvbiAocXVlcnlTdHJpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiBxdWVyeVN0cmluZy5zcGxpdCgnJicpLm1hcCh0aGlzLmVuc3VyZUVuY29kZWRQYXJhbS5iaW5kKHRoaXMpKS5qb2luKCcmJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2hlY2tMaW5rRm9ybWF0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIC8vIE1hdGNoZXMgYW55IGFscGhhYmV0aWNhbCBjaGFyYWN0ZXJzIGZvbGxvd2VkIGJ5IDovL1xuICAgICAgICAgICAgLy8gTWF0Y2hlcyBwcm90b2NvbCByZWxhdGl2ZSBcIi8vXCJcbiAgICAgICAgICAgIC8vIE1hdGNoZXMgY29tbW9uIGV4dGVybmFsIHByb3RvY29scyBcIm1haWx0bzpcIiBcInRlbDpcIiBcIm1hcHM6XCJcbiAgICAgICAgICAgIC8vIE1hdGNoZXMgcmVsYXRpdmUgaGFzaCBsaW5rLCBiZWdpbnMgd2l0aCBcIiNcIlxuICAgICAgICAgICAgdmFyIHVybFNjaGVtZVJlZ2V4ID0gL14oW2Etel0rOik/XFwvXFwvfF4obWFpbHRvfHRlbHxtYXBzKTp8XlxcIy9pLFxuICAgICAgICAgICAgICAgIGhhc1NjaGVtZSA9IHVybFNjaGVtZVJlZ2V4LnRlc3QodmFsdWUpLFxuICAgICAgICAgICAgICAgIHNjaGVtZSA9ICcnLFxuICAgICAgICAgICAgICAgIC8vIHRlbFJlZ2V4IGlzIGEgcmVnZXggZm9yIGNoZWNraW5nIGlmIHRoZSBzdHJpbmcgaXMgYSB0ZWxlcGhvbmUgbnVtYmVyXG4gICAgICAgICAgICAgICAgdGVsUmVnZXggPSAvXlxcKz9cXHM/XFwoPyg/OlxcZFxccz9cXC0/XFwpPyl7MywyMH0kLyxcbiAgICAgICAgICAgICAgICB1cmxQYXJ0cyA9IHZhbHVlLm1hdGNoKC9eKC4qPykoPzpcXD8oLio/KSk/KD86IyguKikpPyQvKSxcbiAgICAgICAgICAgICAgICBwYXRoID0gdXJsUGFydHNbMV0sXG4gICAgICAgICAgICAgICAgcXVlcnkgPSB1cmxQYXJ0c1syXSxcbiAgICAgICAgICAgICAgICBmcmFnbWVudCA9IHVybFBhcnRzWzNdO1xuXG4gICAgICAgICAgICBpZiAodGVsUmVnZXgudGVzdCh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RlbDonICsgdmFsdWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghaGFzU2NoZW1lKSB7XG4gICAgICAgICAgICAgICAgdmFyIGhvc3QgPSBwYXRoLnNwbGl0KCcvJylbMF07XG4gICAgICAgICAgICAgICAgLy8gaWYgdGhlIGhvc3QgcGFydCBvZiB0aGUgcGF0aCBsb29rcyBsaWtlIGEgaG9zdG5hbWVcbiAgICAgICAgICAgICAgICBpZiAoaG9zdC5tYXRjaCgvLisoXFwufDopLisvKSB8fCBob3N0ID09PSAnbG9jYWxob3N0Jykge1xuICAgICAgICAgICAgICAgICAgICBzY2hlbWUgPSAnaHR0cDovLyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gc2NoZW1lICtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgcGF0aCBpcyBlbmNvZGVkXG4gICAgICAgICAgICAgICAgdGhpcy5lbnN1cmVFbmNvZGVkVXJpKHBhdGgpICtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgcXVlcnkgaXMgZW5jb2RlZFxuICAgICAgICAgICAgICAgIChxdWVyeSA9PT0gdW5kZWZpbmVkID8gJycgOiAnPycgKyB0aGlzLmVuc3VyZUVuY29kZWRRdWVyeShxdWVyeSkpICtcbiAgICAgICAgICAgICAgICAvLyBJbmNsdWRlIGZyYWdtZW50IHVuZW5jb2RlZCBhcyBlbmNvZGVVcmlDb21wb25lbnQgaXMgdG9vXG4gICAgICAgICAgICAgICAgLy8gaGVhdnkgaGFuZGVkIGZvciB0aGUgbWFueSBjaGFyYWN0ZXJzIGFsbG93ZWQgaW4gYSBmcmFnbWVudFxuICAgICAgICAgICAgICAgIChmcmFnbWVudCA9PT0gdW5kZWZpbmVkID8gJycgOiAnIycgKyBmcmFnbWVudCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZG9Gb3JtQ2FuY2VsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmJhc2UucmVzdG9yZVNlbGVjdGlvbigpO1xuICAgICAgICAgICAgdGhpcy5iYXNlLmNoZWNrU2VsZWN0aW9uKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gZm9ybSBjcmVhdGlvbiBhbmQgZXZlbnQgaGFuZGxpbmdcbiAgICAgICAgYXR0YWNoRm9ybUV2ZW50czogZnVuY3Rpb24gKGZvcm0pIHtcbiAgICAgICAgICAgIHZhciBjbG9zZSA9IGZvcm0ucXVlcnlTZWxlY3RvcignLm1lZGl1bS1lZGl0b3ItdG9vbGJhci1jbG9zZScpLFxuICAgICAgICAgICAgICAgIHNhdmUgPSBmb3JtLnF1ZXJ5U2VsZWN0b3IoJy5tZWRpdW0tZWRpdG9yLXRvb2xiYXItc2F2ZScpLFxuICAgICAgICAgICAgICAgIGlucHV0ID0gZm9ybS5xdWVyeVNlbGVjdG9yKCcubWVkaXVtLWVkaXRvci10b29sYmFyLWlucHV0Jyk7XG5cbiAgICAgICAgICAgIC8vIEhhbmRsZSBjbGlja3Mgb24gdGhlIGZvcm0gaXRzZWxmXG4gICAgICAgICAgICB0aGlzLm9uKGZvcm0sICdjbGljaycsIHRoaXMuaGFuZGxlRm9ybUNsaWNrLmJpbmQodGhpcykpO1xuXG4gICAgICAgICAgICAvLyBIYW5kbGUgdHlwaW5nIGluIHRoZSB0ZXh0Ym94XG4gICAgICAgICAgICB0aGlzLm9uKGlucHV0LCAna2V5dXAnLCB0aGlzLmhhbmRsZVRleHRib3hLZXl1cC5iaW5kKHRoaXMpKTtcblxuICAgICAgICAgICAgLy8gSGFuZGxlIGNsb3NlIGJ1dHRvbiBjbGlja3NcbiAgICAgICAgICAgIHRoaXMub24oY2xvc2UsICdjbGljaycsIHRoaXMuaGFuZGxlQ2xvc2VDbGljay5iaW5kKHRoaXMpKTtcblxuICAgICAgICAgICAgLy8gSGFuZGxlIHNhdmUgYnV0dG9uIGNsaWNrcyAoY2FwdHVyZSlcbiAgICAgICAgICAgIHRoaXMub24oc2F2ZSwgJ2NsaWNrJywgdGhpcy5oYW5kbGVTYXZlQ2xpY2suYmluZCh0aGlzKSwgdHJ1ZSk7XG5cbiAgICAgICAgfSxcblxuICAgICAgICBjcmVhdGVGb3JtOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZG9jID0gdGhpcy5kb2N1bWVudCxcbiAgICAgICAgICAgICAgICBmb3JtID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gICAgICAgICAgICAvLyBBbmNob3IgRm9ybSAoZGl2KVxuICAgICAgICAgICAgZm9ybS5jbGFzc05hbWUgPSAnbWVkaXVtLWVkaXRvci10b29sYmFyLWZvcm0nO1xuICAgICAgICAgICAgZm9ybS5pZCA9ICdtZWRpdW0tZWRpdG9yLXRvb2xiYXItZm9ybS1hbmNob3ItJyArIHRoaXMuZ2V0RWRpdG9ySWQoKTtcbiAgICAgICAgICAgIGZvcm0uaW5uZXJIVE1MID0gdGhpcy5nZXRUZW1wbGF0ZSgpO1xuICAgICAgICAgICAgdGhpcy5hdHRhY2hGb3JtRXZlbnRzKGZvcm0pO1xuXG4gICAgICAgICAgICByZXR1cm4gZm9ybTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRJbnB1dDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0Rm9ybSgpLnF1ZXJ5U2VsZWN0b3IoJ2lucHV0Lm1lZGl1bS1lZGl0b3ItdG9vbGJhci1pbnB1dCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldEFuY2hvclRhcmdldENoZWNrYm94OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRGb3JtKCkucXVlcnlTZWxlY3RvcignLm1lZGl1bS1lZGl0b3ItdG9vbGJhci1hbmNob3ItdGFyZ2V0Jyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0QW5jaG9yQnV0dG9uQ2hlY2tib3g6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEZvcm0oKS5xdWVyeVNlbGVjdG9yKCcubWVkaXVtLWVkaXRvci10b29sYmFyLWFuY2hvci1idXR0b24nKTtcbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVUZXh0Ym94S2V5dXA6IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgLy8gRm9yIEVOVEVSIC0+IGNyZWF0ZSB0aGUgYW5jaG9yXG4gICAgICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gTWVkaXVtRWRpdG9yLnV0aWwua2V5Q29kZS5FTlRFUikge1xuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgdGhpcy5kb0Zvcm1TYXZlKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBGb3IgRVNDQVBFIC0+IGNsb3NlIHRoZSBmb3JtXG4gICAgICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gTWVkaXVtRWRpdG9yLnV0aWwua2V5Q29kZS5FU0NBUEUpIHtcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuZG9Gb3JtQ2FuY2VsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgaGFuZGxlRm9ybUNsaWNrOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIC8vIG1ha2Ugc3VyZSBub3QgdG8gaGlkZSBmb3JtIHdoZW4gY2xpY2tpbmcgaW5zaWRlIHRoZSBmb3JtXG4gICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVTYXZlQ2xpY2s6IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgLy8gQ2xpY2tpbmcgU2F2ZSAtPiBjcmVhdGUgdGhlIGFuY2hvclxuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHRoaXMuZG9Gb3JtU2F2ZSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGhhbmRsZUNsb3NlQ2xpY2s6IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgLy8gQ2xpY2sgQ2xvc2UgLT4gY2xvc2UgdGhlIGZvcm1cbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB0aGlzLmRvRm9ybUNhbmNlbCgpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBNZWRpdW1FZGl0b3IuZXh0ZW5zaW9ucy5hbmNob3IgPSBBbmNob3JGb3JtO1xufSgpKTtcblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgQW5jaG9yUHJldmlldyA9IE1lZGl1bUVkaXRvci5FeHRlbnNpb24uZXh0ZW5kKHtcbiAgICAgICAgbmFtZTogJ2FuY2hvci1wcmV2aWV3JyxcblxuICAgICAgICAvLyBBbmNob3IgUHJldmlldyBPcHRpb25zXG5cbiAgICAgICAgLyogaGlkZURlbGF5OiBbbnVtYmVyXSAgKHByZXZpb3VzbHkgb3B0aW9ucy5hbmNob3JQcmV2aWV3SGlkZURlbGF5KVxuICAgICAgICAgKiB0aW1lIGluIG1pbGxpc2Vjb25kcyB0byBzaG93IHRoZSBhbmNob3IgdGFnIHByZXZpZXcgYWZ0ZXIgdGhlIG1vdXNlIGhhcyBsZWZ0IHRoZSBhbmNob3IgdGFnLlxuICAgICAgICAgKi9cbiAgICAgICAgaGlkZURlbGF5OiA1MDAsXG5cbiAgICAgICAgLyogcHJldmlld1ZhbHVlU2VsZWN0b3I6IFtzdHJpbmddXG4gICAgICAgICAqIHRoZSBkZWZhdWx0IHNlbGVjdG9yIHRvIGxvY2F0ZSB3aGVyZSB0byBwdXQgdGhlIGFjdGl2ZUFuY2hvciB2YWx1ZSBpbiB0aGUgcHJldmlld1xuICAgICAgICAgKi9cbiAgICAgICAgcHJldmlld1ZhbHVlU2VsZWN0b3I6ICdhJyxcblxuICAgICAgICAvKiBzaG93V2hlblRvb2xiYXJJc1Zpc2libGU6IFtib29sZWFuXVxuICAgICAgICAgKiBkZXRlcm1pbmVzIHdoZXRoZXIgdGhlIGFuY2hvciB0YWcgcHJldmlldyBzaG93cyB1cCB3aGVuIHRoZSB0b29sYmFyIGlzIHZpc2libGVcbiAgICAgICAgICovXG4gICAgICAgIHNob3dXaGVuVG9vbGJhcklzVmlzaWJsZTogZmFsc2UsXG5cbiAgICAgICAgLyogc2hvd09uRW1wdHlMaW5rczogW2Jvb2xlYW5dXG4gICAgICAgICogZGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBhbmNob3IgdGFnIHByZXZpZXcgc2hvd3MgdXAgb24gbGlua3Mgd2l0aCBocmVmPVwiXCIgb3IgaHJlZj1cIiNzb21ldGhpbmdcIlxuICAgICAgICAqL1xuICAgICAgICBzaG93T25FbXB0eUxpbmtzOiB0cnVlLFxuXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuYW5jaG9yUHJldmlldyA9IHRoaXMuY3JlYXRlUHJldmlldygpO1xuXG4gICAgICAgICAgICB0aGlzLmdldEVkaXRvck9wdGlvbignZWxlbWVudHNDb250YWluZXInKS5hcHBlbmRDaGlsZCh0aGlzLmFuY2hvclByZXZpZXcpO1xuXG4gICAgICAgICAgICB0aGlzLmF0dGFjaFRvRWRpdGFibGVzKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0SW50ZXJhY3Rpb25FbGVtZW50czogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UHJldmlld0VsZW1lbnQoKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBUT0RPOiBSZW1vdmUgdGhpcyBmdW5jdGlvbiBpbiA2LjAuMFxuICAgICAgICBnZXRQcmV2aWV3RWxlbWVudDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYW5jaG9yUHJldmlldztcbiAgICAgICAgfSxcblxuICAgICAgICBjcmVhdGVQcmV2aWV3OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgZWwgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gICAgICAgICAgICBlbC5pZCA9ICdtZWRpdW0tZWRpdG9yLWFuY2hvci1wcmV2aWV3LScgKyB0aGlzLmdldEVkaXRvcklkKCk7XG4gICAgICAgICAgICBlbC5jbGFzc05hbWUgPSAnbWVkaXVtLWVkaXRvci1hbmNob3ItcHJldmlldyc7XG4gICAgICAgICAgICBlbC5pbm5lckhUTUwgPSB0aGlzLmdldFRlbXBsYXRlKCk7XG5cbiAgICAgICAgICAgIHRoaXMub24oZWwsICdjbGljaycsIHRoaXMuaGFuZGxlQ2xpY2suYmluZCh0aGlzKSk7XG5cbiAgICAgICAgICAgIHJldHVybiBlbDtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRUZW1wbGF0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICc8ZGl2IGNsYXNzPVwibWVkaXVtLWVkaXRvci10b29sYmFyLWFuY2hvci1wcmV2aWV3XCIgaWQ9XCJtZWRpdW0tZWRpdG9yLXRvb2xiYXItYW5jaG9yLXByZXZpZXdcIj4nICtcbiAgICAgICAgICAgICAgICAnICAgIDxhIGNsYXNzPVwibWVkaXVtLWVkaXRvci10b29sYmFyLWFuY2hvci1wcmV2aWV3LWlubmVyXCI+PC9hPicgK1xuICAgICAgICAgICAgICAgICc8L2Rpdj4nO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRlc3Ryb3k6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmFuY2hvclByZXZpZXcpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hbmNob3JQcmV2aWV3LnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hbmNob3JQcmV2aWV3LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5hbmNob3JQcmV2aWV3KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuYW5jaG9yUHJldmlldztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBoaWRlUHJldmlldzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuYW5jaG9yUHJldmlldykge1xuICAgICAgICAgICAgICAgIHRoaXMuYW5jaG9yUHJldmlldy5jbGFzc0xpc3QucmVtb3ZlKCdtZWRpdW0tZWRpdG9yLWFuY2hvci1wcmV2aWV3LWFjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5hY3RpdmVBbmNob3IgPSBudWxsO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNob3dQcmV2aWV3OiBmdW5jdGlvbiAoYW5jaG9yRWwpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmFuY2hvclByZXZpZXcuY2xhc3NMaXN0LmNvbnRhaW5zKCdtZWRpdW0tZWRpdG9yLWFuY2hvci1wcmV2aWV3LWFjdGl2ZScpIHx8XG4gICAgICAgICAgICAgICAgICAgIGFuY2hvckVsLmdldEF0dHJpYnV0ZSgnZGF0YS1kaXNhYmxlLXByZXZpZXcnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5wcmV2aWV3VmFsdWVTZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgIHRoaXMuYW5jaG9yUHJldmlldy5xdWVyeVNlbGVjdG9yKHRoaXMucHJldmlld1ZhbHVlU2VsZWN0b3IpLnRleHRDb250ZW50ID0gYW5jaG9yRWwuYXR0cmlidXRlcy5ocmVmLnZhbHVlO1xuICAgICAgICAgICAgICAgIHRoaXMuYW5jaG9yUHJldmlldy5xdWVyeVNlbGVjdG9yKHRoaXMucHJldmlld1ZhbHVlU2VsZWN0b3IpLmhyZWYgPSBhbmNob3JFbC5hdHRyaWJ1dGVzLmhyZWYudmFsdWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuYW5jaG9yUHJldmlldy5jbGFzc0xpc3QuYWRkKCdtZWRpdW0tdG9vbGJhci1hcnJvdy1vdmVyJyk7XG4gICAgICAgICAgICB0aGlzLmFuY2hvclByZXZpZXcuY2xhc3NMaXN0LnJlbW92ZSgnbWVkaXVtLXRvb2xiYXItYXJyb3ctdW5kZXInKTtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLmFuY2hvclByZXZpZXcuY2xhc3NMaXN0LmNvbnRhaW5zKCdtZWRpdW0tZWRpdG9yLWFuY2hvci1wcmV2aWV3LWFjdGl2ZScpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hbmNob3JQcmV2aWV3LmNsYXNzTGlzdC5hZGQoJ21lZGl1bS1lZGl0b3ItYW5jaG9yLXByZXZpZXctYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuYWN0aXZlQW5jaG9yID0gYW5jaG9yRWw7XG5cbiAgICAgICAgICAgIHRoaXMucG9zaXRpb25QcmV2aWV3KCk7XG4gICAgICAgICAgICB0aGlzLmF0dGFjaFByZXZpZXdIYW5kbGVycygpO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICBwb3NpdGlvblByZXZpZXc6IGZ1bmN0aW9uIChhY3RpdmVBbmNob3IpIHtcbiAgICAgICAgICAgIGFjdGl2ZUFuY2hvciA9IGFjdGl2ZUFuY2hvciB8fCB0aGlzLmFjdGl2ZUFuY2hvcjtcbiAgICAgICAgICAgIHZhciBjb250YWluZXJXaWR0aCA9IHRoaXMud2luZG93LmlubmVyV2lkdGgsXG4gICAgICAgICAgICAgICAgYnV0dG9uSGVpZ2h0ID0gdGhpcy5hbmNob3JQcmV2aWV3Lm9mZnNldEhlaWdodCxcbiAgICAgICAgICAgICAgICBib3VuZGFyeSA9IGFjdGl2ZUFuY2hvci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgICAgICAgICAgICBkaWZmTGVmdCA9IHRoaXMuZGlmZkxlZnQsXG4gICAgICAgICAgICAgICAgZGlmZlRvcCA9IHRoaXMuZGlmZlRvcCxcbiAgICAgICAgICAgICAgICBlbGVtZW50c0NvbnRhaW5lciA9IHRoaXMuZ2V0RWRpdG9yT3B0aW9uKCdlbGVtZW50c0NvbnRhaW5lcicpLFxuICAgICAgICAgICAgICAgIGVsZW1lbnRzQ29udGFpbmVyQWJzb2x1dGUgPSBbJ2Fic29sdXRlJywgJ2ZpeGVkJ10uaW5kZXhPZih3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShlbGVtZW50c0NvbnRhaW5lcikuZ2V0UHJvcGVydHlWYWx1ZSgncG9zaXRpb24nKSkgPiAtMSxcbiAgICAgICAgICAgICAgICByZWxhdGl2ZUJvdW5kYXJ5ID0ge30sXG4gICAgICAgICAgICAgICAgaGFsZk9mZnNldFdpZHRoLCBkZWZhdWx0TGVmdCwgbWlkZGxlQm91bmRhcnksIGVsZW1lbnRzQ29udGFpbmVyQm91bmRhcnksIHRvcDtcblxuICAgICAgICAgICAgaGFsZk9mZnNldFdpZHRoID0gdGhpcy5hbmNob3JQcmV2aWV3Lm9mZnNldFdpZHRoIC8gMjtcbiAgICAgICAgICAgIHZhciB0b29sYmFyRXh0ZW5zaW9uID0gdGhpcy5iYXNlLmdldEV4dGVuc2lvbkJ5TmFtZSgndG9vbGJhcicpO1xuICAgICAgICAgICAgaWYgKHRvb2xiYXJFeHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgICBkaWZmTGVmdCA9IHRvb2xiYXJFeHRlbnNpb24uZGlmZkxlZnQ7XG4gICAgICAgICAgICAgICAgZGlmZlRvcCA9IHRvb2xiYXJFeHRlbnNpb24uZGlmZlRvcDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHRMZWZ0ID0gZGlmZkxlZnQgLSBoYWxmT2Zmc2V0V2lkdGg7XG5cbiAgICAgICAgICAgIC8vIElmIGNvbnRhaW5lciBlbGVtZW50IGlzIGFic29sdXRlIC8gZml4ZWQsIHJlY2FsY3VsYXRlIGJvdW5kYXJpZXMgdG8gYmUgcmVsYXRpdmUgdG8gdGhlIGNvbnRhaW5lclxuICAgICAgICAgICAgaWYgKGVsZW1lbnRzQ29udGFpbmVyQWJzb2x1dGUpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50c0NvbnRhaW5lckJvdW5kYXJ5ID0gZWxlbWVudHNDb250YWluZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICAgICAgWyd0b3AnLCAnbGVmdCddLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgICAgICByZWxhdGl2ZUJvdW5kYXJ5W2tleV0gPSBib3VuZGFyeVtrZXldIC0gZWxlbWVudHNDb250YWluZXJCb3VuZGFyeVtrZXldO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmVsYXRpdmVCb3VuZGFyeS53aWR0aCA9IGJvdW5kYXJ5LndpZHRoO1xuICAgICAgICAgICAgICAgIHJlbGF0aXZlQm91bmRhcnkuaGVpZ2h0ID0gYm91bmRhcnkuaGVpZ2h0O1xuICAgICAgICAgICAgICAgIGJvdW5kYXJ5ID0gcmVsYXRpdmVCb3VuZGFyeTtcblxuICAgICAgICAgICAgICAgIGNvbnRhaW5lcldpZHRoID0gZWxlbWVudHNDb250YWluZXJCb3VuZGFyeS53aWR0aDtcblxuICAgICAgICAgICAgICAgIC8vIEFkanVzdCB0b3AgcG9zaXRpb24gYWNjb3JkaW5nIHRvIGNvbnRhaW5lciBzY3JvbGwgcG9zaXRpb25cbiAgICAgICAgICAgICAgICB0b3AgPSBlbGVtZW50c0NvbnRhaW5lci5zY3JvbGxUb3A7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEFkanVzdCB0b3AgcG9zaXRpb24gYWNjb3JkaW5nIHRvIHdpbmRvdyBzY3JvbGwgcG9zaXRpb25cbiAgICAgICAgICAgICAgICB0b3AgPSB0aGlzLndpbmRvdy5wYWdlWU9mZnNldDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbWlkZGxlQm91bmRhcnkgPSBib3VuZGFyeS5sZWZ0ICsgYm91bmRhcnkud2lkdGggLyAyO1xuICAgICAgICAgICAgdG9wICs9IGJ1dHRvbkhlaWdodCArIGJvdW5kYXJ5LnRvcCArIGJvdW5kYXJ5LmhlaWdodCAtIGRpZmZUb3AgLSB0aGlzLmFuY2hvclByZXZpZXcub2Zmc2V0SGVpZ2h0O1xuXG4gICAgICAgICAgICB0aGlzLmFuY2hvclByZXZpZXcuc3R5bGUudG9wID0gTWF0aC5yb3VuZCh0b3ApICsgJ3B4JztcbiAgICAgICAgICAgIHRoaXMuYW5jaG9yUHJldmlldy5zdHlsZS5yaWdodCA9ICdpbml0aWFsJztcbiAgICAgICAgICAgIGlmIChtaWRkbGVCb3VuZGFyeSA8IGhhbGZPZmZzZXRXaWR0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMuYW5jaG9yUHJldmlldy5zdHlsZS5sZWZ0ID0gZGVmYXVsdExlZnQgKyBoYWxmT2Zmc2V0V2lkdGggKyAncHgnO1xuICAgICAgICAgICAgICAgIHRoaXMuYW5jaG9yUHJldmlldy5zdHlsZS5yaWdodCA9ICdpbml0aWFsJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoKGNvbnRhaW5lcldpZHRoIC0gbWlkZGxlQm91bmRhcnkpIDwgaGFsZk9mZnNldFdpZHRoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hbmNob3JQcmV2aWV3LnN0eWxlLmxlZnQgPSAnYXV0byc7XG4gICAgICAgICAgICAgICAgdGhpcy5hbmNob3JQcmV2aWV3LnN0eWxlLnJpZ2h0ID0gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hbmNob3JQcmV2aWV3LnN0eWxlLmxlZnQgPSBkZWZhdWx0TGVmdCArIG1pZGRsZUJvdW5kYXJ5ICsgJ3B4JztcbiAgICAgICAgICAgICAgICB0aGlzLmFuY2hvclByZXZpZXcuc3R5bGUucmlnaHQgPSAnaW5pdGlhbCc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgYXR0YWNoVG9FZGl0YWJsZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuc3Vic2NyaWJlKCdlZGl0YWJsZU1vdXNlb3ZlcicsIHRoaXMuaGFuZGxlRWRpdGFibGVNb3VzZW92ZXIuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICB0aGlzLnN1YnNjcmliZSgncG9zaXRpb25lZFRvb2xiYXInLCB0aGlzLmhhbmRsZVBvc2l0aW9uZWRUb29sYmFyLmJpbmQodGhpcykpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGhhbmRsZVBvc2l0aW9uZWRUb29sYmFyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGUgdG9vbGJhciBpcyB2aXNpYmxlIGFuZCBwb3NpdGlvbmVkLCB3ZSBkb24ndCBuZWVkIHRvIGhpZGUgdGhlIHByZXZpZXdcbiAgICAgICAgICAgIC8vIHdoZW4gc2hvd1doZW5Ub29sYmFySXNWaXNpYmxlIGlzIHRydWVcbiAgICAgICAgICAgIGlmICghdGhpcy5zaG93V2hlblRvb2xiYXJJc1Zpc2libGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGVQcmV2aWV3KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgaGFuZGxlQ2xpY2s6IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgdmFyIGFuY2hvckV4dGVuc2lvbiA9IHRoaXMuYmFzZS5nZXRFeHRlbnNpb25CeU5hbWUoJ2FuY2hvcicpLFxuICAgICAgICAgICAgICAgIGFjdGl2ZUFuY2hvciA9IHRoaXMuYWN0aXZlQW5jaG9yO1xuXG4gICAgICAgICAgICBpZiAoYW5jaG9yRXh0ZW5zaW9uICYmIGFjdGl2ZUFuY2hvcikge1xuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLmJhc2Uuc2VsZWN0RWxlbWVudCh0aGlzLmFjdGl2ZUFuY2hvcik7XG5cbiAgICAgICAgICAgICAgICAvLyBVc2luZyBzZXRUaW1lb3V0ICsgZGVsYXkgYmVjYXVzZTpcbiAgICAgICAgICAgICAgICAvLyBXZSBtYXkgYWN0dWFsbHkgYmUgZGlzcGxheWluZyB0aGUgYW5jaG9yIGZvcm0sIHdoaWNoIHNob3VsZCBiZSBjb250cm9sbGVkIGJ5IGRlbGF5XG4gICAgICAgICAgICAgICAgdGhpcy5iYXNlLmRlbGF5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFjdGl2ZUFuY2hvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG9wdHMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGFjdGl2ZUFuY2hvci5hdHRyaWJ1dGVzLmhyZWYudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiBhY3RpdmVBbmNob3IuZ2V0QXR0cmlidXRlKCd0YXJnZXQnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidXR0b25DbGFzczogYWN0aXZlQW5jaG9yLmdldEF0dHJpYnV0ZSgnY2xhc3MnKVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuY2hvckV4dGVuc2lvbi5zaG93Rm9ybShvcHRzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZUFuY2hvciA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmhpZGVQcmV2aWV3KCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaGFuZGxlQW5jaG9yTW91c2VvdXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuYW5jaG9yVG9QcmV2aWV3ID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMub2ZmKHRoaXMuYWN0aXZlQW5jaG9yLCAnbW91c2VvdXQnLCB0aGlzLmluc3RhbmNlSGFuZGxlQW5jaG9yTW91c2VvdXQpO1xuICAgICAgICAgICAgdGhpcy5pbnN0YW5jZUhhbmRsZUFuY2hvck1vdXNlb3V0ID0gbnVsbDtcbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVFZGl0YWJsZU1vdXNlb3ZlcjogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICB2YXIgdGFyZ2V0ID0gTWVkaXVtRWRpdG9yLnV0aWwuZ2V0Q2xvc2VzdFRhZyhldmVudC50YXJnZXQsICdhJyk7XG5cbiAgICAgICAgICAgIGlmIChmYWxzZSA9PT0gdGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEZXRlY3QgZW1wdHkgaHJlZiBhdHRyaWJ1dGVzXG4gICAgICAgICAgICAvLyBUaGUgYnJvd3NlciB3aWxsIG1ha2UgaHJlZj1cIlwiIG9yIGhyZWY9XCIjdG9wXCJcbiAgICAgICAgICAgIC8vIGludG8gYWJzb2x1dGUgdXJscyB3aGVuIGFjY2Vzc2VkIGFzIGV2ZW50LnRhcmdldC5ocmVmLCBzbyBjaGVjayB0aGUgaHRtbFxuICAgICAgICAgICAgaWYgKCF0aGlzLnNob3dPbkVtcHR5TGlua3MgJiZcbiAgICAgICAgICAgICAgICAoIS9ocmVmPVtcIiddXFxTK1tcIiddLy50ZXN0KHRhcmdldC5vdXRlckhUTUwpIHx8IC9ocmVmPVtcIiddI1xcUytbXCInXS8udGVzdCh0YXJnZXQub3V0ZXJIVE1MKSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gb25seSBzaG93IHdoZW4gdG9vbGJhciBpcyBub3QgcHJlc2VudFxuICAgICAgICAgICAgdmFyIHRvb2xiYXIgPSB0aGlzLmJhc2UuZ2V0RXh0ZW5zaW9uQnlOYW1lKCd0b29sYmFyJyk7XG4gICAgICAgICAgICBpZiAoIXRoaXMuc2hvd1doZW5Ub29sYmFySXNWaXNpYmxlICYmIHRvb2xiYXIgJiYgdG9vbGJhci5pc0Rpc3BsYXllZCAmJiB0b29sYmFyLmlzRGlzcGxheWVkKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZGV0YWNoIGhhbmRsZXIgZm9yIG90aGVyIGFuY2hvciBpbiBjYXNlIHdlIGhvdmVyZWQgbXVsdGlwbGUgYW5jaG9ycyBxdWlja2x5XG4gICAgICAgICAgICBpZiAodGhpcy5hY3RpdmVBbmNob3IgJiYgdGhpcy5hY3RpdmVBbmNob3IgIT09IHRhcmdldCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZGV0YWNoUHJldmlld0hhbmRsZXJzKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuYW5jaG9yVG9QcmV2aWV3ID0gdGFyZ2V0O1xuXG4gICAgICAgICAgICB0aGlzLmluc3RhbmNlSGFuZGxlQW5jaG9yTW91c2VvdXQgPSB0aGlzLmhhbmRsZUFuY2hvck1vdXNlb3V0LmJpbmQodGhpcyk7XG4gICAgICAgICAgICB0aGlzLm9uKHRoaXMuYW5jaG9yVG9QcmV2aWV3LCAnbW91c2VvdXQnLCB0aGlzLmluc3RhbmNlSGFuZGxlQW5jaG9yTW91c2VvdXQpO1xuICAgICAgICAgICAgLy8gVXNpbmcgc2V0VGltZW91dCArIGRlbGF5IGJlY2F1c2U6XG4gICAgICAgICAgICAvLyAtIFdlJ3JlIGdvaW5nIHRvIHNob3cgdGhlIGFuY2hvciBwcmV2aWV3IGFjY29yZGluZyB0byB0aGUgY29uZmlndXJlZCBkZWxheVxuICAgICAgICAgICAgLy8gICBpZiB0aGUgbW91c2UgaGFzIG5vdCBsZWZ0IHRoZSBhbmNob3IgdGFnIGluIHRoYXQgdGltZVxuICAgICAgICAgICAgdGhpcy5iYXNlLmRlbGF5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hbmNob3JUb1ByZXZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zaG93UHJldmlldyh0aGlzLmFuY2hvclRvUHJldmlldyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVQcmV2aWV3TW91c2VvdmVyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmxhc3RPdmVyID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcbiAgICAgICAgICAgIHRoaXMuaG92ZXJpbmcgPSB0cnVlO1xuICAgICAgICB9LFxuXG4gICAgICAgIGhhbmRsZVByZXZpZXdNb3VzZW91dDogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBpZiAoIWV2ZW50LnJlbGF0ZWRUYXJnZXQgfHwgIS9hbmNob3ItcHJldmlldy8udGVzdChldmVudC5yZWxhdGVkVGFyZ2V0LmNsYXNzTmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhvdmVyaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgdXBkYXRlUHJldmlldzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaG92ZXJpbmcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBkdXJyID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKSAtIHRoaXMubGFzdE92ZXI7XG4gICAgICAgICAgICBpZiAoZHVyciA+IHRoaXMuaGlkZURlbGF5KSB7XG4gICAgICAgICAgICAgICAgLy8gaGlkZSB0aGUgcHJldmlldyAxLzIgc2Vjb25kIGFmdGVyIG1vdXNlIGxlYXZlcyB0aGUgbGlua1xuICAgICAgICAgICAgICAgIHRoaXMuZGV0YWNoUHJldmlld0hhbmRsZXJzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGV0YWNoUHJldmlld0hhbmRsZXJzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBjbGVhbnVwXG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMuaW50ZXJ2YWxUaW1lcik7XG4gICAgICAgICAgICBpZiAodGhpcy5pbnN0YW5jZUhhbmRsZVByZXZpZXdNb3VzZW92ZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9mZih0aGlzLmFuY2hvclByZXZpZXcsICdtb3VzZW92ZXInLCB0aGlzLmluc3RhbmNlSGFuZGxlUHJldmlld01vdXNlb3Zlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5vZmYodGhpcy5hbmNob3JQcmV2aWV3LCAnbW91c2VvdXQnLCB0aGlzLmluc3RhbmNlSGFuZGxlUHJldmlld01vdXNlb3V0KTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hY3RpdmVBbmNob3IpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vZmYodGhpcy5hY3RpdmVBbmNob3IsICdtb3VzZW92ZXInLCB0aGlzLmluc3RhbmNlSGFuZGxlUHJldmlld01vdXNlb3Zlcik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub2ZmKHRoaXMuYWN0aXZlQW5jaG9yLCAnbW91c2VvdXQnLCB0aGlzLmluc3RhbmNlSGFuZGxlUHJldmlld01vdXNlb3V0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuaGlkZVByZXZpZXcoKTtcblxuICAgICAgICAgICAgdGhpcy5ob3ZlcmluZyA9IHRoaXMuaW5zdGFuY2VIYW5kbGVQcmV2aWV3TW91c2VvdmVyID0gdGhpcy5pbnN0YW5jZUhhbmRsZVByZXZpZXdNb3VzZW91dCA9IG51bGw7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gVE9ETzogYnJlYWsgdXAgbWV0aG9kIGFuZCBleHRyYWN0IG91dCBoYW5kbGVyc1xuICAgICAgICBhdHRhY2hQcmV2aWV3SGFuZGxlcnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMubGFzdE92ZXIgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgdGhpcy5ob3ZlcmluZyA9IHRydWU7XG5cbiAgICAgICAgICAgIHRoaXMuaW5zdGFuY2VIYW5kbGVQcmV2aWV3TW91c2VvdmVyID0gdGhpcy5oYW5kbGVQcmV2aWV3TW91c2VvdmVyLmJpbmQodGhpcyk7XG4gICAgICAgICAgICB0aGlzLmluc3RhbmNlSGFuZGxlUHJldmlld01vdXNlb3V0ID0gdGhpcy5oYW5kbGVQcmV2aWV3TW91c2VvdXQuYmluZCh0aGlzKTtcblxuICAgICAgICAgICAgdGhpcy5pbnRlcnZhbFRpbWVyID0gc2V0SW50ZXJ2YWwodGhpcy51cGRhdGVQcmV2aWV3LmJpbmQodGhpcyksIDIwMCk7XG5cbiAgICAgICAgICAgIHRoaXMub24odGhpcy5hbmNob3JQcmV2aWV3LCAnbW91c2VvdmVyJywgdGhpcy5pbnN0YW5jZUhhbmRsZVByZXZpZXdNb3VzZW92ZXIpO1xuICAgICAgICAgICAgdGhpcy5vbih0aGlzLmFuY2hvclByZXZpZXcsICdtb3VzZW91dCcsIHRoaXMuaW5zdGFuY2VIYW5kbGVQcmV2aWV3TW91c2VvdXQpO1xuICAgICAgICAgICAgdGhpcy5vbih0aGlzLmFjdGl2ZUFuY2hvciwgJ21vdXNlb3ZlcicsIHRoaXMuaW5zdGFuY2VIYW5kbGVQcmV2aWV3TW91c2VvdmVyKTtcbiAgICAgICAgICAgIHRoaXMub24odGhpcy5hY3RpdmVBbmNob3IsICdtb3VzZW91dCcsIHRoaXMuaW5zdGFuY2VIYW5kbGVQcmV2aWV3TW91c2VvdXQpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBNZWRpdW1FZGl0b3IuZXh0ZW5zaW9ucy5hbmNob3JQcmV2aWV3ID0gQW5jaG9yUHJldmlldztcbn0oKSk7XG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIFdISVRFU1BBQ0VfQ0hBUlMsXG4gICAgICAgIEtOT1dOX1RMRFNfRlJBR01FTlQsXG4gICAgICAgIExJTktfUkVHRVhQX1RFWFQsXG4gICAgICAgIEtOT1dOX1RMRFNfUkVHRVhQLFxuICAgICAgICBMSU5LX1JFR0VYUDtcblxuICAgIFdISVRFU1BBQ0VfQ0hBUlMgPSBbJyAnLCAnXFx0JywgJ1xcbicsICdcXHInLCAnXFx1MDBBMCcsICdcXHUyMDAwJywgJ1xcdTIwMDEnLCAnXFx1MjAwMicsICdcXHUyMDAzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdcXHUyMDI4JywgJ1xcdTIwMjknXTtcbiAgICBLTk9XTl9UTERTX0ZSQUdNRU5UID0gJ2NvbXxuZXR8b3JnfGVkdXxnb3Z8bWlsfGFlcm98YXNpYXxiaXp8Y2F0fGNvb3B8aW5mb3xpbnR8am9ic3xtb2JpfG11c2V1bXxuYW1lfHBvc3R8cHJvfHRlbHx0cmF2ZWx8JyArXG4gICAgICAgICd4eHh8YWN8YWR8YWV8YWZ8YWd8YWl8YWx8YW18YW58YW98YXF8YXJ8YXN8YXR8YXV8YXd8YXh8YXp8YmF8YmJ8YmR8YmV8YmZ8Ymd8Ymh8Yml8Ymp8Ym18Ym58Ym98YnJ8YnN8YnR8YnZ8Ynd8Ynl8JyArXG4gICAgICAgICdienxjYXxjY3xjZHxjZnxjZ3xjaHxjaXxja3xjbHxjbXxjbnxjb3xjcnxjc3xjdXxjdnxjeHxjeXxjenxkZHxkZXxkanxka3xkbXxkb3xkenxlY3xlZXxlZ3xlaHxlcnxlc3xldHxldXxmaXxmanwnICtcbiAgICAgICAgJ2ZrfGZtfGZvfGZyfGdhfGdifGdkfGdlfGdmfGdnfGdofGdpfGdsfGdtfGdufGdwfGdxfGdyfGdzfGd0fGd1fGd3fGd5fGhrfGhtfGhufGhyfGh0fGh1fGlkfGllfGlsfGltfGlufGlvfGlxfGlyfCcgK1xuICAgICAgICAnaXN8aXR8amV8am18am98anB8a2V8a2d8a2h8a2l8a218a258a3B8a3J8a3d8a3l8a3p8bGF8bGJ8bGN8bGl8bGt8bHJ8bHN8bHR8bHV8bHZ8bHl8bWF8bWN8bWR8bWV8bWd8bWh8bWt8bWx8bW18JyArXG4gICAgICAgICdtbnxtb3xtcHxtcXxtcnxtc3xtdHxtdXxtdnxtd3xteHxteXxtenxuYXxuY3xuZXxuZnxuZ3xuaXxubHxub3xucHxucnxudXxuenxvbXxwYXxwZXxwZnxwZ3xwaHxwa3xwbHxwbXxwbnxwcnxwc3wnICtcbiAgICAgICAgJ3B0fHB3fHB5fHFhfHJlfHJvfHJzfHJ1fHJ3fHNhfHNifHNjfHNkfHNlfHNnfHNofHNpfHNqfGphfHNrfHNsfHNtfHNufHNvfHNyfHNzfHN0fHN1fHN2fHN4fHN5fHN6fHRjfHRkfHRmfHRnfHRofCcgK1xuICAgICAgICAndGp8dGt8dGx8dG18dG58dG98dHB8dHJ8dHR8dHZ8dHd8dHp8dWF8dWd8dWt8dXN8dXl8dXp8dmF8dmN8dmV8dmd8dml8dm58dnV8d2Z8d3N8eWV8eXR8eXV8emF8em18encnO1xuXG4gICAgTElOS19SRUdFWFBfVEVYVCA9XG4gICAgICAgICcoJyArXG4gICAgICAgIC8vIFZlcnNpb24gb2YgR3J1YmVyIFVSTCBSZWdleHAgb3B0aW1pemVkIGZvciBKUzogaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMTc3MzM2NDBcbiAgICAgICAgJygoPzooaHR0cHM/Oi8vfGZ0cHM/Oi8vfG5udHA6Ly8pfHd3d1xcXFxkezAsM31bLl18W2EtejAtOS5cXFxcLV0rWy5dKCcgKyBLTk9XTl9UTERTX0ZSQUdNRU5UICsgJylcXFxcXFwvKVxcXFxTKyg/OlteXFxcXHNgIVxcXFxbXFxcXF17fTs6XFwnXFxcIi4sP1xcdTAwQUJcXHUwMEJCXFx1MjAxQ1xcdTIwMURcXHUyMDE4XFx1MjAxOV0pKScgK1xuICAgICAgICAvLyBBZGRpdGlvbiB0byBhYm92ZSBSZWdleHAgdG8gc3VwcG9ydCBiYXJlIGRvbWFpbnMvb25lIGxldmVsIHN1YmRvbWFpbnMgd2l0aCBjb21tb24gbm9uLWkxOG4gVExEcyBhbmQgd2l0aG91dCB3d3cgcHJlZml4OlxuICAgICAgICAnKXwoKFthLXowLTlcXFxcLV0rXFxcXC4pP1thLXowLTlcXFxcLV0rXFxcXC4oJyArIEtOT1dOX1RMRFNfRlJBR01FTlQgKyAnKSknO1xuXG4gICAgS05PV05fVExEU19SRUdFWFAgPSBuZXcgUmVnRXhwKCdeKCcgKyBLTk9XTl9UTERTX0ZSQUdNRU5UICsgJykkJywgJ2knKTtcblxuICAgIExJTktfUkVHRVhQID0gbmV3IFJlZ0V4cChMSU5LX1JFR0VYUF9URVhULCAnZ2knKTtcblxuICAgIGZ1bmN0aW9uIG5vZGVJc05vdEluc2lkZUFuY2hvclRhZyhub2RlKSB7XG4gICAgICAgIHJldHVybiAhTWVkaXVtRWRpdG9yLnV0aWwuZ2V0Q2xvc2VzdFRhZyhub2RlLCAnYScpO1xuICAgIH1cblxuICAgIHZhciBBdXRvTGluayA9IE1lZGl1bUVkaXRvci5FeHRlbnNpb24uZXh0ZW5kKHtcbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgTWVkaXVtRWRpdG9yLkV4dGVuc2lvbi5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgICAgICAgICB0aGlzLmRpc2FibGVFdmVudEhhbmRsaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnN1YnNjcmliZSgnZWRpdGFibGVLZXlwcmVzcycsIHRoaXMub25LZXlwcmVzcy5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIHRoaXMuc3Vic2NyaWJlKCdlZGl0YWJsZUJsdXInLCB0aGlzLm9uQmx1ci5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIC8vIE1TIElFIGhhcyBpdCdzIG93biBhdXRvLVVSTCBkZXRlY3QgZmVhdHVyZSBidXQgb3VycyBpcyBiZXR0ZXIgaW4gc29tZSB3YXlzLiBCZSBjb25zaXN0ZW50LlxuICAgICAgICAgICAgdGhpcy5kb2N1bWVudC5leGVjQ29tbWFuZCgnQXV0b1VybERldGVjdCcsIGZhbHNlLCBmYWxzZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNMYXN0SW5zdGFuY2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhY3RpdmVJbnN0YW5jZXMgPSAwO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLndpbmRvdy5fbWVkaXVtRWRpdG9ycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBlZGl0b3IgPSB0aGlzLndpbmRvdy5fbWVkaXVtRWRpdG9yc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAoZWRpdG9yICE9PSBudWxsICYmIGVkaXRvci5nZXRFeHRlbnNpb25CeU5hbWUoJ2F1dG9MaW5rJykgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBhY3RpdmVJbnN0YW5jZXMrKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYWN0aXZlSW5zdGFuY2VzID09PSAxO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRlc3Ryb3k6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIFR1cm4gQXV0b1VybERldGVjdCBiYWNrIG9uXG4gICAgICAgICAgICBpZiAodGhpcy5kb2N1bWVudC5xdWVyeUNvbW1hbmRTdXBwb3J0ZWQoJ0F1dG9VcmxEZXRlY3QnKSAmJiB0aGlzLmlzTGFzdEluc3RhbmNlKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRvY3VtZW50LmV4ZWNDb21tYW5kKCdBdXRvVXJsRGV0ZWN0JywgZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIG9uQmx1cjogZnVuY3Rpb24gKGJsdXJFdmVudCwgZWRpdGFibGUpIHtcbiAgICAgICAgICAgIHRoaXMucGVyZm9ybUxpbmtpbmcoZWRpdGFibGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uS2V5cHJlc3M6IGZ1bmN0aW9uIChrZXlQcmVzc0V2ZW50KSB7XG4gICAgICAgICAgICBpZiAodGhpcy5kaXNhYmxlRXZlbnRIYW5kbGluZykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKE1lZGl1bUVkaXRvci51dGlsLmlzS2V5KGtleVByZXNzRXZlbnQsIFtNZWRpdW1FZGl0b3IudXRpbC5rZXlDb2RlLlNQQUNFLCBNZWRpdW1FZGl0b3IudXRpbC5rZXlDb2RlLkVOVEVSXSkpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5wZXJmb3JtTGlua2luZ1RpbWVvdXQpO1xuICAgICAgICAgICAgICAgIC8vIFNhdmluZy9yZXN0b3JpbmcgdGhlIHNlbGVjdGlvbiBpbiB0aGUgbWlkZGxlIG9mIGEga2V5cHJlc3MgZG9lc24ndCB3b3JrIHdlbGwuLi5cbiAgICAgICAgICAgICAgICB0aGlzLnBlcmZvcm1MaW5raW5nVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNlbCA9IHRoaXMuYmFzZS5leHBvcnRTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnBlcmZvcm1MaW5raW5nKGtleVByZXNzRXZlbnQudGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHBhc3MgdHJ1ZSBmb3IgZmF2b3JMYXRlclNlbGVjdGlvbkFuY2hvciAtIHRoaXMgaXMgbmVlZGVkIGZvciBsaW5rcyBhdCB0aGUgZW5kIG9mIGFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBwYXJhZ3JhcGggaW4gTVMgSUUsIG9yIE1TIElFIGNhdXNlcyB0aGUgbGluayB0byBiZSBkZWxldGVkIHJpZ2h0IGFmdGVyIGFkZGluZyBpdC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJhc2UuaW1wb3J0U2VsZWN0aW9uKHNlbCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh3aW5kb3cuY29uc29sZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5jb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcGVyZm9ybSBsaW5raW5nJywgZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRpc2FibGVFdmVudEhhbmRsaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgcGVyZm9ybUxpbmtpbmc6IGZ1bmN0aW9uIChjb250ZW50ZWRpdGFibGUpIHtcbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICBQZXJmb3JtIGxpbmtpbmcgb24gYmxvY2tFbGVtZW50IGJhc2lzLCBibG9ja0VsZW1lbnRzIGFyZSBIVE1MIGVsZW1lbnRzIHdpdGggdGV4dCBjb250ZW50IGFuZCB3aXRob3V0XG4gICAgICAgICAgICBjaGlsZCBlbGVtZW50LlxuXG4gICAgICAgICAgICBFeGFtcGxlOlxuICAgICAgICAgICAgLSBIVE1MIGNvbnRlbnRcbiAgICAgICAgICAgIDxibG9ja3F1b3RlPlxuICAgICAgICAgICAgICA8cD5saW5rLjwvcD5cbiAgICAgICAgICAgICAgPHA+bXk8L3A+XG4gICAgICAgICAgICA8L2Jsb2NrcXVvdGU+XG5cbiAgICAgICAgICAgIC0gYmxvY2tFbGVtZW50c1xuICAgICAgICAgICAgWzxwPmxpbmsuPC9wPiwgPHA+bXk8L3A+XVxuXG4gICAgICAgICAgICBvdGhlcndpc2UgdGhlIGRldGVjdGlvbiBjYW4gd3JvbmdseSBmaW5kIHRoZSBlbmQgb2Ygb25lIHBhcmFncmFwaCBhbmQgdGhlIGJlZ2lubmluZyBvZiBhbm90aGVyIHBhcmFncmFwaFxuICAgICAgICAgICAgdG8gY29uc3RpdHV0ZSBhIGxpbmssIHN1Y2ggYXMgYSBwYXJhZ3JhcGggZW5kaW5nIFwibGluay5cIiBhbmQgdGhlIG5leHQgcGFyYWdyYXBoIGJlZ2lubmluZyB3aXRoIFwibXlcIiBpc1xuICAgICAgICAgICAgaW50ZXJwcmV0ZWQgaW50byBcImxpbmsubXlcIiBhbmQgdGhlIGNvZGUgdHJpZXMgdG8gY3JlYXRlIGEgbGluayBhY3Jvc3MgYmxvY2tFbGVtZW50cyAtIHdoaWNoIGRvZXNuJ3Qgd29ya1xuICAgICAgICAgICAgYW5kIGlzIHRlcnJpYmxlLlxuICAgICAgICAgICAgKE1lZGl1bSBkZWxldGVzIHRoZSBzcGFjZXMvcmV0dXJucyBiZXR3ZWVuIFAgdGFncyBzbyB0aGUgdGV4dENvbnRlbnQgZW5kcyB1cCB3aXRob3V0IHBhcmFncmFwaCBzcGFjaW5nKVxuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHZhciBibG9ja0VsZW1lbnRzID0gTWVkaXVtRWRpdG9yLnV0aWwuc3BsaXRCeUJsb2NrRWxlbWVudHMoY29udGVudGVkaXRhYmxlKSxcbiAgICAgICAgICAgICAgICBkb2N1bWVudE1vZGlmaWVkID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAoYmxvY2tFbGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBibG9ja0VsZW1lbnRzID0gW2NvbnRlbnRlZGl0YWJsZV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJsb2NrRWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudE1vZGlmaWVkID0gdGhpcy5yZW1vdmVPYnNvbGV0ZUF1dG9MaW5rU3BhbnMoYmxvY2tFbGVtZW50c1tpXSkgfHwgZG9jdW1lbnRNb2RpZmllZDtcbiAgICAgICAgICAgICAgICBkb2N1bWVudE1vZGlmaWVkID0gdGhpcy5wZXJmb3JtTGlua2luZ1dpdGhpbkVsZW1lbnQoYmxvY2tFbGVtZW50c1tpXSkgfHwgZG9jdW1lbnRNb2RpZmllZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuYmFzZS5ldmVudHMudXBkYXRlSW5wdXQoY29udGVudGVkaXRhYmxlLCB7IHRhcmdldDogY29udGVudGVkaXRhYmxlLCBjdXJyZW50VGFyZ2V0OiBjb250ZW50ZWRpdGFibGUgfSk7XG4gICAgICAgICAgICByZXR1cm4gZG9jdW1lbnRNb2RpZmllZDtcbiAgICAgICAgfSxcblxuICAgICAgICByZW1vdmVPYnNvbGV0ZUF1dG9MaW5rU3BhbnM6IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgICAgICBpZiAoIWVsZW1lbnQgfHwgZWxlbWVudC5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHNwYW5zID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCdzcGFuW2RhdGEtYXV0by1saW5rPVwidHJ1ZVwiXScpLFxuICAgICAgICAgICAgICAgIGRvY3VtZW50TW9kaWZpZWQgPSBmYWxzZTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzcGFucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciB0ZXh0Q29udGVudCA9IHNwYW5zW2ldLnRleHRDb250ZW50O1xuICAgICAgICAgICAgICAgIGlmICh0ZXh0Q29udGVudC5pbmRleE9mKCc6Ly8nKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGV4dENvbnRlbnQgPSBNZWRpdW1FZGl0b3IudXRpbC5lbnN1cmVVcmxIYXNQcm90b2NvbCh0ZXh0Q29udGVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzcGFuc1tpXS5nZXRBdHRyaWJ1dGUoJ2RhdGEtaHJlZicpICE9PSB0ZXh0Q29udGVudCAmJiBub2RlSXNOb3RJbnNpZGVBbmNob3JUYWcoc3BhbnNbaV0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50TW9kaWZpZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdHJpbW1lZFRleHRDb250ZW50ID0gdGV4dENvbnRlbnQucmVwbGFjZSgvXFxzKyQvLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzcGFuc1tpXS5nZXRBdHRyaWJ1dGUoJ2RhdGEtaHJlZicpID09PSB0cmltbWVkVGV4dENvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjaGFyYWN0ZXJzVHJpbW1lZCA9IHRleHRDb250ZW50Lmxlbmd0aCAtIHRyaW1tZWRUZXh0Q29udGVudC5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VidHJlZSA9IE1lZGl1bUVkaXRvci51dGlsLnNwbGl0T2ZmRE9NVHJlZShzcGFuc1tpXSwgdGhpcy5zcGxpdFRleHRCZWZvcmVFbmQoc3BhbnNbaV0sIGNoYXJhY3RlcnNUcmltbWVkKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzcGFuc1tpXS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShzdWJ0cmVlLCBzcGFuc1tpXS5uZXh0U2libGluZyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTb21lIGVkaXRpbmcgaGFzIGhhcHBlbmVkIHRvIHRoZSBzcGFuLCBzbyBqdXN0IHJlbW92ZSBpdCBlbnRpcmVseS4gVGhlIHVzZXIgY2FuIHB1dCBpdCBiYWNrXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhcm91bmQganVzdCB0aGUgaHJlZiBjb250ZW50IGlmIHRoZXkgbmVlZCB0byBwcmV2ZW50IGl0IGZyb20gbGlua2luZ1xuICAgICAgICAgICAgICAgICAgICAgICAgTWVkaXVtRWRpdG9yLnV0aWwudW53cmFwKHNwYW5zW2ldLCB0aGlzLmRvY3VtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBkb2N1bWVudE1vZGlmaWVkO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNwbGl0VGV4dEJlZm9yZUVuZDogZnVuY3Rpb24gKGVsZW1lbnQsIGNoYXJhY3RlckNvdW50KSB7XG4gICAgICAgICAgICB2YXIgdHJlZVdhbGtlciA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlVHJlZVdhbGtlcihlbGVtZW50LCBOb2RlRmlsdGVyLlNIT1dfVEVYVCwgbnVsbCwgZmFsc2UpLFxuICAgICAgICAgICAgICAgIGxhc3RDaGlsZE5vdEV4aGF1c3RlZCA9IHRydWU7XG5cbiAgICAgICAgICAgIC8vIFN0YXJ0IHRoZSB0cmVlIHdhbGtlciBhdCB0aGUgbGFzdCBkZXNjZW5kYW50IG9mIHRoZSBzcGFuXG4gICAgICAgICAgICB3aGlsZSAobGFzdENoaWxkTm90RXhoYXVzdGVkKSB7XG4gICAgICAgICAgICAgICAgbGFzdENoaWxkTm90RXhoYXVzdGVkID0gdHJlZVdhbGtlci5sYXN0Q2hpbGQoKSAhPT0gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGN1cnJlbnROb2RlLFxuICAgICAgICAgICAgICAgIGN1cnJlbnROb2RlVmFsdWUsXG4gICAgICAgICAgICAgICAgcHJldmlvdXNOb2RlO1xuICAgICAgICAgICAgd2hpbGUgKGNoYXJhY3RlckNvdW50ID4gMCAmJiBwcmV2aW91c05vZGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50Tm9kZSA9IHRyZWVXYWxrZXIuY3VycmVudE5vZGU7XG4gICAgICAgICAgICAgICAgY3VycmVudE5vZGVWYWx1ZSA9IGN1cnJlbnROb2RlLm5vZGVWYWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudE5vZGVWYWx1ZS5sZW5ndGggPiBjaGFyYWN0ZXJDb3VudCkge1xuICAgICAgICAgICAgICAgICAgICBwcmV2aW91c05vZGUgPSBjdXJyZW50Tm9kZS5zcGxpdFRleHQoY3VycmVudE5vZGVWYWx1ZS5sZW5ndGggLSBjaGFyYWN0ZXJDb3VudCk7XG4gICAgICAgICAgICAgICAgICAgIGNoYXJhY3RlckNvdW50ID0gMDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwcmV2aW91c05vZGUgPSB0cmVlV2Fsa2VyLnByZXZpb3VzTm9kZSgpO1xuICAgICAgICAgICAgICAgICAgICBjaGFyYWN0ZXJDb3VudCAtPSBjdXJyZW50Tm9kZVZhbHVlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcHJldmlvdXNOb2RlO1xuICAgICAgICB9LFxuXG4gICAgICAgIHBlcmZvcm1MaW5raW5nV2l0aGluRWxlbWVudDogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIHZhciBtYXRjaGVzID0gdGhpcy5maW5kTGlua2FibGVUZXh0KGVsZW1lbnQpLFxuICAgICAgICAgICAgICAgIGxpbmtDcmVhdGVkID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGZvciAodmFyIG1hdGNoSW5kZXggPSAwOyBtYXRjaEluZGV4IDwgbWF0Y2hlcy5sZW5ndGg7IG1hdGNoSW5kZXgrKykge1xuICAgICAgICAgICAgICAgIHZhciBtYXRjaGluZ1RleHROb2RlcyA9IE1lZGl1bUVkaXRvci51dGlsLmZpbmRPckNyZWF0ZU1hdGNoaW5nVGV4dE5vZGVzKHRoaXMuZG9jdW1lbnQsIGVsZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVzW21hdGNoSW5kZXhdKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zaG91bGROb3RMaW5rKG1hdGNoaW5nVGV4dE5vZGVzKSkge1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVBdXRvTGluayhtYXRjaGluZ1RleHROb2RlcywgbWF0Y2hlc1ttYXRjaEluZGV4XS5ocmVmKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBsaW5rQ3JlYXRlZDtcbiAgICAgICAgfSxcblxuICAgICAgICBzaG91bGROb3RMaW5rOiBmdW5jdGlvbiAodGV4dE5vZGVzKSB7XG4gICAgICAgICAgICB2YXIgc2hvdWxkTm90TGluayA9IGZhbHNlO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0ZXh0Tm9kZXMubGVuZ3RoICYmIHNob3VsZE5vdExpbmsgPT09IGZhbHNlOyBpKyspIHtcbiAgICAgICAgICAgICAgICAvLyBEbyBub3QgbGluayBpZiB0aGUgdGV4dCBub2RlIGlzIGVpdGhlciBpbnNpZGUgYW4gYW5jaG9yIG9yIGluc2lkZSBzcGFuW2RhdGEtYXV0by1saW5rXVxuICAgICAgICAgICAgICAgIHNob3VsZE5vdExpbmsgPSAhIU1lZGl1bUVkaXRvci51dGlsLnRyYXZlcnNlVXAodGV4dE5vZGVzW2ldLCBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbm9kZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnYScgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChub2RlLmdldEF0dHJpYnV0ZSAmJiBub2RlLmdldEF0dHJpYnV0ZSgnZGF0YS1hdXRvLWxpbmsnKSA9PT0gJ3RydWUnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzaG91bGROb3RMaW5rO1xuICAgICAgICB9LFxuXG4gICAgICAgIGZpbmRMaW5rYWJsZVRleHQ6IGZ1bmN0aW9uIChjb250ZW50ZWRpdGFibGUpIHtcbiAgICAgICAgICAgIHZhciB0ZXh0Q29udGVudCA9IGNvbnRlbnRlZGl0YWJsZS50ZXh0Q29udGVudCxcbiAgICAgICAgICAgICAgICBtYXRjaCA9IG51bGwsXG4gICAgICAgICAgICAgICAgbWF0Y2hlcyA9IFtdO1xuXG4gICAgICAgICAgICB3aGlsZSAoKG1hdGNoID0gTElOS19SRUdFWFAuZXhlYyh0ZXh0Q29udGVudCkpICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1hdGNoT2sgPSB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBtYXRjaEVuZCA9IG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgICAgICAgICAgIC8vIElmIHRoZSByZWdleHAgZGV0ZWN0ZWQgc29tZXRoaW5nIGFzIGEgbGluayB0aGF0IGhhcyB0ZXh0IGltbWVkaWF0ZWx5IHByZWNlZGluZy9mb2xsb3dpbmcgaXQsIGJhaWwgb3V0LlxuICAgICAgICAgICAgICAgIG1hdGNoT2sgPSAobWF0Y2guaW5kZXggPT09IDAgfHwgV0hJVEVTUEFDRV9DSEFSUy5pbmRleE9mKHRleHRDb250ZW50W21hdGNoLmluZGV4IC0gMV0pICE9PSAtMSkgJiZcbiAgICAgICAgICAgICAgICAgICAgKG1hdGNoRW5kID09PSB0ZXh0Q29udGVudC5sZW5ndGggfHwgV0hJVEVTUEFDRV9DSEFSUy5pbmRleE9mKHRleHRDb250ZW50W21hdGNoRW5kXSkgIT09IC0xKTtcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgcmVnZXhwIGRldGVjdGVkIGEgYmFyZSBkb21haW4gdGhhdCBkb2Vzbid0IHVzZSBvbmUgb2Ygb3VyIGV4cGVjdGVkIFRMRHMsIGJhaWwgb3V0LlxuICAgICAgICAgICAgICAgIG1hdGNoT2sgPSBtYXRjaE9rICYmIChtYXRjaFswXS5pbmRleE9mKCcvJykgIT09IC0xIHx8XG4gICAgICAgICAgICAgICAgICAgIEtOT1dOX1RMRFNfUkVHRVhQLnRlc3QobWF0Y2hbMF0uc3BsaXQoJy4nKS5wb3AoKS5zcGxpdCgnPycpLnNoaWZ0KCkpKTtcblxuICAgICAgICAgICAgICAgIGlmIChtYXRjaE9rKSB7XG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBocmVmOiBtYXRjaFswXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBtYXRjaC5pbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuZDogbWF0Y2hFbmRcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1hdGNoZXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY3JlYXRlQXV0b0xpbms6IGZ1bmN0aW9uICh0ZXh0Tm9kZXMsIGhyZWYpIHtcbiAgICAgICAgICAgIGhyZWYgPSBNZWRpdW1FZGl0b3IudXRpbC5lbnN1cmVVcmxIYXNQcm90b2NvbChocmVmKTtcbiAgICAgICAgICAgIHZhciBhbmNob3IgPSBNZWRpdW1FZGl0b3IudXRpbC5jcmVhdGVMaW5rKHRoaXMuZG9jdW1lbnQsIHRleHROb2RlcywgaHJlZiwgdGhpcy5nZXRFZGl0b3JPcHRpb24oJ3RhcmdldEJsYW5rJykgPyAnX2JsYW5rJyA6IG51bGwpLFxuICAgICAgICAgICAgICAgIHNwYW4gPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgIHNwYW4uc2V0QXR0cmlidXRlKCdkYXRhLWF1dG8tbGluaycsICd0cnVlJyk7XG4gICAgICAgICAgICBzcGFuLnNldEF0dHJpYnV0ZSgnZGF0YS1ocmVmJywgaHJlZik7XG4gICAgICAgICAgICBhbmNob3IuaW5zZXJ0QmVmb3JlKHNwYW4sIGFuY2hvci5maXJzdENoaWxkKTtcbiAgICAgICAgICAgIHdoaWxlIChhbmNob3IuY2hpbGROb2Rlcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgc3Bhbi5hcHBlbmRDaGlsZChhbmNob3IuY2hpbGROb2Rlc1sxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIH0pO1xuXG4gICAgTWVkaXVtRWRpdG9yLmV4dGVuc2lvbnMuYXV0b0xpbmsgPSBBdXRvTGluaztcbn0oKSk7XG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIENMQVNTX0RSQUdfT1ZFUiA9ICdtZWRpdW0tZWRpdG9yLWRyYWdvdmVyJztcblxuICAgIGZ1bmN0aW9uIGNsZWFyQ2xhc3NOYW1lcyhlbGVtZW50KSB7XG4gICAgICAgIHZhciBlZGl0YWJsZSA9IE1lZGl1bUVkaXRvci51dGlsLmdldENvbnRhaW5lckVkaXRvckVsZW1lbnQoZWxlbWVudCksXG4gICAgICAgICAgICBleGlzdGluZyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGVkaXRhYmxlLnBhcmVudEVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLicgKyBDTEFTU19EUkFHX09WRVIpKTtcblxuICAgICAgICBleGlzdGluZy5mb3JFYWNoKGZ1bmN0aW9uIChlbCkge1xuICAgICAgICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZShDTEFTU19EUkFHX09WRVIpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB2YXIgRmlsZURyYWdnaW5nID0gTWVkaXVtRWRpdG9yLkV4dGVuc2lvbi5leHRlbmQoe1xuICAgICAgICBuYW1lOiAnZmlsZURyYWdnaW5nJyxcblxuICAgICAgICBhbGxvd2VkVHlwZXM6IFsnaW1hZ2UnXSxcblxuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBNZWRpdW1FZGl0b3IuRXh0ZW5zaW9uLnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICAgICAgICAgIHRoaXMuc3Vic2NyaWJlKCdlZGl0YWJsZURyYWcnLCB0aGlzLmhhbmRsZURyYWcuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICB0aGlzLnN1YnNjcmliZSgnZWRpdGFibGVEcm9wJywgdGhpcy5oYW5kbGVEcm9wLmJpbmQodGhpcykpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGhhbmRsZURyYWc6IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGV2ZW50LmRhdGFUcmFuc2Zlci5kcm9wRWZmZWN0ID0gJ2NvcHknO1xuXG4gICAgICAgICAgICB2YXIgdGFyZ2V0ID0gZXZlbnQudGFyZ2V0LmNsYXNzTGlzdCA/IGV2ZW50LnRhcmdldCA6IGV2ZW50LnRhcmdldC5wYXJlbnRFbGVtZW50O1xuXG4gICAgICAgICAgICAvLyBFbnN1cmUgdGhlIGNsYXNzIGdldHMgcmVtb3ZlZCBmcm9tIGFueXRoaW5nIHRoYXQgaGFkIGl0IGJlZm9yZVxuICAgICAgICAgICAgY2xlYXJDbGFzc05hbWVzKHRhcmdldCk7XG5cbiAgICAgICAgICAgIGlmIChldmVudC50eXBlID09PSAnZHJhZ292ZXInKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0LmNsYXNzTGlzdC5hZGQoQ0xBU1NfRFJBR19PVkVSKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVEcm9wOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIC8vIFByZXZlbnQgZmlsZSBmcm9tIG9wZW5pbmcgaW4gdGhlIGN1cnJlbnQgd2luZG93XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAvLyBTZWxlY3QgdGhlIGRyb3BwaW5nIHRhcmdldCwgYW5kIHNldCB0aGUgc2VsZWN0aW9uIHRvIHRoZSBlbmQgb2YgdGhlIHRhcmdldFxuICAgICAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3lhYndlL21lZGl1bS1lZGl0b3IvaXNzdWVzLzk4MFxuICAgICAgICAgICAgdGhpcy5iYXNlLnNlbGVjdEVsZW1lbnQoZXZlbnQudGFyZ2V0KTtcbiAgICAgICAgICAgIHZhciBzZWxlY3Rpb24gPSB0aGlzLmJhc2UuZXhwb3J0U2VsZWN0aW9uKCk7XG4gICAgICAgICAgICBzZWxlY3Rpb24uc3RhcnQgPSBzZWxlY3Rpb24uZW5kO1xuICAgICAgICAgICAgdGhpcy5iYXNlLmltcG9ydFNlbGVjdGlvbihzZWxlY3Rpb24pO1xuICAgICAgICAgICAgLy8gSUU5IGRvZXMgbm90IHN1cHBvcnQgdGhlIEZpbGUgQVBJLCBzbyBwcmV2ZW50IGZpbGUgZnJvbSBvcGVuaW5nIGluIHRoZSB3aW5kb3dcbiAgICAgICAgICAgIC8vIGJ1dCBhbHNvIGRvbid0IHRyeSB0byBhY3R1YWxseSBnZXQgdGhlIGZpbGVcbiAgICAgICAgICAgIGlmIChldmVudC5kYXRhVHJhbnNmZXIuZmlsZXMpIHtcbiAgICAgICAgICAgICAgICBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChldmVudC5kYXRhVHJhbnNmZXIuZmlsZXMpLmZvckVhY2goZnVuY3Rpb24gKGZpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNBbGxvd2VkRmlsZShmaWxlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGUudHlwZS5tYXRjaCgnaW1hZ2UnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW5zZXJ0SW1hZ2VGaWxlKGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSB3ZSByZW1vdmUgb3VyIGNsYXNzIGZyb20gZXZlcnl0aGluZ1xuICAgICAgICAgICAgY2xlYXJDbGFzc05hbWVzKGV2ZW50LnRhcmdldCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNBbGxvd2VkRmlsZTogZnVuY3Rpb24gKGZpbGUpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFsbG93ZWRUeXBlcy5zb21lKGZ1bmN0aW9uIChmaWxlVHlwZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhIWZpbGUudHlwZS5tYXRjaChmaWxlVHlwZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBpbnNlcnRJbWFnZUZpbGU6IGZ1bmN0aW9uIChmaWxlKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIEZpbGVSZWFkZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgZmlsZVJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgICAgICBmaWxlUmVhZGVyLnJlYWRBc0RhdGFVUkwoZmlsZSk7XG5cbiAgICAgICAgICAgIC8vIGF0dGFjaCB0aGUgb25sb2FkIGV2ZW50IGhhbmRsZXIsIG1ha2VzIGl0IGVhc2llciB0byBsaXN0ZW4gaW4gd2l0aCBqYXNtaW5lXG4gICAgICAgICAgICBmaWxlUmVhZGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIHZhciBhZGRJbWFnZUVsZW1lbnQgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuICAgICAgICAgICAgICAgIGFkZEltYWdlRWxlbWVudC5zcmMgPSBlLnRhcmdldC5yZXN1bHQ7XG4gICAgICAgICAgICAgICAgTWVkaXVtRWRpdG9yLnV0aWwuaW5zZXJ0SFRNTENvbW1hbmQodGhpcy5kb2N1bWVudCwgYWRkSW1hZ2VFbGVtZW50Lm91dGVySFRNTCk7XG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBNZWRpdW1FZGl0b3IuZXh0ZW5zaW9ucy5maWxlRHJhZ2dpbmcgPSBGaWxlRHJhZ2dpbmc7XG59KCkpO1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBLZXlib2FyZENvbW1hbmRzID0gTWVkaXVtRWRpdG9yLkV4dGVuc2lvbi5leHRlbmQoe1xuICAgICAgICBuYW1lOiAna2V5Ym9hcmQtY29tbWFuZHMnLFxuXG4gICAgICAgIC8qIEtleWJvYXJkQ29tbWFuZHMgT3B0aW9ucyAqL1xuXG4gICAgICAgIC8qIGNvbW1hbmRzOiBbQXJyYXldXG4gICAgICAgICAqIEFycmF5IG9mIG9iamVjdHMgZGVzY3JpYmluZyBlYWNoIGNvbW1hbmQgYW5kIHRoZSBjb21iaW5hdGlvbiBvZiBrZXlzIHRoYXQgd2lsbCB0cmlnZ2VyIGl0XG4gICAgICAgICAqIFJlcXVpcmVkIGZvciBlYWNoIG9iamVjdDpcbiAgICAgICAgICogICBjb21tYW5kIFtTdHJpbmddIChhcmd1bWVudCBwYXNzZWQgdG8gZWRpdG9yLmV4ZWNBY3Rpb24oKSlcbiAgICAgICAgICogICBrZXkgW1N0cmluZ10gKGtleWJvYXJkIGNoYXJhY3RlciB0aGF0IHRyaWdnZXJzIHRoaXMgY29tbWFuZClcbiAgICAgICAgICogICBtZXRhIFtib29sZWFuXSAod2hldGhlciB0aGUgY3RybC9tZXRhIGtleSBoYXMgdG8gYmUgYWN0aXZlIG9yIGluYWN0aXZlKVxuICAgICAgICAgKiAgIHNoaWZ0IFtib29sZWFuXSAod2hldGhlciB0aGUgc2hpZnQga2V5IGhhcyB0byBiZSBhY3RpdmUgb3IgaW5hY3RpdmUpXG4gICAgICAgICAqICAgYWx0IFtib29sZWFuXSAod2hldGhlciB0aGUgYWx0IGtleSBoYXMgdG8gYmUgYWN0aXZlIG9yIGluYWN0aXZlKVxuICAgICAgICAgKi9cbiAgICAgICAgY29tbWFuZHM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb21tYW5kOiAnYm9sZCcsXG4gICAgICAgICAgICAgICAga2V5OiAnQicsXG4gICAgICAgICAgICAgICAgbWV0YTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaGlmdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWx0OiBmYWxzZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb21tYW5kOiAnaXRhbGljJyxcbiAgICAgICAgICAgICAgICBrZXk6ICdJJyxcbiAgICAgICAgICAgICAgICBtZXRhOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNoaWZ0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhbHQ6IGZhbHNlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbW1hbmQ6ICd1bmRlcmxpbmUnLFxuICAgICAgICAgICAgICAgIGtleTogJ1UnLFxuICAgICAgICAgICAgICAgIG1ldGE6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hpZnQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFsdDogZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSxcblxuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBNZWRpdW1FZGl0b3IuRXh0ZW5zaW9uLnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICAgICAgICAgIHRoaXMuc3Vic2NyaWJlKCdlZGl0YWJsZUtleWRvd24nLCB0aGlzLmhhbmRsZUtleWRvd24uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICB0aGlzLmtleXMgPSB7fTtcbiAgICAgICAgICAgIHRoaXMuY29tbWFuZHMuZm9yRWFjaChmdW5jdGlvbiAoY29tbWFuZCkge1xuICAgICAgICAgICAgICAgIHZhciBrZXlDb2RlID0gY29tbWFuZC5rZXkuY2hhckNvZGVBdCgwKTtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMua2V5c1trZXlDb2RlXSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmtleXNba2V5Q29kZV0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5rZXlzW2tleUNvZGVdLnB1c2goY29tbWFuZCk7XG4gICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVLZXlkb3duOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHZhciBrZXlDb2RlID0gTWVkaXVtRWRpdG9yLnV0aWwuZ2V0S2V5Q29kZShldmVudCk7XG4gICAgICAgICAgICBpZiAoIXRoaXMua2V5c1trZXlDb2RlXSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGlzTWV0YSA9IE1lZGl1bUVkaXRvci51dGlsLmlzTWV0YUN0cmxLZXkoZXZlbnQpLFxuICAgICAgICAgICAgICAgIGlzU2hpZnQgPSAhIWV2ZW50LnNoaWZ0S2V5LFxuICAgICAgICAgICAgICAgIGlzQWx0ID0gISFldmVudC5hbHRLZXk7XG5cbiAgICAgICAgICAgIHRoaXMua2V5c1trZXlDb2RlXS5mb3JFYWNoKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEubWV0YSA9PT0gaXNNZXRhICYmXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuc2hpZnQgPT09IGlzU2hpZnQgJiZcbiAgICAgICAgICAgICAgICAgICAgKGRhdGEuYWx0ID09PSBpc0FsdCB8fFxuICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkID09PSBkYXRhLmFsdCkpIHsgLy8gVE9ETyBkZXByZWNhdGVkOiByZW1vdmUgY2hlY2sgZm9yIHVuZGVmaW5lZCA9PT0gZGF0YS5hbHQgd2hlbiBqdW1waW5nIHRvIDYuMC4wXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbW1hbmQgY2FuIGJlIGEgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGRhdGEuY29tbWFuZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5jb21tYW5kLmFwcGx5KHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbW1hbmQgY2FuIGJlIGZhbHNlIHNvIHRoZSBzaG9ydGN1dCBpcyBqdXN0IGRpc2FibGVkXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGZhbHNlICE9PSBkYXRhLmNvbW1hbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZXhlY0FjdGlvbihkYXRhLmNvbW1hbmQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIE1lZGl1bUVkaXRvci5leHRlbnNpb25zLmtleWJvYXJkQ29tbWFuZHMgPSBLZXlib2FyZENvbW1hbmRzO1xufSgpKTtcblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgRm9udE5hbWVGb3JtID0gTWVkaXVtRWRpdG9yLmV4dGVuc2lvbnMuZm9ybS5leHRlbmQoe1xuXG4gICAgICAgIG5hbWU6ICdmb250bmFtZScsXG4gICAgICAgIGFjdGlvbjogJ2ZvbnROYW1lJyxcbiAgICAgICAgYXJpYTogJ2NoYW5nZSBmb250IG5hbWUnLFxuICAgICAgICBjb250ZW50RGVmYXVsdDogJyYjeEIxOycsIC8vIMKxXG4gICAgICAgIGNvbnRlbnRGQTogJzxpIGNsYXNzPVwiZmEgZmEtZm9udFwiPjwvaT4nLFxuXG4gICAgICAgIGZvbnRzOiBbJycsICdBcmlhbCcsICdWZXJkYW5hJywgJ1RpbWVzIE5ldyBSb21hbiddLFxuXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIE1lZGl1bUVkaXRvci5leHRlbnNpb25zLmZvcm0ucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBDYWxsZWQgd2hlbiB0aGUgYnV0dG9uIHRoZSB0b29sYmFyIGlzIGNsaWNrZWRcbiAgICAgICAgLy8gT3ZlcnJpZGVzIEJ1dHRvbkV4dGVuc2lvbi5oYW5kbGVDbGlja1xuICAgICAgICBoYW5kbGVDbGljazogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cbiAgICAgICAgICAgIGlmICghdGhpcy5pc0Rpc3BsYXllZCgpKSB7XG4gICAgICAgICAgICAgICAgLy8gR2V0IEZvbnROYW1lIG9mIGN1cnJlbnQgc2VsZWN0aW9uIChjb252ZXJ0IHRvIHN0cmluZyBzaW5jZSBJRSByZXR1cm5zIHRoaXMgYXMgbnVtYmVyKVxuICAgICAgICAgICAgICAgIHZhciBmb250TmFtZSA9IHRoaXMuZG9jdW1lbnQucXVlcnlDb21tYW5kVmFsdWUoJ2ZvbnROYW1lJykgKyAnJztcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dGb3JtKGZvbnROYW1lKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIENhbGxlZCBieSBtZWRpdW0tZWRpdG9yIHRvIGFwcGVuZCBmb3JtIHRvIHRoZSB0b29sYmFyXG4gICAgICAgIGdldEZvcm06IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5mb3JtKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5mb3JtID0gdGhpcy5jcmVhdGVGb3JtKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mb3JtO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIFVzZWQgYnkgbWVkaXVtLWVkaXRvciB3aGVuIHRoZSBkZWZhdWx0IHRvb2xiYXIgaXMgdG8gYmUgZGlzcGxheWVkXG4gICAgICAgIGlzRGlzcGxheWVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRGb3JtKCkuc3R5bGUuZGlzcGxheSA9PT0gJ2Jsb2NrJztcbiAgICAgICAgfSxcblxuICAgICAgICBoaWRlRm9ybTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5nZXRGb3JtKCkuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgICAgIHRoaXMuZ2V0U2VsZWN0KCkudmFsdWUgPSAnJztcbiAgICAgICAgfSxcblxuICAgICAgICBzaG93Rm9ybTogZnVuY3Rpb24gKGZvbnROYW1lKSB7XG4gICAgICAgICAgICB2YXIgc2VsZWN0ID0gdGhpcy5nZXRTZWxlY3QoKTtcblxuICAgICAgICAgICAgdGhpcy5iYXNlLnNhdmVTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgIHRoaXMuaGlkZVRvb2xiYXJEZWZhdWx0QWN0aW9ucygpO1xuICAgICAgICAgICAgdGhpcy5nZXRGb3JtKCkuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG4gICAgICAgICAgICB0aGlzLnNldFRvb2xiYXJQb3NpdGlvbigpO1xuXG4gICAgICAgICAgICBzZWxlY3QudmFsdWUgPSBmb250TmFtZSB8fCAnJztcbiAgICAgICAgICAgIHNlbGVjdC5mb2N1cygpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIENhbGxlZCBieSBjb3JlIHdoZW4gdGVhcmluZyBkb3duIG1lZGl1bS1lZGl0b3IgKGRlc3Ryb3kpXG4gICAgICAgIGRlc3Ryb3k6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5mb3JtKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5mb3JtLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZvcm0ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmZvcm0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5mb3JtO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIGNvcmUgbWV0aG9kc1xuXG4gICAgICAgIGRvRm9ybVNhdmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuYmFzZS5yZXN0b3JlU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICB0aGlzLmJhc2UuY2hlY2tTZWxlY3Rpb24oKTtcbiAgICAgICAgfSxcblxuICAgICAgICBkb0Zvcm1DYW5jZWw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuYmFzZS5yZXN0b3JlU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICB0aGlzLmNsZWFyRm9udE5hbWUoKTtcbiAgICAgICAgICAgIHRoaXMuYmFzZS5jaGVja1NlbGVjdGlvbigpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIGZvcm0gY3JlYXRpb24gYW5kIGV2ZW50IGhhbmRsaW5nXG4gICAgICAgIGNyZWF0ZUZvcm06IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBkb2MgPSB0aGlzLmRvY3VtZW50LFxuICAgICAgICAgICAgICAgIGZvcm0gPSBkb2MuY3JlYXRlRWxlbWVudCgnZGl2JyksXG4gICAgICAgICAgICAgICAgc2VsZWN0ID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ3NlbGVjdCcpLFxuICAgICAgICAgICAgICAgIGNsb3NlID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ2EnKSxcbiAgICAgICAgICAgICAgICBzYXZlID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ2EnKSxcbiAgICAgICAgICAgICAgICBvcHRpb247XG5cbiAgICAgICAgICAgIC8vIEZvbnQgTmFtZSBGb3JtIChkaXYpXG4gICAgICAgICAgICBmb3JtLmNsYXNzTmFtZSA9ICdtZWRpdW0tZWRpdG9yLXRvb2xiYXItZm9ybSc7XG4gICAgICAgICAgICBmb3JtLmlkID0gJ21lZGl1bS1lZGl0b3ItdG9vbGJhci1mb3JtLWZvbnRuYW1lLScgKyB0aGlzLmdldEVkaXRvcklkKCk7XG5cbiAgICAgICAgICAgIC8vIEhhbmRsZSBjbGlja3Mgb24gdGhlIGZvcm0gaXRzZWxmXG4gICAgICAgICAgICB0aGlzLm9uKGZvcm0sICdjbGljaycsIHRoaXMuaGFuZGxlRm9ybUNsaWNrLmJpbmQodGhpcykpO1xuXG4gICAgICAgICAgICAvLyBBZGQgZm9udCBuYW1lc1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGk8dGhpcy5mb250cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIG9wdGlvbiA9IGRvYy5jcmVhdGVFbGVtZW50KCdvcHRpb24nKTtcbiAgICAgICAgICAgICAgICBvcHRpb24uaW5uZXJIVE1MID0gdGhpcy5mb250c1tpXTtcbiAgICAgICAgICAgICAgICBvcHRpb24udmFsdWUgPSB0aGlzLmZvbnRzW2ldO1xuICAgICAgICAgICAgICAgIHNlbGVjdC5hcHBlbmRDaGlsZChvcHRpb24pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzZWxlY3QuY2xhc3NOYW1lID0gJ21lZGl1bS1lZGl0b3ItdG9vbGJhci1zZWxlY3QnO1xuICAgICAgICAgICAgZm9ybS5hcHBlbmRDaGlsZChzZWxlY3QpO1xuXG4gICAgICAgICAgICAvLyBIYW5kbGUgdHlwaW5nIGluIHRoZSB0ZXh0Ym94XG4gICAgICAgICAgICB0aGlzLm9uKHNlbGVjdCwgJ2NoYW5nZScsIHRoaXMuaGFuZGxlRm9udENoYW5nZS5iaW5kKHRoaXMpKTtcblxuICAgICAgICAgICAgLy8gQWRkIHNhdmUgYnV0b25cbiAgICAgICAgICAgIHNhdmUuc2V0QXR0cmlidXRlKCdocmVmJywgJyMnKTtcbiAgICAgICAgICAgIHNhdmUuY2xhc3NOYW1lID0gJ21lZGl1bS1lZGl0b3ItdG9vYmFyLXNhdmUnO1xuICAgICAgICAgICAgc2F2ZS5pbm5lckhUTUwgPSB0aGlzLmdldEVkaXRvck9wdGlvbignYnV0dG9uTGFiZWxzJykgPT09ICdmb250YXdlc29tZScgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnPGkgY2xhc3M9XCJmYSBmYS1jaGVja1wiPjwvaT4nIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyYjMTAwMDM7JztcbiAgICAgICAgICAgIGZvcm0uYXBwZW5kQ2hpbGQoc2F2ZSk7XG5cbiAgICAgICAgICAgIC8vIEhhbmRsZSBzYXZlIGJ1dHRvbiBjbGlja3MgKGNhcHR1cmUpXG4gICAgICAgICAgICB0aGlzLm9uKHNhdmUsICdjbGljaycsIHRoaXMuaGFuZGxlU2F2ZUNsaWNrLmJpbmQodGhpcyksIHRydWUpO1xuXG4gICAgICAgICAgICAvLyBBZGQgY2xvc2UgYnV0dG9uXG4gICAgICAgICAgICBjbG9zZS5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCAnIycpO1xuICAgICAgICAgICAgY2xvc2UuY2xhc3NOYW1lID0gJ21lZGl1bS1lZGl0b3ItdG9vYmFyLWNsb3NlJztcbiAgICAgICAgICAgIGNsb3NlLmlubmVySFRNTCA9IHRoaXMuZ2V0RWRpdG9yT3B0aW9uKCdidXR0b25MYWJlbHMnKSA9PT0gJ2ZvbnRhd2Vzb21lJyA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnPGkgY2xhc3M9XCJmYSBmYS10aW1lc1wiPjwvaT4nIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcmdGltZXM7JztcbiAgICAgICAgICAgIGZvcm0uYXBwZW5kQ2hpbGQoY2xvc2UpO1xuXG4gICAgICAgICAgICAvLyBIYW5kbGUgY2xvc2UgYnV0dG9uIGNsaWNrc1xuICAgICAgICAgICAgdGhpcy5vbihjbG9zZSwgJ2NsaWNrJywgdGhpcy5oYW5kbGVDbG9zZUNsaWNrLmJpbmQodGhpcykpO1xuXG4gICAgICAgICAgICByZXR1cm4gZm9ybTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRTZWxlY3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEZvcm0oKS5xdWVyeVNlbGVjdG9yKCdzZWxlY3QubWVkaXVtLWVkaXRvci10b29sYmFyLXNlbGVjdCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNsZWFyRm9udE5hbWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIE1lZGl1bUVkaXRvci5zZWxlY3Rpb24uZ2V0U2VsZWN0ZWRFbGVtZW50cyh0aGlzLmRvY3VtZW50KS5mb3JFYWNoKGZ1bmN0aW9uIChlbCkge1xuICAgICAgICAgICAgICAgIGlmIChlbC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnZm9udCcgJiYgZWwuaGFzQXR0cmlidXRlKCdmYWNlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKCdmYWNlJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaGFuZGxlRm9udENoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGZvbnQgPSB0aGlzLmdldFNlbGVjdCgpLnZhbHVlO1xuICAgICAgICAgICAgaWYgKGZvbnQgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhckZvbnROYW1lKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuZXhlY0FjdGlvbignZm9udE5hbWUnLCB7IHZhbHVlOiBmb250IH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGhhbmRsZUZvcm1DbGljazogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAvLyBtYWtlIHN1cmUgbm90IHRvIGhpZGUgZm9ybSB3aGVuIGNsaWNraW5nIGluc2lkZSB0aGUgZm9ybVxuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaGFuZGxlU2F2ZUNsaWNrOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIC8vIENsaWNraW5nIFNhdmUgLT4gY3JlYXRlIHRoZSBmb250IHNpemVcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB0aGlzLmRvRm9ybVNhdmUoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVDbG9zZUNsaWNrOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIC8vIENsaWNrIENsb3NlIC0+IGNsb3NlIHRoZSBmb3JtXG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgdGhpcy5kb0Zvcm1DYW5jZWwoKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgTWVkaXVtRWRpdG9yLmV4dGVuc2lvbnMuZm9udE5hbWUgPSBGb250TmFtZUZvcm07XG59KCkpO1xuXG4oZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBGb250U2l6ZUZvcm0gPSBNZWRpdW1FZGl0b3IuZXh0ZW5zaW9ucy5mb3JtLmV4dGVuZCh7XG5cbiAgICAgICAgbmFtZTogJ2ZvbnRzaXplJyxcbiAgICAgICAgYWN0aW9uOiAnZm9udFNpemUnLFxuICAgICAgICBhcmlhOiAnaW5jcmVhc2UvZGVjcmVhc2UgZm9udCBzaXplJyxcbiAgICAgICAgY29udGVudERlZmF1bHQ6ICcmI3hCMTsnLCAvLyDCsVxuICAgICAgICBjb250ZW50RkE6ICc8aSBjbGFzcz1cImZhIGZhLXRleHQtaGVpZ2h0XCI+PC9pPicsXG5cbiAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgTWVkaXVtRWRpdG9yLmV4dGVuc2lvbnMuZm9ybS5wcm90b3R5cGUuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIENhbGxlZCB3aGVuIHRoZSBidXR0b24gdGhlIHRvb2xiYXIgaXMgY2xpY2tlZFxuICAgICAgICAvLyBPdmVycmlkZXMgQnV0dG9uRXh0ZW5zaW9uLmhhbmRsZUNsaWNrXG4gICAgICAgIGhhbmRsZUNsaWNrOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLmlzRGlzcGxheWVkKCkpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgZm9udHNpemUgb2YgY3VycmVudCBzZWxlY3Rpb24gKGNvbnZlcnQgdG8gc3RyaW5nIHNpbmNlIElFIHJldHVybnMgdGhpcyBhcyBudW1iZXIpXG4gICAgICAgICAgICAgICAgdmFyIGZvbnRTaXplID0gdGhpcy5kb2N1bWVudC5xdWVyeUNvbW1hbmRWYWx1ZSgnZm9udFNpemUnKSArICcnO1xuICAgICAgICAgICAgICAgIHRoaXMuc2hvd0Zvcm0oZm9udFNpemUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gQ2FsbGVkIGJ5IG1lZGl1bS1lZGl0b3IgdG8gYXBwZW5kIGZvcm0gdG8gdGhlIHRvb2xiYXJcbiAgICAgICAgZ2V0Rm9ybTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmZvcm0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZvcm0gPSB0aGlzLmNyZWF0ZUZvcm0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmZvcm07XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gVXNlZCBieSBtZWRpdW0tZWRpdG9yIHdoZW4gdGhlIGRlZmF1bHQgdG9vbGJhciBpcyB0byBiZSBkaXNwbGF5ZWRcbiAgICAgICAgaXNEaXNwbGF5ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEZvcm0oKS5zdHlsZS5kaXNwbGF5ID09PSAnYmxvY2snO1xuICAgICAgICB9LFxuXG4gICAgICAgIGhpZGVGb3JtOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmdldEZvcm0oKS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICAgICAgdGhpcy5nZXRJbnB1dCgpLnZhbHVlID0gJyc7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2hvd0Zvcm06IGZ1bmN0aW9uIChmb250U2l6ZSkge1xuICAgICAgICAgICAgdmFyIGlucHV0ID0gdGhpcy5nZXRJbnB1dCgpO1xuXG4gICAgICAgICAgICB0aGlzLmJhc2Uuc2F2ZVNlbGVjdGlvbigpO1xuICAgICAgICAgICAgdGhpcy5oaWRlVG9vbGJhckRlZmF1bHRBY3Rpb25zKCk7XG4gICAgICAgICAgICB0aGlzLmdldEZvcm0oKS5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbiAgICAgICAgICAgIHRoaXMuc2V0VG9vbGJhclBvc2l0aW9uKCk7XG5cbiAgICAgICAgICAgIGlucHV0LnZhbHVlID0gZm9udFNpemUgfHwgJyc7XG4gICAgICAgICAgICBpbnB1dC5mb2N1cygpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIENhbGxlZCBieSBjb3JlIHdoZW4gdGVhcmluZyBkb3duIG1lZGl1bS1lZGl0b3IgKGRlc3Ryb3kpXG4gICAgICAgIGRlc3Ryb3k6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5mb3JtKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5mb3JtLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmZvcm0ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmZvcm0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5mb3JtO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIGNvcmUgbWV0aG9kc1xuXG4gICAgICAgIGRvRm9ybVNhdmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuYmFzZS5yZXN0b3JlU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICB0aGlzLmJhc2UuY2hlY2tTZWxlY3Rpb24oKTtcbiAgICAgICAgfSxcblxuICAgICAgICBkb0Zvcm1DYW5jZWw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuYmFzZS5yZXN0b3JlU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICB0aGlzLmNsZWFyRm9udFNpemUoKTtcbiAgICAgICAgICAgIHRoaXMuYmFzZS5jaGVja1NlbGVjdGlvbigpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIGZvcm0gY3JlYXRpb24gYW5kIGV2ZW50IGhhbmRsaW5nXG4gICAgICAgIGNyZWF0ZUZvcm06IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBkb2MgPSB0aGlzLmRvY3VtZW50LFxuICAgICAgICAgICAgICAgIGZvcm0gPSBkb2MuY3JlYXRlRWxlbWVudCgnZGl2JyksXG4gICAgICAgICAgICAgICAgaW5wdXQgPSBkb2MuY3JlYXRlRWxlbWVudCgnaW5wdXQnKSxcbiAgICAgICAgICAgICAgICBjbG9zZSA9IGRvYy5jcmVhdGVFbGVtZW50KCdhJyksXG4gICAgICAgICAgICAgICAgc2F2ZSA9IGRvYy5jcmVhdGVFbGVtZW50KCdhJyk7XG5cbiAgICAgICAgICAgIC8vIEZvbnQgU2l6ZSBGb3JtIChkaXYpXG4gICAgICAgICAgICBmb3JtLmNsYXNzTmFtZSA9ICdtZWRpdW0tZWRpdG9yLXRvb2xiYXItZm9ybSc7XG4gICAgICAgICAgICBmb3JtLmlkID0gJ21lZGl1bS1lZGl0b3ItdG9vbGJhci1mb3JtLWZvbnRzaXplLScgKyB0aGlzLmdldEVkaXRvcklkKCk7XG5cbiAgICAgICAgICAgIC8vIEhhbmRsZSBjbGlja3Mgb24gdGhlIGZvcm0gaXRzZWxmXG4gICAgICAgICAgICB0aGlzLm9uKGZvcm0sICdjbGljaycsIHRoaXMuaGFuZGxlRm9ybUNsaWNrLmJpbmQodGhpcykpO1xuXG4gICAgICAgICAgICAvLyBBZGQgZm9udCBzaXplIHNsaWRlclxuICAgICAgICAgICAgaW5wdXQuc2V0QXR0cmlidXRlKCd0eXBlJywgJ3JhbmdlJyk7XG4gICAgICAgICAgICBpbnB1dC5zZXRBdHRyaWJ1dGUoJ21pbicsICcxJyk7XG4gICAgICAgICAgICBpbnB1dC5zZXRBdHRyaWJ1dGUoJ21heCcsICc3Jyk7XG4gICAgICAgICAgICBpbnB1dC5jbGFzc05hbWUgPSAnbWVkaXVtLWVkaXRvci10b29sYmFyLWlucHV0JztcbiAgICAgICAgICAgIGZvcm0uYXBwZW5kQ2hpbGQoaW5wdXQpO1xuXG4gICAgICAgICAgICAvLyBIYW5kbGUgdHlwaW5nIGluIHRoZSB0ZXh0Ym94XG4gICAgICAgICAgICB0aGlzLm9uKGlucHV0LCAnY2hhbmdlJywgdGhpcy5oYW5kbGVTbGlkZXJDaGFuZ2UuYmluZCh0aGlzKSk7XG5cbiAgICAgICAgICAgIC8vIEFkZCBzYXZlIGJ1dG9uXG4gICAgICAgICAgICBzYXZlLnNldEF0dHJpYnV0ZSgnaHJlZicsICcjJyk7XG4gICAgICAgICAgICBzYXZlLmNsYXNzTmFtZSA9ICdtZWRpdW0tZWRpdG9yLXRvb2Jhci1zYXZlJztcbiAgICAgICAgICAgIHNhdmUuaW5uZXJIVE1MID0gdGhpcy5nZXRFZGl0b3JPcHRpb24oJ2J1dHRvbkxhYmVscycpID09PSAnZm9udGF3ZXNvbWUnID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJzxpIGNsYXNzPVwiZmEgZmEtY2hlY2tcIj48L2k+JyA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICcmIzEwMDAzOyc7XG4gICAgICAgICAgICBmb3JtLmFwcGVuZENoaWxkKHNhdmUpO1xuXG4gICAgICAgICAgICAvLyBIYW5kbGUgc2F2ZSBidXR0b24gY2xpY2tzIChjYXB0dXJlKVxuICAgICAgICAgICAgdGhpcy5vbihzYXZlLCAnY2xpY2snLCB0aGlzLmhhbmRsZVNhdmVDbGljay5iaW5kKHRoaXMpLCB0cnVlKTtcblxuICAgICAgICAgICAgLy8gQWRkIGNsb3NlIGJ1dHRvblxuICAgICAgICAgICAgY2xvc2Uuc2V0QXR0cmlidXRlKCdocmVmJywgJyMnKTtcbiAgICAgICAgICAgIGNsb3NlLmNsYXNzTmFtZSA9ICdtZWRpdW0tZWRpdG9yLXRvb2Jhci1jbG9zZSc7XG4gICAgICAgICAgICBjbG9zZS5pbm5lckhUTUwgPSB0aGlzLmdldEVkaXRvck9wdGlvbignYnV0dG9uTGFiZWxzJykgPT09ICdmb250YXdlc29tZScgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJzxpIGNsYXNzPVwiZmEgZmEtdGltZXNcIj48L2k+JyA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJnRpbWVzOyc7XG4gICAgICAgICAgICBmb3JtLmFwcGVuZENoaWxkKGNsb3NlKTtcblxuICAgICAgICAgICAgLy8gSGFuZGxlIGNsb3NlIGJ1dHRvbiBjbGlja3NcbiAgICAgICAgICAgIHRoaXMub24oY2xvc2UsICdjbGljaycsIHRoaXMuaGFuZGxlQ2xvc2VDbGljay5iaW5kKHRoaXMpKTtcblxuICAgICAgICAgICAgcmV0dXJuIGZvcm07XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0SW5wdXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEZvcm0oKS5xdWVyeVNlbGVjdG9yKCdpbnB1dC5tZWRpdW0tZWRpdG9yLXRvb2xiYXItaW5wdXQnKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjbGVhckZvbnRTaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBNZWRpdW1FZGl0b3Iuc2VsZWN0aW9uLmdldFNlbGVjdGVkRWxlbWVudHModGhpcy5kb2N1bWVudCkuZm9yRWFjaChmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgICAgICBpZiAoZWwubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ2ZvbnQnICYmIGVsLmhhc0F0dHJpYnV0ZSgnc2l6ZScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZSgnc2l6ZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGhhbmRsZVNsaWRlckNoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHNpemUgPSB0aGlzLmdldElucHV0KCkudmFsdWU7XG4gICAgICAgICAgICBpZiAoc2l6ZSA9PT0gJzQnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhckZvbnRTaXplKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuZXhlY0FjdGlvbignZm9udFNpemUnLCB7IHZhbHVlOiBzaXplIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGhhbmRsZUZvcm1DbGljazogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAvLyBtYWtlIHN1cmUgbm90IHRvIGhpZGUgZm9ybSB3aGVuIGNsaWNraW5nIGluc2lkZSB0aGUgZm9ybVxuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaGFuZGxlU2F2ZUNsaWNrOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIC8vIENsaWNraW5nIFNhdmUgLT4gY3JlYXRlIHRoZSBmb250IHNpemVcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB0aGlzLmRvRm9ybVNhdmUoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVDbG9zZUNsaWNrOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIC8vIENsaWNrIENsb3NlIC0+IGNsb3NlIHRoZSBmb3JtXG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgdGhpcy5kb0Zvcm1DYW5jZWwoKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgTWVkaXVtRWRpdG9yLmV4dGVuc2lvbnMuZm9udFNpemUgPSBGb250U2l6ZUZvcm07XG59KCkpO1xuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvKiBIZWxwZXJzIGFuZCBpbnRlcm5hbCB2YXJpYWJsZXMgdGhhdCBkb24ndCBuZWVkIHRvIGJlIG1lbWJlcnMgb2YgYWN0dWFsIHBhc3RlIGhhbmRsZXIgKi9cblxuICAgIHZhciBwYXN0ZUJpbkRlZmF1bHRDb250ZW50ID0gJyVNRV9QQVNURUJJTiUnLFxuICAgICAgICBsYXN0UmFuZ2UgPSBudWxsLFxuICAgICAgICBrZXlib2FyZFBhc3RlRWRpdGFibGUgPSBudWxsLFxuICAgICAgICBzdG9wUHJvcCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIH07XG5cbiAgICAvKmpzbGludCByZWdleHA6IHRydWUqL1xuICAgIC8qXG4gICAgICAgIGpzbGludCBkb2VzIG5vdCBhbGxvdyBjaGFyYWN0ZXIgbmVnYXRpb24sIGJlY2F1c2UgdGhlIG5lZ2F0aW9uXG4gICAgICAgIHdpbGwgbm90IG1hdGNoIGFueSB1bmljb2RlIGNoYXJhY3RlcnMuIEluIHRoZSByZWdleGVzIGluIHRoaXNcbiAgICAgICAgYmxvY2ssIG5lZ2F0aW9uIGlzIHVzZWQgc3BlY2lmaWNhbGx5IHRvIG1hdGNoIHRoZSBlbmQgb2YgYW4gaHRtbFxuICAgICAgICB0YWcsIGFuZCBpbiBmYWN0IHVuaWNvZGUgY2hhcmFjdGVycyAqc2hvdWxkKiBiZSBhbGxvd2VkLlxuICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlUmVwbGFjZW1lbnRzKCkge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgLy8gUmVtb3ZlIGFueXRoaW5nIGJ1dCB0aGUgY29udGVudHMgd2l0aGluIHRoZSBCT0RZIGVsZW1lbnRcbiAgICAgICAgICAgIFtuZXcgUmVnRXhwKC9eW1xcc1xcU10qPGJvZHlbXj5dKj5cXHMqfFxccyo8XFwvYm9keVtePl0qPltcXHNcXFNdKiQvZyksICcnXSxcblxuICAgICAgICAgICAgLy8gY2xlYW51cCBjb21tZW50cyBhZGRlZCBieSBDaHJvbWUgd2hlbiBwYXN0aW5nIGh0bWxcbiAgICAgICAgICAgIFtuZXcgUmVnRXhwKC88IS0tU3RhcnRGcmFnbWVudC0tPnw8IS0tRW5kRnJhZ21lbnQtLT4vZyksICcnXSxcblxuICAgICAgICAgICAgLy8gVHJhaWxpbmcgQlIgZWxlbWVudHNcbiAgICAgICAgICAgIFtuZXcgUmVnRXhwKC88YnI+JC9pKSwgJyddLFxuXG4gICAgICAgICAgICAvLyByZXBsYWNlIHR3byBib2d1cyB0YWdzIHRoYXQgYmVnaW4gcGFzdGVzIGZyb20gZ29vZ2xlIGRvY3NcbiAgICAgICAgICAgIFtuZXcgUmVnRXhwKC88W14+XSpkb2NzLWludGVybmFsLWd1aWRbXj5dKj4vZ2kpLCAnJ10sXG4gICAgICAgICAgICBbbmV3IFJlZ0V4cCgvPFxcL2I+KDxicltePl0qPik/JC9naSksICcnXSxcblxuICAgICAgICAgICAgIC8vIHVuLWh0bWwgc3BhY2VzIGFuZCBuZXdsaW5lcyBpbnNlcnRlZCBieSBPUyBYXG4gICAgICAgICAgICBbbmV3IFJlZ0V4cCgvPHNwYW4gY2xhc3M9XCJBcHBsZS1jb252ZXJ0ZWQtc3BhY2VcIj5cXHMrPFxcL3NwYW4+L2cpLCAnICddLFxuICAgICAgICAgICAgW25ldyBSZWdFeHAoLzxiciBjbGFzcz1cIkFwcGxlLWludGVyY2hhbmdlLW5ld2xpbmVcIj4vZyksICc8YnI+J10sXG5cbiAgICAgICAgICAgIC8vIHJlcGxhY2UgZ29vZ2xlIGRvY3MgaXRhbGljcytib2xkIHdpdGggYSBzcGFuIHRvIGJlIHJlcGxhY2VkIG9uY2UgdGhlIGh0bWwgaXMgaW5zZXJ0ZWRcbiAgICAgICAgICAgIFtuZXcgUmVnRXhwKC88c3BhbltePl0qKGZvbnQtc3R5bGU6aXRhbGljO2ZvbnQtd2VpZ2h0Oihib2xkfDcwMCl8Zm9udC13ZWlnaHQ6KGJvbGR8NzAwKTtmb250LXN0eWxlOml0YWxpYylbXj5dKj4vZ2kpLCAnPHNwYW4gY2xhc3M9XCJyZXBsYWNlLXdpdGggaXRhbGljIGJvbGRcIj4nXSxcblxuICAgICAgICAgICAgLy8gcmVwbGFjZSBnb29nbGUgZG9jcyBpdGFsaWNzIHdpdGggYSBzcGFuIHRvIGJlIHJlcGxhY2VkIG9uY2UgdGhlIGh0bWwgaXMgaW5zZXJ0ZWRcbiAgICAgICAgICAgIFtuZXcgUmVnRXhwKC88c3BhbltePl0qZm9udC1zdHlsZTppdGFsaWNbXj5dKj4vZ2kpLCAnPHNwYW4gY2xhc3M9XCJyZXBsYWNlLXdpdGggaXRhbGljXCI+J10sXG5cbiAgICAgICAgICAgIC8vW3JlcGxhY2UgZ29vZ2xlIGRvY3MgYm9sZHMgd2l0aCBhIHNwYW4gdG8gYmUgcmVwbGFjZWQgb25jZSB0aGUgaHRtbCBpcyBpbnNlcnRlZFxuICAgICAgICAgICAgW25ldyBSZWdFeHAoLzxzcGFuW14+XSpmb250LXdlaWdodDooYm9sZHw3MDApW14+XSo+L2dpKSwgJzxzcGFuIGNsYXNzPVwicmVwbGFjZS13aXRoIGJvbGRcIj4nXSxcblxuICAgICAgICAgICAgIC8vIHJlcGxhY2UgbWFudWFsbHkgZW50ZXJlZCBiL2kvYSB0YWdzIHdpdGggcmVhbCBvbmVzXG4gICAgICAgICAgICBbbmV3IFJlZ0V4cCgvJmx0OyhcXC8/KShpfGJ8YSkmZ3Q7L2dpKSwgJzwkMSQyPiddLFxuXG4gICAgICAgICAgICAgLy8gcmVwbGFjZSBtYW51YWxseSBhIHRhZ3Mgd2l0aCByZWFsIG9uZXMsIGNvbnZlcnRpbmcgc21hcnQtcXVvdGVzIGZyb20gZ29vZ2xlIGRvY3NcbiAgICAgICAgICAgIFtuZXcgUmVnRXhwKC8mbHQ7YSg/Oig/IWhyZWYpLikraHJlZj0oPzomcXVvdDt8JnJkcXVvO3wmbGRxdW87fFwifOKAnHzigJ0pKCgoPyEmcXVvdDt8JnJkcXVvO3wmbGRxdW87fFwifOKAnHzigJ0pLikqKSg/OiZxdW90O3wmcmRxdW87fCZsZHF1bzt8XCJ84oCcfOKAnSkoPzooPyEmZ3Q7KS4pKiZndDsvZ2kpLCAnPGEgaHJlZj1cIiQxXCI+J10sXG5cbiAgICAgICAgICAgIC8vIE5ld2xpbmVzIGJldHdlZW4gcGFyYWdyYXBocyBpbiBodG1sIGhhdmUgbm8gc3ludGFjdGljIHZhbHVlLFxuICAgICAgICAgICAgLy8gYnV0IHRoZW4gaGF2ZSBhIHRlbmRlbmN5IHRvIGFjY2lkZW50YWxseSBiZWNvbWUgYWRkaXRpb25hbCBwYXJhZ3JhcGhzIGRvd24gdGhlIGxpbmVcbiAgICAgICAgICAgIFtuZXcgUmVnRXhwKC88XFwvcD5cXG4rL2dpKSwgJzwvcD4nXSxcbiAgICAgICAgICAgIFtuZXcgUmVnRXhwKC9cXG4rPHAvZ2kpLCAnPHAnXSxcblxuICAgICAgICAgICAgLy8gTWljcm9zb2Z0IFdvcmQgbWFrZXMgdGhlc2Ugb2RkIHRhZ3MsIGxpa2UgPG86cD48L286cD5cbiAgICAgICAgICAgIFtuZXcgUmVnRXhwKC88XFwvP286W2Etel0qPi9naSksICcnXSxcblxuICAgICAgICAgICAgLy8gTWljcm9zb2Z0IFdvcmQgYWRkcyBzb21lIHNwZWNpYWwgZWxlbWVudHMgYXJvdW5kIGxpc3QgaXRlbXNcbiAgICAgICAgICAgIFtuZXcgUmVnRXhwKC88IVxcW2lmICFzdXBwb3J0TGlzdHNcXF0+KCgoPyE8ISkuKSopPCFcXFtlbmRpZl1cXD4vZ2kpLCAnJDEnXVxuICAgICAgICBdO1xuICAgIH1cbiAgICAvKmpzbGludCByZWdleHA6IGZhbHNlKi9cblxuICAgIC8qKlxuICAgICAqIEdldHMgdmFyaW91cyBjb250ZW50IHR5cGVzIG91dCBvZiB0aGUgQ2xpcGJvYXJkIEFQSS4gSXQgd2lsbCBhbHNvIGdldCB0aGVcbiAgICAgKiBwbGFpbiB0ZXh0IHVzaW5nIG9sZGVyIElFIGFuZCBXZWJLaXQgQVBJLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtldmVudH0gZXZlbnQgRXZlbnQgZmlyZWQgb24gcGFzdGUuXG4gICAgICogQHBhcmFtIHt3aW59IHJlZmVyZW5jZSB0byB3aW5kb3dcbiAgICAgKiBAcGFyYW0ge2RvY30gcmVmZXJlbmNlIHRvIGRvY3VtZW50XG4gICAgICogQHJldHVybiB7T2JqZWN0fSBPYmplY3Qgd2l0aCBtaW1lIHR5cGVzIGFuZCBkYXRhIGZvciB0aG9zZSBtaW1lIHR5cGVzLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldENsaXBib2FyZENvbnRlbnQoZXZlbnQsIHdpbiwgZG9jKSB7XG4gICAgICAgIHZhciBkYXRhVHJhbnNmZXIgPSBldmVudC5jbGlwYm9hcmREYXRhIHx8IHdpbi5jbGlwYm9hcmREYXRhIHx8IGRvYy5kYXRhVHJhbnNmZXIsXG4gICAgICAgICAgICBkYXRhID0ge307XG5cbiAgICAgICAgaWYgKCFkYXRhVHJhbnNmZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlIG9sZCBXZWJLaXQvSUUgQVBJXG4gICAgICAgIGlmIChkYXRhVHJhbnNmZXIuZ2V0RGF0YSkge1xuICAgICAgICAgICAgdmFyIGxlZ2FjeVRleHQgPSBkYXRhVHJhbnNmZXIuZ2V0RGF0YSgnVGV4dCcpO1xuICAgICAgICAgICAgaWYgKGxlZ2FjeVRleHQgJiYgbGVnYWN5VGV4dC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgZGF0YVsndGV4dC9wbGFpbiddID0gbGVnYWN5VGV4dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkYXRhVHJhbnNmZXIudHlwZXMpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YVRyYW5zZmVyLnR5cGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbnRlbnRUeXBlID0gZGF0YVRyYW5zZmVyLnR5cGVzW2ldO1xuICAgICAgICAgICAgICAgIGRhdGFbY29udGVudFR5cGVdID0gZGF0YVRyYW5zZmVyLmdldERhdGEoY29udGVudFR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuXG4gICAgdmFyIFBhc3RlSGFuZGxlciA9IE1lZGl1bUVkaXRvci5FeHRlbnNpb24uZXh0ZW5kKHtcbiAgICAgICAgLyogUGFzdGUgT3B0aW9ucyAqL1xuXG4gICAgICAgIC8qIGZvcmNlUGxhaW5UZXh0OiBbYm9vbGVhbl1cbiAgICAgICAgICogRm9yY2VzIHBhc3RpbmcgYXMgcGxhaW4gdGV4dC5cbiAgICAgICAgICovXG4gICAgICAgIGZvcmNlUGxhaW5UZXh0OiB0cnVlLFxuXG4gICAgICAgIC8qIGNsZWFuUGFzdGVkSFRNTDogW2Jvb2xlYW5dXG4gICAgICAgICAqIGNsZWFucyBwYXN0ZWQgY29udGVudCBmcm9tIGRpZmZlcmVudCBzb3VyY2VzLCBsaWtlIGdvb2dsZSBkb2NzIGV0Yy5cbiAgICAgICAgICovXG4gICAgICAgIGNsZWFuUGFzdGVkSFRNTDogZmFsc2UsXG5cbiAgICAgICAgLyogcHJlQ2xlYW5SZXBsYWNlbWVudHM6IFtBcnJheV1cbiAgICAgICAgICogY3VzdG9tIHBhaXJzICgyIGVsZW1lbnQgYXJyYXlzKSBvZiBSZWdFeHAgYW5kIHJlcGxhY2VtZW50IHRleHQgdG8gdXNlIGR1cmluZyBwYXN0IHdoZW5cbiAgICAgICAgICogX19mb3JjZVBsYWluVGV4dF9fIG9yIF9fY2xlYW5QYXN0ZWRIVE1MX18gYXJlIGB0cnVlYCBPUiB3aGVuIGNhbGxpbmcgYGNsZWFuUGFzdGUodGV4dClgIGhlbHBlciBtZXRob2QuXG4gICAgICAgICAqIFRoZXNlIHJlcGxhY2VtZW50cyBhcmUgZXhlY3V0ZWQgYmVmb3JlIGFueSBtZWRpdW0gZWRpdG9yIGRlZmluZWQgcmVwbGFjZW1lbnRzLlxuICAgICAgICAgKi9cbiAgICAgICAgcHJlQ2xlYW5SZXBsYWNlbWVudHM6IFtdLFxuXG4gICAgICAgIC8qIGNsZWFuUmVwbGFjZW1lbnRzOiBbQXJyYXldXG4gICAgICAgICAqIGN1c3RvbSBwYWlycyAoMiBlbGVtZW50IGFycmF5cykgb2YgUmVnRXhwIGFuZCByZXBsYWNlbWVudCB0ZXh0IHRvIHVzZSBkdXJpbmcgcGFzdGUgd2hlblxuICAgICAgICAgKiBfX2ZvcmNlUGxhaW5UZXh0X18gb3IgX19jbGVhblBhc3RlZEhUTUxfXyBhcmUgYHRydWVgIE9SIHdoZW4gY2FsbGluZyBgY2xlYW5QYXN0ZSh0ZXh0KWAgaGVscGVyIG1ldGhvZC5cbiAgICAgICAgICogVGhlc2UgcmVwbGFjZW1lbnRzIGFyZSBleGVjdXRlZCBhZnRlciBhbnkgbWVkaXVtIGVkaXRvciBkZWZpbmVkIHJlcGxhY2VtZW50cy5cbiAgICAgICAgICovXG4gICAgICAgIGNsZWFuUmVwbGFjZW1lbnRzOiBbXSxcblxuICAgICAgICAvKiBjbGVhbkF0dHJzOjogW0FycmF5XVxuICAgICAgICAgKiBsaXN0IG9mIGVsZW1lbnQgYXR0cmlidXRlcyB0byByZW1vdmUgZHVyaW5nIHBhc3RlIHdoZW4gX19jbGVhblBhc3RlZEhUTUxfXyBpcyBgdHJ1ZWAgb3Igd2hlblxuICAgICAgICAgKiBjYWxsaW5nIGBjbGVhblBhc3RlKHRleHQpYCBvciBgcGFzdGVIVE1MKGh0bWwsIG9wdGlvbnMpYCBoZWxwZXIgbWV0aG9kcy5cbiAgICAgICAgICovXG4gICAgICAgIGNsZWFuQXR0cnM6IFsnY2xhc3MnLCAnc3R5bGUnLCAnZGlyJ10sXG5cbiAgICAgICAgLyogY2xlYW5UYWdzOiBbQXJyYXldXG4gICAgICAgICAqIGxpc3Qgb2YgZWxlbWVudCB0YWcgbmFtZXMgdG8gcmVtb3ZlIGR1cmluZyBwYXN0ZSB3aGVuIF9fY2xlYW5QYXN0ZWRIVE1MX18gaXMgYHRydWVgIG9yIHdoZW5cbiAgICAgICAgICogY2FsbGluZyBgY2xlYW5QYXN0ZSh0ZXh0KWAgb3IgYHBhc3RlSFRNTChodG1sLCBvcHRpb25zKWAgaGVscGVyIG1ldGhvZHMuXG4gICAgICAgICAqL1xuICAgICAgICBjbGVhblRhZ3M6IFsnbWV0YSddLFxuXG4gICAgICAgIC8qIHVud3JhcFRhZ3M6IFtBcnJheV1cbiAgICAgICAgICogbGlzdCBvZiBlbGVtZW50IHRhZyBuYW1lcyB0byB1bndyYXAgKHJlbW92ZSB0aGUgZWxlbWVudCB0YWcgYnV0IHJldGFpbiBpdHMgY2hpbGQgZWxlbWVudHMpXG4gICAgICAgICAqIGR1cmluZyBwYXN0ZSB3aGVuIF9fY2xlYW5QYXN0ZWRIVE1MX18gaXMgYHRydWVgIG9yIHdoZW5cbiAgICAgICAgICogY2FsbGluZyBgY2xlYW5QYXN0ZSh0ZXh0KWAgb3IgYHBhc3RlSFRNTChodG1sLCBvcHRpb25zKWAgaGVscGVyIG1ldGhvZHMuXG4gICAgICAgICAqL1xuICAgICAgICB1bndyYXBUYWdzOiBbXSxcblxuICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBNZWRpdW1FZGl0b3IuRXh0ZW5zaW9uLnByb3RvdHlwZS5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmZvcmNlUGxhaW5UZXh0IHx8IHRoaXMuY2xlYW5QYXN0ZWRIVE1MKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdWJzY3JpYmUoJ2VkaXRhYmxlS2V5ZG93bicsIHRoaXMuaGFuZGxlS2V5ZG93bi5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgICAgICAvLyBXZSBuZWVkIGFjY2VzcyB0byB0aGUgZnVsbCBldmVudCBkYXRhIGluIHBhc3RlXG4gICAgICAgICAgICAgICAgLy8gc28gd2UgY2FuJ3QgdXNlIHRoZSBlZGl0YWJsZVBhc3RlIGV2ZW50IGhlcmVcbiAgICAgICAgICAgICAgICB0aGlzLmdldEVkaXRvckVsZW1lbnRzKCkuZm9yRWFjaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uKGVsZW1lbnQsICdwYXN0ZScsIHRoaXMuaGFuZGxlUGFzdGUuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5zdWJzY3JpYmUoJ2FkZEVsZW1lbnQnLCB0aGlzLmhhbmRsZUFkZEVsZW1lbnQuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgaGFuZGxlQWRkRWxlbWVudDogZnVuY3Rpb24gKGV2ZW50LCBlZGl0YWJsZSkge1xuICAgICAgICAgICAgdGhpcy5vbihlZGl0YWJsZSwgJ3Bhc3RlJywgdGhpcy5oYW5kbGVQYXN0ZS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBkZXN0cm95OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBNYWtlIHN1cmUgcGFzdGViaW4gaXMgZGVzdHJveWVkIGluIGNhc2UgaXQncyBzdGlsbCBhcm91bmQgZm9yIHNvbWUgcmVhc29uXG4gICAgICAgICAgICBpZiAodGhpcy5mb3JjZVBsYWluVGV4dCB8fCB0aGlzLmNsZWFuUGFzdGVkSFRNTCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlUGFzdGVCaW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVQYXN0ZTogZnVuY3Rpb24gKGV2ZW50LCBlZGl0YWJsZSkge1xuICAgICAgICAgICAgaWYgKGV2ZW50LmRlZmF1bHRQcmV2ZW50ZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBjbGlwYm9hcmRDb250ZW50ID0gZ2V0Q2xpcGJvYXJkQ29udGVudChldmVudCwgdGhpcy53aW5kb3csIHRoaXMuZG9jdW1lbnQpLFxuICAgICAgICAgICAgICAgIHBhc3RlZEhUTUwgPSBjbGlwYm9hcmRDb250ZW50Wyd0ZXh0L2h0bWwnXSxcbiAgICAgICAgICAgICAgICBwYXN0ZWRQbGFpbiA9IGNsaXBib2FyZENvbnRlbnRbJ3RleHQvcGxhaW4nXTtcblxuICAgICAgICAgICAgaWYgKHRoaXMud2luZG93LmNsaXBib2FyZERhdGEgJiYgZXZlbnQuY2xpcGJvYXJkRGF0YSA9PT0gdW5kZWZpbmVkICYmICFwYXN0ZWRIVE1MKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgd2luZG93LmNsaXBib2FyZERhdGEgZXhpc3RzLCBidXQgZXZlbnQuY2xpcGJvYXJkRGF0YSBkb2Vzbid0IGV4aXN0LFxuICAgICAgICAgICAgICAgIC8vIHdlJ3JlIHByb2JhYmx5IGluIElFLiBJRSBvbmx5IGhhcyB0d28gcG9zc2liaWxpdGllcyBmb3IgY2xpcGJvYXJkXG4gICAgICAgICAgICAgICAgLy8gZGF0YSBmb3JtYXQ6ICdUZXh0JyBhbmQgJ1VSTCcuXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyBGb3IgSUUsIHdlJ2xsIGZhbGxiYWNrIHRvICdUZXh0JyBmb3IgdGV4dC9odG1sXG4gICAgICAgICAgICAgICAgcGFzdGVkSFRNTCA9IHBhc3RlZFBsYWluO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocGFzdGVkSFRNTCB8fCBwYXN0ZWRQbGFpbikge1xuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLmRvUGFzdGUocGFzdGVkSFRNTCwgcGFzdGVkUGxhaW4sIGVkaXRhYmxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBkb1Bhc3RlOiBmdW5jdGlvbiAocGFzdGVkSFRNTCwgcGFzdGVkUGxhaW4sIGVkaXRhYmxlKSB7XG4gICAgICAgICAgICB2YXIgcGFyYWdyYXBocyxcbiAgICAgICAgICAgICAgICBodG1sID0gJycsXG4gICAgICAgICAgICAgICAgcDtcblxuICAgICAgICAgICAgaWYgKHRoaXMuY2xlYW5QYXN0ZWRIVE1MICYmIHBhc3RlZEhUTUwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jbGVhblBhc3RlKHBhc3RlZEhUTUwpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoISh0aGlzLmdldEVkaXRvck9wdGlvbignZGlzYWJsZVJldHVybicpIHx8IChlZGl0YWJsZSAmJiBlZGl0YWJsZS5nZXRBdHRyaWJ1dGUoJ2RhdGEtZGlzYWJsZS1yZXR1cm4nKSkpKSB7XG4gICAgICAgICAgICAgICAgcGFyYWdyYXBocyA9IHBhc3RlZFBsYWluLnNwbGl0KC9bXFxyXFxuXSsvZyk7XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIFxcclxcbiBpbiBkYXRhLCBkb24ndCB3cmFwIGluIDxwPlxuICAgICAgICAgICAgICAgIGlmIChwYXJhZ3JhcGhzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChwID0gMDsgcCA8IHBhcmFncmFwaHMubGVuZ3RoOyBwICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXJhZ3JhcGhzW3BdICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxwPicgKyBNZWRpdW1FZGl0b3IudXRpbC5odG1sRW50aXRpZXMocGFyYWdyYXBoc1twXSkgKyAnPC9wPic7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBodG1sID0gTWVkaXVtRWRpdG9yLnV0aWwuaHRtbEVudGl0aWVzKHBhcmFncmFwaHNbMF0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaHRtbCA9IE1lZGl1bUVkaXRvci51dGlsLmh0bWxFbnRpdGllcyhwYXN0ZWRQbGFpbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBNZWRpdW1FZGl0b3IudXRpbC5pbnNlcnRIVE1MQ29tbWFuZCh0aGlzLmRvY3VtZW50LCBodG1sKTtcbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVQYXN0ZUJpblBhc3RlOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGlmIChldmVudC5kZWZhdWx0UHJldmVudGVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVQYXN0ZUJpbigpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGNsaXBib2FyZENvbnRlbnQgPSBnZXRDbGlwYm9hcmRDb250ZW50KGV2ZW50LCB0aGlzLndpbmRvdywgdGhpcy5kb2N1bWVudCksXG4gICAgICAgICAgICAgICAgcGFzdGVkSFRNTCA9IGNsaXBib2FyZENvbnRlbnRbJ3RleHQvaHRtbCddLFxuICAgICAgICAgICAgICAgIHBhc3RlZFBsYWluID0gY2xpcGJvYXJkQ29udGVudFsndGV4dC9wbGFpbiddLFxuICAgICAgICAgICAgICAgIGVkaXRhYmxlID0ga2V5Ym9hcmRQYXN0ZUVkaXRhYmxlO1xuXG4gICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIHZhbGlkIGh0bWwgYWxyZWFkeSwgb3Igd2UncmUgbm90IGluIGNsZWFuUGFzdGVkSFRNTCBtb2RlXG4gICAgICAgICAgICAvLyB3ZSBjYW4gaWdub3JlIHRoZSBwYXN0ZSBiaW4gYW5kIGp1c3QgcGFzdGUgbm93XG4gICAgICAgICAgICBpZiAoIXRoaXMuY2xlYW5QYXN0ZWRIVE1MIHx8IHBhc3RlZEhUTUwpIHtcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlUGFzdGVCaW4oKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRvUGFzdGUocGFzdGVkSFRNTCwgcGFzdGVkUGxhaW4sIGVkaXRhYmxlKTtcblxuICAgICAgICAgICAgICAgIC8vIFRoZSBldmVudCBoYW5kbGluZyBjb2RlIGxpc3RlbnMgZm9yIHBhc3RlIG9uIHRoZSBlZGl0YWJsZSBlbGVtZW50XG4gICAgICAgICAgICAgICAgLy8gaW4gb3JkZXIgdG8gdHJpZ2dlciB0aGUgZWRpdGFibGVQYXN0ZSBldmVudC4gIFNpbmNlIHRoaXMgcGFzdGUgZXZlbnRcbiAgICAgICAgICAgICAgICAvLyBpcyBoYXBwZW5pbmcgb24gdGhlIHBhc3RlYmluLCB0aGUgZXZlbnQgaGFuZGxpbmcgY29kZSBuZXZlciBrbm93cyBhYm91dCBpdFxuICAgICAgICAgICAgICAgIC8vIFNvLCB3ZSBoYXZlIHRvIHRyaWdnZXIgZWRpdGFibGVQYXN0ZSBtYW51YWxseVxuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlcignZWRpdGFibGVQYXN0ZScsIHsgY3VycmVudFRhcmdldDogZWRpdGFibGUsIHRhcmdldDogZWRpdGFibGUgfSwgZWRpdGFibGUpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gV2UgbmVlZCB0byBsb29rIGF0IHRoZSBwYXN0ZSBiaW4sIHNvIGRvIGEgc2V0VGltZW91dCB0byBsZXQgdGhlIHBhc3RlXG4gICAgICAgICAgICAvLyBmYWxsIHRocm91Z2ggaW50byB0aGUgcGFzdGUgYmluXG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGxvb2sgZm9yIEhUTUwgaWYgd2UncmUgaW4gY2xlYW5QYXN0ZWRIVE1MIG1vZGVcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jbGVhblBhc3RlZEhUTUwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgY2xpcGJvYXJkIGRpZG4ndCBoYXZlIEhUTUwsIHRyeSB0aGUgcGFzdGUgYmluXG4gICAgICAgICAgICAgICAgICAgIHBhc3RlZEhUTUwgPSB0aGlzLmdldFBhc3RlQmluSHRtbCgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIElmIHdlIG5lZWRlZCB0aGUgcGFzdGUgYmluLCB3ZSdyZSBkb25lIHdpdGggaXQgbm93LCByZW1vdmUgaXRcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZVBhc3RlQmluKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgdGhlIHBhc3RlIHdpdGggdGhlIGh0bWwgZnJvbSB0aGUgcGFzdGUgYmluXG4gICAgICAgICAgICAgICAgdGhpcy5kb1Bhc3RlKHBhc3RlZEhUTUwsIHBhc3RlZFBsYWluLCBlZGl0YWJsZSk7XG5cbiAgICAgICAgICAgICAgICAvLyBUaGUgZXZlbnQgaGFuZGxpbmcgY29kZSBsaXN0ZW5zIGZvciBwYXN0ZSBvbiB0aGUgZWRpdGFibGUgZWxlbWVudFxuICAgICAgICAgICAgICAgIC8vIGluIG9yZGVyIHRvIHRyaWdnZXIgdGhlIGVkaXRhYmxlUGFzdGUgZXZlbnQuICBTaW5jZSB0aGlzIHBhc3RlIGV2ZW50XG4gICAgICAgICAgICAgICAgLy8gaXMgaGFwcGVuaW5nIG9uIHRoZSBwYXN0ZWJpbiwgdGhlIGV2ZW50IGhhbmRsaW5nIGNvZGUgbmV2ZXIga25vd3MgYWJvdXQgaXRcbiAgICAgICAgICAgICAgICAvLyBTbywgd2UgaGF2ZSB0byB0cmlnZ2VyIGVkaXRhYmxlUGFzdGUgbWFudWFsbHlcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ2VkaXRhYmxlUGFzdGUnLCB7IGN1cnJlbnRUYXJnZXQ6IGVkaXRhYmxlLCB0YXJnZXQ6IGVkaXRhYmxlIH0sIGVkaXRhYmxlKTtcbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSwgMCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaGFuZGxlS2V5ZG93bjogZnVuY3Rpb24gKGV2ZW50LCBlZGl0YWJsZSkge1xuICAgICAgICAgICAgLy8gaWYgaXQncyBub3QgQ3RybCtWLCBkbyBub3RoaW5nXG4gICAgICAgICAgICBpZiAoIShNZWRpdW1FZGl0b3IudXRpbC5pc0tleShldmVudCwgTWVkaXVtRWRpdG9yLnV0aWwua2V5Q29kZS5WKSAmJiBNZWRpdW1FZGl0b3IudXRpbC5pc01ldGFDdHJsS2V5KGV2ZW50KSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGV2ZW50LnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuXG4gICAgICAgICAgICB0aGlzLnJlbW92ZVBhc3RlQmluKCk7XG4gICAgICAgICAgICB0aGlzLmNyZWF0ZVBhc3RlQmluKGVkaXRhYmxlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjcmVhdGVQYXN0ZUJpbjogZnVuY3Rpb24gKGVkaXRhYmxlKSB7XG4gICAgICAgICAgICB2YXIgcmVjdHMsXG4gICAgICAgICAgICAgICAgcmFuZ2UgPSBNZWRpdW1FZGl0b3Iuc2VsZWN0aW9uLmdldFNlbGVjdGlvblJhbmdlKHRoaXMuZG9jdW1lbnQpLFxuICAgICAgICAgICAgICAgIHRvcCA9IHRoaXMud2luZG93LnBhZ2VZT2Zmc2V0O1xuXG4gICAgICAgICAgICBrZXlib2FyZFBhc3RlRWRpdGFibGUgPSBlZGl0YWJsZTtcblxuICAgICAgICAgICAgaWYgKHJhbmdlKSB7XG4gICAgICAgICAgICAgICAgcmVjdHMgPSByYW5nZS5nZXRDbGllbnRSZWN0cygpO1xuXG4gICAgICAgICAgICAgICAgLy8gb24gZW1wdHkgbGluZSwgcmVjdHMgaXMgZW1wdHkgc28gd2UgZ3JhYiBpbmZvcm1hdGlvbiBmcm9tIHRoZSBmaXJzdCBjb250YWluZXIgb2YgdGhlIHJhbmdlXG4gICAgICAgICAgICAgICAgaWYgKHJlY3RzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0b3AgKz0gcmVjdHNbMF0udG9wO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmFuZ2Uuc3RhcnRDb250YWluZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9wICs9IHJhbmdlLnN0YXJ0Q29udGFpbmVyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0b3AgKz0gcmFuZ2UuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGFzdFJhbmdlID0gcmFuZ2U7XG5cbiAgICAgICAgICAgIHZhciBwYXN0ZUJpbkVsbSA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICBwYXN0ZUJpbkVsbS5pZCA9IHRoaXMucGFzdGVCaW5JZCA9ICdtZWRpdW0tZWRpdG9yLXBhc3RlYmluLScgKyAoK0RhdGUubm93KCkpO1xuICAgICAgICAgICAgcGFzdGVCaW5FbG0uc2V0QXR0cmlidXRlKCdzdHlsZScsICdib3JkZXI6IDFweCByZWQgc29saWQ7IHBvc2l0aW9uOiBhYnNvbHV0ZTsgdG9wOiAnICsgdG9wICsgJ3B4OyB3aWR0aDogMTBweDsgaGVpZ2h0OiAxMHB4OyBvdmVyZmxvdzogaGlkZGVuOyBvcGFjaXR5OiAwJyk7XG4gICAgICAgICAgICBwYXN0ZUJpbkVsbS5zZXRBdHRyaWJ1dGUoJ2NvbnRlbnRFZGl0YWJsZScsIHRydWUpO1xuICAgICAgICAgICAgcGFzdGVCaW5FbG0uaW5uZXJIVE1MID0gcGFzdGVCaW5EZWZhdWx0Q29udGVudDtcblxuICAgICAgICAgICAgdGhpcy5kb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHBhc3RlQmluRWxtKTtcblxuICAgICAgICAgICAgLy8gYXZvaWQgLmZvY3VzKCkgdG8gc3RvcCBvdGhlciBldmVudCAoYWN0dWFsbHkgdGhlIHBhc3RlIGV2ZW50KVxuICAgICAgICAgICAgdGhpcy5vbihwYXN0ZUJpbkVsbSwgJ2ZvY3VzJywgc3RvcFByb3ApO1xuICAgICAgICAgICAgdGhpcy5vbihwYXN0ZUJpbkVsbSwgJ2ZvY3VzaW4nLCBzdG9wUHJvcCk7XG4gICAgICAgICAgICB0aGlzLm9uKHBhc3RlQmluRWxtLCAnZm9jdXNvdXQnLCBzdG9wUHJvcCk7XG5cbiAgICAgICAgICAgIHBhc3RlQmluRWxtLmZvY3VzKCk7XG5cbiAgICAgICAgICAgIE1lZGl1bUVkaXRvci5zZWxlY3Rpb24uc2VsZWN0Tm9kZShwYXN0ZUJpbkVsbSwgdGhpcy5kb2N1bWVudCk7XG5cbiAgICAgICAgICAgIGlmICghdGhpcy5ib3VuZEhhbmRsZVBhc3RlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ib3VuZEhhbmRsZVBhc3RlID0gdGhpcy5oYW5kbGVQYXN0ZUJpblBhc3RlLmJpbmQodGhpcyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMub24ocGFzdGVCaW5FbG0sICdwYXN0ZScsIHRoaXMuYm91bmRIYW5kbGVQYXN0ZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVtb3ZlUGFzdGVCaW46IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChudWxsICE9PSBsYXN0UmFuZ2UpIHtcbiAgICAgICAgICAgICAgICBNZWRpdW1FZGl0b3Iuc2VsZWN0aW9uLnNlbGVjdFJhbmdlKHRoaXMuZG9jdW1lbnQsIGxhc3RSYW5nZSk7XG4gICAgICAgICAgICAgICAgbGFzdFJhbmdlID0gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG51bGwgIT09IGtleWJvYXJkUGFzdGVFZGl0YWJsZSkge1xuICAgICAgICAgICAgICAgIGtleWJvYXJkUGFzdGVFZGl0YWJsZSA9IG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBwYXN0ZUJpbkVsbSA9IHRoaXMuZ2V0UGFzdGVCaW4oKTtcbiAgICAgICAgICAgIGlmICghcGFzdGVCaW5FbG0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwYXN0ZUJpbkVsbSkge1xuICAgICAgICAgICAgICAgIHRoaXMub2ZmKHBhc3RlQmluRWxtLCAnZm9jdXMnLCBzdG9wUHJvcCk7XG4gICAgICAgICAgICAgICAgdGhpcy5vZmYocGFzdGVCaW5FbG0sICdmb2N1c2luJywgc3RvcFByb3ApO1xuICAgICAgICAgICAgICAgIHRoaXMub2ZmKHBhc3RlQmluRWxtLCAnZm9jdXNvdXQnLCBzdG9wUHJvcCk7XG4gICAgICAgICAgICAgICAgdGhpcy5vZmYocGFzdGVCaW5FbG0sICdwYXN0ZScsIHRoaXMuYm91bmRIYW5kbGVQYXN0ZSk7XG4gICAgICAgICAgICAgICAgcGFzdGVCaW5FbG0ucGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZChwYXN0ZUJpbkVsbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0UGFzdGVCaW46IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMucGFzdGVCaW5JZCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0UGFzdGVCaW5IdG1sOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcGFzdGVCaW5FbG0gPSB0aGlzLmdldFBhc3RlQmluKCk7XG5cbiAgICAgICAgICAgIGlmICghcGFzdGVCaW5FbG0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFdlYktpdCBoYXMgYSBuaWNlIGJ1ZyB3aGVyZSBpdCBjbG9uZXMgdGhlIHBhc3RlIGJpbiBpZiB5b3UgcGFzdGUgZnJvbSBmb3IgZXhhbXBsZSBub3RlcGFkXG4gICAgICAgICAgICAvLyBzbyB3ZSBuZWVkIHRvIGZvcmNlIHBsYWluIHRleHQgbW9kZSBpbiB0aGlzIGNhc2VcbiAgICAgICAgICAgIGlmIChwYXN0ZUJpbkVsbS5maXJzdENoaWxkICYmIHBhc3RlQmluRWxtLmZpcnN0Q2hpbGQuaWQgPT09ICdtY2VwYXN0ZWJpbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBwYXN0ZUJpbkh0bWwgPSBwYXN0ZUJpbkVsbS5pbm5lckhUTUw7XG5cbiAgICAgICAgICAgIC8vIElmIHBhc3RlIGJpbiBpcyBlbXB0eSB0cnkgdXNpbmcgcGxhaW4gdGV4dCBtb2RlXG4gICAgICAgICAgICAvLyBzaW5jZSB0aGF0IGlzIGJldHRlciB0aGFuIG5vdGhpbmcgcmlnaHRcbiAgICAgICAgICAgIGlmICghcGFzdGVCaW5IdG1sIHx8IHBhc3RlQmluSHRtbCA9PT0gcGFzdGVCaW5EZWZhdWx0Q29udGVudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHBhc3RlQmluSHRtbDtcbiAgICAgICAgfSxcblxuICAgICAgICBjbGVhblBhc3RlOiBmdW5jdGlvbiAodGV4dCkge1xuICAgICAgICAgICAgdmFyIGksIGVsTGlzdCwgdG1wLCB3b3JrRWwsXG4gICAgICAgICAgICAgICAgbXVsdGlsaW5lID0gLzxwfDxicnw8ZGl2Ly50ZXN0KHRleHQpLFxuICAgICAgICAgICAgICAgIHJlcGxhY2VtZW50cyA9IFtdLmNvbmNhdChcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcmVDbGVhblJlcGxhY2VtZW50cyB8fCBbXSxcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlUmVwbGFjZW1lbnRzKCksXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xlYW5SZXBsYWNlbWVudHMgfHwgW10pO1xuXG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcmVwbGFjZW1lbnRzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgdGV4dCA9IHRleHQucmVwbGFjZShyZXBsYWNlbWVudHNbaV1bMF0sIHJlcGxhY2VtZW50c1tpXVsxXSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghbXVsdGlsaW5lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFzdGVIVE1MKHRleHQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBjcmVhdGUgYSB0ZW1wb3JhcnkgZGl2IHRvIGNsZWFudXAgYmxvY2sgZWxlbWVudHNcbiAgICAgICAgICAgIHRtcCA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgICAgICAgICAgIC8vIGRvdWJsZSBicidzIGFyZW4ndCBjb252ZXJ0ZWQgdG8gcCB0YWdzLCBidXQgd2Ugd2FudCBwYXJhZ3JhcGhzLlxuICAgICAgICAgICAgdG1wLmlubmVySFRNTCA9ICc8cD4nICsgdGV4dC5zcGxpdCgnPGJyPjxicj4nKS5qb2luKCc8L3A+PHA+JykgKyAnPC9wPic7XG5cbiAgICAgICAgICAgIC8vIGJsb2NrIGVsZW1lbnQgY2xlYW51cFxuICAgICAgICAgICAgZWxMaXN0ID0gdG1wLnF1ZXJ5U2VsZWN0b3JBbGwoJ2EscCxkaXYsYnInKTtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBlbExpc3QubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICB3b3JrRWwgPSBlbExpc3RbaV07XG5cbiAgICAgICAgICAgICAgICAvLyBNaWNyb3NvZnQgV29yZCByZXBsYWNlcyBzb21lIHNwYWNlcyB3aXRoIG5ld2xpbmVzLlxuICAgICAgICAgICAgICAgIC8vIFdoaWxlIG5ld2xpbmVzIGJldHdlZW4gYmxvY2sgZWxlbWVudHMgYXJlIG1lYW5pbmdsZXNzLCBuZXdsaW5lcyB3aXRoaW5cbiAgICAgICAgICAgICAgICAvLyBlbGVtZW50cyBhcmUgc29tZXRpbWVzIGFjdHVhbGx5IHNwYWNlcy5cbiAgICAgICAgICAgICAgICB3b3JrRWwuaW5uZXJIVE1MID0gd29ya0VsLmlubmVySFRNTC5yZXBsYWNlKC9cXG4vZ2ksICcgJyk7XG5cbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHdvcmtFbC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3AnOlxuICAgICAgICAgICAgICAgICAgICBjYXNlICdkaXYnOlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5maWx0ZXJDb21tb25CbG9ja3Mod29ya0VsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdicic6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZpbHRlckxpbmVCcmVhayh3b3JrRWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnBhc3RlSFRNTCh0bXAuaW5uZXJIVE1MKTtcbiAgICAgICAgfSxcblxuICAgICAgICBwYXN0ZUhUTUw6IGZ1bmN0aW9uIChodG1sLCBvcHRpb25zKSB7XG4gICAgICAgICAgICBvcHRpb25zID0gTWVkaXVtRWRpdG9yLnV0aWwuZGVmYXVsdHMoe30sIG9wdGlvbnMsIHtcbiAgICAgICAgICAgICAgICBjbGVhbkF0dHJzOiB0aGlzLmNsZWFuQXR0cnMsXG4gICAgICAgICAgICAgICAgY2xlYW5UYWdzOiB0aGlzLmNsZWFuVGFncyxcbiAgICAgICAgICAgICAgICB1bndyYXBUYWdzOiB0aGlzLnVud3JhcFRhZ3NcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB2YXIgZWxMaXN0LCB3b3JrRWwsIGksIGZyYWdtZW50Qm9keSwgcGFzdGVCbG9jayA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuXG4gICAgICAgICAgICBwYXN0ZUJsb2NrLmFwcGVuZENoaWxkKHRoaXMuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYm9keScpKTtcblxuICAgICAgICAgICAgZnJhZ21lbnRCb2R5ID0gcGFzdGVCbG9jay5xdWVyeVNlbGVjdG9yKCdib2R5Jyk7XG4gICAgICAgICAgICBmcmFnbWVudEJvZHkuaW5uZXJIVE1MID0gaHRtbDtcblxuICAgICAgICAgICAgdGhpcy5jbGVhbnVwU3BhbnMoZnJhZ21lbnRCb2R5KTtcblxuICAgICAgICAgICAgZWxMaXN0ID0gZnJhZ21lbnRCb2R5LnF1ZXJ5U2VsZWN0b3JBbGwoJyonKTtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBlbExpc3QubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICB3b3JrRWwgPSBlbExpc3RbaV07XG5cbiAgICAgICAgICAgICAgICBpZiAoJ2EnID09PSB3b3JrRWwubm9kZU5hbWUudG9Mb3dlckNhc2UoKSAmJiB0aGlzLmdldEVkaXRvck9wdGlvbigndGFyZ2V0QmxhbmsnKSkge1xuICAgICAgICAgICAgICAgICAgICBNZWRpdW1FZGl0b3IudXRpbC5zZXRUYXJnZXRCbGFuayh3b3JrRWwpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIE1lZGl1bUVkaXRvci51dGlsLmNsZWFudXBBdHRycyh3b3JrRWwsIG9wdGlvbnMuY2xlYW5BdHRycyk7XG4gICAgICAgICAgICAgICAgTWVkaXVtRWRpdG9yLnV0aWwuY2xlYW51cFRhZ3Mod29ya0VsLCBvcHRpb25zLmNsZWFuVGFncyk7XG4gICAgICAgICAgICAgICAgTWVkaXVtRWRpdG9yLnV0aWwudW53cmFwVGFncyh3b3JrRWwsIG9wdGlvbnMudW53cmFwVGFncyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIE1lZGl1bUVkaXRvci51dGlsLmluc2VydEhUTUxDb21tYW5kKHRoaXMuZG9jdW1lbnQsIGZyYWdtZW50Qm9keS5pbm5lckhUTUwucmVwbGFjZSgvJm5ic3A7L2csICcgJykpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIFRPRE8gKDYuMCk6IE1ha2UgdGhpcyBhbiBpbnRlcm5hbCBoZWxwZXIgaW5zdGVhZCBvZiBtZW1iZXIgb2YgcGFzdGUgaGFuZGxlclxuICAgICAgICBpc0NvbW1vbkJsb2NrOiBmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgIHJldHVybiAoZWwgJiYgKGVsLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdwJyB8fCBlbC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnZGl2JykpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIFRPRE8gKDYuMCk6IE1ha2UgdGhpcyBhbiBpbnRlcm5hbCBoZWxwZXIgaW5zdGVhZCBvZiBtZW1iZXIgb2YgcGFzdGUgaGFuZGxlclxuICAgICAgICBmaWx0ZXJDb21tb25CbG9ja3M6IGZ1bmN0aW9uIChlbCkge1xuICAgICAgICAgICAgaWYgKC9eXFxzKiQvLnRlc3QoZWwudGV4dENvbnRlbnQpICYmIGVsLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgICAgICBlbC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGVsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvLyBUT0RPICg2LjApOiBNYWtlIHRoaXMgYW4gaW50ZXJuYWwgaGVscGVyIGluc3RlYWQgb2YgbWVtYmVyIG9mIHBhc3RlIGhhbmRsZXJcbiAgICAgICAgZmlsdGVyTGluZUJyZWFrOiBmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzQ29tbW9uQmxvY2soZWwucHJldmlvdXNFbGVtZW50U2libGluZykpIHtcbiAgICAgICAgICAgICAgICAvLyByZW1vdmUgc3RyYXkgYnIncyBmb2xsb3dpbmcgY29tbW9uIGJsb2NrIGVsZW1lbnRzXG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVXaXRoUGFyZW50KGVsKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5pc0NvbW1vbkJsb2NrKGVsLnBhcmVudE5vZGUpICYmIChlbC5wYXJlbnROb2RlLmZpcnN0Q2hpbGQgPT09IGVsIHx8IGVsLnBhcmVudE5vZGUubGFzdENoaWxkID09PSBlbCkpIHtcbiAgICAgICAgICAgICAgICAvLyByZW1vdmUgYnIncyBqdXN0IGluc2lkZSBvcGVuIG9yIGNsb3NlIHRhZ3Mgb2YgYSBkaXYvcFxuICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlV2l0aFBhcmVudChlbCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGVsLnBhcmVudE5vZGUgJiYgZWwucGFyZW50Tm9kZS5jaGlsZEVsZW1lbnRDb3VudCA9PT0gMSAmJiBlbC5wYXJlbnROb2RlLnRleHRDb250ZW50ID09PSAnJykge1xuICAgICAgICAgICAgICAgIC8vIGFuZCBicidzIHRoYXQgYXJlIHRoZSBvbmx5IGNoaWxkIG9mIGVsZW1lbnRzIG90aGVyIHRoYW4gZGl2L3BcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZVdpdGhQYXJlbnQoZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIFRPRE8gKDYuMCk6IE1ha2UgdGhpcyBhbiBpbnRlcm5hbCBoZWxwZXIgaW5zdGVhZCBvZiBtZW1iZXIgb2YgcGFzdGUgaGFuZGxlclxuICAgICAgICAvLyByZW1vdmUgYW4gZWxlbWVudCwgaW5jbHVkaW5nIGl0cyBwYXJlbnQsIGlmIGl0IGlzIHRoZSBvbmx5IGVsZW1lbnQgd2l0aGluIGl0cyBwYXJlbnRcbiAgICAgICAgcmVtb3ZlV2l0aFBhcmVudDogZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgICAgICBpZiAoZWwgJiYgZWwucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgIGlmIChlbC5wYXJlbnROb2RlLnBhcmVudE5vZGUgJiYgZWwucGFyZW50Tm9kZS5jaGlsZEVsZW1lbnRDb3VudCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICBlbC5wYXJlbnROb2RlLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZWwucGFyZW50Tm9kZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIFRPRE8gKDYuMCk6IE1ha2UgdGhpcyBhbiBpbnRlcm5hbCBoZWxwZXIgaW5zdGVhZCBvZiBtZW1iZXIgb2YgcGFzdGUgaGFuZGxlclxuICAgICAgICBjbGVhbnVwU3BhbnM6IGZ1bmN0aW9uIChjb250YWluZXJFbCkge1xuICAgICAgICAgICAgdmFyIGksXG4gICAgICAgICAgICAgICAgZWwsXG4gICAgICAgICAgICAgICAgbmV3RWwsXG4gICAgICAgICAgICAgICAgc3BhbnMgPSBjb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKCcucmVwbGFjZS13aXRoJyksXG4gICAgICAgICAgICAgICAgaXNDRUYgPSBmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChlbCAmJiBlbC5ub2RlTmFtZSAhPT0gJyN0ZXh0JyAmJiBlbC5nZXRBdHRyaWJ1dGUoJ2NvbnRlbnRlZGl0YWJsZScpID09PSAnZmFsc2UnKTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgc3BhbnMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICBlbCA9IHNwYW5zW2ldO1xuICAgICAgICAgICAgICAgIG5ld0VsID0gdGhpcy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KGVsLmNsYXNzTGlzdC5jb250YWlucygnYm9sZCcpID8gJ2InIDogJ2knKTtcblxuICAgICAgICAgICAgICAgIGlmIChlbC5jbGFzc0xpc3QuY29udGFpbnMoJ2JvbGQnKSAmJiBlbC5jbGFzc0xpc3QuY29udGFpbnMoJ2l0YWxpYycpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZCBhbiBpIHRhZyBhcyB3ZWxsIGlmIHRoaXMgaGFzIGJvdGggaXRhbGljcyBhbmQgYm9sZFxuICAgICAgICAgICAgICAgICAgICBuZXdFbC5pbm5lckhUTUwgPSAnPGk+JyArIGVsLmlubmVySFRNTCArICc8L2k+JztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBuZXdFbC5pbm5lckhUTUwgPSBlbC5pbm5lckhUTUw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld0VsLCBlbCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNwYW5zID0gY29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbCgnc3BhbicpO1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IHNwYW5zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgZWwgPSBzcGFuc1tpXTtcblxuICAgICAgICAgICAgICAgIC8vIGJhaWwgaWYgc3BhbiBpcyBpbiBjb250ZW50ZWRpdGFibGUgPSBmYWxzZVxuICAgICAgICAgICAgICAgIGlmIChNZWRpdW1FZGl0b3IudXRpbC50cmF2ZXJzZVVwKGVsLCBpc0NFRikpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIHJlbW92ZSBlbXB0eSBzcGFucywgcmVwbGFjZSBvdGhlcnMgd2l0aCB0aGVpciBjb250ZW50c1xuICAgICAgICAgICAgICAgIE1lZGl1bUVkaXRvci51dGlsLnVud3JhcChlbCwgdGhpcy5kb2N1bWVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIE1lZGl1bUVkaXRvci5leHRlbnNpb25zLnBhc3RlID0gUGFzdGVIYW5kbGVyO1xufSgpKTtcblxuKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgUGxhY2Vob2xkZXIgPSBNZWRpdW1FZGl0b3IuRXh0ZW5zaW9uLmV4dGVuZCh7XG4gICAgICAgIG5hbWU6ICdwbGFjZWhvbGRlcicsXG5cbiAgICAgICAgLyogUGxhY2Vob2xkZXIgT3B0aW9ucyAqL1xuXG4gICAgICAgIC8qIHRleHQ6IFtzdHJpbmddXG4gICAgICAgICAqIFRleHQgdG8gZGlzcGxheSBpbiB0aGUgcGxhY2Vob2xkZXJcbiAgICAgICAgICovXG4gICAgICAgIHRleHQ6ICdUeXBlIHlvdXIgdGV4dCcsXG5cbiAgICAgICAgLyogaGlkZU9uQ2xpY2s6IFtib29sZWFuXVxuICAgICAgICAgKiBTaG91bGQgd2UgaGlkZSB0aGUgcGxhY2Vob2xkZXIgb24gY2xpY2sgKHRydWUpIG9yIHdoZW4gdXNlciBzdGFydHMgdHlwaW5nIChmYWxzZSlcbiAgICAgICAgICovXG4gICAgICAgIGhpZGVPbkNsaWNrOiB0cnVlLFxuXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIE1lZGl1bUVkaXRvci5FeHRlbnNpb24ucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgICAgICAgICAgdGhpcy5pbml0UGxhY2Vob2xkZXJzKCk7XG4gICAgICAgICAgICB0aGlzLmF0dGFjaEV2ZW50SGFuZGxlcnMoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpbml0UGxhY2Vob2xkZXJzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmdldEVkaXRvckVsZW1lbnRzKCkuZm9yRWFjaCh0aGlzLmluaXRFbGVtZW50LCB0aGlzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVBZGRFbGVtZW50OiBmdW5jdGlvbiAoZXZlbnQsIGVkaXRhYmxlKSB7XG4gICAgICAgICAgICB0aGlzLmluaXRFbGVtZW50KGVkaXRhYmxlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBpbml0RWxlbWVudDogZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgICAgICBpZiAoIWVsLmdldEF0dHJpYnV0ZSgnZGF0YS1wbGFjZWhvbGRlcicpKSB7XG4gICAgICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlKCdkYXRhLXBsYWNlaG9sZGVyJywgdGhpcy50ZXh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMudXBkYXRlUGxhY2Vob2xkZXIoZWwpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGRlc3Ryb3k6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuZ2V0RWRpdG9yRWxlbWVudHMoKS5mb3JFYWNoKHRoaXMuY2xlYW51cEVsZW1lbnQsIHRoaXMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGhhbmRsZVJlbW92ZUVsZW1lbnQ6IGZ1bmN0aW9uIChldmVudCwgZWRpdGFibGUpIHtcbiAgICAgICAgICAgIHRoaXMuY2xlYW51cEVsZW1lbnQoZWRpdGFibGUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNsZWFudXBFbGVtZW50OiBmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgIGlmIChlbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGxhY2Vob2xkZXInKSA9PT0gdGhpcy50ZXh0KSB7XG4gICAgICAgICAgICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKCdkYXRhLXBsYWNlaG9sZGVyJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2hvd1BsYWNlaG9sZGVyOiBmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgIGlmIChlbCkge1xuICAgICAgICAgICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS95YWJ3ZS9tZWRpdW0tZWRpdG9yL2lzc3Vlcy8yMzRcbiAgICAgICAgICAgICAgICAvLyBJbiBmaXJlZm94LCBzdHlsaW5nIHRoZSBwbGFjZWhvbGRlciB3aXRoIGFuIGFic29sdXRlbHkgcG9zaXRpb25lZFxuICAgICAgICAgICAgICAgIC8vIHBzZXVkbyBlbGVtZW50IGNhdXNlcyB0aGUgY3Vyc29yIHRvIGFwcGVhciBpbiBhIGJhZCBsb2NhdGlvblxuICAgICAgICAgICAgICAgIC8vIHdoZW4gdGhlIGVsZW1lbnQgaXMgY29tcGxldGVseSBlbXB0eSwgc28gYXBwbHkgYSBkaWZmZXJlbnQgY2xhc3MgdG9cbiAgICAgICAgICAgICAgICAvLyBzdHlsZSBpdCB3aXRoIGEgcmVsYXRpdmVseSBwb3NpdGlvbmVkIHBzZXVkbyBlbGVtZW50XG4gICAgICAgICAgICAgICAgaWYgKE1lZGl1bUVkaXRvci51dGlsLmlzRkYgJiYgZWwuY2hpbGROb2Rlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuY2xhc3NMaXN0LmFkZCgnbWVkaXVtLWVkaXRvci1wbGFjZWhvbGRlci1yZWxhdGl2ZScpO1xuICAgICAgICAgICAgICAgICAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKCdtZWRpdW0tZWRpdG9yLXBsYWNlaG9sZGVyJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuY2xhc3NMaXN0LmFkZCgnbWVkaXVtLWVkaXRvci1wbGFjZWhvbGRlcicpO1xuICAgICAgICAgICAgICAgICAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKCdtZWRpdW0tZWRpdG9yLXBsYWNlaG9sZGVyLXJlbGF0aXZlJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGhpZGVQbGFjZWhvbGRlcjogZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgICAgICBpZiAoZWwpIHtcbiAgICAgICAgICAgICAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKCdtZWRpdW0tZWRpdG9yLXBsYWNlaG9sZGVyJyk7XG4gICAgICAgICAgICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZSgnbWVkaXVtLWVkaXRvci1wbGFjZWhvbGRlci1yZWxhdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIHVwZGF0ZVBsYWNlaG9sZGVyOiBmdW5jdGlvbiAoZWwsIGRvbnRTaG93KSB7XG4gICAgICAgICAgICAvLyBJZiB0aGUgZWxlbWVudCBoYXMgY29udGVudCwgaGlkZSB0aGUgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgIGlmIChlbC5xdWVyeVNlbGVjdG9yKCdpbWcsIGJsb2NrcXVvdGUsIHVsLCBvbCwgdGFibGUnKSB8fCAoZWwudGV4dENvbnRlbnQucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpICE9PSAnJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oaWRlUGxhY2Vob2xkZXIoZWwpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWRvbnRTaG93KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zaG93UGxhY2Vob2xkZXIoZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGF0dGFjaEV2ZW50SGFuZGxlcnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmhpZGVPbkNsaWNrKSB7XG4gICAgICAgICAgICAgICAgLy8gRm9yIHRoZSAnaGlkZU9uQ2xpY2snIG9wdGlvbiwgdGhlIHBsYWNlaG9sZGVyIHNob3VsZCBhbHdheXMgYmUgaGlkZGVuIG9uIGZvY3VzXG4gICAgICAgICAgICAgICAgdGhpcy5zdWJzY3JpYmUoJ2ZvY3VzJywgdGhpcy5oYW5kbGVGb2N1cy5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSWYgdGhlIGVkaXRvciBoYXMgY29udGVudCwgaXQgc2hvdWxkIGFsd2F5cyBoaWRlIHRoZSBwbGFjZWhvbGRlclxuICAgICAgICAgICAgdGhpcy5zdWJzY3JpYmUoJ2VkaXRhYmxlSW5wdXQnLCB0aGlzLmhhbmRsZUlucHV0LmJpbmQodGhpcykpO1xuXG4gICAgICAgICAgICAvLyBXaGVuIHRoZSBlZGl0b3IgbG9zZXMgZm9jdXMsIGNoZWNrIGlmIHRoZSBwbGFjZWhvbGRlciBzaG91bGQgYmUgdmlzaWJsZVxuICAgICAgICAgICAgdGhpcy5zdWJzY3JpYmUoJ2JsdXInLCB0aGlzLmhhbmRsZUJsdXIuYmluZCh0aGlzKSk7XG5cbiAgICAgICAgICAgIC8vIE5lZWQgdG8ga25vdyB3aGVuIGVsZW1lbnRzIGFyZSBhZGRlZC9yZW1vdmVkIGZyb20gdGhlIGVkaXRvclxuICAgICAgICAgICAgdGhpcy5zdWJzY3JpYmUoJ2FkZEVsZW1lbnQnLCB0aGlzLmhhbmRsZUFkZEVsZW1lbnQuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICB0aGlzLnN1YnNjcmliZSgncmVtb3ZlRWxlbWVudCcsIHRoaXMuaGFuZGxlUmVtb3ZlRWxlbWVudC5iaW5kKHRoaXMpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVJbnB1dDogZnVuY3Rpb24gKGV2ZW50LCBlbGVtZW50KSB7XG4gICAgICAgICAgICAvLyBJZiB0aGUgcGxhY2Vob2xkZXIgc2hvdWxkIGJlIGhpZGRlbiBvbiBmb2N1cyBhbmQgdGhlXG4gICAgICAgICAgICAvLyBlbGVtZW50IGhhcyBmb2N1cywgZG9uJ3Qgc2hvdyB0aGUgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgIHZhciBkb250U2hvdyA9IHRoaXMuaGlkZU9uQ2xpY2sgJiYgKGVsZW1lbnQgPT09IHRoaXMuYmFzZS5nZXRGb2N1c2VkRWxlbWVudCgpKTtcblxuICAgICAgICAgICAgLy8gRWRpdG9yJ3MgY29udGVudCBoYXMgY2hhbmdlZCwgY2hlY2sgaWYgdGhlIHBsYWNlaG9sZGVyIHNob3VsZCBiZSBoaWRkZW5cbiAgICAgICAgICAgIHRoaXMudXBkYXRlUGxhY2Vob2xkZXIoZWxlbWVudCwgZG9udFNob3cpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGhhbmRsZUZvY3VzOiBmdW5jdGlvbiAoZXZlbnQsIGVsZW1lbnQpIHtcbiAgICAgICAgICAgIC8vIEVkaXRvciBoYXMgZm9jdXMsIGhpZGUgdGhlIHBsYWNlaG9sZGVyXG4gICAgICAgICAgICB0aGlzLmhpZGVQbGFjZWhvbGRlcihlbGVtZW50KTtcbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVCbHVyOiBmdW5jdGlvbiAoZXZlbnQsIGVsZW1lbnQpIHtcbiAgICAgICAgICAgIC8vIEVkaXRvciBoYXMgbG9zdCBmb2N1cywgY2hlY2sgaWYgdGhlIHBsYWNlaG9sZGVyIHNob3VsZCBiZSBzaG93blxuICAgICAgICAgICAgdGhpcy51cGRhdGVQbGFjZWhvbGRlcihlbGVtZW50KTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgTWVkaXVtRWRpdG9yLmV4dGVuc2lvbnMucGxhY2Vob2xkZXIgPSBQbGFjZWhvbGRlcjtcbn0oKSk7XG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIFRvb2xiYXIgPSBNZWRpdW1FZGl0b3IuRXh0ZW5zaW9uLmV4dGVuZCh7XG4gICAgICAgIG5hbWU6ICd0b29sYmFyJyxcblxuICAgICAgICAvKiBUb29sYmFyIE9wdGlvbnMgKi9cblxuICAgICAgICAvKiBhbGlnbjogWydsZWZ0J3wnY2VudGVyJ3wncmlnaHQnXVxuICAgICAgICAgKiBXaGVuIHRoZSBfX3N0YXRpY19fIG9wdGlvbiBpcyB0cnVlLCB0aGlzIGFsaWducyB0aGUgc3RhdGljIHRvb2xiYXJcbiAgICAgICAgICogcmVsYXRpdmUgdG8gdGhlIG1lZGl1bS1lZGl0b3IgZWxlbWVudC5cbiAgICAgICAgICovXG4gICAgICAgIGFsaWduOiAnY2VudGVyJyxcblxuICAgICAgICAvKiBhbGxvd011bHRpUGFyYWdyYXBoU2VsZWN0aW9uOiBbYm9vbGVhbl1cbiAgICAgICAgICogZW5hYmxlcy9kaXNhYmxlcyB3aGV0aGVyIHRoZSB0b29sYmFyIHNob3VsZCBiZSBkaXNwbGF5ZWQgd2hlblxuICAgICAgICAgKiBzZWxlY3RpbmcgbXVsdGlwbGUgcGFyYWdyYXBocy9ibG9jayBlbGVtZW50c1xuICAgICAgICAgKi9cbiAgICAgICAgYWxsb3dNdWx0aVBhcmFncmFwaFNlbGVjdGlvbjogdHJ1ZSxcblxuICAgICAgICAvKiBidXR0b25zOiBbQXJyYXldXG4gICAgICAgICAqIHRoZSBuYW1lcyBvZiB0aGUgc2V0IG9mIGJ1dHRvbnMgdG8gZGlzcGxheSBvbiB0aGUgdG9vbGJhci5cbiAgICAgICAgICovXG4gICAgICAgIGJ1dHRvbnM6IFsnYm9sZCcsICdpdGFsaWMnLCAndW5kZXJsaW5lJywgJ2FuY2hvcicsICdoMicsICdoMycsICdxdW90ZSddLFxuXG4gICAgICAgIC8qIGRpZmZMZWZ0OiBbTnVtYmVyXVxuICAgICAgICAgKiB2YWx1ZSBpbiBwaXhlbHMgdG8gYmUgYWRkZWQgdG8gdGhlIFggYXhpcyBwb3NpdGlvbmluZyBvZiB0aGUgdG9vbGJhci5cbiAgICAgICAgICovXG4gICAgICAgIGRpZmZMZWZ0OiAwLFxuXG4gICAgICAgIC8qIGRpZmZUb3A6IFtOdW1iZXJdXG4gICAgICAgICAqIHZhbHVlIGluIHBpeGVscyB0byBiZSBhZGRlZCB0byB0aGUgWSBheGlzIHBvc2l0aW9uaW5nIG9mIHRoZSB0b29sYmFyLlxuICAgICAgICAgKi9cbiAgICAgICAgZGlmZlRvcDogLTEwLFxuXG4gICAgICAgIC8qIGZpcnN0QnV0dG9uQ2xhc3M6IFtzdHJpbmddXG4gICAgICAgICAqIENTUyBjbGFzcyBhZGRlZCB0byB0aGUgZmlyc3QgYnV0dG9uIGluIHRoZSB0b29sYmFyLlxuICAgICAgICAgKi9cbiAgICAgICAgZmlyc3RCdXR0b25DbGFzczogJ21lZGl1bS1lZGl0b3ItYnV0dG9uLWZpcnN0JyxcblxuICAgICAgICAvKiBsYXN0QnV0dG9uQ2xhc3M6IFtzdHJpbmddXG4gICAgICAgICAqIENTUyBjbGFzcyBhZGRlZCB0byB0aGUgbGFzdCBidXR0b24gaW4gdGhlIHRvb2xiYXIuXG4gICAgICAgICAqL1xuICAgICAgICBsYXN0QnV0dG9uQ2xhc3M6ICdtZWRpdW0tZWRpdG9yLWJ1dHRvbi1sYXN0JyxcblxuICAgICAgICAvKiBzdGFuZGFyZGl6ZVNlbGVjdGlvblN0YXJ0OiBbYm9vbGVhbl1cbiAgICAgICAgICogZW5hYmxlcy9kaXNhYmxlcyBzdGFuZGFyZGl6aW5nIGhvdyB0aGUgYmVnaW5uaW5nIG9mIGEgcmFuZ2UgaXMgZGVjaWRlZFxuICAgICAgICAgKiBiZXR3ZWVuIGJyb3dzZXJzIHdoZW5ldmVyIHRoZSBzZWxlY3RlZCB0ZXh0IGlzIGFuYWx5emVkIGZvciB1cGRhdGluZyB0b29sYmFyIGJ1dHRvbnMgc3RhdHVzLlxuICAgICAgICAgKi9cbiAgICAgICAgc3RhbmRhcmRpemVTZWxlY3Rpb25TdGFydDogZmFsc2UsXG5cbiAgICAgICAgLyogc3RhdGljOiBbYm9vbGVhbl1cbiAgICAgICAgICogZW5hYmxlL2Rpc2FibGUgdGhlIHRvb2xiYXIgYWx3YXlzIGRpc3BsYXlpbmcgaW4gdGhlIHNhbWUgbG9jYXRpb25cbiAgICAgICAgICogcmVsYXRpdmUgdG8gdGhlIG1lZGl1bS1lZGl0b3IgZWxlbWVudC5cbiAgICAgICAgICovXG4gICAgICAgIHN0YXRpYzogZmFsc2UsXG5cbiAgICAgICAgLyogc3RpY2t5OiBbYm9vbGVhbl1cbiAgICAgICAgICogV2hlbiB0aGUgX19zdGF0aWNfXyBvcHRpb24gaXMgdHJ1ZSwgdGhpcyBlbmFibGVzL2Rpc2FibGVzIHRoZSB0b29sYmFyXG4gICAgICAgICAqIFwic3RpY2tpbmdcIiB0byB0aGUgdmlld3BvcnQgYW5kIHN0YXlpbmcgdmlzaWJsZSBvbiB0aGUgc2NyZWVuIHdoaWxlXG4gICAgICAgICAqIHRoZSBwYWdlIHNjcm9sbHMuXG4gICAgICAgICAqL1xuICAgICAgICBzdGlja3k6IGZhbHNlLFxuXG4gICAgICAgIC8qIHN0aWNreVRvcE9mZnNldDogW051bWJlcl1cbiAgICAgICAgICogVmFsdWUgaW4gcGl4ZWwgb2YgdGhlIHRvcCBvZmZzZXQgYWJvdmUgdGhlIHRvb2xiYXJcbiAgICAgICAgICovXG4gICAgICAgIHN0aWNreVRvcE9mZnNldDogMCxcblxuICAgICAgICAvKiB1cGRhdGVPbkVtcHR5U2VsZWN0aW9uOiBbYm9vbGVhbl1cbiAgICAgICAgICogV2hlbiB0aGUgX19zdGF0aWNfXyBvcHRpb24gaXMgdHJ1ZSwgdGhpcyBlbmFibGVzL2Rpc2FibGVzIHVwZGF0aW5nXG4gICAgICAgICAqIHRoZSBzdGF0ZSBvZiB0aGUgdG9vbGJhciBidXR0b25zIGV2ZW4gd2hlbiB0aGUgc2VsZWN0aW9uIGlzIGNvbGxhcHNlZFxuICAgICAgICAgKiAodGhlcmUgaXMgbm8gc2VsZWN0aW9uLCBqdXN0IGEgY3Vyc29yKS5cbiAgICAgICAgICovXG4gICAgICAgIHVwZGF0ZU9uRW1wdHlTZWxlY3Rpb246IGZhbHNlLFxuXG4gICAgICAgIC8qIHJlbGF0aXZlQ29udGFpbmVyOiBbbm9kZV1cbiAgICAgICAgICogYXBwZW5kaW5nIHRoZSB0b29sYmFyIHRvIGEgZ2l2ZW4gbm9kZSBpbnN0ZWFkIG9mIGJvZHlcbiAgICAgICAgICovXG4gICAgICAgIHJlbGF0aXZlQ29udGFpbmVyOiBudWxsLFxuXG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIE1lZGl1bUVkaXRvci5FeHRlbnNpb24ucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgICAgICAgICAgdGhpcy5pbml0VGhyb3R0bGVkTWV0aG9kcygpO1xuXG4gICAgICAgICAgICBpZiAoIXRoaXMucmVsYXRpdmVDb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmdldEVkaXRvck9wdGlvbignZWxlbWVudHNDb250YWluZXInKS5hcHBlbmRDaGlsZCh0aGlzLmdldFRvb2xiYXJFbGVtZW50KCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbGF0aXZlQ29udGFpbmVyLmFwcGVuZENoaWxkKHRoaXMuZ2V0VG9vbGJhckVsZW1lbnQoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gSGVscGVyIG1ldGhvZCB0byBleGVjdXRlIG1ldGhvZCBmb3IgZXZlcnkgZXh0ZW5zaW9uLCBidXQgaWdub3JpbmcgdGhlIHRvb2xiYXIgZXh0ZW5zaW9uXG4gICAgICAgIGZvckVhY2hFeHRlbnNpb246IGZ1bmN0aW9uIChpdGVyYXRvciwgY29udGV4dCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYmFzZS5leHRlbnNpb25zLmZvckVhY2goZnVuY3Rpb24gKGNvbW1hbmQpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29tbWFuZCA9PT0gdGhpcykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBpdGVyYXRvci5hcHBseShjb250ZXh0IHx8IHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBUb29sYmFyIGNyZWF0aW9uL2RlbGV0aW9uXG5cbiAgICAgICAgY3JlYXRlVG9vbGJhcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHRvb2xiYXIgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gICAgICAgICAgICB0b29sYmFyLmlkID0gJ21lZGl1bS1lZGl0b3ItdG9vbGJhci0nICsgdGhpcy5nZXRFZGl0b3JJZCgpO1xuICAgICAgICAgICAgdG9vbGJhci5jbGFzc05hbWUgPSAnbWVkaXVtLWVkaXRvci10b29sYmFyJztcblxuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGljKSB7XG4gICAgICAgICAgICAgICAgdG9vbGJhci5jbGFzc05hbWUgKz0gJyBzdGF0aWMtdG9vbGJhcic7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMucmVsYXRpdmVDb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICB0b29sYmFyLmNsYXNzTmFtZSArPSAnIG1lZGl1bS1lZGl0b3ItcmVsYXRpdmUtdG9vbGJhcic7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRvb2xiYXIuY2xhc3NOYW1lICs9ICcgbWVkaXVtLWVkaXRvci1zdGFsa2VyLXRvb2xiYXInO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0b29sYmFyLmFwcGVuZENoaWxkKHRoaXMuY3JlYXRlVG9vbGJhckJ1dHRvbnMoKSk7XG5cbiAgICAgICAgICAgIC8vIEFkZCBhbnkgZm9ybXMgdGhhdCBleHRlbnNpb25zIG1heSBoYXZlXG4gICAgICAgICAgICB0aGlzLmZvckVhY2hFeHRlbnNpb24oZnVuY3Rpb24gKGV4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgIGlmIChleHRlbnNpb24uaGFzRm9ybSkge1xuICAgICAgICAgICAgICAgICAgICB0b29sYmFyLmFwcGVuZENoaWxkKGV4dGVuc2lvbi5nZXRGb3JtKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLmF0dGFjaEV2ZW50SGFuZGxlcnMoKTtcblxuICAgICAgICAgICAgcmV0dXJuIHRvb2xiYXI7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY3JlYXRlVG9vbGJhckJ1dHRvbnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB1bCA9IHRoaXMuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndWwnKSxcbiAgICAgICAgICAgICAgICBsaSxcbiAgICAgICAgICAgICAgICBidG4sXG4gICAgICAgICAgICAgICAgYnV0dG9ucyxcbiAgICAgICAgICAgICAgICBleHRlbnNpb24sXG4gICAgICAgICAgICAgICAgYnV0dG9uTmFtZSxcbiAgICAgICAgICAgICAgICBidXR0b25PcHRzO1xuXG4gICAgICAgICAgICB1bC5pZCA9ICdtZWRpdW0tZWRpdG9yLXRvb2xiYXItYWN0aW9ucycgKyB0aGlzLmdldEVkaXRvcklkKCk7XG4gICAgICAgICAgICB1bC5jbGFzc05hbWUgPSAnbWVkaXVtLWVkaXRvci10b29sYmFyLWFjdGlvbnMnO1xuICAgICAgICAgICAgdWwuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG5cbiAgICAgICAgICAgIHRoaXMuYnV0dG9ucy5mb3JFYWNoKGZ1bmN0aW9uIChidXR0b24pIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGJ1dHRvbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9uTmFtZSA9IGJ1dHRvbjtcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9uT3B0cyA9IG51bGw7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9uTmFtZSA9IGJ1dHRvbi5uYW1lO1xuICAgICAgICAgICAgICAgICAgICBidXR0b25PcHRzID0gYnV0dG9uO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBidXR0b24gYWxyZWFkeSBleGlzdHMgYXMgYW4gZXh0ZW5zaW9uLCBpdCdsbCBiZSByZXR1cm5lZFxuICAgICAgICAgICAgICAgIC8vIG90aHdlcmlzZSBpdCdsbCBjcmVhdGUgdGhlIGRlZmF1bHQgYnVpbHQtaW4gYnV0dG9uXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uID0gdGhpcy5iYXNlLmFkZEJ1aWx0SW5FeHRlbnNpb24oYnV0dG9uTmFtZSwgYnV0dG9uT3B0cyk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uICYmIHR5cGVvZiBleHRlbnNpb24uZ2V0QnV0dG9uID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ0biA9IGV4dGVuc2lvbi5nZXRCdXR0b24odGhpcy5iYXNlKTtcbiAgICAgICAgICAgICAgICAgICAgbGkgPSB0aGlzLmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChNZWRpdW1FZGl0b3IudXRpbC5pc0VsZW1lbnQoYnRuKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGkuYXBwZW5kQ2hpbGQoYnRuKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpLmlubmVySFRNTCA9IGJ0bjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB1bC5hcHBlbmRDaGlsZChsaSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgICAgIGJ1dHRvbnMgPSB1bC5xdWVyeVNlbGVjdG9yQWxsKCdidXR0b24nKTtcbiAgICAgICAgICAgIGlmIChidXR0b25zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBidXR0b25zWzBdLmNsYXNzTGlzdC5hZGQodGhpcy5maXJzdEJ1dHRvbkNsYXNzKTtcbiAgICAgICAgICAgICAgICBidXR0b25zW2J1dHRvbnMubGVuZ3RoIC0gMV0uY2xhc3NMaXN0LmFkZCh0aGlzLmxhc3RCdXR0b25DbGFzcyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB1bDtcbiAgICAgICAgfSxcblxuICAgICAgICBkZXN0cm95OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50b29sYmFyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudG9vbGJhci5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudG9vbGJhci5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMudG9vbGJhcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnRvb2xiYXI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gVG9vbGJhciBhY2Nlc3NvcnNcblxuICAgICAgICBnZXRJbnRlcmFjdGlvbkVsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRUb29sYmFyRWxlbWVudCgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFRvb2xiYXJFbGVtZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMudG9vbGJhcikge1xuICAgICAgICAgICAgICAgIHRoaXMudG9vbGJhciA9IHRoaXMuY3JlYXRlVG9vbGJhcigpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b29sYmFyO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFRvb2xiYXJBY3Rpb25zRWxlbWVudDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VG9vbGJhckVsZW1lbnQoKS5xdWVyeVNlbGVjdG9yKCcubWVkaXVtLWVkaXRvci10b29sYmFyLWFjdGlvbnMnKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBUb29sYmFyIGV2ZW50IGhhbmRsZXJzXG5cbiAgICAgICAgaW5pdFRocm90dGxlZE1ldGhvZHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIHRocm90dGxlZFBvc2l0aW9uVG9vbGJhciBpcyB0aHJvdHRsZWQgYmVjYXVzZTpcbiAgICAgICAgICAgIC8vIC0gSXQgd2lsbCBiZSBjYWxsZWQgd2hlbiB0aGUgYnJvd3NlciBpcyByZXNpemluZywgd2hpY2ggY2FuIGZpcmUgbWFueSB0aW1lcyB2ZXJ5IHF1aWNrbHlcbiAgICAgICAgICAgIC8vIC0gRm9yIHNvbWUgZXZlbnQgKGxpa2UgcmVzaXplKSBhIHNsaWdodCBsYWcgaW4gVUkgcmVzcG9uc2l2ZW5lc3MgaXMgT0sgYW5kIHByb3ZpZGVzIHBlcmZvcm1hbmNlIGJlbmVmaXRzXG4gICAgICAgICAgICB0aGlzLnRocm90dGxlZFBvc2l0aW9uVG9vbGJhciA9IE1lZGl1bUVkaXRvci51dGlsLnRocm90dGxlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5iYXNlLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9zaXRpb25Ub29sYmFySWZTaG93bigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYXR0YWNoRXZlbnRIYW5kbGVyczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gTWVkaXVtRWRpdG9yIGN1c3RvbSBldmVudHMgZm9yIHdoZW4gdXNlciBiZWluZ3MgYW5kIGVuZHMgaW50ZXJhY3Rpb24gd2l0aCBhIGNvbnRlbnRlZGl0YWJsZSBhbmQgaXRzIGVsZW1lbnRzXG4gICAgICAgICAgICB0aGlzLnN1YnNjcmliZSgnYmx1cicsIHRoaXMuaGFuZGxlQmx1ci5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIHRoaXMuc3Vic2NyaWJlKCdmb2N1cycsIHRoaXMuaGFuZGxlRm9jdXMuYmluZCh0aGlzKSk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0aW5nIHRoZSBzdGF0ZSBvZiB0aGUgdG9vbGJhciBhcyB0aGluZ3MgY2hhbmdlXG4gICAgICAgICAgICB0aGlzLnN1YnNjcmliZSgnZWRpdGFibGVDbGljaycsIHRoaXMuaGFuZGxlRWRpdGFibGVDbGljay5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIHRoaXMuc3Vic2NyaWJlKCdlZGl0YWJsZUtleXVwJywgdGhpcy5oYW5kbGVFZGl0YWJsZUtleXVwLmJpbmQodGhpcykpO1xuXG4gICAgICAgICAgICAvLyBIYW5kbGUgbW91c2V1cCBvbiBkb2N1bWVudCBmb3IgdXBkYXRpbmcgdGhlIHNlbGVjdGlvbiBpbiB0aGUgdG9vbGJhclxuICAgICAgICAgICAgdGhpcy5vbih0aGlzLmRvY3VtZW50LmRvY3VtZW50RWxlbWVudCwgJ21vdXNldXAnLCB0aGlzLmhhbmRsZURvY3VtZW50TW91c2V1cC5iaW5kKHRoaXMpKTtcblxuICAgICAgICAgICAgLy8gQWRkIGEgc2Nyb2xsIGV2ZW50IGZvciBzdGlja3kgdG9vbGJhclxuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGljICYmIHRoaXMuc3RpY2t5KSB7XG4gICAgICAgICAgICAgICAgLy8gT24gc2Nyb2xsIChjYXB0dXJlKSwgcmUtcG9zaXRpb24gdGhlIHRvb2xiYXJcbiAgICAgICAgICAgICAgICB0aGlzLm9uKHRoaXMud2luZG93LCAnc2Nyb2xsJywgdGhpcy5oYW5kbGVXaW5kb3dTY3JvbGwuYmluZCh0aGlzKSwgdHJ1ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE9uIHJlc2l6ZSwgcmUtcG9zaXRpb24gdGhlIHRvb2xiYXJcbiAgICAgICAgICAgIHRoaXMub24odGhpcy53aW5kb3csICdyZXNpemUnLCB0aGlzLmhhbmRsZVdpbmRvd1Jlc2l6ZS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVXaW5kb3dTY3JvbGw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb25Ub29sYmFySWZTaG93bigpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGhhbmRsZVdpbmRvd1Jlc2l6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy50aHJvdHRsZWRQb3NpdGlvblRvb2xiYXIoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVEb2N1bWVudE1vdXNldXA6IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgLy8gRG8gbm90IHRyaWdnZXIgY2hlY2tTdGF0ZSB3aGVuIG1vdXNldXAgZmlyZXMgb3ZlciB0aGUgdG9vbGJhclxuICAgICAgICAgICAgaWYgKGV2ZW50ICYmXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnRhcmdldCAmJlxuICAgICAgICAgICAgICAgICAgICBNZWRpdW1FZGl0b3IudXRpbC5pc0Rlc2NlbmRhbnQodGhpcy5nZXRUb29sYmFyRWxlbWVudCgpLCBldmVudC50YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jaGVja1N0YXRlKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaGFuZGxlRWRpdGFibGVDbGljazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gRGVsYXkgdGhlIGNhbGwgdG8gY2hlY2tTdGF0ZSB0byBoYW5kbGUgYnVnIHdoZXJlIHNlbGVjdGlvbiBpcyBlbXB0eVxuICAgICAgICAgICAgLy8gaW1tZWRpYXRlbHkgYWZ0ZXIgY2xpY2tpbmcgaW5zaWRlIGEgcHJlLWV4aXN0aW5nIHNlbGVjdGlvblxuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jaGVja1N0YXRlKCk7XG4gICAgICAgICAgICB9LmJpbmQodGhpcyksIDApO1xuICAgICAgICB9LFxuXG4gICAgICAgIGhhbmRsZUVkaXRhYmxlS2V5dXA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuY2hlY2tTdGF0ZSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGhhbmRsZUJsdXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIEtpbGwgYW55IHByZXZpb3VzbHkgZGVsYXllZCBjYWxscyB0byBoaWRlIHRoZSB0b29sYmFyXG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5oaWRlVGltZW91dCk7XG5cbiAgICAgICAgICAgIC8vIEJsdXIgbWF5IGZpcmUgZXZlbiBpZiB3ZSBoYXZlIGEgc2VsZWN0aW9uLCBzbyB3ZSB3YW50IHRvIHByZXZlbnQgYW55IGRlbGF5ZWQgc2hvd1Rvb2xiYXJcbiAgICAgICAgICAgIC8vIGNhbGxzIGZyb20gaGFwcGVuaW5nIGluIHRoaXMgc3BlY2lmaWMgY2FzZVxuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuZGVsYXlTaG93VGltZW91dCk7XG5cbiAgICAgICAgICAgIC8vIERlbGF5IHRoZSBjYWxsIHRvIGhpZGVUb29sYmFyIHRvIGhhbmRsZSBidWcgd2l0aCBtdWx0aXBsZSBlZGl0b3JzIG9uIHRoZSBwYWdlIGF0IG9uY2VcbiAgICAgICAgICAgIHRoaXMuaGlkZVRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGVUb29sYmFyKCk7XG4gICAgICAgICAgICB9LmJpbmQodGhpcyksIDEpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGhhbmRsZUZvY3VzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmNoZWNrU3RhdGUoKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvLyBIaWRpbmcvc2hvd2luZyB0b29sYmFyXG5cbiAgICAgICAgaXNEaXNwbGF5ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldFRvb2xiYXJFbGVtZW50KCkuY2xhc3NMaXN0LmNvbnRhaW5zKCdtZWRpdW0tZWRpdG9yLXRvb2xiYXItYWN0aXZlJyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2hvd1Rvb2xiYXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLmhpZGVUaW1lb3V0KTtcbiAgICAgICAgICAgIGlmICghdGhpcy5pc0Rpc3BsYXllZCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5nZXRUb29sYmFyRWxlbWVudCgpLmNsYXNzTGlzdC5hZGQoJ21lZGl1bS1lZGl0b3ItdG9vbGJhci1hY3RpdmUnKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ3Nob3dUb29sYmFyJywge30sIHRoaXMuYmFzZS5nZXRGb2N1c2VkRWxlbWVudCgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBoaWRlVG9vbGJhcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNEaXNwbGF5ZWQoKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZ2V0VG9vbGJhckVsZW1lbnQoKS5jbGFzc0xpc3QucmVtb3ZlKCdtZWRpdW0tZWRpdG9yLXRvb2xiYXItYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdoaWRlVG9vbGJhcicsIHt9LCB0aGlzLmJhc2UuZ2V0Rm9jdXNlZEVsZW1lbnQoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNUb29sYmFyRGVmYXVsdEFjdGlvbnNEaXNwbGF5ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldFRvb2xiYXJBY3Rpb25zRWxlbWVudCgpLnN0eWxlLmRpc3BsYXkgPT09ICdibG9jayc7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaGlkZVRvb2xiYXJEZWZhdWx0QWN0aW9uczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNUb29sYmFyRGVmYXVsdEFjdGlvbnNEaXNwbGF5ZWQoKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZ2V0VG9vbGJhckFjdGlvbnNFbGVtZW50KCkuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBzaG93VG9vbGJhckRlZmF1bHRBY3Rpb25zOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmhpZGVFeHRlbnNpb25Gb3JtcygpO1xuXG4gICAgICAgICAgICBpZiAoIXRoaXMuaXNUb29sYmFyRGVmYXVsdEFjdGlvbnNEaXNwbGF5ZWQoKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZ2V0VG9vbGJhckFjdGlvbnNFbGVtZW50KCkuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVzaW5nIHNldFRpbWVvdXQgKyBvcHRpb25zLmRlbGF5IGJlY2F1c2U6XG4gICAgICAgICAgICAvLyBXZSB3aWxsIGFjdHVhbGx5IGJlIGRpc3BsYXlpbmcgdGhlIHRvb2xiYXIsIHdoaWNoIHNob3VsZCBiZSBjb250cm9sbGVkIGJ5IG9wdGlvbnMuZGVsYXlcbiAgICAgICAgICAgIHRoaXMuZGVsYXlTaG93VGltZW91dCA9IHRoaXMuYmFzZS5kZWxheShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zaG93VG9vbGJhcigpO1xuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfSxcblxuICAgICAgICBoaWRlRXh0ZW5zaW9uRm9ybXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIEhpZGUgYWxsIGV4dGVuc2lvbiBmb3Jtc1xuICAgICAgICAgICAgdGhpcy5mb3JFYWNoRXh0ZW5zaW9uKGZ1bmN0aW9uIChleHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uLmhhc0Zvcm0gJiYgZXh0ZW5zaW9uLmlzRGlzcGxheWVkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmhpZGVGb3JtKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gUmVzcG9uZGluZyB0byBjaGFuZ2VzIGluIHVzZXIgc2VsZWN0aW9uXG5cbiAgICAgICAgLy8gQ2hlY2tzIGZvciBleGlzdGFuY2Ugb2YgbXVsdGlwbGUgYmxvY2sgZWxlbWVudHMgaW4gdGhlIGN1cnJlbnQgc2VsZWN0aW9uXG4gICAgICAgIG11bHRpcGxlQmxvY2tFbGVtZW50c1NlbGVjdGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcmVnZXhFbXB0eUhUTUxUYWdzID0gLzxbXlxcLz5dW14+XSo+PFxcL1tePl0rPi9naW0sIC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMzEyOTczOC9yZW1vdmUtZW1wdHktdGFncy11c2luZy1yZWdleFxuICAgICAgICAgICAgICAgIHJlZ2V4QmxvY2tFbGVtZW50cyA9IG5ldyBSZWdFeHAoJzwoJyArIE1lZGl1bUVkaXRvci51dGlsLmJsb2NrQ29udGFpbmVyRWxlbWVudE5hbWVzLmpvaW4oJ3wnKSArICcpW14+XSo+JywgJ2cnKSxcbiAgICAgICAgICAgICAgICBzZWxlY3Rpb25IVE1MID0gTWVkaXVtRWRpdG9yLnNlbGVjdGlvbi5nZXRTZWxlY3Rpb25IdG1sKHRoaXMuZG9jdW1lbnQpLnJlcGxhY2UocmVnZXhFbXB0eUhUTUxUYWdzLCAnJyksIC8vIEZpbHRlciBvdXQgZW1wdHkgYmxvY2tzIGZyb20gc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgaGFzTXVsdGlQYXJhZ3JhcGhzID0gc2VsZWN0aW9uSFRNTC5tYXRjaChyZWdleEJsb2NrRWxlbWVudHMpOyAvLyBGaW5kIGhvdyBtYW55IGJsb2NrIGVsZW1lbnRzIGFyZSB3aXRoaW4gdGhlIGh0bWxcblxuICAgICAgICAgICAgcmV0dXJuICEhaGFzTXVsdGlQYXJhZ3JhcGhzICYmIGhhc011bHRpUGFyYWdyYXBocy5sZW5ndGggPiAxO1xuICAgICAgICB9LFxuXG4gICAgICAgIG1vZGlmeVNlbGVjdGlvbjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHNlbGVjdGlvbiA9IHRoaXMud2luZG93LmdldFNlbGVjdGlvbigpLFxuICAgICAgICAgICAgICAgIHNlbGVjdGlvblJhbmdlID0gc2VsZWN0aW9uLmdldFJhbmdlQXQoMCk7XG5cbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAqIEluIGZpcmVmb3gsIHRoZXJlIGFyZSBjYXNlcyAoaWUgZG91YmxlY2xpY2sgb2YgYSB3b3JkKSB3aGVyZSB0aGUgc2VsZWN0aW9uUmFuZ2Ugc3RhcnRcbiAgICAgICAgICAgICogd2lsbCBiZSBhdCB0aGUgdmVyeSBlbmQgb2YgYW4gZWxlbWVudC4gIEluIG90aGVyIGJyb3dzZXJzLCB0aGUgc2VsZWN0aW9uUmFuZ2Ugc3RhcnRcbiAgICAgICAgICAgICogd291bGQgaW5zdGVhZCBiZSBhdCB0aGUgdmVyeSBiZWdpbm5pbmcgb2YgYW4gZWxlbWVudCB0aGF0IGFjdHVhbGx5IGhhcyBjb250ZW50LlxuICAgICAgICAgICAgKiBleGFtcGxlOlxuICAgICAgICAgICAgKiAgIDxzcGFuPmZvbzwvc3Bhbj48c3Bhbj5iYXI8L3NwYW4+XG4gICAgICAgICAgICAqXG4gICAgICAgICAgICAqIElmIHRoZSB0ZXh0ICdiYXInIGlzIHNlbGVjdGVkLCBtb3N0IGJyb3dzZXJzIHdpbGwgaGF2ZSB0aGUgc2VsZWN0aW9uUmFuZ2Ugc3RhcnQgYXQgdGhlIGJlZ2lubmluZ1xuICAgICAgICAgICAgKiBvZiB0aGUgJ2Jhcicgc3Bhbi4gIEhvd2V2ZXIsIHRoZXJlIGFyZSBjYXNlcyB3aGVyZSBmaXJlZm94IHdpbGwgaGF2ZSB0aGUgc2VsZWN0aW9uUmFuZ2Ugc3RhcnRcbiAgICAgICAgICAgICogYXQgdGhlIGVuZCBvZiB0aGUgJ2Zvbycgc3Bhbi4gIFRoZSBjb250ZW50ZWRpdGFibGUgYmVoYXZpb3Igd2lsbCBiZSBvaywgYnV0IGlmIHRoZXJlIGFyZSBhbnlcbiAgICAgICAgICAgICogcHJvcGVydGllcyBvbiB0aGUgJ2Jhcicgc3BhbiwgdGhleSB3b24ndCBiZSByZWZsZWN0ZWQgYWNjdXJhdGVseSBpbiB0aGUgdG9vbGJhclxuICAgICAgICAgICAgKiAoaWUgJ0JvbGQnIGJ1dHRvbiB3b3VsZG4ndCBiZSBhY3RpdmUpXG4gICAgICAgICAgICAqXG4gICAgICAgICAgICAqIFNvLCBmb3IgY2FzZXMgd2hlcmUgdGhlIHNlbGVjdGlvblJhbmdlIHN0YXJ0IGlzIGF0IHRoZSBlbmQgb2YgYW4gZWxlbWVudC9ub2RlLCBmaW5kIHRoZSBuZXh0XG4gICAgICAgICAgICAqIGFkamFjZW50IHRleHQgbm9kZSB0aGF0IGFjdHVhbGx5IGhhcyBjb250ZW50IGluIGl0LCBhbmQgbW92ZSB0aGUgc2VsZWN0aW9uUmFuZ2Ugc3RhcnQgdGhlcmUuXG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RhbmRhcmRpemVTZWxlY3Rpb25TdGFydCAmJlxuICAgICAgICAgICAgICAgICAgICBzZWxlY3Rpb25SYW5nZS5zdGFydENvbnRhaW5lci5ub2RlVmFsdWUgJiZcbiAgICAgICAgICAgICAgICAgICAgKHNlbGVjdGlvblJhbmdlLnN0YXJ0T2Zmc2V0ID09PSBzZWxlY3Rpb25SYW5nZS5zdGFydENvbnRhaW5lci5ub2RlVmFsdWUubGVuZ3RoKSkge1xuICAgICAgICAgICAgICAgIHZhciBhZGphY2VudE5vZGUgPSBNZWRpdW1FZGl0b3IudXRpbC5maW5kQWRqYWNlbnRUZXh0Tm9kZVdpdGhDb250ZW50KE1lZGl1bUVkaXRvci5zZWxlY3Rpb24uZ2V0U2VsZWN0aW9uRWxlbWVudCh0aGlzLndpbmRvdyksIHNlbGVjdGlvblJhbmdlLnN0YXJ0Q29udGFpbmVyLCB0aGlzLmRvY3VtZW50KTtcbiAgICAgICAgICAgICAgICBpZiAoYWRqYWNlbnROb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBvZmZzZXQgPSAwO1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoYWRqYWNlbnROb2RlLm5vZGVWYWx1ZS5zdWJzdHIob2Zmc2V0LCAxKS50cmltKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQgPSBvZmZzZXQgKyAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGlvblJhbmdlID0gTWVkaXVtRWRpdG9yLnNlbGVjdGlvbi5zZWxlY3QodGhpcy5kb2N1bWVudCwgYWRqYWNlbnROb2RlLCBvZmZzZXQsXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3Rpb25SYW5nZS5lbmRDb250YWluZXIsIHNlbGVjdGlvblJhbmdlLmVuZE9mZnNldCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGNoZWNrU3RhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmJhc2UucHJldmVudFNlbGVjdGlvblVwZGF0ZXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElmIG5vIGVkaXRhYmxlIGhhcyBmb2N1cyBPUiBzZWxlY3Rpb24gaXMgaW5zaWRlIGNvbnRlbnRlZGl0YWJsZSA9IGZhbHNlXG4gICAgICAgICAgICAvLyBoaWRlIHRvb2xiYXJcbiAgICAgICAgICAgIGlmICghdGhpcy5iYXNlLmdldEZvY3VzZWRFbGVtZW50KCkgfHxcbiAgICAgICAgICAgICAgICAgICAgTWVkaXVtRWRpdG9yLnNlbGVjdGlvbi5zZWxlY3Rpb25JbkNvbnRlbnRFZGl0YWJsZUZhbHNlKHRoaXMud2luZG93KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhpZGVUb29sYmFyKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElmIHRoZXJlJ3Mgbm8gc2VsZWN0aW9uIGVsZW1lbnQsIHNlbGVjdGlvbiBlbGVtZW50IGRvZXNuJ3QgYmVsb25nIHRvIHRoaXMgZWRpdG9yXG4gICAgICAgICAgICAvLyBvciB0b29sYmFyIGlzIGRpc2FibGVkIGZvciB0aGlzIHNlbGVjdGlvbiBlbGVtZW50XG4gICAgICAgICAgICAvLyBoaWRlIHRvb2xiYXJcbiAgICAgICAgICAgIHZhciBzZWxlY3Rpb25FbGVtZW50ID0gTWVkaXVtRWRpdG9yLnNlbGVjdGlvbi5nZXRTZWxlY3Rpb25FbGVtZW50KHRoaXMud2luZG93KTtcbiAgICAgICAgICAgIGlmICghc2VsZWN0aW9uRWxlbWVudCB8fFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmdldEVkaXRvckVsZW1lbnRzKCkuaW5kZXhPZihzZWxlY3Rpb25FbGVtZW50KSA9PT0gLTEgfHxcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0aW9uRWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtZGlzYWJsZS10b29sYmFyJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oaWRlVG9vbGJhcigpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBOb3cgd2Uga25vdyB0aGVyZSdzIGEgZm9jdXNlZCBlZGl0YWJsZSB3aXRoIGEgc2VsZWN0aW9uXG5cbiAgICAgICAgICAgIC8vIElmIHRoZSB1cGRhdGVPbkVtcHR5U2VsZWN0aW9uIG9wdGlvbiBpcyB0cnVlLCBzaG93IHRoZSB0b29sYmFyXG4gICAgICAgICAgICBpZiAodGhpcy51cGRhdGVPbkVtcHR5U2VsZWN0aW9uICYmIHRoaXMuc3RhdGljKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2hvd0FuZFVwZGF0ZVRvb2xiYXIoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSWYgd2UgZG9uJ3QgaGF2ZSBhICd2YWxpZCcgc2VsZWN0aW9uIC0+IGhpZGUgdG9vbGJhclxuICAgICAgICAgICAgaWYgKCFNZWRpdW1FZGl0b3Iuc2VsZWN0aW9uLnNlbGVjdGlvbkNvbnRhaW5zQ29udGVudCh0aGlzLmRvY3VtZW50KSB8fFxuICAgICAgICAgICAgICAgICh0aGlzLmFsbG93TXVsdGlQYXJhZ3JhcGhTZWxlY3Rpb24gPT09IGZhbHNlICYmIHRoaXMubXVsdGlwbGVCbG9ja0VsZW1lbnRzU2VsZWN0ZWQoKSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5oaWRlVG9vbGJhcigpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnNob3dBbmRVcGRhdGVUb29sYmFyKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gVXBkYXRpbmcgdGhlIHRvb2xiYXJcblxuICAgICAgICBzaG93QW5kVXBkYXRlVG9vbGJhcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5tb2RpZnlTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgIHRoaXMuc2V0VG9vbGJhckJ1dHRvblN0YXRlcygpO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdwb3NpdGlvblRvb2xiYXInLCB7fSwgdGhpcy5iYXNlLmdldEZvY3VzZWRFbGVtZW50KCkpO1xuICAgICAgICAgICAgdGhpcy5zaG93VG9vbGJhckRlZmF1bHRBY3Rpb25zKCk7XG4gICAgICAgICAgICB0aGlzLnNldFRvb2xiYXJQb3NpdGlvbigpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHNldFRvb2xiYXJCdXR0b25TdGF0ZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuZm9yRWFjaEV4dGVuc2lvbihmdW5jdGlvbiAoZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBleHRlbnNpb24uaXNBY3RpdmUgPT09ICdmdW5jdGlvbicgJiZcbiAgICAgICAgICAgICAgICAgICAgdHlwZW9mIGV4dGVuc2lvbi5zZXRJbmFjdGl2ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24uc2V0SW5hY3RpdmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy5jaGVja0FjdGl2ZUJ1dHRvbnMoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjaGVja0FjdGl2ZUJ1dHRvbnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBtYW51YWxTdGF0ZUNoZWNrcyA9IFtdLFxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RhdGUgPSBudWxsLFxuICAgICAgICAgICAgICAgIHNlbGVjdGlvblJhbmdlID0gTWVkaXVtRWRpdG9yLnNlbGVjdGlvbi5nZXRTZWxlY3Rpb25SYW5nZSh0aGlzLmRvY3VtZW50KSxcbiAgICAgICAgICAgICAgICBwYXJlbnROb2RlLFxuICAgICAgICAgICAgICAgIHVwZGF0ZUV4dGVuc2lvblN0YXRlID0gZnVuY3Rpb24gKGV4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGV4dGVuc2lvbi5jaGVja1N0YXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24uY2hlY2tTdGF0ZShwYXJlbnROb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZXh0ZW5zaW9uLmlzQWN0aXZlID09PSAnZnVuY3Rpb24nICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZW9mIGV4dGVuc2lvbi5pc0FscmVhZHlBcHBsaWVkID09PSAnZnVuY3Rpb24nICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZW9mIGV4dGVuc2lvbi5zZXRBY3RpdmUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZXh0ZW5zaW9uLmlzQWN0aXZlKCkgJiYgZXh0ZW5zaW9uLmlzQWxyZWFkeUFwcGxpZWQocGFyZW50Tm9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24uc2V0QWN0aXZlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAoIXNlbGVjdGlvblJhbmdlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBMb29wIHRocm91Z2ggYWxsIGV4dGVuc2lvbnNcbiAgICAgICAgICAgIHRoaXMuZm9yRWFjaEV4dGVuc2lvbihmdW5jdGlvbiAoZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgICAgLy8gRm9yIHRob3NlIGV4dGVuc2lvbnMgd2hlcmUgd2UgY2FuIHVzZSBkb2N1bWVudC5xdWVyeUNvbW1hbmRTdGF0ZSgpLCBkbyBzb1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZXh0ZW5zaW9uLnF1ZXJ5Q29tbWFuZFN0YXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RhdGUgPSBleHRlbnNpb24ucXVlcnlDb21tYW5kU3RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgcXVlcnlDb21tYW5kU3RhdGUgcmV0dXJucyBhIHZhbGlkIHZhbHVlLCB3ZSBjYW4gdHJ1c3QgdGhlIGJyb3dzZXJcbiAgICAgICAgICAgICAgICAgICAgLy8gYW5kIGRvbid0IG5lZWQgdG8gZG8gb3VyIG1hbnVhbCBjaGVja3NcbiAgICAgICAgICAgICAgICAgICAgaWYgKHF1ZXJ5U3RhdGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChxdWVyeVN0YXRlICYmIHR5cGVvZiBleHRlbnNpb24uc2V0QWN0aXZlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uLnNldEFjdGl2ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFdlIGNhbid0IHVzZSBxdWVyeUNvbW1hbmRTdGF0ZSBmb3IgdGhpcyBleHRlbnNpb24sIHNvIGFkZCB0byBtYW51YWxTdGF0ZUNoZWNrc1xuICAgICAgICAgICAgICAgIG1hbnVhbFN0YXRlQ2hlY2tzLnB1c2goZXh0ZW5zaW9uKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBwYXJlbnROb2RlID0gTWVkaXVtRWRpdG9yLnNlbGVjdGlvbi5nZXRTZWxlY3RlZFBhcmVudEVsZW1lbnQoc2VsZWN0aW9uUmFuZ2UpO1xuXG4gICAgICAgICAgICAvLyBNYWtlIHN1cmUgdGhlIHNlbGVjdGlvbiBwYXJlbnQgaXNuJ3Qgb3V0c2lkZSBvZiB0aGUgY29udGVudGVkaXRhYmxlXG4gICAgICAgICAgICBpZiAoIXRoaXMuZ2V0RWRpdG9yRWxlbWVudHMoKS5zb21lKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBNZWRpdW1FZGl0b3IudXRpbC5pc0Rlc2NlbmRhbnQoZWxlbWVudCwgcGFyZW50Tm9kZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENsaW1iIHVwIHRoZSBET00gYW5kIGRvIG1hbnVhbCBjaGVja3MgZm9yIHdoZXRoZXIgYSBjZXJ0YWluIGV4dGVuc2lvbiBpcyBjdXJyZW50bHkgZW5hYmxlZCBmb3IgdGhpcyBub2RlXG4gICAgICAgICAgICB3aGlsZSAocGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgIG1hbnVhbFN0YXRlQ2hlY2tzLmZvckVhY2godXBkYXRlRXh0ZW5zaW9uU3RhdGUpO1xuXG4gICAgICAgICAgICAgICAgLy8gd2UgY2FuIGFib3J0IHRoZSBzZWFyY2ggdXB3YXJkcyBpZiB3ZSBsZWF2ZSB0aGUgY29udGVudEVkaXRhYmxlIGVsZW1lbnRcbiAgICAgICAgICAgICAgICBpZiAoTWVkaXVtRWRpdG9yLnV0aWwuaXNNZWRpdW1FZGl0b3JFbGVtZW50KHBhcmVudE5vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXJlbnROb2RlID0gcGFyZW50Tm9kZS5wYXJlbnROb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vIFBvc2l0aW9uaW5nIHRvb2xiYXJcblxuICAgICAgICBwb3NpdGlvblRvb2xiYXJJZlNob3duOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5pc0Rpc3BsYXllZCgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRUb29sYmFyUG9zaXRpb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBzZXRUb29sYmFyUG9zaXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBjb250YWluZXIgPSB0aGlzLmJhc2UuZ2V0Rm9jdXNlZEVsZW1lbnQoKSxcbiAgICAgICAgICAgICAgICBzZWxlY3Rpb24gPSB0aGlzLndpbmRvdy5nZXRTZWxlY3Rpb24oKTtcblxuICAgICAgICAgICAgLy8gSWYgdGhlcmUgaXNuJ3QgYSB2YWxpZCBzZWxlY3Rpb24sIGJhaWxcbiAgICAgICAgICAgIGlmICghY29udGFpbmVyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRpYyB8fCAhc2VsZWN0aW9uLmlzQ29sbGFwc2VkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zaG93VG9vbGJhcigpO1xuXG4gICAgICAgICAgICAgICAgLy8gd2UgZG9uJ3QgbmVlZCBhbnkgYWJzb2x1dGUgcG9zaXRpb25pbmcgaWYgcmVsYXRpdmVDb250YWluZXIgaXMgc2V0XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLnJlbGF0aXZlQ29udGFpbmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnN0YXRpYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3NpdGlvblN0YXRpY1Rvb2xiYXIoY29udGFpbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucG9zaXRpb25Ub29sYmFyKHNlbGVjdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ3Bvc2l0aW9uZWRUb29sYmFyJywge30sIHRoaXMuYmFzZS5nZXRGb2N1c2VkRWxlbWVudCgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBwb3NpdGlvblN0YXRpY1Rvb2xiYXI6IGZ1bmN0aW9uIChjb250YWluZXIpIHtcbiAgICAgICAgICAgIC8vIHBvc2l0aW9uIHRoZSB0b29sYmFyIGF0IGxlZnQgMCwgc28gd2UgY2FuIGdldCB0aGUgcmVhbCB3aWR0aCBvZiB0aGUgdG9vbGJhclxuICAgICAgICAgICAgdGhpcy5nZXRUb29sYmFyRWxlbWVudCgpLnN0eWxlLmxlZnQgPSAnMCc7XG5cbiAgICAgICAgICAgIC8vIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCBmb3IgSUUgOVxuICAgICAgICAgICAgdmFyIHNjcm9sbFRvcCA9ICh0aGlzLmRvY3VtZW50LmRvY3VtZW50RWxlbWVudCAmJiB0aGlzLmRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3ApIHx8IHRoaXMuZG9jdW1lbnQuYm9keS5zY3JvbGxUb3AsXG4gICAgICAgICAgICAgICAgd2luZG93V2lkdGggPSB0aGlzLndpbmRvdy5pbm5lcldpZHRoLFxuICAgICAgICAgICAgICAgIHRvb2xiYXJFbGVtZW50ID0gdGhpcy5nZXRUb29sYmFyRWxlbWVudCgpLFxuICAgICAgICAgICAgICAgIGNvbnRhaW5lclJlY3QgPSBjb250YWluZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICAgICAgICAgICAgY29udGFpbmVyVG9wID0gY29udGFpbmVyUmVjdC50b3AgKyBzY3JvbGxUb3AsXG4gICAgICAgICAgICAgICAgY29udGFpbmVyQ2VudGVyID0gKGNvbnRhaW5lclJlY3QubGVmdCArIChjb250YWluZXJSZWN0LndpZHRoIC8gMikpLFxuICAgICAgICAgICAgICAgIHRvb2xiYXJIZWlnaHQgPSB0b29sYmFyRWxlbWVudC5vZmZzZXRIZWlnaHQsXG4gICAgICAgICAgICAgICAgdG9vbGJhcldpZHRoID0gdG9vbGJhckVsZW1lbnQub2Zmc2V0V2lkdGgsXG4gICAgICAgICAgICAgICAgaGFsZk9mZnNldFdpZHRoID0gdG9vbGJhcldpZHRoIC8gMixcbiAgICAgICAgICAgICAgICB0YXJnZXRMZWZ0O1xuXG4gICAgICAgICAgICBpZiAodGhpcy5zdGlja3kpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBpdCdzIGJleW9uZCB0aGUgaGVpZ2h0IG9mIHRoZSBlZGl0b3IsIHBvc2l0aW9uIGl0IGF0IHRoZSBib3R0b20gb2YgdGhlIGVkaXRvclxuICAgICAgICAgICAgICAgIGlmIChzY3JvbGxUb3AgPiAoY29udGFpbmVyVG9wICsgY29udGFpbmVyLm9mZnNldEhlaWdodCAtIHRvb2xiYXJIZWlnaHQgLSB0aGlzLnN0aWNreVRvcE9mZnNldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9vbGJhckVsZW1lbnQuc3R5bGUudG9wID0gKGNvbnRhaW5lclRvcCArIGNvbnRhaW5lci5vZmZzZXRIZWlnaHQgLSB0b29sYmFySGVpZ2h0KSArICdweCc7XG4gICAgICAgICAgICAgICAgICAgIHRvb2xiYXJFbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoJ21lZGl1bS1lZGl0b3Itc3RpY2t5LXRvb2xiYXInKTtcbiAgICAgICAgICAgICAgICAvLyBTdGljayB0aGUgdG9vbGJhciB0byB0aGUgdG9wIG9mIHRoZSB3aW5kb3dcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNjcm9sbFRvcCA+IChjb250YWluZXJUb3AgLSB0b29sYmFySGVpZ2h0IC0gdGhpcy5zdGlja3lUb3BPZmZzZXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvb2xiYXJFbGVtZW50LmNsYXNzTGlzdC5hZGQoJ21lZGl1bS1lZGl0b3Itc3RpY2t5LXRvb2xiYXInKTtcbiAgICAgICAgICAgICAgICAgICAgdG9vbGJhckVsZW1lbnQuc3R5bGUudG9wID0gdGhpcy5zdGlja3lUb3BPZmZzZXQgKyAncHgnO1xuICAgICAgICAgICAgICAgIC8vIE5vcm1hbCBzdGF0aWMgdG9vbGJhciBwb3NpdGlvblxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRvb2xiYXJFbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoJ21lZGl1bS1lZGl0b3Itc3RpY2t5LXRvb2xiYXInKTtcbiAgICAgICAgICAgICAgICAgICAgdG9vbGJhckVsZW1lbnQuc3R5bGUudG9wID0gY29udGFpbmVyVG9wIC0gdG9vbGJhckhlaWdodCArICdweCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0b29sYmFyRWxlbWVudC5zdHlsZS50b3AgPSBjb250YWluZXJUb3AgLSB0b29sYmFySGVpZ2h0ICsgJ3B4JztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmFsaWduKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnbGVmdCc6XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldExlZnQgPSBjb250YWluZXJSZWN0LmxlZnQ7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSAncmlnaHQnOlxuICAgICAgICAgICAgICAgICAgICB0YXJnZXRMZWZ0ID0gY29udGFpbmVyUmVjdC5yaWdodCAtIHRvb2xiYXJXaWR0aDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlICdjZW50ZXInOlxuICAgICAgICAgICAgICAgICAgICB0YXJnZXRMZWZ0ID0gY29udGFpbmVyQ2VudGVyIC0gaGFsZk9mZnNldFdpZHRoO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRhcmdldExlZnQgPCAwKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0TGVmdCA9IDA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCh0YXJnZXRMZWZ0ICsgdG9vbGJhcldpZHRoKSA+IHdpbmRvd1dpZHRoKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0TGVmdCA9ICh3aW5kb3dXaWR0aCAtIE1hdGguY2VpbCh0b29sYmFyV2lkdGgpIC0gMSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRvb2xiYXJFbGVtZW50LnN0eWxlLmxlZnQgPSB0YXJnZXRMZWZ0ICsgJ3B4JztcbiAgICAgICAgfSxcblxuICAgICAgICBwb3NpdGlvblRvb2xiYXI6IGZ1bmN0aW9uIChzZWxlY3Rpb24pIHtcbiAgICAgICAgICAgIC8vIHBvc2l0aW9uIHRoZSB0b29sYmFyIGF0IGxlZnQgMCwgc28gd2UgY2FuIGdldCB0aGUgcmVhbCB3aWR0aCBvZiB0aGUgdG9vbGJhclxuICAgICAgICAgICAgdGhpcy5nZXRUb29sYmFyRWxlbWVudCgpLnN0eWxlLmxlZnQgPSAnMCc7XG4gICAgICAgICAgICB0aGlzLmdldFRvb2xiYXJFbGVtZW50KCkuc3R5bGUucmlnaHQgPSAnaW5pdGlhbCc7XG5cbiAgICAgICAgICAgIHZhciByYW5nZSA9IHNlbGVjdGlvbi5nZXRSYW5nZUF0KDApLFxuICAgICAgICAgICAgICAgIGJvdW5kYXJ5ID0gcmFuZ2UuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAgICAgICAgIC8vIEhhbmRsZSBzZWxlY3Rpb25zIHdpdGgganVzdCBpbWFnZXNcbiAgICAgICAgICAgIGlmICghYm91bmRhcnkgfHwgKChib3VuZGFyeS5oZWlnaHQgPT09IDAgJiYgYm91bmRhcnkud2lkdGggPT09IDApICYmIHJhbmdlLnN0YXJ0Q29udGFpbmVyID09PSByYW5nZS5lbmRDb250YWluZXIpKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlcmUncyBhIG5lc3RlZCBpbWFnZSwgdXNlIHRoYXQgZm9yIHRoZSBib3VuZGluZyByZWN0YW5nbGVcbiAgICAgICAgICAgICAgICBpZiAocmFuZ2Uuc3RhcnRDb250YWluZXIubm9kZVR5cGUgPT09IDEgJiYgcmFuZ2Uuc3RhcnRDb250YWluZXIucXVlcnlTZWxlY3RvcignaW1nJykpIHtcbiAgICAgICAgICAgICAgICAgICAgYm91bmRhcnkgPSByYW5nZS5zdGFydENvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCdpbWcnKS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBib3VuZGFyeSA9IHJhbmdlLnN0YXJ0Q29udGFpbmVyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGNvbnRhaW5lcldpZHRoID0gdGhpcy53aW5kb3cuaW5uZXJXaWR0aCxcbiAgICAgICAgICAgICAgICB0b29sYmFyRWxlbWVudCA9IHRoaXMuZ2V0VG9vbGJhckVsZW1lbnQoKSxcbiAgICAgICAgICAgICAgICB0b29sYmFySGVpZ2h0ID0gdG9vbGJhckVsZW1lbnQub2Zmc2V0SGVpZ2h0LFxuICAgICAgICAgICAgICAgIHRvb2xiYXJXaWR0aCA9IHRvb2xiYXJFbGVtZW50Lm9mZnNldFdpZHRoLFxuICAgICAgICAgICAgICAgIGhhbGZPZmZzZXRXaWR0aCA9IHRvb2xiYXJXaWR0aCAvIDIsXG4gICAgICAgICAgICAgICAgYnV0dG9uSGVpZ2h0ID0gNTAsXG4gICAgICAgICAgICAgICAgZGVmYXVsdExlZnQgPSB0aGlzLmRpZmZMZWZ0IC0gaGFsZk9mZnNldFdpZHRoLFxuICAgICAgICAgICAgICAgIGVsZW1lbnRzQ29udGFpbmVyID0gdGhpcy5nZXRFZGl0b3JPcHRpb24oJ2VsZW1lbnRzQ29udGFpbmVyJyksXG4gICAgICAgICAgICAgICAgZWxlbWVudHNDb250YWluZXJBYnNvbHV0ZSA9IFsnYWJzb2x1dGUnLCAnZml4ZWQnXS5pbmRleE9mKHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsZW1lbnRzQ29udGFpbmVyKS5nZXRQcm9wZXJ0eVZhbHVlKCdwb3NpdGlvbicpKSA+IC0xLFxuICAgICAgICAgICAgICAgIHBvc2l0aW9ucyA9IHt9LFxuICAgICAgICAgICAgICAgIHJlbGF0aXZlQm91bmRhcnkgPSB7fSxcbiAgICAgICAgICAgICAgICBtaWRkbGVCb3VuZGFyeSwgZWxlbWVudHNDb250YWluZXJCb3VuZGFyeTtcblxuICAgICAgICAgICAgLy8gSWYgY29udGFpbmVyIGVsZW1lbnQgaXMgYWJzb2x1dGUgLyBmaXhlZCwgcmVjYWxjdWxhdGUgYm91bmRhcmllcyB0byBiZSByZWxhdGl2ZSB0byB0aGUgY29udGFpbmVyXG4gICAgICAgICAgICBpZiAoZWxlbWVudHNDb250YWluZXJBYnNvbHV0ZSkge1xuICAgICAgICAgICAgICAgIGVsZW1lbnRzQ29udGFpbmVyQm91bmRhcnkgPSBlbGVtZW50c0NvbnRhaW5lci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICAgICAgICBbJ3RvcCcsICdsZWZ0J10uZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlbGF0aXZlQm91bmRhcnlba2V5XSA9IGJvdW5kYXJ5W2tleV0gLSBlbGVtZW50c0NvbnRhaW5lckJvdW5kYXJ5W2tleV07XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByZWxhdGl2ZUJvdW5kYXJ5LndpZHRoID0gYm91bmRhcnkud2lkdGg7XG4gICAgICAgICAgICAgICAgcmVsYXRpdmVCb3VuZGFyeS5oZWlnaHQgPSBib3VuZGFyeS5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgYm91bmRhcnkgPSByZWxhdGl2ZUJvdW5kYXJ5O1xuXG4gICAgICAgICAgICAgICAgY29udGFpbmVyV2lkdGggPSBlbGVtZW50c0NvbnRhaW5lckJvdW5kYXJ5LndpZHRoO1xuXG4gICAgICAgICAgICAgICAgLy8gQWRqdXN0IHRvcCBwb3NpdGlvbiBhY2NvcmRpbmcgdG8gY29udGFpbmVyIHNjcm9sbCBwb3NpdGlvblxuICAgICAgICAgICAgICAgIHBvc2l0aW9ucy50b3AgPSBlbGVtZW50c0NvbnRhaW5lci5zY3JvbGxUb3A7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEFkanVzdCB0b3AgcG9zaXRpb24gYWNjb3JkaW5nIHRvIHdpbmRvdyBzY3JvbGwgcG9zaXRpb25cbiAgICAgICAgICAgICAgICBwb3NpdGlvbnMudG9wID0gdGhpcy53aW5kb3cucGFnZVlPZmZzZXQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG1pZGRsZUJvdW5kYXJ5ID0gYm91bmRhcnkubGVmdCArIGJvdW5kYXJ5LndpZHRoIC8gMjtcbiAgICAgICAgICAgIHBvc2l0aW9ucy50b3AgKz0gYm91bmRhcnkudG9wIC0gdG9vbGJhckhlaWdodDtcblxuICAgICAgICAgICAgaWYgKGJvdW5kYXJ5LnRvcCA8IGJ1dHRvbkhlaWdodCkge1xuICAgICAgICAgICAgICAgIHRvb2xiYXJFbGVtZW50LmNsYXNzTGlzdC5hZGQoJ21lZGl1bS10b29sYmFyLWFycm93LW92ZXInKTtcbiAgICAgICAgICAgICAgICB0b29sYmFyRWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKCdtZWRpdW0tdG9vbGJhci1hcnJvdy11bmRlcicpO1xuICAgICAgICAgICAgICAgIHBvc2l0aW9ucy50b3AgKz0gYnV0dG9uSGVpZ2h0ICsgYm91bmRhcnkuaGVpZ2h0IC0gdGhpcy5kaWZmVG9wO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0b29sYmFyRWxlbWVudC5jbGFzc0xpc3QuYWRkKCdtZWRpdW0tdG9vbGJhci1hcnJvdy11bmRlcicpO1xuICAgICAgICAgICAgICAgIHRvb2xiYXJFbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoJ21lZGl1bS10b29sYmFyLWFycm93LW92ZXInKTtcbiAgICAgICAgICAgICAgICBwb3NpdGlvbnMudG9wICs9IHRoaXMuZGlmZlRvcDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG1pZGRsZUJvdW5kYXJ5IDwgaGFsZk9mZnNldFdpZHRoKSB7XG4gICAgICAgICAgICAgICAgcG9zaXRpb25zLmxlZnQgPSBkZWZhdWx0TGVmdCArIGhhbGZPZmZzZXRXaWR0aDtcbiAgICAgICAgICAgICAgICBwb3NpdGlvbnMucmlnaHQgPSAnaW5pdGlhbCc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKChjb250YWluZXJXaWR0aCAtIG1pZGRsZUJvdW5kYXJ5KSA8IGhhbGZPZmZzZXRXaWR0aCkge1xuICAgICAgICAgICAgICAgIHBvc2l0aW9ucy5sZWZ0ID0gJ2F1dG8nO1xuICAgICAgICAgICAgICAgIHBvc2l0aW9ucy5yaWdodCA9IDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBvc2l0aW9ucy5sZWZ0ID0gZGVmYXVsdExlZnQgKyBtaWRkbGVCb3VuZGFyeTtcbiAgICAgICAgICAgICAgICBwb3NpdGlvbnMucmlnaHQgPSAnaW5pdGlhbCc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIFsndG9wJywgJ2xlZnQnLCAncmlnaHQnXS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICB0b29sYmFyRWxlbWVudC5zdHlsZVtrZXldID0gcG9zaXRpb25zW2tleV0gKyAoaXNOYU4ocG9zaXRpb25zW2tleV0pID8gJycgOiAncHgnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBNZWRpdW1FZGl0b3IuZXh0ZW5zaW9ucy50b29sYmFyID0gVG9vbGJhcjtcbn0oKSk7XG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIEltYWdlRHJhZ2dpbmcgPSBNZWRpdW1FZGl0b3IuRXh0ZW5zaW9uLmV4dGVuZCh7XG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIE1lZGl1bUVkaXRvci5FeHRlbnNpb24ucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgICAgICAgICAgdGhpcy5zdWJzY3JpYmUoJ2VkaXRhYmxlRHJhZycsIHRoaXMuaGFuZGxlRHJhZy5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIHRoaXMuc3Vic2NyaWJlKCdlZGl0YWJsZURyb3AnLCB0aGlzLmhhbmRsZURyb3AuYmluZCh0aGlzKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaGFuZGxlRHJhZzogZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICB2YXIgY2xhc3NOYW1lID0gJ21lZGl1bS1lZGl0b3ItZHJhZ292ZXInO1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGV2ZW50LmRhdGFUcmFuc2Zlci5kcm9wRWZmZWN0ID0gJ2NvcHknO1xuXG4gICAgICAgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gJ2RyYWdvdmVyJykge1xuICAgICAgICAgICAgICAgIGV2ZW50LnRhcmdldC5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGV2ZW50LnR5cGUgPT09ICdkcmFnbGVhdmUnKSB7XG4gICAgICAgICAgICAgICAgZXZlbnQudGFyZ2V0LmNsYXNzTGlzdC5yZW1vdmUoY2xhc3NOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBoYW5kbGVEcm9wOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIHZhciBjbGFzc05hbWUgPSAnbWVkaXVtLWVkaXRvci1kcmFnb3ZlcicsXG4gICAgICAgICAgICAgICAgZmlsZXM7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cbiAgICAgICAgICAgIC8vIElFOSBkb2VzIG5vdCBzdXBwb3J0IHRoZSBGaWxlIEFQSSwgc28gcHJldmVudCBmaWxlIGZyb20gb3BlbmluZyBpbiBhIG5ldyB3aW5kb3dcbiAgICAgICAgICAgIC8vIGJ1dCBhbHNvIGRvbid0IHRyeSB0byBhY3R1YWxseSBnZXQgdGhlIGZpbGVcbiAgICAgICAgICAgIGlmIChldmVudC5kYXRhVHJhbnNmZXIuZmlsZXMpIHtcbiAgICAgICAgICAgICAgICBmaWxlcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGV2ZW50LmRhdGFUcmFuc2Zlci5maWxlcywgMCk7XG4gICAgICAgICAgICAgICAgZmlsZXMuc29tZShmdW5jdGlvbiAoZmlsZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmlsZS50eXBlLm1hdGNoKCdpbWFnZScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZmlsZVJlYWRlciwgaWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlUmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVSZWFkZXIucmVhZEFzRGF0YVVSTChmaWxlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWQgPSAnbWVkaXVtLWltZy0nICsgKCtuZXcgRGF0ZSgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIE1lZGl1bUVkaXRvci51dGlsLmluc2VydEhUTUxDb21tYW5kKHRoaXMuZG9jdW1lbnQsICc8aW1nIGNsYXNzPVwibWVkaXVtLWVkaXRvci1pbWFnZS1sb2FkaW5nXCIgaWQ9XCInICsgaWQgKyAnXCIgLz4nKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZVJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGltZyA9IHRoaXMuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbWcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1nLnJlbW92ZUF0dHJpYnV0ZSgnaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1nLnJlbW92ZUF0dHJpYnV0ZSgnY2xhc3MnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1nLnNyYyA9IGZpbGVSZWFkZXIucmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBldmVudC50YXJnZXQuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBNZWRpdW1FZGl0b3IuZXh0ZW5zaW9ucy5pbWFnZURyYWdnaW5nID0gSW1hZ2VEcmFnZ2luZztcbn0oKSk7XG5cbihmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gRXZlbnQgaGFuZGxlcnMgdGhhdCBzaG91bGRuJ3QgYmUgZXhwb3NlZCBleHRlcm5hbGx5XG5cbiAgICBmdW5jdGlvbiBoYW5kbGVEaXNhYmxlRXh0cmFTcGFjZXMoZXZlbnQpIHtcbiAgICAgICAgdmFyIG5vZGUgPSBNZWRpdW1FZGl0b3Iuc2VsZWN0aW9uLmdldFNlbGVjdGlvblN0YXJ0KHRoaXMub3B0aW9ucy5vd25lckRvY3VtZW50KSxcbiAgICAgICAgICAgIHRleHRDb250ZW50ID0gbm9kZS50ZXh0Q29udGVudCxcbiAgICAgICAgICAgIGNhcmV0UG9zaXRpb25zID0gTWVkaXVtRWRpdG9yLnNlbGVjdGlvbi5nZXRDYXJldE9mZnNldHMobm9kZSk7XG5cbiAgICAgICAgaWYgKCh0ZXh0Q29udGVudFtjYXJldFBvc2l0aW9ucy5sZWZ0IC0gMV0gPT09IHVuZGVmaW5lZCkgfHwgKHRleHRDb250ZW50W2NhcmV0UG9zaXRpb25zLmxlZnQgLSAxXS50cmltKCkgPT09ICcnKSB8fCAodGV4dENvbnRlbnRbY2FyZXRQb3NpdGlvbnMubGVmdF0gIT09IHVuZGVmaW5lZCAmJiB0ZXh0Q29udGVudFtjYXJldFBvc2l0aW9ucy5sZWZ0XS50cmltKCkgPT09ICcnKSkge1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhhbmRsZURpc2FibGVkRW50ZXJLZXlkb3duKGV2ZW50LCBlbGVtZW50KSB7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuZGlzYWJsZVJldHVybiB8fCBlbGVtZW50LmdldEF0dHJpYnV0ZSgnZGF0YS1kaXNhYmxlLXJldHVybicpKSB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5kaXNhYmxlRG91YmxlUmV0dXJuIHx8IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLWRpc2FibGUtZG91YmxlLXJldHVybicpKSB7XG4gICAgICAgICAgICB2YXIgbm9kZSA9IE1lZGl1bUVkaXRvci5zZWxlY3Rpb24uZ2V0U2VsZWN0aW9uU3RhcnQodGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQpO1xuXG4gICAgICAgICAgICAvLyBpZiBjdXJyZW50IHRleHQgc2VsZWN0aW9uIGlzIGVtcHR5IE9SIHByZXZpb3VzIHNpYmxpbmcgdGV4dCBpcyBlbXB0eSBPUiBpdCBpcyBub3QgYSBsaXN0XG4gICAgICAgICAgICBpZiAoKG5vZGUgJiYgbm9kZS50ZXh0Q29udGVudC50cmltKCkgPT09ICcnICYmIG5vZGUubm9kZU5hbWUudG9Mb3dlckNhc2UoKSAhPT0gJ2xpJykgfHxcbiAgICAgICAgICAgICAgICAobm9kZS5wcmV2aW91c0VsZW1lbnRTaWJsaW5nICYmIG5vZGUucHJldmlvdXNFbGVtZW50U2libGluZy5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpICE9PSAnYnInICYmXG4gICAgICAgICAgICAgICAgIG5vZGUucHJldmlvdXNFbGVtZW50U2libGluZy50ZXh0Q29udGVudC50cmltKCkgPT09ICcnKSkge1xuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoYW5kbGVUYWJLZXlkb3duKGV2ZW50KSB7XG4gICAgICAgIC8vIE92ZXJyaWRlIHRhYiBvbmx5IGZvciBwcmUgbm9kZXNcbiAgICAgICAgdmFyIG5vZGUgPSBNZWRpdW1FZGl0b3Iuc2VsZWN0aW9uLmdldFNlbGVjdGlvblN0YXJ0KHRoaXMub3B0aW9ucy5vd25lckRvY3VtZW50KSxcbiAgICAgICAgICAgIHRhZyA9IG5vZGUgJiYgbm9kZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICAgIGlmICh0YWcgPT09ICdwcmUnKSB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgTWVkaXVtRWRpdG9yLnV0aWwuaW5zZXJ0SFRNTENvbW1hbmQodGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQsICcgICAgJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUYWIgdG8gaW5kZW50IGxpc3Qgc3RydWN0dXJlcyFcbiAgICAgICAgaWYgKE1lZGl1bUVkaXRvci51dGlsLmlzTGlzdEl0ZW0obm9kZSkpIHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIC8vIElmIFNoaWZ0IGlzIGRvd24sIG91dGRlbnQsIG90aGVyd2lzZSBpbmRlbnRcbiAgICAgICAgICAgIGlmIChldmVudC5zaGlmdEtleSkge1xuICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5vd25lckRvY3VtZW50LmV4ZWNDb21tYW5kKCdvdXRkZW50JywgZmFsc2UsIG51bGwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMub3duZXJEb2N1bWVudC5leGVjQ29tbWFuZCgnaW5kZW50JywgZmFsc2UsIG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaGFuZGxlQmxvY2tEZWxldGVLZXlkb3ducyhldmVudCkge1xuICAgICAgICB2YXIgcCwgbm9kZSA9IE1lZGl1bUVkaXRvci5zZWxlY3Rpb24uZ2V0U2VsZWN0aW9uU3RhcnQodGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQpLFxuICAgICAgICAgICAgdGFnTmFtZSA9IG5vZGUubm9kZU5hbWUudG9Mb3dlckNhc2UoKSxcbiAgICAgICAgICAgIGlzRW1wdHkgPSAvXihcXHMrfDxiclxcLz8+KT8kL2ksXG4gICAgICAgICAgICBpc0hlYWRlciA9IC9oXFxkL2k7XG5cbiAgICAgICAgaWYgKE1lZGl1bUVkaXRvci51dGlsLmlzS2V5KGV2ZW50LCBbTWVkaXVtRWRpdG9yLnV0aWwua2V5Q29kZS5CQUNLU1BBQ0UsIE1lZGl1bUVkaXRvci51dGlsLmtleUNvZGUuRU5URVJdKSAmJlxuICAgICAgICAgICAgICAgIC8vIGhhcyBhIHByZWNlZWRpbmcgc2libGluZ1xuICAgICAgICAgICAgICAgIG5vZGUucHJldmlvdXNFbGVtZW50U2libGluZyAmJlxuICAgICAgICAgICAgICAgIC8vIGluIGEgaGVhZGVyXG4gICAgICAgICAgICAgICAgaXNIZWFkZXIudGVzdCh0YWdOYW1lKSAmJlxuICAgICAgICAgICAgICAgIC8vIGF0IHRoZSB2ZXJ5IGVuZCBvZiB0aGUgYmxvY2tcbiAgICAgICAgICAgICAgICBNZWRpdW1FZGl0b3Iuc2VsZWN0aW9uLmdldENhcmV0T2Zmc2V0cyhub2RlKS5sZWZ0ID09PSAwKSB7XG4gICAgICAgICAgICBpZiAoTWVkaXVtRWRpdG9yLnV0aWwuaXNLZXkoZXZlbnQsIE1lZGl1bUVkaXRvci51dGlsLmtleUNvZGUuQkFDS1NQQUNFKSAmJiBpc0VtcHR5LnRlc3Qobm9kZS5wcmV2aW91c0VsZW1lbnRTaWJsaW5nLmlubmVySFRNTCkpIHtcbiAgICAgICAgICAgICAgICAvLyBiYWNrc3BhY2luZyB0aGUgYmVnaW5pbmcgb2YgYSBoZWFkZXIgaW50byBhbiBlbXB0eSBwcmV2aW91cyBlbGVtZW50IHdpbGxcbiAgICAgICAgICAgICAgICAvLyBjaGFuZ2UgdGhlIHRhZ05hbWUgb2YgdGhlIGN1cnJlbnQgbm9kZSB0byBwcmV2ZW50IG9uZVxuICAgICAgICAgICAgICAgIC8vIGluc3RlYWQgZGVsZXRlIHByZXZpb3VzIG5vZGUgYW5kIGNhbmNlbCB0aGUgZXZlbnQuXG4gICAgICAgICAgICAgICAgbm9kZS5wcmV2aW91c0VsZW1lbnRTaWJsaW5nLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZS5wcmV2aW91c0VsZW1lbnRTaWJsaW5nKTtcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghdGhpcy5vcHRpb25zLmRpc2FibGVEb3VibGVSZXR1cm4gJiYgTWVkaXVtRWRpdG9yLnV0aWwuaXNLZXkoZXZlbnQsIE1lZGl1bUVkaXRvci51dGlsLmtleUNvZGUuRU5URVIpKSB7XG4gICAgICAgICAgICAgICAgLy8gaGl0dGluZyByZXR1cm4gaW4gdGhlIGJlZ2luaW5nIG9mIGEgaGVhZGVyIHdpbGwgY3JlYXRlIGVtcHR5IGhlYWRlciBlbGVtZW50cyBiZWZvcmUgdGhlIGN1cnJlbnQgb25lXG4gICAgICAgICAgICAgICAgLy8gaW5zdGVhZCwgbWFrZSBcIjxwPjxicj48L3A+XCIgZWxlbWVudCwgd2hpY2ggYXJlIHdoYXQgaGFwcGVucyBpZiB5b3UgaGl0IHJldHVybiBpbiBhbiBlbXB0eSBwYXJhZ3JhcGhcbiAgICAgICAgICAgICAgICBwID0gdGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuICAgICAgICAgICAgICAgIHAuaW5uZXJIVE1MID0gJzxicj4nO1xuICAgICAgICAgICAgICAgIG5vZGUucHJldmlvdXNFbGVtZW50U2libGluZy5wYXJlbnROb2RlLmluc2VydEJlZm9yZShwLCBub2RlKTtcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKE1lZGl1bUVkaXRvci51dGlsLmlzS2V5KGV2ZW50LCBNZWRpdW1FZGl0b3IudXRpbC5rZXlDb2RlLkRFTEVURSkgJiZcbiAgICAgICAgICAgICAgICAgICAgLy8gYmV0d2VlbiB0d28gc2libGluZyBlbGVtZW50c1xuICAgICAgICAgICAgICAgICAgICBub2RlLm5leHRFbGVtZW50U2libGluZyAmJlxuICAgICAgICAgICAgICAgICAgICBub2RlLnByZXZpb3VzRWxlbWVudFNpYmxpbmcgJiZcbiAgICAgICAgICAgICAgICAgICAgLy8gbm90IGluIGEgaGVhZGVyXG4gICAgICAgICAgICAgICAgICAgICFpc0hlYWRlci50ZXN0KHRhZ05hbWUpICYmXG4gICAgICAgICAgICAgICAgICAgIC8vIGluIGFuIGVtcHR5IHRhZ1xuICAgICAgICAgICAgICAgICAgICBpc0VtcHR5LnRlc3Qobm9kZS5pbm5lckhUTUwpICYmXG4gICAgICAgICAgICAgICAgICAgIC8vIHdoZW4gdGhlIG5leHQgdGFnICppcyogYSBoZWFkZXJcbiAgICAgICAgICAgICAgICAgICAgaXNIZWFkZXIudGVzdChub2RlLm5leHRFbGVtZW50U2libGluZy5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpKSkge1xuICAgICAgICAgICAgLy8gaGl0dGluZyBkZWxldGUgaW4gYW4gZW1wdHkgZWxlbWVudCBwcmVjZWRpbmcgYSBoZWFkZXIsIGV4OlxuICAgICAgICAgICAgLy8gIDxwPltDVVJTT1JdPC9wPjxoMT5IZWFkZXI8L2gxPlxuICAgICAgICAgICAgLy8gV2lsbCBjYXVzZSB0aGUgaDEgdG8gYmVjb21lIGEgcGFyYWdyYXBoLlxuICAgICAgICAgICAgLy8gSW5zdGVhZCwgZGVsZXRlIHRoZSBwYXJhZ3JhcGggbm9kZSBhbmQgbW92ZSB0aGUgY3Vyc29yIHRvIHRoZSBiZWdpbmluZyBvZiB0aGUgaDFcblxuICAgICAgICAgICAgLy8gcmVtb3ZlIG5vZGUgYW5kIG1vdmUgY3Vyc29yIHRvIHN0YXJ0IG9mIGhlYWRlclxuICAgICAgICAgICAgTWVkaXVtRWRpdG9yLnNlbGVjdGlvbi5tb3ZlQ3Vyc29yKHRoaXMub3B0aW9ucy5vd25lckRvY3VtZW50LCBub2RlLm5leHRFbGVtZW50U2libGluZyk7XG5cbiAgICAgICAgICAgIG5vZGUucHJldmlvdXNFbGVtZW50U2libGluZy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGUpO1xuXG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9IGVsc2UgaWYgKE1lZGl1bUVkaXRvci51dGlsLmlzS2V5KGV2ZW50LCBNZWRpdW1FZGl0b3IudXRpbC5rZXlDb2RlLkJBQ0tTUEFDRSkgJiZcbiAgICAgICAgICAgICAgICB0YWdOYW1lID09PSAnbGknICYmXG4gICAgICAgICAgICAgICAgLy8gaGl0dGluZyBiYWNrc3BhY2UgaW5zaWRlIGFuIGVtcHR5IGxpXG4gICAgICAgICAgICAgICAgaXNFbXB0eS50ZXN0KG5vZGUuaW5uZXJIVE1MKSAmJlxuICAgICAgICAgICAgICAgIC8vIGlzIGZpcnN0IGVsZW1lbnQgKG5vIHByZWNlZWRpbmcgc2libGluZ3MpXG4gICAgICAgICAgICAgICAgIW5vZGUucHJldmlvdXNFbGVtZW50U2libGluZyAmJlxuICAgICAgICAgICAgICAgIC8vIHBhcmVudCBhbHNvIGRvZXMgbm90IGhhdmUgYSBzaWJsaW5nXG4gICAgICAgICAgICAgICAgIW5vZGUucGFyZW50RWxlbWVudC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nICYmXG4gICAgICAgICAgICAgICAgLy8gaXMgbm90IHRoZSBvbmx5IGxpIGluIGEgbGlzdFxuICAgICAgICAgICAgICAgIG5vZGUubmV4dEVsZW1lbnRTaWJsaW5nICYmXG4gICAgICAgICAgICAgICAgbm9kZS5uZXh0RWxlbWVudFNpYmxpbmcubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ2xpJykge1xuICAgICAgICAgICAgLy8gYmFja3NwYWNpbmcgaW4gYW4gZW1wdHkgZmlyc3QgbGlzdCBlbGVtZW50IGluIHRoZSBmaXJzdCBsaXN0ICh3aXRoIG1vcmUgZWxlbWVudHMpIGV4OlxuICAgICAgICAgICAgLy8gIDx1bD48bGk+W0NVUlNPUl08L2xpPjxsaT5MaXN0IEl0ZW0gMjwvbGk+PC91bD5cbiAgICAgICAgICAgIC8vIHdpbGwgcmVtb3ZlIHRoZSBmaXJzdCA8bGk+IGJ1dCBhZGQgc29tZSBleHRyYSBlbGVtZW50IGJlZm9yZSAodmFyaWVzIGJhc2VkIG9uIGJyb3dzZXIpXG4gICAgICAgICAgICAvLyBJbnN0ZWFkLCB0aGlzIHdpbGw6XG4gICAgICAgICAgICAvLyAxKSByZW1vdmUgdGhlIGxpc3QgZWxlbWVudFxuICAgICAgICAgICAgLy8gMikgY3JlYXRlIGEgcGFyYWdyYXBoIGJlZm9yZSB0aGUgbGlzdFxuICAgICAgICAgICAgLy8gMykgbW92ZSB0aGUgY3Vyc29yIGludG8gdGhlIHBhcmFncmFwaFxuXG4gICAgICAgICAgICAvLyBjcmVhdGUgYSBwYXJhZ3JhcGggYmVmb3JlIHRoZSBsaXN0XG4gICAgICAgICAgICBwID0gdGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuICAgICAgICAgICAgcC5pbm5lckhUTUwgPSAnPGJyPic7XG4gICAgICAgICAgICBub2RlLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5pbnNlcnRCZWZvcmUocCwgbm9kZS5wYXJlbnRFbGVtZW50KTtcblxuICAgICAgICAgICAgLy8gbW92ZSB0aGUgY3Vyc29yIGludG8gdGhlIG5ldyBwYXJhZ3JhcGhcbiAgICAgICAgICAgIE1lZGl1bUVkaXRvci5zZWxlY3Rpb24ubW92ZUN1cnNvcih0aGlzLm9wdGlvbnMub3duZXJEb2N1bWVudCwgcCk7XG5cbiAgICAgICAgICAgIC8vIHJlbW92ZSB0aGUgbGlzdCBlbGVtZW50XG4gICAgICAgICAgICBub2RlLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQobm9kZSk7XG5cbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0gZWxzZSBpZiAoTWVkaXVtRWRpdG9yLnV0aWwuaXNLZXkoZXZlbnQsIE1lZGl1bUVkaXRvci51dGlsLmtleUNvZGUuQkFDS1NQQUNFKSAmJlxuICAgICAgICAgICAgICAgIChNZWRpdW1FZGl0b3IudXRpbC5nZXRDbG9zZXN0VGFnKG5vZGUsICdibG9ja3F1b3RlJykgIT09IGZhbHNlKSAmJlxuICAgICAgICAgICAgICAgIE1lZGl1bUVkaXRvci5zZWxlY3Rpb24uZ2V0Q2FyZXRPZmZzZXRzKG5vZGUpLmxlZnQgPT09IDApIHtcblxuICAgICAgICAgICAgLy8gd2hlbiBjdXJzb3IgaXMgYXQgdGhlIGJlZ2luaW5nIG9mIHRoZSBlbGVtZW50IGFuZCB0aGUgZWxlbWVudCBpcyA8YmxvY2txdW90ZT5cbiAgICAgICAgICAgIC8vIHRoZW4gcHJlc3NpbmcgYmFja3NwYWNlIGtleSBzaG91bGQgY2hhbmdlIHRoZSA8YmxvY2txdW90ZT4gdG8gYSA8cD4gdGFnXG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgTWVkaXVtRWRpdG9yLnV0aWwuZXhlY0Zvcm1hdEJsb2NrKHRoaXMub3B0aW9ucy5vd25lckRvY3VtZW50LCAncCcpO1xuICAgICAgICB9IGVsc2UgaWYgKE1lZGl1bUVkaXRvci51dGlsLmlzS2V5KGV2ZW50LCBNZWRpdW1FZGl0b3IudXRpbC5rZXlDb2RlLkVOVEVSKSAmJlxuICAgICAgICAgICAgICAgIChNZWRpdW1FZGl0b3IudXRpbC5nZXRDbG9zZXN0VGFnKG5vZGUsICdibG9ja3F1b3RlJykgIT09IGZhbHNlKSAmJlxuICAgICAgICAgICAgICAgIE1lZGl1bUVkaXRvci5zZWxlY3Rpb24uZ2V0Q2FyZXRPZmZzZXRzKG5vZGUpLnJpZ2h0ID09PSAwKSB7XG5cbiAgICAgICAgICAgIC8vIHdoZW4gY3Vyc29yIGlzIGF0IHRoZSBlbmQgb2YgPGJsb2NrcXVvdGU+LFxuICAgICAgICAgICAgLy8gdGhlbiBwcmVzc2luZyBlbnRlciBrZXkgc2hvdWxkIGNyZWF0ZSA8cD4gdGFnLCBub3QgPGJsb2NrcXVvdGU+XG4gICAgICAgICAgICBwID0gdGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuICAgICAgICAgICAgcC5pbm5lckhUTUwgPSAnPGJyPic7XG4gICAgICAgICAgICBub2RlLnBhcmVudEVsZW1lbnQuaW5zZXJ0QmVmb3JlKHAsIG5vZGUubmV4dFNpYmxpbmcpO1xuXG4gICAgICAgICAgICAvLyBtb3ZlIHRoZSBjdXJzb3IgaW50byB0aGUgbmV3IHBhcmFncmFwaFxuICAgICAgICAgICAgTWVkaXVtRWRpdG9yLnNlbGVjdGlvbi5tb3ZlQ3Vyc29yKHRoaXMub3B0aW9ucy5vd25lckRvY3VtZW50LCBwKTtcblxuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSBlbHNlIGlmIChNZWRpdW1FZGl0b3IudXRpbC5pc0tleShldmVudCwgTWVkaXVtRWRpdG9yLnV0aWwua2V5Q29kZS5CQUNLU1BBQ0UpICYmXG4gICAgICAgICAgICAgICAgTWVkaXVtRWRpdG9yLnV0aWwuaXNNZWRpdW1FZGl0b3JFbGVtZW50KG5vZGUucGFyZW50RWxlbWVudCkgJiZcbiAgICAgICAgICAgICAgICAhbm9kZS5wcmV2aW91c0VsZW1lbnRTaWJsaW5nICYmXG4gICAgICAgICAgICAgICAgbm9kZS5uZXh0RWxlbWVudFNpYmxpbmcgJiZcbiAgICAgICAgICAgICAgICBpc0VtcHR5LnRlc3Qobm9kZS5pbm5lckhUTUwpKSB7XG5cbiAgICAgICAgICAgIC8vIHdoZW4gY3Vyc29yIGlzIGluIHRoZSBmaXJzdCBlbGVtZW50LCBpdCdzIGVtcHR5IGFuZCB1c2VyIHByZXNzZXMgYmFja3NwYWNlLFxuICAgICAgICAgICAgLy8gZG8gZGVsZXRlIGFjdGlvbiBpbnN0ZWFkIHRvIGdldCByaWQgb2YgdGhlIGZpcnN0IGVsZW1lbnQgYW5kIG1vdmUgY2FyZXQgdG8gMm5kXG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgTWVkaXVtRWRpdG9yLnNlbGVjdGlvbi5tb3ZlQ3Vyc29yKHRoaXMub3B0aW9ucy5vd25lckRvY3VtZW50LCBub2RlLm5leHRTaWJsaW5nKTtcbiAgICAgICAgICAgIG5vZGUucGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZChub2RlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhhbmRsZUtleXVwKGV2ZW50KSB7XG4gICAgICAgIHZhciBub2RlID0gTWVkaXVtRWRpdG9yLnNlbGVjdGlvbi5nZXRTZWxlY3Rpb25TdGFydCh0aGlzLm9wdGlvbnMub3duZXJEb2N1bWVudCksXG4gICAgICAgICAgICB0YWdOYW1lO1xuXG4gICAgICAgIGlmICghbm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3lhYndlL21lZGl1bS1lZGl0b3IvaXNzdWVzLzk5NFxuICAgICAgICAvLyBGaXJlZm94IHRocm93biBhbiBlcnJvciB3aGVuIGNhbGxpbmcgYGZvcm1hdEJsb2NrYCBvbiBhbiBlbXB0eSBlZGl0YWJsZSBibG9ja0NvbnRhaW5lciB0aGF0J3Mgbm90IGEgPGRpdj5cbiAgICAgICAgaWYgKE1lZGl1bUVkaXRvci51dGlsLmlzTWVkaXVtRWRpdG9yRWxlbWVudChub2RlKSAmJiBub2RlLmNoaWxkcmVuLmxlbmd0aCA9PT0gMCAmJiAhTWVkaXVtRWRpdG9yLnV0aWwuaXNCbG9ja0NvbnRhaW5lcihub2RlKSkge1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQuZXhlY0NvbW1hbmQoJ2Zvcm1hdEJsb2NrJywgZmFsc2UsICdwJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20veWFid2UvbWVkaXVtLWVkaXRvci9pc3N1ZXMvODM0XG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS95YWJ3ZS9tZWRpdW0tZWRpdG9yL3B1bGwvMzgyXG4gICAgICAgIC8vIERvbid0IGNhbGwgZm9ybWF0IGJsb2NrIGlmIHRoaXMgaXMgYSBibG9jayBlbGVtZW50IChpZSBoMSwgZmlnQ2FwdGlvbiwgZXRjLilcbiAgICAgICAgaWYgKE1lZGl1bUVkaXRvci51dGlsLmlzS2V5KGV2ZW50LCBNZWRpdW1FZGl0b3IudXRpbC5rZXlDb2RlLkVOVEVSKSAmJlxuICAgICAgICAgICAgIU1lZGl1bUVkaXRvci51dGlsLmlzTGlzdEl0ZW0obm9kZSkgJiZcbiAgICAgICAgICAgICFNZWRpdW1FZGl0b3IudXRpbC5pc0Jsb2NrQ29udGFpbmVyKG5vZGUpKSB7XG5cbiAgICAgICAgICAgIHRhZ05hbWUgPSBub2RlLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAvLyBGb3IgYW5jaG9yIHRhZ3MsIHVubGlua1xuICAgICAgICAgICAgaWYgKHRhZ05hbWUgPT09ICdhJykge1xuICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5vd25lckRvY3VtZW50LmV4ZWNDb21tYW5kKCd1bmxpbmsnLCBmYWxzZSwgbnVsbCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFldmVudC5zaGlmdEtleSAmJiAhZXZlbnQuY3RybEtleSkge1xuICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5vd25lckRvY3VtZW50LmV4ZWNDb21tYW5kKCdmb3JtYXRCbG9jaycsIGZhbHNlLCAncCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaGFuZGxlRWRpdGFibGVJbnB1dChldmVudCwgZWRpdGFibGUpIHtcbiAgICAgICAgdmFyIHRleHRhcmVhID0gZWRpdGFibGUucGFyZW50Tm9kZS5xdWVyeVNlbGVjdG9yKCd0ZXh0YXJlYVttZWRpdW0tZWRpdG9yLXRleHRhcmVhLWlkPVwiJyArIGVkaXRhYmxlLmdldEF0dHJpYnV0ZSgnbWVkaXVtLWVkaXRvci10ZXh0YXJlYS1pZCcpICsgJ1wiXScpO1xuICAgICAgICBpZiAodGV4dGFyZWEpIHtcbiAgICAgICAgICAgIHRleHRhcmVhLnZhbHVlID0gZWRpdGFibGUuaW5uZXJIVE1MLnRyaW0oKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEludGVybmFsIGhlbHBlciBtZXRob2RzIHdoaWNoIHNob3VsZG4ndCBiZSBleHBvc2VkIGV4dGVybmFsbHlcblxuICAgIGZ1bmN0aW9uIGFkZFRvRWRpdG9ycyh3aW4pIHtcbiAgICAgICAgaWYgKCF3aW4uX21lZGl1bUVkaXRvcnMpIHtcbiAgICAgICAgICAgIC8vIFRvIGF2b2lkIGJyZWFraW5nIHVzZXJzIHdobyBhcmUgYXNzdW1pbmcgdGhhdCB0aGUgdW5pcXVlIGlkIG9uXG4gICAgICAgICAgICAvLyBtZWRpdW0tZWRpdG9yIGVsZW1lbnRzIHdpbGwgc3RhcnQgYXQgMSwgaW5zZXJ0aW5nIGEgJ251bGwnIGluIHRoZVxuICAgICAgICAgICAgLy8gYXJyYXkgc28gdGhlIHVuaXF1ZS1pZCBjYW4gYWx3YXlzIG1hcCB0byB0aGUgaW5kZXggb2YgdGhlIGVkaXRvciBpbnN0YW5jZVxuICAgICAgICAgICAgd2luLl9tZWRpdW1FZGl0b3JzID0gW251bGxdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgdGhpcyBhbHJlYWR5IGhhcyBhIHVuaXF1ZSBpZCwgcmUtdXNlIGl0XG4gICAgICAgIGlmICghdGhpcy5pZCkge1xuICAgICAgICAgICAgdGhpcy5pZCA9IHdpbi5fbWVkaXVtRWRpdG9ycy5sZW5ndGg7XG4gICAgICAgIH1cblxuICAgICAgICB3aW4uX21lZGl1bUVkaXRvcnNbdGhpcy5pZF0gPSB0aGlzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlbW92ZUZyb21FZGl0b3JzKHdpbikge1xuICAgICAgICBpZiAoIXdpbi5fbWVkaXVtRWRpdG9ycyB8fCAhd2luLl9tZWRpdW1FZGl0b3JzW3RoaXMuaWRdKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvKiBTZXR0aW5nIHRoZSBpbnN0YW5jZSB0byBudWxsIGluIHRoZSBhcnJheSBpbnN0ZWFkIG9mIGRlbGV0aW5nIGl0IGFsbG93czpcbiAgICAgICAgICogMSkgRWFjaCBpbnN0YW5jZSB0byBwcmVzZXJ2ZSBpdHMgb3duIHVuaXF1ZS1pZCwgZXZlbiBhZnRlciBiZWluZyBkZXN0cm95ZWRcbiAgICAgICAgICogICAgYW5kIGluaXRpYWxpemVkIGFnYWluXG4gICAgICAgICAqIDIpIFRoZSB1bmlxdWUtaWQgdG8gYWx3YXlzIGNvcnJlc3BvbmQgdG8gYW4gaW5kZXggaW4gdGhlIGFycmF5IG9mIG1lZGl1bS1lZGl0b3JcbiAgICAgICAgICogICAgaW5zdGFuY2VzLiBUaHVzLCB3ZSB3aWxsIGJlIGFibGUgdG8gbG9vayBhdCBhIGNvbnRlbnRlZGl0YWJsZSwgYW5kIGRldGVybWluZVxuICAgICAgICAgKiAgICB3aGljaCBpbnN0YW5jZSBpdCBiZWxvbmdzIHRvLCBieSBpbmRleGluZyBpbnRvIHRoZSBnbG9iYWwgYXJyYXkuXG4gICAgICAgICAqL1xuICAgICAgICB3aW4uX21lZGl1bUVkaXRvcnNbdGhpcy5pZF0gPSBudWxsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnRzQXJyYXkoc2VsZWN0b3IsIGRvYywgZmlsdGVyRWRpdG9yRWxlbWVudHMpIHtcbiAgICAgICAgdmFyIGVsZW1lbnRzID0gW107XG5cbiAgICAgICAgaWYgKCFzZWxlY3Rvcikge1xuICAgICAgICAgICAgc2VsZWN0b3IgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICAvLyBJZiBzdHJpbmcsIHVzZSBhcyBxdWVyeSBzZWxlY3RvclxuICAgICAgICBpZiAodHlwZW9mIHNlbGVjdG9yID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgc2VsZWN0b3IgPSBkb2MucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgZWxlbWVudCwgcHV0IGludG8gYXJyYXlcbiAgICAgICAgaWYgKE1lZGl1bUVkaXRvci51dGlsLmlzRWxlbWVudChzZWxlY3RvcikpIHtcbiAgICAgICAgICAgIHNlbGVjdG9yID0gW3NlbGVjdG9yXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmaWx0ZXJFZGl0b3JFbGVtZW50cykge1xuICAgICAgICAgICAgLy8gUmVtb3ZlIGVsZW1lbnRzIHRoYXQgaGF2ZSBhbHJlYWR5IGJlZW4gaW5pdGlhbGl6ZWQgYnkgdGhlIGVkaXRvclxuICAgICAgICAgICAgLy8gc2VsZWNvdHIgbWlnaHQgbm90IGJlIGFuIGFycmF5IChpZSBOb2RlTGlzdCkgc28gdXNlIGZvciBsb29wXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGVjdG9yLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVsID0gc2VsZWN0b3JbaV07XG4gICAgICAgICAgICAgICAgaWYgKE1lZGl1bUVkaXRvci51dGlsLmlzRWxlbWVudChlbCkgJiZcbiAgICAgICAgICAgICAgICAgICAgIWVsLmdldEF0dHJpYnV0ZSgnZGF0YS1tZWRpdW0tZWRpdG9yLWVsZW1lbnQnKSAmJlxuICAgICAgICAgICAgICAgICAgICAhZWwuZ2V0QXR0cmlidXRlKCdtZWRpdW0tZWRpdG9yLXRleHRhcmVhLWlkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudHMucHVzaChlbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ29udmVydCBOb2RlTGlzdCAob3Igb3RoZXIgYXJyYXkgbGlrZSBvYmplY3QpIGludG8gYW4gYXJyYXlcbiAgICAgICAgICAgIGVsZW1lbnRzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmFwcGx5KHNlbGVjdG9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBlbGVtZW50cztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbGVhbnVwVGV4dGFyZWFFbGVtZW50KGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIHRleHRhcmVhID0gZWxlbWVudC5wYXJlbnROb2RlLnF1ZXJ5U2VsZWN0b3IoJ3RleHRhcmVhW21lZGl1bS1lZGl0b3ItdGV4dGFyZWEtaWQ9XCInICsgZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ21lZGl1bS1lZGl0b3ItdGV4dGFyZWEtaWQnKSArICdcIl0nKTtcbiAgICAgICAgaWYgKHRleHRhcmVhKSB7XG4gICAgICAgICAgICAvLyBVbi1oaWRlIHRoZSB0ZXh0YXJlYVxuICAgICAgICAgICAgdGV4dGFyZWEuY2xhc3NMaXN0LnJlbW92ZSgnbWVkaXVtLWVkaXRvci1oaWRkZW4nKTtcbiAgICAgICAgICAgIHRleHRhcmVhLnJlbW92ZUF0dHJpYnV0ZSgnbWVkaXVtLWVkaXRvci10ZXh0YXJlYS1pZCcpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbGVtZW50LnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgIGVsZW1lbnQucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlbGVtZW50KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldEV4dGVuc2lvbkRlZmF1bHRzKGV4dGVuc2lvbiwgZGVmYXVsdHMpIHtcbiAgICAgICAgT2JqZWN0LmtleXMoZGVmYXVsdHMpLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcbiAgICAgICAgICAgIGlmIChleHRlbnNpb25bcHJvcF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbltwcm9wXSA9IGRlZmF1bHRzW3Byb3BdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGV4dGVuc2lvbjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbml0RXh0ZW5zaW9uKGV4dGVuc2lvbiwgbmFtZSwgaW5zdGFuY2UpIHtcbiAgICAgICAgdmFyIGV4dGVuc2lvbkRlZmF1bHRzID0ge1xuICAgICAgICAgICAgJ3dpbmRvdyc6IGluc3RhbmNlLm9wdGlvbnMuY29udGVudFdpbmRvdyxcbiAgICAgICAgICAgICdkb2N1bWVudCc6IGluc3RhbmNlLm9wdGlvbnMub3duZXJEb2N1bWVudCxcbiAgICAgICAgICAgICdiYXNlJzogaW5zdGFuY2VcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBZGQgZGVmYXVsdCBvcHRpb25zIGludG8gdGhlIGV4dGVuc2lvblxuICAgICAgICBleHRlbnNpb24gPSBzZXRFeHRlbnNpb25EZWZhdWx0cyhleHRlbnNpb24sIGV4dGVuc2lvbkRlZmF1bHRzKTtcblxuICAgICAgICAvLyBDYWxsIGluaXQgb24gdGhlIGV4dGVuc2lvblxuICAgICAgICBpZiAodHlwZW9mIGV4dGVuc2lvbi5pbml0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBleHRlbnNpb24uaW5pdCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IGV4dGVuc2lvbiBuYW1lIChpZiBub3QgYWxyZWFkeSBzZXQpXG4gICAgICAgIGlmICghZXh0ZW5zaW9uLm5hbWUpIHtcbiAgICAgICAgICAgIGV4dGVuc2lvbi5uYW1lID0gbmFtZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXh0ZW5zaW9uO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzVG9vbGJhckVuYWJsZWQoKSB7XG4gICAgICAgIC8vIElmIGFueSBvZiB0aGUgZWxlbWVudHMgZG9uJ3QgaGF2ZSB0aGUgdG9vbGJhciBkaXNhYmxlZFxuICAgICAgICAvLyBXZSBuZWVkIGEgdG9vbGJhclxuICAgICAgICBpZiAodGhpcy5lbGVtZW50cy5ldmVyeShmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhIWVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLWRpc2FibGUtdG9vbGJhcicpO1xuICAgICAgICAgICAgfSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLm9wdGlvbnMudG9vbGJhciAhPT0gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNBbmNob3JQcmV2aWV3RW5hYmxlZCgpIHtcbiAgICAgICAgLy8gSWYgdG9vbGJhciBpcyBkaXNhYmxlZCwgZG9uJ3QgYWRkXG4gICAgICAgIGlmICghaXNUb29sYmFyRW5hYmxlZC5jYWxsKHRoaXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5vcHRpb25zLmFuY2hvclByZXZpZXcgIT09IGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzUGxhY2Vob2xkZXJFbmFibGVkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5vcHRpb25zLnBsYWNlaG9sZGVyICE9PSBmYWxzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0F1dG9MaW5rRW5hYmxlZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3B0aW9ucy5hdXRvTGluayAhPT0gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNJbWFnZURyYWdnaW5nRW5hYmxlZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3B0aW9ucy5pbWFnZURyYWdnaW5nICE9PSBmYWxzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0tleWJvYXJkQ29tbWFuZHNFbmFibGVkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5vcHRpb25zLmtleWJvYXJkQ29tbWFuZHMgIT09IGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNob3VsZFVzZUZpbGVEcmFnZ2luZ0V4dGVuc2lvbigpIHtcbiAgICAgICAgLy8gU2luY2UgdGhlIGZpbGUtZHJhZ2dpbmcgZXh0ZW5zaW9uIHJlcGxhY2VzIHRoZSBpbWFnZS1kcmFnZ2luZyBleHRlbnNpb24sXG4gICAgICAgIC8vIHdlIG5lZWQgdG8gY2hlY2sgaWYgdGhlIHVzZXIgcGFzc2VkIGFuIG92ZXJyaWRlZCBpbWFnZS1kcmFnZ2luZyBleHRlbnNpb24uXG4gICAgICAgIC8vIElmIHRoZXkgaGF2ZSwgdG8gYXZvaWQgYnJlYWtpbmcgdXNlcnMsIHdlIHdvbid0IHVzZSBmaWxlLWRyYWdnaW5nIGV4dGVuc2lvbi5cbiAgICAgICAgcmV0dXJuICF0aGlzLm9wdGlvbnMuZXh0ZW5zaW9uc1snaW1hZ2VEcmFnZ2luZyddO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUNvbnRlbnRFZGl0YWJsZSh0ZXh0YXJlYSkge1xuICAgICAgICB2YXIgZGl2ID0gdGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JyksXG4gICAgICAgICAgICBub3cgPSBEYXRlLm5vdygpLFxuICAgICAgICAgICAgdW5pcXVlSWQgPSAnbWVkaXVtLWVkaXRvci0nICsgbm93LFxuICAgICAgICAgICAgYXR0cyA9IHRleHRhcmVhLmF0dHJpYnV0ZXM7XG5cbiAgICAgICAgLy8gU29tZSBicm93c2VycyBjYW4gbW92ZSBwcmV0dHkgZmFzdCwgc2luY2Ugd2UncmUgdXNpbmcgYSB0aW1lc3RhbXBcbiAgICAgICAgLy8gdG8gbWFrZSBhIHVuaXF1ZS1pZCwgZW5zdXJlIHRoYXQgdGhlIGlkIGlzIGFjdHVhbGx5IHVuaXF1ZSBvbiB0aGUgcGFnZVxuICAgICAgICB3aGlsZSAodGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodW5pcXVlSWQpKSB7XG4gICAgICAgICAgICBub3crKztcbiAgICAgICAgICAgIHVuaXF1ZUlkID0gJ21lZGl1bS1lZGl0b3ItJyArIG5vdztcbiAgICAgICAgfVxuXG4gICAgICAgIGRpdi5jbGFzc05hbWUgPSB0ZXh0YXJlYS5jbGFzc05hbWU7XG4gICAgICAgIGRpdi5pZCA9IHVuaXF1ZUlkO1xuICAgICAgICBkaXYuaW5uZXJIVE1MID0gdGV4dGFyZWEudmFsdWU7XG5cbiAgICAgICAgdGV4dGFyZWEuc2V0QXR0cmlidXRlKCdtZWRpdW0tZWRpdG9yLXRleHRhcmVhLWlkJywgdW5pcXVlSWQpO1xuXG4gICAgICAgIC8vIHJlLWNyZWF0ZSBhbGwgYXR0cmlidXRlcyBmcm9tIHRoZSB0ZXh0ZWFyZWEgdG8gdGhlIG5ldyBjcmVhdGVkIGRpdlxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGF0dHMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICAvLyBkbyBub3QgcmUtY3JlYXRlIGV4aXN0aW5nIGF0dHJpYnV0ZXNcbiAgICAgICAgICAgIGlmICghZGl2Lmhhc0F0dHJpYnV0ZShhdHRzW2ldLm5vZGVOYW1lKSkge1xuICAgICAgICAgICAgICAgIGRpdi5zZXRBdHRyaWJ1dGUoYXR0c1tpXS5ub2RlTmFtZSwgYXR0c1tpXS5ub2RlVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgdGV4dGFyZWEgaGFzIGEgZm9ybSwgbGlzdGVuIGZvciByZXNldCBvbiB0aGUgZm9ybSB0byBjbGVhclxuICAgICAgICAvLyB0aGUgY29udGVudCBvZiB0aGUgY3JlYXRlZCBkaXZcbiAgICAgICAgaWYgKHRleHRhcmVhLmZvcm0pIHtcbiAgICAgICAgICAgIHRoaXMub24odGV4dGFyZWEuZm9ybSwgJ3Jlc2V0JywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKCFldmVudC5kZWZhdWx0UHJldmVudGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVzZXRDb250ZW50KHRoaXMub3B0aW9ucy5vd25lckRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHVuaXF1ZUlkKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRleHRhcmVhLmNsYXNzTGlzdC5hZGQoJ21lZGl1bS1lZGl0b3ItaGlkZGVuJyk7XG4gICAgICAgIHRleHRhcmVhLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKFxuICAgICAgICAgICAgZGl2LFxuICAgICAgICAgICAgdGV4dGFyZWFcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm4gZGl2O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluaXRFbGVtZW50KGVsZW1lbnQsIGVkaXRvcklkKSB7XG4gICAgICAgIGlmICghZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtbWVkaXVtLWVkaXRvci1lbGVtZW50JykpIHtcbiAgICAgICAgICAgIGlmIChlbGVtZW50Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICd0ZXh0YXJlYScpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50ID0gY3JlYXRlQ29udGVudEVkaXRhYmxlLmNhbGwodGhpcywgZWxlbWVudCk7XG5cbiAgICAgICAgICAgICAgICAvLyBNYWtlIHN1cmUgd2Ugb25seSBhdHRhY2ggdG8gZWRpdGFibGVJbnB1dCBvbmNlIGZvciA8dGV4dGFyZWE+IGVsZW1lbnRzXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmluc3RhbmNlSGFuZGxlRWRpdGFibGVJbnB1dCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmluc3RhbmNlSGFuZGxlRWRpdGFibGVJbnB1dCA9IGhhbmRsZUVkaXRhYmxlSW5wdXQuYmluZCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdWJzY3JpYmUoJ2VkaXRhYmxlSW5wdXQnLCB0aGlzLmluc3RhbmNlSGFuZGxlRWRpdGFibGVJbnB1dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIXRoaXMub3B0aW9ucy5kaXNhYmxlRWRpdGluZyAmJiAhZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtZGlzYWJsZS1lZGl0aW5nJykpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnY29udGVudEVkaXRhYmxlJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3NwZWxsY2hlY2snLCB0aGlzLm9wdGlvbnMuc3BlbGxjaGVjayk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSB3ZSBvbmx5IGF0dGFjaCB0byBlZGl0YWJsZUtleWRvd25FbnRlciBvbmNlIGZvciBkaXNhYmxlLXJldHVybiBvcHRpb25zXG4gICAgICAgICAgICBpZiAoIXRoaXMuaW5zdGFuY2VIYW5kbGVFZGl0YWJsZUtleWRvd25FbnRlcikge1xuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmdldEF0dHJpYnV0ZSgnZGF0YS1kaXNhYmxlLXJldHVybicpIHx8IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLWRpc2FibGUtZG91YmxlLXJldHVybicpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5zdGFuY2VIYW5kbGVFZGl0YWJsZUtleWRvd25FbnRlciA9IGhhbmRsZURpc2FibGVkRW50ZXJLZXlkb3duLmJpbmQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3Vic2NyaWJlKCdlZGl0YWJsZUtleWRvd25FbnRlcicsIHRoaXMuaW5zdGFuY2VIYW5kbGVFZGl0YWJsZUtleWRvd25FbnRlcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpZiB3ZSdyZSBub3QgZGlzYWJsaW5nIHJldHVybiwgYWRkIGEgaGFuZGxlciB0byBoZWxwIGhhbmRsZSBjbGVhbnVwXG4gICAgICAgICAgICAvLyBmb3IgY2VydGFpbiBjYXNlcyB3aGVuIGVudGVyIGlzIHByZXNzZWRcbiAgICAgICAgICAgIGlmICghdGhpcy5vcHRpb25zLmRpc2FibGVSZXR1cm4gJiYgIWVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLWRpc2FibGUtcmV0dXJuJykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLm9uKGVsZW1lbnQsICdrZXl1cCcsIGhhbmRsZUtleXVwLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZWxlbWVudElkID0gTWVkaXVtRWRpdG9yLnV0aWwuZ3VpZCgpO1xuXG4gICAgICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnZGF0YS1tZWRpdW0tZWRpdG9yLWVsZW1lbnQnLCB0cnVlKTtcbiAgICAgICAgICAgIGVsZW1lbnQuY2xhc3NMaXN0LmFkZCgnbWVkaXVtLWVkaXRvci1lbGVtZW50Jyk7XG4gICAgICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgncm9sZScsICd0ZXh0Ym94Jyk7XG4gICAgICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnYXJpYS1tdWx0aWxpbmUnLCB0cnVlKTtcbiAgICAgICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdkYXRhLW1lZGl1bS1lZGl0b3ItZWRpdG9yLWluZGV4JywgZWRpdG9ySWQpO1xuICAgICAgICAgICAgLy8gVE9ETzogTWVyZ2UgZGF0YS1tZWRpdW0tZWRpdG9yLWVsZW1lbnQgYW5kIG1lZGl1bS1lZGl0b3ItaW5kZXggYXR0cmlidXRlcyBmb3IgNi4wLjBcbiAgICAgICAgICAgIC8vIG1lZGl1bS1lZGl0b3ItaW5kZXggaXMgbm90IG5hbWVkIGNvcnJlY3RseSBhbnltb3JlIGFuZCBjYW4gYmUgcmUtcHVycG9zZWQgdG8gc2lnbmlmeVxuICAgICAgICAgICAgLy8gd2hldGhlciB0aGUgZWxlbWVudCBoYXMgYmVlbiBpbml0aWFsaXplZCBvciBub3RcbiAgICAgICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdtZWRpdW0tZWRpdG9yLWluZGV4JywgZWxlbWVudElkKTtcbiAgICAgICAgICAgIGluaXRpYWxDb250ZW50W2VsZW1lbnRJZF0gPSBlbGVtZW50LmlubmVySFRNTDtcblxuICAgICAgICAgICAgdGhpcy5ldmVudHMuYXR0YWNoQWxsRXZlbnRzVG9FbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYXR0YWNoSGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIGF0dGFjaCB0byB0YWJzXG4gICAgICAgIHRoaXMuc3Vic2NyaWJlKCdlZGl0YWJsZUtleWRvd25UYWInLCBoYW5kbGVUYWJLZXlkb3duLmJpbmQodGhpcykpO1xuXG4gICAgICAgIC8vIEJpbmQga2V5cyB3aGljaCBjYW4gY3JlYXRlIG9yIGRlc3Ryb3kgYSBibG9jayBlbGVtZW50OiBiYWNrc3BhY2UsIGRlbGV0ZSwgcmV0dXJuXG4gICAgICAgIHRoaXMuc3Vic2NyaWJlKCdlZGl0YWJsZUtleWRvd25EZWxldGUnLCBoYW5kbGVCbG9ja0RlbGV0ZUtleWRvd25zLmJpbmQodGhpcykpO1xuICAgICAgICB0aGlzLnN1YnNjcmliZSgnZWRpdGFibGVLZXlkb3duRW50ZXInLCBoYW5kbGVCbG9ja0RlbGV0ZUtleWRvd25zLmJpbmQodGhpcykpO1xuXG4gICAgICAgIC8vIEJpbmQgZG91YmxlIHNwYWNlIGV2ZW50XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuZGlzYWJsZUV4dHJhU3BhY2VzKSB7XG4gICAgICAgICAgICB0aGlzLnN1YnNjcmliZSgnZWRpdGFibGVLZXlkb3duU3BhY2UnLCBoYW5kbGVEaXNhYmxlRXh0cmFTcGFjZXMuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYWtlIHN1cmUgd2Ugb25seSBhdHRhY2ggdG8gZWRpdGFibGVLZXlkb3duRW50ZXIgb25jZSBmb3IgZGlzYWJsZS1yZXR1cm4gb3B0aW9uc1xuICAgICAgICBpZiAoIXRoaXMuaW5zdGFuY2VIYW5kbGVFZGl0YWJsZUtleWRvd25FbnRlcikge1xuICAgICAgICAgICAgLy8gZGlzYWJsaW5nIHJldHVybiBvciBkb3VibGUgcmV0dXJuXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLmRpc2FibGVSZXR1cm4gfHwgdGhpcy5vcHRpb25zLmRpc2FibGVEb3VibGVSZXR1cm4pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmluc3RhbmNlSGFuZGxlRWRpdGFibGVLZXlkb3duRW50ZXIgPSBoYW5kbGVEaXNhYmxlZEVudGVyS2V5ZG93bi5iaW5kKHRoaXMpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3Vic2NyaWJlKCdlZGl0YWJsZUtleWRvd25FbnRlcicsIHRoaXMuaW5zdGFuY2VIYW5kbGVFZGl0YWJsZUtleWRvd25FbnRlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbml0RXh0ZW5zaW9ucygpIHtcblxuICAgICAgICB0aGlzLmV4dGVuc2lvbnMgPSBbXTtcblxuICAgICAgICAvLyBQYXNzZWQgaW4gZXh0ZW5zaW9uc1xuICAgICAgICBPYmplY3Qua2V5cyh0aGlzLm9wdGlvbnMuZXh0ZW5zaW9ucykuZm9yRWFjaChmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgLy8gQWx3YXlzIHNhdmUgdGhlIHRvb2xiYXIgZXh0ZW5zaW9uIGZvciBsYXN0XG4gICAgICAgICAgICBpZiAobmFtZSAhPT0gJ3Rvb2xiYXInICYmIHRoaXMub3B0aW9ucy5leHRlbnNpb25zW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5leHRlbnNpb25zLnB1c2goaW5pdEV4dGVuc2lvbih0aGlzLm9wdGlvbnMuZXh0ZW5zaW9uc1tuYW1lXSwgbmFtZSwgdGhpcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0aGlzKTtcblxuICAgICAgICAvLyA0IENhc2VzIGZvciBpbWFnZURyYWdnaW5nICsgZmlsZURyYWdnaW5nIGV4dGVuc29uczpcbiAgICAgICAgLy9cbiAgICAgICAgLy8gMS4gSW1hZ2VEcmFnZ2luZyBPTiArIE5vIEN1c3RvbSBJbWFnZSBEcmFnZ2luZyBFeHRlbnNpb246XG4gICAgICAgIC8vICAgICogVXNlIGZpbGVEcmFnZ2luZyBleHRlbnNpb24gKGRlZmF1bHQgb3B0aW9ucylcbiAgICAgICAgLy8gMi4gSW1hZ2VEcmFnZ2luZyBPRkYgKyBObyBDdXN0b20gSW1hZ2UgRHJhZ2dpbmcgRXh0ZW5zaW9uOlxuICAgICAgICAvLyAgICAqIFVzZSBmaWxlRHJhZ2dpbmcgZXh0ZW5zaW9uIHcvIGltYWdlcyB0dXJuZWQgb2ZmXG4gICAgICAgIC8vIDMuIEltYWdlRHJhZ2dpbmcgT04gKyBDdXN0b20gSW1hZ2UgRHJhZ2dpbmcgRXh0ZW5zaW9uOlxuICAgICAgICAvLyAgICAqIERvbid0IHVzZSBmaWxlRHJhZ2dpbmcgKGNvdWxkIGludGVyZmVyZSB3aXRoIGN1c3RvbSBpbWFnZSBkcmFnZ2luZyBleHRlbnNpb24pXG4gICAgICAgIC8vIDQuIEltYWdlRHJhZ2dpbmcgT0ZGICsgQ3VzdG9tIEltYWdlIERyYWdnaW5nOlxuICAgICAgICAvLyAgICAqIERvbid0IHVzZSBmaWxlRHJhZ2dpbmcgKGNvdWxkIGludGVyZmVyZSB3aXRoIGN1c3RvbSBpbWFnZSBkcmFnZ2luZyBleHRlbnNpb24pXG4gICAgICAgIGlmIChzaG91bGRVc2VGaWxlRHJhZ2dpbmdFeHRlbnNpb24uY2FsbCh0aGlzKSkge1xuICAgICAgICAgICAgdmFyIG9wdHMgPSB0aGlzLm9wdGlvbnMuZmlsZURyYWdnaW5nO1xuICAgICAgICAgICAgaWYgKCFvcHRzKSB7XG4gICAgICAgICAgICAgICAgb3B0cyA9IHt9O1xuXG4gICAgICAgICAgICAgICAgLy8gSW1hZ2UgaXMgaW4gdGhlICdhbGxvd2VkVHlwZXMnIGxpc3QgYnkgZGVmYXVsdC5cbiAgICAgICAgICAgICAgICAvLyBJZiBpbWFnZURyYWdnaW5nIGlzIG9mZiBvdmVycmlkZSB0aGUgJ2FsbG93ZWRUeXBlcycgbGlzdCB3aXRoIGFuIGVtcHR5IG9uZVxuICAgICAgICAgICAgICAgIGlmICghaXNJbWFnZURyYWdnaW5nRW5hYmxlZC5jYWxsKHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdHMuYWxsb3dlZFR5cGVzID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5hZGRCdWlsdEluRXh0ZW5zaW9uKCdmaWxlRHJhZ2dpbmcnLCBvcHRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWx0LWluIGV4dGVuc2lvbnNcbiAgICAgICAgdmFyIGJ1aWx0SW5zID0ge1xuICAgICAgICAgICAgcGFzdGU6IHRydWUsXG4gICAgICAgICAgICAnYW5jaG9yLXByZXZpZXcnOiBpc0FuY2hvclByZXZpZXdFbmFibGVkLmNhbGwodGhpcyksXG4gICAgICAgICAgICBhdXRvTGluazogaXNBdXRvTGlua0VuYWJsZWQuY2FsbCh0aGlzKSxcbiAgICAgICAgICAgIGtleWJvYXJkQ29tbWFuZHM6IGlzS2V5Ym9hcmRDb21tYW5kc0VuYWJsZWQuY2FsbCh0aGlzKSxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBpc1BsYWNlaG9sZGVyRW5hYmxlZC5jYWxsKHRoaXMpXG4gICAgICAgIH07XG4gICAgICAgIE9iamVjdC5rZXlzKGJ1aWx0SW5zKS5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICBpZiAoYnVpbHRJbnNbbmFtZV0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFkZEJ1aWx0SW5FeHRlbnNpb24obmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRoaXMpO1xuXG4gICAgICAgIC8vIFVzZXJzIGNhbiBwYXNzIGluIGEgY3VzdG9tIHRvb2xiYXIgZXh0ZW5zaW9uXG4gICAgICAgIC8vIHNvIGNoZWNrIGZvciB0aGF0IGZpcnN0IGFuZCBpZiBpdCdzIG5vdCBwcmVzZW50XG4gICAgICAgIC8vIGp1c3QgY3JlYXRlIHRoZSBkZWZhdWx0IHRvb2xiYXJcbiAgICAgICAgdmFyIHRvb2xiYXJFeHRlbnNpb24gPSB0aGlzLm9wdGlvbnMuZXh0ZW5zaW9uc1sndG9vbGJhciddO1xuICAgICAgICBpZiAoIXRvb2xiYXJFeHRlbnNpb24gJiYgaXNUb29sYmFyRW5hYmxlZC5jYWxsKHRoaXMpKSB7XG4gICAgICAgICAgICAvLyBCYWNrd2FyZHMgY29tcGF0YWJpbGl0eVxuICAgICAgICAgICAgdmFyIHRvb2xiYXJPcHRpb25zID0gTWVkaXVtRWRpdG9yLnV0aWwuZXh0ZW5kKHt9LCB0aGlzLm9wdGlvbnMudG9vbGJhciwge1xuICAgICAgICAgICAgICAgIGFsbG93TXVsdGlQYXJhZ3JhcGhTZWxlY3Rpb246IHRoaXMub3B0aW9ucy5hbGxvd011bHRpUGFyYWdyYXBoU2VsZWN0aW9uIC8vIGRlcHJlY2F0ZWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdG9vbGJhckV4dGVuc2lvbiA9IG5ldyBNZWRpdW1FZGl0b3IuZXh0ZW5zaW9ucy50b29sYmFyKHRvb2xiYXJPcHRpb25zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHRoZSB0b29sYmFyIGlzIG5vdCBkaXNhYmxlZCwgc28gd2UgYWN0dWFsbHkgaGF2ZSBhbiBleHRlbnNpb25cbiAgICAgICAgLy8gaW5pdGlhbGl6ZSBpdCBhbmQgYWRkIGl0IHRvIHRoZSBleHRlbnNpb25zIGFycmF5XG4gICAgICAgIGlmICh0b29sYmFyRXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICB0aGlzLmV4dGVuc2lvbnMucHVzaChpbml0RXh0ZW5zaW9uKHRvb2xiYXJFeHRlbnNpb24sICd0b29sYmFyJywgdGhpcykpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWVyZ2VPcHRpb25zKGRlZmF1bHRzLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciBkZXByZWNhdGVkUHJvcGVydGllcyA9IFtcbiAgICAgICAgICAgIFsnYWxsb3dNdWx0aVBhcmFncmFwaFNlbGVjdGlvbicsICd0b29sYmFyLmFsbG93TXVsdGlQYXJhZ3JhcGhTZWxlY3Rpb24nXVxuICAgICAgICBdO1xuICAgICAgICAvLyB3YXJuIGFib3V0IHVzaW5nIGRlcHJlY2F0ZWQgcHJvcGVydGllc1xuICAgICAgICBpZiAob3B0aW9ucykge1xuICAgICAgICAgICAgZGVwcmVjYXRlZFByb3BlcnRpZXMuZm9yRWFjaChmdW5jdGlvbiAocGFpcikge1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KHBhaXJbMF0pICYmIG9wdGlvbnNbcGFpclswXV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBNZWRpdW1FZGl0b3IudXRpbC5kZXByZWNhdGVkKHBhaXJbMF0sIHBhaXJbMV0sICd2Ni4wLjAnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBNZWRpdW1FZGl0b3IudXRpbC5kZWZhdWx0cyh7fSwgb3B0aW9ucywgZGVmYXVsdHMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGV4ZWNBY3Rpb25JbnRlcm5hbChhY3Rpb24sIG9wdHMpIHtcbiAgICAgICAgLypqc2xpbnQgcmVnZXhwOiB0cnVlKi9cbiAgICAgICAgdmFyIGFwcGVuZEFjdGlvbiA9IC9eYXBwZW5kLSguKykkL2dpLFxuICAgICAgICAgICAganVzdGlmeUFjdGlvbiA9IC9qdXN0aWZ5KFtBLVphLXpdKikkL2csIC8qIERldGVjdGluZyBpZiBpcyBqdXN0aWZ5Q2VudGVyfFJpZ2h0fExlZnQgKi9cbiAgICAgICAgICAgIG1hdGNoLFxuICAgICAgICAgICAgY21kVmFsdWVBcmd1bWVudDtcbiAgICAgICAgLypqc2xpbnQgcmVnZXhwOiBmYWxzZSovXG5cbiAgICAgICAgLy8gQWN0aW9ucyBzdGFydGluZyB3aXRoICdhcHBlbmQtJyBzaG91bGQgYXR0ZW1wdCB0byBmb3JtYXQgYSBibG9jayBvZiB0ZXh0ICgnZm9ybWF0QmxvY2snKSB1c2luZyBhIHNwZWNpZmljXG4gICAgICAgIC8vIHR5cGUgb2YgYmxvY2sgZWxlbWVudCAoaWUgYXBwZW5kLWJsb2NrcXVvdGUsIGFwcGVuZC1oMSwgYXBwZW5kLXByZSwgZXRjLilcbiAgICAgICAgbWF0Y2ggPSBhcHBlbmRBY3Rpb24uZXhlYyhhY3Rpb24pO1xuICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgIHJldHVybiBNZWRpdW1FZGl0b3IudXRpbC5leGVjRm9ybWF0QmxvY2sodGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQsIG1hdGNoWzFdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhY3Rpb24gPT09ICdmb250U2l6ZScpIHtcbiAgICAgICAgICAgIC8vIFRPRE86IERlcHJlY2F0ZSBzdXBwb3J0IGZvciBvcHRzLnNpemUgaW4gNi4wLjBcbiAgICAgICAgICAgIGlmIChvcHRzLnNpemUpIHtcbiAgICAgICAgICAgICAgICBNZWRpdW1FZGl0b3IudXRpbC5kZXByZWNhdGVkKCcuc2l6ZSBvcHRpb24gZm9yIGZvbnRTaXplIGNvbW1hbmQnLCAnLnZhbHVlJywgJzYuMC4wJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjbWRWYWx1ZUFyZ3VtZW50ID0gb3B0cy52YWx1ZSB8fCBvcHRzLnNpemU7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQuZXhlY0NvbW1hbmQoJ2ZvbnRTaXplJywgZmFsc2UsIGNtZFZhbHVlQXJndW1lbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ2ZvbnROYW1lJykge1xuICAgICAgICAgICAgLy8gVE9ETzogRGVwcmVjYXRlIHN1cHBvcnQgZm9yIG9wdHMubmFtZSBpbiA2LjAuMFxuICAgICAgICAgICAgaWYgKG9wdHMubmFtZSkge1xuICAgICAgICAgICAgICAgIE1lZGl1bUVkaXRvci51dGlsLmRlcHJlY2F0ZWQoJy5uYW1lIG9wdGlvbiBmb3IgZm9udE5hbWUgY29tbWFuZCcsICcudmFsdWUnLCAnNi4wLjAnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNtZFZhbHVlQXJndW1lbnQgPSBvcHRzLnZhbHVlIHx8IG9wdHMubmFtZTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9wdGlvbnMub3duZXJEb2N1bWVudC5leGVjQ29tbWFuZCgnZm9udE5hbWUnLCBmYWxzZSwgY21kVmFsdWVBcmd1bWVudCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYWN0aW9uID09PSAnY3JlYXRlTGluaycpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNyZWF0ZUxpbmsob3B0cyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYWN0aW9uID09PSAnaW1hZ2UnKSB7XG4gICAgICAgICAgICB2YXIgc3JjID0gdGhpcy5vcHRpb25zLmNvbnRlbnRXaW5kb3cuZ2V0U2VsZWN0aW9uKCkudG9TdHJpbmcoKS50cmltKCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQuZXhlY0NvbW1hbmQoJ2luc2VydEltYWdlJywgZmFsc2UsIHNyYyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYWN0aW9uID09PSAnaHRtbCcpIHtcbiAgICAgICAgICAgIHZhciBodG1sID0gdGhpcy5vcHRpb25zLmNvbnRlbnRXaW5kb3cuZ2V0U2VsZWN0aW9uKCkudG9TdHJpbmcoKS50cmltKCk7XG4gICAgICAgICAgICByZXR1cm4gTWVkaXVtRWRpdG9yLnV0aWwuaW5zZXJ0SFRNTENvbW1hbmQodGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQsIGh0bWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyogSXNzdWU6IGh0dHBzOi8vZ2l0aHViLmNvbS95YWJ3ZS9tZWRpdW0tZWRpdG9yL2lzc3Vlcy81OTVcbiAgICAgICAgICogSWYgdGhlIGFjdGlvbiBpcyB0byBqdXN0aWZ5IHRoZSB0ZXh0ICovXG4gICAgICAgIGlmIChqdXN0aWZ5QWN0aW9uLmV4ZWMoYWN0aW9uKSkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHRoaXMub3B0aW9ucy5vd25lckRvY3VtZW50LmV4ZWNDb21tYW5kKGFjdGlvbiwgZmFsc2UsIG51bGwpLFxuICAgICAgICAgICAgICAgIHBhcmVudE5vZGUgPSBNZWRpdW1FZGl0b3Iuc2VsZWN0aW9uLmdldFNlbGVjdGVkUGFyZW50RWxlbWVudChNZWRpdW1FZGl0b3Iuc2VsZWN0aW9uLmdldFNlbGVjdGlvblJhbmdlKHRoaXMub3B0aW9ucy5vd25lckRvY3VtZW50KSk7XG4gICAgICAgICAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgIGNsZWFudXBKdXN0aWZ5RGl2RnJhZ21lbnRzLmNhbGwodGhpcywgTWVkaXVtRWRpdG9yLnV0aWwuZ2V0VG9wQmxvY2tDb250YWluZXIocGFyZW50Tm9kZSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgY21kVmFsdWVBcmd1bWVudCA9IG9wdHMgJiYgb3B0cy52YWx1ZTtcbiAgICAgICAgcmV0dXJuIHRoaXMub3B0aW9ucy5vd25lckRvY3VtZW50LmV4ZWNDb21tYW5kKGFjdGlvbiwgZmFsc2UsIGNtZFZhbHVlQXJndW1lbnQpO1xuICAgIH1cblxuICAgIC8qIElmIHdlJ3ZlIGp1c3QganVzdGlmaWVkIHRleHQgd2l0aGluIGEgY29udGFpbmVyIGJsb2NrXG4gICAgICogQ2hyb21lIG1heSBoYXZlIHJlbW92ZWQgPGJyPiBlbGVtZW50cyBhbmQgaW5zdGVhZCB3cmFwcGVkIGxpbmVzIGluIDxkaXY+IGVsZW1lbnRzXG4gICAgICogd2l0aCBhIHRleHQtYWxpZ24gcHJvcGVydHkuICBJZiBzbywgd2Ugd2FudCB0byBmaXggdGhpc1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNsZWFudXBKdXN0aWZ5RGl2RnJhZ21lbnRzKGJsb2NrQ29udGFpbmVyKSB7XG4gICAgICAgIGlmICghYmxvY2tDb250YWluZXIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB0ZXh0QWxpZ24sXG4gICAgICAgICAgICBjaGlsZERpdnMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChibG9ja0NvbnRhaW5lci5jaGlsZE5vZGVzKS5maWx0ZXIoZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgaXNEaXYgPSBlbGVtZW50Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdkaXYnO1xuICAgICAgICAgICAgICAgIGlmIChpc0RpdiAmJiAhdGV4dEFsaWduKSB7XG4gICAgICAgICAgICAgICAgICAgIHRleHRBbGlnbiA9IGVsZW1lbnQuc3R5bGUudGV4dEFsaWduO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gaXNEaXY7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvKiBJZiB3ZSBmb3VuZCBjaGlsZCA8ZGl2PiBlbGVtZW50cyB3aXRoIHRleHQtYWxpZ24gc3R5bGUgYXR0cmlidXRlc1xuICAgICAgICAgKiB3ZSBzaG91bGQgZml4IHRoaXMgYnk6XG4gICAgICAgICAqXG4gICAgICAgICAqIDEpIFVud3JhcHBpbmcgZWFjaCA8ZGl2PiB3aGljaCBoYXMgYSB0ZXh0LWFsaWduIHN0eWxlXG4gICAgICAgICAqIDIpIEluc2VydCBhIDxicj4gZWxlbWVudCBhZnRlciBlYWNoIHNldCBvZiAndW53cmFwcGVkJyBkaXYgY2hpbGRyZW5cbiAgICAgICAgICogMykgU2V0IHRoZSB0ZXh0LWFsaWduIHN0eWxlIG9mIHRoZSBwYXJlbnQgYmxvY2sgZWxlbWVudFxuICAgICAgICAgKi9cbiAgICAgICAgaWYgKGNoaWxkRGl2cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIFNpbmNlIHdlJ3JlIG11Y2tpbmcgd2l0aCB0aGUgSFRNTCwgcHJlc2VydmUgc2VsZWN0aW9uXG4gICAgICAgICAgICB0aGlzLnNhdmVTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgIGNoaWxkRGl2cy5mb3JFYWNoKGZ1bmN0aW9uIChkaXYpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGl2LnN0eWxlLnRleHRBbGlnbiA9PT0gdGV4dEFsaWduKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsYXN0Q2hpbGQgPSBkaXYubGFzdENoaWxkO1xuICAgICAgICAgICAgICAgICAgICBpZiAobGFzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbnN0ZWFkIG9mIGEgZGl2LCBleHRyYWN0IHRoZSBjaGlsZCBlbGVtZW50cyBhbmQgYWRkIGEgPGJyPlxuICAgICAgICAgICAgICAgICAgICAgICAgTWVkaXVtRWRpdG9yLnV0aWwudW53cmFwKGRpdiwgdGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGJyID0gdGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnQlInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RDaGlsZC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShiciwgbGFzdENoaWxkLm5leHRTaWJsaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICAgICAgYmxvY2tDb250YWluZXIuc3R5bGUudGV4dEFsaWduID0gdGV4dEFsaWduO1xuICAgICAgICAgICAgLy8gV2UncmUgZG9uZSwgc28gcmVzdG9yZSBzZWxlY3Rpb25cbiAgICAgICAgICAgIHRoaXMucmVzdG9yZVNlbGVjdGlvbigpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGluaXRpYWxDb250ZW50ID0ge307XG5cbiAgICBNZWRpdW1FZGl0b3IucHJvdG90eXBlID0ge1xuICAgICAgICAvLyBOT1QgRE9DVU1FTlRFRCAtIGV4cG9zZWQgZm9yIGJhY2t3YXJkcyBjb21wYXRhYmlsaXR5XG4gICAgICAgIGluaXQ6IGZ1bmN0aW9uIChlbGVtZW50cywgb3B0aW9ucykge1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zID0gbWVyZ2VPcHRpb25zLmNhbGwodGhpcywgdGhpcy5kZWZhdWx0cywgb3B0aW9ucyk7XG4gICAgICAgICAgICB0aGlzLm9yaWdFbGVtZW50cyA9IGVsZW1lbnRzO1xuXG4gICAgICAgICAgICBpZiAoIXRoaXMub3B0aW9ucy5lbGVtZW50c0NvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5lbGVtZW50c0NvbnRhaW5lciA9IHRoaXMub3B0aW9ucy5vd25lckRvY3VtZW50LmJvZHk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNldHVwKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2V0dXA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhZGRUb0VkaXRvcnMuY2FsbCh0aGlzLCB0aGlzLm9wdGlvbnMuY29udGVudFdpbmRvdyk7XG4gICAgICAgICAgICB0aGlzLmV2ZW50cyA9IG5ldyBNZWRpdW1FZGl0b3IuRXZlbnRzKHRoaXMpO1xuICAgICAgICAgICAgdGhpcy5lbGVtZW50cyA9IFtdO1xuXG4gICAgICAgICAgICB0aGlzLmFkZEVsZW1lbnRzKHRoaXMub3JpZ0VsZW1lbnRzKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuZWxlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmlzQWN0aXZlID0gdHJ1ZTtcblxuICAgICAgICAgICAgLy8gQ2FsbCBpbml0aWFsaXphdGlvbiBoZWxwZXJzXG4gICAgICAgICAgICBpbml0RXh0ZW5zaW9ucy5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgYXR0YWNoSGFuZGxlcnMuY2FsbCh0aGlzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBkZXN0cm95OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcblxuICAgICAgICAgICAgdGhpcy5leHRlbnNpb25zLmZvckVhY2goZnVuY3Rpb24gKGV4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZXh0ZW5zaW9uLmRlc3Ryb3kgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCB0aGlzKTtcblxuICAgICAgICAgICAgdGhpcy5ldmVudHMuZGVzdHJveSgpO1xuXG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBSZXNldCBlbGVtZW50cyBjb250ZW50LCBmaXggZm9yIGlzc3VlIHdoZXJlIGFmdGVyIGVkaXRvciBkZXN0cm95ZWQgdGhlIHJlZCB1bmRlcmxpbmVzIG9uIHNwZWxsaW5nIGVycm9ycyBhcmUgbGVmdFxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuc3BlbGxjaGVjaykge1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmlubmVySFRNTCA9IGVsZW1lbnQuaW5uZXJIVE1MO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGNsZWFudXAgZXh0cmEgYWRkZWQgYXR0cmlidXRlc1xuICAgICAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKCdjb250ZW50RWRpdGFibGUnKTtcbiAgICAgICAgICAgICAgICBlbGVtZW50LnJlbW92ZUF0dHJpYnV0ZSgnc3BlbGxjaGVjaycpO1xuICAgICAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKCdkYXRhLW1lZGl1bS1lZGl0b3ItZWxlbWVudCcpO1xuICAgICAgICAgICAgICAgIGVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZSgnbWVkaXVtLWVkaXRvci1lbGVtZW50Jyk7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoJ3JvbGUnKTtcbiAgICAgICAgICAgICAgICBlbGVtZW50LnJlbW92ZUF0dHJpYnV0ZSgnYXJpYS1tdWx0aWxpbmUnKTtcbiAgICAgICAgICAgICAgICBlbGVtZW50LnJlbW92ZUF0dHJpYnV0ZSgnbWVkaXVtLWVkaXRvci1pbmRleCcpO1xuICAgICAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKCdkYXRhLW1lZGl1bS1lZGl0b3ItZWRpdG9yLWluZGV4Jyk7XG5cbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgYW55IGVsZW1lbnRzIGNyZWF0ZWQgZm9yIHRleHRhcmVhc1xuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmdldEF0dHJpYnV0ZSgnbWVkaXVtLWVkaXRvci10ZXh0YXJlYS1pZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFudXBUZXh0YXJlYUVsZW1lbnQoZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRzID0gW107XG4gICAgICAgICAgICB0aGlzLmluc3RhbmNlSGFuZGxlRWRpdGFibGVLZXlkb3duRW50ZXIgPSBudWxsO1xuICAgICAgICAgICAgdGhpcy5pbnN0YW5jZUhhbmRsZUVkaXRhYmxlSW5wdXQgPSBudWxsO1xuXG4gICAgICAgICAgICByZW1vdmVGcm9tRWRpdG9ycy5jYWxsKHRoaXMsIHRoaXMub3B0aW9ucy5jb250ZW50V2luZG93KTtcbiAgICAgICAgfSxcblxuICAgICAgICBvbjogZnVuY3Rpb24gKHRhcmdldCwgZXZlbnQsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKSB7XG4gICAgICAgICAgICB0aGlzLmV2ZW50cy5hdHRhY2hET01FdmVudCh0YXJnZXQsIGV2ZW50LCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSk7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9mZjogZnVuY3Rpb24gKHRhcmdldCwgZXZlbnQsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKSB7XG4gICAgICAgICAgICB0aGlzLmV2ZW50cy5kZXRhY2hET01FdmVudCh0YXJnZXQsIGV2ZW50LCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSk7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIHN1YnNjcmliZTogZnVuY3Rpb24gKGV2ZW50LCBsaXN0ZW5lcikge1xuICAgICAgICAgICAgdGhpcy5ldmVudHMuYXR0YWNoQ3VzdG9tRXZlbnQoZXZlbnQsIGxpc3RlbmVyKTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdW5zdWJzY3JpYmU6IGZ1bmN0aW9uIChldmVudCwgbGlzdGVuZXIpIHtcbiAgICAgICAgICAgIHRoaXMuZXZlbnRzLmRldGFjaEN1c3RvbUV2ZW50KGV2ZW50LCBsaXN0ZW5lcik7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIHRyaWdnZXI6IGZ1bmN0aW9uIChuYW1lLCBkYXRhLCBlZGl0YWJsZSkge1xuICAgICAgICAgICAgdGhpcy5ldmVudHMudHJpZ2dlckN1c3RvbUV2ZW50KG5hbWUsIGRhdGEsIGVkaXRhYmxlKTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGVsYXk6IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChzZWxmLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgdGhpcy5vcHRpb25zLmRlbGF5KTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZXJpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBpLFxuICAgICAgICAgICAgICAgIGVsZW1lbnRpZCxcbiAgICAgICAgICAgICAgICBjb250ZW50ID0ge30sXG4gICAgICAgICAgICAgICAgbGVuID0gdGhpcy5lbGVtZW50cy5sZW5ndGg7XG5cbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgIGVsZW1lbnRpZCA9ICh0aGlzLmVsZW1lbnRzW2ldLmlkICE9PSAnJykgPyB0aGlzLmVsZW1lbnRzW2ldLmlkIDogJ2VsZW1lbnQtJyArIGk7XG4gICAgICAgICAgICAgICAgY29udGVudFtlbGVtZW50aWRdID0ge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdGhpcy5lbGVtZW50c1tpXS5pbm5lckhUTUwudHJpbSgpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBjb250ZW50O1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldEV4dGVuc2lvbkJ5TmFtZTogZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgIHZhciBleHRlbnNpb247XG4gICAgICAgICAgICBpZiAodGhpcy5leHRlbnNpb25zICYmIHRoaXMuZXh0ZW5zaW9ucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmV4dGVuc2lvbnMuc29tZShmdW5jdGlvbiAoZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChleHQubmFtZSA9PT0gbmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uID0gZXh0O1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGV4dGVuc2lvbjtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogTk9UIERPQ1VNRU5URUQgLSBleHBvc2VkIGFzIGEgaGVscGVyIGZvciBvdGhlciBleHRlbnNpb25zIHRvIHVzZVxuICAgICAgICAgKi9cbiAgICAgICAgYWRkQnVpbHRJbkV4dGVuc2lvbjogZnVuY3Rpb24gKG5hbWUsIG9wdHMpIHtcbiAgICAgICAgICAgIHZhciBleHRlbnNpb24gPSB0aGlzLmdldEV4dGVuc2lvbkJ5TmFtZShuYW1lKSxcbiAgICAgICAgICAgICAgICBtZXJnZWQ7XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4dGVuc2lvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3dpdGNoIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnYW5jaG9yJzpcbiAgICAgICAgICAgICAgICAgICAgbWVyZ2VkID0gTWVkaXVtRWRpdG9yLnV0aWwuZXh0ZW5kKHt9LCB0aGlzLm9wdGlvbnMuYW5jaG9yLCBvcHRzKTtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uID0gbmV3IE1lZGl1bUVkaXRvci5leHRlbnNpb25zLmFuY2hvcihtZXJnZWQpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdhbmNob3ItcHJldmlldyc6XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbiA9IG5ldyBNZWRpdW1FZGl0b3IuZXh0ZW5zaW9ucy5hbmNob3JQcmV2aWV3KHRoaXMub3B0aW9ucy5hbmNob3JQcmV2aWV3KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnYXV0b0xpbmsnOlxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24gPSBuZXcgTWVkaXVtRWRpdG9yLmV4dGVuc2lvbnMuYXV0b0xpbmsoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnZmlsZURyYWdnaW5nJzpcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uID0gbmV3IE1lZGl1bUVkaXRvci5leHRlbnNpb25zLmZpbGVEcmFnZ2luZyhvcHRzKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnZm9udG5hbWUnOlxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24gPSBuZXcgTWVkaXVtRWRpdG9yLmV4dGVuc2lvbnMuZm9udE5hbWUodGhpcy5vcHRpb25zLmZvbnROYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnZm9udHNpemUnOlxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24gPSBuZXcgTWVkaXVtRWRpdG9yLmV4dGVuc2lvbnMuZm9udFNpemUob3B0cyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2tleWJvYXJkQ29tbWFuZHMnOlxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24gPSBuZXcgTWVkaXVtRWRpdG9yLmV4dGVuc2lvbnMua2V5Ym9hcmRDb21tYW5kcyh0aGlzLm9wdGlvbnMua2V5Ym9hcmRDb21tYW5kcyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Bhc3RlJzpcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uID0gbmV3IE1lZGl1bUVkaXRvci5leHRlbnNpb25zLnBhc3RlKHRoaXMub3B0aW9ucy5wYXN0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3BsYWNlaG9sZGVyJzpcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uID0gbmV3IE1lZGl1bUVkaXRvci5leHRlbnNpb25zLnBsYWNlaG9sZGVyKHRoaXMub3B0aW9ucy5wbGFjZWhvbGRlcik7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIC8vIEFsbCBvZiB0aGUgYnVpbHQtaW4gYnV0dG9ucyBmb3IgTWVkaXVtRWRpdG9yIGFyZSBleHRlbnNpb25zXG4gICAgICAgICAgICAgICAgICAgIC8vIHNvIGNoZWNrIHRvIHNlZSBpZiB0aGUgZXh0ZW5zaW9uIHdlJ3JlIGNyZWF0aW5nIGlzIGEgYnVpbHQtaW4gYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIGlmIChNZWRpdW1FZGl0b3IuZXh0ZW5zaW9ucy5idXR0b24uaXNCdWlsdEluQnV0dG9uKG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lcmdlZCA9IE1lZGl1bUVkaXRvci51dGlsLmRlZmF1bHRzKHt9LCBvcHRzLCBNZWRpdW1FZGl0b3IuZXh0ZW5zaW9ucy5idXR0b24ucHJvdG90eXBlLmRlZmF1bHRzW25hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb24gPSBuZXcgTWVkaXVtRWRpdG9yLmV4dGVuc2lvbnMuYnV0dG9uKG1lcmdlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbiA9IG5ldyBNZWRpdW1FZGl0b3IuZXh0ZW5zaW9ucy5idXR0b24obmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgIHRoaXMuZXh0ZW5zaW9ucy5wdXNoKGluaXRFeHRlbnNpb24oZXh0ZW5zaW9uLCBuYW1lLCB0aGlzKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBleHRlbnNpb247XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3RvcFNlbGVjdGlvblVwZGF0ZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMucHJldmVudFNlbGVjdGlvblVwZGF0ZXMgPSB0cnVlO1xuICAgICAgICB9LFxuXG4gICAgICAgIHN0YXJ0U2VsZWN0aW9uVXBkYXRlczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5wcmV2ZW50U2VsZWN0aW9uVXBkYXRlcyA9IGZhbHNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNoZWNrU2VsZWN0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgdG9vbGJhciA9IHRoaXMuZ2V0RXh0ZW5zaW9uQnlOYW1lKCd0b29sYmFyJyk7XG4gICAgICAgICAgICBpZiAodG9vbGJhcikge1xuICAgICAgICAgICAgICAgIHRvb2xiYXIuY2hlY2tTdGF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gV3JhcHBlciBhcm91bmQgZG9jdW1lbnQucXVlcnlDb21tYW5kU3RhdGUgZm9yIGNoZWNraW5nIHdoZXRoZXIgYW4gYWN0aW9uIGhhcyBhbHJlYWR5XG4gICAgICAgIC8vIGJlZW4gYXBwbGllZCB0byB0aGUgY3VycmVudCBzZWxlY3Rpb25cbiAgICAgICAgcXVlcnlDb21tYW5kU3RhdGU6IGZ1bmN0aW9uIChhY3Rpb24pIHtcbiAgICAgICAgICAgIHZhciBmdWxsQWN0aW9uID0gL15mdWxsLSguKykkL2dpLFxuICAgICAgICAgICAgICAgIG1hdGNoLFxuICAgICAgICAgICAgICAgIHF1ZXJ5U3RhdGUgPSBudWxsO1xuXG4gICAgICAgICAgICAvLyBBY3Rpb25zIHN0YXJ0aW5nIHdpdGggJ2Z1bGwtJyBuZWVkIHRvIGJlIG1vZGlmaWVkIHNpbmNlIHRoaXMgaXMgYSBtZWRpdW0tZWRpdG9yIGNvbmNlcHRcbiAgICAgICAgICAgIG1hdGNoID0gZnVsbEFjdGlvbi5leGVjKGFjdGlvbik7XG4gICAgICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgICAgICBhY3Rpb24gPSBtYXRjaFsxXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBxdWVyeVN0YXRlID0gdGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQucXVlcnlDb21tYW5kU3RhdGUoYWN0aW9uKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGV4Yykge1xuICAgICAgICAgICAgICAgIHF1ZXJ5U3RhdGUgPSBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcXVlcnlTdGF0ZTtcbiAgICAgICAgfSxcblxuICAgICAgICBleGVjQWN0aW9uOiBmdW5jdGlvbiAoYWN0aW9uLCBvcHRzKSB7XG4gICAgICAgICAgICAvKmpzbGludCByZWdleHA6IHRydWUqL1xuICAgICAgICAgICAgdmFyIGZ1bGxBY3Rpb24gPSAvXmZ1bGwtKC4rKSQvZ2ksXG4gICAgICAgICAgICAgICAgbWF0Y2gsXG4gICAgICAgICAgICAgICAgcmVzdWx0O1xuICAgICAgICAgICAgLypqc2xpbnQgcmVnZXhwOiBmYWxzZSovXG5cbiAgICAgICAgICAgIC8vIEFjdGlvbnMgc3RhcnRpbmcgd2l0aCAnZnVsbC0nIHNob3VsZCBiZSBhcHBsaWVkIHRvIHRvIHRoZSBlbnRpcmUgY29udGVudHMgb2YgdGhlIGVkaXRhYmxlIGVsZW1lbnRcbiAgICAgICAgICAgIC8vIChpZSBmdWxsLWJvbGQsIGZ1bGwtYXBwZW5kLXByZSwgZXRjLilcbiAgICAgICAgICAgIG1hdGNoID0gZnVsbEFjdGlvbi5leGVjKGFjdGlvbik7XG4gICAgICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgICAgICAvLyBTdG9yZSB0aGUgY3VycmVudCBzZWxlY3Rpb24gdG8gYmUgcmVzdG9yZWQgYWZ0ZXIgYXBwbHlpbmcgdGhlIGFjdGlvblxuICAgICAgICAgICAgICAgIHRoaXMuc2F2ZVNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgIC8vIFNlbGVjdCBhbGwgb2YgdGhlIGNvbnRlbnRzIGJlZm9yZSBjYWxsaW5nIHRoZSBhY3Rpb25cbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdEFsbENvbnRlbnRzKCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZXhlY0FjdGlvbkludGVybmFsLmNhbGwodGhpcywgbWF0Y2hbMV0sIG9wdHMpO1xuICAgICAgICAgICAgICAgIC8vIFJlc3RvcmUgdGhlIHByZXZpb3VzIHNlbGVjdGlvblxuICAgICAgICAgICAgICAgIHRoaXMucmVzdG9yZVNlbGVjdGlvbigpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBleGVjQWN0aW9uSW50ZXJuYWwuY2FsbCh0aGlzLCBhY3Rpb24sIG9wdHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBkbyBzb21lIERPTSBjbGVhbi11cCBmb3Iga25vd24gYnJvd3NlciBpc3N1ZXMgYWZ0ZXIgdGhlIGFjdGlvblxuICAgICAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ2luc2VydHVub3JkZXJlZGxpc3QnIHx8IGFjdGlvbiA9PT0gJ2luc2VydG9yZGVyZWRsaXN0Jykge1xuICAgICAgICAgICAgICAgIE1lZGl1bUVkaXRvci51dGlsLmNsZWFuTGlzdERPTSh0aGlzLm9wdGlvbnMub3duZXJEb2N1bWVudCwgdGhpcy5nZXRTZWxlY3RlZFBhcmVudEVsZW1lbnQoKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuY2hlY2tTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0U2VsZWN0ZWRQYXJlbnRFbGVtZW50OiBmdW5jdGlvbiAocmFuZ2UpIHtcbiAgICAgICAgICAgIGlmIChyYW5nZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcmFuZ2UgPSB0aGlzLm9wdGlvbnMuY29udGVudFdpbmRvdy5nZXRTZWxlY3Rpb24oKS5nZXRSYW5nZUF0KDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIE1lZGl1bUVkaXRvci5zZWxlY3Rpb24uZ2V0U2VsZWN0ZWRQYXJlbnRFbGVtZW50KHJhbmdlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZWxlY3RBbGxDb250ZW50czogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGN1cnJOb2RlID0gTWVkaXVtRWRpdG9yLnNlbGVjdGlvbi5nZXRTZWxlY3Rpb25FbGVtZW50KHRoaXMub3B0aW9ucy5jb250ZW50V2luZG93KTtcblxuICAgICAgICAgICAgaWYgKGN1cnJOb2RlKSB7XG4gICAgICAgICAgICAgICAgLy8gTW92ZSB0byB0aGUgbG93ZXN0IGRlc2NlbmRhbnQgbm9kZSB0aGF0IHN0aWxsIHNlbGVjdHMgYWxsIG9mIHRoZSBjb250ZW50c1xuICAgICAgICAgICAgICAgIHdoaWxlIChjdXJyTm9kZS5jaGlsZHJlbi5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgY3Vyck5vZGUgPSBjdXJyTm9kZS5jaGlsZHJlblswXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdEVsZW1lbnQoY3Vyck5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIHNlbGVjdEVsZW1lbnQ6IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgICAgICBNZWRpdW1FZGl0b3Iuc2VsZWN0aW9uLnNlbGVjdE5vZGUoZWxlbWVudCwgdGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQpO1xuXG4gICAgICAgICAgICB2YXIgc2VsRWxlbWVudCA9IE1lZGl1bUVkaXRvci5zZWxlY3Rpb24uZ2V0U2VsZWN0aW9uRWxlbWVudCh0aGlzLm9wdGlvbnMuY29udGVudFdpbmRvdyk7XG4gICAgICAgICAgICBpZiAoc2VsRWxlbWVudCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZXZlbnRzLmZvY3VzRWxlbWVudChzZWxFbGVtZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBnZXRGb2N1c2VkRWxlbWVudDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGZvY3VzZWQ7XG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRzLnNvbWUoZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBGaW5kIHRoZSBlbGVtZW50IHRoYXQgaGFzIGZvY3VzXG4gICAgICAgICAgICAgICAgaWYgKCFmb2N1c2VkICYmIGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLW1lZGl1bS1mb2N1c2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9jdXNlZCA9IGVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gYmFpbCBpZiB3ZSBmb3VuZCB0aGUgZWxlbWVudCB0aGF0IGhhZCBmb2N1c1xuICAgICAgICAgICAgICAgIHJldHVybiAhIWZvY3VzZWQ7XG4gICAgICAgICAgICB9LCB0aGlzKTtcblxuICAgICAgICAgICAgcmV0dXJuIGZvY3VzZWQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gRXhwb3J0IHRoZSBzdGF0ZSBvZiB0aGUgc2VsZWN0aW9uIGluIHJlc3BlY3QgdG8gb25lIG9mIHRoaXNcbiAgICAgICAgLy8gaW5zdGFuY2Ugb2YgTWVkaXVtRWRpdG9yJ3MgZWxlbWVudHNcbiAgICAgICAgZXhwb3J0U2VsZWN0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgc2VsZWN0aW9uRWxlbWVudCA9IE1lZGl1bUVkaXRvci5zZWxlY3Rpb24uZ2V0U2VsZWN0aW9uRWxlbWVudCh0aGlzLm9wdGlvbnMuY29udGVudFdpbmRvdyksXG4gICAgICAgICAgICAgICAgZWRpdGFibGVFbGVtZW50SW5kZXggPSB0aGlzLmVsZW1lbnRzLmluZGV4T2Yoc2VsZWN0aW9uRWxlbWVudCksXG4gICAgICAgICAgICAgICAgc2VsZWN0aW9uU3RhdGUgPSBudWxsO1xuXG4gICAgICAgICAgICBpZiAoZWRpdGFibGVFbGVtZW50SW5kZXggPj0gMCkge1xuICAgICAgICAgICAgICAgIHNlbGVjdGlvblN0YXRlID0gTWVkaXVtRWRpdG9yLnNlbGVjdGlvbi5leHBvcnRTZWxlY3Rpb24oc2VsZWN0aW9uRWxlbWVudCwgdGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc2VsZWN0aW9uU3RhdGUgIT09IG51bGwgJiYgZWRpdGFibGVFbGVtZW50SW5kZXggIT09IDApIHtcbiAgICAgICAgICAgICAgICBzZWxlY3Rpb25TdGF0ZS5lZGl0YWJsZUVsZW1lbnRJbmRleCA9IGVkaXRhYmxlRWxlbWVudEluZGV4O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gc2VsZWN0aW9uU3RhdGU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2F2ZVNlbGVjdGlvbjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25TdGF0ZSA9IHRoaXMuZXhwb3J0U2VsZWN0aW9uKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8gUmVzdG9yZSBhIHNlbGVjdGlvbiBiYXNlZCBvbiBhIHNlbGVjdGlvblN0YXRlIHJldHVybmVkIGJ5IGEgY2FsbFxuICAgICAgICAvLyB0byBNZWRpdW1FZGl0b3IuZXhwb3J0U2VsZWN0aW9uXG4gICAgICAgIGltcG9ydFNlbGVjdGlvbjogZnVuY3Rpb24gKHNlbGVjdGlvblN0YXRlLCBmYXZvckxhdGVyU2VsZWN0aW9uQW5jaG9yKSB7XG4gICAgICAgICAgICBpZiAoIXNlbGVjdGlvblN0YXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZWRpdGFibGVFbGVtZW50ID0gdGhpcy5lbGVtZW50c1tzZWxlY3Rpb25TdGF0ZS5lZGl0YWJsZUVsZW1lbnRJbmRleCB8fCAwXTtcbiAgICAgICAgICAgIE1lZGl1bUVkaXRvci5zZWxlY3Rpb24uaW1wb3J0U2VsZWN0aW9uKHNlbGVjdGlvblN0YXRlLCBlZGl0YWJsZUVsZW1lbnQsIHRoaXMub3B0aW9ucy5vd25lckRvY3VtZW50LCBmYXZvckxhdGVyU2VsZWN0aW9uQW5jaG9yKTtcbiAgICAgICAgfSxcblxuICAgICAgICByZXN0b3JlU2VsZWN0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmltcG9ydFNlbGVjdGlvbih0aGlzLnNlbGVjdGlvblN0YXRlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjcmVhdGVMaW5rOiBmdW5jdGlvbiAob3B0cykge1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRFZGl0b3IgPSBNZWRpdW1FZGl0b3Iuc2VsZWN0aW9uLmdldFNlbGVjdGlvbkVsZW1lbnQodGhpcy5vcHRpb25zLmNvbnRlbnRXaW5kb3cpLFxuICAgICAgICAgICAgICAgIGN1c3RvbUV2ZW50ID0ge30sXG4gICAgICAgICAgICAgICAgdGFyZ2V0VXJsO1xuXG4gICAgICAgICAgICAvLyBNYWtlIHN1cmUgdGhlIHNlbGVjdGlvbiBpcyB3aXRoaW4gYW4gZWxlbWVudCB0aGlzIGVkaXRvciBpcyB0cmFja2luZ1xuICAgICAgICAgICAgaWYgKHRoaXMuZWxlbWVudHMuaW5kZXhPZihjdXJyZW50RWRpdG9yKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ldmVudHMuZGlzYWJsZUN1c3RvbUV2ZW50KCdlZGl0YWJsZUlucHV0Jyk7XG4gICAgICAgICAgICAgICAgLy8gVE9ETzogRGVwcmVjYXRlIHN1cHBvcnQgZm9yIG9wdHMudXJsIGluIDYuMC4wXG4gICAgICAgICAgICAgICAgaWYgKG9wdHMudXJsKSB7XG4gICAgICAgICAgICAgICAgICAgIE1lZGl1bUVkaXRvci51dGlsLmRlcHJlY2F0ZWQoJy51cmwgb3B0aW9uIGZvciBjcmVhdGVMaW5rJywgJy52YWx1ZScsICc2LjAuMCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0YXJnZXRVcmwgPSBvcHRzLnVybCB8fCBvcHRzLnZhbHVlO1xuICAgICAgICAgICAgICAgIGlmICh0YXJnZXRVcmwgJiYgdGFyZ2V0VXJsLnRyaW0oKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjdXJyZW50U2VsZWN0aW9uID0gdGhpcy5vcHRpb25zLmNvbnRlbnRXaW5kb3cuZ2V0U2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50U2VsZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY3VyclJhbmdlID0gY3VycmVudFNlbGVjdGlvbi5nZXRSYW5nZUF0KDApLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1vbkFuY2VzdG9yQ29udGFpbmVyID0gY3VyclJhbmdlLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydGVkU2VsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0Q29udGFpbmVyUGFyZW50RWxlbWVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmRDb250YWluZXJQYXJlbnRFbGVtZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHROb2RlcztcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIHNlbGVjdGlvbiBpcyBjb250YWluZWQgd2l0aGluIGEgc2luZ2xlIHRleHQgbm9kZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYW5kIHRoZSBzZWxlY3Rpb24gc3RhcnRzIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHRleHQgbm9kZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1TSUUgc3RpbGwgc2F5cyB0aGUgc3RhcnRDb250YWluZXIgaXMgdGhlIHBhcmVudCBvZiB0aGUgdGV4dCBub2RlLlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIHNlbGVjdGlvbiBpcyBjb250YWluZWQgd2l0aGluIGEgc2luZ2xlIHRleHQgbm9kZSwgd2VcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdhbnQgdG8ganVzdCB1c2UgdGhlIGRlZmF1bHQgYnJvd3NlciAnY3JlYXRlTGluaycsIHNvIHdlIG5lZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRvIGFjY291bnQgZm9yIHRoaXMgY2FzZSBhbmQgYWRqdXN0IHRoZSBjb21tb25BbmNlc3RvckNvbnRhaW5lciBhY2NvcmRpbmdseVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJSYW5nZS5lbmRDb250YWluZXIubm9kZVR5cGUgPT09IDMgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyUmFuZ2Uuc3RhcnRDb250YWluZXIubm9kZVR5cGUgIT09IDMgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyUmFuZ2Uuc3RhcnRPZmZzZXQgPT09IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyUmFuZ2Uuc3RhcnRDb250YWluZXIuZmlyc3RDaGlsZCA9PT0gY3VyclJhbmdlLmVuZENvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1vbkFuY2VzdG9yQ29udGFpbmVyID0gY3VyclJhbmdlLmVuZENvbnRhaW5lcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnRDb250YWluZXJQYXJlbnRFbGVtZW50ID0gTWVkaXVtRWRpdG9yLnV0aWwuZ2V0Q2xvc2VzdEJsb2NrQ29udGFpbmVyKGN1cnJSYW5nZS5zdGFydENvbnRhaW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbmRDb250YWluZXJQYXJlbnRFbGVtZW50ID0gTWVkaXVtRWRpdG9yLnV0aWwuZ2V0Q2xvc2VzdEJsb2NrQ29udGFpbmVyKGN1cnJSYW5nZS5lbmRDb250YWluZXIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGUgc2VsZWN0aW9uIGlzIG5vdCBjb250YWluZWQgd2l0aGluIGEgc2luZ2xlIHRleHQgbm9kZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYnV0IHRoZSBzZWxlY3Rpb24gaXMgY29udGFpbmVkIHdpdGhpbiB0aGUgc2FtZSBibG9jayBlbGVtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB3ZSB3YW50IHRvIG1ha2Ugc3VyZSB3ZSBjcmVhdGUgYSBzaW5nbGUgbGluaywgYW5kIG5vdCBtdWx0aXBsZSBsaW5rc1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2hpY2ggY2FuIGhhcHBlbiB3aXRoIHRoZSBidWlsdCBpbiBicm93c2VyIGZ1bmN0aW9uYWxpdHlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21tb25BbmNlc3RvckNvbnRhaW5lci5ub2RlVHlwZSAhPT0gMyAmJiBjb21tb25BbmNlc3RvckNvbnRhaW5lci50ZXh0Q29udGVudC5sZW5ndGggIT09IDAgJiYgc3RhcnRDb250YWluZXJQYXJlbnRFbGVtZW50ID09PSBlbmRDb250YWluZXJQYXJlbnRFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmVudEVsZW1lbnQgPSAoc3RhcnRDb250YWluZXJQYXJlbnRFbGVtZW50IHx8IGN1cnJlbnRFZGl0b3IpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcmFnbWVudCA9IHRoaXMub3B0aW9ucy5vd25lckRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNpbmNlIHdlIGFyZSBnb2luZyB0byBjcmVhdGUgYSBsaW5rIGZyb20gYW4gZXh0cmFjdGVkIHRleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYmUgc3VyZSB0aGF0IGlmIHdlIGFyZSB1cGRhdGluZyBhIGxpbmssIHdlIHdvbid0IGxldCBhbiBlbXB0eSBsaW5rIGJlaGluZCAoc2VlICM3NTQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gKFdvcmthcm91bmcgZm9yIENocm9tZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmV4ZWNBY3Rpb24oJ3VubGluaycpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0ZWRTZWxlY3Rpb24gPSB0aGlzLmV4cG9ydFNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKHBhcmVudEVsZW1lbnQuY2xvbmVOb2RlKHRydWUpKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50RWRpdG9yID09PSBwYXJlbnRFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdlIGhhdmUgdG8gYXZvaWQgdGhlIGVkaXRvciBpdHNlbGYgYmVpbmcgd2lwZWQgb3V0IHdoZW4gaXQncyB0aGUgb25seSBibG9jayBlbGVtZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBhcyBvdXIgcmVmZXJlbmNlIGluc2lkZSB0aGlzLmVsZW1lbnRzIGdldHMgZGV0YWNoZWQgZnJvbSB0aGUgcGFnZSB3aGVuIGluc2VydEhUTUwgcnVucy5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgd2UganVzdCB1c2UgW3BhcmVudEVsZW1lbnQsIDBdIGFuZCBbcGFyZW50RWxlbWVudCwgcGFyZW50RWxlbWVudC5jaGlsZE5vZGVzLmxlbmd0aF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXMgdGhlIHJhbmdlIGJvdW5kYXJpZXMsIHRoaXMgaGFwcGVucyB3aGVuZXZlciBwYXJlbnRFbGVtZW50ID09PSBjdXJyZW50RWRpdG9yLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgdHJhZGVvZmYgdG8gdGhpcyB3b3JrYXJvdW5kIGlzIHRoYXQgYSBvcnBoYW5lZCB0YWcgY2FuIHNvbWV0aW1lcyBiZSBsZWZ0IGJlaGluZCBhdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGUgZW5kIG9mIHRoZSBlZGl0b3IncyBjb250ZW50LlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJbiBHZWNrbzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXMgYW4gZW1wdHkgPHN0cm9uZz48L3N0cm9uZz4gaWYgcGFyZW50RWxlbWVudC5sYXN0Q2hpbGQgaXMgYSA8c3Ryb25nPiB0YWcuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEluIFdlYktpdDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYW4gaW52ZW50ZWQgPGJyIC8+IHRhZyBhdCB0aGUgZW5kIGluIHRoZSBzYW1lIHNpdHVhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBNZWRpdW1FZGl0b3Iuc2VsZWN0aW9uLnNlbGVjdChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5vd25lckRvY3VtZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50RWxlbWVudC5maXJzdENoaWxkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudEVsZW1lbnQubGFzdENoaWxkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50RWxlbWVudC5sYXN0Q2hpbGQubm9kZVR5cGUgPT09IDMgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50RWxlbWVudC5sYXN0Q2hpbGQubm9kZVZhbHVlLmxlbmd0aCA6IHBhcmVudEVsZW1lbnQubGFzdENoaWxkLmNoaWxkTm9kZXMubGVuZ3RoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTWVkaXVtRWRpdG9yLnNlbGVjdGlvbi5zZWxlY3QoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMub3duZXJEb2N1bWVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudEVsZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50RWxlbWVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudEVsZW1lbnQuY2hpbGROb2Rlcy5sZW5ndGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbW9kaWZpZWRFeHBvcnRlZFNlbGVjdGlvbiA9IHRoaXMuZXhwb3J0U2VsZWN0aW9uKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0Tm9kZXMgPSBNZWRpdW1FZGl0b3IudXRpbC5maW5kT3JDcmVhdGVNYXRjaGluZ1RleHROb2RlcyhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyYWdtZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogZXhwb3J0ZWRTZWxlY3Rpb24uc3RhcnQgLSBtb2RpZmllZEV4cG9ydGVkU2VsZWN0aW9uLnN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kOiBleHBvcnRlZFNlbGVjdGlvbi5lbmQgLSBtb2RpZmllZEV4cG9ydGVkU2VsZWN0aW9uLnN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWRpdGFibGVFbGVtZW50SW5kZXg6IGV4cG9ydGVkU2VsZWN0aW9uLmVkaXRhYmxlRWxlbWVudEluZGV4XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIHRleHROb2RlcyBhcmUgbm90IHByZXNlbnQsIHdoZW4gY2hhbmdpbmcgbGluayBvbiBpbWFnZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBleDogPGE+PGltZyBzcmM9XCJodHRwOi8vaW1hZ2UudGVzdC5jb21cIj48L2E+LCBjaGFuZ2UgZnJhZ21lbnQgdG8gY3VyclJhbmdlLnN0YXJ0Q29udGFpbmVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYW5kIHNldCB0ZXh0Tm9kZXMgYXJyYXkgdG8gW2ltYWdlRWxlbWVudCwgaW1hZ2VFbGVtZW50XVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0ZXh0Tm9kZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyYWdtZW50ID0gdGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZChjb21tb25BbmNlc3RvckNvbnRhaW5lci5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0Tm9kZXMgPSBbZnJhZ21lbnQuZmlyc3RDaGlsZC5maXJzdENoaWxkLCBmcmFnbWVudC5maXJzdENoaWxkLmxhc3RDaGlsZF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlcyB0aGUgbGluayBpbiB0aGUgZG9jdW1lbnQgZnJhZ21lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBNZWRpdW1FZGl0b3IudXRpbC5jcmVhdGVMaW5rKHRoaXMub3B0aW9ucy5vd25lckRvY3VtZW50LCB0ZXh0Tm9kZXMsIHRhcmdldFVybC50cmltKCkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2hyb21lIHRyaW1zIHRoZSBsZWFkaW5nIHdoaXRlc3BhY2VzIHdoZW4gaW5zZXJ0aW5nIEhUTUwsIHdoaWNoIG1lc3NlcyB1cCByZXN0b3JpbmcgdGhlIHNlbGVjdGlvbi5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbGVhZGluZ1doaXRlc3BhY2VzQ291bnQgPSAoZnJhZ21lbnQuZmlyc3RDaGlsZC5pbm5lckhUTUwubWF0Y2goL15cXHMrLykgfHwgWycnXSlbMF0ubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm93IG1vdmUgdGhlIGNyZWF0ZWQgbGluayBiYWNrIGludG8gdGhlIG9yaWdpbmFsIGRvY3VtZW50IGluIGEgd2F5IHRvIHByZXNlcnZlIHVuZG8vcmVkbyBoaXN0b3J5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTWVkaXVtRWRpdG9yLnV0aWwuaW5zZXJ0SFRNTENvbW1hbmQodGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQsIGZyYWdtZW50LmZpcnN0Q2hpbGQuaW5uZXJIVE1MLnJlcGxhY2UoL15cXHMrLywgJycpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnRlZFNlbGVjdGlvbi5zdGFydCAtPSBsZWFkaW5nV2hpdGVzcGFjZXNDb3VudDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnRlZFNlbGVjdGlvbi5lbmQgLT0gbGVhZGluZ1doaXRlc3BhY2VzQ291bnQ7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmltcG9ydFNlbGVjdGlvbihleHBvcnRlZFNlbGVjdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5vd25lckRvY3VtZW50LmV4ZWNDb21tYW5kKCdjcmVhdGVMaW5rJywgZmFsc2UsIHRhcmdldFVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMudGFyZ2V0QmxhbmsgfHwgb3B0cy50YXJnZXQgPT09ICdfYmxhbmsnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTWVkaXVtRWRpdG9yLnV0aWwuc2V0VGFyZ2V0QmxhbmsoTWVkaXVtRWRpdG9yLnNlbGVjdGlvbi5nZXRTZWxlY3Rpb25TdGFydCh0aGlzLm9wdGlvbnMub3duZXJEb2N1bWVudCksIHRhcmdldFVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1lZGl1bUVkaXRvci51dGlsLnJlbW92ZVRhcmdldEJsYW5rKE1lZGl1bUVkaXRvci5zZWxlY3Rpb24uZ2V0U2VsZWN0aW9uU3RhcnQodGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQpLCB0YXJnZXRVcmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0cy5idXR0b25DbGFzcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1lZGl1bUVkaXRvci51dGlsLmFkZENsYXNzVG9BbmNob3JzKE1lZGl1bUVkaXRvci5zZWxlY3Rpb24uZ2V0U2VsZWN0aW9uU3RhcnQodGhpcy5vcHRpb25zLm93bmVyRG9jdW1lbnQpLCBvcHRzLmJ1dHRvbkNsYXNzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBGaXJlIGlucHV0IGV2ZW50IGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSBpZiBhbnlvbmUgd2FzIGxpc3RlbmluZyBkaXJlY3RseSB0byB0aGUgRE9NIGlucHV0IGV2ZW50XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy50YXJnZXRCbGFuayB8fCBvcHRzLnRhcmdldCA9PT0gJ19ibGFuaycgfHwgb3B0cy5idXR0b25DbGFzcykge1xuICAgICAgICAgICAgICAgICAgICBjdXN0b21FdmVudCA9IHRoaXMub3B0aW9ucy5vd25lckRvY3VtZW50LmNyZWF0ZUV2ZW50KCdIVE1MRXZlbnRzJyk7XG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbUV2ZW50LmluaXRFdmVudCgnaW5wdXQnLCB0cnVlLCB0cnVlLCB0aGlzLm9wdGlvbnMuY29udGVudFdpbmRvdyk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB0aGlzLmVsZW1lbnRzLmxlbmd0aDsgaSA8IGxlbjsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnRzW2ldLmRpc3BhdGNoRXZlbnQoY3VzdG9tRXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cy5lbmFibGVDdXN0b21FdmVudCgnZWRpdGFibGVJbnB1dCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRmlyZSBvdXIgY3VzdG9tIGVkaXRhYmxlSW5wdXQgZXZlbnRcbiAgICAgICAgICAgIHRoaXMuZXZlbnRzLnRyaWdnZXJDdXN0b21FdmVudCgnZWRpdGFibGVJbnB1dCcsIGN1c3RvbUV2ZW50LCBjdXJyZW50RWRpdG9yKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjbGVhblBhc3RlOiBmdW5jdGlvbiAodGV4dCkge1xuICAgICAgICAgICAgdGhpcy5nZXRFeHRlbnNpb25CeU5hbWUoJ3Bhc3RlJykuY2xlYW5QYXN0ZSh0ZXh0KTtcbiAgICAgICAgfSxcblxuICAgICAgICBwYXN0ZUhUTUw6IGZ1bmN0aW9uIChodG1sLCBvcHRpb25zKSB7XG4gICAgICAgICAgICB0aGlzLmdldEV4dGVuc2lvbkJ5TmFtZSgncGFzdGUnKS5wYXN0ZUhUTUwoaHRtbCwgb3B0aW9ucyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2V0Q29udGVudDogZnVuY3Rpb24gKGh0bWwsIGluZGV4KSB7XG4gICAgICAgICAgICBpbmRleCA9IGluZGV4IHx8IDA7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmVsZW1lbnRzW2luZGV4XSkge1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXQgPSB0aGlzLmVsZW1lbnRzW2luZGV4XTtcbiAgICAgICAgICAgICAgICB0YXJnZXQuaW5uZXJIVE1MID0gaHRtbDtcbiAgICAgICAgICAgICAgICB0aGlzLmNoZWNrQ29udGVudENoYW5nZWQodGFyZ2V0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBnZXRDb250ZW50OiBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICAgICAgICAgIGluZGV4ID0gaW5kZXggfHwgMDtcblxuICAgICAgICAgICAgaWYgKHRoaXMuZWxlbWVudHNbaW5kZXhdKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZWxlbWVudHNbaW5kZXhdLmlubmVySFRNTC50cmltKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSxcblxuICAgICAgICBjaGVja0NvbnRlbnRDaGFuZ2VkOiBmdW5jdGlvbiAoZWRpdGFibGUpIHtcbiAgICAgICAgICAgIGVkaXRhYmxlID0gZWRpdGFibGUgfHwgTWVkaXVtRWRpdG9yLnNlbGVjdGlvbi5nZXRTZWxlY3Rpb25FbGVtZW50KHRoaXMub3B0aW9ucy5jb250ZW50V2luZG93KTtcbiAgICAgICAgICAgIHRoaXMuZXZlbnRzLnVwZGF0ZUlucHV0KGVkaXRhYmxlLCB7IHRhcmdldDogZWRpdGFibGUsIGN1cnJlbnRUYXJnZXQ6IGVkaXRhYmxlIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIHJlc2V0Q29udGVudDogZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgICAgIC8vIEZvciBhbGwgZWxlbWVudHMgdGhhdCBleGlzdCBpbiB0aGUgdGhpcy5lbGVtZW50cyBhcnJheSwgd2UgY2FuIGFzc3VtZTpcbiAgICAgICAgICAgIC8vIC0gSXRzIGluaXRpYWwgY29udGVudCBoYXMgYmVlbiBzZXQgaW4gdGhlIGluaXRpYWxDb250ZW50IG9iamVjdFxuICAgICAgICAgICAgLy8gLSBJdCBoYXMgYSBtZWRpdW0tZWRpdG9yLWluZGV4IGF0dHJpYnV0ZSB3aGljaCBpcyB0aGUga2V5IHZhbHVlIGluIHRoZSBpbml0aWFsQ29udGVudCBvYmplY3RcblxuICAgICAgICAgICAgaWYgKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5kZXggPSB0aGlzLmVsZW1lbnRzLmluZGV4T2YoZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldENvbnRlbnQoaW5pdGlhbENvbnRlbnRbZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ21lZGl1bS1lZGl0b3ItaW5kZXgnKV0sIGluZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGVsLCBpZHgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldENvbnRlbnQoaW5pdGlhbENvbnRlbnRbZWwuZ2V0QXR0cmlidXRlKCdtZWRpdW0tZWRpdG9yLWluZGV4JyldLCBpZHgpO1xuICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYWRkRWxlbWVudHM6IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgICAgICAgLy8gQ29udmVydCBlbGVtZW50cyBpbnRvIGFuIGFycmF5XG4gICAgICAgICAgICB2YXIgZWxlbWVudHMgPSBjcmVhdGVFbGVtZW50c0FycmF5KHNlbGVjdG9yLCB0aGlzLm9wdGlvbnMub3duZXJEb2N1bWVudCwgdHJ1ZSk7XG5cbiAgICAgICAgICAgIC8vIERvIHdlIGhhdmUgZWxlbWVudHMgdG8gYWRkIG5vdz9cbiAgICAgICAgICAgIGlmIChlbGVtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGVsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGFsbCBuZXcgZWxlbWVudHMgKHdlIGNoZWNrIHRoYXQgaW4gdGhvc2UgZnVuY3Rpb25zIGRvbid0IHdvcnJ5KVxuICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBpbml0RWxlbWVudC5jYWxsKHRoaXMsIGVsZW1lbnQsIHRoaXMuaWQpO1xuXG4gICAgICAgICAgICAgICAgLy8gQWRkIG5ldyBlbGVtZW50cyB0byBvdXIgaW50ZXJuYWwgZWxlbWVudHMgYXJyYXlcbiAgICAgICAgICAgICAgICB0aGlzLmVsZW1lbnRzLnB1c2goZWxlbWVudCk7XG5cbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGV2ZW50IHNvIGV4dGVuc2lvbnMgY2FuIGtub3cgd2hlbiBhbiBlbGVtZW50IGhhcyBiZWVuIGFkZGVkXG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdhZGRFbGVtZW50JywgeyB0YXJnZXQ6IGVsZW1lbnQsIGN1cnJlbnRUYXJnZXQ6IGVsZW1lbnQgfSwgZWxlbWVudCk7XG4gICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgfSxcblxuICAgICAgICByZW1vdmVFbGVtZW50czogZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICAgICAgICAvLyBDb252ZXJ0IGVsZW1lbnRzIGludG8gYW4gYXJyYXlcbiAgICAgICAgICAgIHZhciBlbGVtZW50cyA9IGNyZWF0ZUVsZW1lbnRzQXJyYXkoc2VsZWN0b3IsIHRoaXMub3B0aW9ucy5vd25lckRvY3VtZW50KSxcbiAgICAgICAgICAgICAgICB0b1JlbW92ZSA9IGVsZW1lbnRzLm1hcChmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIHRleHRhcmVhcywgbWFrZSBzdXJlIHdlJ3JlIGxvb2tpbmcgYXQgdGhlIGVkaXRvciBkaXYgYW5kIG5vdCB0aGUgdGV4dGFyZWEgaXRzZWxmXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbC5nZXRBdHRyaWJ1dGUoJ21lZGl1bS1lZGl0b3ItdGV4dGFyZWEtaWQnKSAmJiBlbC5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWwucGFyZW50Tm9kZS5xdWVyeVNlbGVjdG9yKCdkaXZbbWVkaXVtLWVkaXRvci10ZXh0YXJlYS1pZD1cIicgKyBlbC5nZXRBdHRyaWJ1dGUoJ21lZGl1bS1lZGl0b3ItdGV4dGFyZWEtaWQnKSArICdcIl0nKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLmVsZW1lbnRzID0gdGhpcy5lbGVtZW50cy5maWx0ZXIoZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGlzIGlzIGFuIGVsZW1lbnQgd2Ugd2FudCB0byByZW1vdmVcbiAgICAgICAgICAgICAgICBpZiAodG9SZW1vdmUuaW5kZXhPZihlbGVtZW50KSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ldmVudHMuY2xlYW51cEVsZW1lbnQoZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmdldEF0dHJpYnV0ZSgnbWVkaXVtLWVkaXRvci10ZXh0YXJlYS1pZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhbnVwVGV4dGFyZWFFbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgZXZlbnQgc28gZXh0ZW5zaW9ucyBjYW4gY2xlYW4tdXAgZWxlbWVudHMgdGhhdCBhcmUgYmVpbmcgcmVtb3ZlZFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ3JlbW92ZUVsZW1lbnQnLCB7IHRhcmdldDogZWxlbWVudCwgY3VycmVudFRhcmdldDogZWxlbWVudCB9LCBlbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIE1lZGl1bUVkaXRvci5nZXRFZGl0b3JGcm9tRWxlbWVudCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHZhciBpbmRleCA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLW1lZGl1bS1lZGl0b3ItZWRpdG9yLWluZGV4JyksXG4gICAgICAgICAgICB3aW4gPSBlbGVtZW50ICYmIGVsZW1lbnQub3duZXJEb2N1bWVudCAmJiAoZWxlbWVudC5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3IHx8IGVsZW1lbnQub3duZXJEb2N1bWVudC5wYXJlbnRXaW5kb3cpO1xuICAgICAgICBpZiAod2luICYmIHdpbi5fbWVkaXVtRWRpdG9ycyAmJiB3aW4uX21lZGl1bUVkaXRvcnNbaW5kZXhdKSB7XG4gICAgICAgICAgICByZXR1cm4gd2luLl9tZWRpdW1FZGl0b3JzW2luZGV4XTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9O1xufSgpKTtcblxuKGZ1bmN0aW9uICgpIHtcbiAgICAvLyBzdW1tYXJ5OiBUaGUgZGVmYXVsdCBvcHRpb25zIGhhc2ggdXNlZCBieSB0aGUgRWRpdG9yXG5cbiAgICBNZWRpdW1FZGl0b3IucHJvdG90eXBlLmRlZmF1bHRzID0ge1xuICAgICAgICBhY3RpdmVCdXR0b25DbGFzczogJ21lZGl1bS1lZGl0b3ItYnV0dG9uLWFjdGl2ZScsXG4gICAgICAgIGJ1dHRvbkxhYmVsczogZmFsc2UsXG4gICAgICAgIGRlbGF5OiAwLFxuICAgICAgICBkaXNhYmxlUmV0dXJuOiBmYWxzZSxcbiAgICAgICAgZGlzYWJsZURvdWJsZVJldHVybjogZmFsc2UsXG4gICAgICAgIGRpc2FibGVFeHRyYVNwYWNlczogZmFsc2UsXG4gICAgICAgIGRpc2FibGVFZGl0aW5nOiBmYWxzZSxcbiAgICAgICAgYXV0b0xpbms6IGZhbHNlLFxuICAgICAgICBlbGVtZW50c0NvbnRhaW5lcjogZmFsc2UsXG4gICAgICAgIGNvbnRlbnRXaW5kb3c6IHdpbmRvdyxcbiAgICAgICAgb3duZXJEb2N1bWVudDogZG9jdW1lbnQsXG4gICAgICAgIHRhcmdldEJsYW5rOiBmYWxzZSxcbiAgICAgICAgZXh0ZW5zaW9uczoge30sXG4gICAgICAgIHNwZWxsY2hlY2s6IHRydWVcbiAgICB9O1xufSkoKTtcblxuTWVkaXVtRWRpdG9yLnBhcnNlVmVyc2lvblN0cmluZyA9IGZ1bmN0aW9uIChyZWxlYXNlKSB7XG4gICAgdmFyIHNwbGl0ID0gcmVsZWFzZS5zcGxpdCgnLScpLFxuICAgICAgICB2ZXJzaW9uID0gc3BsaXRbMF0uc3BsaXQoJy4nKSxcbiAgICAgICAgcHJlUmVsZWFzZSA9IChzcGxpdC5sZW5ndGggPiAxKSA/IHNwbGl0WzFdIDogJyc7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgbWFqb3I6IHBhcnNlSW50KHZlcnNpb25bMF0sIDEwKSxcbiAgICAgICAgbWlub3I6IHBhcnNlSW50KHZlcnNpb25bMV0sIDEwKSxcbiAgICAgICAgcmV2aXNpb246IHBhcnNlSW50KHZlcnNpb25bMl0sIDEwKSxcbiAgICAgICAgcHJlUmVsZWFzZTogcHJlUmVsZWFzZSxcbiAgICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBbdmVyc2lvblswXSwgdmVyc2lvblsxXSwgdmVyc2lvblsyXV0uam9pbignLicpICsgKHByZVJlbGVhc2UgPyAnLScgKyBwcmVSZWxlYXNlIDogJycpO1xuICAgICAgICB9XG4gICAgfTtcbn07XG5cbk1lZGl1bUVkaXRvci52ZXJzaW9uID0gTWVkaXVtRWRpdG9yLnBhcnNlVmVyc2lvblN0cmluZy5jYWxsKHRoaXMsICh7XG4gICAgLy8gZ3J1bnQtYnVtcCBsb29rcyBmb3IgdGhpczpcbiAgICAndmVyc2lvbic6ICc1LjIzLjInXG59KS52ZXJzaW9uKTtcblxuICAgIHJldHVybiBNZWRpdW1FZGl0b3I7XG59KCkpKTtcblxuXG5cbi8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gV0VCUEFDSyBGT09URVJcbi8vIC4vbm9kZV9tb2R1bGVzL21lZGl1bS1lZGl0b3IvZGlzdC9qcy9tZWRpdW0tZWRpdG9yLmpzXG4vLyBtb2R1bGUgaWQgPSAxNjlcbi8vIG1vZHVsZSBjaHVua3MgPSAyOSAzMCIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG5cblxuXG4vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIFdFQlBBQ0sgRk9PVEVSXG4vLyAuL25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanNcbi8vIG1vZHVsZSBpZCA9IDk3XG4vLyBtb2R1bGUgY2h1bmtzID0gMSAyIDMgMjkgMzAiXSwic291cmNlUm9vdCI6IiJ9