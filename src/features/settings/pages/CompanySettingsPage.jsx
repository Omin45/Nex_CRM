/**
 * ArkCRM — CompanySettingsPage
 * ---------------------------------------------------------------------------
 * The company details form (route suffix `settings/company`). Values are
 * prefilled from the session tenant, because that is the only place the mock
 * keeps them — there is no settings GET/PUT endpoint yet.
 *
 * Saving therefore does two honest things at once: it writes the fields into
 * the session tenant (so they stick for this tab and survive a reload via the
 * persisted tenant blob), and it says so in the toast. Claiming a server round
 * trip that never happened would be the easy lie; this page does not tell it.
 *
 * Validation reuses utils/validators (validateForm + the shared primitives)
 * with the same show-on-blur / re-check-after-first-error rhythm as AuthPage,
 * so nobody is scolded for a half-typed name while typing.
 */

import { useMemo, useState } from 'react';
import {
  FiBriefcase, FiCheck, FiClock, FiDollarSign, FiFileText, FiGlobe, FiHash, FiInfo,
} from 'react-icons/fi';
import Button from '@/components/ui/Button/Button';
import Card from '@/components/ui/Card/Card';
import Input from '@/components/ui/Input/Input';
import { useTenant } from '@/hooks/useTenant';
import { useNotify } from '@/hooks/useNotification';
import { CURRENCY_CODES, CURRENCY_OPTIONS } from '@/config/currencies.config';
import {
  countryCode, maxLength, minLength, oneOf, required, validateForm,
} from '@/utils/validators';
import './CompanySettingsPage.css';

/* A curated list rather than the full IANA database: these are the markets
   the demo tenants sit in. The active value is always merged in first, so a
   tenant on an unlisted zone never sees its own timezone disappear. */
const TIMEZONE_OPTIONS = [
  'Africa/Lagos',
  'Africa/Accra',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'Asia/Dubai',
];

const COUNTRY_OPTIONS = [
  { value: 'NG', label: 'Nigeria' },
  { value: 'GH', label: 'Ghana' },
  { value: 'KE', label: 'Kenya' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'AE', label: 'United Arab Emirates' },
];

const COMPANY_SCHEMA = {
  businessName: [required, (value) => minLength(value, 2)],
  registrationNumber: [(value) => maxLength(value, 32)],
  taxNumber: [(value) => maxLength(value, 32)],
  currency: [required, (value) => oneOf(value, CURRENCY_CODES)],
  timezone: [required],
  country: [required, countryCode],
};

const labeliseZone = (zone) => zone.replace(/_/g, ' ');

