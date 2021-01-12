(()=>{
  JSONEditor.defaults.custom_validators.push((schema, value, path)=>{
    const errors = [];
    const rgxEmpty = new RegExp(/^\s+$/);
    if (schema.type === 'string') {
      if (rgxEmpty.test(value)) {
        errors.push({
          id: 'error_only_space',
          path: path,
          property: 'format',
          message: jed.helper.translate('error_space_only') 
        });
      }
    }
    return errors;
  });
})();
