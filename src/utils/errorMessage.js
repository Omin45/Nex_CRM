/**
 * ArkCRM — serverMessage
 * ---------------------------------------------------------------------------
 * The reason a request failed, in the server's own words.
 *
 * The backend answers a failure with `{ error: "..." }`; a few older paths
 * use `{ message: "..." }`. Reading only one of them means every failure
 * falls back to a generic "Something went wrong" — which is exactly the
 * situation where the user most needs to know why.
 *
 * @param {object} error the RTK Query or Axios error
 * @param {string} [fallback] what to say when the server said nothing
 * @returns {string}
 */
export function serverMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;

  const data = error?.data ?? error?.response?.data ?? null;

  if (data) {
    /* Some endpoints answer with plain text. */
    if (typeof data === 'string' && data.trim()) return data;

    if (typeof data === 'object') {
      /* A field-error map is how bean validation reports; the first
         message is the useful one. */
      if (data.errors && typeof data.errors === 'object') {
        const first = Object.values(data.errors)[0];
        if (typeof first === 'string' && first.trim()) return first;
        if (Array.isArray(first) && typeof first[0] === 'string' && first[0].trim()) return first[0];
      }

      if (typeof data.error === 'string' && data.error.trim()) return data.error;
      if (typeof data.message === 'string' && data.message.trim()) return data.message;
    }
  }

  /* The server said nothing useful. A transport-level message beats a
     generic shrug, but only when it is actually about the transport. */
  const transport = error?.message;
  if (typeof transport === 'string' && /network|timeout|offline|failed to fetch/i.test(transport)) {
    return transport;
  }

  return fallback;
}

export default serverMessage;
