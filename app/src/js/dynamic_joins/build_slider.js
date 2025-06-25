import { el } from "../el_mapx";
import { isEmpty, isNotEmpty } from "../is_test";
import { moduleLoad } from "../modules_loader_async";

export async function buildSlider(options = {}) {
  const noUiSlider = await moduleLoad("nouislider");
  const { elWrapper, config, onBuilt, onUpdate, data } = options;
  const {
    name,
    default: defaultValue,
    min,
    max,
    step,
    integer,
    single,
  } = config;

  // auto-detect min/max if not provided
  let actualMin = min;
  let actualMax = max;

  const computeMin = min === "auto" || isEmpty(min);
  const computeMax = max === "auto" || isEmpty(max);

  if (computeMin || computeMax) {
    const values = data.map((row) => row[name]).filter(isNotEmpty);

    if (computeMin) {
      actualMin = Math.min(...values);
    }
    if (computeMax) {
      actualMax = Math.max(...values);
    }
  }

  const startValues = isNotEmpty(defaultValue)
    ? defaultValue
    : [actualMin, actualMax];

  if (single && startValues.length > 1) {
    startValues.splice(1, startValues.length);
  }

  const formaters = integer
    ? {
        to: formatText,
        from: formatText,
      }
    : undefined;

  const id = `dj_slider_${name}`;
  const elLabel = el("label", { for: id }, name);
  const elSlider = el("div", {
    id,
    style: {
      margin: "10px 0",
      height: "10px",
    },
  });
  const elMin = el("span", actualMin);
  const elMax = el("span", actualMax);
  const elValue = el("span");
  const elValues = el(
    "div",
    {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginTop: "5px",
      },
    },
    [elMin, elValue, elMax],
  );

  elWrapper.classList.add("mx-slider-container");
  elWrapper.appendChild(elLabel);
  elWrapper.appendChild(elSlider);
  elWrapper.appendChild(elValues);

  // create slider
  const slider = noUiSlider.create(elSlider, {
    range: { min: actualMin, max: actualMax },
    step: step || 1,
    start: startValues,
    connect: true,
    behaviour: "drag",
    tooltips: false,
    format: formaters,
  });
  onBuilt(slider, name);

  // intial values to display
  updateValues(slider.get());

  // set up event handlers
  slider.on("update", (values) => {
    updateValues(values);
    onUpdate(values.map(formatNum), name);
  });

  // update display values
  function updateValues(values) {
    elValue.replaceChildren();

    if (single) {
      elValue.innerText = formatText(values);
    } else {
      const [min, max] = values.map(formatText);

      elValue.innerText = `${min} - ${max}`;
    }
  }

  function formatText(value) {
    return integer ? `${parseInt(value)}` : `${parseFloat(value).toFixed(2)}`;
  }

  function formatNum(value) {
    return integer ? parseInt(value) : parseFloat(value);
  }
}
