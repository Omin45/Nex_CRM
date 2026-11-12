/**
 * ArkCRM — SiteFooter
 * ---------------------------------------------------------------------------
 * Marketing footer. Grouped links rather than one long row, because a flat list
 * of nine destinations is unusable on mobile and a poor scan target on desktop.
 */

import { Link } from 'react-router-dom';
import { FiGithub, FiLinkedin, FiTwitter } from 'react-icons/fi';
import AnimatedLogo from '@/components/brand/AnimatedLogo';
import './SiteFooter.css';

const GROUPS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', to: '/features' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Modules', to: '/features#modules' },
      { label: 'Security', to: '/features#security' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Contact', to: '/contact' },
      { label: 'Careers', to: '/about#careers' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign in', to: '/login' },
      { label: 'Create workspace', to: '/register' },
      { label: 'Help centre', to: '/help' },
    ],
  },
];

const SOCIALS = [
  { label: 'Twitter', href: 'https://twitter.com', icon: <FiTwitter /> },
  { label: 'LinkedIn', href: 'https://linkedin.com', icon: <FiLinkedin /> },
  { label: 'GitHub', href: 'https://github.com', icon: <FiGithub /> },
];

export default function SiteFooter() {
  return (
    <footer className="nx-site-footer">
      <div className="nx-site-footer__inner">
        <div className="nx-site-footer__brand">
          <AnimatedLogo size="sm" />
          <p className="nx-site-footer__blurb">
            One workspace for sales, stock, people and the books — built for companies
            that have outgrown spreadsheets.
          </p>

          <ul className="nx-site-footer__socials">
            {SOCIALS.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  className="nx-site-footer__social"
                  aria-label={social.label}
                  /* Outbound: opens in a new tab without leaking the referrer or
                     handing the opener over via window.opener. */
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {social.icon}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <nav className="nx-site-footer__groups" aria-label="Footer">
          {GROUPS.map((group) => (
            <div key={group.title} className="nx-site-footer__group">
              <h2 className="nx-site-footer__group-title">{group.title}</h2>
              <ul>
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="nx-site-footer__link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="nx-site-footer__base">
        <span>© {new Date().getFullYear()} ArkCRM. All rights reserved.</span>
        <span className="nx-site-footer__legal">
          <Link to="/about" className="nx-site-footer__link">
            Privacy
          </Link>
          <Link to="/about" className="nx-site-footer__link">
            Terms
          </Link>
        </span>
      </div>
    </footer>
  );
}
