"use client";

import { useLayoutEffect, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/utils/AuthContext";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { firestore } from "@/firebase";
import { AppPageLayout, ContainerMain } from "@/components/common/AppPageLayout";
import FullPageLoading from "@/components/common/FullPageLoading";

const TIMELINE_OPTIONS = [
  { value: "", label: "Select timeline…" },
  { value: "asap", label: "ASAP" },
  { value: "1-3-months", label: "1–3 months" },
  { value: "3-6-months", label: "3–6 months" },
  { value: "exploring", label: "Just exploring" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [myRequestsLoading, setMyRequestsLoading] = useState(false);
  const [myRequestsError, setMyRequestsError] = useState(null);
  const [myRequestsIndexLink, setMyRequestsIndexLink] = useState(null);
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    organization: "",
    timeline: "",
    message: "",
  });

  useLayoutEffect(() => {
    document.title = "Code4Community | Dashboard";
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.emailVerified) {
      router.replace("/verify-email");
      return;
    }
    setForm((prev) => ({
      ...prev,
      name: prev.name || (user.displayName ?? ""),
      email: prev.email || (user.email ?? ""),
    }));
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    setMyRequestsLoading(true);
    setMyRequestsError(null);
    setMyRequestsIndexLink(null);
    (async () => {
      try {
        const q = query(
          collection(firestore, "tool_requests"),
          where("email", "==", user.email)
        );
        const snapshot = await getDocs(q);
        if (!cancelled) {
          const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          list.sort((a, b) => (new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)));
          setMyRequests(list);
        }
      } catch (e) {
        if (!cancelled) {
          setMyRequests([]);
          console.error("Tool requests query failed:", e);
          const msg = e?.message ?? "";
          const urlMatch = msg.match(/https:\/\/console\.firebase\.google\.com[^\s)]+/);
          const indexLink = urlMatch ? urlMatch[0] : null;
          setMyRequestsIndexLink(indexLink);
          setMyRequestsError(
            indexLink
              ? "This query needs a Firestore index. Click the link below to create it (takes a few minutes to build)."
              : msg || "Could not load requests."
          );
        }
      } finally {
        if (!cancelled) setMyRequestsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.email]);

  if (authLoading || !user || !user.emailVerified) {
    return <FullPageLoading />;
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormError(null);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim() || !form.email.trim()) {
      setFormError("Name and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(firestore, "tool_requests"), {
        name: form.name.trim(),
        email: form.email.trim(),
        organization: form.organization?.trim() || "",
        timeline: form.timeline?.trim() || "",
        message: form.message?.trim() || "",
        submittedAt: new Date().toISOString(),
      });
      setFormSubmitted(true);
      if (user?.email) {
        setMyRequestsError(null);
        setMyRequestsIndexLink(null);
        const q = query(
          collection(firestore, "tool_requests"),
          where("email", "==", user.email)
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        list.sort((a, b) => (new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)));
        setMyRequests(list);
      }
    } catch (err) {
      setFormError(err.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppPageLayout>
      <ContainerMain className="py-12">
        <div className="max-w-2xl mx-auto space-y-10">
          <div>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
              <p className="text-muted-foreground">
                Manage your Code4Community services and account in one place.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-10 text-center">
              <p className="text-foreground font-medium mb-2">No services currently activated</p>
              <p className="text-muted-foreground text-sm mb-6">
                Your account is set up. When you activate a service—such as donor management, volunteer platforms, or custom dashboards—it will appear here.
              </p>
              <p className="text-muted-foreground text-sm">
                Use the form below to request a tool or get in touch. You can also email{" "}
                <a href="mailto:brhsc4c@gmail.com" className="text-primary hover:underline">
                  brhsc4c@gmail.com
                </a>
                .
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-1">Pending tool requests</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Your submitted requests. Click a row to view details.
            </p>
            {myRequestsError && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm mb-4 space-y-2">
                <p>{myRequestsError}</p>
                {myRequestsIndexLink && (
                  <a
                    href={myRequestsIndexLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-primary font-medium hover:underline break-all"
                  >
                    Create index in Firebase Console →
                  </a>
                )}
              </div>
            )}
            {myRequestsLoading ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : myRequests.length === 0 && !myRequestsError ? (
              <p className="text-muted-foreground text-sm">No requests yet. Submit one below.</p>
            ) : myRequests.length > 0 ? (
              <ul className="space-y-2 mb-10">
                {myRequests.map((r) => {
                  const isExpanded = expandedRequestId === r.id;
                  const dateStr = r.submittedAt ? new Date(r.submittedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—";
                  return (
                    <li key={r.id} className="rounded-lg border border-border bg-background overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedRequestId(isExpanded ? null : r.id)}
                        className="w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                      >
                        <span className="font-medium text-foreground">
                          Request submitted on {dateStr}
                          <span className="ml-3 inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                            Pending
                          </span>
                        </span>
                        <svg
                          className={`w-5 h-5 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-0 border-t border-border bg-muted/20">
                          <dl className="grid gap-2 text-sm">
                            <div>
                              <dt className="text-muted-foreground font-medium">Date</dt>
                              <dd className="text-foreground">{dateStr}</dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground font-medium">Email</dt>
                              <dd className="text-foreground">{r.email || "—"}</dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground font-medium">Organization</dt>
                              <dd className="text-foreground">{r.organization || "—"}</dd>
                            </div>
                            {r.need != null && r.need !== "" && (
                              <div>
                                <dt className="text-muted-foreground font-medium">Need</dt>
                                <dd className="text-foreground">{r.need}</dd>
                              </div>
                            )}
                            <div>
                              <dt className="text-muted-foreground font-medium">Timeline</dt>
                              <dd className="text-foreground">{r.timeline || "—"}</dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground font-medium">Message</dt>
                              <dd className="text-foreground whitespace-pre-wrap">{r.message || "—"}</dd>
                            </div>
                          </dl>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          <div>
            <h2 className="text-xl font-semibold text-foreground mb-1">Request a tool</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Tell us what you need. We&apos;ll follow up to see how we can help.
            </p>
            {formSubmitted ? (
              <div className="rounded-xl border border-border bg-muted/30 p-8 text-center">
                <p className="text-foreground font-medium mb-2">Thanks for reaching out</p>
                <p className="text-muted-foreground text-sm">
                  We&apos;ve received your request and will get back to you within 1–2 business days.
                </p>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="rounded-xl border border-border bg-background shadow-sm p-6 md:p-8 space-y-5">
                {formError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                    {formError}
                  </div>
                )}
                <div>
                  <label htmlFor="dashboard-name" className="block text-sm font-medium text-foreground mb-1.5">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="dashboard-name"
                    name="name"
                    type="text"
                    required
                    readOnly
                    value={form.name}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-muted/50 text-foreground cursor-not-allowed"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="dashboard-email" className="block text-sm font-medium text-foreground mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="dashboard-email"
                    name="email"
                    type="email"
                    required
                    readOnly
                    value={form.email}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-muted/50 text-foreground cursor-not-allowed"
                    placeholder="you@organization.org"
                  />
                </div>
                <div>
                  <label htmlFor="dashboard-organization" className="block text-sm font-medium text-foreground mb-1.5">
                    Organization
                  </label>
                  <input
                    id="dashboard-organization"
                    name="organization"
                    type="text"
                    value={form.organization}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Organization name (optional)"
                  />
                </div>
                <div>
                  <label htmlFor="dashboard-timeline" className="block text-sm font-medium text-foreground mb-1.5">
                    Timeline
                  </label>
                  <select
                    id="dashboard-timeline"
                    name="timeline"
                    value={form.timeline}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {TIMELINE_OPTIONS.map((opt) => (
                      <option key={opt.value || "empty"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="dashboard-message" className="block text-sm font-medium text-foreground mb-1.5">
                    Please detail what tool you would like created and any relevant details
                  </label>
                  <textarea
                    id="dashboard-message"
                    name="message"
                    rows={4}
                    value={form.message}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
                    placeholder="Describe the tool you need and any relevant details"
                  />
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-foreground text-background font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Sending…" : "Submit"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </ContainerMain>
    </AppPageLayout>
  );
}
