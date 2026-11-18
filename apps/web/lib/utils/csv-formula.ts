/**
 * Cells a spreadsheet app would run as a formula.
 *
 * CSV exports carry text that users wrote (item names and descriptions, survey answers and answer
 * keys, sign-up emails in analytics), and a cell beginning `=`, `+`, `-`, `@`, tab, CR or LF can run as
 * a formula when an admin opens the CSV in a spreadsheet app (an app that drops the leading line break
 * reads the `=` after it as the start of the cell). Papa's own `escapeFormulae: true` uses
 * `/^[=+\-@\t\r].*$/`, which does not match a value with a line break, so a multi-line value starting
 * with `=` would get through; this pattern only looks at the first character. Plain numbers such as
 * a negative latitude are left alone: they are not formulas and must stay numbers.
 * `ItemImportService.parseCSV` takes the apostrophe off again. A value that already starts with `'`
 * before one of those characters (for example `'=1+1`) gets one more, so that import gives it back
 * unchanged.
 */
export const CSV_FORMULA_PREFIX = /^(?![-+]?\d+(?:\.\d+)?$)'*[=+\-@\t\r\n]/;

/**
 * Prefix `value` with `'` when a spreadsheet app would run it as a formula, so the app shows it as
 * text. Apply it to the cell text before CSV quoting.
 */
export function escapeCsvFormula(value: string): string {
	return CSV_FORMULA_PREFIX.test(value) ? `'${value}` : value;
}
