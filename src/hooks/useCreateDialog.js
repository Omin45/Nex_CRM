/**
 * ArkCRM — useCreateDialog
 * ---------------------------------------------------------------------------
 * The plumbing every "New X" dialog needs: opening and closing, the form
 * values, the per-field errors, and the `?new=1` deep link that opens the
 * dialog straight away.
 *
 * Each page still owns its fields, its validation and what happens on
 * submit. This only owns the mechanics, so every create dialog in the app
 * behaves the same way — and the dashboard's quick actions, which all link
 * to `?new=1`, land in a form that is actually open.
 *
 * @example
 * const dialog = useCreateDialog({
 *   initialValues: { name: '' },
 *   validate: (form) => (form.name ? {} : { name: 'Required' }),
 *   onSubmit: async (form) => { await create({ ...form }).unwrap(); },
 * });
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function useCreateDialog({
  initialValues,
  validate,
  onSubmit,
  isSaving = false,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialValues);
  const [errors, setErrors] = useState({});

  /* The values a fresh dialog starts from. Kept in a ref-like memo so the
     effect below does not re-run every time the caller re-creates the
     object literal. */
  const defaults = useMemo(() => initialValues, [initialValues]);

  useEffect(() => {
    if (searchParams.get('new') !== '1') return;
    setForm(defaults);
    setErrors({});
    setOpen(true);
    /* The parameter is left in place: clearing it here would navigate away
       from under the dialog, and the router can rebuild the page element —
       which would throw the open state away with it. It is cleared when the
       dialog closes instead. */
  }, [searchParams, defaults]);

  /** Opens the dialog, optionally with values already filled in. */
  const show = useCallback(
    (values = null) => {
      setForm(values ? { ...defaults, ...values } : defaults);
      setErrors({});
      setOpen(true);
    },
    [defaults],
  );

  const hide = useCallback(() => {
    setOpen(false);
    setForm(defaults);
    setErrors({});

    /* Now the deep-link parameter can go: the dialog is closed, so nothing
       is watching it any more. */
    if (searchParams.get('new') === '1') {
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [defaults, searchParams, setSearchParams]);

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    /* Clear only the field being fixed, so the rest of the form's errors
       stay visible while the user works through them. */
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }, []);

  const submit = useCallback(async () => {
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    try {
      await onSubmit(form);
      hide();
    } catch {
      /* The page reports the failure; the dialog stays open so the entered
         values are not lost. */
    }
  }, [form, validate, onSubmit, hide]);

  return {
    open,
    show,
    hide,
    form,
    errors,
    handleChange,
    submit,
    isSaving,
  };
}
