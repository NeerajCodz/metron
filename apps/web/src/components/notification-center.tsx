import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowUpRight,
  Bell,
  Check,
  CheckCheck,
  CircleAlert,
  CircleCheck,
  CircleX,
  Info,
  Inbox,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useMetronState,
  type MetronNotification,
  type NotificationTone,
} from "../state/metron-state";

export interface NotificationCenterProps {
  /** Whether the notification popover is visible. */
  open: boolean;
  /** Called when the popover requests a visibility change. */
  onOpenChange: (open: boolean) => void;
}

type NotificationGroup = {
  id: "unread" | "read";
  label: string;
  items: MetronNotification[];
};

const toneMeta: Record<
  NotificationTone,
  { label: string; icon: LucideIcon }
> = {
  info: { label: "Information", icon: Info },
  success: { label: "Success", icon: CircleCheck },
  warning: { label: "Warning", icon: CircleAlert },
  error: { label: "Error", icon: CircleX },
};

const focusableSelector =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function NotificationItem({
  notification,
  onMarkRead,
  onDismiss,
}: {
  notification: MetronNotification;
  onMarkRead: (notification: MetronNotification) => void;
  onDismiss: (notification: MetronNotification) => void;
}) {
  const { icon: ToneIcon, label: toneLabel } = toneMeta[notification.tone];
  const itemCopy = (
    <>
      <span className="notification-center__item-heading">
        <strong>{notification.title}</strong>
        {!notification.read ? (
          <span className="notification-center__unread-dot" aria-label="Unread" />
        ) : null}
      </span>
      <span className="notification-center__item-message">{notification.message}</span>
    </>
  );

  return (
    <li className={`notification-center__item is-${notification.tone}`}>
      <div className="notification-center__item-icon" aria-label={toneLabel} role="img">
        <ToneIcon size={16} strokeWidth={1.8} aria-hidden="true" />
      </div>
      {notification.read ? (
        <div className="notification-center__item-content">{itemCopy}</div>
      ) : (
        <button
          className="notification-center__item-content"
          type="button"
          onClick={() => onMarkRead(notification)}
          aria-label={`Mark as read: ${notification.title}`}
        >
          {itemCopy}
        </button>
      )}
      <div className="notification-center__item-actions">
        {!notification.read ? (
          <button
            className="notification-center__icon-button"
            type="button"
            onClick={() => onMarkRead(notification)}
            aria-label={`Mark ${notification.title} as read`}
            title="Mark as read"
          >
            <Check size={15} aria-hidden="true" />
            <span className="notification-center__sr-only">Mark as read</span>
          </button>
        ) : null}
        <button
          className="notification-center__icon-button"
          type="button"
          onClick={() => onDismiss(notification)}
          aria-label={`Dismiss ${notification.title}`}
          title="Dismiss notification"
        >
          <X size={15} aria-hidden="true" />
          <span className="notification-center__sr-only">Dismiss</span>
        </button>
      </div>
    </li>
  );
}

/**
 * Controlled, keyboard-friendly notification popover. Notification data and
 * mutations remain in the shared Metron state; the parent owns only visibility.
 */
