/**
 * NexERP — SiteHeader
 * ---------------------------------------------------------------------------
 * Spec: "a floating, centered, pill-shaped glass header that detaches from the
 * top edge with a margin. Shrinks and gains a stronger blur/border glow once
 * the user scrolls. The nav links have a sliding 'spotlight' pill that glides
 * to the hovered or active link (measure the link position with refs). The
 * animated logo is on the left. On the right are a 'Login' ghost button and a
 * 'Get Started' button with a shimmer sweep on hover. Mobile: collapses into a
 * hamburger that opens a full-screen glass menu with staggered link
 * animations."
 *
 * How the spotlight works: one absolutely-positioned element is shared by every
 * link. Hover or focus moves the "spotlight target" to that link, its offset
 * and width are measured with a ref, and those two numbers are written to CSS
 * custom properties which the stylesheet consumes. Keeping the geometry in CSS
 * means the pill's colour, blur and transition stay in SiteHeader.css.
 *
 * This is the one place in the codebase that writes to an element's style
 * imperatively, and it is deliberate: the pill's position is a runtime
 * measurement that no static stylesheet rule can express, and it is written to
 * CSS custom properties so every visual decision (colour, blur, transition)
 * stays in SiteHeader.css. Nothing else sets style anywhere in the app.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FiArrowRight, FiMenu, FiX } from 'react-icons/fi';
import AnimatedLogo from '@/components/brand/AnimatedLogo';
import Button from '@/components/ui/Button/Button';
import useScrollLock from '@/hooks/useScrollLock';
import useAuth from '@/hooks/useAuth';
import { useVendorHome } from '@/hooks/useVendorPath';
import { appRoutes } from '@/config/navigation.config';
import './SiteHeader.css';
import './MobileMenu.css';

const cx = (...classes) => classes.filter(Boolean).join(' ');

/** Single source of truth for the marketing nav, also used by the mobile menu. */
export const SITE_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Features', to: '/features' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

const SCROLL_THRESHOLD = 24;

/** How long the CTA arrow takes to fly out before the route changes. */
const CTA_EXIT_MS = 420;

