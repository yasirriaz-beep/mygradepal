export const TRIAL_DAYS = 7;
export const TRIAL_START_KEY = "trial_start_date";

export type TrialStatus = "Free Trial" | "Trial Expired";

export type TrialInfo = {
  status: TrialStatus;
  startDate: string;
  daysElapsed: number;
  daysRemaining: number;
  progressPercent: number;
};

const MS_PER_DAY = 86400000;

export function getTrialInfo(): TrialInfo {
  if (typeof window === "undefined") {
    return {
      status: "Free Trial",
      startDate: new Date().toISOString(),
      daysElapsed: 0,
      daysRemaining: TRIAL_DAYS,
      progressPercent: 0,
    };
  }

  let startDate = localStorage.getItem(TRIAL_START_KEY);
  if (!startDate) {
    startDate = new Date().toISOString();
    localStorage.setItem(TRIAL_START_KEY, startDate);
  }

  const elapsedRaw = Math.floor((Date.now() - new Date(startDate).getTime()) / MS_PER_DAY);
  const daysElapsed = Math.max(0, elapsedRaw);
  const daysRemaining = Math.max(0, TRIAL_DAYS - daysElapsed);
  const status: TrialStatus = daysRemaining > 0 ? "Free Trial" : "Trial Expired";
  const progressPercent = Math.min(100, Math.round((daysElapsed / TRIAL_DAYS) * 100));

  return {
    status,
    startDate,
    daysElapsed,
    daysRemaining,
    progressPercent,
  };
}
