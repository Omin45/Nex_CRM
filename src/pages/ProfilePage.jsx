/**
 * NexERP — ProfilePage
 * ---------------------------------------------------------------------------
 * The account screen: identity on the left, the editable contact record on the
 * right, security underneath. Both forms validate through the shared
 * validators, so the wording of an error matches the auth screens exactly.
 *
 * Two non-obvious decisions: the profile saves into the auth slice through
 * `updateProfile` (there is no separate profile endpoint), which is why the
 * identity card is a read-only mirror of that same state — edit the form and
 * the card updates with it. The password form has no endpoint either, so it
 * validates, resets itself and confirms with a toast instead of pretending to
 * call one.
 */

import { useEffect, useState } from 'react';
import {
  FiBriefcase, FiCheck, FiLock, FiMail, FiPhone, FiShield, FiUser,
} from 'react-icons/fi';
import Card from '@/components/ui/Card/Card';
import Badge from '@/components/ui/Badge/Badge';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import LoadingState from '@/components/feedback/LoadingState';
import PasswordStrength from '@/features/auth/components/PasswordStrength';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { useNotify } from '@/hooks/useNotification';
import { ROLE_LABELS } from '@/config/permissions.config';
import {
  validateForm, schemas, required, minLength, email, phone, password, confirmPassword,
} from '@/utils/validators';
import { formatDate } from '@/utils/date';
import './ProfilePage.css';

/* The editable record. Kept apart from the schema so a field can never be
   submitted without being validated, and vice versa. */
const PROFILE_SCHEMA = {
  firstName: [required, (value) => minLength(value, 2)],
  lastName: [required, (value) => minLength(value, 2)],
  email: [required, email],
  phone: [phone],
  jobTitle: [(value) => minLength(value, 2)],
};

function toFormValues(user) {
  return {
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    jobTitle: user?.jobTitle ?? '',
  };
}

