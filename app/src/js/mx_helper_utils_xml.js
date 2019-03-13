
/**
 * Parse xml
 * @param {String} xml string
 * @note http://goessner.net/download/prj/jsonxml/
 * @return {DOM}
 */
export function parseXml(xml) {
  var dom = null;
  if (window.DOMParser) {
    try {
      dom = new DOMParser().parseFromString(xml, 'text/xml');
    } catch (e) {
      dom = null;
    }
  } else if (window.ActiveXObject) {
    try {
      dom = new ActiveXObject('Microsoft.XMLDOM');
      dom.async = false;
      if (!dom.loadXML(xml)){
        window.alert(dom.parseError.reason + dom.parseError.srcText);
      }
    } catch (e) {
      dom = null;
    }
  } else{
    alert('cannot parse xml string!');
  }
  return dom;
}

/**
 * Convert json to xml
 * @param {Object} o object to convert
 * @param {Boolean|String} tab or indent character
 * @return {String} xml string
 * @note http://goessner.net/download/prj/jsonxml/
 */
export function json2xml(o, tab) {
  var toXml = function(v, name, ind) {
      var xml = '';
      if (v instanceof Array) {
        for (var i = 0, n = v.length; i < n; i++){
          xml += ind + toXml(v[i], name, ind + '\t') + '\n';
        }
      } else if (typeof v === 'object') {
        var hasChild = false;
        xml += ind + '<' + name;
        for (var x in v) {
          if (x.charAt(0) === '@'){
          xml += ' ' + x.substr(1) + '="' + v[x].toString() + '"';
          }
          else hasChild = true;
        }
        xml += hasChild ? '>' : '/>';
        if (hasChild) {
          for (var m in v) {
            if (m === '#text') xml += v[m];
            else if (m === '#cdata') xml += '<![CDATA[' + v[m] + ']]>';
            else if (m.charAt(0) != '@') xml += toXml(v[m], m, ind + '\t');
          }
          xml +=
            (xml.charAt(xml.length - 1) === '\n' ? ind : '') +
            '</' +
            name +
            '>';
        }
      } else {
        xml += ind + '<' + name + '>' + v.toString() + '</' + name + '>';
      }
      return xml;
    },
    xml = '';
  for (var m in o) xml += toXml(o[m], m, '');
  return tab ? xml.replace(/\t/g, tab) : xml.replace(/\t|\n/g, '');
}

/**
 * Convert xml to json
 * @param {Element|Node} xml to convert
 * @param {Boolean|String} tab or indent character
 * @note http://goessner.net/download/prj/jsonxml/
 */
