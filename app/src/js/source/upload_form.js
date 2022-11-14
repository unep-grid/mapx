import { el, elSpanTranslate } from "./../el_mapx";
const st = elSpanTranslate;

export function buildForm(md) {
  const opt = md._opt;

  const elMsgContainer = el("div");

  const elFormEpsg = el(
    "div",
    {
      class: "form-group",
    },
    el("label", { for: "dl_epsg_code" }, st("dl_select_epsg_code")),
    el("select", {
      id: "dl_epsg_code",
      name: "epsgCode",
      dataset: { type: "epsg" },
    })
  );

  const elFormCountries = el(
    "div",
    {
      class: "form-group",
    },
    el(
      "label",
      {
        for: "dl_iso3codes",
      },
      st("dl_select_clip_countries")
    ),
    el("select", {
      id: "dl_iso3codes",
      name: "iso3codes",
      dataset: { type: "countries" },
    })
  );

  const elFormFormat = el(
    "div",
    {
      class: "form-group",
    },
    el(
      "label",
      {
        for: "dl_format",
      },
      st("dl_select_file_format")
    ),
    el("select", {
      id: "dl_format",
      name: "format",
      dataset: { type: "format_vector_download" },
    })
  );

  const elFormFilename = el(
    "div",
    {
      class: "form-group",
    },
    el("label", { for: "dl_filename" }, st("dl_filename")),
    el(
      "input",
      {
        class: "form-control",
        name: "filename",
        id: "dl_filename",
        type: "text",
      },
      opt.filename
    )
  );

  const elFormEmail = el(
    "div",
    { class: "form-group" },
    el("label", { for: "dl_email" }, st("dl_email")),
    el(
      "input",
      {
        on: [
          "input",
          () => {
            md.update("email");
          },
        ],
        class: "form-control",
        type: "email",
        name: "email",
        id: "dl_email",
        //disabled: isEmail(opt.email) ? true : null
      },
      opt.email
    )
  );

  const elForm = el(
    "form",
    { name: "dl_form", id: "dl_modal", on: ["change", md.update] },
    [elFormFormat, elFormEpsg, elFormCountries, elFormEmail, elFormFilename]
  );

  return {
    elForm,
    elFormFormat,
    elFormEpsg,
    elFormCountries,
    elFormEmail,
    elFormFilename,
    elMsgContainer,
  };
}
