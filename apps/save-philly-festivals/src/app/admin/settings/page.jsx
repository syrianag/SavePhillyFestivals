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
import { Plus, Pencil, Power } from "lucide-react";

const ROLE_COLORS = {
  super_admin: "bg-purple-100 text-purple-700 border-purple-200",
  admin: "bg-blue-100 text-blue-700 border-blue-200",
  producer: "bg-green-100 text-green-700 border-green-200",
  public: "bg-gray-100 text-gray-700 border-gray-200",
};

const ROLE_OPTIONS = ["public", "producer", "admin", "super_admin"];
const PRIVILEGED_ROLES = new Set(["admin", "super_admin"]);

function availableRoles(currentUser) {
  return currentUser?.role === "super_admin" ? ROLE_OPTIONS : ["public", "producer"];
}

function defaultRoleForTab(tab, currentUser) {
  if (tab === "staff") return currentUser?.role === "super_admin" ? "super_admin" : "admin";
  return "producer";
}

function createableRolesForTab(tab, currentUser) {
  if (tab === "staff") {
    return currentUser?.role === "super_admin" ? ["admin", "super_admin"] : ["admin"];
  }
  return ["producer", "public"];
}

function canManageUser(currentUser, user) {
  return currentUser?.role === "super_admin" || !PRIVILEGED_ROLES.has(user.role);
}

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
  const [tab, setTab] = useState("producers");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "producer",
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
      setCurrentUser(data.current_user || null);
    } catch {
      flash("Failed to load users.", "error");
    }
  }, [flash]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await fetchUsers();
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [fetchUsers]);

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
      setCreateForm({ name: "", email: "", password: "", role: defaultRoleForTab(tab, currentUser) });
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
      const reactivating = deleteUser.status === "deactivated";
      const res = await fetch(`/api/users/${deleteUser.id}`, reactivating ? {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      } : {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");
      flash(deleteUser.status === "deactivated" ? "Account reactivated." : "Account deactivated.");
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

  const producerUsers = users.filter((user) => user.role === "producer");
  const staffUsers = users.filter((user) => user.role === "admin" || user.role === "super_admin");
  const activeUsers = tab === "producers" ? producerUsers : staffUsers;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage accounts and roles</p>
      </div>

      <MessageBanner message={message.text} type={message.type} />

      <div role="tablist" aria-label="Account management" className="flex w-fit rounded-xl border border-slate-200 bg-slate-100 p-1">
        <button
          role="tab"
          aria-selected={tab === "producers"}
          onClick={() => setTab("producers")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 font-ui text-sm font-bold transition-colors cursor-pointer ${
            tab === "producers" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Producers
          <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs">{producerUsers.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === "staff"}
          onClick={() => setTab("staff")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 font-ui text-sm font-bold transition-colors cursor-pointer ${
            tab === "staff" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Admins &amp; Staff
          <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs">{staffUsers.length}</span>
        </button>
      </div>

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
            <span>{tab === "producers" ? `Producer Accounts (${producerUsers.length})` : `Admin & Staff Accounts (${staffUsers.length})`}</span>
            <Dialog open={createOpen} onOpenChange={(open) => {
              if (open) setCreateForm((f) => ({ ...f, role: defaultRoleForTab(tab, currentUser) }));
              setCreateOpen(open);
            }}>
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
                      minLength={12}
                      maxLength={128}
                      autoComplete="new-password"
                      placeholder="12+ chars with upper/lower/number/symbol"
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
                        {createableRolesForTab(tab, currentUser).map((r) => (
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
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {tab === "producers"
                      ? "No producer accounts yet. Use 'Create Account' to add one."
                      : "No admin or staff accounts found."}
                  </td>
                </tr>
              ) : (
                activeUsers.map((user) => (
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
                    <td className="px-4 py-3">
                      <Badge variant={user.status === "active" ? "outline" : "secondary"}>
                        {user.status}
                      </Badge>
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
                              <Button
                                                              variant="ghost"
                                                              size="icon-xs"
                                                              aria-label={`Edit role for ${user.name || user.email}`}
                                                              disabled={!canManageUser(currentUser, user)}
                                                            />
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
                                    {availableRoles(currentUser).map((r) => (
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
                                aria-label={`${user.status === "deactivated" ? "Reactivate" : "Deactivate"} ${user.name || user.email}`}
                                disabled={!canManageUser(currentUser, user) || user.id === currentUser?.id}
                              />
                            }
                          >
                            <Power className="size-3" />
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-sm">
                            <DialogHeader>
                              <DialogTitle>{user.status === "deactivated" ? "Reactivate Account" : "Deactivate Account"}</DialogTitle>
                              <DialogDescription>
                                {user.status === "deactivated" ? "Restore access for " : "Revoke access for "}
                                <strong>{user.name || user.email}</strong>?
                                {user.status === "active" && " The account and its audit history will be retained."}
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
                                variant={user.status === "active" ? "destructive" : "default"}
                                onClick={handleDelete}
                                disabled={deleteLoading}
                              >
                                {deleteLoading ? "Saving..." : user.status === "deactivated" ? "Reactivate" : "Deactivate"}
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
