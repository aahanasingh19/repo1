import CodeRunner from "../containers/CodeRunner";

/**
 * Factory function for code execution.
 * Returns a CodeRunner instance configured for the requested language.
 * Replaces the previous per-language class approach with a unified runner.
 */
function createExecutor(codeLang: string): CodeRunner | null {
  const supportedLanguages = ["cpp", "java", "python"];
  if (supportedLanguages.includes(codeLang.toLowerCase())) {
    return new CodeRunner();
  }
  return null;
}

export default createExecutor;
