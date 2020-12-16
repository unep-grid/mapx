import {create, formatters} from 'jsondiffpatch';
import 'jsondiffpatch/dist/formatters-styles/html.css';

export async function jsonPreview(json, options) {
  const m = import('json-formatter-js');
  const JSONFormatter = m[0].default;
  var formatted = new JSONFormatter(json, options);
  return formatted.render();
}

export async function jsonDiff(a, b, opt) {
  opt = opt || {};
  const instance = create({
    arrays: {
      detectMove: true,
      includeValueOnMove: false
    },
    textDiff: {
      minLength: 60
    },
    propertyFilter:
      opt.propertyFilter instanceof Function ? opt.propertyFilter : null,
    cloneDiffValues: false
  });

  const delta = instance.diff(a, b);

  if (opt.toHTML) {
    formatters.html.hideUnchanged();
    return formatters.html.format(delta, a);
  }
  return delta;
}


/**
 * Performs a deep merge of `source` into `target`.
 * Mutates `target` only but not its objects and arrays.
 *
 * @author inspired by [jhildenbiddle](https://stackoverflow.com/a/48218209).
 */
export function mergeDeep(target, source) {
  const isObject = (obj) => obj && typeof obj === 'object';

  if (!isObject(target) || !isObject(source)) {
    return source;
  }

  Object.keys(source).forEach(key => {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      target[key] = targetValue.concat(sourceValue);
    } else if (isObject(targetValue) && isObject(sourceValue)) {
      target[key] = mergeDeep(Object.assign({}, targetValue), sourceValue);
    } else {
      target[key] = sourceValue;
    }
  });

  return target;
}
