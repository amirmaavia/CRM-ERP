import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function createAuthUser(email: string, password: string, name: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email: email.toLowerCase(), password, email_confirm: true, user_metadata: { name } });
  if (error || !data.user) throw error ?? new Error("Supabase user creation failed");
  return data.user.id;
}

export async function deleteAuthUser(id: string) {
  const { error } = await createSupabaseAdminClient().auth.admin.deleteUser(id);
  if (error) throw error;
}

export async function updateAuthUser(id: string, attributes: { password?: string; banned?: boolean; name?: string }) {
  const { error } = await createSupabaseAdminClient().auth.admin.updateUserById(id, {
    ...(attributes.password ? { password: attributes.password } : {}),
    ...(attributes.banned !== undefined ? { ban_duration: attributes.banned ? "876000h" : "none" } : {}),
    ...(attributes.name ? { user_metadata: { name: attributes.name } } : {}),
  });
  if (error) throw error;
}
