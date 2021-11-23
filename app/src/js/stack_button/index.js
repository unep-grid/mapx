
/**
 * Create a button containing font awesome stack icon
 * @param {Object} o options
 * @param {Element} o.elContainer Button container
 * @param {Array} o.classes classes to init the stack with
 */
export function StackButton(o) {
  var sb = this;
  sb.config = {
    hidden: o.hidden,
    classHide: 'mx-hide',
    elContainer: o.elContainer,
    classes: o.classes,
    classBase: o.classBase
  };
}

StackButton.prototype.build = function() {
  var elBtn = document.createElement('button');
  var elSpan = document.createElement('span');
  var elFront = document.createElement('i');
  var elBack = document.createElement('i');
  elSpan.appendChild(elFront);
  elSpan.appendChild(elBack);
  elBtn.appendChild(elSpan);
  this.elSpan = elSpan;
  this.elBtn = elBtn;
  this.elFront = elFront;
  this.elBack = elBack;
  if (this.config.elContainer) {
    this.config.elContainer.appendChild(elBtn);
  }
  this.setClasses();
  this.setHidden(this.config.hidden === true);
  return this;
};

StackButton.prototype.setClasses = function(cl) {
  cl = !!cl ? (cl instanceof Array ? cl : [cl]) : this.config.classes;
  var elFront = this.elFront;
  var elBack = this.elBack;
  var elSpan = this.elSpan;
  var elBtn = this.elBtn;
  elSpan.className = 'fa-stack';
  elFront.className = 'fa fa-stack-1x';
  elBack.className = 'fa fa-stack-2x';
  elFront.classList.add(cl[0]);
  elBack.classList.add(cl[1]);
  elBtn.className = cl[2] || this.config.classBase || 'btn btn-default';
  return this;
};
StackButton.prototype.setHidden = function(hide) {
  var elBtn = this.elBtn;
  if (hide === true) {
    elBtn.classList.add(this.config.classHide);
    this.config.hidden = true;
  } else if (hide === false) {
    elBtn.classList.remove(this.config.classHide);
    this.config.hidden = false;
  } else {
    elBtn.classList.toggle(this.config.classHide);
    this.config.hidden = elBtn.classList.contains(this.config.classHide);
  }
  return this;
};

