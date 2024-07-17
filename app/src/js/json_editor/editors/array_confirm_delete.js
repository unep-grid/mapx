import { JSONEditor } from "@json-editor/json-editor";
import { modal } from "./../../mx_helper_modal.js";

/*
 * Add an array format asking user to confirm removal
 *
 */

JSONEditor.defaults.resolvers.unshift(function (schema) {
  if (schema.type === "array" && schema.format === "confirmDelete") {
    return "arrayConfirmDelete";
  }
});

JSONEditor.defaults.editors.arrayConfirmDelete = class mxeditors extends (
  JSONEditor.defaults.editors.array
) {
  addRow(value, initial) {
    var self = this;
    var i = this.rows.length;

    self.rows[i] = this.getElementEditor(i);
    self.row_cache[i] = self.rows[i];

    if (self.tabs_holder) {
      self.rows[i].tab_text = document.createElement("span");
      self.rows[i].tab_text.textContent = self.rows[i].getHeaderText();
      self.rows[i].tab = self.theme.getTab(self.rows[i].tab_text);
      self.rows[i].tab.addEventListener("click", function (e) {
        self.active_tab = self.rows[i].tab;
        self.refreshTabs();
        e.preventDefault();
        e.stopPropagation();
      });

      self.theme.addTab(self.tabs_holder, self.rows[i].tab);
    }

    var controls_holder =
      self.rows[i].title_controls || self.rows[i].array_controls;

    // Buttons to delete row, move row up, and move row down
    if (!self.hide_delete_buttons) {
      self.rows[i].delete_button = this.getButton(
        self.getItemTitle(),
        "delete",
        this.translate("button_delete_row_title", [self.getItemTitle()]),
      );
      self.rows[i].delete_button.className += " delete";
      self.rows[i].delete_button.setAttribute("data-i", i);

      /**
       * Mapx hack : confirmation before deletion
       */
      self.rows[i].delete_button.addEventListener("click", function (e) {
        var thisRow = self;
        e.preventDefault();
        e.stopPropagation();
        var i = this.getAttribute("data-i") * 1;
        var value = self.getValue();
        var btnConfirm = document.createElement("button");
        var newval = [];
        var new_active_tab = null;

        btnConfirm.className = "btn btn-default";
        btnConfirm.innerText = "Yes";
        /**
         * Add modal for confirmation
         */
        modal({
          title: "Remove item",
          id: "modalRemoveRow",
          content: "Are you sure to remove this?",
          buttons: [btnConfirm],
          textCloseButton: "Cancel",
          addBackground: true,
        });
        /**
         * Confirm removal
         */
        btnConfirm.addEventListener("click", function () {
          // remove the modal window if exists
          modal({
            id: "modalRemoveRow",
            close: true,
          });

          value.forEach(function (row, j) {
            if (j === i) {
              // If the one we're deleting is the active tab
              if (thisRow.rows[j].tab === thisRow.active_tab) {
                // Make the next tab active if there is one
                // Note: the next tab is going to be the current tab after deletion
                if (thisRow.rows[j + 1]) {
                  new_active_tab = thisRow.rows[j].tab;
                }
                // Otherwise, make the previous tab active if there is one
                else if (j) {
                  new_active_tab = thisRow.rows[j - 1].tab;
                }
              }

              return; // If this is the one we're deleting
            }
            newval.push(row);
          });

          thisRow.setValue(newval);
          if (new_active_tab) {
            thisRow.active_tab = new_active_tab;
            thisRow.refreshTabs();
          }

          thisRow.onChange(true);
        });
      });

      if (controls_holder) {
        controls_holder.appendChild(self.rows[i].delete_button);
      }
    }

    if (i && !self.hide_move_buttons) {
      self.rows[i].moveup_button = this.getButton(
        "",
        "moveup",
        this.translate("button_move_up_title"),
      );
      self.rows[i].moveup_button.className += " moveup";
      self.rows[i].moveup_button.setAttribute("data-i", i);
      self.rows[i].moveup_button.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var i = this.getAttribute("data-i") * 1;

        if (i <= 0) {
          return;
        }
        var rows = self.getValue();
        var tmp = rows[i - 1];
        rows[i - 1] = rows[i];
        rows[i] = tmp;

        self.setValue(rows);
        self.active_tab = self.rows[i - 1].tab;
        self.refreshTabs();

        self.onChange(true);
      });

      if (controls_holder) {
        controls_holder.appendChild(self.rows[i].moveup_button);
      }
    }

    if (!self.hide_move_buttons) {
      self.rows[i].movedown_button = this.getButton(
        "",
        "movedown",
        this.translate("button_move_down_title"),
      );
      self.rows[i].movedown_button.className += " movedown";
      self.rows[i].movedown_button.setAttribute("data-i", i);
      self.rows[i].movedown_button.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var i = this.getAttribute("data-i") * 1;

        var rows = self.getValue();
        if (i >= rows.length - 1) {
          return;
        }
        var tmp = rows[i + 1];
        rows[i + 1] = rows[i];
        rows[i] = tmp;

        self.setValue(rows);
        self.active_tab = self.rows[i + 1].tab;
        self.refreshTabs();
        self.onChange(true);
      });

      if (controls_holder) {
        controls_holder.appendChild(self.rows[i].movedown_button);
      }
    }

    if (value) {
      self.rows[i].setValue(value, initial);
    }
    self.refreshTabs();
  }
};
