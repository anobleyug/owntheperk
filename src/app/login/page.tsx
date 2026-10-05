import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth-card";
import { loginAction } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/components/auth-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ auth_error?: string; reset?: string }>;
}) {
  const { auth_error: authError, reset } = await searchParams;

  return (
    <AuthCard
      eyebrow="Welcome back"
      title="Log in"
      description="Use your verified email to access the marketplace and your anonymous profile."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {reset === "success" ? (
        <p className="mb-5 rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          Your password was updated. Log in with your new password.
        </p>
      ) : null}
      {authError ? (
        <p role="alert" className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
          That authentication link is invalid or expired. Please try again.
        </p>
      ) : null}
      <AuthForm
        action={loginAction}
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          {
            name: "password",
            label: "Password",
            type: "password",
            autoComplete: "current-password",
          },
        ]}
        submitLabel="Log in"
      />
      <Link
        href="/forgot-password"
        className="mt-5 block text-center text-sm font-semibold text-primary hover:underline"
      >
        Forgot your password?
      </Link>
    </AuthCard>
  );
}
