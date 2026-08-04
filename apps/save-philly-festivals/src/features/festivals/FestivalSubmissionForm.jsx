"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createFestivalSchema } from "./festival-schemas";

const steps = [
  { id: 1, title: "Basic Details" },
  { id: 2, title: "Social Media & Festival Info" },
  { id: 3, title: "Host Info" },
  { id: 4, title: "Your Story" },
  { id: 5, title: "Review & Submit" },
];

const FESTIVAL_AGE_OPTIONS = [
  { value: "first_year", label: "This is our first year" },
  { value: "1_3_years", label: "1–3 years" },
  { value: "4_7_years", label: "4–7 years" },
  { value: "8_15_years", label: "8–15 years" },
  { value: "15_plus_years", label: "15+ years" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const ORG_TYPE_OPTIONS = [
  { value: "non_profit", label: "Non-profit organization" },
  { value: "for_profit", label: "For-profit business" },
  { value: "llc", label: "LLC" },
  { value: "community_group", label: "Community group" },
  { value: "government", label: "Government agency" },
  { value: "school", label: "School / University" },
  { value: "individual", label: "Individual / Sole proprietor" },
  { value: "other", label: "Other" },
];

export default function FestivalSubmissionForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    getValues,
    trigger,
  } = useForm({
    resolver: zodResolver(createFestivalSchema),
    defaultValues: {
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
      social_instagram: "",
      social_facebook: "",
      social_twitter: "",
      social_tiktok: "",
      social_youtube: "",
      festival_age: "",
      festival_age_details: "",
      org_type: "",
    },
  });

  const formData = watch();

  const STEP_FIELDS = {
    1: ["name", "contact_email"],
    2: [],
    3: [],
    4: [],
    5: [],
  };

  async function nextStep() {
    const valid = await trigger(STEP_FIELDS[currentStep]);
    if (valid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length));
    }
  }

  function prevStep() {
    setCurrentStep((prev) => Math.max(prev - 1, steps.length));
  }

  async function onSubmit() {
    setLoading(true);
    setSubmitError(null);

    const values = getValues();

    const submitData = {
      name: values.name,
      description: values.description,
      location: values.location,
      city: values.city,
      state: values.state,
      zip_code: values.zip_code || undefined,
      website_url: values.website_url || undefined,
      contact_name: values.contact_name || undefined,
      contact_email: values.contact_email,
      contact_phone: values.contact_phone || undefined,
      story: values.story || undefined,
      mission: values.mission || undefined,
      history: values.history || undefined,
      host_name: values.host_name || undefined,
      host_title: values.host_title || undefined,
      host_about: values.host_about || undefined,
      host_social: values.host_social || undefined,
      social_instagram: values.social_instagram || undefined,
      social_facebook: values.social_facebook || undefined,
      social_twitter: values.social_twitter || undefined,
      social_tiktok: values.social_tiktok || undefined,
      social_youtube: values.social_youtube || undefined,
      festival_age: values.festival_age || undefined,
      festival_age_details: values.festival_age_details || undefined,
      org_type: values.org_type || undefined,
      start_date: values.start_date
        ? new Date(values.start_date).toISOString()
        : undefined,
      end_date: values.end_date
        ? new Date(values.end_date).toISOString()
        : undefined,
    };

    try {
      const response = await fetch("/api/festivals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
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
      setSubmitError(err.message);
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
                  {...register("name")}
                  placeholder="e.g., South Philly Summer Fest"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    {...register("start_date")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    {...register("end_date")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Venue / Location</Label>
                <Input
                  id="location"
                  {...register("location")}
                  placeholder="e.g., FDR Park"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" {...register("city")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" {...register("state")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">ZIP Code</Label>
                  <Input
                    id="zip_code"
                    {...register("zip_code")}
                    placeholder="19101"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website_url">Website URL</Label>
                <Input
                  id="website_url"
                  type="url"
                  {...register("website_url")}
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
                      {...register("contact_name")}
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Email *</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      {...register("contact_email")}
                      placeholder="jane@example.com"
                    />
                    {errors.contact_email && (
                      <p className="text-sm text-destructive">
                        {errors.contact_email.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Phone</Label>
                  <Input
                    id="contact_phone"
                    type="tel"
                    {...register("contact_phone")}
                    placeholder="(215) 555-0123"
                  />
                </div>
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <p className="text-sm text-muted-foreground">
                Help attendees find and follow your festival online, and tell us a bit about your festival&apos;s history.
              </p>

              <div className="space-y-2">
                <Label>How long has your festival been around?</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {FESTIVAL_AGE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer transition-colors ${
                        formData.festival_age === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-input hover:bg-muted"
                      }`}
                    >
                      <input
                        type="radio"
                        value={opt.value}
                        {...register("festival_age")}
                        className="accent-primary"
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="festival_age_details">Additional Details (optional)</Label>
                <textarea
                  id="festival_age_details"
                  rows={3}
                  {...register("festival_age_details")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Any milestones, past venues, or notable moments..."
                />
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="font-medium">Social Media Handles</h3>
                <p className="text-sm text-muted-foreground">
                  Share your festival&apos;s social media pages so we can link and tag you.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="social_instagram">Instagram</Label>
                  <Input
                    id="social_instagram"
                    {...register("social_instagram")}
                    placeholder="instagram.com/yourfestival"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social_facebook">Facebook</Label>
                  <Input
                    id="social_facebook"
                    {...register("social_facebook")}
                    placeholder="facebook.com/yourfestival"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social_twitter">Twitter / X</Label>
                  <Input
                    id="social_twitter"
                    {...register("social_twitter")}
                    placeholder="x.com/yourfestival"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social_tiktok">TikTok</Label>
                  <Input
                    id="social_tiktok"
                    {...register("social_tiktok")}
                    placeholder="tiktok.com/@yourfestival"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social_youtube">YouTube</Label>
                  <Input
                    id="social_youtube"
                    {...register("social_youtube")}
                    placeholder="youtube.com/@yourfestival"
                  />
                </div>
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              <p className="text-sm text-muted-foreground">
                Tell attendees about yourself or your organization. This is optional but helps build trust.
              </p>

              <div className="space-y-2">
                <Label htmlFor="org_type">Organization Type</Label>
                <select
                  id="org_type"
                  {...register("org_type")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select organization type...</option>
                  {ORG_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="host_name">Host / Organization Name</Label>
                <Input
                  id="host_name"
                  {...register("host_name")}
                  placeholder="e.g., South Philly Arts Collective"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host_title">Your Role / Title</Label>
                <Input
                  id="host_title"
                  {...register("host_title")}
                  placeholder="e.g., Festival Director"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host_about">About the Host</Label>
                <textarea
                  id="host_about"
                  rows={4}
                  {...register("host_about")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Tell attendees a bit about yourself or your organization..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host_social">Primary Website / Social Link</Label>
                <Input
                  id="host_social"
                  type="url"
                  {...register("host_social")}
                  placeholder="https://instagram.com/yourfestival"
                />
              </div>
            </>
          )}

          {currentStep === 4 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="description">Festival Description</Label>
                <textarea
                  id="description"
                  rows={4}
                  {...register("description")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Tell us about your festival..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="story">Your Story</Label>
                <textarea
                  id="story"
                  rows={4}
                  {...register("story")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="What inspired you to start this festival?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mission">Mission & Vision</Label>
                <textarea
                  id="mission"
                  rows={4}
                  {...register("mission")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="What is the mission behind your festival?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="history">Festival History</Label>
                <textarea
                  id="history"
                  rows={4}
                  {...register("history")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="How long has this festival been running? Any milestones?"
                />
              </div>
            </>
          )}

          {currentStep === 5 && (
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

              {formData.festival_age && (
                <div className="border-t pt-4 space-y-2">
                  <h4 className="font-medium text-sm">Festival Info</h4>
                  <p className="text-sm">
                    <strong>How long running:</strong>{" "}
                    {FESTIVAL_AGE_OPTIONS.find((o) => o.value === formData.festival_age)?.label || formData.festival_age}
                  </p>
                  {formData.festival_age_details && (
                    <p className="text-sm text-muted-foreground">{formData.festival_age_details}</p>
                  )}
                </div>
              )}

              {(formData.social_instagram || formData.social_facebook || formData.social_twitter || formData.social_tiktok || formData.social_youtube) && (
                <div className="border-t pt-4 space-y-2">
                  <h4 className="font-medium text-sm">Social Media</h4>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {formData.social_instagram && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">Instagram: {formData.social_instagram}</span>}
                    {formData.social_facebook && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">Facebook: {formData.social_facebook}</span>}
                    {formData.social_twitter && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">Twitter/X: {formData.social_twitter}</span>}
                    {formData.social_tiktok && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">TikTok: {formData.social_tiktok}</span>}
                    {formData.social_youtube && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">YouTube: {formData.social_youtube}</span>}
                  </div>
                </div>
              )}

              {(formData.host_name || formData.host_title || formData.org_type) && (
                <div className="border-t pt-4 space-y-2">
                  <h4 className="font-medium text-sm">Host Information</h4>
                  {formData.org_type && (
                    <p className="text-sm">
                      <strong>Org Type:</strong>{" "}
                      {ORG_TYPE_OPTIONS.find((o) => o.value === formData.org_type)?.label || formData.org_type}
                    </p>
                  )}
                  {formData.host_name && <p className="text-sm"><strong>Name:</strong> {formData.host_name}</p>}
                  {formData.host_title && <p className="text-sm"><strong>Role:</strong> {formData.host_title}</p>}
                  {formData.host_about && <p className="text-sm text-muted-foreground">{formData.host_about}</p>}
                </div>
              )}

              {submitError && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {submitError}
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
              <Button type="button" onClick={handleSubmit(onSubmit)} disabled={loading}>
                {loading ? "Submitting..." : "Submit Festival"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
