export function formatDate(date) {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).replace(",", ".");
}