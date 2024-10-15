export class ButtonFilter {
  constructor(opt = {}) {
    const { idBtn, idPanel } = Object.assign({}, opt);
    this.clActive = "active";
    this.clHide = "mx-hide";
    this.elBtn = document.getElementById(idBtn);
    this.elPanel = document.getElementById(idPanel);
    this.isActive = false;
    this.init();
  }

  // Initialize the filter button and set up event listeners
  init() {
    if (!this.elBtn || !this.elPanel) {
      console.error("Button or panel element not found");
      return;
    }

    this.elBtn.addEventListener("click", (_) => {
      this.toggle();
    });
  }

  // Toggle the button's active state and panel visibility
  toggle() {
    if (this.isActive) {
      this.close();
    } else {
      this.open();
    }
  }

  // Enable (show) the panel and activate the button
  open() {
    this.elPanel.classList.remove(this.clHide);
    this.elBtn.classList.add(this.clActive);
    this.isActive = true;
  }

  // Close (hide) the panel and deactivate the button
  close() {
    this.elPanel.classList.add(this.clHide);
    this.elBtn.classList.remove(this.clActive);
    this.isActive = false;
  }
}
