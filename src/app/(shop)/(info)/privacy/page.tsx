import type { Metadata } from "next";
import { InfoPage } from "@/components/shop/info-page";
import { business } from "@/content/policies";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What personal details Yours Crafts Woman collects, why, and your choices.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy" intro="We collect only what we need to make and deliver your order, and we never sell it." current="/privacy" updated={business.updated}>
      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>When you order or create an account:</strong> your name, email, mobile number and delivery
          address(es), and what you ordered.
        </li>
        <li>
          <strong>Payments:</strong> handled entirely by Razorpay. We never see or store your card, UPI PIN or bank
          details; we keep only the payment reference.
        </li>
        <li>
          <strong>How the shop is used:</strong> anonymous events such as pages viewed, searches and items added to a
          cart, linked to a random visit ID, not your name. We use this to improve the shop.
        </li>
      </ul>
      <h2>Why we use it</h2>
      <ul>
        <li>To make, pack and deliver your order, and contact you about it.</li>
        <li>To show your orders, saved items and addresses when you sign in.</li>
        <li>To understand what customers like, in totals, never to track individuals.</li>
      </ul>
      <h2>Who else sees it</h2>
      <p>Only the services that run the shop, and only what they need:</p>
      <ul>
        <li>Razorpay (payments)</li>
        <li>The courier (your name, address and phone for delivery)</li>
        <li>Supabase (our secure database and sign-in) and Vercel (website hosting)</li>
        <li>Resend (order emails)</li>
      </ul>
      <h2>Cookies and storage</h2>
      <p>
        We use a sign-in cookie to keep you logged in, and your browser&rsquo;s storage to remember your cart. There are
        no advertising or third-party tracking cookies.
      </p>
      <h2>How long we keep it</h2>
      <p>
        Order records are kept as long as the law requires for accounts and tax. Account details are kept until you
        ask us to delete your account.
      </p>
      <h2>Your choices</h2>
      <p>
        You can see and update your details any time in My account. To get a copy of your data, correct it, or have
        your account deleted, contact {business.ownerName}
        {business.email ? (
          <>
            {" "}at <a href={`mailto:${business.email}`}>{business.email}</a>
          </>
        ) : (
          " on WhatsApp (see the Contact page)"
        )}
        . We&rsquo;ll respond within 30 days.
      </p>
    </InfoPage>
  );
}