export default function CompanySettingsPage() {
  const notify = useNotify();
  const { tenant, currency, timezone, country, switchTenant } = useTenant();

  const [values, setValues] = useState(() => ({
    businessName: tenant?.name ?? '',
    registrationNumber: tenant?.registrationNumber ?? '',
    taxNumber: tenant?.taxNumber ?? '',
    currency,
    timezone,
    country,
  }));

  /* The last set of values that was "saved". Keeping it lets the form know it
     is clean without a deep-compare against the tenant, which may legitimately
     carry fields this form does not edit. */
  const [savedValues, setSavedValues] = useState(values);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const isDirty = useMemo(
    () => Object.keys(values).some((key) => values[key] !== savedValues[key]),
    [values, savedValues],
  );

  const zoneOptions = useMemo(() => {
    const options = TIMEZONE_OPTIONS.map((zone) => ({ value: zone, label: labeliseZone(zone) }));
    return options.some((option) => option.value === values.timezone)
      ? options
      : [{ value: values.timezone, label: labeliseZone(values.timezone) }, ...options];
  }, [values.timezone]);

  const nationOptions = useMemo(() => (
    COUNTRY_OPTIONS.some((option) => option.value === values.country)
      ? COUNTRY_OPTIONS
      : [{ value: values.country, label: values.country }, ...COUNTRY_OPTIONS]
  ), [values.country]);

  const setField = (field) => (event) => {
    const { value } = event.target;
    setValues((prev) => ({ ...prev, [field]: value }));

    /* Re-validate only fields that have already shown an error, so the form
       stays quiet while someone is still typing. */
    if (touched[field]) {
      const { errors: nextErrors } = validateForm({ ...values, [field]: value }, COMPANY_SCHEMA);
      setErrors((prev) => ({ ...prev, [field]: nextErrors[field] ?? '' }));
    }
  };

  const blurField = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const { errors: nextErrors } = validateForm(values, COMPANY_SCHEMA);
    setErrors((prev) => ({ ...prev, [field]: nextErrors[field] ?? '' }));
  };

  const errorFor = (field) => (touched[field] ? errors[field] : '');

  const handleSubmit = (event) => {
    event.preventDefault();

    setTouched(Object.keys(COMPANY_SCHEMA).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    const { valid, errors: nextErrors } = validateForm(values, COMPANY_SCHEMA);
    setErrors(nextErrors);
    if (!valid) {
      notify.error('Fix the highlighted fields before saving.');
      return;
    }

    if (!isDirty) {
      notify.info('No changes to save.');
      return;
    }

    /* No tenant means no workspace to save against — better to say that than
       to mint a half-empty tenant object that would break the vendor path. */
    if (!tenant) {
      notify.error('There is no active workspace to save these details against.');
      return;
    }

    switchTenant({ ...tenant, ...values });
    setSavedValues(values);
    
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
          <h1 className="page__title">Company settings</h1>
          <p className="page__subtitle">
            The identity and regional defaults this workspace bills, reports and files taxes with.
          </p>
        </div>
      </div>

      <form className="page__body nx-company__form" onSubmit={handleSubmit} noValidate>
        <div className="nx-alert nx-alert--info nx-company__note" role="note">
          <span className="nx-alert__icon" aria-hidden="true">
            <FiInfo size={16} />
          </span>
          Saved details are stored with your session in this browser. The demo API has no settings
          endpoint yet, so they are never transmitted.
        </div>

        <Card padding="lg">
          <div className="page__section">
            <h2 className="page__section-title">Business details</h2>

            <div className="grid grid--2">
              <Input
                label="Business name"
                name="businessName"
                autoComplete="organization"
                placeholder="Meridian Systems Nigeria"
                leftIcon={<FiBriefcase size={15} />}
                value={values.businessName}
                onChange={setField('businessName')}
                onBlur={blurField('businessName')}
                error={errorFor('businessName')}
                hint="Appears on invoices, quotes and receipts."
                required
              />

              <Input
                label="Registration number"
                name="registrationNumber"
                placeholder="RC-1482093"
                leftIcon={<FiHash size={15} />}
                value={values.registrationNumber}
                onChange={setField('registrationNumber')}
                onBlur={blurField('registrationNumber')}
                error={errorFor('registrationNumber')}
                hint="Company registry reference, e.g. RC-1482093."
              />

              <Input
                label="Tax number"
                name="taxNumber"
                placeholder="TIN-20984711"
                leftIcon={<FiFileText size={15} />}
                value={values.taxNumber}
                onChange={setField('taxNumber')}
                onBlur={blurField('taxNumber')}
                error={errorFor('taxNumber')}
                hint="Printed in the tax block of your documents."
              />
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <div className="page__section">
            <h2 className="page__section-title">Regional defaults</h2>

            <div className="grid grid--2">
              <Input
                label="Base currency"
                name="currency"
                as="select"
                leftIcon={<FiDollarSign size={15} />}
                options={CURRENCY_OPTIONS}
                value={values.currency}
                onChange={setField('currency')}
                onBlur={blurField('currency')}
                error={errorFor('currency')}
                hint="Every balance and report is converted into this currency."
                required
              />

              <Input
                label="Timezone"
                name="timezone"
                as="select"
                leftIcon={<FiClock size={15} />}
                options={zoneOptions}
                value={values.timezone}
                onChange={setField('timezone')}
                onBlur={blurField('timezone')}
                error={errorFor('timezone')}
                hint="Dates, reminders and audit timestamps use this zone."
                required
              />

              <Input
                label="Country"
                name="country"
                as="select"
                leftIcon={<FiGlobe size={15} />}
                options={nationOptions}
                value={values.country}
                onChange={setField('country')}
                onBlur={blurField('country')}
                error={errorFor('country')}
                hint="Two-letter ISO code, used for tax presets."
                required
              />
            </div>
          </div>
        </Card>

        <div className="nx-company__actions">
          <Button type="button" variant="ghost" onClick={handleReset} disabled={!isDirty}>
            Discard changes
          </Button>
          <Button type="submit" variant="primary" leftIcon={<FiCheck size={15} />}>
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
