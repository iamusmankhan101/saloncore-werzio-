"use client";

import "./feedback.css";
import { use, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Star } from "lucide-react";

interface FeedbackContext {
  ok: boolean;
  error?: string;
  salonName?: string;
  clientFirstName?: string;
  service?: string;
  apptDate?: string;
  alreadySubmitted?: boolean;
  rating?: number;
  comment?: string;
}

export default function PublicFeedbackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [ctx, setCtx] = useState<FeedbackContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/public/feedback?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data: FeedbackContext) => setCtx(data))
      .catch(() => setCtx({ ok: false, error: "Something went wrong." }))
      .finally(() => setLoading(false));
  }, [token]);

  async function submit() {
    if (rating < 1) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/public/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Couldn't submit your feedback. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Couldn't submit your feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="fb-outer">
        <div className="fb-loading">Loading…</div>
      </div>
    );
  }

  if (!ctx?.ok) {
    return (
      <div className="fb-outer">
        <div className="fb-card">
          <div className="fb-title">Link not found</div>
          <div className="fb-sub">This feedback link is invalid or has expired.</div>
        </div>
      </div>
    );
  }

  const alreadyDone = ctx.alreadySubmitted || submitted;

  return (
    <div className="fb-outer">
      <div className="fb-card">
        <div className="fb-salon">{ctx.salonName}</div>
        {alreadyDone ? (
          <>
            <CheckCircle2 size={36} className="fb-thanks-icon" />
            <div className="fb-title">Thank you!</div>
            <div className="fb-sub">Your feedback has already been recorded. We appreciate you taking the time to share it.</div>
          </>
        ) : (
          <>
            <div className="fb-title">How was your visit?</div>
            <div className="fb-sub">
              {ctx.service ? `${ctx.service}` : "Tell us about your recent visit"}
              {ctx.apptDate ? ` · ${ctx.apptDate}` : ""}
            </div>

            <div className="fb-stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="fb-star-btn"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                >
                  <Star
                    size={34}
                    fill={(hoverRating || rating) >= n ? "#f59e0b" : "none"}
                    color={(hoverRating || rating) >= n ? "#f59e0b" : "#d0d0e0"}
                  />
                </button>
              ))}
            </div>

            <textarea
              className="fb-comment"
              placeholder="Anything you'd like to share? (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
            />

            {error && <div className="fb-error">{error}</div>}

            <button type="button" className="fb-submit" disabled={rating < 1 || submitting} onClick={submit}>
              {submitting ? <Loader2 size={16} /> : "Submit feedback"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
