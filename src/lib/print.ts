/**
 * Prints the page with a document-specific title.
 *
 * Browsers stamp document.title into the printed page header and use it as the
 * default "Save as PDF" filename, so swap in the document's own name for the
 * duration of the print and restore it afterwards.
 */
export function printAs(name: string) {
  const previousTitle = document.title;
  document.title = name;
  const restore = () => { document.title = previousTitle; };
  window.addEventListener('afterprint', restore, { once: true });
  window.print();
  setTimeout(restore, 1000);
}
