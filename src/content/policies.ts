/**
 * Contact details and policy wording for the help pages
 * (Contact, Shipping, Returns & refunds, Privacy, Terms).
 *
 * ✿ Monisha: this is starting text. Read it, change anything that doesn't
 * match how you work, and fill in the details below. Numbers like the
 * shipping charge come from Admin → Settings automatically.
 * Have the Privacy and Terms pages checked by someone who knows Indian
 * consumer and data law before you take real orders.
 */
export const business = {
  /** Shown on the Contact page and as the grievance officer (required for Indian online shops). */
  ownerName: "Monisha",
  /** Your support email, e.g. hello@yourdomain.in. Leave empty to show WhatsApp and Instagram only. */
  email: "",
  /** City shown on the Contact page. */
  city: "Bengaluru, Karnataka",
  /** Usual reply time, in plain words. */
  replyTime: "within one working day",
  /** Courts for any legal dispute (Terms page). */
  jurisdiction: "Bengaluru, Karnataka",
  /** Date the policies were last updated (change it when you edit them). */
  updated: "19 November 2026",
};

/** How long after delivery a damaged or wrong item can be reported. */
export const DAMAGE_REPORT_HOURS = 48;
/** Working days for a refund to reach the customer after it's approved. */
export const REFUND_DAYS = "5–7 working days";
