import './style.less';

const types = ['no_way', 'look_at_me'];

const def = {
  type: types[0]
};

export function shake(el, opt) {
  const settings = Object.assign({}, def, opt);
  if (!types.includes(settings.type)) {
    settings.type = types[0];
  }
  el.classList.add('el_shake');
  el.classList.add(settings.type);
  clearTimeout(el._timeout_shake);
  el._timeout_shake = setTimeout(() => {
    el.classList.remove('el_shake');
    el.classList.remove(settings.type);
  }, 820);
}
