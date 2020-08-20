import {el} from '@fxi/el';
import {path, vtStyleBuilder} from './mx_helpers.js';

(function() {
  'use strict';

  JSONEditor.defaults.resolvers.unshift(function(schema) {
    if (schema.type === 'array' && schema.format === 'tableSourceAutoStyle') {
      return 'tableSourceAutoStyle';
    }
  });

  JSONEditor.defaults.editors.tableSourceAutoStyle = JSONEditor.defaults.editors.table.extend(
    {
      addControls: function() {
        var self = this;
        self.addControlsBase =
          JSONEditor.defaults.editors.table.prototype.addControls;
        self.addControlsBase();

        /**
         * Add Auto style
         */

        const elAuto = el(
          'button',
          {
            class: 'btn btn-default',
            type: 'button',
            title: 'Auto style'
          },
          [
            el('i', {
              class: ['glyphicon', 'glyphicon-cog']
            }),
            el('span', 'Auto style')
          ]
        );

        elAuto.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          autoStyle(e);
        });

        this.auto_style_button = elAuto;

        self.controls.appendChild(this.auto_style_button);

        function autoStyle() {
          const editor = self;
          const schema = editor.getItemSchema();
          const idView = path(schema, 'options.idView');
          const lang = mx.settings.language;
          vtStyleBuilder({
            idView: idView,
            onDone: (data) => {
              const editor = self;
              const oldRules = editor.getValue();
              const modeNumeric = data.type === 'continuous';
              const rules = data.table.map((r) => {
                let newRule = {
                  value: modeNumeric ? r.from : r.value,
                  color: r.color
                };

                const matchRule = oldRules.reduce((a, r) => {
                  if (a) {
                    return a;
                  }
                  if (newRule.value === r.value) {
                    return r;
                  }
                }, null);

                if (matchRule) {
                  newRule = Object.assign({}, matchRule, newRule);
                }

                if(!newRule[`label_${lang}`]){
                  if(modeNumeric){
                    newRule[`label_${lang}`] = `${r.from} - ${r.to}`;
                  }else{
                    newRule[`label_${lang}`] = `${r.value}`;
                  }
                }
                
                return newRule;
              });

              editor.setValue(rules);
              
              editor.onChange(true);
            }
          });

        }
      }
    }
  );
})();
