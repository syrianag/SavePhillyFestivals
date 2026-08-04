"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const saveScheduleFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  receive_updates: z.boolean().default(false),
});

export default function SaveScheduleForm({ scheduleId, festivalName }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(saveScheduleFormSchema),
    defaultValues: { email: "", receive_updates: false },
  });

  async function onSubmit(data) {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/schedules/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, schedule_id: scheduleId }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to save schedule");
      }

      const result = await response.json();
      setResult(result);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  }

  if (result && !result.error) {
    return (
      <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-sm space-y-1">
        <p className="font-medium text-green-800">Schedule saved!</p>
        <p className="text-green-700">
          A confirmation has been sent to your email.
        </p>
        {result.updates_forwarded && (
          <p className="text-green-700">
            You&apos;ll also receive updates from {festivalName}.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="save-email">Your Email</Label>
        <Input
          id="save-email"
          type="email"
          {...register("email")}
          placeholder="you@example.com"
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          {...register("receive_updates")}
          className="accent-primary"
        />
        <span className="text-sm">
          Send me updates about {festivalName}
        </span>
      </label>

      {result?.error && (
        <p className="text-sm text-destructive">{result.error}</p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save to My Schedule"}
      </Button>
    </form>
  );
}
