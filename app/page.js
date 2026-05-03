"use client";
import { useLayoutEffect, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { AppPageLayout } from "@/components/common/AppPageLayout";
import WorkProjectTile from "@/components/WorkProjectTile";
import { getFeaturedWorkProjects } from "@/lib/workProjects";

// Partner logos: add / replace with your partner images in public/
const partners = [
  { name: "S2Alliance", logo: "/s2alliance_inc_logo.jpeg", alt: "S2Alliance" },
  { name: "LCPS", logo: "/lcps.png", alt: "Loudoun County Public Schools" },
  { name: "Beaverbots", logo: "/beaverbots.png", alt: "Beaverbots Team Robots" },
];

// Icons for "what we help you build" grid
const buildItems = [
  { label: "Web apps", icon: "globe" },
  { label: "Websites for organizations", icon: "building" },
  { label: "Volunteer management tools", icon: "users" },
  { label: "Event scheduling systems", icon: "calendar" },
  { label: "Donation tracking dashboards", icon: "chart" },
  { label: "Custom software", icon: "code" },
];

// Rotating hero endings: "Free Digital Tools... to [phrase]"
const heroPhrases = [
  "help your organization",
  "scale with your mission",
  "save you time",
  "connect your teams",
  "turn data into impact",
  "power your programs",
  "grow your impact",
  "serve your community",
];

const buildIcons = {
  globe: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>,
  building: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 21h16.5M3.75 9h16.5m-16.5 6h16.5M2.25 6l9 3.75L20.25 6M2.25 21V6l9 3.75 9-3.75v15" /></svg>,
  users: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  calendar: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  chart: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  code: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
};

const TYPE_MS = 70;
const DELETE_MS = 45;
const HOLD_MS = 2200;

export default function Home() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayLength, setDisplayLength] = useState(() => heroPhrases[0].length);
  const [phase, setPhase] = useState("holding"); // 'holding' | 'deleting' | 'typing'

  useLayoutEffect(() => {
    document.title = "Code4Community | Home";
  }, []);

  useEffect(() => {
    let intervalId = null;
    let holdTimeoutId = null;

    if (phase === "holding") {
      holdTimeoutId = setTimeout(() => setPhase("deleting"), HOLD_MS);
      return () => clearTimeout(holdTimeoutId);
    }

    if (phase === "deleting") {
      intervalId = setInterval(() => {
        setDisplayLength((len) => {
          if (len <= 1) {
            setPhase("typing");
            setPhraseIndex((i) => (i + 1) % heroPhrases.length);
            return 0;
          }
          return len - 1;
        });
      }, DELETE_MS);
      return () => clearInterval(intervalId);
    }

    if (phase === "typing") {
      intervalId = setInterval(() => {
        setDisplayLength((len) => {
          const full = heroPhrases[(phraseIndex + heroPhrases.length) % heroPhrases.length].length;
          if (len >= full) {
            setPhase("holding");
            return full;
          }
          return len + 1;
        });
      }, TYPE_MS);
      return () => clearInterval(intervalId);
    }
  }, [phase, phraseIndex]);

  const visibleText = heroPhrases[phraseIndex].slice(0, displayLength);

  return (
    <AppPageLayout>
      {/* Split hero + featured work */}
      <div className="flex-1 flex flex-col lg:flex-row lg:min-h-[calc(100vh-4rem)]">
        {/* Left: Hero */}
        <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:py-16 lg:pl-12 xl:pl-24 max-w-2xl">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-snug mb-6 overflow-visible">
            Free Digital Tools Built by Students for Our Community to{" "}
            <span className="inline-block pb-1.5 overflow-visible bg-gradient-to-r from-violet-500 via-purple-500 to-amber-500 bg-clip-text text-transparent">
              {visibleText}
            </span>
            <span className="inline-block w-0.5 h-8 md:h-10 ml-0.5 bg-foreground animate-pulse align-middle" aria-hidden />
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
            Code4Community is a student-led engineering club that builds <strong>custom tools and software</strong> for local nonprofits and small businesses <strong>at no cost.</strong>
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              Request a Tool
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 border-2 border-foreground text-foreground font-medium rounded-lg hover:bg-foreground hover:text-background transition-colors"
            >
              Get in touch
            </Link>
          </div>
        </div>

        {/* Right: What we help you build */}
        <div className="flex-1 bg-muted/30 border-l border-border flex flex-col justify-center p-6 lg:p-10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="relative max-w-md mx-auto w-full">
            <h2 className="text-lg font-semibold text-foreground mb-1">We help you make</h2>
            <p className="text-sm text-muted-foreground mb-6">Your idea, we build it—from concept to launch.</p>
            <div className="grid grid-cols-2 gap-3">
              {buildItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 bg-background border border-border rounded-lg px-4 py-3 shadow-sm"
                >
                  <span className="flex-shrink-0 text-violet-500">{buildIcons[item.icon]}</span>
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-6 text-center">
              Websites, volunteer management tools, event scheduling, donation dashboards, custom software—whatever your organization needs.
            </p>
          </div>
        </div>
      </div>

      {/* Trusted By / Partners */}
      <section className="border-t border-border bg-background py-16 md:py-20 px-6">
        <p className="text-center text-sm font-medium uppercase tracking-wider text-muted-foreground mb-10">
          Some of our trusted partners
        </p>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-12 md:gap-16 items-center justify-items-center">
          {partners.map((partner) => (
            <div
              key={partner.name}
              className="flex items-center justify-center w-full aspect-[2/1] max-h-28 md:max-h-32"
            >
              <Image
                src={partner.logo}
                alt={partner.alt}
                width={280}
                height={140}
                className="object-contain w-full h-full"
              />
            </div>
          ))}
        </div>
      </section>

      {/* The Problem */}
      <section className="border-t border-border bg-muted/20 py-16 md:py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Many Community Organizations Need Digital Tools
          </h2>
          <p className="text-lg text-muted-foreground mb-6">
            But building software is often expensive or complicated.
          </p>
          <p className="text-foreground leading-relaxed mb-6">
            Nonprofits and small organizations often need simple tools to run their programs effectively with things like event trackers, volunteer systems, or internal dashboards.
          </p>
          <p className="text-foreground leading-relaxed mb-6">
            Unfortunately, hiring developers or agencies can cost thousands of dollars, making these tools inaccessible to many community groups.
          </p>
          <p className="font-semibold text-foreground">
            Code4Community was created to help solve this challenge.
          </p>
        </div>
      </section>

      {/* What We Do */}
      <section className="border-t border-border bg-background py-16 md:py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-3">
            What We Do
          </h2>
          <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Our student team designs and builds digital tools for local organizations completely free of charge.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-xl border border-border bg-muted/30 p-6">
              <h3 className="font-semibold text-foreground mb-2">Custom Websites</h3>
              <p className="text-sm text-muted-foreground">
                We build simple, clean websites for organizations that need an online presence.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-6">
              <h3 className="font-semibold text-foreground mb-2">Productivity Tools</h3>
              <p className="text-sm text-muted-foreground">
                Internal tools to help manage events, volunteers, and programs.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-6">
              <h3 className="font-semibold text-foreground mb-2">Data Dashboards</h3>
              <p className="text-sm text-muted-foreground">
                Track donations, participation, and organization data in one place.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-6">
              <h3 className="font-semibold text-foreground mb-2">Custom Solutions</h3>
              <p className="text-sm text-muted-foreground">
                If your organization has a unique problem, we work with you to design a custom solution.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How the Process Works */}
      <section className="border-t border-border bg-muted/20 py-16 md:py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-12">
            How the Process Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="relative">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-foreground text-background font-bold text-lg mb-4">1</span>
              <h3 className="font-semibold text-foreground mb-2">Submit a Request</h3>
              <p className="text-sm text-muted-foreground">
                Tell us about the problem you&apos;re trying to solve and what kind of tool you might need.
              </p>
            </div>
            <div className="relative">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-foreground text-background font-bold text-lg mb-4">2</span>
              <h3 className="font-semibold text-foreground mb-2">We Plan the Tool</h3>
              <p className="text-sm text-muted-foreground">
                Our team reviews your request and works with you to define the features and requirements.
              </p>
            </div>
            <div className="relative">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-foreground text-background font-bold text-lg mb-4">3</span>
              <h3 className="font-semibold text-foreground mb-2">Students Build the Tool</h3>
              <p className="text-sm text-muted-foreground">
                Our developers design and build the software while keeping you updated throughout the process.
              </p>
            </div>
            <div className="relative">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-foreground text-background font-bold text-lg mb-4">4</span>
              <h3 className="font-semibold text-foreground mb-2">Launch and Feedback</h3>
              <p className="text-sm text-muted-foreground">
                We deliver the finished tool and gather feedback to improve it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Some of Our Work */}
      <section className="border-t border-border bg-background py-16 md:py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
            Some of Our Work
          </h2>
          <p className="text-center text-sm text-muted-foreground mb-8 max-w-xl mx-auto">
            A few student-built tools we have shipped for teachers and the school community—grade tools, yearbook helpers, seating charts, and more to come.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
            {getFeaturedWorkProjects().map((p) => (
              <WorkProjectTile
                key={p.id}
                id={p.id}
                title={p.title}
                description={p.description}
                available={p.available}
                linkHref={p.href ?? `/work#${p.id}`}
              />
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              href="/work"
              className="inline-flex items-center justify-center rounded-[4px] border border-[#303d4e] px-10 py-2 text-[16px] font-[550] tracking-[-1px] text-[#303d4e] no-underline transition-colors hover:bg-[#303d4e] hover:text-white"
            >
              See all work
            </Link>
          </div>
        </div>
      </section>
    </AppPageLayout>
  );
}
