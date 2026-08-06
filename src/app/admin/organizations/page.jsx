"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building2,
  Plus,
  ExternalLink,
  Pencil,
  Trash2,
  Search,
  Globe,
  Mail,
} from "lucide-react";
import Link from "next/link";

function MessageBanner({ message, type }) {
  if (!message) return null;
  const styles =
    type === "success"
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-red-50 text-red-700 border-red-200";
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles}`}>
      {message}
    </div>
  );
}

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    website_url: "",
    email: "",
    phone: "",
    address: "",
    city: "Philadelphia",
    state: "PA",
  });
  const [createLoading, setCreateLoading] = useState(false);

  const [editOrg, setEditOrg] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  const [deleteOrg, setDeleteOrg] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const flash = useCallback((text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  }, []);

  const fetchOrganizations = useCallback(async () => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/organizations${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setOrganizations(data.organizations || []);
    } catch {
      flash("Failed to load organizations.", "error");
    } finally {
      setLoading(false);
    }
  }, [search, flash]);

  useEffect(() => {
    let ignore = false;
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    fetch(`/api/organizations${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        if (!ignore) setOrganizations(data.organizations || []);
      })
      .catch(() => {
        if (!ignore) flash("Failed to load organizations.", "error");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [search, flash]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) throw new Error("Failed to create");
      flash("Organization created.");
      setCreateOpen(false);
      setCreateForm({
        name: "", description: "", website_url: "",
        email: "", phone: "", address: "",
        city: "Philadelphia", state: "PA",
      });
      await fetchOrganizations();
    } catch (err) {
      flash(err.message, "error");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editOrg) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/organizations/${editOrg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("Failed to update");
      flash("Organization updated.");
      setEditOrg(null);
      await fetchOrganizations();
    } catch (err) {
      flash(err.message, "error");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteOrg) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/organizations/${deleteOrg.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      flash("Organization deleted.");
      setDeleteOrg(null);
      await fetchOrganizations();
    } catch (err) {
      flash(err.message, "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-heading font-bold">Organizations</h1>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Content</p>
          <h1 className="text-3xl font-heading font-bold">Organizations</h1>
          <p className="text-muted-foreground">
            Manage festival hosting organizations
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus className="size-4" />
            New Organization
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
              <DialogDescription>
                Add a new festival hosting organization.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Name *</Label>
                <Input
                  id="org-name" required
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Organization name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-desc">Description</Label>
                <Input
                  id="org-desc"
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Brief description"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="org-email">Email</Label>
                  <Input
                    id="org-email" type="email"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="org@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-phone">Phone</Label>
                  <Input
                    id="org-phone"
                    value={createForm.phone}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    placeholder="(215) 555-0000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-website">Website</Label>
                <Input
                  id="org-website" type="url"
                  value={createForm.website_url}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, website_url: e.target.value }))
                  }
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-address">Address</Label>
                <Input
                  id="org-address"
                  value={createForm.address}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, address: e.target.value }))
                  }
                  placeholder="123 Main St"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createLoading}>
                  {createLoading ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <MessageBanner message={message.text} type={message.type} />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {organizations.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No organizations yet. Create one to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-y text-left text-sm font-medium text-muted-foreground">
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Contact</th>
                    <th className="px-6 py-3">Website</th>
                    <th className="px-6 py-3 text-center">Festivals</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => (
                    <tr
                      key={org.id}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-yellow/10 text-brand-yellow">
                            <Building2 className="size-4" />
                          </div>
                          <div>
                            <span className="font-medium">{org.name}</span>
                            <p className="text-xs text-muted-foreground">
                              {org.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="text-sm">
                          {org.email && (
                            <p className="flex items-center gap-1">
                              <Mail className="size-3" />
                              {org.email}
                            </p>
                          )}
                          {org.phone && (
                            <p className="text-muted-foreground">{org.phone}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        {org.website_url ? (
                          <a
                            href={org.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <Globe className="size-3" />
                            Visit
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center font-medium">
                        {org._count?.festivals ?? 0}
                      </td>
                      <td className="px-6 py-3">
                        <Badge
                          variant="outline"
                          className={
                            org.status === "active"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                          }
                        >
                          {org.status || "active"}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex gap-1">
                          <Link href={`/organizations/${org.slug}`}>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`View ${org.name}`}
                            >
                              <ExternalLink className="size-3.5" />
                            </Button>
                          </Link>

                          <Dialog
                            open={editOrg?.id === org.id}
                            onOpenChange={(open) => {
                              if (open) {
                                setEditOrg(org);
                                setEditForm({
                                  name: org.name,
                                  description: org.description || "",
                                  website_url: org.website_url || "",
                                  email: org.email || "",
                                  phone: org.phone || "",
                                  address: org.address || "",
                                });
                              } else {
                                setEditOrg(null);
                              }
                            }}
                          >
                            <DialogTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  aria-label={`Edit ${org.name}`}
                                />
                              }
                            >
                              <Pencil className="size-3" />
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Edit Organization</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-2">
                                <div className="space-y-2">
                                  <Label>Name</Label>
                                  <Input
                                    value={editForm.name || ""}
                                    onChange={(e) =>
                                      setEditForm((f) => ({
                                        ...f,
                                        name: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Description</Label>
                                  <Input
                                    value={editForm.description || ""}
                                    onChange={(e) =>
                                      setEditForm((f) => ({
                                        ...f,
                                        description: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                      value={editForm.email || ""}
                                      onChange={(e) =>
                                        setEditForm((f) => ({
                                          ...f,
                                          email: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <Input
                                      value={editForm.phone || ""}
                                      onChange={(e) =>
                                        setEditForm((f) => ({
                                          ...f,
                                          phone: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Website</Label>
                                  <Input
                                    value={editForm.website_url || ""}
                                    onChange={(e) =>
                                      setEditForm((f) => ({
                                        ...f,
                                        website_url: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setEditOrg(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleEdit}
                                  disabled={editLoading}
                                >
                                  {editLoading ? "Saving..." : "Save"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Dialog
                            open={deleteOrg?.id === org.id}
                            onOpenChange={(open) => {
                              if (open) setDeleteOrg(org);
                              else setDeleteOrg(null);
                            }}
                          >
                            <DialogTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  className="text-destructive hover:text-destructive"
                                  aria-label={`Delete ${org.name}`}
                                />
                              }
                            >
                              <Trash2 className="size-3" />
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-sm">
                              <DialogHeader>
                                <DialogTitle>Delete Organization</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete{" "}
                                  <strong>{deleteOrg?.name}</strong>? Festivals
                                  linked to this organization will not be
                                  deleted.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setDeleteOrg(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={handleDelete}
                                  disabled={deleteLoading}
                                >
                                  {deleteLoading ? "Deleting..." : "Delete"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
