const options = {
  idSocket: null,
  idUser: null,
  idProject: null,
  token: null,
  email: null,
  format: "GPKG",
  epsgCode: 4326,
  title: null,
  iso3codes: [],
  language: "en",
};

export class UploadSourceModal extends EventSimple {
  constructor(opt) {
    const upl = this;

    upl._opt = Object.assign({}, options, opt);
  }

  async build() {
    const upl = this;

    upl._form = {
      elMsgContainer,
      elForm,
      elFormEpsg,
      elFormTitle,
      elFormFileDragDrop,
      elInputFile,
    } = buildForm(upl);
  }

  handleDragEnter(e) {
    upl._prevent(e);
  }

  handleFormDragEnter(e) {
    const upl = this;
    upl._prevent(e);
  }
  handleFormDrop(e) {
    const upl = this;
    upl._prevent(e);
  }
  handleFormFileInput(e) {
    const upl = this;
    upl._prevent(e);
  }
  /**
   *
   */
  handleFormClick(e) {
    const upl = this;
    upl._prevent(e);
    upl._form.elInputFile.click();
  }
  _prevent(e) {
    e.preventDefault();
    e.stopPropagation();
  }
}
