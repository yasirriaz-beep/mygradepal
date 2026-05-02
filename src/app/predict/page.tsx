import { redirect } from "next/navigation";

export default function PredictPage() {
  redirect("/practice?tab=predict");
}
