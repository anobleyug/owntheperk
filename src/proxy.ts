import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env/client";

const APP_PATHS = ["/search", "/offers", "/messages", "/profile"];
const AUTH_PATHS = ["/login", "/signup", "/forgot-password"];

function matches(pathname: string, paths: string[]) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const requiresUser = matches(pathname, APP_PATHS) || pathname === "/onboarding";
  const isResetPage = pathname === "/reset-password";

  function redirectWithCookies(path: string) {
    const redirectResponse = NextResponse.redirect(new URL(path, publicEnv.NEXT_PUBLIC_APP_URL));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  if (!user && (requiresUser || isResetPage)) {
    return redirectWithCookies("/login");
  }

  if (!user) {
    return response;
  }

  if (isResetPage) {
    return response;
  }

  if (requiresUser || matches(pathname, AUTH_PATHS)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle<{ onboarding_completed: boolean }>();
    const onboarded = profile?.onboarding_completed === true;

    if (!onboarded && pathname !== "/onboarding") {
      return redirectWithCookies("/onboarding");
    }

    if (onboarded && (pathname === "/onboarding" || matches(pathname, AUTH_PATHS))) {
      return redirectWithCookies("/search");
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
