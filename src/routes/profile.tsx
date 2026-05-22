import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Users, GraduationCap, Building2, Save } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — CampusBot" },
      { name: "description", content: "Personalize CampusBot answers to your branch, semester, and hostel block." },
    ],
  }),
  component: ProfilePage,
});

const BRANCHES = ["B.Tech CSE", "B.Tech IT", "B.Tech ECE", "B.Tech Mech", "B.Tech Civil", "BBA", "BCA", "MBA", "Other"];
const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];

function ProfilePage() {
  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("");
  const [hostel, setHostel] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-card text-xs text-muted-foreground mb-4">
          <Users className="size-3" /> Personalization · v0
        </div>
        <h1 className="text-4xl md:text-5xl mb-3">
          Tell us <span className="italic text-primary">about you</span>
        </h1>
        <p className="text-muted-foreground mb-8">
          CampusBot will tailor exam dates, fees, hostel rules, and notices to your branch and year.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
          className="rounded-2xl border bg-card p-6 space-y-5"
          style={{ boxShadow: "var(--shadow-elegant)" }}
        >
          <Field icon={GraduationCap} label="Branch / Program">
            <select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm">
              <option value="">Select your program</option>
              {BRANCHES.map((b) => <option key={b}>{b}</option>)}
            </select>
          </Field>

          <Field icon={GraduationCap} label="Current semester">
            <select value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm">
              <option value="">Select semester</option>
              {SEMESTERS.map((s) => <option key={s}>Semester {s}</option>)}
            </select>
          </Field>

          <Field icon={Building2} label="Hostel block (optional)">
            <input value={hostel} onChange={(e) => setHostel(e.target.value)} placeholder="e.g. Boys Hostel C, Girls Hostel A" className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm" />
          </Field>

          <button className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground inline-flex items-center justify-center gap-2 hover:opacity-90">
            <Save className="size-4" />
            {saved ? "Saved!" : "Save preferences"}
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Preferences will be stored in your account once cloud sync is wired up.
          </p>
        </form>
      </main>
    </div>
  );
}

function Field({ icon: Icon, label, children }: { icon: typeof Users; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-sm font-medium mb-2">
        <Icon className="size-4 text-muted-foreground" />
        {label}
      </span>
      {children}
    </label>
  );
}
