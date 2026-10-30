/**
 * NexERP — AuthPage
 * ---------------------------------------------------------------------------
 * One component serving both /login and /register.
 *
 * Why one component rather than two pages: the spec calls for a persistent
 * two-column brand panel on the left and an animated swap between Login and
 * Sign Up. If those were two routes rendering two different page components, the
 * brand panel would unmount and remount on every swap — the animated logo
 * would restart and the left column would flash. Mounted here, only the right
 * column changes.
 *
 * The form itself *does* animate between modes: a max-height/opacity
 * transition keyed on `mode`, with the incoming panel absolutely positioned so
 * the container does not jump. That is in AuthPage.css.
 *
 * Validation reuses the shared schemas in utils/validators.js — the same rules
 * the API would apply — and shows errors on blur and on submit, never during
 * first-time typing.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiEye, FiEyeOff, FiLock, FiMail, FiUser, FiPhone, FiBriefcase, FiCheck, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import PasswordStrength from '../components/PasswordStrength';
import { useLoginMutation, useRegisterMutation } from '../api/authApi';
import { useAuth } from '@/hooks/useAuth';
import { useNotify } from '@/hooks/useNotification';
import { useVendorHome } from '@/hooks/useVendorPath';
import { validateForm, schemas } from '@/utils/validators';
import { appRoutes } from '@/config/navigation.config';
import { ROLES, ROLE_LABELS } from '@/config/permissions.config';
import { demoAccounts, DEMO_PASSWORD } from '@/config/demoAccounts';
import { USE_MOCK_API } from '@/config/constants';
import './AuthPage.css';

/** Tiles shown before "show all" is expanded — enough to cover the main roles. */
const DEMO_PREVIEW_COUNT = 4;

/**
 * The roles a visitor can open a workspace as. The platform role (SUPER_ADMIN)
 * is deliberately absent — it is provisioned internally, not self-served — so
 * this list is the tenant roles, in the order a new owner is most likely to
 * pick.
 */
const REGISTER_ROLE_OPTIONS = [
  ROLES.VENDOR_OWNER,
  ROLES.VENDOR_ADMIN,
  ROLES.ACCOUNTANT,
  ROLES.SALES_MANAGER,
  ROLES.SALES_REP,
  ROLES.WAREHOUSE_MANAGER,
  ROLES.HR_MANAGER,
  ROLES.SUPPORT_AGENT,
  ROLES.AUDITOR,
  ROLES.EMPLOYEE,
].map((value) => ({ value, label: ROLE_LABELS[value] ?? value }));

const LOGIN_INITIAL = { email: '', password: '', rememberMe: true };

const REGISTER_INITIAL = {
  fullName: '',
  email: '',
  phone: '',
  businessName: '',
  role: ROLES.VENDOR_OWNER,
  password: '',
  confirmPassword: '',
  acceptTerms: false,
};

/** Copy per mode, so the swap changes the heading and CTA with the fields. */
const MODE_COPY = {
  login: {
    title: 'Welcome back',
    subtitle: 'Sign in to your workspace.',
    cta: 'Sign in',
    switchPrompt: 'New to NexERP?',
    switchLabel: 'Create an account',
    switchTo: 'register',
  },
  register: {
    title: 'Create your workspace',
    subtitle: 'Two minutes to set up, and your data can follow you in.',
    cta: 'Create account',
    switchPrompt: 'Already have an account?',
    switchLabel: 'Sign in',
    switchTo: 'login',
  },
};

/** Friendly text per HTTP status, so the banner is never raw JSON. */
function describeError(error, mode) {
  if (!error) return null;
  const { status } = error;

  if (status === 401 || status === 400) {
    return mode === 'login'
      ? 'That email and password combination did not match an account.'
      : 'We could not create that account. Check the details and try again.';
  }
  if (status === 403) return 'This account has been suspended. Contact your administrator.';
  if (status === 409) return 'An account already exists with that email address.';
  if (status === 429) return 'Too many attempts. Wait a minute and try again.';
  if (status >= 500) return 'The server had a problem. Try again in a moment.';
  return error.data?.message ?? 'Something went wrong. Please try again.';
}

