import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth-card";
import { forgotPasswordAction } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/components/auth-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      eyebrow="Account recovery"
      title="Reset your password"
      description="Enter your account email and we’ll send a time-limited reset link if it matches an account."
      footer={
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Return to login
        </Link>
      }
    >
      <AuthForm
        action={forgotPasswordAction}
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
        ]}
        submitLabel="Send reset link"
      />
    </AuthCard>
  );
}
