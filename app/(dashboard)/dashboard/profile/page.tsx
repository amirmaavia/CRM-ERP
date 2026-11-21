"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { updateProfileSchema, changePasswordSchema } from "@/lib/validations/auth";

type ProfileData = z.infer<typeof updateProfileSchema>;
type PasswordData = z.infer<typeof changePasswordSchema>;

export default function ProfilePage() {
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const profileForm = useForm<ProfileData>({ resolver: zodResolver(updateProfileSchema), defaultValues: { name: "" } });
  const passwordForm = useForm<PasswordData>({ resolver: zodResolver(changePasswordSchema) });

  useEffect(() => { void fetch("/api/auth/me").then(r => r.json()).then(data => { if (data.user) { setAccount(data.user); profileForm.reset({ name: data.user.name }); } }); }, [profileForm]);

  async function handleProfileSubmit(data: ProfileData) {
    setError(""); setSuccess("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const payload = await response.json();
      if (!response.ok) return setError(payload.error || "Update failed");
      setAccount(current => current ? { ...current, name: payload.name } : current);
      setSuccess("Profile updated successfully");
    } catch {
      setError("Service unavailable");
    } finally { setLoading(false); }
  }

  async function handlePasswordSubmit(data: PasswordData) {
    setError(""); setSuccess("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const payload = await response.json();
      if (!response.ok) return setError(payload.error || "Password change failed");
      setSuccess("Password changed successfully");
      passwordForm.reset();
    } catch {
      setError("Service unavailable");
    } finally { setLoading(false); }
  }

  async function handleSignOut() {
    await createSupabaseBrowserClient().auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8"><h1 className="text-3xl font-bold">Profile Settings</h1><p className="text-slate-500 mt-1">Manage your account settings</p></div>

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b p-4">
          <button onClick={() => setActiveTab("profile")} className={`flex-1 py-3 text-center font-semibold ${activeTab === "profile" ? "text-blue-800 border-b-2 border-blue-800" : "text-slate-500 hover:text-slate-700"}`}>Profile</button>
          <button onClick={() => setActiveTab("password")} className={`flex-1 py-3 text-center font-semibold ${activeTab === "password" ? "text-blue-800 border-b-2 border-blue-800" : "text-slate-500 hover:text-slate-700"}`}>Password</button>
        </div>

        <div className="p-6">
          {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {success && <div className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

          {activeTab === "profile" && (
            <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
              <label className="block text-sm font-semibold">Name<input className="field mt-1" {...profileForm.register("name")} placeholder="Your name" /></label>
              {profileForm.formState.errors.name && <p className="text-xs text-red-600">{profileForm.formState.errors.name.message}</p>}
              <label className="block text-sm font-semibold">Email<input className="field mt-1" type="email" value={account?.email || ""} disabled /></label>
              <p className="text-xs text-slate-500">Email cannot be changed. Contact support if needed.</p>
              <button className="btn-primary" disabled={profileForm.formState.isSubmitting || loading}>{profileForm.formState.isSubmitting || loading ? "Saving…" : "Save changes"}</button>
            </form>
          )}

          {activeTab === "password" && (
            <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
              <label className="block text-sm font-semibold">Current password<input className="field mt-1" type="password" {...passwordForm.register("currentPassword")} required minLength={8} /></label>
              {passwordForm.formState.errors.currentPassword && <p className="text-xs text-red-600">{passwordForm.formState.errors.currentPassword.message}</p>}
              <label className="block text-sm font-semibold">New password<input className="field mt-1" type="password" {...passwordForm.register("newPassword")} required minLength={8} maxLength={128} /></label>
              {passwordForm.formState.errors.newPassword && <p className="text-xs text-red-600">{passwordForm.formState.errors.newPassword.message}</p>}
              <button className="btn-primary" disabled={passwordForm.formState.isSubmitting || loading}>{passwordForm.formState.isSubmitting || loading ? "Updating…" : "Change password"}</button>
            </form>
          )}

          <div className="pt-4 border-t">
            <button onClick={handleSignOut} className="btn-secondary w-full">Sign out</button>
          </div>
        </div>
      </div>
    </div>
  );
}
