import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import {
  PRODUCER_E2E_COOKIE,
  producerE2EFixtureEnabled,
  resetProducerE2EFixture,
  signProducerE2ECookie,
} from "@/features/producer-submission/producer-e2e-fixture";

function secretsMatch(supplied, expected) {
  if (typeof supplied !== "string" || typeof expected !== "string") return false;
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function fixtureCallback(value) {
  if (typeof value !== "string" || value.startsWith("//")) return "/producer/dashboard";
  try {
    const parsed = new URL(value, "https://fixture.invalid");
    const allowedPath = parsed.pathname === "/producer" || parsed.pathname.startsWith("/producer/") || parsed.pathname === "/admin" || parsed.pathname.startsWith("/admin/");
    if (parsed.origin !== "https://fixture.invalid" || !allowedPath) return "/producer/dashboard";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/producer/dashboard";
  }
}

export function GET(request) {
  const url = new URL(request.url);
  if (!producerE2EFixtureEnabled() || !secretsMatch(url.searchParams.get("secret"), process.env.PRODUCER_E2E_SECRET)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const response = NextResponse.redirect(new URL(fixtureCallback(url.searchParams.get("callbackUrl")), url.origin));
  if (url.searchParams.get("action") === "logout") {
    response.cookies.delete(PRODUCER_E2E_COOKIE);
    return response;
  }

  const requestedRole = url.searchParams.get("as");
  if (url.searchParams.get("preserve") !== "1") resetProducerE2EFixture();
  const value = requestedRole === "denied" ? "denied" : requestedRole === "admin" ? "admin" : "producer-a";
  response.cookies.set(PRODUCER_E2E_COOKIE, signProducerE2ECookie(value), {
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    path: "/",
  });
  return response;
}
