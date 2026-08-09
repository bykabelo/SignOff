"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import "@/app/landing.css";

type Mode = "social" | "design";

/* ── Icons ───────────────────────────────────────────────── */

const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M6 3l5 5-5 5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SocialIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <rect x="3" y="2" width="10" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="8" cy="12" r="0.8" fill="currentColor" />
  </svg>
);

const DesignIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path
      d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 12L8 10.5L5 12l.5-3.5L3 6l3.5-.5z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

/* ── Page ────────────────────────────────────────────────── */

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mode, setMode] = useState<Mode>("social");
  const rootRef = useRef<HTMLDivElement>(null);

  /* Nav gets its hairline border once the page has moved. */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll(); // A reload part-way down the page should start bordered.
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /*
   * Scroll reveal.
   *
   * The `reveal` class — which sets opacity to 0 — is added here rather than
   * in the markup, so if JavaScript never runs the page is still readable
   * instead of a column of invisible sections.
   */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const targets = Array.from(
      root.querySelectorAll<HTMLElement>(".section, .proof"),
    );

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12 },
    );

    targets.forEach((el, i) => {
      el.classList.add("reveal");
      el.style.animationDelay = `${i * 0.04}s`;
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const social = mode === "social";

  return (
    <div className="landing" ref={rootRef}>
      <nav className={scrolled ? "scrolled" : undefined}>
        <div className="wrap nav-inner">
          {/* One accessible name on the link, so the two images (only one of
              which is ever visible) are not both announced. */}
          <Link href="/" className="logo" aria-label="Signoff home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/signoff-lockup.svg"
              alt=""
              width={112}
              height={28}
              className="logo-lockup"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/signoff-icon.svg"
              alt=""
              width={30}
              height={30}
              className="logo-icon"
            />
          </Link>
          <div className="nav-links">
            <a href="#modes">Use cases</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <Link href="/login">Sign in</Link>
            <Link href="/signup" className="nav-cta">
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────── */}
      <header className="hero">
        <div className="wrap">
          <div className="hero-badge">
            <span className="dot">✓</span>
            No more &ldquo;can you resend that for approval?&rdquo;
          </div>

          <h1 className="serif">
            One link for
            <br />
            <em>every client review.</em>
          </h1>

          <p className="hero-sub">
            Whether you&rsquo;re shipping this week&rsquo;s social posts or a
            full brand identity, Signoff gives your clients one clean place to
            review, comment, and approve — no logins, no email threads, no
            chaos.
          </p>

          <div className="hero-ctas">
            <Link href="/signup" className="btn-primary">
              Start free — no card needed
              <ArrowRight />
            </Link>
            <a href="#how" className="btn-secondary">
              See how it works
            </a>
          </div>

          <p className="hero-note">
            Free forever for your first client · Setup takes 60 seconds
          </p>

          <div className="mode-toggle">
            <button
              type="button"
              className={`mode-btn${social ? " active" : ""}`}
              aria-pressed={social}
              onClick={() => setMode("social")}
            >
              <SocialIcon />
              Social content
            </button>
            <button
              type="button"
              className={`mode-btn${social ? "" : " active"}`}
              aria-pressed={!social}
              onClick={() => setMode("design")}
            >
              <DesignIcon />
              Design projects
            </button>
          </div>

          <div className="hero-visual">
            <div className="browser">
              <div className="browser-bar">
                <span className="browser-dot" style={{ background: "#f0c0b4" }} />
                <span className="browser-dot" style={{ background: "#f5dcaa" }} />
                <span className="browser-dot" style={{ background: "#c0dd97" }} />
                <span className="browser-url">
                  {social
                    ? "review.signoff.app/central-city"
                    : "review.signoff.app/bloom-co"}
                </span>
              </div>

              <div className="browser-body">
                {/* Social mock */}
                <div className={social ? undefined : "hide"}>
                  <div className="mock-header" style={{ background: "var(--accent)" }}>
                    <div className="mock-avatar">CCM</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                        Central City Market
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,.7)" }}>
                        Content review · Week of May 26
                      </div>
                    </div>
                  </div>
                  <div className="mock-body">
                    <div className="mock-posts">
                      <div className="mock-card">
                        <div
                          className="mock-img"
                          style={{
                            backgroundImage:
                              "url('https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=70')",
                          }}
                        />
                        <div className="mock-card-body">
                          <div className="mock-caption">
                            Fresh produce, every single day. 🌿 Come visit us
                            this weekend...
                          </div>
                          <span className="mock-status">● Approved</span>
                        </div>
                      </div>
                      <div className="mock-card">
                        <div
                          className="mock-img"
                          style={{
                            backgroundImage:
                              "url('https://images.unsplash.com/photo-1584048603508-4b31894439a9?q=80&w=1310&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
                          }}
                        />
                        <div className="mock-card-body">
                          <div className="mock-caption">
                            Our butcher counter is stocked with premium cuts...
                          </div>
                          <div className="mock-actions">
                            <span
                              className="mock-btn mock-btn-approve"
                              style={{ background: "var(--accent)" }}
                            >
                              Approve
                            </span>
                            <span className="mock-btn mock-btn-changes">
                              Changes
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Design mock */}
                <div className={social ? "hide" : undefined}>
                  <div className="mock-header" style={{ background: "var(--violet)" }}>
                    <div className="mock-avatar">BLM</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                        Bloom &amp; Co
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,.7)" }}>
                        Brand identity project · In progress
                      </div>
                    </div>
                  </div>
                  <div className="mock-body">
                    <div className="mock-deliverable">
                      <div className="mock-del-head">
                        <span className="mock-del-title">Package concepts</span>
                        <span
                          className="mock-status"
                          style={{
                            background: "var(--amber-bg)",
                            color: "var(--amber-ink)",
                          }}
                        >
                          ● Ready for review
                        </span>
                      </div>
                      <div className="mock-vers">
                        <span className="mock-ver">v1</span>
                        <span className="mock-ver">v2</span>
                        <span
                          className="mock-ver"
                          style={{
                            background: "var(--violet)",
                            borderColor: "var(--violet)",
                            color: "#fff",
                          }}
                        >
                          v3 · latest
                        </span>
                      </div>
                      <div
                        className="mock-del-img"
                        style={{
                          backgroundImage:
                            "url('https://images.unsplash.com/photo-1633533446213-a438ff5f0629?q=80&w=1314&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
                        }}
                      />
                      <div style={{ padding: "11px 15px", display: "flex", gap: 6 }}>
                        <span
                          className="mock-btn mock-btn-approve"
                          style={{
                            background: "var(--violet)",
                            flex: 1,
                            textAlign: "center",
                            padding: "7px 0",
                            borderRadius: 7,
                            fontSize: 10,
                            fontWeight: 500,
                          }}
                        >
                          ✓ Approve v3
                        </span>
                        <span
                          className="mock-btn mock-btn-changes"
                          style={{
                            flex: 1,
                            textAlign: "center",
                            padding: "7px 0",
                            borderRadius: 7,
                            fontSize: 10,
                            fontWeight: 500,
                          }}
                        >
                          Request changes
                        </span>
                      </div>
                    </div>

                    <div className="mock-asset">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 5,
                            background: "var(--violet-soft)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                          }}
                        >
                          📥
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>
                          We need something from you
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--ink-soft)",
                          lineHeight: 1.4,
                        }}
                      >
                        Please upload your new updated logos to finish the
                        package design
                      </div>
                      <div className="mock-upload">
                        <div style={{ fontSize: 16, marginBottom: 3 }}>⬆️</div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: "var(--violet)",
                          }}
                        >
                          Tap to upload files
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Founder note ──────────────────────────────────── */}
      <section className="proof">
        <div className="wrap">
          <p className="proof-label">Built by a working studio</p>
          <p className="founder-note">
            We built Signoff because we were tired of chasing clients across
            email, DMs, and Google Docs just to get a simple yes. It&rsquo;s
            the tool we wanted — so we made it.
          </p>
          <p className="founder-attr">
            <strong>Kabelo M.</strong> · Founder, RevHaus Studio
          </p>
        </div>
      </section>

      {/* ── Modes ─────────────────────────────────────────── */}
      <section className="section" id="modes">
        <div className="wrap center">
          <p className="section-tag">Built for how you actually work</p>
          <h2 className="serif">
            Two kinds of work.
            <br />
            One place to get approved.
          </h2>
          <p className="section-lead">
            Signoff adapts to what you&rsquo;re shipping. Quick weekly content
            or a months-long design project — the client experience stays
            simple.
          </p>

          <div className="modes" style={{ textAlign: "left" }}>
            <div className="mode-card">
              <span className="badge badge-social">📱 Social content</span>
              <h3>Weekly posts, approved fast</h3>
              <p>
                Upload the week&rsquo;s posts, send one link, get sign-off
                before you schedule. Perfect for social media managers and
                content creators.
              </p>
              <ul className="mode-list">
                <li>
                  <span className="c" style={{ color: "var(--accent)" }}>✓</span>{" "}
                  Grid view that mirrors the feed
                </li>
                <li>
                  <span className="c" style={{ color: "var(--accent)" }}>✓</span>{" "}
                  Approve or comment per post
                </li>
                <li>
                  <span className="c" style={{ color: "var(--accent)" }}>✓</span>{" "}
                  Instant notify when they sign off
                </li>
              </ul>
            </div>

            <div className="mode-card">
              <span className="badge badge-design">🎨 Design projects</span>
              <h3>Track progress, version by version</h3>
              <p>
                Share deliverables as they evolve. Push new versions, keep every
                round of feedback in context, and request assets from your
                client — all in one link.
              </p>
              <ul className="mode-list">
                <li>
                  <span className="c" style={{ color: "var(--violet)" }}>✓</span>{" "}
                  Version history (v1 → v2 → v3)
                </li>
                <li>
                  <span className="c" style={{ color: "var(--violet)" }}>✓</span>{" "}
                  Comments tied to each version
                </li>
                <li>
                  <span className="c" style={{ color: "var(--violet)" }}>✓</span>{" "}
                  Request files &amp; assets back from clients
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem ───────────────────────────────────────── */}
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="wrap">
          <p className="section-tag">The old way is broken</p>
          <h2 className="serif">
            Approvals shouldn&rsquo;t take
            <br />
            five emails and three days.
          </h2>
          <p className="section-lead">
            Content scattered across email, DMs, and Google Docs.
            &ldquo;Which version did you mean?&rdquo; The thread gets lost. You
            chase. Everyone&rsquo;s frustrated.
          </p>

          <div className="problem-grid">
            <div className="problem-col bad">
              <h3>😮‍💨 Without Signoff</h3>
              <div className="problem-item">
                <span className="x">✕</span> Work scattered across email, DMs,
                and Drive links
              </div>
              <div className="problem-item">
                <span className="x">✕</span> &ldquo;Which version was that
                again?&rdquo; confusion
              </div>
              <div className="problem-item">
                <span className="x">✕</span> Feedback disconnected from what
                it&rsquo;s about
              </div>
              <div className="problem-item">
                <span className="x">✕</span> Chasing clients for files you need
                to keep going
              </div>
              <div className="problem-item">
                <span className="x">✕</span> No record of what was actually
                approved
              </div>
            </div>

            <div className="problem-col">
              <h3>✨ With Signoff</h3>
              <div className="problem-item">
                <span className="c">✓</span> One link. Everything in one place
              </div>
              <div className="problem-item">
                <span className="c">✓</span> Full version history, always in
                context
              </div>
              <div className="problem-item">
                <span className="c">✓</span> Comments live on the exact thing
                they&rsquo;re about
              </div>
              <div className="problem-item">
                <span className="c">✓</span> Request assets and clients upload
                right back
              </div>
              <div className="problem-item">
                <span className="c">✓</span> Every approval logged automatically
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────── */}
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="wrap center">
          <p className="section-tag">Everything you need</p>
          <h2 className="serif">Nothing you don&rsquo;t.</h2>
          <p className="section-lead">
            No bloated project management. No 40-minute onboarding. Just the
            fastest path from &ldquo;here&rsquo;s the work&rdquo; to
            &ldquo;approved.&rdquo;
          </p>

          <div className="features" style={{ textAlign: "left" }}>
            <div className="feature">
              <div className="feature-icon" style={{ background: "var(--green-bg)" }}>
                🔗
              </div>
              <h3>No-login review links</h3>
              <p>
                Your client opens a link and reviews. No account, no password.
                The single biggest reason clients actually respond fast.
              </p>
            </div>

            <div className="feature">
              <div className="feature-icon" style={{ background: "var(--violet-soft)" }}>
                🕑
              </div>
              <h3>Version history</h3>
              <p>
                Every round of a design lives in one place. Clients see how the
                work evolved, and feedback stays tied to the version it was
                about.
              </p>
            </div>

            <div className="feature">
              <div className="feature-icon" style={{ background: "#E6F1FB" }}>
                📥
              </div>
              <h3>Two-way asset requests</h3>
              <p>
                Need headshots, copy, or brand files? Request them right on the
                review page. Clients upload back without a single email.
              </p>
            </div>

            <div className="feature">
              <div className="feature-icon" style={{ background: "var(--amber-bg)" }}>
                🎨
              </div>
              <h3>Branded to each client</h3>
              <p>
                Every review page wears your client&rsquo;s brand color and
                logo. It feels like a premium experience made just for them.
              </p>
            </div>

            <div className="feature">
              <div className="feature-icon" style={{ background: "#FAECE7" }}>
                ⚡
              </div>
              <h3>Instant notifications</h3>
              <p>
                The moment a client approves, comments, or uploads a file, you
                know. No refreshing, no wondering.
              </p>
            </div>

            <div className="feature">
              <div className="feature-icon" style={{ background: "var(--green-bg)" }}>
                ✓
              </div>
              <h3>A record of every sign-off</h3>
              <p>
                Every approval is timestamped and saved. If a client ever says
                &ldquo;I never approved that,&rdquo; you&rsquo;ve got the
                receipt.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────── */}
      <section className="section" id="how" style={{ paddingTop: 24 }}>
        <div className="wrap">
          <p className="section-tag">Live in 60 seconds</p>
          <h2 className="serif">
            From signup to first approval,
            <br />
            faster than a coffee break.
          </h2>

          <div className="steps">
            <div className="step">
              <div className="step-num">1</div>
              <h3>Add your client</h3>
              <p>
                Drop in their name and brand color, pick social or design mode.
                We generate a beautiful, branded review page instantly.
              </p>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <h3>Share your work</h3>
              <p>
                Upload posts or push a design version. Add a note, request any
                assets you need, then copy the shareable link.
              </p>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <h3>Get approved</h3>
              <p>
                Your client reviews on any device, approves or comments, uploads
                what you asked for — and you&rsquo;re notified instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────── */}
      <section className="section" id="pricing" style={{ paddingTop: 24 }}>
        <div className="wrap center">
          <p className="section-tag">Honest pricing</p>
          <h2 className="serif">Start free. Upgrade when you grow.</h2>
          <p className="section-lead">
            No trials that expire. No credit card to start. Free forever for
            your first client.
          </p>

          <div className="pricing" style={{ textAlign: "left" }}>
            <div className="price-card">
              <div className="price-name">Free</div>
              <div className="price-amount">
                <span className="price-num">$0</span>
                <span className="price-per">/forever</span>
              </div>
              <p className="price-desc">
                Perfect for testing the waters with one client.
              </p>
              <ul className="price-features">
                <li><span className="check">✓</span> 1 active client</li>
                <li><span className="check">✓</span> Social or design mode</li>
                <li><span className="check">✓</span> No-login review links</li>
                <li><span className="check">✓</span> Email notifications</li>
              </ul>
              <Link href="/signup" className="price-btn light">
                Start free
              </Link>
            </div>

            <div className="price-card featured">
              <div className="price-badge">MOST POPULAR</div>
              <div className="price-name">Solo</div>
              <div className="price-amount">
                <span className="price-num">$9</span>
                <span className="price-per">/month</span>
              </div>
              <p className="price-desc">
                For freelancers running a handful of clients.
              </p>
              <ul className="price-features">
                <li><span className="check">✓</span> Up to 5 clients</li>
                <li>
                  <span className="check">✓</span> Unlimited posts &amp;
                  deliverables
                </li>
                <li>
                  <span className="check">✓</span> Version history &amp; asset
                  requests
                </li>
                <li><span className="check">✓</span> Custom branding</li>
                <li>
                  <span className="check">✓</span> Approval history &amp; records
                </li>
              </ul>
              <Link href="/signup" className="price-btn dark">
                Get started
              </Link>
            </div>

            <div className="price-card">
              <div className="price-name">Studio</div>
              <div className="price-amount">
                <span className="price-num">$19</span>
                <span className="price-per">/month</span>
              </div>
              <p className="price-desc">
                For growing agencies managing many clients.
              </p>
              <ul className="price-features">
                <li><span className="check">✓</span> Unlimited clients</li>
                <li><span className="check">✓</span> Unlimited everything</li>
                <li><span className="check">✓</span> White-label review links</li>
                <li><span className="check">✓</span> Priority support</li>
                <li><span className="check">✓</span> Everything in Solo</li>
              </ul>
              <Link href="/signup" className="price-btn light">
                Get started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonial ───────────────────────────────────── */}
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="wrap-narrow" style={{ maxWidth: 920 }}>
          <div className="testimonial">
            <p className="testimonial-quote">
              I built a janky HTML page just to get one client to approve
              content. Signoff is that idea, done right — and now I run my whole
              branding pipeline through it too. Approvals went from three days
              to three hours.
            </p>
            <div className="testimonial-author">
              <div className="testimonial-avatar">K</div>
              <div className="testimonial-name">
                <strong>Kabelo M.</strong>
                <span>Creative Director, RevHaus Studio</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────── */}
      <section className="final-cta">
        <div className="wrap-narrow">
          <h2 className="serif">
            Stop chasing approvals.
            <br />
            Start shipping work.
          </h2>
          <p>
            Set up your first client in 60 seconds. Free forever, no card
            required.
          </p>
          <Link
            href="/signup"
            className="btn-primary"
            style={{ fontSize: 16, padding: "17px 34px" }}
          >
            Get started free
            <ArrowRight />
          </Link>
        </div>
      </section>

      <footer>
        <div className="wrap footer-inner">
          <Link href="/" className="logo" aria-label="Signoff home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {/* Same class as the nav for `display`, sized smaller inline.
                The mobile swap is scoped to .nav-inner, so this one stays. */}
            <img
              src="/signoff-lockup.svg"
              alt=""
              width={96}
              height={24}
              className="logo-lockup"
              style={{ height: 24, width: 96 }}
            />
          </Link>
          <div className="footer-links">
            <a href="#modes">Use cases</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="footer-copy">© 2026 Signoff. Made for creators.</div>
        </div>
      </footer>
    </div>
  );
}
