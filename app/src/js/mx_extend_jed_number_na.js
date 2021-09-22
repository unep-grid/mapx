JSONEditor.defaults.editors.number_na = JSONEditor.defaults.editors.string.extend(
  {
    sanitize: function(value) {
      return (value + '').replace(/[^0-9\.\-eE]/g, '');
    },
    getNumColumns: function() {
      return 2;
    },
    getValue: function() {
      if (this.value === '' || typeof this.value === 'undefined' || this.value === null) {
        return null;
      } else {
        return this.value * 1;
      }
    }
  }
);
