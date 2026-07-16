"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createFestivalSchema } from "./festival-schemas";

const steps = [
  { id: 1, title: "Basic Details" },
  { id: 2, title: "Host Info" },
  { id: 3, title: "Your Story" },
  { id: 4, title: "Review & Submit" },
];

export default function FestivalSubmissionForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    city: "Philadelphia",
    state: "PA",
    zip_code: "",
    website_url: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    start_date: "",
    end_date: "",
    story: "",
    mission: "",
    history: "",
    host_name: "",
    host_title: "",
    host_about: "",
    host_social: "",
  });

  function updateFormData(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validateStep(step) {
    const stepErrors = {};

    if (step === 1) {
      if (!formData.name.trim()) stepErrors.name = "Festival name is required";
      if (!formData.contact_email.trim()) {
        stepErrors.contact_email = "Contact email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
        stepErrors.contact_email = "Invalid email address";
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }

  function nextStep() {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length));
    }
  }

  function prevStep() {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }

  async function handleSubmit() {
    setLoading(true);
    setErrors({});

    const submitData = {
      name: formData.name,
      description: formData.description,
      location: formData.location,
      city: formData.city,
      state: formData.state,
      zip_code: formData.zip_code || undefined,
      website_url: formData.website_url || undefined,
      contact_name: formData.contact_name || undefined,
      contact_email: formData.contact_email,
      contact_phone: formData.contact_phone || undefined,
      story: formData.story || undefined,
      mission: formData.mission || undefined,
      history: formData.history || undefined,
      host_name: formData.host_name || undefined,
      host_title: formData.host_title || undefined,
      host_about: formData.host_about || undefined,
      host_social: formData.host_social || undefined,
      start_date: formData.start_date
        ? new Date(formData.start_date).toISOString()
        : undefined,
      end_date: formData.end_date
        ? new Date(formData.end_date).toISOString()
        : undefined,
    };

    const validation = createFestivalSchema.safeParse(submitData);

    if (!validation.success) {
      const fieldErrors = {};
      validation.error.issues.forEach((issue) => {
        const field = issue.path[0];
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/festivals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit festival");
      }

      const createdFestival = await response.json();

      if (imageFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", imageFile);
        uploadFormData.append("directory", "uploads");

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });

        if (uploadResponse.ok) {
          const { url } = await uploadResponse.json();
          await fetch(`/api/festivals/${createdFestival.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image_url: url }),
          });
        }
      }

      const isStaffArea = window.location.pathname.startsWith("/admin");
      router.push(isStaffArea ? "/" : "/producer/success");
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-heading font-bold">Submit Your Festival</h1>
        <p className="text-muted-foreground mt-2">
          Share your Philadelphia festival with the community
        </p>
      </div>

      <div className="flex justify-center gap-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              currentStep === step.id
                ? "bg-primary text-primary-foreground"
                : currentStep > step.id
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {step.id}. {step.title}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep - 1].title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentStep === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Festival Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData("name", e.target.value)}
                  placeholder="e.g., South Philly Summer Fest"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => updateFormData("start_date", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => updateFormData("end_date", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Venue / Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => updateFormData("location", e.target.value)}
                  placeholder="e.g., FDR Park"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => updateFormData("city", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => updateFormData("state", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">ZIP Code</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => updateFormData("zip_code", e.target.value)}
                    placeholder="19101"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website_url">Website URL</Label>
                <Input
                  id="website_url"
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => updateFormData("website_url", e.target.value)}
                  placeholder="https://yourfestival.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Festival Image (optional)</Label>
                <input
                  id="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-1 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-32 w-32 rounded-md object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="font-medium">Contact Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Your Name</Label>
                    <Input
                      id="contact_name"
                      value={formData.contact_name}
                      onChange={(e) =>
                        updateFormData("contact_name", e.target.value)
                      }
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Email *</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) =>
                        updateFormData("contact_email", e.target.value)
                      }
                      placeholder="jane@example.com"
                    />
                    {errors.contact_email && (
                      <p className="text-sm text-destructive">
                        {errors.contact_email}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Phone</Label>
                  <Input
                    id="contact_phone"
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) =>
                      updateFormData("contact_phone", e.target.value)
                    }
                    placeholder="(215) 555-0123"
                  />
                </div>
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <p className="text-sm text-muted-foreground">
                Tell attendees about yourself or your organization. This is optional but helps build trust.
              </p>
              <div className="space-y-2">
                <Label htmlFor="host_name">Host / Organization Name</Label>
                <Input
                  id="host_name"
                  value={formData.host_name}
                  onChange={(e) => updateFormData("host_name", e.target.value)}
                  placeholder="e.g., South Philly Arts Collective"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host_title">Your Role / Title</Label>
                <Input
                  id="host_title"
                  value={formData.host_title}
                  onChange={(e) => updateFormData("host_title", e.target.value)}
                  placeholder="e.g., Festival Director"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host_about">About the Host</Label>
                <textarea
                  id="host_about"
                  rows={4}
                  value={formData.host_about}
                  onChange={(e) => updateFormData("host_about", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Tell attendees a bit about yourself or your organization..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host_social">Social Media Link</Label>
                <Input
                  id="host_social"
                  type="url"
                  value={formData.host_social}
                  onChange={(e) => updateFormData("host_social", e.target.value)}
                  placeholder="https://instagram.com/yourfestival"
                />
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="description">Festival Description</Label>
                <textarea
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => updateFormData("description", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Tell us about your festival..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="story">Your Story</Label>
                <textarea
                  id="story"
                  rows={4}
                  value={formData.story}
                  onChange={(e) => updateFormData("story", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="What inspired you to start this festival?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mission">Mission & Vision</Label>
                <textarea
                  id="mission"
                  rows={4}
                  value={formData.mission}
                  onChange={(e) => updateFormData("mission", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="What is the mission behind your festival?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="history">Festival History</Label>
                <textarea
                  id="history"
                  rows={4}
                  value={formData.history}
                  onChange={(e) => updateFormData("history", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="How long has this festival been running? Any milestones?"
                />
              </div>
            </>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="p-4 bg-muted rounded-lg space-y-4">
                <h3 className="font-medium">{formData.name || "Untitled Festival"}</h3>
                <div className="grid gap-2 text-sm text-muted-foreground">
                  {formData.start_date && (
                    <p>
                      <strong>Dates:</strong>{" "}
                      {new Date(formData.start_date).toLocaleDateString()} -{" "}
                      {formData.end_date
                        ? new Date(formData.end_date).toLocaleDateString()
                        : "TBD"}
                    </p>
                  )}
                  {formData.location && (
                    <p>
                      <strong>Location:</strong> {formData.location}, {formData.city},{" "}
                      {formData.state}
                    </p>
                  )}
                  {formData.contact_email && (
                    <p>
                      <strong>Contact:</strong> {formData.contact_email}
                    </p>
                  )}
                </div>
                {formData.description && (
                  <p className="text-sm">{formData.description}</p>
                )}
              </div>

              {(formData.host_name || formData.host_title) && (
                <div className="border-t pt-4 space-y-2">
                  <h4 className="font-medium text-sm">Host Information</h4>
                  {formData.host_name && <p className="text-sm"><strong>Name:</strong> {formData.host_name}</p>}
                  {formData.host_title && <p className="text-sm"><strong>Role:</strong> {formData.host_title}</p>}
                  {formData.host_about && <p className="text-sm text-muted-foreground">{formData.host_about}</p>}
                </div>
              )}

              {errors.submit && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {errors.submit}
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                By submitting, your festival will be reviewed by an admin before
                appearing on the site. You&apos;ll receive an email notification once
                it&apos;s reviewed.
              </p>
            </div>
          )}

          <div className="flex justify-between pt-4">
            {currentStep > 1 ? (
              <Button type="button" variant="outline" onClick={prevStep}>
                Back
              </Button>
            ) : (
              <div />
            )}
            {currentStep < steps.length ? (
              <Button type="button" onClick={nextStep}>
                Next
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={loading}>
                {loading ? "Submitting..." : "Submit Festival"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
