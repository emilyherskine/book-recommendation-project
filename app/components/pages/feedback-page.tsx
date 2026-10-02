"use client";

import { useState, type FormEvent } from "react";
import { SectionHeading } from "@/app/components/ui/reader-ui";

export function FeedbackPage() {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }
  return <><SectionHeading detail="The best recommendations get better with a little honesty." eyebrow="A BETTER KIND OF BOOK CLUB" title="Tell us what you think" /><form className="feedback-form" onSubmit={submit}><fieldset><legend>How did this month’s pick feel?</legend><div className="rating-row">{[1, 2, 3, 4, 5].map((number) => <button aria-label={`${number} out of 5 stars`} aria-pressed={rating === number} className={`rating-button${rating >= number ? " rating-active" : ""}`} key={number} onClick={() => setRating(number)} type="button">★</button>)}</div></fieldset><label htmlFor="feedback-note">Anything you’d like us to know?</label><textarea id="feedback-note" name="note" placeholder="A twist you loved, a trope to skip next time…" rows={5} /><label className="check-label"><input name="use-in-profile" type="checkbox" /> Keep this note in my reader DNA</label><button className="button button-primary" disabled={!rating} type="submit">Send feedback <span aria-hidden="true">↗</span></button>{submitted && <p aria-live="polite" className="file-status">Thank you. Your reading profile is a little more you now.</p>}</form></>;
}