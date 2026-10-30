/**
 * NexERP — HelpPage
 * ---------------------------------------------------------------------------
 * Self-service support: search-filtered FAQs grouped by topic, the three
 * keyboard shortcuts the shell actually binds, and a human contact card.
 *
 * This is the one page in the batch with no async surface — the articles are
 * bundled with the app, so there is deliberately no spinner and no error
 * branch; the state that matters here is "searched and found nothing", which
 * gets the filtered EmptyState. Answers stay factual: every shortcut below is
 * bound in the Topbar, every route named in an answer exists in the nav.
 */

import { useMemo, useState } from 'react';
import { FiChevronDown, FiClock, FiHelpCircle, FiMail, FiPhone, FiSearch } from 'react-icons/fi';
import Card from '@/components/ui/Card/Card';
import Button from '@/components/ui/Button/Button';
import Input from '@/components/ui/Input/Input';
import EmptyState from '@/components/feedback/EmptyState';
import './HelpPage.css';

const FAQ_GROUPS = [
  {
    id: 'getting-started',
    title: 'Getting started',
    items: [
      {
        id: 'company-details',
        question: 'How do I add my company details?',
        answer:
          'Open Settings → Company and fill in the name, address and tax number. Those details print on invoices and head up every report, so they are worth getting right first.',
      },
      {
        id: 'invite-team',
        question: 'How do I invite my team?',
        answer:
          'Open Settings → Team and invite people by email. Each person is given a role — Accountant, Sales Manager, Warehouse Manager and the rest — and that role decides which screens they can open and what they are allowed to change.',
      },
      {
        id: 'first-invoice',
        question: 'What is the fastest way to send my first invoice?',
        answer:
          'Add a product, create a customer, then open Sales → Invoices and choose New invoice. If you quoted the work first, convert the quote to an invoice and none of the lines are typed twice.',
      },
    ],
  },
  {
    id: 'sales',
    title: 'Sales & invoicing',
    items: [
      {
        id: 'quote-order-invoice',
        question: 'What is the difference between a quote, an order and an invoice?',
        answer:
          'A quote is an offer you have sent. An order records a confirmed sale. An invoice is the request for payment. Converting between them carries the lines forward instead of keeping three copies in three spreadsheets.',
      },
      {
        id: 'record-payment',
        question: 'How do I record a payment against an invoice?',
        answer:
          'Open the invoice and choose Record payment. The invoice moves to Partly paid or Paid, and the receipt shows up in your accounting figures straight away.',
      },
      {
        id: 'overdue',
        question: 'How do I chase an overdue invoice?',
        answer:
          'The receivables view lists invoices past their due date with the customer contact beside them, so the follow-up list is already sorted before you open it.',
      },
    ],
  },
  {
    id: 'inventory',
    title: 'Stock & inventory',
    items: [
      {
        id: 'negative-stock',
        question: 'Why is my stock level negative?',
        answer:
          'A sale was recorded before the goods were received. Post the delivery — or an inventory adjustment — and the balance returns to a real number. The negative figure is the app telling you a receipt is missing; it is not a bug.',
      },
      {
        id: 'reorder',
        question: 'How do I know when to reorder?',
        answer:
          'The inventory overview lists products at or below their reorder point, so the restock list is built before you even open the page.',
      },
    ],
  },
  {
    id: 'access',
    title: 'Access & security',
    items: [
      {
        id: 'who-sees-my-data',
        question: 'Who can see my financial data?',
        answer:
          'Only people with a role in your workspace. Roles are assigned in Settings → Team, and the activity feed records who opened or changed what, so access stays auditable.',
      },
      {
        id: 'secure-account',
        question: 'How do I keep my account secure?',
        answer:
          'Use a password you do not reuse anywhere else, and check the two-factor authentication status on your Profile page. If anything on that page looks unfamiliar, change your password and contact support the same day.',
      },
      {
        id: 'cannot-sign-in',
        question: 'I cannot sign in — what now?',
        answer:
          'Start with the email address: it is the one shown on your Profile page. If it still fails, email support with your workspace name and the message the sign-in screen showed you.',
      },
    ],
  },
];

/* Bound in Topbar.jsx — these are the shortcuts the shell really listens for,
   not a wishlist. */
const SHORTCUTS = [
  { keys: ['⌘', 'K'], alt: ['Ctrl', 'K'], label: 'Open the search palette from anywhere' },
  { keys: ['/'], label: 'Open search when you are not typing in a field' },
  { keys: ['Esc'], label: 'Close the open menu or dialog' },
];

