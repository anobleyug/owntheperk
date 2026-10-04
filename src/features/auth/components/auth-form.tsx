"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { initialFormState, type FormState } from "@/features/auth/types";

type AuthAction = (state: FormState, formData: FormData) => Promise<FormState>;

type Field = {
  name: "email" | "password" | "confirmPassword";
  label: string;
  type: "email" | "password";
  autoComplete: string;
  hint?: string;
};

const inputClassName =
  "min-h-12 w-full rounded-2xl border border-input bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25 disabled:opacity-60";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Please wait…" : label}
    </Button>
  );
}

export function AuthForm({
  action,
  fields,
  submitLabel,
}: {
  action: AuthAction;
  fields: Field[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {fields.map((field) => {
        const error = state.fieldErrors?.[field.name]?.[0];
        const errorId = `${field.name}-error`;

        return (
          <div key={field.name} className="space-y-2">
            <label htmlFor={field.name} className="text-sm font-semibold">
              {field.label}
            </label>
            <input
              id={field.name}
              name={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              required
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              className={inputClassName}
            />
            {field.hint && !error ? (
              <p className="text-xs leading-5 text-muted-foreground">{field.hint}</p>
            ) : null}
            {error ? (
              <p id={errorId} className="text-xs font-medium text-red-700">
                {error}
              </p>
            ) : null}
          </div>
        );
      })}

      {state.message ? (
        <div
          role={state.status === "error" ? "alert" : "status"}
          className={
            state.status === "error"
              ? "rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
              : "rounded-2xl bg-secondary px-4 py-3 text-sm leading-6 text-secondary-foreground"
          }
        >
          {state.message}
        </div>
      ) : null}

      <SubmitButton label={submitLabel} />
    </form>
  );
}
