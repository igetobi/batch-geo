import { useState, useEffect } from "react";
import { addNote, listNotes, deleteNote, hasToken, Note } from "../api";

export default function NotesPanel() {
  const isAdmin = hasToken();
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("Kit");
  const [submitted, setSubmitted] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) loadNotes();
  }, [isAdmin]);

  async function loadNotes() {
    setLoading(true);
    try {
      const data = await listNotes();
      setNotes(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!content.trim()) return;
    await addNote(content, author);
    setContent("");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  }

  async function handleDelete(id: string) {
    await deleteNote(id);
    setNotes(notes.filter(n => n.id !== id));
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">
        {isAdmin ? "Notes & Feedback" : "Leave a Note"}
      </h2>
      {!isAdmin ? (
        <div className="space-y-3">
          {submitted ? (
            <p className="text-green-600 font-medium">Note sent! Bruno will see it next time he logs in.</p>
          ) : (
            <>
              <textarea
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                rows={4}
                placeholder="Leave a note for Bruno — describe what you'd like changed or improved…"
                value={content}
                onChange={e => setContent(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Your name"
                value={author}
                onChange={e => setAuthor(e.target.value)}
              />
              <button
                onClick={handleSubmit}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Leave Note
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">{notes.length} note{notes.length !== 1 ? "s" : ""}</span>
            <button
              onClick={loadNotes}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
          {notes.length === 0 ? (
            <p className="text-slate-400 text-sm">No notes yet.</p>
          ) : (
            notes.map(note => (
              <div key={note.id} className="border border-slate-100 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-700 text-sm">{note.author}</span>
                  <span className="text-xs text-slate-400">{new Date(note.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{note.content}</p>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
