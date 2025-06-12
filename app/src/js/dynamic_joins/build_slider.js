import { el } from "../el_mapx";
import { isNotEmpty } from "../is_test";
import { moduleLoad } from "../modules_loader_async";

export async function buildRangeSlider(options = {}) {
  const noUiSlider = await moduleLoad("nouislider");
  const { elWrapper, config, onBuilt, onUpdate, data } = options;
  const { name, default: defaultValue, min, max, step, mode } = config;

  // auto-detect min/max if not provided
  let actualMin = min;
  let actualMax = max;
  if (min === "auto" || max === "auto") {
    const values = data.map((row) => row[name]).filter(isNotEmpty);

    if (min === "auto") {
      actualMin = Math.min(...values);
    }
    if (max === "auto") {
      actualMax = Math.max(...values);
    }
  }

  const id = `dj_slider_${name}`;
  const elLabel = el("label", { for: id }, name);
  const elSlider = el("div", {
    id,
    style: {
      margin: "10px 0",
      height: "10px",
    },
  });
  const elValues = el("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: "5px",
    },
  });

  elWrapper.classList.add("mx-slider-container");
  elWrapper.appendChild(elLabel);
  elWrapper.appendChild(elSlider);
  elWrapper.appendChild(elValues);

  // create slider
  const slider = noUiSlider.create(elSlider, {
    range: { min: actualMin, max: actualMax },
    step: step || 1,
    start: defaultValue || [actualMin, actualMax],
    connect: true,
    behaviour: "drag",
    tooltips: false,
    format:
      mode === "integer"
        ? {
            to: (value) => Math.round(value),
            from: (value) => Math.round(value),
          }
        : undefined,
  });
  onBuilt(slider, name);

  // intial values to display
  updateValues(slider.get());

  // set up event handlers
  slider.on("update", (values) => {
    updateValues(values);
    const range = values.map((v) =>
      mode === "integer" ? Math.round(parseFloat(v)) : parseFloat(v),
    );
    onUpdate(range, name);
  });

  // update display values
  function updateValues(values) {
    const [min, max] = values.map((v) =>
      mode === "integer" ? Math.round(v) : parseFloat(v).toFixed(2),
    );
    elValues.innerHTML = `<span>${min}</span><span>${max}</span>`;
  }
}
