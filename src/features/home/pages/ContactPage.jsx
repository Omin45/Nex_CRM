/**
 * NexERP — ContactPage
 * ---------------------------------------------------------------------------
 * Contact details plus an enquiry form.
 *
 * There is no backend, so the form validates and then reports success locally
 * rather than pretending to have sent anything. The success state is explicit
 * about that — it says the enquiry has been recorded in this demo — because a
 * form that silently discards a message is worse than no form.
 *
 * Validation follows the shared Input pattern: errors appear on blur and on
 * submit, never while the field is still being typed into for the first time.
 */

import { useState } from 'react';
import { FiMail, FiPhone, FiMapPin, FiClock, FiCheck, FiAlertCircle } from 'react-icons/fi';
import Reveal from '@/components/marketing/Reveal';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import PageHeader from '../components/PageHeader';
import './ContactPage.css';

const CHANNELS = [
  { icon: <FiMail />, label: 'Sales', value: 'sales@nexerp.app', href: 'mailto:sales@nexerp.app' },
  { icon: <FiMail />, label: 'Support', value: 'support@nexerp.app', href: 'mailto:support@nexerp.app' },
  { icon: <FiPhone />, label: 'Phone', value: '+234 700 000 0000', href: 'tel:+2347000000000' },
  { icon: <FiMapPin />, label: 'Office', value: 'Lagos, Nigeria' },
  { icon: <FiClock />, label: 'Hours', value: 'Mon–Fri, 09:00–18:00 WAT' },
];

/** What the form is actually for, so the visitor picks the right thing. */
const ENQUIRY_TYPES = [
  { value: 'sales', label: 'Talk to sales' },
  { value: 'support', label: 'Get support' },
  { value: 'migration', label: 'Migrate my data' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'other', label: 'Something else' },
];

const INITIAL = {
  name: '',
  email: '',
  company: '',
  type: 'sales',
  message: '',
};

/** Deliberately permissive: the only rule that matters is that it is an email. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(values) {
  const errors = {};

  if (!values.name.trim()) {
    errors.name = 'Tell us your name.';
  }

  if (!values.email.trim()) {
    errors.email = 'We need an email address to reply to.';
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'That does not look like an email address.';
  }

  if (values.message.trim().length < 10) {
    errors.message = 'A sentence or two helps us route this to the right person.';
  }

  return errors;
}

export default function ContactPage() {
  const [values, setValues] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [status, setStatus] = useState('idle');

  const setField = (field) => (event) => {
    const { value } = event.target;
    setValues((current) => ({ ...current, [field]: value }));

    /* Re-validate a field that already showed an error, so the message clears
       as soon as it is fixed rather than only on the next submit. */
    if (touched[field] && errors[field]) {
      setErrors((current) => ({ ...current, [field]: validate({ ...values, [field]: value })[field] }));
    }
  };

  const blurField = (field) => () => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors((current) => ({ ...current, [field]: validate(values)[field] }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    setTouched({ name: true, email: true, message: true });

    if (Object.keys(found).length) {
      setStatus('invalid');
      return;
    }

    setStatus('sent');
  };

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Talk to a person, not a ticket queue"
        text="Tell us what you are trying to run and we will tell you honestly whether NexERP fits. If it does not, we will say so."
      />

      <div className="nx-contact">
        <div className="nx-home__container">
          <div className="nx-contact__grid">
            {/* ---- channels ---- */}
            <Reveal step={1} distance={24} className="nx-contact__channels-wrap">
              <div className="nx-contact__channels">
                <h2 className="nx-contact__channels-heading">Reach us directly</h2>

                <ul className="nx-contact__channel-list">
                  {CHANNELS.map((channel) => (
                    <li key={channel.label} className="nx-contact__channel">
                      <span className="nx-contact__channel-icon" aria-hidden="true">
                        {channel.icon}
                      </span>

                      <span className="nx-contact__channel-body">
                        <span className="nx-contact__channel-label">{channel.label}</span>
                        {channel.href ? (
                          <a className="nx-contact__channel-value" href={channel.href}>
                            {channel.value}
                          </a>
                        ) : (
                          <span className="nx-contact__channel-value">{channel.value}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            {/* ---- form ---- */}
            <Reveal step={2} distance={24} className="nx-contact__form-wrap">
              <div className="nx-contact__form-card">
                <h2 className="nx-contact__form-heading">Send us a message</h2>

                {status === 'sent' ? (
                  <div className="nx-contact__sent" role="status">
                    <span className="nx-contact__sent-icon" aria-hidden="true">
                      <FiCheck size={20} />
                    </span>
                    <h3 className="nx-contact__sent-title">Thanks — that reached us.</h3>
                    <p className="nx-contact__sent-text">
                      This is a front-end demo, so the enquiry was not actually
                      transmitted. In the live app it would land with the sales
                      team and you would have a reply within one working day.
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setValues(INITIAL);
                        setTouched({});
                        setErrors({});
                        setStatus('idle');
                      }}
                    >
                      Send another
                    </Button>
                  </div>
                ) : (
                  <form className="nx-contact__form" onSubmit={handleSubmit} noValidate>
                    {status === 'invalid' ? (
                      <p className="nx-contact__form-alert" role="alert">
                        <FiAlertCircle size={16} aria-hidden="true" />
                        Please fix the highlighted fields.
                      </p>
                    ) : null}

                    <Input
                      name="name"
                      label="Your name"
                      value={values.name}
                      onChange={setField('name')}
                      onBlur={blurField('name')}
                      error={touched.name ? errors.name : undefined}
                      autoComplete="name"
                      required
                    />

                    <Input
                      name="email"
                      type="email"
                      label="Email address"
                      value={values.email}
                      onChange={setField('email')}
                      onBlur={blurField('email')}
                      error={touched.email ? errors.email : undefined}
                      autoComplete="email"
                      required
                    />

                    <Input
                      name="company"
                      label="Company"
                      hint="Optional"
                      value={values.company}
                      onChange={setField('company')}
                      autoComplete="organization"
                    />

                    <Input
                      name="type"
                      as="select"
                      label="What is this about?"
                      value={values.type}
                      onChange={setField('type')}
                      options={ENQUIRY_TYPES}
                    />

                    <Input
                      name="message"
                      type="textarea"
                      label="Message"
                      value={values.message}
                      onChange={setField('message')}
                      onBlur={blurField('message')}
                      error={touched.message ? errors.message : undefined}
                      rows={5}
                      required
                    />

                    <Button type="submit" variant="primary" size="lg" fullWidth>
                      Send message
                    </Button>
                  </form>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </>
  );
}
