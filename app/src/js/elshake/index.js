import "./style.less";
const types = ["no_way", "look_at_me"];
const DURATION = 820;

export async function shake(element, options = {}) {
  if (!element) throw new Error("Element required");

  const settings = {
    type: types[0],
    ...options,
  };

  if (!types.includes(settings.type)) {
    settings.type = types[0];
  }

  return new Promise((resolve, reject) => {
    try {
      element.classList.add("el_shake", settings.type);
      const timeout = setTimeout(() => {
        element.classList.remove("el_shake", settings.type);
        resolve(true);
      }, DURATION);

      element.dataset.shakeTimeout = timeout;
    } catch (err) {
      reject(err);
    }
  });
}
