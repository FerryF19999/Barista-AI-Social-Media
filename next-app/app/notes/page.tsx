import { cookies } from "next/headers";
import { createClient } from "../../utils/supabase/server";

export default async function NotesPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: notes, error } = await supabase
    .from("notes")
    .select("id, title")
    .order("id", { ascending: true });

  if (error) {
    return (
      <div className="rounded-md border border-red-500 bg-red-50 p-4 text-sm text-red-700">
        Failed to load notes: {error.message}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {notes?.map((note) => (
        <li key={note.id} className="rounded-md border border-slate-200 p-3">
          {note.title}
        </li>
      ))}
    </ul>
  );
}
