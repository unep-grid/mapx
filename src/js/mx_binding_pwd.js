/*jshint esversion: 6 */

$(document).on('shiny:connected', function(event) {

  jQuery(function($) {
    // Password Input
    var passwordInputBinding = new Shiny.InputBinding();
    $.extend(passwordInputBinding, {
      find: function(scope) {
        return $(scope).find('input[type="password"]');
      },
      getId: function(el) {
        return Shiny.InputBinding.prototype.getId.call(this, el) || el.name;
      },
      getValue: function(el) {
        return el.value;
      },
      setValue: function(el, value) {
        el.value = value;
      },
      subscribe: function(el, callback) {
        $(el).on('keyup.passwordInputBinding input.passwordInputBinding', function(event) {
          callback(true);
        });
        $(el).on('change.passwordInputBinding', function(event) {
          callback(false);
        });
      },
      unsubscribe: function(el) {
        $(el).off('.passwordInputBinding');
      },
      getRatePolicy: function() {
        return {
          policy: 'debounce',
          delay: 250
        };
      }
    });
    Shiny.inputBindings.register(passwordInputBinding, 'shiny.passwordInput');
  });


  jQuery(function($) {
    // User name input
    var usernameInputBinding = new Shiny.InputBinding();
    $.extend(usernameInputBinding, {
      find: function(scope) {
        return $(scope).find('.mx-login-input');

      },
      getId: function(el) {
        return Shiny.InputBinding.prototype.getId.call(this, el) || el.name;
      },
      getValue: function(el) {
        return el.value;
      },
      setValue: function(el, value) {
        el.value = value;
      },
      subscribe: function(el, callback) {
        $(el).on('keyup.usernameInputBinding input.usernameInputBinding', function(event) {
          callback(true);
        });
        $(el).on('change.usernameInputBinding', function(event) {
          callback(false);
        });
      },
      unsubscribe: function(el) {
        $(el).off('.usernameInputBinding');
      },
      getRatePolicy: function() {
        return {
          policy: 'debounce',
          delay: 250
        };
      }
    });
    Shiny.inputBindings.register(usernameInputBinding, 'shiny.usernameInput');
  });

});
