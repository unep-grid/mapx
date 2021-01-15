(function() {
  'use strict';

  JSONEditor.defaults.resolvers.unshift(function(schema) {
    if (schema.type === 'array' && schema.format === 'selectizeOptGroup') {
      return 'selectizeOptGroup';
    }
  });

  JSONEditor.defaults.editors.selectizeOptGroup = JSONEditor.defaults.editors.arraySelectize.extend(
    {
      updateGroup: async function() {
        const self = this;
        const h = mx.helpers;
        /**
         * Addition
         * - async
         * - Add group options
         */
        const grp = h.path(self, 'schema.options.groupOptions');
        if (grp) {
          const selectize = self.input.selectize;
          selectize.settings.create = false;
          selectize.clearOptions();
          for (let k in grp) {
            selectize.addOptionGroup(k, {
              label: await h.getDictItem(k)
            });
            const values = grp[k];
            for (let i = 0, iL = values.length; i < iL; i++) {
              const it = values[i];
              const label = await h.getDictItem(it);
              selectize.addOption({
                text: label,
                value: it,
                optgroup: k
              });
            }
          }
          console.log('build end');
          self._selectize_group_init = true;
        }
      },
      setValue: async function(value, initial) {
        const h = mx.helpers;
        const self = this;
        const isInit = self._selectize_group_init === true;
        if (!isInit) {
          await self.updateGroup();
        }
        const selectize = self.input.selectize;
        selectize.clear(true);
        value = h.isArray(value) ? value : [value];
        this.input.selectize.setValue(value);
        this.refreshValue(initial);
        console.log('set value');
      }
    }
  );
})();
