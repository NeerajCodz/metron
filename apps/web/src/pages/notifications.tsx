import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  CheckCheck,
  ChevronRight,
  CircleDot,
  Inbox,
  Info,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Badge, Button, GlassCard, InlineAlert, Input, Select } from "@metron/ui";
import { useMetronState, type MetronNotification, type NotificationTone } from "../state/metron-state";

type ReadFilter = "all" | "unread" | "read";
type ToneFilter = "all" | NotificationTone;

const toneOptions: Array<{ value: ToneFilter; label: string }> = [
  { value: "all", label: "All tones" },
  { value: "info", label: "Information" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "error", label: "Error" },
];

const readOptions: Array<{ value: ReadFilter; label: string }> = [
  { value: "all", label: "All notifications" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
];

const toneLabels: Record<NotificationTone, string> = {
  info: "Information",
  success: "Success",
  warning: "Warning",
  error: "Error",
};

const toneVariants: Record<NotificationTone, "neutral" | "success" | "warning" | "danger"> = {
  info: "neutral",
  success: "success",
  warning: "warning",
  error: "danger",
};

const toneIcons: Record<NotificationTone, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

function ToneIcon({ tone, size = 18 }: { tone: NotificationTone; size?: number }) {
  const Icon = toneIcons[tone];
  return <Icon size={size} aria-hidden="true" />;
}

function notificationAge(index: number) {
  if (index === 0) return "Most recent";
  if (index === 1) return "Earlier";
  return "Recent";
}

export function NotificationsPage() {
  const { notifications, dismissNotification, markNotificationRead } = useMetronState();
  const [query, setQuery] = useState("");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [toneFilter, setToneFilter] = useState<ToneFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(notifications[0]?.id ?? null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const unreadCount = useMemo(
    () => notifications.reduce((count, notification) => count + (notification.read ? 0 : 1), 0),
    [notifications],
  );

  const filteredNotifications = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return notifications.filter((notification) => {
      const matchesRead =
        readFilter === "all" || (readFilter === "unread" ? !notification.read : notification.read);
      const matchesTone = toneFilter === "all" || notification.tone === toneFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        `${notification.title} ${notification.message} ${notification.tone}`
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesRead && matchesTone && matchesQuery;
    });
  }, [notifications, query, readFilter, toneFilter]);

  useEffect(() => {
    if (filteredNotifications.some((notification) => notification.id === selectedId)) return;
    setSelectedId(filteredNotifications[0]?.id ?? null);
  }, [filteredNotifications, selectedId]);

  const selectedNotification = filteredNotifications.find(
    (notification) => notification.id === selectedId,
  );

  const hasFilters = query.trim().length > 0 || readFilter !== "all" || toneFilter !== "all";

  const clearFilters = () => {
    setQuery("");
    setReadFilter("all");
    setToneFilter("all");
    setFeedback("Filters cleared.");
  };

  const selectNotification = (notification: MetronNotification) => {
    setSelectedId(notification.id);
    if (!notification.read) {
      markNotificationRead(notification.id);
      setFeedback(`Marked “${notification.title}” as read.`);
    }
  };

  const markSelectedRead = () => {
    if (!selectedNotification) return;
    if (selectedNotification.read) {
      setFeedback("This notification is already read.");
      return;
    }
    markNotificationRead(selectedNotification.id);
    setFeedback(`Marked “${selectedNotification.title}” as read.`);
  };

  const dismissSelected = () => {
    if (!selectedNotification) return;
    const title = selectedNotification.title;
    dismissNotification(selectedNotification.id);
    setFeedback(`Dismissed “${title}”.`);
  };

  const markAllRead = () => {
    if (unreadCount === 0) {
      setFeedback("All notifications are already read.");
      return;
    }

    notifications.forEach((notification) => {
      if (!notification.read) markNotificationRead(notification.id);
    });
    setFeedback(`Marked ${unreadCount} notification${unreadCount === 1 ? "" : "s"} as read.`);
  };

  const dismissVisible = () => {
    if (filteredNotifications.length === 0) {
      setFeedback("There are no visible notifications to dismiss.");
      return;
    }

    const count = filteredNotifications.length;
    filteredNotifications.forEach((notification) => dismissNotification(notification.id));
    setFeedback(`Dismissed ${count} visible notification${count === 1 ? "" : "s"}.`);
  };

  return (
    <>
      <style>{`
        .web-page-notifications {
          --notifications-bg: #0a0b0c;
          --notifications-surface: #111315;
          --notifications-surface-raised: #17191c;
          --notifications-border: rgba(242, 241, 237, 0.11);
          --notifications-border-strong: rgba(242, 241, 237, 0.2);
          --notifications-text: #f2f1ed;
          --notifications-muted: #989b9c;
          --notifications-faint: #747879;
          --notifications-sand: #d4c19d;
          --notifications-green: #73bf9b;
          --notifications-red: #dc5b5f;
          min-height: 100%;
          padding: clamp(1.25rem, 2.8vw, 2.75rem);
          color: var(--notifications-text);
          background: var(--notifications-bg);
        }
        .web-page-notifications__inner { max-width: 1480px; margin: 0 auto; }
        .web-page-notifications__header { display: flex; align-items: flex-end; justify-content: space-between; gap: 2rem; padding-bottom: 1.65rem; border-bottom: 1px solid var(--notifications-border); }
        .web-page-notifications__kicker { margin: 0 0 .65rem; color: var(--notifications-sand); font-size: .68rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
        .web-page-notifications__title { margin: 0; color: var(--notifications-text); font-size: clamp(1.75rem, 3vw, 2.65rem); font-weight: 640; letter-spacing: -.045em; line-height: 1; }
        .web-page-notifications__description { max-width: 38rem; margin: .75rem 0 0; color: var(--notifications-muted); font-size: .92rem; line-height: 1.55; }
        .web-page-notifications__header-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .5rem; }
        .web-page-notifications__summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .7rem; padding: 1.2rem 0 1rem; }
        .web-page-notifications__summary-card { display: flex; align-items: center; gap: .8rem; min-width: 0; padding: .9rem 1rem; border: 1px solid var(--notifications-border); background: var(--notifications-surface); }
        .web-page-notifications__summary-icon { display: grid; flex: 0 0 2.1rem; place-items: center; width: 2.1rem; height: 2.1rem; border: 1px solid rgba(212, 193, 157, .3); color: var(--notifications-sand); background: rgba(212, 193, 157, .07); }
        .web-page-notifications__summary-icon[data-tone="unread"] { border-color: rgba(220, 91, 95, .34); color: var(--notifications-red); background: rgba(220, 91, 95, .07); }
        .web-page-notifications__summary-icon[data-tone="visible"] { border-color: rgba(115, 191, 155, .3); color: var(--notifications-green); background: rgba(115, 191, 155, .06); }
        .web-page-notifications__summary-label { color: var(--notifications-muted); font-size: .68rem; letter-spacing: .08em; text-transform: uppercase; }
        .web-page-notifications__summary-value { margin-top: .15rem; color: var(--notifications-text); font-size: 1.25rem; font-weight: 680; letter-spacing: -.03em; }
        .web-page-notifications__toolbar { display: grid; grid-template-columns: minmax(14rem, 1fr) 13rem 13rem auto; align-items: end; gap: .65rem; padding: .2rem 0 1.2rem; }
        .web-page-notifications__filter-label { display: block; margin-bottom: .4rem; color: var(--notifications-muted); font-size: .68rem; letter-spacing: .1em; text-transform: uppercase; }
        .web-page-notifications__search { position: relative; }
        .web-page-notifications__search > svg { position: absolute; top: 50%; left: .8rem; z-index: 1; color: var(--notifications-muted); pointer-events: none; transform: translateY(-50%); }
        .web-page-notifications__search input { width: 100%; padding-left: 2.35rem; }
        .web-page-notifications__toolbar .metron-select { width: 100%; }
        .web-page-notifications__filter-actions { display: flex; justify-content: flex-end; gap: .5rem; }
        .web-page-notifications__feedback { margin-bottom: 1rem; }
        .web-page-notifications__main { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(22rem, .9fr); align-items: start; gap: 1rem; }
        .web-page-notifications__list-panel { min-width: 0; }
        .web-page-notifications__list-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .1rem 0 .7rem; }
        .web-page-notifications__list-count { color: var(--notifications-muted); font-size: .78rem; }
        .web-page-notifications__list-count strong { color: var(--notifications-text); font-weight: 650; }
        .web-page-notifications__list { border-top: 1px solid var(--notifications-border); }
        .web-page-notifications__item { display: grid; grid-template-columns: 2.35rem minmax(0, 1fr) auto; gap: .8rem; align-items: center; border-bottom: 1px solid var(--notifications-border); padding: .9rem .3rem; }
        .web-page-notifications__item:hover, .web-page-notifications__item[data-selected="true"] { background: rgba(212, 193, 157, .055); }
        .web-page-notifications__item[data-selected="true"] { border-bottom-color: rgba(212, 193, 157, .34); box-shadow: inset 2px 0 0 var(--notifications-sand); }
        .web-page-notifications__item-button { display: grid; grid-template-columns: 2.35rem minmax(0, 1fr); grid-column: 1 / 3; gap: .8rem; min-width: 0; border: 0; padding: 0; color: inherit; text-align: left; background: transparent; cursor: pointer; }
        .web-page-notifications__item-button:focus-visible { outline: 2px solid var(--notifications-sand); outline-offset: 3px; }
        .web-page-notifications__item-icon { display: grid; place-items: center; width: 2.15rem; height: 2.15rem; border: 1px solid var(--notifications-border-strong); color: var(--notifications-sand); background: rgba(212, 193, 157, .07); }
        .web-page-notifications__item-icon[data-tone="success"] { border-color: rgba(115, 191, 155, .34); color: var(--notifications-green); background: rgba(115, 191, 155, .06); }
        .web-page-notifications__item-icon[data-tone="warning"] { border-color: rgba(212, 193, 157, .4); color: var(--notifications-sand); }
        .web-page-notifications__item-icon[data-tone="error"] { border-color: rgba(220, 91, 95, .4); color: var(--notifications-red); background: rgba(220, 91, 95, .07); }
        .web-page-notifications__item-copy { min-width: 0; }
        .web-page-notifications__item-title { display: flex; align-items: center; flex-wrap: wrap; gap: .45rem; font-size: .88rem; font-weight: 650; line-height: 1.35; }
        .web-page-notifications__item-unread { width: .4rem; height: .4rem; border-radius: 999px; background: var(--notifications-red); box-shadow: 0 0 0 3px rgba(220, 91, 95, .1); }
        .web-page-notifications__item-message { display: -webkit-box; overflow: hidden; margin-top: .28rem; color: var(--notifications-muted); font-size: .77rem; line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
        .web-page-notifications__item-meta { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; margin-top: .45rem; color: var(--notifications-faint); font-size: .66rem; }
        .web-page-notifications__item-time { color: var(--notifications-muted); font-size: .68rem; white-space: nowrap; }
        .web-page-notifications__item-chevron { display: inline-flex; margin-left: .15rem; color: var(--notifications-faint); vertical-align: middle; }
        .web-page-notifications__item-actions { display: flex; align-items: center; gap: .15rem; }
        .web-page-notifications__icon-button { display: grid; place-items: center; width: 1.9rem; height: 1.9rem; border: 1px solid transparent; border-radius: .42rem; color: var(--notifications-faint); background: transparent; cursor: pointer; }
        .web-page-notifications__icon-button:hover { border-color: var(--notifications-border-strong); color: var(--notifications-text); background: var(--notifications-surface-raised); }
        .web-page-notifications__icon-button:focus-visible { outline: 2px solid var(--notifications-sand); outline-offset: 2px; }
        .web-page-notifications__empty { display: grid; place-items: center; min-height: 17rem; padding: 2rem 1.5rem; border: 1px solid var(--notifications-border); color: var(--notifications-muted); text-align: center; }
        .web-page-notifications__empty-icon { display: grid; place-items: center; width: 2.7rem; height: 2.7rem; margin-bottom: .8rem; border: 1px solid rgba(212, 193, 157, .3); color: var(--notifications-sand); background: rgba(212, 193, 157, .07); }
        .web-page-notifications__empty strong { display: block; margin-bottom: .35rem; color: var(--notifications-text); font-size: .98rem; }
        .web-page-notifications__empty p { max-width: 25rem; margin: 0; font-size: .78rem; line-height: 1.5; }
        .web-page-notifications__empty-action { margin-top: 1rem; }
        .web-page-notifications__detail { position: sticky; top: 1.25rem; min-width: 0; }
        .web-page-notifications__detail-card { border: 1px solid var(--notifications-border); background: var(--notifications-surface); }
        .web-page-notifications__detail-card .metron-card__glass { border-radius: 0; background: var(--notifications-surface); }
        .web-page-notifications__detail-card .metron-card__surface { padding: 0; }
        .web-page-notifications__detail-header { padding: 1.2rem 1.2rem 1rem; border-bottom: 1px solid var(--notifications-border); }
        .web-page-notifications__detail-topline { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .web-page-notifications__detail-eyebrow { color: var(--notifications-sand); font-size: .66rem; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; }
        .web-page-notifications__detail-title { margin: .65rem 0 .45rem; color: var(--notifications-text); font-size: 1.3rem; font-weight: 650; letter-spacing: -.025em; line-height: 1.15; }
        .web-page-notifications__detail-message { margin: 0; color: var(--notifications-muted); font-size: .8rem; line-height: 1.55; }
        .web-page-notifications__detail-context { display: flex; flex-wrap: wrap; gap: .45rem 1rem; margin-top: .9rem; color: var(--notifications-faint); font-size: .69rem; }
        .web-page-notifications__detail-context span { display: inline-flex; align-items: center; gap: .3rem; }
        .web-page-notifications__detail-body { padding: .15rem 1.2rem 1.2rem; }
        .web-page-notifications__detail-section { padding: 1rem 0; border-bottom: 1px solid var(--notifications-border); }
        .web-page-notifications__detail-section:last-child { border-bottom: 0; padding-bottom: 0; }
        .web-page-notifications__detail-label { display: flex; align-items: center; gap: .45rem; margin-bottom: .7rem; color: var(--notifications-sand); font-size: .67rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
        .web-page-notifications__detail-label svg { width: .85rem; height: .85rem; }
        .web-page-notifications__detail-copy { margin: 0; color: #c2c3be; font-size: .79rem; line-height: 1.6; }
        .web-page-notifications__detail-data { display: grid; gap: .6rem; }
        .web-page-notifications__detail-row { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; font-size: .72rem; }
        .web-page-notifications__detail-row dt { color: var(--notifications-faint); }
        .web-page-notifications__detail-row dd { margin: 0; color: #c2c3be; font-weight: 620; text-align: right; overflow-wrap: anywhere; }
        .web-page-notifications__detail-actions { display: flex; flex-wrap: wrap; gap: .5rem; }
        .web-page-notifications__legend { display: flex; flex-wrap: wrap; gap: .7rem 1rem; padding-top: 1rem; color: var(--notifications-faint); font-size: .67rem; }
        .web-page-notifications__legend-item { display: inline-flex; align-items: center; gap: .35rem; }
        .web-page-notifications__legend-swatch { width: .4rem; height: .4rem; border-radius: 999px; background: var(--notifications-sand); }
        .web-page-notifications__legend-swatch[data-tone="success"] { background: var(--notifications-green); }
        .web-page-notifications__legend-swatch[data-tone="warning"] { background: var(--notifications-sand); }
        .web-page-notifications__legend-swatch[data-tone="error"] { background: var(--notifications-red); }
        @media (max-width: 980px) {
          .web-page-notifications__main { grid-template-columns: minmax(0, 1fr); }
          .web-page-notifications__detail { position: static; }
          .web-page-notifications__toolbar { grid-template-columns: minmax(12rem, 1fr) 1fr 1fr; }
          .web-page-notifications__filter-actions { grid-column: 1 / -1; justify-content: flex-start; }
        }
        @media (max-width: 640px) {
          .web-page-notifications { padding: 1rem; }
          .web-page-notifications__header { display: block; }
          .web-page-notifications__header-actions { justify-content: flex-start; margin-top: 1rem; }
          .web-page-notifications__summary { grid-template-columns: 1fr; }
          .web-page-notifications__toolbar { grid-template-columns: 1fr; }
          .web-page-notifications__filter-actions { grid-column: auto; }
          .web-page-notifications__item { grid-template-columns: 2.15rem minmax(0, 1fr); }
          .web-page-notifications__item-button { grid-column: 1 / -1; }
          .web-page-notifications__item-actions { grid-column: 2; justify-content: flex-start; margin-top: -.45rem; }
          .web-page-notifications__item-time { margin-left: auto; }
        }
      `}</style>
      <main className="web-page-notifications">
        <div className="web-page-notifications__inner">
          <header className="web-page-notifications__header">
            <div>
              <p className="web-page-notifications__kicker">Operator inbox</p>
              <h1 className="web-page-notifications__title">Notifications</h1>
              <p className="web-page-notifications__description">
                Stay ahead of risk signals, execution outcomes, and automation changes across your
                Metron workspace.
              </p>
            </div>
            <div className="web-page-notifications__header-actions">
              <Button
                variant="outline"
                size="sm"
                leadingIcon={<CheckCheck size={14} />}
                onClick={markAllRead}
                disabled={unreadCount === 0}
              >
                Mark all read
              </Button>
              <Button
                variant="quiet"
                size="sm"
                leadingIcon={<Trash2 size={14} />}
                onClick={dismissVisible}
                disabled={filteredNotifications.length === 0}
              >
                Dismiss visible
              </Button>
            </div>
          </header>

          <section className="web-page-notifications__summary" aria-label="Notification summary">
            <div className="web-page-notifications__summary-card">
              <span className="web-page-notifications__summary-icon" data-tone="unread">
                <Bell size={17} aria-hidden="true" />
              </span>
              <div>
                <div className="web-page-notifications__summary-label">Unread</div>
                <div className="web-page-notifications__summary-value">{unreadCount}</div>
              </div>
            </div>
            <div className="web-page-notifications__summary-card">
              <span className="web-page-notifications__summary-icon">
                <Inbox size={17} aria-hidden="true" />
              </span>
              <div>
                <div className="web-page-notifications__summary-label">Total stored</div>
                <div className="web-page-notifications__summary-value">{notifications.length}</div>
              </div>
            </div>
            <div className="web-page-notifications__summary-card">
              <span className="web-page-notifications__summary-icon" data-tone="visible">
                <SlidersHorizontal size={17} aria-hidden="true" />
              </span>
              <div>
                <div className="web-page-notifications__summary-label">Showing</div>
                <div className="web-page-notifications__summary-value">
                  {filteredNotifications.length}
                </div>
              </div>
            </div>
          </section>

          <div className="web-page-notifications__toolbar" aria-label="Notification filters">
            <div>
              <label className="web-page-notifications__filter-label" htmlFor="notification-search">
                Search notifications
              </label>
              <div className="web-page-notifications__search">
                <Search size={15} aria-hidden="true" />
                <Input
                  id="notification-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search title, message, or tone"
                  aria-label="Search notifications"
                />
              </div>
            </div>
            <div>
              <label className="web-page-notifications__filter-label" htmlFor="notification-read-filter">
                Read state
              </label>
              <Select
                id="notification-read-filter"
                value={readFilter}
                onChange={(event) => setReadFilter(event.target.value as ReadFilter)}
                aria-label="Filter by read state"
              >
                {readOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="web-page-notifications__filter-label" htmlFor="notification-tone-filter">
                Tone
              </label>
              <Select
                id="notification-tone-filter"
                value={toneFilter}
                onChange={(event) => setToneFilter(event.target.value as ToneFilter)}
                aria-label="Filter by notification tone"
              >
                {toneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="web-page-notifications__filter-actions">
              <Button
                variant="quiet"
                size="sm"
                leadingIcon={<X size={14} />}
                onClick={clearFilters}
                disabled={!hasFilters}
              >
                Clear filters
              </Button>
            </div>
          </div>

          {feedback ? (
            <InlineAlert
              className="web-page-notifications__feedback"
              variant="success"
              icon={<Check size={15} />}
              role="status"
              title="Notification center updated"
            >
              {feedback}
            </InlineAlert>
          ) : null}

          <div className="web-page-notifications__main">
            <section className="web-page-notifications__list-panel" aria-labelledby="notification-list-heading">
              <div className="web-page-notifications__list-head">
                <div className="web-page-notifications__list-count" id="notification-list-heading">
                  <strong>{filteredNotifications.length}</strong> notification
                  {filteredNotifications.length === 1 ? "" : "s"} visible
                </div>
                <Badge variant="neutral" leadingIcon={<CircleDot size={12} />}>
                  Shared state
                </Badge>
              </div>

              <div className="web-page-notifications__list" role="list" aria-label="Notifications">
                {filteredNotifications.length === 0 ? (
                  <div className="web-page-notifications__empty">
                    <span className="web-page-notifications__empty-icon">
                      {notifications.length === 0 ? (
                        <Inbox size={20} aria-hidden="true" />
                      ) : (
                        <Search size={20} aria-hidden="true" />
                      )}
                    </span>
                    <strong>{notifications.length === 0 ? "Your inbox is clear" : "No matching notifications"}</strong>
                    <p>
                      {notifications.length === 0
                        ? "New risk, execution, and automation updates will appear here."
                        : "Try a different search or adjust the read-state and tone filters."}
                    </p>
                    {notifications.length > 0 && hasFilters ? (
                      <div className="web-page-notifications__empty-action">
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  filteredNotifications.map((notification, index) => (
                    <div
                      className="web-page-notifications__item"
                      key={notification.id}
                      data-selected={notification.id === selectedNotification?.id}
                      role="listitem"
                    >
                      <button
                        className="web-page-notifications__item-button"
                        type="button"
                        onClick={() => selectNotification(notification)}
                        aria-label={`View details for ${notification.title}`}
                      >
                        <span className="web-page-notifications__item-icon" data-tone={notification.tone}>
                          <ToneIcon tone={notification.tone} size={17} />
                        </span>
                        <span className="web-page-notifications__item-copy">
                          <span className="web-page-notifications__item-title">
                            {!notification.read ? (
                              <span className="web-page-notifications__item-unread" aria-label="Unread" />
                            ) : null}
                            {notification.title}
                            <Badge variant={toneVariants[notification.tone]}>
                              {toneLabels[notification.tone]}
                            </Badge>
                          </span>
                          <span className="web-page-notifications__item-message">{notification.message}</span>
                          <span className="web-page-notifications__item-meta">
                            <span>{notification.read ? "Read" : "Unread"}</span>
                            <span>Metron system</span>
                          </span>
                        </span>
                      </button>
                      <div className="web-page-notifications__item-actions">
                        <span className="web-page-notifications__item-time">{notificationAge(index)}</span>
                        {!notification.read ? (
                          <button
                            className="web-page-notifications__icon-button"
                            type="button"
                            onClick={() => {
                              markNotificationRead(notification.id);
                              setFeedback(`Marked “${notification.title}” as read.`);
                            }}
                            aria-label={`Mark ${notification.title} as read`}
                            title="Mark as read"
                          >
                            <Check size={14} aria-hidden="true" />
                          </button>
                        ) : null}
                        <button
                          className="web-page-notifications__icon-button"
                          type="button"
                          onClick={() => {
                            dismissNotification(notification.id);
                            setFeedback(`Dismissed “${notification.title}”.`);
                          }}
                          aria-label={`Dismiss ${notification.title}`}
                          title="Dismiss notification"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                        <span className="web-page-notifications__item-chevron" aria-hidden="true">
                          <ChevronRight size={14} />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="web-page-notifications__legend" aria-label="Notification tone legend">
                {toneOptions.slice(1).map((option) => (
                  <span className="web-page-notifications__legend-item" key={option.value}>
                    <span className="web-page-notifications__legend-swatch" data-tone={option.value} />
                    {option.label}
                  </span>
                ))}
              </div>
            </section>

            <aside className="web-page-notifications__detail" aria-label="Selected notification details">
              <GlassCard className="web-page-notifications__detail-card">
                {selectedNotification ? (
                  <>
                    <div className="web-page-notifications__detail-header">
                      <div className="web-page-notifications__detail-topline">
                        <span className="web-page-notifications__detail-eyebrow">Selected notification</span>
                        <Badge
                          variant={toneVariants[selectedNotification.tone]}
                          leadingIcon={<ToneIcon tone={selectedNotification.tone} size={12} />}
                        >
                          {toneLabels[selectedNotification.tone]}
                        </Badge>
                      </div>
                      <h2 className="web-page-notifications__detail-title">{selectedNotification.title}</h2>
                      <p className="web-page-notifications__detail-message">{selectedNotification.message}</p>
                      <div className="web-page-notifications__detail-context">
                        <span>
                          <Bell size={12} />
                          {selectedNotification.read ? "Read" : "Unread"}
                        </span>
                        <span>
                          <CircleDot size={12} />
                          Metron system
                        </span>
                      </div>
                    </div>
                    <div className="web-page-notifications__detail-body">
                      <section className="web-page-notifications__detail-section">
                        <div className="web-page-notifications__detail-label">
                          <Info size={14} />
                          Message
                        </div>
                        <p className="web-page-notifications__detail-copy">{selectedNotification.message}</p>
                      </section>
                      <section className="web-page-notifications__detail-section">
                        <div className="web-page-notifications__detail-label">
                          <SlidersHorizontal size={14} />
                          Notification metadata
                        </div>
                        <dl className="web-page-notifications__detail-data">
                          <div className="web-page-notifications__detail-row">
                            <dt>Status</dt>
                            <dd>{selectedNotification.read ? "Read" : "Unread"}</dd>
                          </div>
                          <div className="web-page-notifications__detail-row">
                            <dt>Tone</dt>
                            <dd>{toneLabels[selectedNotification.tone]}</dd>
                          </div>
                          <div className="web-page-notifications__detail-row">
                            <dt>Notification ID</dt>
                            <dd>{selectedNotification.id}</dd>
                          </div>
                        </dl>
                      </section>
                      <section className="web-page-notifications__detail-section">
                        <div className="web-page-notifications__detail-actions">
                          <Button
                            variant="outline"
                            size="sm"
                            leadingIcon={<Check size={14} />}
                            onClick={markSelectedRead}
                            disabled={selectedNotification.read}
                          >
                            {selectedNotification.read ? "Already read" : "Mark as read"}
                          </Button>
                          <Button
                            variant="quiet"
                            size="sm"
                            leadingIcon={<Trash2 size={14} />}
                            onClick={dismissSelected}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </section>
                    </div>
                  </>
                ) : (
                  <div className="web-page-notifications__empty">
                    <span className="web-page-notifications__empty-icon">
                      <Bell size={20} aria-hidden="true" />
                    </span>
                    <strong>Select a notification</strong>
                    <p>Choose an item from the inbox to review its full message and status.</p>
                  </div>
                )}
              </GlassCard>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
