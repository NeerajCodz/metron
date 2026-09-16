import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type PropsWithChildren,
} from "react";

export type JobStatus = "idle" | "running" | "success" | "error";
export type NotificationTone = "info" | "success" | "warning" | "error";

export interface MetronWorkspace {
  id: string;
  label: string;
  description: string;
}

export interface WalletState {
  connected: boolean;
  address: string | null;
  chain: string;
}

export interface ActiveIntent {
  id: string;
  title: string;
  objective: string;
  status: "draft" | "active" | "paused" | "complete";
}

export interface MetronNotification {
  id: string;
  title: string;
  message: string;
  tone: NotificationTone;
  read: boolean;
}

export interface ActionJob {
  id: string;
  label: string;
  status: JobStatus;
  progress: number;
  message: string;
}

export interface MetronState {
  workspaces: MetronWorkspace[];
  selectedWorkspace: string;
  wallet: WalletState;
  activeIntent: ActiveIntent | null;
  selectedStrategy: string | null;
  automationPaused: boolean;
  notifications: MetronNotification[];
  jobs: ActionJob[];
}

export interface StartJobInput {
  id?: string;
  label: string;
  progress?: number;
  message?: string;
}

export interface FinishJobInput {
  id: string;
  message?: string;
  progress?: number;
}

export interface FailJobInput {
  id: string;
  message: string;
  progress?: number;
}

export type MetronAction =
  | { type: "set-workspace"; workspaceId: string }
  | { type: "set-wallet"; wallet: WalletState }
  | { type: "set-active-intent"; intent: ActiveIntent | null }
  | { type: "select-strategy"; strategyId: string | null }
  | { type: "set-automation-paused"; paused: boolean }
  | { type: "add-notification"; notification: MetronNotification }
  | { type: "dismiss-notification"; notificationId: string }
  | { type: "mark-notification-read"; notificationId: string }
  | { type: "start-job"; job: ActionJob }
  | { type: "update-job"; id: string; patch: Partial<Pick<ActionJob, "label" | "progress" | "message">> }
  | { type: "finish-job"; id: string; message: string; progress: number }
  | { type: "fail-job"; id: string; message: string; progress: number }
  | { type: "clear-job"; id: string };

const DEFAULT_WORKSPACES: MetronWorkspace[] = [
  {
    id: "treasury",
    label: "Treasury operations",
    description: "Production capital and active execution",
  },
  {
    id: "research",
    label: "Research sandbox",
    description: "Strategy testing with isolated capital",
  },
];

const DEFAULT_WALLET: WalletState = {
  connected: true,
  address: "0x71B4…2A9C",
  chain: "Ethereum",
};

const DEFAULT_NOTIFICATIONS: MetronNotification[] = [
  {
    id: "notification-risk-guard",
    title: "Risk guard active",
    message: "Utilization is below the configured 72% threshold.",
    tone: "info",
    read: false,
  },
  {
    id: "notification-rebalance",
    title: "Rebalance completed",
    message: "Basis harvest moved 2.4 ETH into Pendle PT-eETH.",
    tone: "success",
    read: true,
  },
];

export const initialMetronState: MetronState = {
  workspaces: DEFAULT_WORKSPACES,
  selectedWorkspace: "treasury",
  wallet: DEFAULT_WALLET,
  activeIntent: {
    id: "intent-basis-harvest",
    title: "Compound stable yield",
    objective: "Harvest basis while keeping directional exposure neutral.",
    status: "active",
  },
  selectedStrategy: "basis-harvest",
  automationPaused: false,
  notifications: DEFAULT_NOTIFICATIONS,
  jobs: [],
};

/** Return a fresh state tree so local state can never mutate the exported defaults. */
export function createInitialMetronState(): MetronState {
  return {
    ...initialMetronState,
    workspaces: initialMetronState.workspaces.map((workspace) => ({ ...workspace })),
    wallet: { ...initialMetronState.wallet },
    activeIntent: initialMetronState.activeIntent ? { ...initialMetronState.activeIntent } : null,
    notifications: initialMetronState.notifications.map((notification) => ({ ...notification })),
    jobs: [],
  };
}

