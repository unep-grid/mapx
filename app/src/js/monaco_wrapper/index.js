import * as monacod from "monaco-editor";

const monaco = monacod;
/**
 * https://microsoft.github.io/monaco-editor/docs.html#interfaces/languages.typescript.DiagnosticsOptions.html
 */
monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: false,
  noSyntaxValidation: false,
  noSuggestionDiagnostics: false,
});

export { monaco };
