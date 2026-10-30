/**
 * NexERP — PreferencesSettingsPage
 * ---------------------------------------------------------------------------
 * `settings/preferences` — appearance, alert channels and formats for the
 * signed-in user. There is no settings endpoint to save to (settingsApi only
 * serves the audit log), so everything here writes to this browser and the
 * toast says so rather than pretending a round trip happened.
 *
 * The theme radios are the exception: ThemeContext already owns that choice —
 * the same switch as the avatar menu — so they drive it directly instead of
 * storing a second copy. Density and page size are read back by the audit log.
 */

import { useMemo, useState } from 'react';
import { FiBell, FiCheck, FiGlobe, FiInfo, FiMonitor } from 'react-icons/fi';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import { useTheme } from '@/context/ThemeContext';
import { useNotify } from '@/hooks/useNotification';
import { oneOf, required, validateForm } from '@/utils/validators';
import './PreferencesSettingsPage.css';

const PREFS_KEY = 'nexerp.ui.preferences';

const THEME_OPTIONS = [
  { value: 'dark', title: 'Dark', hint: 'The default canvas — built for long sessions.' },
  { value: 'light', title: 'Light', hint: 'For bright rooms and printed screenshots.' },
];

const DENSITY_OPTIONS = [
  { value: 'comfortable', title: 'Comfortable', hint: 'Roomier rows, the app default.' },
  { value: 'compact', title: 'Compact', hint: 'Tighter rows; the workspace audit log honours this.' },
];

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10 rows' },
  { value: '20', label: '20 rows' },
];

const LANGUAGE_OPTIONS = [{ value: 'en', label: 'English' }];

/* Preset names match the DATE_FORMATS keys in utils/date, so the labels below
   show exactly what each choice writes. */
const DATE_FORMAT_OPTIONS = [
  { value: 'short', label: '08 Oct 2026 (DD MMM YYYY)' },
  { value: 'numeric', label: '2026-10-08 (YYYY-MM-DD)' },
  { value: 'long', label: 'Thursday, 08 October 2026' },
];

const NUMBER_FORMAT_OPTIONS = [
  { value: 'grouped', label: '1,234,567.89 (grouped)' },
  { value: 'plain', label: '1234567.89 (plain)' },
];

const DEFAULTS = {
  density: 'comfortable',
  defaultPageSize: '10',
  notifyEmail: true,
  notifyInApp: true,
  notifySms: false,
  language: 'en',
  dateFormat: 'short',
  numberFormat: 'grouped',
};

/* Booleans are never invalid, so only the selects are validated. */
const PREFS_SCHEMA = {
  density: [required, (value) => oneOf(value, DENSITY_OPTIONS.map((option) => option.value))],
  defaultPageSize: [required, (value) => oneOf(value, PAGE_SIZE_OPTIONS.map((option) => option.value))],
  language: [required, (value) => oneOf(value, LANGUAGE_OPTIONS.map((option) => option.value))],
  dateFormat: [required, (value) => oneOf(value, DATE_FORMAT_OPTIONS.map((option) => option.value))],
  numberFormat: [required, (value) => oneOf(value, NUMBER_FORMAT_OPTIONS.map((option) => option.value))],
};

/* A render outside a browser (the smoke harness) must never touch
   localStorage, so the guard lives here and not at module scope. */
function loadPreferences() {
  if (typeof localStorage === 'undefined') return { ...DEFAULTS };
  try {
    const stored = JSON.parse(localStorage.getItem(PREFS_KEY));
    return stored && typeof stored === 'object' ? { ...DEFAULTS, ...stored } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function savePreferences(values) {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(values));
    return true;
  } catch {
    /* Blocked or full storage must not fake a save: the caller reports it. */
    return false;
  }
}