function clampProgress(progress: number): number {
  return Math.min(100, Math.max(0, Math.round(progress)));
}

function jobIdFromLabel(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `job-${slug || "action"}`;
}

function addNotification(
  notifications: MetronNotification[],
  notification: MetronNotification,
): MetronNotification[] {
  const withoutExisting = notifications.filter((item) => item.id !== notification.id);
  return [notification, ...withoutExisting].slice(0, 8);
}

function jobNotification(job: ActionJob): MetronNotification {
  const success = job.status === "success";
  return {
    id: `notification-job-${job.id}-${job.status}`,
    title: success ? `${job.label} complete` : `${job.label} failed`,
    message: job.message,
    tone: success ? "success" : "error",
    read: false,
  };
}

function upsertJob(jobs: ActionJob[], nextJob: ActionJob): ActionJob[] {
  const index = jobs.findIndex((job) => job.id === nextJob.id);
  if (index < 0) return [nextJob, ...jobs];
  return jobs.map((job) => (job.id === nextJob.id ? nextJob : job));
}

export function metronReducer(state: MetronState, action: MetronAction): MetronState {
  switch (action.type) {
    case "set-workspace":
      return state.workspaces.some((workspace) => workspace.id === action.workspaceId)
        ? { ...state, selectedWorkspace: action.workspaceId }
        : state;
    case "set-wallet":
      return { ...state, wallet: { ...action.wallet } };
    case "set-active-intent":
      return { ...state, activeIntent: action.intent ? { ...action.intent } : null };
    case "select-strategy":
      return { ...state, selectedStrategy: action.strategyId };
    case "set-automation-paused":
      return { ...state, automationPaused: action.paused };
    case "add-notification":
      return {
        ...state,
        notifications: addNotification(state.notifications, { ...action.notification }),
      };
    case "dismiss-notification":
      return {
        ...state,
        notifications: state.notifications.filter((item) => item.id !== action.notificationId),
      };
    case "mark-notification-read":
      return {
        ...state,
        notifications: state.notifications.map((item) =>
          item.id === action.notificationId ? { ...item, read: true } : item,
        ),
      };
    case "start-job":
      return {
        ...state,
        jobs: upsertJob(state.jobs, {
          ...action.job,
          status: "running",
          progress: clampProgress(action.job.progress),
        }),
      };
    case "update-job":
      return {
        ...state,
        jobs: state.jobs.map((job) =>
          job.id === action.id
            ? {
                ...job,
                ...action.patch,
                progress:
                  action.patch.progress === undefined
                    ? job.progress
                    : clampProgress(action.patch.progress),
              }
            : job,
        ),
      };
    case "finish-job": {
      const job = state.jobs.find((item) => item.id === action.id);
      if (!job) return state;
      const finishedJob: ActionJob = {
        ...job,
        status: "success",
        progress: clampProgress(action.progress),
        message: action.message,
      };
      return {
        ...state,
        jobs: upsertJob(state.jobs, finishedJob),
        notifications: addNotification(state.notifications, jobNotification(finishedJob)),
      };
    }
    case "fail-job": {
      const job = state.jobs.find((item) => item.id === action.id);
      if (!job) return state;
      const failedJob: ActionJob = {
        ...job,
        status: "error",
        progress: clampProgress(action.progress),
        message: action.message,
      };
      return {
        ...state,
        jobs: upsertJob(state.jobs, failedJob),
        notifications: addNotification(state.notifications, jobNotification(failedJob)),
      };
    }
    case "clear-job":
      return { ...state, jobs: state.jobs.filter((job) => job.id !== action.id) };
    default:
      return state;
  }
}

