/**
 * ArkCRM — downloadBlob
 * ---------------------------------------------------------------------------
 * Saves a server response as a file.
 *
 * The export endpoints answer with the file itself (a CSV), so the browser
 * has to be handed it: a blob URL, an anchor, and a click. The filename
 * comes from the Content-Disposition header when the server sent one.
 *
 * @param {Blob|ArrayBuffer|string} payload the response body
 * @param {string} filename the fallback name
 * @param {Response} [response] the raw response, for its headers
 */

export function downloadBlob(payload, filename, response) {
  const blob = payload instanceof Blob
    ? payload
    : new Blob([payload], { type: 'text/csv;charset=utf-8' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filenameFrom(response) ?? filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  /* Release the object URL on the next tick so Firefox has time to start. */
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** The filename the server asked for, if it said. */
function filenameFrom(response) {
  const header = response?.headers?.get?.('Content-Disposition');
  if (!header) return null;
  const match = /filename="?([^";]+)"?/i.exec(header);
  return match ? match[1] : null;
}