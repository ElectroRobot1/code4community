"use client";

import { useLayoutEffect, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardTopBar from "../../components/DashboardTopBar";
import Footer from "../../components/Footer";
import { useAuth } from "../../utils/AuthContext";
import StudyStatsSection from "../../components/settings/StudyStatsSection";
import {
  auth,
  updateProfile,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
} from "../../firebase";

const inputClass =
  "w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";
const labelClass = "block text-sm font-medium text-foreground mb-1.5";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground text-background font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity";
const btnSecondary =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg bg-background text-foreground font-medium hover:bg-muted/50 disabled:opacity-50 transition-colors";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMessage, setNameMessage] = useState(null);

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  useLayoutEffect(() => {
    document.title = "Code4Community | Settings";
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
    setName(user.displayName || "");
  }, [user, authLoading, router]);

  const isEmailProvider = user?.providerData?.some((p) => p.providerId === "password") ?? false;

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!user) return;
    setNameMessage(null);
    setNameSaving(true);
    try {
      await updateProfile(user, { displayName: name.trim() || null });
      setNameMessage({ type: "success", text: "Name updated." });
    } catch (err) {
      setNameMessage({ type: "error", text: err.message || "Failed to update name." });
    } finally {
      setNameSaving(false);
    }
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    if (!user || !newEmail.trim()) return;
    setEmailMessage(null);
    if (!isEmailProvider) {
      setEmailMessage({ type: "error", text: "You signed in with Google. Email cannot be changed here." });
      return;
    }
    if (!emailPassword) {
      setEmailMessage({ type: "error", text: "Enter your current password to change email." });
      return;
    }
    setEmailSaving(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, emailPassword);
      await reauthenticateWithCredential(user, cred);
      await updateEmail(user, newEmail.trim());
      setEmailMessage({ type: "success", text: "Email updated. You may need to sign in again." });
      setNewEmail("");
      setEmailPassword("");
    } catch (err) {
      const msg =
        err.code === "auth/invalid-credential"
          ? "Current password is incorrect."
          : err.code === "auth/email-already-in-use"
          ? "That email is already in use."
          : err.message || "Failed to update email.";
      setEmailMessage({ type: "error", text: msg });
    } finally {
      setEmailSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!user) return;
    setPasswordMessage(null);
    if (!isEmailProvider) {
      setPasswordMessage({ type: "error", text: "You signed in with Google. Password is managed by Google." });
      return;
    }
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: "error", text: "Fill in all password fields." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }
    setPasswordSaving(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      setPasswordMessage({ type: "success", text: "Password updated." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg =
        err.code === "auth/invalid-credential"
          ? "Current password is incorrect."
          : err.code === "auth/weak-password"
          ? "New password should be at least 6 characters."
          : err.message || "Failed to update password.";
      setPasswordMessage({ type: "error", text: msg });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) return;
    setPasswordMessage(null);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setPasswordMessage({ type: "success", text: "Password reset email sent. Check your inbox." });
    } catch (err) {
      setPasswordMessage({ type: "error", text: err.message || "Failed to send reset email." });
    }
  };

  if (authLoading || !user || !user.emailVerified) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardTopBar title="Code4Community" showNavLinks={true} />

      <div className="flex-1 container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground mb-8">Manage your account details.</p>

          <StudyStatsSection user={user} />

          {/* Display name */}
          <section className="rounded-xl border border-border bg-background p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Display name</h2>
            <form onSubmit={handleSaveName} className="space-y-3">
              <div>
                <label htmlFor="settings-name" className={labelClass}>
                  Name
                </label>
                <input
                  id="settings-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Your name"
                />
              </div>
              {nameMessage && (
                <p className={`text-sm ${nameMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                  {nameMessage.text}
                </p>
              )}
              <button type="submit" disabled={nameSaving} className={btnPrimary}>
                {nameSaving ? "Saving…" : "Save name"}
              </button>
            </form>
          </section>

          {/* Email */}
          <section className="rounded-xl border border-border bg-background p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Email</h2>
            <p className="text-sm text-muted-foreground mb-4">Current email: {user.email}</p>
            {isEmailProvider ? (
              <form onSubmit={handleChangeEmail} className="space-y-3">
                <div>
                  <label htmlFor="settings-new-email" className={labelClass}>
                    New email
                  </label>
                  <input
                    id="settings-new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className={inputClass}
                    placeholder="new@email.com"
                  />
                </div>
                <div>
                  <label htmlFor="settings-email-password" className={labelClass}>
                    Current password
                  </label>
                  <input
                    id="settings-email-password"
                    type="password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    className={inputClass}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
                {emailMessage && (
                  <p className={`text-sm ${emailMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                    {emailMessage.text}
                  </p>
                )}
                <button type="submit" disabled={emailSaving} className={btnPrimary}>
                  {emailSaving ? "Updating…" : "Change email"}
                </button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">You signed in with Google. Email is managed by your Google account.</p>
            )}
          </section>

          {/* Password */}
          <section className="rounded-xl border border-border bg-background p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Password</h2>
            {isEmailProvider ? (
              <>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div>
                    <label htmlFor="settings-current-password" className={labelClass}>
                      Current password
                    </label>
                    <input
                      id="settings-current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={inputClass}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                  </div>
                  <div>
                    <label htmlFor="settings-new-password" className={labelClass}>
                      New password
                    </label>
                    <input
                      id="settings-new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={inputClass}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label htmlFor="settings-confirm-password" className={labelClass}>
                      Confirm new password
                    </label>
                    <input
                      id="settings-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={inputClass}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      minLength={6}
                    />
                  </div>
                  {passwordMessage && (
                    <p className={`text-sm ${passwordMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                      {passwordMessage.text}
                    </p>
                  )}
                  <button type="submit" disabled={passwordSaving} className={btnPrimary}>
                    {passwordSaving ? "Updating…" : "Change password"}
                  </button>
                </form>
                <p className="text-sm text-muted-foreground mt-4">Or get a password reset link sent to your email:</p>
                <button type="button" onClick={handleSendPasswordReset} className={`${btnSecondary} mt-2`}>
                  Send password reset email
                </button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">You signed in with Google. Password is managed by your Google account.</p>
            )}
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
