import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ArrowRight,
} from "lucide-react";

export default async function OrganizationPage({ params }) {
  const { slug } = await params;

  const organization = await prisma.organization.findUnique({
    where: { slug },
    include: {
      festivals: {
        where: { status: "approved" },
        include: {
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
        },
        orderBy: { start_date: "asc" },
      },
    },
  });

  if (!organization) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 md:px-8">
        <div className="mb-8 flex items-start gap-6">
          <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-brand-yellow/10">
            <Building2 className="size-10 text-brand-yellow" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-4xl font-heading font-bold">
              {organization.name}
            </h1>
            {organization.description && (
              <p className="mt-2 text-lg text-muted-foreground">
                {organization.description}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {organization.website_url && (
                <a
                  href={organization.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-primary hover:underline"
                >
                  <Globe className="size-4" />
                  Website
                </a>
              )}
              {organization.email && (
                <a
                  href={`mailto:${organization.email}`}
                  className="flex items-center gap-1.5 hover:text-foreground"
                >
                  <Mail className="size-4" />
                  {organization.email}
                </a>
              )}
              {organization.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="size-4" />
                  {organization.phone}
                </span>
              )}
              {organization.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" />
                  {organization.city}
                  {organization.state ? `, ${organization.state}` : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-6 text-2xl font-heading font-bold">
            Festivals ({organization.festivals.length})
          </h2>

          {organization.festivals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No festivals listed yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {organization.festivals.map((festival) => (
                <Link
                  key={festival.id}
                  href={`/festivals/${festival.slug}`}
                  className="group"
                >
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardContent className="p-5">
                      <h3 className="font-heading font-bold group-hover:text-primary">
                        {festival.name}
                      </h3>
                      {festival.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {festival.description}
                        </p>
                      )}
                      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                        {festival.start_date && (
                          <p className="flex items-center gap-2">
                            <Calendar className="size-3.5" />
                            {new Date(festival.start_date).toLocaleDateString(
                              "en-US",
                              {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                            {festival.end_date &&
                              ` – ${new Date(festival.end_date).toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                              })}`}
                          </p>
                        )}
                        {festival.location && (
                          <p className="flex items-center gap-2">
                            <MapPin className="size-3.5" />
                            {festival.location}
                          </p>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {festival.categories.map((fc) => (
                          <Badge
                            key={fc.category.id}
                            variant="outline"
                            className="text-xs"
                          >
                            {fc.category.name}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
