import type { Metadata } from "next";

import { AuthCard } from "@/components/auth-card";
import { resetPasswordAction } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/components/auth-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthCard
      eyebrow="Account recovery"
      title="Choose a new password"
      description="Use at least 12 characters. Your existing sessions may be revoked by your Supabase Auth security settings."
    >
      <AuthForm
        action={resetPasswordAction}
        fields={[
          {
            name: "password",
            label: "New password",
            type: "password",
            autoComplete: "new-password",
          },
          {
            name: "confirmPassword",
            label: "Confirm new password",
            type: "password",
            autoComplete: "new-password",
          },
        ]}
        submitLabel="Update password"
      />
    </AuthCard>
  );
}
