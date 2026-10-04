"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { initialFormState, type FormState } from "@/features/auth/types";

type ProfileAction = (state: FormState, formData: FormData) => Promise<FormState>;

const inputClassName =
  "min-h-12 w-full rounded-2xl border border-input bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25";

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function ProfileForm({
  action,
  defaults,
  submitLabel,
}: {
  action: ProfileAction;
  defaults?: { username?: string; avatarUrl?: string; bio?: string };
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div className="space-y-2">
        <label htmlFor="username" className="text-sm font-semibold">
          Public username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="nickname"
          defaultValue={defaults?.username}
          minLength={3}
          maxLength={24}
          required
          aria-invalid={Boolean(state.fieldErrors?.username)}
          aria-describedby="username-help username-error"
          className={inputClassName}
        />
        <p id="username-help" className="text-xs leading-5 text-muted-foreground">
          3–24 characters. Start with a letter; use letters, numbers, underscores, or
          hyphens. Do not use your email, phone number, or real name.
        </p>
        {state.fieldErrors?.username?.[0] ? (
          <p id="username-error" className="text-xs font-medium text-red-700">
            {state.fieldErrors.username[0]}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="avatarUrl" className="text-sm font-semibold">
          Avatar URL <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <input
          id="avatarUrl"
          name="avatarUrl"
          type="url"
          inputMode="url"
          defaultValue={defaults?.avatarUrl}
          placeholder="https://…"
          aria-invalid={Boolean(state.fieldErrors?.avatarUrl)}
          aria-describedby="avatar-help avatar-error"
          className={inputClassName}
        />
        <p id="avatar-help" className="text-xs leading-5 text-muted-foreground">
          Use an HTTPS image URL that does not reveal private information.
        </p>
        {state.fieldErrors?.avatarUrl?.[0] ? (
          <p id="avatar-error" className="text-xs font-medium text-red-700">
            {state.fieldErrors.avatarUrl[0]}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="bio" className="text-sm font-semibold">
          Short bio <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={defaults?.bio}
          maxLength={240}
          rows={4}
          aria-invalid={Boolean(state.fieldErrors?.bio)}
          aria-describedby="bio-help bio-error"
          className={`${inputClassName} resize-y py-3`}
        />
        <p id="bio-help" className="text-xs leading-5 text-muted-foreground">
          Keep it pseudonymous and under 240 characters.
        </p>
        {state.fieldErrors?.bio?.[0] ? (
          <p id="bio-error" className="text-xs font-medium text-red-700">
            {state.fieldErrors.bio[0]}
          </p>
        ) : null}
      </div>

      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={
            state.status === "error"
              ? "rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800"
              : "rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground"
          }
        >
          {state.message}
        </p>
      ) : null}

      <SaveButton label={submitLabel} />
    </form>
  );
}
