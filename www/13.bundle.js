webpackJsonp([13],{

/***/ 49:
/***/ (function(module, exports) {

/*!
* screenfull
* v3.3.1 - 2017-07-07
* (c) Sindre Sorhus; MIT License
*/
(function () {
	'use strict';

	var document = typeof window !== 'undefined' && typeof window.document !== 'undefined' ? window.document : {};
	var isCommonjs = typeof module !== 'undefined' && module.exports;
	var keyboardAllowed = typeof Element !== 'undefined' && 'ALLOW_KEYBOARD_INPUT' in Element;

	var fn = (function () {
		var val;

		var fnMap = [
			[
				'requestFullscreen',
				'exitFullscreen',
				'fullscreenElement',
				'fullscreenEnabled',
				'fullscreenchange',
				'fullscreenerror'
			],
			// New WebKit
			[
				'webkitRequestFullscreen',
				'webkitExitFullscreen',
				'webkitFullscreenElement',
				'webkitFullscreenEnabled',
				'webkitfullscreenchange',
				'webkitfullscreenerror'

			],
			// Old WebKit (Safari 5.1)
			[
				'webkitRequestFullScreen',
				'webkitCancelFullScreen',
				'webkitCurrentFullScreenElement',
				'webkitCancelFullScreen',
				'webkitfullscreenchange',
				'webkitfullscreenerror'

			],
			[
				'mozRequestFullScreen',
				'mozCancelFullScreen',
				'mozFullScreenElement',
				'mozFullScreenEnabled',
				'mozfullscreenchange',
				'mozfullscreenerror'
			],
			[
				'msRequestFullscreen',
				'msExitFullscreen',
				'msFullscreenElement',
				'msFullscreenEnabled',
				'MSFullscreenChange',
				'MSFullscreenError'
			]
		];

		var i = 0;
		var l = fnMap.length;
		var ret = {};

		for (; i < l; i++) {
			val = fnMap[i];
			if (val && val[1] in document) {
				for (i = 0; i < val.length; i++) {
					ret[fnMap[0][i]] = val[i];
				}
				return ret;
			}
		}

		return false;
	})();

	var eventNameMap = {
		change: fn.fullscreenchange,
		error: fn.fullscreenerror
	};

	var screenfull = {
		request: function (elem) {
			var request = fn.requestFullscreen;

			elem = elem || document.documentElement;

			// Work around Safari 5.1 bug: reports support for
			// keyboard in fullscreen even though it doesn't.
			// Browser sniffing, since the alternative with
			// setTimeout is even worse.
			if (/5\.1[.\d]* Safari/.test(navigator.userAgent)) {
				elem[request]();
			} else {
				elem[request](keyboardAllowed && Element.ALLOW_KEYBOARD_INPUT);
			}
		},
		exit: function () {
			document[fn.exitFullscreen]();
		},
		toggle: function (elem) {
			if (this.isFullscreen) {
				this.exit();
			} else {
				this.request(elem);
			}
		},
		onchange: function (callback) {
			this.on('change', callback);
		},
		onerror: function (callback) {
			this.on('error', callback);
		},
		on: function (event, callback) {
			var eventName = eventNameMap[event];
			if (eventName) {
				document.addEventListener(eventName, callback, false);
			}
		},
		off: function (event, callback) {
			var eventName = eventNameMap[event];
			if (eventName) {
				document.removeEventListener(eventName, callback, false);
			}
		},
		raw: fn
	};

	if (!fn) {
		if (isCommonjs) {
			module.exports = false;
		} else {
			window.screenfull = false;
		}

		return;
	}

	Object.defineProperties(screenfull, {
		isFullscreen: {
			get: function () {
				return Boolean(document[fn.fullscreenElement]);
			}
		},
		element: {
			enumerable: true,
			get: function () {
				return document[fn.fullscreenElement];
			}
		},
		enabled: {
			enumerable: true,
			get: function () {
				// Coerce to boolean in case of old WebKit
				return Boolean(document[fn.fullscreenEnabled]);
			}
		}
	});

	if (isCommonjs) {
		module.exports = screenfull;
	} else {
		window.screenfull = screenfull;
	}
})();


/***/ })

});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9ub2RlX21vZHVsZXMvc2NyZWVuZnVsbC9kaXN0L3NjcmVlbmZ1bGwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQSxvQkFBb0I7QUFDcEI7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUEsUUFBUSxPQUFPO0FBQ2Y7QUFDQTtBQUNBLGVBQWUsZ0JBQWdCO0FBQy9CO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxFQUFFOztBQUVGO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEVBQUU7O0FBRUY7QUFDQTtBQUNBLEVBQUU7QUFDRjtBQUNBO0FBQ0EsQ0FBQyIsImZpbGUiOiIxMy5idW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiFcbiogc2NyZWVuZnVsbFxuKiB2My4zLjEgLSAyMDE3LTA3LTA3XG4qIChjKSBTaW5kcmUgU29yaHVzOyBNSVQgTGljZW5zZVxuKi9cbihmdW5jdGlvbiAoKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgZG9jdW1lbnQgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2Ygd2luZG93LmRvY3VtZW50ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdy5kb2N1bWVudCA6IHt9O1xuXHR2YXIgaXNDb21tb25qcyA9IHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzO1xuXHR2YXIga2V5Ym9hcmRBbGxvd2VkID0gdHlwZW9mIEVsZW1lbnQgIT09ICd1bmRlZmluZWQnICYmICdBTExPV19LRVlCT0FSRF9JTlBVVCcgaW4gRWxlbWVudDtcblxuXHR2YXIgZm4gPSAoZnVuY3Rpb24gKCkge1xuXHRcdHZhciB2YWw7XG5cblx0XHR2YXIgZm5NYXAgPSBbXG5cdFx0XHRbXG5cdFx0XHRcdCdyZXF1ZXN0RnVsbHNjcmVlbicsXG5cdFx0XHRcdCdleGl0RnVsbHNjcmVlbicsXG5cdFx0XHRcdCdmdWxsc2NyZWVuRWxlbWVudCcsXG5cdFx0XHRcdCdmdWxsc2NyZWVuRW5hYmxlZCcsXG5cdFx0XHRcdCdmdWxsc2NyZWVuY2hhbmdlJyxcblx0XHRcdFx0J2Z1bGxzY3JlZW5lcnJvcidcblx0XHRcdF0sXG5cdFx0XHQvLyBOZXcgV2ViS2l0XG5cdFx0XHRbXG5cdFx0XHRcdCd3ZWJraXRSZXF1ZXN0RnVsbHNjcmVlbicsXG5cdFx0XHRcdCd3ZWJraXRFeGl0RnVsbHNjcmVlbicsXG5cdFx0XHRcdCd3ZWJraXRGdWxsc2NyZWVuRWxlbWVudCcsXG5cdFx0XHRcdCd3ZWJraXRGdWxsc2NyZWVuRW5hYmxlZCcsXG5cdFx0XHRcdCd3ZWJraXRmdWxsc2NyZWVuY2hhbmdlJyxcblx0XHRcdFx0J3dlYmtpdGZ1bGxzY3JlZW5lcnJvcidcblxuXHRcdFx0XSxcblx0XHRcdC8vIE9sZCBXZWJLaXQgKFNhZmFyaSA1LjEpXG5cdFx0XHRbXG5cdFx0XHRcdCd3ZWJraXRSZXF1ZXN0RnVsbFNjcmVlbicsXG5cdFx0XHRcdCd3ZWJraXRDYW5jZWxGdWxsU2NyZWVuJyxcblx0XHRcdFx0J3dlYmtpdEN1cnJlbnRGdWxsU2NyZWVuRWxlbWVudCcsXG5cdFx0XHRcdCd3ZWJraXRDYW5jZWxGdWxsU2NyZWVuJyxcblx0XHRcdFx0J3dlYmtpdGZ1bGxzY3JlZW5jaGFuZ2UnLFxuXHRcdFx0XHQnd2Via2l0ZnVsbHNjcmVlbmVycm9yJ1xuXG5cdFx0XHRdLFxuXHRcdFx0W1xuXHRcdFx0XHQnbW96UmVxdWVzdEZ1bGxTY3JlZW4nLFxuXHRcdFx0XHQnbW96Q2FuY2VsRnVsbFNjcmVlbicsXG5cdFx0XHRcdCdtb3pGdWxsU2NyZWVuRWxlbWVudCcsXG5cdFx0XHRcdCdtb3pGdWxsU2NyZWVuRW5hYmxlZCcsXG5cdFx0XHRcdCdtb3pmdWxsc2NyZWVuY2hhbmdlJyxcblx0XHRcdFx0J21vemZ1bGxzY3JlZW5lcnJvcidcblx0XHRcdF0sXG5cdFx0XHRbXG5cdFx0XHRcdCdtc1JlcXVlc3RGdWxsc2NyZWVuJyxcblx0XHRcdFx0J21zRXhpdEZ1bGxzY3JlZW4nLFxuXHRcdFx0XHQnbXNGdWxsc2NyZWVuRWxlbWVudCcsXG5cdFx0XHRcdCdtc0Z1bGxzY3JlZW5FbmFibGVkJyxcblx0XHRcdFx0J01TRnVsbHNjcmVlbkNoYW5nZScsXG5cdFx0XHRcdCdNU0Z1bGxzY3JlZW5FcnJvcidcblx0XHRcdF1cblx0XHRdO1xuXG5cdFx0dmFyIGkgPSAwO1xuXHRcdHZhciBsID0gZm5NYXAubGVuZ3RoO1xuXHRcdHZhciByZXQgPSB7fTtcblxuXHRcdGZvciAoOyBpIDwgbDsgaSsrKSB7XG5cdFx0XHR2YWwgPSBmbk1hcFtpXTtcblx0XHRcdGlmICh2YWwgJiYgdmFsWzFdIGluIGRvY3VtZW50KSB7XG5cdFx0XHRcdGZvciAoaSA9IDA7IGkgPCB2YWwubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRyZXRbZm5NYXBbMF1baV1dID0gdmFsW2ldO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiByZXQ7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9KSgpO1xuXG5cdHZhciBldmVudE5hbWVNYXAgPSB7XG5cdFx0Y2hhbmdlOiBmbi5mdWxsc2NyZWVuY2hhbmdlLFxuXHRcdGVycm9yOiBmbi5mdWxsc2NyZWVuZXJyb3Jcblx0fTtcblxuXHR2YXIgc2NyZWVuZnVsbCA9IHtcblx0XHRyZXF1ZXN0OiBmdW5jdGlvbiAoZWxlbSkge1xuXHRcdFx0dmFyIHJlcXVlc3QgPSBmbi5yZXF1ZXN0RnVsbHNjcmVlbjtcblxuXHRcdFx0ZWxlbSA9IGVsZW0gfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuXG5cdFx0XHQvLyBXb3JrIGFyb3VuZCBTYWZhcmkgNS4xIGJ1ZzogcmVwb3J0cyBzdXBwb3J0IGZvclxuXHRcdFx0Ly8ga2V5Ym9hcmQgaW4gZnVsbHNjcmVlbiBldmVuIHRob3VnaCBpdCBkb2Vzbid0LlxuXHRcdFx0Ly8gQnJvd3NlciBzbmlmZmluZywgc2luY2UgdGhlIGFsdGVybmF0aXZlIHdpdGhcblx0XHRcdC8vIHNldFRpbWVvdXQgaXMgZXZlbiB3b3JzZS5cblx0XHRcdGlmICgvNVxcLjFbLlxcZF0qIFNhZmFyaS8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSkge1xuXHRcdFx0XHRlbGVtW3JlcXVlc3RdKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRlbGVtW3JlcXVlc3RdKGtleWJvYXJkQWxsb3dlZCAmJiBFbGVtZW50LkFMTE9XX0tFWUJPQVJEX0lOUFVUKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdGV4aXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdGRvY3VtZW50W2ZuLmV4aXRGdWxsc2NyZWVuXSgpO1xuXHRcdH0sXG5cdFx0dG9nZ2xlOiBmdW5jdGlvbiAoZWxlbSkge1xuXHRcdFx0aWYgKHRoaXMuaXNGdWxsc2NyZWVuKSB7XG5cdFx0XHRcdHRoaXMuZXhpdCgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5yZXF1ZXN0KGVsZW0pO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0b25jaGFuZ2U6IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuXHRcdFx0dGhpcy5vbignY2hhbmdlJywgY2FsbGJhY2spO1xuXHRcdH0sXG5cdFx0b25lcnJvcjogZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG5cdFx0XHR0aGlzLm9uKCdlcnJvcicsIGNhbGxiYWNrKTtcblx0XHR9LFxuXHRcdG9uOiBmdW5jdGlvbiAoZXZlbnQsIGNhbGxiYWNrKSB7XG5cdFx0XHR2YXIgZXZlbnROYW1lID0gZXZlbnROYW1lTWFwW2V2ZW50XTtcblx0XHRcdGlmIChldmVudE5hbWUpIHtcblx0XHRcdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGNhbGxiYWNrLCBmYWxzZSk7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRvZmY6IGZ1bmN0aW9uIChldmVudCwgY2FsbGJhY2spIHtcblx0XHRcdHZhciBldmVudE5hbWUgPSBldmVudE5hbWVNYXBbZXZlbnRdO1xuXHRcdFx0aWYgKGV2ZW50TmFtZSkge1xuXHRcdFx0XHRkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgY2FsbGJhY2ssIGZhbHNlKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdHJhdzogZm5cblx0fTtcblxuXHRpZiAoIWZuKSB7XG5cdFx0aWYgKGlzQ29tbW9uanMpIHtcblx0XHRcdG1vZHVsZS5leHBvcnRzID0gZmFsc2U7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHdpbmRvdy5zY3JlZW5mdWxsID0gZmFsc2U7XG5cdFx0fVxuXG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXMoc2NyZWVuZnVsbCwge1xuXHRcdGlzRnVsbHNjcmVlbjoge1xuXHRcdFx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBCb29sZWFuKGRvY3VtZW50W2ZuLmZ1bGxzY3JlZW5FbGVtZW50XSk7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRlbGVtZW50OiB7XG5cdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHRcdFx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBkb2N1bWVudFtmbi5mdWxsc2NyZWVuRWxlbWVudF07XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRlbmFibGVkOiB7XG5cdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHRcdFx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdC8vIENvZXJjZSB0byBib29sZWFuIGluIGNhc2Ugb2Ygb2xkIFdlYktpdFxuXHRcdFx0XHRyZXR1cm4gQm9vbGVhbihkb2N1bWVudFtmbi5mdWxsc2NyZWVuRW5hYmxlZF0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cblx0aWYgKGlzQ29tbW9uanMpIHtcblx0XHRtb2R1bGUuZXhwb3J0cyA9IHNjcmVlbmZ1bGw7XG5cdH0gZWxzZSB7XG5cdFx0d2luZG93LnNjcmVlbmZ1bGwgPSBzY3JlZW5mdWxsO1xuXHR9XG59KSgpO1xuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9ub2RlX21vZHVsZXMvc2NyZWVuZnVsbC9kaXN0L3NjcmVlbmZ1bGwuanNcbi8vIG1vZHVsZSBpZCA9IDQ5XG4vLyBtb2R1bGUgY2h1bmtzID0gMTMiXSwic291cmNlUm9vdCI6IiJ9