export function startJob(input: StartJobInput): Extract<MetronAction, { type: "start-job" }>;
export function startJob(
  id: string,
  label: string,
  message?: string,
): Extract<MetronAction, { type: "start-job" }>;
export function startJob(
  inputOrId: StartJobInput | string,
  label?: string,
  message?: string,
): Extract<MetronAction, { type: "start-job" }> {
  const input: StartJobInput =
    typeof inputOrId === "string"
      ? {
          id: inputOrId,
          label: label ?? inputOrId,
          ...(message === undefined ? {} : { message }),
        }
      : inputOrId;
  const resolvedLabel = input.label.trim() || "Action";
  return {
    type: "start-job",
    job: {
      id: input.id?.trim() || jobIdFromLabel(resolvedLabel),
      label: resolvedLabel,
      status: "running",
      progress: clampProgress(input.progress ?? 0),
      message: input.message ?? `Starting ${resolvedLabel.toLowerCase()}.`,
    },
  };
}

export function finishJob(input: FinishJobInput): Extract<MetronAction, { type: "finish-job" }>;
export function finishJob(
  id: string,
  message?: string,
  progress?: number,
): Extract<MetronAction, { type: "finish-job" }>;
export function finishJob(
  inputOrId: FinishJobInput | string,
  message?: string,
  progress?: number,
): Extract<MetronAction, { type: "finish-job" }> {
  const input: FinishJobInput =
    typeof inputOrId === "string"
      ? {
          id: inputOrId,
          ...(message === undefined ? {} : { message }),
          ...(progress === undefined ? {} : { progress }),
        }
      : inputOrId;
  return {
    type: "finish-job",
    id: input.id,
    progress: clampProgress(input.progress ?? 100),
    message: input.message ?? "Action completed successfully.",
  };
}

export function failJob(input: FailJobInput): Extract<MetronAction, { type: "fail-job" }>;
export function failJob(
  id: string,
  message: string,
  progress?: number,
): Extract<MetronAction, { type: "fail-job" }>;
export function failJob(
  inputOrId: FailJobInput | string,
  message?: string,
  progress?: number,
): Extract<MetronAction, { type: "fail-job" }> {
  const input: FailJobInput =
    typeof inputOrId === "string"
      ? {
          id: inputOrId,
          message: message ?? "Action failed.",
          ...(progress === undefined ? {} : { progress }),
        }
      : inputOrId;
  return {
    type: "fail-job",
    id: input.id,
    progress: clampProgress(input.progress ?? 100),
    message: input.message,
  };
}

type StartJobHandler = {
  (input: StartJobInput): string;
  (id: string, label: string, message?: string): string;
};

type FinishJobHandler = {
  (input: FinishJobInput): void;
  (id: string, message?: string, progress?: number): void;
};

type FailJobHandler = {
  (input: FailJobInput): void;
  (id: string, message: string, progress?: number): void;
};

export interface MetronStateContextValue extends MetronState {
  dispatch: Dispatch<MetronAction>;
  setWorkspace: (workspaceId: string) => void;
  setWallet: (wallet: WalletState) => void;
  connectWallet: (address?: string, chain?: string) => void;
  disconnectWallet: () => void;
  setActiveIntent: (intent: ActiveIntent | null) => void;
  selectStrategy: (strategyId: string | null) => void;
  setAutomationPaused: (paused: boolean) => void;
  toggleAutomationPause: () => void;
  addNotification: (notification: Omit<MetronNotification, "read"> & { read?: boolean }) => void;
  dismissNotification: (notificationId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  updateJob: (
    id: string,
    patch: Partial<Pick<ActionJob, "label" | "progress" | "message">>,
  ) => void;
  clearJob: (id: string) => void;
  startJob: StartJobHandler;
  finishJob: FinishJobHandler;
  failJob: FailJobHandler;
}

const MetronStateContext = createContext<MetronStateContextValue | null>(null);

export function MetronStateProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(metronReducer, undefined, createInitialMetronState);

