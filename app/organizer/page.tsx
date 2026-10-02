import type { Metadata } from "next";
import { OrganizerDashboard } from "@/app/components/pages/organizer-dashboard";

export const metadata: Metadata = {
  title: "Organizer | The Gloaming Shelf",
  robots: { index: false, follow: false },
};

export default function OrganizerPage() {
  return (
    <main className="organizer-shell">
      <OrganizerDashboard />
    </main>
  );
}