export function NotificationCenter({ open, onOpenChange }: NotificationCenterProps) {
  const { notifications, markNotificationRead, dismissNotification } = useMetronState();
  const [statusMessage, setStatusMessage] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  const recentNotifications = useMemo(() => notifications.slice(0, 8), [notifications]);
  const unreadNotifications = useMemo(
    () => recentNotifications.filter((notification) => !notification.read),
    [recentNotifications],
  );
  const groups = useMemo<NotificationGroup[]>(() => {
    const unread = recentNotifications.filter((notification) => !notification.read);
    const read = recentNotifications.filter((notification) => notification.read);
    return [
      { id: "unread", label: "Needs attention", items: unread },
      { id: "read", label: "Previously seen", items: read },
    ].filter((group): group is NotificationGroup => group.items.length > 0);
  }, [recentNotifications]);

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        const target = returnFocusRef.current;
        if (target && document.contains(target)) target.focus();
      }
      wasOpenRef.current = false;
      returnFocusRef.current = null;
    } else if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setStatusMessage("");
      const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
      return () => window.cancelAnimationFrame(frame);
    }
    return undefined;
  }, [open]);


  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onOpenChange, open]);

  const markRead = (notification: MetronNotification) => {
    markNotificationRead(notification.id);
    setStatusMessage(`Marked “${notification.title}” as read.`);
  };

  const dismiss = (notification: MetronNotification) => {
    dismissNotification(notification.id);
    setStatusMessage(`Dismissed “${notification.title}”.`);
  };

  const markAllRead = () => {
    if (unreadNotifications.length === 0) return;
    unreadNotifications.forEach((notification) => markNotificationRead(notification.id));
    setStatusMessage(
      `${unreadNotifications.length} notification${unreadNotifications.length === 1 ? "" : "s"} marked as read.`,
    );
  };

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
    );
    if (focusable.length === 0) return;
    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.shiftKey
      ? currentIndex <= 0
        ? focusable.length - 1
        : currentIndex - 1
      : currentIndex === focusable.length - 1
        ? 0
        : currentIndex + 1;
    event.preventDefault();
    focusable[nextIndex]?.focus();
  };

  if (!open) return null;

  return (
    <>
      <style>{styles}</style>
      <div
        className="notification-center__backdrop"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onOpenChange(false);
        }}
      >
        <div
          ref={panelRef}
          className="notification-center__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notification-center-title"
          aria-describedby="notification-center-description"
          onKeyDown={handlePanelKeyDown}
        >
          <header className="notification-center__header">
            <div className="notification-center__heading">
              <span className="notification-center__eyebrow">
                <Bell size={13} aria-hidden="true" />
                Operator inbox
              </span>
              <h2 id="notification-center-title">Notifications</h2>
              <p id="notification-center-description">
                {unreadNotifications.length > 0
                  ? `${unreadNotifications.length} unread update${unreadNotifications.length === 1 ? "" : "s"}`
                  : "You are all caught up"}
              </p>
            </div>
            <div className="notification-center__header-actions">
              <span
                className="notification-center__count"
                aria-label={`${unreadNotifications.length} unread notifications`}
              >
                {unreadNotifications.length > 99 ? "99+" : unreadNotifications.length}
              </span>
              <button
                ref={closeButtonRef}
                className="notification-center__icon-button notification-center__close"
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close notifications"
                title="Close"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>
          </header>

          {recentNotifications.length > 0 ? (
            <>
              <div className="notification-center__toolbar">
                <span className="notification-center__toolbar-label">Recent updates</span>
                <button
                  className="notification-center__mark-all"
                  type="button"
                  onClick={markAllRead}
                  disabled={unreadNotifications.length === 0}
                >
                  <CheckCheck size={14} aria-hidden="true" />
                  Mark all read
                </button>
              </div>
              <div className="notification-center__groups">
                {groups.map((group) => (
                  <section
                    className="notification-center__group"
                    key={group.id}
                    aria-labelledby={`notification-group-${group.id}`}
                  >
                    <h3 id={`notification-group-${group.id}`}>{group.label}</h3>
                    <ul className="notification-center__list">
                      {group.items.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onMarkRead={markRead}
                          onDismiss={dismiss}
                        />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
              <a
                className="notification-center__view-all"
                href="/notifications"
                onClick={() => onOpenChange(false)}
              >
                View all notifications
                <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            </>
          ) : (
            <div className="notification-center__empty" role="status">
              <span className="notification-center__empty-icon" aria-hidden="true">
                <Inbox size={22} strokeWidth={1.7} />
              </span>
              <strong>No notifications yet</strong>
              <p>Operational updates and execution results will appear here.</p>
              <a
                className="notification-center__empty-link"
                href="/notifications"
                onClick={() => onOpenChange(false)}
              >
                Open notification history
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </div>
          )}
          <p className="notification-center__status" aria-live="polite" aria-atomic="true">
            {statusMessage}
          </p>
        </div>
      </div>
    </>
  );
}


const styles = `
.notification-center__backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  padding: 4.7rem max(1rem, env(safe-area-inset-right)) 1rem;
  background: rgb(0 0 0 / 26%);
}
.notification-center__panel {
  width: min(27rem, calc(100vw - 2rem));
  max-height: min(39rem, calc(100dvh - 5.7rem));
  overflow: auto;
  border: 1px solid var(--metron-border-strong, rgb(242 241 237 / 18%));
  border-radius: var(--metron-radius-card, 0.8rem);
  background: var(--metron-surface-raised, #151516);
  box-shadow: 0 1.5rem 4rem rgb(0 0 0 / 52%), 0 0 0 1px rgb(255 255 255 / 2%);
  color: var(--metron-pearl, #f2f1ed);
  font-family: var(--metron-font-sans, "Segoe UI", sans-serif);
}
.notification-center__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.15rem 1.15rem 1rem;
  border-bottom: 1px solid var(--metron-border, rgb(242 241 237 / 11%));
}
.notification-center__heading { min-width: 0; }
.notification-center__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--metron-sand, #b38f6f);
  font-family: var(--metron-font-mono, "SFMono-Regular", Consolas, monospace);
  font-size: 0.6rem;
  font-weight: 650;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
.notification-center__heading h2 {
  margin: 0.42rem 0 0;
  color: var(--metron-pearl, #f2f1ed);
  font-size: 1.16rem;
  font-weight: 630;
  letter-spacing: -0.025em;
}
.notification-center__heading p {
  margin: 0.32rem 0 0;
  color: var(--metron-pearl-muted, rgb(242 241 237 / 58%));
  font-size: 0.74rem;
}
.notification-center__header-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.notification-center__count {
  display: inline-grid;
  min-width: 1.5rem;
  height: 1.5rem;
  place-items: center;
  padding: 0 0.35rem;
  border: 1px solid rgb(179 143 111 / 36%);
  border-radius: 999px;
  background: rgb(179 143 111 / 10%);
  color: var(--metron-sand-bright, #d0ad8c);
  font-family: var(--metron-font-mono, "SFMono-Regular", Consolas, monospace);
  font-size: 0.64rem;
  font-weight: 700;
  line-height: 1;
}
.notification-center__icon-button {
  display: inline-grid;
  width: 1.85rem;
  height: 1.85rem;
  place-items: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 0.45rem;
  background: transparent;
  color: var(--metron-pearl-dim, rgb(242 241 237 / 44%));
  cursor: pointer;
  transition: color 140ms ease, background 140ms ease, border-color 140ms ease;
}
.notification-center__icon-button:hover {
  border-color: var(--metron-border-strong, rgb(242 241 237 / 18%));
  background: var(--metron-surface-hover, rgb(242 241 237 / 7%));
  color: var(--metron-pearl, #f2f1ed);
}
.notification-center__close { margin: -0.15rem -0.2rem 0 0; }
.notification-center__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1.15rem 0.55rem;
}
.notification-center__toolbar-label {
  color: var(--metron-pearl-dim, rgb(242 241 237 / 44%));
  font-family: var(--metron-font-mono, "SFMono-Regular", Consolas, monospace);
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.notification-center__mark-all,
.notification-center__view-all,
.notification-center__empty-link {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  border: 0;
  background: transparent;
  color: var(--metron-sand-bright, #d0ad8c);
  font: inherit;
  font-size: 0.69rem;
  font-weight: 620;
  text-decoration: none;
  cursor: pointer;
}
.notification-center__mark-all:hover,
.notification-center__view-all:hover,
.notification-center__empty-link:hover { color: var(--metron-pearl, #f2f1ed); }
.notification-center__mark-all:disabled { color: var(--metron-pearl-dim, rgb(242 241 237 / 32%)); cursor: default; }
.notification-center__groups { padding: 0 0.65rem; }
.notification-center__group + .notification-center__group { margin-top: 0.85rem; }
.notification-center__group h3 {
  margin: 0;
  padding: 0.3rem 0.5rem 0.4rem;
  color: var(--metron-pearl-dim, rgb(242 241 237 / 44%));
  font-family: var(--metron-font-mono, "SFMono-Regular", Consolas, monospace);
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.notification-center__list { display: grid; gap: 0.25rem; margin: 0; padding: 0; list-style: none; }
.notification-center__item {
  display: grid;
  grid-template-columns: 1.9rem minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.55rem;
  padding: 0.72rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 0.58rem;
  background: transparent;
  transition: border-color 140ms ease, background 140ms ease;
}
.notification-center__item:hover,
.notification-center__item:focus-within { border-color: var(--metron-border, rgb(242 241 237 / 11%)); background: rgb(242 241 237 / 4%); }
.notification-center__item.is-info .notification-center__item-icon { color: #8daec5; background: rgb(141 174 197 / 12%); }
.notification-center__item.is-success .notification-center__item-icon { color: var(--metron-success, #70bf9d); background: rgb(112 191 157 / 12%); }
.notification-center__item.is-warning .notification-center__item-icon { color: var(--metron-warning, #d9a45d); background: rgb(217 164 93 / 12%); }
.notification-center__item.is-error .notification-center__item-icon { color: var(--metron-crimson-bright, #cf5362); background: rgb(207 83 98 / 12%); }
.notification-center__item-icon { display: grid; width: 1.9rem; height: 1.9rem; place-items: center; border-radius: 0.45rem; }
.notification-center__item-content {
  display: grid;
  min-width: 0;
  gap: 0.22rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: default;
}
button.notification-center__item-content { cursor: pointer; }
.notification-center__item-heading { display: flex; align-items: center; gap: 0.42rem; min-width: 0; }
.notification-center__item-heading strong { overflow: hidden; color: var(--metron-pearl, #f2f1ed); font-size: 0.77rem; font-weight: 620; text-overflow: ellipsis; white-space: nowrap; }
.notification-center__item-message { display: -webkit-box; overflow: hidden; color: var(--metron-pearl-muted, rgb(242 241 237 / 58%)); font-size: 0.69rem; line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.notification-center__unread-dot { flex: 0 0 auto; width: 0.38rem; height: 0.38rem; border-radius: 50%; background: var(--metron-crimson-bright, #cf5362); box-shadow: 0 0 0 3px rgb(207 83 98 / 12%); }
.notification-center__item-actions { display: flex; align-items: center; gap: 0.1rem; margin: -0.18rem -0.2rem 0 0; }
.notification-center__view-all { justify-content: center; width: calc(100% - 2.3rem); margin: 0.85rem 1.15rem 1.05rem; padding-top: 0.8rem; border-top: 1px solid var(--metron-border, rgb(242 241 237 / 11%)); }
.notification-center__empty { display: grid; justify-items: center; gap: 0.5rem; padding: 2.4rem 1.5rem 2.6rem; text-align: center; }
.notification-center__empty-icon { display: grid; width: 3rem; height: 3rem; place-items: center; margin-bottom: 0.15rem; border: 1px solid var(--metron-border, rgb(242 241 237 / 11%)); border-radius: 50%; color: var(--metron-sand, #b38f6f); background: rgb(179 143 111 / 8%); }
.notification-center__empty strong { color: var(--metron-pearl, #f2f1ed); font-size: 0.82rem; font-weight: 620; }
.notification-center__empty p { max-width: 18rem; margin: 0; color: var(--metron-pearl-muted, rgb(242 241 237 / 58%)); font-size: 0.7rem; line-height: 1.5; }
.notification-center__empty-link { margin-top: 0.45rem; }
.notification-center__status { min-height: 1.1rem; margin: 0; padding: 0 1.15rem 0.75rem; color: var(--metron-pearl-dim, rgb(242 241 237 / 44%)); font-size: 0.64rem; }
.notification-center__sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 520px) {
  .notification-center__backdrop { align-items: flex-end; padding: 0; background: rgb(0 0 0 / 48%); }
  .notification-center__panel { width: 100%; max-height: min(40rem, 92dvh); border-radius: 0.9rem 0.9rem 0 0; }
}
@media (prefers-reduced-motion: reduce) {
  .notification-center__icon-button, .notification-center__item { transition: none; }
}
`;
