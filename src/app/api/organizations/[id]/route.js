import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
} from "@/features/organizations/organization-queries";

export async function GET(request, { params }) {
  await requireAdmin();
  const { id } = await params;

  const organization = await getOrganizationById(id);
  if (!organization) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ organization });
}

export async function PATCH(request, { params }) {
  await requireAdmin();
  const { id } = await params;

  try {
    const body = await request.json();
    const organization = await updateOrganization(id, body);
    return NextResponse.json({ organization });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update organization" },
      { status: 400 }
    );
  }
}

export async function DELETE(request, { params }) {
  await requireAdmin();
  const { id } = await params;

  try {
    await deleteOrganization(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to delete organization" },
      { status: 400 }
    );
  }
}
