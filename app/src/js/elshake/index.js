import './style.less';

export function shake(el){
    el.classList.add('el_shake');
    clearTimeout(el._timeout_shake);
    el._timeout_shake = setTimeout(() => {
      el.classList.remove('el_shake');
    }, 820);
}

