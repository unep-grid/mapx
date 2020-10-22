var el = El.el;

var elTitle = el(
  'h1',
  {
    style: {cursor: 'pointer'},
    on: {
      click: function() {
        alert('clicked');
      }
    }
  },
  'Hello World'
);

document.body.appendChild(elTitle);
