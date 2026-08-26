import type { FeedbackMessage } from "../types/product";

type FeedbackProps = {
  message: FeedbackMessage | null;
};

export function Feedback({ message }: FeedbackProps) {
  if (!message) {
    return null;
  }

  return (
    <p className={`feedback feedback--${message.tone}`} role="status">
      {message.text}
    </p>
  );
}
