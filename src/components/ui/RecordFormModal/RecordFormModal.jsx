/**
 * ArkCRM — RecordFormModal
 * ---------------------------------------------------------------------------
 * The create/edit dialog every "New X" flow in the app uses.
 *
 * Every record type needs the same shell: a title, a handful of fields, a
 * validate-then-submit guard, and two footer buttons. Only the field list
 * differs. Building that shell once means a new record type needs a field
 * list rather than another modal — and that every flow validates and
 * submits the same way.
 *
 * A field is described by data, not JSX:
 *
 *   { name: 'email', label: 'Email', type: 'email', required: true }
 *   { name: 'segment', label: 'Segment', type: 'select', options: [...] }
 *   { name: 'creditLimit', label: 'Credit limit', type: 'number', half: true }
 *
 * `half: true` puts a field on a shared row with the next half-width field.
 *
 * @example
 * <RecordFormModal
 *   open={modalOpen}
 *   onClose={closeModal}
 *   title="New customer"
 *   fields={FIELDS}
 *   form={form}
 *   errors={errors}
 *   onChange={handleChange}
 *   onSubmit={submitForm}
 *   isSaving={isSaving}
 * />
 */

import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import Modal from '@/components/ui/Modal/Modal';
import './RecordFormModal.css';

/** Lays the field list out, pairing consecutive half-width fields. */
function layoutRows(fields) {
  const rows = [];
  let pending = null;

  for (const field of fields) {
    if (field.half) {
      if (pending) {
        rows.push([pending, field]);
        pending = null;
      } else {
        pending = field;
      }
    } else {
      if (pending) {
        rows.push([pending]);
        pending = null;
      }
      rows.push([field]);
    }
  }
  if (pending) rows.push([pending]);

  return rows;
}

export default function RecordFormModal({
  open,
  onClose,
  title,
  subtitle = null,
  fields = [],
  form = {},
  errors = {},
  onChange,
  onSubmit,
  isSaving = false,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  size = 'md',
  children = null,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size={size}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            {cancelLabel}
          </Button>
          <Button variant="primary" loading={isSaving} onClick={onSubmit}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form
        className="nx-rfm__form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit?.();
        }}
      >
        {layoutRows(fields).map((row) => (
          <div
            key={row.map((field) => field.name).join('-')}
            className={row.length > 1 ? 'nx-rfm__row' : undefined}
          >
            {row.map((field) => (
              <Input
                key={field.name}
                as={field.type === 'select' ? 'select' : field.type === 'textarea' ? 'textarea' : 'input'}
                label={field.label}
                name={field.name}
                type={field.type === 'select' ? 'text' : field.type ?? 'text'}
                required={field.required}
                placeholder={field.placeholder}
                hint={field.hint}
                min={field.min}
                max={field.max}
                step={field.step}
                inputMode={field.inputMode}
                rows={field.rows}
                options={field.options ?? []}
                value={form[field.name] ?? ''}
                error={errors[field.name]}
                onChange={onChange}
                containerClassName={row.length > 1 ? 'nx-rfm__field' : undefined}
              />
            ))}
          </div>
        ))}

        {children}
      </form>
    </Modal>
  );
}
