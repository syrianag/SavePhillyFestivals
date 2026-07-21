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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2 } from "lucide-react";

const ROLE_COLORS = {
  super_admin: "bg-purple-100 text-purple-700 border-purple-200",
  admin: "bg-blue-100 text-blue-700 border-blue-200",
  producer: "bg-green-100 text-green-700 border-green-200",
  public: "bg-gray-100 text-gray-700 border-gray-200",
};

const ROLE_OPTIONS = ["public", "producer", "admin", "super_admin"];

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

function RoleBadge({ role }) {
  return (
    <Badge
      variant="outline"
      className={ROLE_COLORS[role] || ROLE_COLORS.public}
    >
      {role}
    </Badge>
  );
}

export default function AdminSettingsPage() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "public",
  });
  const [createLoading, setCreateLoading] = useState(false);

  const [editUser, setEditUser] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const flash = useCallback((text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users?limit=100");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      flash("Failed to load users.", "error");
    }
  }, [flash]);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      if (data?.user) setCurrentUser(data.user);
    } catch {
      // session fetch failed silently
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await Promise.all([fetchUsers(), fetchSession()]);
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [fetchUsers, fetchSession]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      flash("Account created successfully.");
      setCreateOpen(false);
      setCreateForm({ name: "", email: "", password: "", role: "public" });
      await fetchUsers();
    } catch (err) {
      flash(err.message, "error");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditRole = async () => {
    if (!editUser || !editRole) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update role");
      flash("Role updated successfully.");
      setEditUser(null);
      await fetchUsers();
    } catch (err) {
      flash(err.message, "error");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/users/${deleteUser.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");
      flash("Account deleted.");
      setDeleteUser(null);
      await fetchUsers();
    } catch (err) {
      flash(err.message, "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-heading font-bold">Settings</h1>
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
      <div>
        <h1 className="text-3xl font-heading font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage accounts and roles</p>
      </div>

      <MessageBanner message={message.text} type={message.type} />

      {currentUser && (
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span>{currentUser.name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{currentUser.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Role</span>
              <RoleBadge role={currentUser.role} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Users ({users.length})</span>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger
                render={<Button size="sm" />}
              >
                <Plus className="size-3.5" />
                Create Account
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Account</DialogTitle>
                  <DialogDescription>
                    Add a new user account to the system.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-name">Name</Label>
                    <Input
                      id="create-name"
                      value={createForm.name}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="Full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-email">Email</Label>
                    <Input
                      id="create-email"
                      type="email"
                      required
                      value={createForm.email}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, email: e.target.value }))
                      }
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-password">Password</Label>
                    <Input
                      id="create-password"
                      type="password"
                      required
                      value={createForm.password}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          password: e.target.value,
                        }))
                      }
                      placeholder="Min. 8 characters"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={createForm.role}
                      onValueChange={(val) =>
                        setCreateForm((f) => ({ ...f, role: val }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createLoading}>
                      {createLoading ? "Creating..." : "Create Account"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-4 py-3 font-medium">
                      {user.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Dialog
                          open={editUser?.id === user.id}
                          onOpenChange={(open) => {
                            if (open) {
                              setEditUser(user);
                              setEditRole(user.role);
                            } else {
                              setEditUser(null);
                            }
                          }}
                        >
                          <DialogTrigger
                            render={
                              <Button variant="ghost" size="icon-xs" />
                            }
                          >
                            <Pencil className="size-3" />
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-sm">
                            <DialogHeader>
                              <DialogTitle>Edit Role</DialogTitle>
                              <DialogDescription>
                                Change the role for {user.name || user.email}.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                              <div className="space-y-2">
                                <Label>Role</Label>
                                <Select
                                  value={editRole}
                                  onValueChange={setEditRole}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ROLE_OPTIONS.map((r) => (
                                      <SelectItem key={r} value={r}>
                                        {r}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setEditUser(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleEditRole}
                                disabled={
                                  editLoading || editRole === user.role
                                }
                              >
                                {editLoading ? "Saving..." : "Save"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Dialog
                          open={deleteUser?.id === user.id}
                          onOpenChange={(open) => {
                            if (open) {
                              setDeleteUser(user);
                            } else {
                              setDeleteUser(null);
                            }
                          }}
                        >
                          <DialogTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="text-destructive hover:text-destructive"
                              />
                            }
                          >
                            <Trash2 className="size-3" />
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-sm">
                            <DialogHeader>
                              <DialogTitle>Delete Account</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete{" "}
                                <strong>{user.name || user.email}</strong>? This
                                action is irreversible.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setDeleteUser(null)}
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
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