export default function SiteHeader() {
  const location = useLocation();
  const headerRef = useRef(null);
  const navRef = useRef(null);
  const spotlightRef = useRef(null);
  const linkRefs = useRef(new Map());

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  /* Which link the pill is parked under: a key from SITE_LINKS, or null. */
  const [spotlightKey, setSpotlightKey] = useState(null);
  const [pill, setPill] = useState({ left: 0, width: 0, visible: false });
  /* True from the moment "Get Started" is pressed until the route swaps, so the
     arrow can fly before the page unmounts underneath it. */
  const [ctaLeaving, setCtaLeaving] = useState(false);

  const navigate = useNavigate();
  const exitTimerRef = useRef(null);

  /* The header is shared by the public marketing pages, so it has to reflect
     the session the same way the app shells do: a signed-in visitor who lands
     back on "/" should still see their workspace entry point instead of the
     Log in / Get Started pair. */
  const { isAuthenticated, user, isPlatformAdmin } = useAuth();
  const vendorHome = useVendorHome();
  const dashboardHref = isPlatformAdmin ? appRoutes.admin.index : vendorHome;
  const greeting = user?.firstName ? `Hi, ${user.firstName}` : 'My account';

  useScrollLock(menuOpen);

  /* The CTA does not navigate on the click itself: it plays the arrow-out
     animation first and only then hands off to the router. Honoured by both
     the desktop button and the mobile menu entry. */
  const handleCtaClick = useCallback(
    (event) => {
      if (ctaLeaving) {
        event.preventDefault();
        return undefined;
      }

      /* Anything that is not a plain left-click (cmd/ctrl-click for a new tab,
         a middle-click, a modified click) is handed straight to the browser —
         an exit animation must not break "open in new tab". */
      const plainClick =
        event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
      if (!plainClick) return undefined;

      const reduceMotion =
        typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

      /* A visitor who has asked for reduced motion gets the destination now. */
      if (reduceMotion) return undefined;

      event.preventDefault();
      setCtaLeaving(true);
      exitTimerRef.current = window.setTimeout(() => {
        exitTimerRef.current = null;
        navigate('/register');
      }, CTA_EXIT_MS);

      return undefined;
    },
    [ctaLeaving, navigate],
  );

  /* Clear a pending navigation if the header unmounts mid-animation. */
  useEffect(
    () => () => {
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    },
    [],
  );

  const isActivePath = (to) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to));

  /* The active link owns the pill whenever nothing is hovered, so it glides
     back to the current page after a pointer leaves the nav. */
  const restingKey = SITE_LINKS.find((link) => isActivePath(link.to))?.label ?? null;
  const targetKey = spotlightKey ?? restingKey;

  /** Measures the target link and publishes its geometry to CSS. */
  const measure = useCallback(
    (key) => {
      const link = linkRefs.current.get(key);
      const nav = navRef.current;
      if (!link || !nav) return;

      const linkBox = link.getBoundingClientRect();
      const navBox = nav.getBoundingClientRect();

      setPill({
        left: linkBox.left - navBox.left,
        width: linkBox.width,
        visible: true,
      });
    },
    [],
  );

  /* Re-measure on target change, then on resize. A layout effect runs before
     paint, so the pill never renders at its old position for a frame. */
  useLayoutEffect(() => {
    if (!targetKey) {
      setPill((current) => ({ ...current, visible: false }));
      return;
    }
    measure(targetKey);
  }, [targetKey, location.pathname, measure]);

  /* Publish the measured geometry as CSS custom properties. This is a
     deliberate exception to the no-inline-styles rule: the values are
     runtime measurements that no stylesheet can know in advance, and they are
     written to custom properties so every visual decision (colour, blur,
     transition) stays in SiteHeader.css. */
  useLayoutEffect(() => {
    const el = spotlightRef.current;
    if (!el) return;
    el.style.setProperty('--nx-pill-left', `${pill.left}px`);
    el.style.setProperty('--nx-pill-width', `${pill.width}px`);
  }, [pill.left, pill.width]);

  useEffect(() => {
    const handleResize = () => targetKey && measure(targetKey);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [targetKey, measure]);

  /* The header shrinks once the page has moved. */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* Route change closes the mobile menu, drops the hover state and releases
     the CTA's exit state. The timer is cleared first so an interrupted
     animation cannot still force the route to /register later. */
  useEffect(() => {
    if (exitTimerRef.current) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    setMenuOpen(false);
    setSpotlightKey(null);
    setCtaLeaving(false);
  }, [location.pathname]);

  /* Escape closes the mobile menu. */
  useEffect(() => {
    if (!menuOpen) return undefined;

    const handleKey = (event) => event.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [menuOpen]);

  const registerLink = (label) => (node) => {
    if (node) linkRefs.current.set(label, node);
    else linkRefs.current.delete(label);
  };

  return (
    <>
      <a className="nx-skip-link" href="#main">
        Skip to content
      </a>

      <header
        ref={headerRef}
        className={cx('nx-site-header', scrolled && 'is-scrolled', menuOpen && 'is-menu-open')}
      >
        <div className="nx-site-header__inner">
          {/* THE ANIMATED BACKDROP
              A 3D plane of theme colour drifting under the pill, a gradient
              sweep that travels across it, and a field of glowing orbs that
              float in 3D depth for liveliness. It is a real element rather
              than a pseudo-element because it is its own stacking context —
              the layer keeps its perspective while the glass backdrop-filter
              stays on the pill above it. */}
          <span className="nx-site-header__bg" aria-hidden="true">
            <span className="nx-site-header__orb nx-site-header__orb--1" />
            <span className="nx-site-header__orb nx-site-header__orb--2" />
            <span className="nx-site-header__orb nx-site-header__orb--3" />
            <span className="nx-site-header__orb nx-site-header__orb--4" />
          </span>

          <NavLink to="/" className="nx-site-header__logo" aria-label="NexERP home">
            <AnimatedLogo size="sm" />
          </NavLink>

          <nav ref={navRef} className="nx-site-header__nav" aria-label="Main">
            {/* The travelling pill. Geometry only — see the file header. */}
            <span
              ref={spotlightRef}
              className="nx-site-header__spotlight"
              data-visible={pill.visible || undefined}
              aria-hidden="true"
            />

            {SITE_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                ref={registerLink(link.label)}
                className={({ isActive }) => cx('nx-site-header__link', isActive && 'is-active')}
                onMouseEnter={() => setSpotlightKey(link.label)}
                onFocus={() => setSpotlightKey(link.label)}
                onMouseLeave={() => setSpotlightKey(null)}
                onBlur={() => setSpotlightKey(null)}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="nx-site-header__actions">
            {isAuthenticated ? (
              <>
                <Button
                  to={appRoutes.profile}
                  variant="ghost"
                  size="sm"
                  className="nx-site-header__login"
                >
                  {greeting}
                </Button>
                <Button
                  to={dashboardHref}
                  size="sm"
                  className="nx-site-header__cta"
                  rightIcon={<FiArrowRight size={14} />}
                >
                  Dashboard
                </Button>
              </>
            ) : (
              <>
                <Button
                  to={appRoutes.login}
                  variant="ghost"
                  size="sm"
                  className="nx-site-header__login nx-blink-glow"
                >
                  Login
                </Button>
                <Button
                  to={appRoutes.register}
                  size="sm"
                  className={cx('nx-site-header__cta', ctaLeaving && 'is-leaving')}
                  rightIcon={<FiArrowRight size={14} />}
                  onClick={handleCtaClick}
                >
                  Get Started
                </Button>
              </>
            )}

            <button
              type="button"
              className="nx-site-header__burger"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="nx-mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <FiX /> : <FiMenu />}
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen glass menu. Only mounted while open, so its links are not
          in the tab order on desktop. */}
      <div
        id="nx-mobile-menu"
        className={cx('nx-mobile-menu', menuOpen && 'is-open')}
        data-open={menuOpen || undefined}
        {...(menuOpen ? {} : { inert: '' })}
        aria-hidden={!menuOpen}
      >
        <nav className="nx-mobile-menu__nav" aria-label="Mobile">
          {SITE_LINKS.map((link, index) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => cx('nx-mobile-menu__link', isActive && 'is-active')}
              /* Stagger index, passed as data-step rather than an inline delay. */
              data-step={index + 1}
            >
              <span className="nx-mobile-menu__index">{String(index + 1).padStart(2, '0')}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="nx-mobile-menu__actions" data-step={SITE_LINKS.length + 1}>
          {isAuthenticated ? (
            <>
              <Button
                to={dashboardHref}
                fullWidth
                rightIcon={<FiArrowRight />}
                className="nx-site-header__cta"
              >
                Go to dashboard
              </Button>
              <Button to={appRoutes.profile} variant="outline" fullWidth>
                {greeting}
              </Button>
            </>
          ) : (
            <>
              <Button to={appRoutes.login} variant="outline" fullWidth className="nx-blink-glow">
                Login
              </Button>
              <Button
                to={appRoutes.register}
                fullWidth
                rightIcon={<FiArrowRight />}
                className={cx('nx-site-header__cta', ctaLeaving && 'is-leaving')}
                onClick={handleCtaClick}
              >
                Get Started
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
