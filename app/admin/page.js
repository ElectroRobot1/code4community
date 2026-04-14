"use client";

import { useLayoutEffect, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { firestore } from "@/firebase";
import { AppPageLayout, CenteredMain } from "@/components/common/AppPageLayout";
import FullPageLoading from "@/components/common/FullPageLoading";
import { useAuth } from "@/utils/AuthContext";

const ADMIN_EMAIL = "shail40926@gmail.com";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useLayoutEffect(() => {
    document.title = "Code4Community | Admin";
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (!authLoading && user && user.email !== ADMIN_EMAIL) {
      return; // show access denied below
    }
    if (!user) return;

    let cancelled = false;
    async function fetchRequests() {
      try {
        const q = query(
          collection(firestore, "tool_requests"),
          orderBy("submittedAt", "desc")
        );
        const snapshot = await getDocs(q);
        if (!cancelled) {
          setRequests(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load requests.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchRequests();
    return () => { cancelled = true; };
  }, [authLoading, user, router]);

  if (authLoading) {
    return <FullPageLoading />;
  }

  if (!user) {
    return null;
  }

  if (user.email !== ADMIN_EMAIL) {
    return (
      <AppPageLayout>
        <CenteredMain className="px-6">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground mb-2">Access denied</h1>
            <p className="text-muted-foreground mb-4">This page is for administrators only.</p>
            <Link href="/" className="text-primary hover:underline">Back to home</Link>
          </div>
        </CenteredMain>
      </AppPageLayout>
    );
  }

  return (
    <AppPageLayout>
      <div className="border-t border-border bg-muted/20 flex-1">
        <div className="max-w-4xl mx-auto px-6 pt-6 pb-10">
          <h1 className="text-2xl font-bold text-foreground mb-2">Admin dashboard</h1>
          <p className="text-muted-foreground mb-6">Submitted get-started requests</p>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-muted-foreground">Loading requests…</p>
          ) : requests.length === 0 ? (
            <p className="text-muted-foreground">No submissions yet.</p>
          ) : (
            <ul className="space-y-2">
              {requests.map((r) => {
                const isExpanded = expandedId === r.id;
                return (
                  <li key={r.id} className="rounded-lg border border-border bg-background overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      className="w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                    >
                      <span className="font-medium text-foreground">
                        Request submitted by: {r.name || "—"}
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
                            <dd className="text-foreground">{r.submittedAt ? new Date(r.submittedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground font-medium">Email</dt>
                            <dd className="text-foreground">
                              <a href={`mailto:${r.email}`} className="text-primary hover:underline">{r.email || "—"}</a>
                            </dd>
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
          )}
        </div>
      </div>
    </AppPageLayout>
  );
}
