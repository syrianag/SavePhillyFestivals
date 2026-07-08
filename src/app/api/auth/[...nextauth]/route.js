import { handlers } from "@/lib/auth"

// Delegates all NextAuth requests to the handlers
export const { GET, POST } = handlers
