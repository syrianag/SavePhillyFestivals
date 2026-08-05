import { redirect } from "next/navigation";
export default function AdminPendingPage() { redirect("/admin/festivals?state=pending_review"); }
