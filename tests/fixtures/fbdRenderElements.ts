const BLOCK_SOURCE = '<Block Type="ADD" ID="3" X="220" Y="40" />';
const FUNCTION_SOURCE = '<Function Type="ADD" ID="3" X="220" Y="40" />';

/** Adds the parser-supported Function form omitted from the supported Rockwell XSDs. */
export function withFunctionElement(source: string): string {
  return source.replace(BLOCK_SOURCE, FUNCTION_SOURCE);
}
