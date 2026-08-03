"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, User as UserIcon, MessageSquarePlus } from "lucide-react";

function formatRelative(dateStr) {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function NotesSection({ entityType, entityId, authorEmail }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadNotes() {
    try {
      const params = new URLSearchParams({ entityType, entityId });
      const res = await fetch(`/api/notes?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch notes");
      const data = await res.json();
      setNotes(data.notes || []);
    } catch {
      setError("Failed to load notes.");
    }
  }

  useEffect(() => {
    let ignore = false;
    const params = new URLSearchParams({ entityType, entityId });

    fetch(`/api/notes?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch notes");
        return res.json();
      })
      .then((data) => {
        if (!ignore) setNotes(data.notes || []);
      })
      .catch(() => {
        if (!ignore) setError("Failed to load notes.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [entityType, entityId]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body.trim(),
          entity_type: entityType,
          entity_id: entityId,
          author_email: authorEmail,
        }),
      });
      if (!res.ok) throw new Error("Failed to add note");
      setBody("");
      await loadNotes();
    } catch {
      setError("Failed to add note.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete note");
      await loadNotes();
    } catch {
      setError("Failed to delete note.");
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleAdd} className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Add a note about this producer..."
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none resize-none"
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={saving || !body.trim()}>
            <MessageSquarePlus className="size-3.5" />
            {saving ? "Adding..." : "Add Note"}
          </Button>
        </div>
      </form>

      <div className="space-y-3">
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Loading notes...
          </p>
        ) : notes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No notes yet.
          </p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border bg-muted/30 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <UserIcon className="size-3.5" />
                  <span className="font-medium text-foreground">
                    {note.author_email || "Admin"}
                  </span>
                  <span>· {formatRelative(note.created_at)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(note.id)}
                  aria-label="Delete note"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm">{note.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
