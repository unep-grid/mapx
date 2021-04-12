import {def as opt} from './default.js';

const regCompare = new RegExp(opt.filters.op_compare.join('|') + '+', 'g');
const regLogic = new RegExp(opt.filters.op_logic.join('|') + '+', 'g');
const regNest = new RegExp(opt.filters.op_nest.join('|') + '+', 'g');
const regGroup = new RegExp(
  `\\s+(?=(?:[^\\'"]*[\\'"][^\\'"]*[\\'"])*[^\\'"]*$)`,
  'g'
);

/**
 * Build a minimalist parser to handle simple cases
 * For complete logic, a real parser should be made using
 * a parse generator or a lexer such as peg.js, parsimmon, chevrotain, jison, moo;
 * Goal :
 * - Convert date to unix time
 * - separate filters from text
 */
function parser(str) {

  let text = '';
  let filters = '';
  let filtersArray = [];
  let filtersArrayTemp = [];

  /**
   * split whitespace not within double quote
   * https://stackoverflow.com/questions/9577930
   */
  const groups = str.split(regGroup);
  /**
   * Sanitize :
   * - formated date to unix time
   * - separate text from filters
   */
  for (let group of groups) {
    const res = sanitize(group);
    if (res?.text) {
      text += ` ${res.text}`;
    }
    if (res?.filter) {
      filtersArrayTemp.push(res.filter);
    }
  }

  /**
   * Handle logical operators in filters
   * - Ad default 'AND' if previous token is not
   *   an operator or
   */
  filtersArrayTemp.forEach((filter, i) => {
    const isFirst = i === 0;
    const isLast = i === filtersArrayTemp.length - 1;
    const isFilter = !!filter.match(regCompare);
    const isLog = !!filter.match(regLogic);
    const isNest = !!filter.match(regNest);

    if (isFirst && isLast && (isNest || isLog)) {
      return;
    }
    if (isLog && isLast) {
      return;
    }
    if (isFirst) {
      return filtersArray.push(filter);
    }

    const prevFilter = filtersArray[i - 1];
    const isPrevLog = !!prevFilter.match(regLogic);
    const isPrevNest = !!prevFilter.match(regNest);
    const isPrevIsFilter = !!prevFilter.match(regCompare);

    if (isFilter && isPrevIsFilter && !isPrevLog && !isPrevNest) {
      filtersArray.push('AND');
    }

    filtersArray.push(filter);
  });

  text = text.trim();
  filters = filtersArray.join(' ').trim();
  console.log(text,filters, filtersArray);
  return {text, filters, filtersArray};
}

function sanitize(group) {
  try {
    const isNest = (group.match(regNest) || []).length > 0;
    const isLogic = (group.match(regLogic) || []).length > 0;

    if (isNest || isLogic) {
      return {filter: group};
    }

    const op = (group.match(regCompare) || [])[0];

    if (!op) {
      /**
       * If no operators in group => text
       */
      return {text: group};
    }

    const sub = group.split(op);
    if (sub.length !== 2) {
      /**
       * If not attribute <op> value => text
       */
      return {text: group};
    }
    let attribute = sub[0];
    let value = sub[1];
    if (!value) {
      /**
       * If no value => text
       */
      return {text: group};
    }
    if (opt.filters.date.includes(attribute)) {
      /**
       * If attribute is date, convert.
       */
      value = Math.ceil((new Date(value) * 1) / 1000);
    }

    if (opt.filters.searchable.includes(attribute)) {
      /**
       * Combine filters with previous filter: AND.
       * meili support OR, NOT, a
       */
      return {filter: `${attribute}${op}${value}`};
    }
  } catch (e) {
    console.warn(e);
  }

  return {};
}

export {parser};
