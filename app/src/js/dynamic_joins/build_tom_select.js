import { moduleLoad } from "../modules_loader_async";

export async function buildTomSelectInput(options = {}) {
  const TomSelect = await moduleLoad("tom-select");
  const { elWrapper, config, onBuilt, onUpdate, data } = options;
  const { name, default: defaultValue } = config;

  // compute distinct values and counts
  const counts = {};
  for (const row of data) {
    const v = row[name];
    if (v != null) {
      const key = String(v);
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  const tsOptions = Object.entries(counts)
    .map(([value, count]) => ({ value, text: `${value} (${count})` }))
    .sort((a, b) => (a.value > b.value ? 1 : a.value < b.value ? -1 : 0));

  // create ui
  const id = `dj_select_${name}`;
  const elInput = el("select", { id });
  const elLabel = el("label", { for: id }, name);
  elWrapper.appendChild(elLabel);
  elWrapper.appendChild(elInput);

  const ts = new TomSelect(elInput, {
    options : tsOptions,
    create: false,
    allowEmptyOption: true,
    dropdownParent: "body",
    closeAfterSelect: true,
    placeholder: `Filter by ${name}`,
    onChange: (val) => {
      onUpdate(val, name);
    },
  });
  onBuilt(ts, name);

  // set default value if provided
  if (defaultValue) {
    ts.setValue(defaultValue);
  }
}
