/**
 * ArkCRM — AuthPage
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
import {
  FiAlertCircle, FiBriefcase, FiCheck, FiEye, FiEyeOff,
  FiLock, FiMail, FiPhone, FiUser, FiUsers,
} from 'react-icons/fi';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import PasswordStrength from '../components/PasswordStrength';
import { useLoginMutation, useRegisterMutation } from '../api/authApi';
import { useLazyLookupTenantQuery } from '@/features/tenants/api/tenantsApi';
import { useAuth } from '@/hooks/useAuth';
import { useNotify } from '@/hooks/useNotification';
import { useVendorHome } from '@/hooks/useVendorPath';
import { validateForm, schemas } from '@/utils/validators';
import { appRoutes } from '@/config/navigation.config';
import { ROLES, ROLE_LABELS } from '@/config/permissions.config';

import { USE_MOCK_API } from '@/config/constants';
import './AuthPage.css';
import { serverMessage } from '@/utils/errorMessage';


/**
 * The roles somebody may *join* an existing workspace under.
 *
 * The administrator roles are absent on purpose: a workspace's administrator
 * is the owner's to hand out, not something a self-service sign-up can claim.
 * The customer role is a portal login for a customer of the business rather
 * than a member of its staff, so it is not here either.
 *
 * This mirrors the backend's joinable set exactly. The server refuses
 * anything else, so offering more would only be a lie.
 */
const JOIN_ROLE_OPTIONS = [
  ROLES.MANAGER,
  ROLES.SALES_MANAGER,
  ROLES.SALES_AGENT,
  ROLES.ACCOUNTANT,
  ROLES.FINANCE_MANAGER,
  ROLES.SUPPORT_MANAGER,
  ROLES.SUPPORT_AGENT,
].map((value) => ({ value, label: ROLE_LABELS[value] ?? value }));