export default function AuthPage({ mode = 'login' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearError } = useAuth();
  const notify = useNotify();
  const vendorHome = useVendorHome();

  const isRegister = mode === 'register';
  const copy = MODE_COPY[mode] ?? MODE_COPY.login;

  const [loginValues, setLoginValues] = useState(LOGIN_INITIAL);
  const [registerValues, setRegisterValues] = useState(REGISTER_INITIAL);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showAllDemo, setShowAllDemo] = useState(false);
  const [login, { isLoading: isLoggingIn, error: loginError }] = useLoginMutation();
  const [register, { isLoading: isRegistering, error: registerError }] = useRegisterMutation();

  /* Both form states survive a mode swap, so a half-filled sign-up form is not
     destroyed by a detour to the login tab. The *errors* do not survive —
     showing "this email is required" on a different form is noise. */
  useEffect(() => {
    setErrors({});
    setTouched({});
    setShowPassword(false);
    clearError();
  }, [mode, clearError]);

  const isBusy = isLoggingIn || isRegistering;
  const serverError = useMemo(
    () => describeError(isRegister ? registerError : loginError, mode),
    [isRegister, registerError, loginError, mode],
  );

  /* Values and schema for whichever form is on screen. One setField/blurField
     pair serves both, which is why they read `values` rather than closing over
     a mode-specific object. */
  const values = isRegister ? registerValues : loginValues;
  const schema = isRegister ? schemas.register : schemas.login;

  const setField = (field) => (event) => {
    const { value, checked, type } = event.target;
    const next = type === 'checkbox' ? checked : value;

    if (isRegister) setRegisterValues((prev) => ({ ...prev, [field]: next }));
    else setLoginValues((prev) => ({ ...prev, [field]: next }));

    /* Re-validate only a field that has already shown an error, so the form
       does not shout while someone is still typing their email. */
    if (touched[field]) {
      const { errors: nextErrors } = validateForm(
        isRegister ? { ...registerValues, [field]: next } : { ...loginValues, [field]: next },
        schema,
      );
      setErrors((prev) => ({ ...prev, [field]: nextErrors[field] ?? '' }));
    }
  };

  const blurField = (field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const { errors: nextErrors } = validateForm(values, schema);
    setErrors((prev) => ({ ...prev, [field]: nextErrors[field] ?? '' }));
  };

  /* The role picker is a set of buttons rather than an <input>, so it cannot
     ride the shared setField handler. Selecting a role clears its error. */
  const chooseRole = (role) => {
    setRegisterValues((prev) => ({ ...prev, role }));
    setTouched((prev) => ({ ...prev, role: true }));
    setErrors((prev) => ({ ...prev, role: '' }));
  };

  /**
   * Where to go after a successful auth, in order of preference:
   *   1. the page the guard bounced the user off, if there was one
   *   2. the platform admin area for a SUPER_ADMIN
   *   3. this vendor's dashboard
   */
  const destinationFor = (user) => {
    const from = typeof location.state?.from === 'string' ? location.state.from : null;
    if (from && from !== appRoutes.login && from !== appRoutes.register) return from;
    if (user?.role === 'SUPER_ADMIN') return appRoutes.admin.index;
    return vendorHome;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    /* Mark everything the schema touches, so submit shows the full picture. */
    setTouched(
      Object.keys(schema).reduce((acc, key) => ({ ...acc, [key]: true }), {}),
    );

    const { valid, errors: nextErrors } = validateForm(values, schema);
    setErrors(nextErrors);
    if (!valid) return;

    try {
      if (isRegister) {
        const result = await register({
          fullName: registerValues.fullName.trim(),
          email: registerValues.email.trim(),
          phone: registerValues.phone.trim(),
          businessName: registerValues.businessName.trim(),
          role: registerValues.role,
          password: registerValues.password,
        }).unwrap();

        notify.success('Workspace created. Welcome to NexERP.');
        navigate(destinationFor(result?.user), { replace: true });
        return;
      }

      const result = await login({
        email: loginValues.email.trim(),
        password: loginValues.password,
        rememberMe: loginValues.rememberMe,
      }).unwrap();

      notify.success(`Welcome back, ${result?.user?.firstName ?? loginValues.email.split('@')[0]}`);
      navigate(destinationFor(result?.user), { replace: true });
    } catch {
      /* Surfaced from `serverError`; nothing to do here. */
    }
  };

  const errorFor = (field) => (touched[field] ? errors[field] : '');

  /**
   * Fills the form from a demo tile. Deliberately does *not* auto-submit:
   * the tile is a convenience for picking an identity, and submitting a form
   * the user never had a chance to read is the kind of "helpfulness" that
   * costs trust. Anything of 6+ characters still works — the mock only reads
   * the email — but the tile fills the canonical password so a fresh visitor
   * never has to guess.
   */
  const applyDemoAccount = (account) => {
    setLoginValues((prev) => ({ ...prev, email: account.email, password: DEMO_PASSWORD }));
    setTouched((prev) => ({ ...prev, email: true, password: true }));
    setErrors((prev) => ({ ...prev, email: '', password: '' }));
    clearError();
  };

  const visibleDemoAccounts = showAllDemo
    ? demoAccounts
    : demoAccounts.slice(0, DEMO_PREVIEW_COUNT);

  return (
    <div className="nx-authpage" data-mode={mode}>
      <div className="nx-authpage__heading" key={`${mode}-heading`}>
        <h1 className="nx-authpage__title">{copy.title}</h1>
        <p className="nx-authpage__subtitle">{copy.subtitle}</p>
      </div>

      <form
        key={mode}
        className="nx-authpage__form"
        onSubmit={handleSubmit}
        noValidate
        aria-busy={isBusy}
      >
        {serverError ? (
          <div className="nx-alert nx-alert--error" role="alert">
            <span className="nx-alert__icon" aria-hidden="true">
              <FiAlertCircle size={16} />
            </span>
            {serverError}
          </div>
        ) : null}

        {/* ---------------- register fields ---------------- */}
        {isRegister ? (
          <>
            <Input
              label="Full name"
              name="fullName"
              autoComplete="name"
              placeholder="Adaeze Okonkwo"
              leftIcon={<FiUser size={15} />}
              value={registerValues.fullName}
              onChange={setField('fullName')}
              onBlur={blurField('fullName')}
              error={errorFor('fullName')}
              required
            />

            <Input
              label="Business name"
              name="businessName"
              autoComplete="organization"
              placeholder="Halcyon Trading"
              leftIcon={<FiBriefcase size={15} />}
              value={registerValues.businessName}
              onChange={setField('businessName')}
              onBlur={blurField('businessName')}
              error={errorFor('businessName')}
              required
            />

            <fieldset className="nx-authpage__roles">
              <legend className="nx-authpage__roles-legend">
                I am setting up as
              </legend>
              <div
                className="nx-authpage__role-chips"
                role="radiogroup"
                aria-label="Your role"
              >
                {REGISTER_ROLE_OPTIONS.map((option) => {
                  const isActive = registerValues.role === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      className="nx-authpage__role-chip"
                      data-active={isActive ? 'true' : undefined}
                      onClick={() => chooseRole(option.value)}
                    >
                      {isActive ? <FiCheck size={13} aria-hidden="true" /> : null}
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {errorFor('role') ? (
                <p className="nx-field__error" role="alert">
                  {errors.role}
                </p>
              ) : null}
            </fieldset>

            <Input
              label="Phone number"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+234 800 000 0000"
              leftIcon={<FiPhone size={15} />}
              value={registerValues.phone}
              onChange={setField('phone')}
              onBlur={blurField('phone')}
              error={errorFor('phone')}
              required
            />
          </>
        ) : null}

        <Input
          label="Work email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          leftIcon={<FiMail size={15} />}
          value={values.email}
          onChange={setField('email')}
          onBlur={blurField('email')}
          error={errorFor('email')}
          required
        />

        <div className="nx-authpage__password">
          <Input
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            leftIcon={<FiLock size={15} />}
            value={values.password}
            onChange={setField('password')}
            onBlur={blurField('password')}
            error={errorFor('password')}
            required
            rightIcon={
              <button
                type="button"
                className="nx-auth__reveal"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            }
          />

          {isRegister ? <PasswordStrength value={registerValues.password} /> : null}
        </div>

        {/* ---------------- register-only fields ---------------- */}
        {isRegister ? (
          <>
            <Input
              label="Confirm password"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              leftIcon={<FiLock size={15} />}
              value={registerValues.confirmPassword}
              onChange={setField('confirmPassword')}
              onBlur={blurField('confirmPassword')}
              error={errorFor('confirmPassword')}
              required
            />

            <label className="nx-check nx-authpage__terms">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={registerValues.acceptTerms}
                onChange={setField('acceptTerms')}
                onBlur={blurField('acceptTerms')}
                aria-invalid={errorFor('acceptTerms') ? 'true' : undefined}
              />
              <span>
                I agree to the <Link to={appRoutes.about}>terms of service</Link> and{' '}
                <Link to={appRoutes.about}>privacy policy</Link>.
              </span>
            </label>
            {errorFor('acceptTerms') ? (
              <p className="nx-field__error nx-authpage__terms-error" role="alert">
                {errors.acceptTerms}
              </p>
            ) : null}
          </>
        ) : (
          <div className="nx-form__row">
            <label className="nx-check">
              <input
                type="checkbox"
                name="rememberMe"
                checked={loginValues.rememberMe}
                onChange={setField('rememberMe')}
              />
              Keep me signed in on this device
            </label>

            <Link to={appRoutes.forgotPassword} className="nx-form__link">
              Forgot password?
            </Link>
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" fullWidth loading={isBusy}>
          {copy.cta}
        </Button>

        {/* Mock mode is only announced in development — it is a testing
            affordance, not something to ship. */}
        {import.meta.env.DEV ? (
          <p className="nx-authpage__dev-note">
            <FiCheck size={12} aria-hidden="true" />
            Mock mode is on — the email picks the account, any password of 6+ characters works.
          </p>
        ) : null}

        {/* ---- demo account picker (mock mode only) ---- */}
        {!isRegister && USE_MOCK_API ? (
          <div className="nx-authpage__demo">
            <div className="nx-authpage__demo-head">
              <span className="nx-authpage__demo-title">Sign in as…</span>
              <span className="nx-authpage__demo-hint">One account per role</span>
            </div>

            <ul className="nx-authpage__demo-list">
              {visibleDemoAccounts.map((account) => {
                const fullName = `${account.firstName} ${account.lastName}`;
                const isActive = loginValues.email === account.email;
                return (
                  <li key={account.key}>
                    <button
                      type="button"
                      className="nx-authpage__demo-tile"
                      data-active={isActive ? 'true' : undefined}
                      onClick={() => applyDemoAccount(account)}
                      aria-pressed={isActive}
                      title={`${account.email} · ${DEMO_PASSWORD}`}
                    >
                      <span className="nx-authpage__demo-avatar" aria-hidden="true">
                        {account.firstName[0]}
                        {account.lastName[0]}
                      </span>
                      <span className="nx-authpage__demo-copy">
                        <span className="nx-authpage__demo-name">{fullName}</span>
                        <span className="nx-authpage__demo-role">{account.jobTitle}</span>
                        <span className="nx-authpage__demo-blurb">{account.blurb}</span>
                      </span>
                      <span className="nx-authpage__demo-check" aria-hidden="true">
                        <FiCheck size={13} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {demoAccounts.length > DEMO_PREVIEW_COUNT ? (
              <button
                type="button"
                className="nx-authpage__demo-more"
                onClick={() => setShowAllDemo((prev) => !prev)}
                aria-expanded={showAllDemo}
              >
                {showAllDemo ? 'Fewer accounts' : `Show all ${demoAccounts.length} accounts`}
                {showAllDemo ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
              </button>
            ) : null}
          </div>
        ) : null}
      </form>

      {/* ---- mode switch ---- */}
      <p className="nx-authpage__switch">
        {copy.switchPrompt}{' '}
        <Link to={appRoutes[copy.switchTo]} className="nx-form__link">
          {copy.switchLabel}
        </Link>
      </p>
    </div>
  );
}
