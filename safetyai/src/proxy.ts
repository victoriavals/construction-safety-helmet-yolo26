import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const development = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "font-src 'self'",
    `connect-src 'self' https://*.hf.space${process.env.NEXT_PUBLIC_API_BASE ? ` ${new URL(process.env.NEXT_PUBLIC_API_BASE).origin}` : ""}${development ? " http://localhost:7860 http://127.0.0.1:7860 ws: wss:" : ""}`,
    "form-action 'self'",
  ].join("; ");
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|config.js|examples|fonts|.*\\.(?:svg|png|jpg|webp)$).*)",
  ],
};
