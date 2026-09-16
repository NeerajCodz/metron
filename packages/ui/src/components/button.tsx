import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

import { cn } from "../lib/cn.js";

export type ButtonVariant =
  | "solid"
  | "glass"
  | "liquid-glass"
  | "primary"
  | "crimson"
  | "sand"
  | "secondary"
  | "outline"
  | "quiet"
  | "ghost"
  | "danger"
  | "destructive"
  | "link";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonBaseProps {
  children: ReactNode;
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  leadingIcon?: ReactNode | undefined;
  trailingIcon?: ReactNode | undefined;
  fullWidth?: boolean | undefined;
  loading?: boolean | undefined;
  loadingLabel?: ReactNode | undefined;
  className?: string | undefined;
}

export interface ButtonButtonProps
  extends ButtonBaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> {
  href?: never;
}

export interface ButtonAnchorProps
  extends ButtonBaseProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className" | "href"> {
  href: string;
  disabled?: boolean;
}

export type ButtonProps = ButtonButtonProps | ButtonAnchorProps;

export interface IconButtonBaseProps {
  icon: ReactNode;
  accessibleLabel: string;
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  loading?: boolean | undefined;
  className?: string | undefined;
}

export interface IconButtonButtonProps
  extends IconButtonBaseProps,
    Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      "aria-label" | "children" | "className"
    > {
  href?: never;
}

export interface IconButtonAnchorProps
  extends IconButtonBaseProps,
    Omit<
      AnchorHTMLAttributes<HTMLAnchorElement>,
      "aria-label" | "children" | "className" | "href"
    > {
  href: string;
  disabled?: boolean;
}

export type IconButtonProps = IconButtonButtonProps | IconButtonAnchorProps;

function controlClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  fullWidth: boolean,
  iconOnly: boolean,
  className: string | undefined,
): string {
  return cn(
    "metron-button",
    `metron-button--${variant}`,
    `metron-button--${size}`,
    fullWidth && "metron-button--full-width",
    iconOnly && "metron-button--icon-only",
    className,
  );
}

function LoadingIndicator(): ReactNode {
  return <span className="metron-button__spinner" aria-hidden="true" />;
}

function ButtonContent({
  children,
  leadingIcon,
  trailingIcon,
  loading,
  loadingLabel,
}: Pick<
  ButtonBaseProps,
  "children" | "leadingIcon" | "trailingIcon" | "loading" | "loadingLabel"
>): ReactNode {
  if (loading) {
    return (
      <>
        <LoadingIndicator />
        <span className="metron-button__label">{loadingLabel ?? "Loading"}</span>
      </>
    );
  }

  return (
    <>
      {leadingIcon ? (
        <span className="metron-button__icon" aria-hidden="true">
          {leadingIcon}
        </span>
      ) : null}
      <span className="metron-button__label">{children}</span>
      {trailingIcon ? (
        <span className="metron-button__icon" aria-hidden="true">
          {trailingIcon}
        </span>
      ) : null}
    </>
  );
}

function ButtonAnchor(props: ButtonAnchorProps) {
  const {
    children,
    variant = "solid",
    size = "md",
    leadingIcon,
    trailingIcon,
    fullWidth = false,
    loading = false,
    loadingLabel,
    className,
    href,
    disabled = false,
    onClick,
    tabIndex,
    ...anchorProps
  } = props;
  const isDisabled = disabled || loading;
  const classes = controlClassName(variant, size, fullWidth, false, className);
  const content = (
    <ButtonContent
      children={children}
      leadingIcon={leadingIcon}
      trailingIcon={trailingIcon}
      loading={loading}
      loadingLabel={loadingLabel}
    />
  );

  if (isDisabled) {
    const preventDisabledClick = (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      event.stopPropagation();
    };

    return (
      <a
        {...anchorProps}
        className={classes}
        role="link"
        aria-disabled="true"
        aria-busy={loading || undefined}
        tabIndex={-1}
        onClick={preventDisabledClick}
        data-loading={loading || undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <a
      {...anchorProps}
      className={classes}
      href={href}
      aria-busy={loading || undefined}
      tabIndex={tabIndex}
      onClick={onClick}
    >
      {content}
    </a>
  );
}

function ButtonElement(props: ButtonButtonProps) {
  const {
    children,
    variant = "solid",
    size = "md",
    leadingIcon,
    trailingIcon,
    fullWidth = false,
    loading = false,
    loadingLabel,
    className,
    disabled = false,
    type = "button",
    ...buttonProps
  } = props;

  return (
    <button
      {...buttonProps}
      className={controlClassName(variant, size, fullWidth, false, className)}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
    >
      <ButtonContent
        children={children}
        leadingIcon={leadingIcon}
        trailingIcon={trailingIcon}
        loading={loading}
        loadingLabel={loadingLabel}
      />
    </button>
  );
}

export function Button(props: ButtonProps) {
  return typeof props.href === "string" ? (
    <ButtonAnchor {...props} />
  ) : (
    <ButtonElement {...props} />
  );
}

function IconButtonAnchor(props: IconButtonAnchorProps) {
  const {
    icon,
    accessibleLabel,
    variant = "glass",
    size = "md",
    loading = false,
    className,
    href,
    disabled = false,
    onClick,
    tabIndex,
    ...anchorProps
  } = props;
  const isDisabled = disabled || loading;
  const classes = controlClassName(variant, size, false, true, className);
  const content = loading ? <LoadingIndicator /> : icon;

  if (isDisabled) {
    const preventDisabledClick = (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      event.stopPropagation();
    };

    return (
      <a
        {...anchorProps}
        className={classes}
        role="link"
        aria-label={accessibleLabel}
        aria-disabled="true"
        aria-busy={loading || undefined}
        tabIndex={-1}
        onClick={preventDisabledClick}
        data-loading={loading || undefined}
      >
        <span className="metron-button__icon" aria-hidden="true">
          {content}
        </span>
      </a>
    );
  }

  return (
    <a
      {...anchorProps}
      className={classes}
      href={href}
      aria-label={accessibleLabel}
      aria-busy={loading || undefined}
      tabIndex={tabIndex}
      onClick={onClick}
    >
      <span className="metron-button__icon" aria-hidden="true">
        {content}
      </span>
    </a>
  );
}

function IconButtonElement(props: IconButtonButtonProps) {
  const {
    icon,
    accessibleLabel,
    variant = "glass",
    size = "md",
    loading = false,
    className,
    disabled = false,
    type = "button",
    ...buttonProps
  } = props;

  return (
    <button
      {...buttonProps}
      className={controlClassName(variant, size, false, true, className)}
      type={type}
      disabled={disabled || loading}
      aria-label={accessibleLabel}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
    >
      <span className="metron-button__icon" aria-hidden="true">
        {loading ? <LoadingIndicator /> : icon}
      </span>
    </button>
  );
}

export function IconButton(props: IconButtonProps) {
  return typeof props.href === "string" ? (
    <IconButtonAnchor {...props} />
  ) : (
    <IconButtonElement {...props} />
  );
}

export interface ButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical" | undefined;
  spacing?: "attached" | "spaced" | undefined;
  children?: ReactNode | undefined;
}

export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ orientation = "horizontal", spacing = "attached", className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="group"
        className={cn(
          "metron-button-group",
          `metron-button-group--${orientation}`,
          `metron-button-group--${spacing}`,
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
ButtonGroup.displayName = "ButtonGroup";