export default function HelpPage() {
  const [query, setQuery] = useState('');
  const searchTerm = query.trim().toLowerCase();

  const visibleGroups = useMemo(() => {
    if (!searchTerm) return FAQ_GROUPS;
    return FAQ_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        `${item.question} ${item.answer}`.toLowerCase().includes(searchTerm),
      ),
    })).filter((group) => group.items.length > 0);
  }, [searchTerm]);

  /* Topics are derived from the visible groups, so a topic is never listed
     with a count that disagrees with what clicking it will show. */
  const topics = useMemo(
    () =>
      visibleGroups.map((group) => ({
        id: `help-${group.id}`,
        label: group.title,
        count: group.items.length,
      })),
    [visibleGroups],
  );

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <span className="page__eyebrow">Support</span>
          <h1 className="page__title">Help &amp; support</h1>
          <p className="page__subtitle">
            The questions we are asked most, the shortcuts worth learning, and how to reach a
            person when the answer is not here.
          </p>
        </div>
      </div>

      <div className="page__body nx-help">
        <div className="toolbar nx-help__toolbar">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search help articles"
            aria-label="Search help articles"
            leftIcon={<FiSearch size={15} />}
            containerClassName="nx-help__search"
          />
          {query ? (
            <Button variant="ghost" size="sm" onClick={() => setQuery('')}>
              Clear search
            </Button>
          ) : null}
        </div>

        <div className="grid grid--sidebar-left">
          {/* ---- sidebar: topics + a human ---- */}
          <aside className="nx-help__side">
            <Card>
              <h2 className="nx-help__card-title">Browse by topic</h2>
              <nav aria-label="Help topics">
                <ul className="nx-help__topics">
                  {topics.map((topic) => (
                    <li key={topic.id}>
                      <a className="nx-help__topic" href={`#${topic.id}`}>
                        <span className="nx-help__topic-label">{topic.label}</span>
                        <span className="nx-help__topic-count mono">{topic.count}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </Card>

            <Card>
              <h2 className="nx-help__card-title">Talk to support</h2>
              <ul className="nx-help__contact">
                <li className="nx-help__contact-item">
                  <FiMail size={15} aria-hidden="true" />
                  <a className="nx-link" href="mailto:support@nexerp.app">
                    support@nexerp.app
                  </a>
                </li>
                <li className="nx-help__contact-item">
                  <FiPhone size={15} aria-hidden="true" />
                  <a className="nx-link" href="tel:+2347000000000">
                    +234 700 000 0000
                  </a>
                </li>
                <li className="nx-help__contact-item">
                  <FiClock size={15} aria-hidden="true" />
                  <span>Mon–Fri, 09:00–18:00 WAT</span>
                </li>
              </ul>
              <p className="nx-help__contact-note">
                Include your workspace name and the screen you were on — it usually saves a
                round trip.
              </p>
            </Card>
          </aside>

          {/* ---- main: articles, then shortcuts ---- */}
          <div className="nx-help__main">
            <Card>
              <h2 className="nx-help__card-title" id="help-faq">
                Frequently asked
              </h2>

              {visibleGroups.length === 0 ? (
                <EmptyState
                  icon={<FiHelpCircle size={26} />}
                  title="No help articles match your search"
                  description="Try a shorter word, or clear the search to see every question."
                  action={
                    <Button variant="outline" onClick={() => setQuery('')}>
                      Clear search
                    </Button>
                  }
                />
              ) : (
                visibleGroups.map((group) => (
                  <section
                    key={group.id}
                    id={`help-${group.id}`}
                    className="nx-help__group"
                    aria-labelledby={`help-${group.id}-title`}
                  >
                    <h3 className="nx-help__group-title" id={`help-${group.id}-title`}>
                      {group.title}
                    </h3>

                    <div className="nx-help__list">
                      {group.items.map((item) => (
                        <details key={item.id} id={`help-${item.id}`} className="nx-help__item">
                          <summary className="nx-help__summary">
                            <span className="nx-help__q">{item.question}</span>
                            <FiChevronDown
                              className="nx-help__chevron"
                              size={16}
                              aria-hidden="true"
                            />
                          </summary>
                          <p className="nx-help__a">{item.answer}</p>
                        </details>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </Card>

            <Card>
              <h2 className="nx-help__card-title" id="help-shortcuts">
                Keyboard shortcuts
              </h2>
              <table className="nx-help__shortcuts">
                <caption className="sr-only">
                  Keyboard shortcuts available across the NexERP shell
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Keys</th>
                    <th scope="col">What it does</th>
                  </tr>
                </thead>
                <tbody>
                  {SHORTCUTS.map((shortcut) => (
                    <tr key={shortcut.label}>
                      <td>
                        <span className="nx-help__keys">
                          {shortcut.keys.map((key) => (
                            <kbd key={key} className="nx-kbd">
                              {key}
                            </kbd>
                          ))}
                          {shortcut.alt ? (
                            <>
                              <span className="nx-help__or">or</span>
                              {shortcut.alt.map((key) => (
                                <kbd key={key} className="nx-kbd">
                                  {key}
                                </kbd>
                              ))}
                            </>
                          ) : null}
                        </span>
                      </td>
                      <td className="nx-help__shortcut-label">{shortcut.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
