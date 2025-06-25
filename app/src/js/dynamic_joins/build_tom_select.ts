import { el } from "../el_mapx";
import { moduleLoad } from "../modules_loader_async";
import type { BuildTomSelectOptions } from "./types.ts";

interface TomSelectOption {
  value: string;
  text: string;
}

interface TomSelectConfig {
  options: TomSelectOption[];
  create: boolean;
  allowEmptyOption: boolean;
  dropdownParent: string;
  closeAfterSelect: boolean;
  placeholder: string;
  onChange: (val: any) => void;
}

export async function buildTomSelectInput(options: BuildTomSelectOptions): Promise<void> {
  const TomSelect = await moduleLoad("tom-select");
  const { elWrapper, config, onBuilt, onUpdate, data } = options;
  const { name, default: defaultValue } = config;

  // compute distinct values and counts
  const counts: Record<string, number> = {};
  for (const row of data) {
    const v = row[name];
    if (v != null) {
      const key = String(v);
      counts[key] = (counts[key] || 0) + 1;
    }
  }

  const tsOptions: TomSelectOption[] = Object.entries(counts)
    .map(([value, count]) => ({ value, text: `${value} (${count})` }))
    .sort((a, b) => (a.value > b.value ? 1 : a.value < b.value ? -1 : 0));

  // create ui
  const id = `dj_select_${name}`;
  const elInput = el("select", { id });
  const elLabel = el("label", { for: id }, name);
  elWrapper.appendChild(elLabel);
  elWrapper.appendChild(elInput);

  const tomSelectConfig: TomSelectConfig = {
    options: tsOptions,
    create: false,
    allowEmptyOption: true,
    dropdownParent: "body",
    closeAfterSelect: true,
    placeholder: `Filter by ${name}`,
    onChange: (val: any) => {
      onUpdate(val, name);
    },
  };

  const ts = new TomSelect(elInput, tomSelectConfig);
  onBuilt(ts, name);

  // set default value if provided
  if (defaultValue) {
    ts.setValue(defaultValue);
  }
}
