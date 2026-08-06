import FestivalsDashboard from "@/components/admin/FestivalsDashboard";

export const metadata = {
  title: "Festivals - Save Philly Festivals",
  description: "View, review, and submit festivals",
};

export default async function AdminFestivalsPage({ searchParams }) {
  const params = await searchParams;
  const initialTab = params?.tab === "submit" ? "submit" : "view";

  return <FestivalsDashboard initialTab={initialTab} />;
}
