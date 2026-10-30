/**
 * NexERP — HomePage
 * ---------------------------------------------------------------------------
 * The marketing home page, assembled from the section components in
 * features/home/components/. Each section owns its own markup and CSS; this
 * file is only the order.
 *
 * Reading order matches the spec:
 *   1. Hero          — headline, subhead, CTAs, trust row
 *   2. Stats band    — four count-up figures
 *   3. Modules grid  — the eight modules, each its own icon
 *   4. How it works  — four steps joined by one vertical gradient line
 *   5. Screens       — FadeCarousel over static SVG-ish mockups
 *   6. Testimonials  — crossfading quotes
 *   7. Final CTA     — closing panel above the footer
 */

import HeroSection from '../components/HeroSection';
import StatsBand from '../components/StatsBand';
import ModulesGrid from '../components/ModulesGrid';
import HowItWorks from '../components/HowItWorks';
import ProductShowcase from '../components/ProductShowcase';
import Testimonials from '../components/Testimonials';
import CtaBand from '../components/CtaBand';
import './HomePage.css';

export default function HomePage() {
  return (
    /* A single wrapper so the marketing layout's reading-measure rule
       (`.nx-public__main > *`) does not clip each full-bleed section down to
       68rem. HomePage.css cancels that constraint for this element and lets the
       sections' own `.nx-home__container` handle the reading measure. */
    <div className="nx-home__page">
      <HeroSection />
      <StatsBand />
      <ModulesGrid />
      <HowItWorks />
      <ProductShowcase />
      <Testimonials />
      <CtaBand />
    </div>
  );
}
