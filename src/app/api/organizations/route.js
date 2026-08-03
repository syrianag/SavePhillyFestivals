import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  getOrganizations,
  createOrganization,
} from "@/features/organizations/organization-queries";

export async function GET(request) {
  await requireAdmin();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const search = searchParams.get("search") || undefined;

  const result = await getOrganizations({ page, limit, search });
  return NextResponse.json(result);
}

export async function POST(request) {
  await requireAdmin();

  try {
    const body = await request.json();
    const organization = await createOrganization(body);
    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to create organization" },
      { status: 400 }
    );
  }
}
