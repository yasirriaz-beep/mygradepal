import { buildWeeklyReport } from "@/lib/weeklyReport";

type PageProps = {
  params: Promise<{ userId: string; week: string }>;
};

export default async function WeeklyReportPage({ params }: PageProps) {
  const { userId, week } = await params;
  const report = await buildWeeklyReport(userId, week);
  const planned = Math.max(report.sessions_planned, 1);
  const completionPct = Math.min(100, Math.round((report.sessions_completed / planned) * 100));
  const streakColor =
    report.current_streak >= 30 ? "text-amber-600" : report.current_streak >= 7 ? "text-yellow-600" : "text-slate-700";

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Weekly Parent Report</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{report.student_name}</h1>
        <p className="mt-1 text-sm text-slate-600">Week of {report.week}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Sessions Completed</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{report.sessions_completed}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Questions Attempted</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{report.questions_attempted}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Topics Covered</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{report.topics_covered.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Current Streak</p>
            <p className={`mt-1 text-xl font-semibold ${streakColor}`}>🔥 {report.current_streak} days</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">Sessions completed vs planned</span>
            <span className="text-slate-600">
              {report.sessions_completed}/{report.sessions_planned}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-teal-600" style={{ width: `${completionPct}%` }} />
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-slate-700">Topics covered</p>
          {report.topics_covered.length === 0 ? (
            <p className="text-sm text-slate-500">No topics logged for this week yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {report.topics_covered.map((topic) => (
                <span key={topic} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">Powered by MyGradePal</div>
      </div>
    </main>
  );
}