  const setWorkspace = useCallback((workspaceId: string) => {
    dispatch({ type: "set-workspace", workspaceId });
  }, []);
  const setWallet = useCallback((wallet: WalletState) => {
    dispatch({ type: "set-wallet", wallet });
  }, []);
  const connectWallet = useCallback((address = DEFAULT_WALLET.address ?? "0x71B4…2A9C", chain = DEFAULT_WALLET.chain) => {
    dispatch({ type: "set-wallet", wallet: { connected: true, address, chain } });
  }, []);
  const disconnectWallet = useCallback(() => {
    dispatch({ type: "set-wallet", wallet: { connected: false, address: null, chain: DEFAULT_WALLET.chain } });
  }, []);
  const setActiveIntent = useCallback((intent: ActiveIntent | null) => {
    dispatch({ type: "set-active-intent", intent });
  }, []);
  const selectStrategy = useCallback((strategyId: string | null) => {
    dispatch({ type: "select-strategy", strategyId });
  }, []);
  const setAutomationPaused = useCallback((paused: boolean) => {
    dispatch({ type: "set-automation-paused", paused });
  }, []);
  const toggleAutomationPause = useCallback(() => {
    dispatch({ type: "set-automation-paused", paused: !state.automationPaused });
  }, [state.automationPaused]);
  const addNotificationToState = useCallback(
    (notification: Omit<MetronNotification, "read"> & { read?: boolean }) => {
      dispatch({
        type: "add-notification",
        notification: { ...notification, read: notification.read ?? false },
      });
    },
    [],
  );
  const dismissNotification = useCallback((notificationId: string) => {
    dispatch({ type: "dismiss-notification", notificationId });
  }, []);
  const markNotificationRead = useCallback((notificationId: string) => {
    dispatch({ type: "mark-notification-read", notificationId });
  }, []);
  const updateJob = useCallback(
    (id: string, patch: Partial<Pick<ActionJob, "label" | "progress" | "message">>) => {
      dispatch({ type: "update-job", id, patch });
    },
    [],
  );
  const clearJob = useCallback((id: string) => {
    dispatch({ type: "clear-job", id });
  }, []);
  const startJobHandler = useCallback<StartJobHandler>(
    (inputOrId: StartJobInput | string, label?: string, message?: string) => {
      const action =
        typeof inputOrId === "string"
          ? startJob(inputOrId, label ?? inputOrId, message)
          : startJob(inputOrId);
      dispatch(action);
      return action.job.id;
    },
    [],
  );
  const finishJobHandler = useCallback<FinishJobHandler>(
    (inputOrId: FinishJobInput | string, message?: string, progress?: number) => {
      dispatch(
        typeof inputOrId === "string"
          ? finishJob(inputOrId, message, progress)
          : finishJob(inputOrId),
      );
    },
    [],
  );
  const failJobHandler = useCallback<FailJobHandler>(
    (inputOrId: FailJobInput | string, message?: string, progress?: number) => {
      dispatch(
        typeof inputOrId === "string"
          ? failJob(inputOrId, message ?? "Action failed.", progress)
          : failJob(inputOrId),
      );
    },
    [],
  );

  const value = useMemo<MetronStateContextValue>(
    () => ({
      ...state,
      dispatch,
      setWorkspace,
      setWallet,
      connectWallet,
      disconnectWallet,
      setActiveIntent,
      selectStrategy,
      setAutomationPaused,
      toggleAutomationPause,
      addNotification: addNotificationToState,
      dismissNotification,
      markNotificationRead,
      updateJob,
      clearJob,
      startJob: startJobHandler,
      finishJob: finishJobHandler,
      failJob: failJobHandler,
    }),
    [
      state,
      setWorkspace,
      setWallet,
      connectWallet,
      disconnectWallet,
      setActiveIntent,
      selectStrategy,
      setAutomationPaused,
      toggleAutomationPause,
      addNotificationToState,
      dismissNotification,
      markNotificationRead,
      updateJob,
      clearJob,
      startJobHandler,
      finishJobHandler,
      failJobHandler,
    ],
  );

  return <MetronStateContext.Provider value={value}>{children}</MetronStateContext.Provider>;
}

export function useMetronState(): MetronStateContextValue {
  const context = useContext(MetronStateContext);
  if (!context) {
    throw new Error("useMetronState must be used within a MetronStateProvider");
  }
  return context;
}