export default function ProfilePage() {
  const notify = useNotify();
  const { user, role, updateProfile } = useAuth();
  const { tenant, tenantName } = useTenant();

  const [values, setValues] = useState(() => toFormValues(user));
  const [errors, setErrors] = useState({});
  const [passwordValues, setPasswordValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});

  /* Re-seed when the signed-in identity changes (sign-in, account switch) —
     keyed on the id, not the user object, so an unrelated profile update
     cannot wipe a half-typed form. */
  useEffect(() => {
    setValues(toFormValues(user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fullName =
    user?.fullName ?? [user?.firstName, user?.lastName].filter(Boolean).join(' ') ?? '';
  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase() || '?';
  const roleLabel = ROLE_LABELS[role] ?? role ?? 'No role assigned';
  /* The session carries no per-user join date, so the tenant's creation date
     stands in as "member since" — it is the moment this account's workspace
     came into being, which is the honest answer for a workspace account. */
  const memberSince = user?.createdAt ?? user?.joinDate ?? tenant?.createdAt ?? null;

  const handleChange = (field) => (event) => {
    const { value } = event.target;
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handlePasswordChange = (field) => (event) => {
    const { value } = event.target;
    setPasswordValues((prev) => ({ ...prev, [field]: value }));
    if (passwordErrors[field]) setPasswordErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleProfileSubmit = (event) => {
    event.preventDefault();

    const { valid, errors: nextErrors } = validateForm(values, PROFILE_SCHEMA);
    setErrors(nextErrors);
    if (!valid) return;

    /* fullName is denormalised across the app (nav, toasts, audit rows), so it
       is rebuilt here rather than left stale after a name change. */
    updateProfile({
      ...values,
      fullName: `${values.firstName} ${values.lastName}`.trim(),
    });
    notify.success('Profile saved', { message: 'Your account details are up to date.' });
  };

  const handlePasswordSubmit = (event) => {
    event.preventDefault();

    /* `schemas.register` carries the app-wide password policy; the confirmation
       rule is a factory, so it is closed over the live value here. */
    const { valid, errors: nextErrors } = validateForm(passwordValues, {
      currentPassword: [required],
      newPassword: schemas.register.password,
      confirmPassword: [required, confirmPassword(() => passwordValues.newPassword)],
    });
    setPasswordErrors(nextErrors);
    if (!valid) return;

    setPasswordValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
    notify.success('Password changed', {
      message: 'Use your new password the next time you sign in.',
    });
  };

  const handleDiscard = () => {
    setValues(toFormValues(user));
    setErrors({});
  };

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Account</span>
          <h1 className="page__title">Profile</h1>
          <p className="page__subtitle">
            Who you are in this workspace, the details your team sees, and how the account is
            protected.
          </p>
        </div>
      </div>

      <div className="page__body nx-profile">
        {!user ? (
          <LoadingState mode="spinner" label="Loading your account…" />
        ) : (
          <>
            <div className="grid grid--sidebar-left">
              {/* ---- identity: a read-only mirror of the session ---- */}
              <Card className="nx-profile__identity">
                <div className="nx-profile__avatar" aria-hidden="true">
                  <span className="nx-profile__initials">{initials}</span>
                </div>

                <p className="nx-profile__name">{fullName || '—'}</p>
                <p className="nx-profile__job">{user.jobTitle || 'No job title set'}</p>
                <Badge tone="accent" className="nx-profile__role">
                  {roleLabel}
                </Badge>

                <dl className="nx-profile__facts">
                  <div className="nx-profile__fact">
                    <dt className="kv__label">Email</dt>
                    <dd className="kv__value nx-profile__fact-value">{user.email}</dd>
                  </div>
                  <div className="nx-profile__fact">
                    <dt className="kv__label">Workspace</dt>
                    <dd className="kv__value nx-profile__fact-value">{tenantName}</dd>
                  </div>
                  <div className="nx-profile__fact">
                    <dt className="kv__label">Member since</dt>
                    <dd className="kv__value nx-profile__fact-value">
                      {formatDate(memberSince, 'long')}
                    </dd>
                  </div>
                </dl>
              </Card>

              {/* ---- editable contact record ---- */}
              <Card className="nx-profile__card">
                <form className="nx-profile__form" onSubmit={handleProfileSubmit} noValidate>
                  <div className="nx-profile__form-head">
                    <h2 className="nx-profile__form-title">Contact details</h2>
                    <p className="nx-profile__form-hint">
                      Your name and email are how invoices, audit entries and mentions appear to
                      everyone else.
                    </p>
                  </div>

                  <div className="nx-profile__fields">
                    <Input
                      label="First name"
                      name="firstName"
                      autoComplete="given-name"
                      leftIcon={<FiUser size={15} />}
                      value={values.firstName}
                      onChange={handleChange('firstName')}
                      error={errors.firstName}
                      required
                    />
                    <Input
                      label="Last name"
                      name="lastName"
                      autoComplete="family-name"
                      leftIcon={<FiUser size={15} />}
                      value={values.lastName}
                      onChange={handleChange('lastName')}
                      error={errors.lastName}
                      required
                    />
                    <Input
                      label="Email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      leftIcon={<FiMail size={15} />}
                      value={values.email}
                      onChange={handleChange('email')}
                      error={errors.email}
                      required
                    />
                    <Input
                      label="Phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      leftIcon={<FiPhone size={15} />}
                      value={values.phone}
                      onChange={handleChange('phone')}
                      error={errors.phone}
                      hint="Nigerian or international format"
                    />
                    <Input
                      label="Job title"
                      name="jobTitle"
                      autoComplete="organization-title"
                      leftIcon={<FiBriefcase size={15} />}
                      value={values.jobTitle}
                      onChange={handleChange('jobTitle')}
                      error={errors.jobTitle}
                      containerClassName="nx-profile__field--wide"
                    />
                  </div>

                  <div className="nx-profile__actions">
                    <Button type="submit" leftIcon={<FiCheck size={15} />}>
                      Save changes
                    </Button>
                    <Button variant="ghost" onClick={handleDiscard}>
                      Discard changes
                    </Button>
                  </div>
                </form>
              </Card>
            </div>

            {/* ---- security ---- */}
            <section className="page__section nx-profile__security">
              <h2 className="page__section-title">Security</h2>

              <Card>
                <div className="nx-profile__security-grid">
                  <form
                    className="nx-profile__password"
                    onSubmit={handlePasswordSubmit}
                    noValidate
                  >
                    <div className="nx-profile__form-head">
                      <h3 className="nx-profile__form-title">Change password</h3>
                      <p className="nx-profile__form-hint">
                        Eight characters minimum, with a mix of cases, a number and a symbol.
                      </p>
                    </div>

                    <Input
                      label="Current password"
                      name="currentPassword"
                      type="password"
                      autoComplete="current-password"
                      leftIcon={<FiLock size={15} />}
                      value={passwordValues.currentPassword}
                      onChange={handlePasswordChange('currentPassword')}
                      error={passwordErrors.currentPassword}
                      required
                    />

                    <div>
                      <Input
                        label="New password"
                        name="newPassword"
                        type="password"
                        autoComplete="new-password"
                        leftIcon={<FiLock size={15} />}
                        value={passwordValues.newPassword}
                        onChange={handlePasswordChange('newPassword')}
                        error={passwordErrors.newPassword}
                        required
                      />
                      <PasswordStrength value={passwordValues.newPassword} />
                    </div>

                    <Input
                      label="Confirm new password"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      leftIcon={<FiLock size={15} />}
                      value={passwordValues.confirmPassword}
                      onChange={handlePasswordChange('confirmPassword')}
                      error={passwordErrors.confirmPassword}
                      required
                    />

                    <div className="nx-profile__actions">
                      <Button type="submit" leftIcon={<FiCheck size={15} />}>
                        Update password
                      </Button>
                    </div>
                  </form>

                  {/* The MFA state is spelled out in words next to the pill:
                      "Enabled"/"Disabled" carries the status without colour. */}
                  <div className="nx-profile__mfa">
                    <span className="nx-profile__mfa-icon" aria-hidden="true">
                      <FiShield size={18} />
                    </span>
                    <div className="nx-profile__mfa-copy">
                      <p className="nx-profile__mfa-title">Two-factor authentication</p>
                      <p className="nx-profile__mfa-text">
                        {user.mfaEnabled
                          ? 'On — a code from your authenticator app is required at sign-in.'
                          : 'Off — this account is protected by its password alone.'}
                      </p>
                    </div>
                    <Badge tone={user.mfaEnabled ? 'success' : 'warning'}>
                      {user.mfaEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </Card>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