export function xml2json(xml, tab) {
  var X = {
    toObj: function(xml) {
      var o = {};
      if (xml.nodeType === 1) {
        // element node ..
        if (xml.attributes.length)
          // element with attributes  ..
          for (var i = 0; i < xml.attributes.length; i++)
            o['@' + xml.attributes[i].nodeName] = (
              xml.attributes[i].nodeValue || ''
            ).toString();
        if (xml.firstChild) {
          // element has child nodes ..
          var textChild = 0,
            cdataChild = 0,
            hasElementChild = false;
          for (var n = xml.firstChild; n; n = n.nextSibling) {
            if (n.nodeType === 1) hasElementChild = true;
            else if (n.nodeType === 3 && n.nodeValue.match(/[^ \f\n\r\t\v]/))
              textChild++;
            // non-whitespace text
            else if (n.nodeType === 4) cdataChild++; // cdata section node
          }
          if (hasElementChild) {
            if (textChild < 2 && cdataChild < 2) {
              // structured element with evtl. a single text or/and cdata node ..
              X.removeWhite(xml);
              for (var x = xml.firstChild; x; x = x.nextSibling) {
                if (x.nodeType === 3)
                  // text node
                  o['#text'] = X.escape(x.nodeValue);
                else if (n.nodeType === 4)
                  // cdata node
                  o['#cdata'] = X.escape(x.nodeValue);
                else if (o[x.nodeName]) {
                  // multiple occurence of element ..
                  if (o[x.nodeName] instanceof Array)
                    o[x.nodeName][o[x.nodeName].length] = X.toObj(x);
                  else o[x.nodeName] = [o[x.nodeName], X.toObj(x)];
                } // first occurence of element..
                else o[x.nodeName] = X.toObj(x);
              }
            } else {
              // mixed content
              if (!xml.attributes.length) o = X.escape(X.innerXml(xml));
              else o['#text'] = X.escape(X.innerXml(xml));
            }
          } else if (textChild) {
            // pure text
            if (!xml.attributes.length) o = X.escape(X.innerXml(xml));
            else o['#text'] = X.escape(X.innerXml(xml));
          } else if (cdataChild) {
            // cdata
            if (cdataChild > 1) o = X.escape(X.innerXml(xml));
            else
              for (var p = xml.firstChild; p; p = p.nextSibling)
                o['#cdata'] = X.escape(p.nodeValue);
          }
        }
        if (!xml.attributes.length && !xml.firstChild) o = null;
      } else if (xml.nodeType === 9) {
        // document.node
        o = X.toObj(xml.documentElement);
      } else alert('unhandled node type: ' + xml.nodeType);
      return o;
    },
    toJson: function(o, name, ind) {
      var json = name ? '"' + name + '"' : '';
      if (o instanceof Array) {
        for (var i = 0, n = o.length; i < n; i++)
          o[i] = X.toJson(o[i], '', ind + '\t');
        json +=
          (name ? ':[' : '[') +
          (o.length > 1
            ? '\n' + ind + '\t' + o.join(',\n' + ind + '\t') + '\n' + ind
            : o.join('')) +
          ']';
      } else if (o === null) json += (name && ':') + 'null';
      else if (typeof o === 'object') {
        var arr = [];
        for (var m in o) arr[arr.length] = X.toJson(o[m], m, ind + '\t');
        json +=
          (name ? ':{' : '{') +
          (arr.length > 1
            ? '\n' + ind + '\t' + arr.join(',\n' + ind + '\t') + '\n' + ind
            : arr.join('')) +
          '}';
      } else if (typeof o === 'string')
        json += (name && ':') + '"' + o.toString() + '"';
      else json += (name && ':') + o.toString();
      return json;
    },
    innerXml: function(node) {
      var s = '';
      if ('innerHTML' in node) s = node.innerHTML;
      else {
        var asXml = function(n) {
          var s = '';
          if (n.nodeType === 1) {
            s += '<' + n.nodeName;
            for (var i = 0; i < n.attributes.length; i++)
              s +=
                ' ' +
                n.attributes[i].nodeName +
                '="' +
                (n.attributes[i].nodeValue || '').toString() +
                '"';
            if (n.firstChild) {
              s += '>';
              for (var c = n.firstChild; c; c = c.nextSibling) s += asXml(c);
              s += '</' + n.nodeName + '>';
            } else s += '/>';
          } else if (n.nodeType === 3) s += n.nodeValue;
          else if (n.nodeType === 4) s += '<![CDATA[' + n.nodeValue + ']]>';
          return s;
        };
        for (var c = node.firstChild; c; c = c.nextSibling) s += asXml(c);
      }
      return s;
    },
    escape: function(txt) {
      return txt
        .replace(/[\\]/g, '\\\\')
        .replace(/[\"]/g, '\\"')
        .replace(/[\n]/g, '\\n')
        .replace(/[\r]/g, '\\r');
    },
    removeWhite: function(e) {
      e.normalize();
      for (var n = e.firstChild; n; ) {
        if (n.nodeType === 3) {
          // text node
          if (!n.nodeValue.match(/[^ \f\n\r\t\v]/)) {
            // pure whitespace text node
            var nxt = n.nextSibling;
            e.removeChild(n);
            n = nxt;
          } else n = n.nextSibling;
        } else if (n.nodeType === 1) {
          // element node
          X.removeWhite(n);
          n = n.nextSibling;
        } // any other node
        else n = n.nextSibling;
      }
      return e;
    }
  };
  if (xml.nodeType === 9)
    // document node
    xml = xml.documentElement;
  var json = X.toJson(X.toObj(X.removeWhite(xml)), xml.nodeName, '\t');
  return (
    '{\n' +
    tab +
    (tab ? json.replace(/\t/g, tab) : json.replace(/\t|\n/g, '')) +
    '\n}'
  );
}

