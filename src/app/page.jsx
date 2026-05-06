/**
 * app/page.jsx  –  Home Page (/)
 *
 * Server component – no 'use client' needed.
 * All interactive child components declare 'use client' themselves.
 */

import HeroSection from "@/components/home/HeroSection";
import {
  QuickActions,
  ProcessSteps,
  CTAStrip,
  InfoCards,
  ContactBar,
} from "@/components/home/HomeComponents";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <QuickActions />
      <ProcessSteps />
      <CTAStrip />
      <InfoCards />
      <ContactBar />
    </>
  );
}
