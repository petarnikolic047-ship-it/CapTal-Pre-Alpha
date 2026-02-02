import { useEffect } from "react";

import type { UiEvent } from "../../game/store";
import { formatMoney } from "../../game/format";

type ToastStackProps = {
  events: UiEvent[];
  onDismiss: (id: string) => void;
};

const ToastStack = ({ events, onDismiss }: ToastStackProps) => {
  return (
    <div className="toast-stack" aria-live="polite">
      {events.map((event) => (
        <ToastItem key={event.id} event={event} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

type ToastItemProps = {
  event: UiEvent;
  onDismiss: (id: string) => void;
};

const ToastItem = ({ event, onDismiss }: ToastItemProps) => {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(event.id), 2800);
    return () => window.clearTimeout(timer);
  }, [event.id, onDismiss]);

  const amountLabel =
    typeof event.amount === "number"
      ? `${event.amount >= 0 ? "+" : "-"}${formatMoney(Math.abs(event.amount))}`
      : null;
  const tone =
    typeof event.amount === "number"
      ? event.amount >= 0
        ? "gain"
        : "danger"
      : event.kind === "defense"
      ? "danger"
      : "info";

  return (
    <div className={`toast ${tone}`}>
      <div>
        <div className="toast-title">{event.title}</div>
        {event.detail && <div className="toast-detail">{event.detail}</div>}
      </div>
      {amountLabel && <div className="toast-amount">{amountLabel}</div>}
    </div>
  );
};

export default ToastStack;
