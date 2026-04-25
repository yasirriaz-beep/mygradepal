import BottomNav from "@/components/BottomNav";

const masteryData = [
  { subject: "Chemistry", total: 34, topics: [{ name: "Stoichiometry", value: 40 }, { name: "Organic", value: 28 }] },
  { subject: "Physics", total: 21, topics: [{ name: "Forces", value: 25 }, { name: "Electricity", value: 18 }] },
  { subject: "Mathematics", total: 47, topics: [{ name: "Algebra", value: 52 }, { name: "Geometry", value: 42 }] }
];

const attempts = [
  { title: "Chemistry P2 May/June 2022", score: "7/15", date: "Today" },
  { title: "Physics Topic Drill: Electricity", score: "12/20", date: "Yesterday" },
  { title: "Mathematics P4 Oct/Nov 2021", score: "15/20", date: "2 days ago" }
];

export default function ProgressPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-6 sm:px-6">
      <header className="rounded-2xl bg-white p-5 shadow-card">
        <h1 className="heading-font text-3xl font-bold text-slate-900">Your progress</h1>
        <p className="mt-2 inline-flex rounded-full bg-brand-orange px-3 py-1 text-sm font-semibold text-white">
          5-day streak
        </p>
      </header>

      <section className="mt-5 rounded-2xl bg-white p-5 shadow-card">
        <h2 className="heading-font text-xl font-semibold text-slate-900">Mastery by subject</h2>
        <div className="mt-4 space-y-5">
          {masteryData.map((subject) => (
            <article key={subject.subject}>
              <div className="mb-1 flex items-center justify-between">
                <p className="font-semibold text-slate-900">{subject.subject}</p>
                <span className="text-sm text-slate-600">{subject.total}%</span>
              </div>
              <div className="h-2 rounded-full bg-teal-100">
                <div className="h-2 rounded-full bg-brand-teal" style={{ width: `${subject.total}%` }} />
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {subject.topics.map((topic) => (
                  <div key={topic.name} className="rounded-lg border border-teal-100 p-2">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span>{topic.name}</span>
                      <span>{topic.value}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-teal-100">
                      <div
                        className="h-1.5 rounded-full bg-brand-orange"
                        style={{ width: `${topic.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-2xl bg-white p-5 shadow-card">
        <h2 className="heading-font text-xl font-semibold text-slate-900">Recent attempts</h2>
        <ul className="mt-3 space-y-2">
          {attempts.map((attempt) => (
            <li key={attempt.title} className="rounded-lg border border-teal-100 p-3">
              <p className="font-medium text-slate-900">{attempt.title}</p>
              <p className="text-sm text-slate-600">
                Score: <span className="font-semibold">{attempt.score}</span> · {attempt.date}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <BottomNav />
    </main>
  );
}
