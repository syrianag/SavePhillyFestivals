import { auth } from "@/lib/auth";
import MyScheduleView from "@/features/schedules/MyScheduleView";

export const metadata = {
  title: "My Schedule | Save Philly Festivals",
};

export default async function MySchedulePage() {
  const session = await auth();
  const initialEmail = session?.user?.email || "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <h1 className="text-3xl font-heading font-bold mb-1">My Schedule</h1>
      <p className="text-muted-foreground mb-8">
        Enter the email you used to save events to see your schedule.
      </p>
      <MyScheduleView initialEmail={initialEmail} />
    </div>
  );
}
