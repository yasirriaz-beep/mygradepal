/** Topic names for Chemistry live in `@/lib/topics` (`CHEMISTRY_TOPICS`). This route redirects to Practice → Smart Predict. */
import { redirect } from "next/navigation";

export default function PredictPage() {
  redirect("/practice?tab=predict");
}
