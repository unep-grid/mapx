var el = El.el;

var elTitle = el(
  'h1',
  {
    on: {
      click: function() {
        alert('clicked');
      }
    }
  },
  'Hello World'
);

document.body.appendChild(elTitle);