/** The steps of the sign-up flow, in order. */
const REGISTER_STEPS = ['mode', 'workspace', 'account'];

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
    switchPrompt: 'New to ArkCRM?',
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

  /* The server says why it refused. For a sign-up that reason is the whole
     point — "that business name is taken" is only useful if it is shown. */
  const fromServer = serverMessage(error, '');

  if (status === 401 || status === 400) {
    if (mode === 'login') {
      return 'That email and password combination did not match an account.';
    }
    return fromServer || 'We could not create that account. Check the details and try again.';
  }
  if (status === 403) return fromServer || 'This account has been suspended. Contact your administrator.';
  if (status === 409) return fromServer || 'An account already exists with that email address.';
  if (status === 429) return 'Too many attempts. Wait a minute and try again.';
  if (status >= 500) return fromServer || 'The server had a problem. Try again in a moment.';
  return fromServer || 'Something went wrong. Please try again.';
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

  /* The sign-up flow: how you are joining, then which workspace, then your
     own details. Each step is a gate — you cannot reach the next one until
     the current one makes sense. */
  const [registerStep, setRegisterStep] = useState(REGISTER_STEPS[0]);
  const [joinMode, setJoinMode] = useState(null);
  const [tenantCode, setTenantCode] = useState('');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const [login, { isLoading: isLoggingIn, error: loginError }] = useLoginMutation();
  const [register, { isLoading: isRegistering, error: registerError }] = useRegisterMutation();
  /* The workspace lookup is lazy: it only runs when a joiner asks it to. */
  const [lookupTenant] = useLazyLookupTenantQuery();

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

  /* ---- the workspace step ------------------------------------------- */

  const chooseJoinMode = (choice) => {
    setJoinMode(choice);
    setRegisterValues((prev) => ({ ...prev, businessName: '', role: '' }));
    setRegisterStep('workspace');
  };

  const backToMode = () => {
    setRegisterStep('mode');
    setJoinMode(null);
  };

  const backToWorkspace = () => {
    setRegisterStep('workspace');
  };

  /**
   * The join check.
   *
   * <p>Asking by name only confirms that the business exists — the server
   * hands back no id and no code, because the name is not the secret. The
   * join code is what proves you are allowed in, so the step cannot be
   * completed without it.
   */
  const lookupWorkspace = async () => {
    const name = registerValues.businessName.trim();
    if (!name) {
      setErrors((prev) => ({ ...prev, businessName: 'Type your business name first.' }));
      setTouched((prev) => ({ ...prev, businessName: true }));
      return;
    }

    try {
      const found = await lookupTenant({ name }).unwrap();
      if (!found?.exists) {
        setErrors((prev) => ({
          ...prev,
          businessName: 'We could not find a business with that name.',
        }));
        setTouched((prev) => ({ ...prev, businessName: true }));
        return;
      }
      /* The business exists. The code still has to be given. */
      setErrors((prev) => ({ ...prev, businessName: '' }));
      setRegisterStep('account');
    } catch {
      setErrors((prev) => ({
        ...prev,
        businessName: 'We could not check that name just now. Try again.',
      }));
      setTouched((prev) => ({ ...prev, businessName: true }));
    }
  };

  const continueFromWorkspace = () => {
    if (joinMode === 'joiner') {
      if (!tenantCode.trim()) {
        setErrors((prev) => ({ ...prev, tenantCode: 'Enter the join code your team gave you.' }));
        setTouched((prev) => ({ ...prev, tenantCode: true }));
        return;
      }
    } else if (!registerValues.businessName.trim()) {
      setErrors((prev) => ({ ...prev, businessName: 'Give your business a name.' }));
      setTouched((prev) => ({ ...prev, businessName: true }));
      return;
    }
    setRegisterStep('account');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    /* Mark everything the schema touches, so submit shows the full picture. */
    setTouched(
      Object.keys(schema).reduce((acc, key) => ({ ...acc, [key]: true }), {}),
    );

    /* Which fields matter depends on how the visitor is joining: a joiner
       has no business name of their own, and an owner has no role to pick
       because running the workspace is the whole point. */
    const activeSchema = isRegister
      ? joinMode === 'joiner'
        ? { ...schemas.register, businessName: [] }
        : { ...schemas.register, role: [] }
      : schema;

    const { valid, errors: nextErrors } = validateForm(values, activeSchema);
    setErrors(nextErrors);
    if (!valid) return;

    try {
      if (isRegister) {
        const result = await register({
          fullName: registerValues.fullName.trim(),
          email: registerValues.email.trim(),
          phone: registerValues.phone.trim(),
          password: registerValues.password,
          /* An owner creates the workspace; a joiner brings its code and the
             role they are joining under. */
          mode: joinMode ?? 'owner',
          businessName: joinMode === 'joiner' ? '' : registerValues.businessName.trim(),
          tenantCode: joinMode === 'joiner' ? tenantCode.trim() : '',
          role: joinMode === 'joiner' ? registerValues.role : '',
        }).unwrap();

        notify.success(
          joinMode === 'joiner'
            ? `Welcome to ${result?.tenant?.name ?? 'your workspace'}.`
            : 'Workspace created. Welcome to ArkCRM.',
        );
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

        {/* ---------------- register: the three steps ---------------- */}
        {isRegister ? (
          <>
            {/* Step 1 — how are you joining? */}
            {registerStep === 'mode' ? (
              <fieldset className="nx-authpage__join">
                <legend className="nx-authpage__roles-legend">
                  How are you joining?
                </legend>
                <div className="nx-authpage__join-cards">
                  <button
                    type="button"
                    className="nx-authpage__join-card"
                    onClick={() => chooseJoinMode('owner')}
                  >
                    <span className="nx-authpage__join-icon" aria-hidden="true">
                      <FiBriefcase size={18} />
                    </span>
                    <strong>I&apos;m starting a business</strong>
                    <span>
                      We&apos;ll set up a new workspace and you&apos;ll run it. You can share a
                      join code with your team afterwards.
                    </span>
                  </button>
                  <button
                    type="button"
                    className="nx-authpage__join-card"
                    onClick={() => chooseJoinMode('joiner')}
                  >
                    <span className="nx-authpage__join-icon" aria-hidden="true">
                      <FiUsers size={18} />
                    </span>
                    <strong>I&apos;m joining a business</strong>
                    <span>
                      Your company is already set up here. You&apos;ll need its join code to
                      come in.
                    </span>
                  </button>
                </div>
              </fieldset>
            ) : null}

            {/* Step 2 — which workspace? */}
            {registerStep === 'workspace' ? (
              <>
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

                {joinMode === 'joiner' ? (
                  <Input
                    label="Join code"
                    name="tenantCode"
                    placeholder="VOL-0001"
                    leftIcon={<FiCheck size={15} />}
                    value={tenantCode}
                    onChange={(event) => {
                      setTenantCode(event.target.value);
                      setErrors((prev) => ({ ...prev, tenantCode: '' }));
                    }}
                    error={errorFor('tenantCode')}
                    hint="Your team lead has this. It looks like ABC-1234."
                    required
                  />
                ) : (
                  <p className="nx-authpage__hint">
                    We&apos;ll create this workspace for you and give you a join code to share
                    with your team.
                  </p>
                )}

                <div className="nx-authpage__nav">
                  <Button variant="ghost" onClick={backToMode}>
                    Back
                  </Button>
                  {joinMode === 'joiner' ? (
                    <Button variant="primary" onClick={lookupWorkspace}>
                      Find business
                    </Button>
                  ) : (
                    <Button variant="primary" onClick={continueFromWorkspace}>
                      Continue
                    </Button>
                  )}
                </div>
              </>
            ) : null}

            {/* Step 3 — your details. */}
            {registerStep === 'account' ? (
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

                {joinMode === 'joiner' ? (
                  <fieldset className="nx-authpage__roles">
                    <legend className="nx-authpage__roles-legend">
                      You are joining as
                    </legend>
                    <div
                      className="nx-authpage__role-chips"
                      role="radiogroup"
                      aria-label="Your role"
                    >
                      {JOIN_ROLE_OPTIONS.map((option) => {
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
                ) : null}

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
                    autoComplete="new-password"
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
                  <PasswordStrength value={registerValues.password} />
                </div>

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

                <div className="nx-authpage__nav">
                  <Button variant="ghost" onClick={backToWorkspace}>
                    Back
                  </Button>
                </div>
              </>
            ) : null}
          </>
        ) : null}

        {/* Sign-in owns the email and password; the register flow shows them
            on its last step, so they must not render twice. */}
        {isRegister ? null : (
          <>
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
                autoComplete="current-password"
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
            </div>
          </>
        )}
                {/* The register flow only submits once the account details are
            filled in; the earlier steps have their own buttons. */}
        {isRegister && registerStep !== 'account' ? null : (
          <Button type="submit" variant="primary" size="lg" fullWidth loading={isBusy}>
            {copy.cta}
          </Button>
        )}
{/* Mock mode is only announced in development — it is a testing
            affordance, not something to ship. And it is only true in mock
            mode: the live backend checks the password for real. */}
        {import.meta.env.DEV && USE_MOCK_API ? (
          <p className="nx-authpage__dev-note">
            <FiCheck size={12} aria-hidden="true" />
            Mock mode is on — the email picks the account, any password of 6+ characters works.
          </p>
        ) : null}

        {/* ---- demo account picker ----
            Shown in both modes: in mock mode the roster resolves to a
            fixture identity, and against the live backend it lists the
            accounts seeded in MySQL. Either way it is the quickest way to
            see what each role gets. */}

      </form>

      {/* ---- mode switch ---- */}
      <p className="nx-authpage__switch">
        {copy.switchPrompt}{' '}
        <Link to={appRoutes[copy.switchTo]} className="nx-form__link">
          {copy.switchLabel}
        </Link>
      </p>

      {/* Somebody who already has an account and was given a join code:
          the code works for them too, but from inside their account. */}
      {mode === 'login' ? (
        <p className="nx-authpage__switch">
          <Link to="/join" className="nx-form__link">
            Got a workspace code? Join an existing business
          </Link>
        </p>
      ) : null}
    </div>
  );
}
