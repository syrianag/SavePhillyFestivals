"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  CalendarDays,
  User as UserIcon,
} from "lucide-react";

const COLUMNS = [
  {
    key: "todo",
    label: "To Do",
    dot: "bg-gray-400",
    header: "bg-gray-100 text-gray-700",
  },
  {
    key: "in_progress",
    label: "In Progress",
    dot: "bg-blue-500",
    header: "bg-blue-100 text-blue-700",
  },
  {
    key: "done",
    label: "Done",
    dot: "bg-green-500",
    header: "bg-green-100 text-green-700",
  },
];

const PRIORITIES = {
  high: { label: "High", className: "bg-red-100 text-red-700 border-red-200" },
  medium: {
    label: "Medium",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  low: { label: "Low", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

const EMPTY_FORM = {
  title: "",
  description: "",
  priority: "medium",
  due_date: "",
  assignee_email: "",
};

function toDateInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function formatDueDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [producers, setProducers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function loadTasks() {
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch {
      setMessage("Failed to load tasks.");
    }
  }

  useEffect(() => {
    let ignore = false;

    fetch("/api/tasks")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch tasks");
        return res.json();
      })
      .then((data) => {
        if (!ignore) setTasks(data.tasks || []);
      })
      .catch(() => {
        if (!ignore) setMessage("Failed to load tasks.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    fetch("/api/users?role=producer&limit=100")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch producers");
        return res.json();
      })
      .then((data) => {
        if (!ignore) setProducers(data.users || []);
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(task) {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority || "medium",
      due_date: toDateInputValue(task.due_date),
      assignee_email: task.assignee_email || "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const payload = {
      ...form,
      due_date: form.due_date || null,
      assignee_email: form.assignee_email || "",
    };
    try {
      const res = await fetch(editing ? `/api/tasks/${editing.id}` : "/api/tasks", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save task");
      setDialogOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await loadTasks();
    } catch {
      setMessage("Failed to save task.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMove(task, direction) {
    const idx = COLUMNS.findIndex((c) => c.key === task.status);
    const next = COLUMNS[idx + direction];
    if (!next) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next.key }),
      });
      if (!res.ok) throw new Error("Failed to move task");
      await loadTasks();
    } catch {
      setMessage("Failed to move task.");
    }
  }

  async function handleDelete(task) {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
      await loadTasks();
    } catch {
      setMessage("Failed to delete task.");
    }
  }

  const groupByStatus = (key) => tasks.filter((t) => t.status === key);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Management</p>
          <h1 className="text-3xl font-heading font-bold">Task Board</h1>
          <p className="text-muted-foreground">
            Track follow-ups and action items
          </p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="size-4" />
          New Task
        </Button>
      </div>

      {message && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const colTasks = groupByStatus(col.key);
            return (
              <div key={col.key} className="space-y-3">
                <div
                  className={`flex items-center justify-between rounded-lg px-3 py-2 ${col.header}`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className={`size-2 rounded-full ${col.dot}`} />
                    {col.label}
                  </div>
                  <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-semibold">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {colTasks.length === 0 ? (
                    <div className="rounded-lg border border-dashed px-4 py-8 text-center text-xs text-muted-foreground">
                      No tasks
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const priority =
                        PRIORITIES[task.priority] || PRIORITIES.medium;
                      return (
                        <Card key={task.id} className="shadow-sm">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-sm font-semibold leading-snug">
                                {task.title}
                              </h3>
                              <Badge
                                variant="outline"
                                className={`shrink-0 ${priority.className}`}
                              >
                                {priority.label}
                              </Badge>
                            </div>

                            {task.description && (
                              <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                                {task.description}
                              </p>
                            )}

                            {(task.due_date || task.assignee_email) && (
                              <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                {task.due_date && (
                                  <span className="flex items-center gap-1">
                                    <CalendarDays className="size-3.5" />
                                    {formatDueDate(task.due_date)}
                                  </span>
                                )}
                                {task.assignee_email && (
                                  <span className="flex items-center gap-1">
                                    <UserIcon className="size-3.5" />
                                    {task.assignee_email}
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="mt-3 flex items-center gap-1 border-t pt-2.5">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                disabled={col.key === "todo"}
                                onClick={() => handleMove(task, -1)}
                                aria-label="Move left"
                              >
                                <ChevronLeft className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                disabled={col.key === "done"}
                                onClick={() => handleMove(task, 1)}
                                aria-label="Move right"
                              >
                                <ChevronRight className="size-3.5" />
                              </Button>
                              <div className="flex-1" />
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => openEdit(task)}
                                aria-label="Edit task"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(task)}
                                aria-label="Delete task"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Task" : "New Task"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the task details."
                : "Add a follow-up task to the board."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title *</Label>
              <Input
                id="task-title"
                required
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Follow up with producer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-desc">Description</Label>
              <textarea
                id="task-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={3}
                placeholder="Add details..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, priority: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due">Due Date</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={form.due_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, due_date: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select
                value={form.assignee_email}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, assignee_email: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {producers.map((p) => (
                    <SelectItem key={p.id} value={p.email}>
                      {p.name || p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editing ? "Save Changes" : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
