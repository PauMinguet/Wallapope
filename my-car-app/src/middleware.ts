import { clerkMiddleware } from "@clerk/nextjs/server"

export default clerkMiddleware()

export const config = {
  matcher: [
    "/(app|api)/:path*",
    "/sign-in/[[...sign-in]]",
    "/sign-up/[[...sign-up]]",
    "/((?!.+\\.[\\w]+$|_next).*)",
  ],
} 