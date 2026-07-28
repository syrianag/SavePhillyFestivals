"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="size-4" />
        Back to Home
      </Link>

      <h1 className="font-heading text-4xl font-bold mb-6">Contact Us</h1>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 size-5 text-primary" />
            <div>
              <h3 className="font-medium">Email</h3>
              <p className="text-muted-foreground text-sm">
                hello@phillyfests.com
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 size-5 text-primary" />
            <div>
              <h3 className="font-medium">Phone</h3>
              <p className="text-muted-foreground text-sm">(215) 555-0123</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-5 text-primary" />
            <div>
              <h3 className="font-medium">Location</h3>
              <p className="text-muted-foreground text-sm">
                Philadelphia, PA
              </p>
            </div>
          </div>
        </div>

        <div>
          {submitted ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <h2 className="font-heading text-xl font-semibold mb-2">
                Message Sent
              </h2>
              <p className="text-muted-foreground text-sm">
                Thank you for reaching out. We&apos;ll get back to you soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium mb-1"
                >
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-1"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>
              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium mb-1"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  rows={4}
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
