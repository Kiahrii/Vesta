export function calculatePaymentStatus(amountPaid, amountDue) {
  if (amountPaid >= amountDue) return "Paid";
  if (amountPaid > 0) return "Partially Paid";
  return "Overdue";
}