export default function PreferencesSettingsPage() {
  const notify = useNotify();
  const { theme, setTheme } = useTheme();

  const [values, setValues] = useState(loadPreferences);
  const [savedValues, setSavedValues] = useState(values);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const isDirty = useMemo(
    () => Object.keys(values).some((key) => values[key] !== savedValues[key]),
    [values, savedValues],
  );

  const setField = (field) => (event) => {
    const { value } = event.target;
    setValues((prev) => ({ ...prev, [field]: value }));

    /* Re-validate only fields that have already shown an error, so the form
       stays quiet while someone is still choosing. */
    if (touched[field]) {
      const { errors: nextErrors } = validateForm({ ...values, [field]: value }, PREFS_SCHEMA);
      setErrors((prev) => ({ ...prev, [field]: nextErrors[field] ?? '' }));
    }
  };

  const blurField = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const { errors: nextErrors } = validateForm(values, PREFS_SCHEMA);
    setErrors((prev) => ({ ...prev, [field]: nextErrors[field] ?? '' }));
  };

  const errorFor = (field) => (touched[field] ? errors[field] : '');

  const toggleField = (field) => (event) => {
    const { checked } = event.target;
    setValues((prev) => ({ ...prev, [field]: checked }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    setTouched(Object.keys(PREFS_SCHEMA).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    const { valid, errors: nextErrors } = validateForm(values, PREFS_SCHEMA);
    setErrors(nextErrors);
    if (!valid) {
      notify.error('Fix the highlighted fields before saving.');
      return;
    }

    if (!isDirty) {
      notify.info('No changes to save.');
      return;
    }

    setSavedValues(values);
    if (savePreferences(values)) {
      notify.success(
        'Preferences saved in this browser for this demo — there is no settings endpoint, so nothing was sent to a server.',
      );
    } else {
      notify.error('This browser would not store the preferences — storage is blocked or full.');
    }
  };

  const handleReset = () => {
    setValues(savedValues);
    setErrors({});
    setTouched({});
  };

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Workspace</span>
          <h1 className="page__title">Preferences</h1>
          <p className="page__subtitle">
            How this workspace looks and what it tells you — kept in this browser.
          </p>
        </div>
      </div>

      <form className="page__body nx-prefs__form" onSubmit={handleSubmit} noValidate>
        <div className="nx-alert nx-alert--info nx-prefs__note" role="note">
          <span className="nx-alert__icon" aria-hidden="true">
            <FiInfo size={16} />
          </span>
          Preferences live in this browser only. The theme applies the moment you pick it; density
          and page size are read by the workspace audit log. Nothing here is transmitted.
        </div>

        <Card padding="lg">
          <fieldset className="nx-prefs__fieldset">
            <legend className="nx-prefs__legend">
              <span className="nx-prefs__legend-icon" aria-hidden="true">
                <FiMonitor size={15} />
              </span>
              Appearance
            </legend>

            <div className="nx-prefs__group">
              <p className="nx-prefs__group-title" id="nx-prefs-theme-title">Theme</p>
              <p className="nx-prefs__group-hint">
                Applies immediately — the same switch as in your avatar menu.
              </p>
              <div className="nx-prefs__options" role="radiogroup" aria-labelledby="nx-prefs-theme-title">
                {THEME_OPTIONS.map((option) => (
                  <RadioOption
                    key={option.value}
                    name="prefs-theme"
                    value={option.value}
                    checked={theme === option.value}
                    onChange={(event) => setTheme(event.target.value)}
                    title={option.title}
                    hint={option.hint}
                  />
                ))}
              </div>
            </div>

            <div className="nx-prefs__group">
              <p className="nx-prefs__group-title" id="nx-prefs-density-title">Row density</p>
              <div className="nx-prefs__options" role="radiogroup" aria-labelledby="nx-prefs-density-title">
                {DENSITY_OPTIONS.map((option) => (
                  <RadioOption
                    key={option.value}
                    name="prefs-density"
                    value={option.value}
                    checked={values.density === option.value}
                    onChange={setField('density')}
                    onBlur={blurField('density')}
                    title={option.title}
                    hint={option.hint}
                  />
                ))}
              </div>
              {errorFor('density') ? (
                <p className="nx-prefs__error" role="alert">{errorFor('density')}</p>
              ) : null}
            </div>

            <div className="nx-prefs__group">
              <Input
                as="select"
                label="Default rows per page"
                name="defaultPageSize"
                options={PAGE_SIZE_OPTIONS}
                value={values.defaultPageSize}
                onChange={setField('defaultPageSize')}
                onBlur={blurField('defaultPageSize')}
                error={errorFor('defaultPageSize')}
                hint="What the audit log starts on; its footer can still change it."
                required
              />
            </div>
          </fieldset>
        </Card>

        <Card padding="lg">
          <fieldset className="nx-prefs__fieldset">
            <legend className="nx-prefs__legend">
              <span className="nx-prefs__legend-icon" aria-hidden="true">
                <FiBell size={15} />
              </span>
              Notifications
            </legend>

            <div className="nx-prefs__group">
              <p className="nx-prefs__group-title" id="nx-prefs-channels-title">Tell me about</p>
              <p className="nx-prefs__group-hint">
                Delivery channels for workspace alerts. This demo has no mail or SMS service behind
                them — every alert still lands in the bell menu.
              </p>
              <div className="nx-prefs__toggles" role="group" aria-labelledby="nx-prefs-channels-title">
                <ToggleOption
                  label="Email"
                  hint="Payment, invoice and security summaries."
                  checked={values.notifyEmail}
                  onChange={toggleField('notifyEmail')}
                />
                <ToggleOption
                  label="In-app"
                  hint="The bell menu in the navbar — on by default."
                  checked={values.notifyInApp}
                  onChange={toggleField('notifyInApp')}
                />
                <ToggleOption
                  label="SMS"
                  hint="Reserved for critical billing and security events."
                  checked={values.notifySms}
                  onChange={toggleField('notifySms')}
                />
              </div>
            </div>
          </fieldset>
        </Card>

        <Card padding="lg">
          <fieldset className="nx-prefs__fieldset">
            <legend className="nx-prefs__legend">
              <span className="nx-prefs__legend-icon" aria-hidden="true">
                <FiGlobe size={15} />
              </span>
              Language &amp; formats
            </legend>

            <div className="grid grid--2">
              <Input
                as="select"
                label="Language"
                name="language"
                options={LANGUAGE_OPTIONS}
                value={values.language}
                onChange={setField('language')}
                onBlur={blurField('language')}
                error={errorFor('language')}
                hint="English is the only language shipped with this demo."
                required
              />

              <Input
                as="select"
                label="Date format"
                name="dateFormat"
                options={DATE_FORMAT_OPTIONS}
                value={values.dateFormat}
                onChange={setField('dateFormat')}
                onBlur={blurField('dateFormat')}
                error={errorFor('dateFormat')}
                hint="Stored with your preferences; tables still format with the tenant's own preset."
                required
              />

              <Input
                as="select"
                label="Number format"
                name="numberFormat"
                options={NUMBER_FORMAT_OPTIONS}
                value={values.numberFormat}
                onChange={setField('numberFormat')}
                onBlur={blurField('numberFormat')}
                error={errorFor('numberFormat')}
                hint="Stored for this demo; tables always group thousands."
                required
              />
            </div>
          </fieldset>
        </Card>

        <div className="nx-prefs__actions">
          <Button type="button" variant="ghost" onClick={handleReset} disabled={!isDirty}>
            Discard changes
          </Button>
          <Button type="submit" variant="primary" leftIcon={<FiCheck size={15} />}>
            Save preferences
          </Button>
        </div>
      </form>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * LOCAL PIECES
 * Kept at the bottom like DataTable's rows: both controls are nothing but a
 * native input plus the styled mark beside it, so the label stays clickable
 * and the checked state is never communicated by colour alone.
 * ---------------------------------------------------------------------- */
function RadioOption({ name, value, checked, onChange, onBlur, title, hint }) {
  return (
    <label className="nx-prefs__option">
      <input
        className="nx-prefs__radio"
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        onBlur={onBlur}
      />
      <span className="nx-prefs__radio-mark" aria-hidden="true" />
      <span className="nx-prefs__option-body">
        <span className="nx-prefs__option-title">{title}</span>
        <span className="nx-prefs__option-hint">{hint}</span>
      </span>
    </label>
  );
}

function ToggleOption({ label, hint, checked, onChange }) {
  return (
    <label className="nx-prefs__toggle">
      <input className="nx-prefs__check" type="checkbox" checked={checked} onChange={onChange} />
      <span className="nx-prefs__check-mark" aria-hidden="true">
        <FiCheck size={12} />
      </span>
      <span className="nx-prefs__option-body">
        <span className="nx-prefs__option-title">{label}</span>
        <span className="nx-prefs__option-hint">{hint}</span>
      </span>
    </label>
  );
}
