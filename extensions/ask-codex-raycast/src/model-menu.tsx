import { t } from "./i18n";
import { Action, ActionPanel, Icon } from "@raycast/api";
import { useRef } from "react";
import type { CodexModel, ModelSelection } from "./codex";

export const MODEL_SELECTION_KEY = "ask-chatgpt.model-selection.v1";

export type ModelMenuProps = {
  models: CodexModel[];
  selection: ModelSelection | null;
  current: ModelSelection;
  loading: boolean;
  error: string;
  ready: boolean;
  shortcuts?: boolean;
  allowCurrent?: boolean;
  onRefresh: () => void;
  onSelect: (selection: ModelSelection | null) => void;
};

function RefreshModels(props: ModelMenuProps) {
  return (
    <Action
      title={
        props.loading
          ? t("Loading Models…")
          : props.error
            ? t("Reload Model List")
            : props.ready
              ? t("Refresh Model List")
              : t("Waiting for Connection")
      }
      icon={Icon.ArrowClockwise}
      onAction={() => loadOnOpen(props)}
    />
  );
}

function loadOnOpen(props: ModelMenuProps) {
  if (!props.loading && props.ready) props.onRefresh();
}

function catalogAvailable(props: ModelMenuProps): boolean {
  return props.ready && !props.loading && !props.error;
}

function catalogCaption(props: ModelMenuProps): string {
  return !props.ready
    ? t("Waiting for Connection")
    : props.loading
      ? t("Loading Models…")
      : props.error
        ? t("Model List Unavailable")
        : !props.models.length
          ? t("No Models Available")
          : "";
}

function CatalogStatus(props: ModelMenuProps) {
  return (
    <ActionPanel.Section
      title={props.error || catalogCaption(props) || undefined}
    >
      <RefreshModels {...props} />
    </ActionPanel.Section>
  );
}

export function ModelMenu(props: ModelMenuProps) {
  const latest = useRef(props);
  latest.current = props;
  const selected = props.selection || props.current;
  const available = catalogAvailable(props);
  const caption = catalogCaption(props);
  return (
    <ActionPanel.Submenu
      title={t("Model: {model}", {
        model:
          caption ||
          (selected.model === "__cli_default__"
            ? t("CLI Default")
            : selected.model || t("Choose a model")),
      })}
      icon={Icon.ComputerChip}
      shortcut={
        props.shortcuts === false
          ? undefined
          : {
              modifiers: [process.platform === "darwin" ? "cmd" : "ctrl"],
              key: "m",
            }
      }
      isLoading={props.loading}
      onOpen={() => loadOnOpen(latest.current)}
    >
      {available && props.models.length > 0 && props.allowCurrent !== false && (
        <Action
          title={t("Use Current Conversation Model")}
          icon={!props.selection ? Icon.Checkmark : Icon.Circle}
          onAction={() => {
            const current = latest.current;
            if (
              catalogAvailable(current) &&
              current.models.length &&
              current.allowCurrent !== false
            )
              current.onSelect(null);
          }}
        />
      )}
      {available && props.models.length > 0 && (
        <ActionPanel.Section title={t("Model")}>
          {props.models.map((model) => (
            <Action
              key={model.model}
              title={
                model.model === "__cli_default__"
                  ? t("CLI Default")
                  : model.displayName || model.model
              }
              icon={
                selected.model === model.model
                  ? Icon.Checkmark
                  : Icon.ComputerChip
              }
              onAction={() => {
                const current = latest.current;
                if (!catalogAvailable(current)) return;
                const actual = current.models.find(
                  (entry) => entry.model === model.model,
                );
                if (!actual) return;
                const selection = current.selection || current.current;
                const effort = actual.efforts.includes(selection.effort)
                  ? selection.effort
                  : actual.efforts.includes(actual.defaultEffort)
                    ? actual.defaultEffort
                    : actual.efforts[0] || "";
                current.onSelect({ model: actual.model, effort });
              }}
            />
          ))}
        </ActionPanel.Section>
      )}
      <CatalogStatus {...props} />
    </ActionPanel.Submenu>
  );
}

const effortOrder = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "ultra",
];
export function EffortMenu(props: ModelMenuProps) {
  const latest = useRef(props);
  latest.current = props;
  const selected = props.selection || props.current;
  const model = props.models.find((entry) => entry.model === selected.model);
  const available = catalogAvailable(props);
  const caption = catalogCaption(props);
  const efforts = [...(model?.efforts || [])].sort((a, b) => {
    const first = effortOrder.indexOf(a);
    const second = effortOrder.indexOf(b);
    // Unknown future values keep the relative order reported by the CLI.
    return (
      (first < 0 ? effortOrder.length : first) -
      (second < 0 ? effortOrder.length : second)
    );
  });
  return (
    <ActionPanel.Submenu
      title={t("Effort Level: {effort}", {
        effort:
          caption ||
          (!model
            ? t("Choose a model")
            : !efforts.length
              ? t("Not adjustable")
              : efforts.includes(selected.effort)
                ? selected.effort
                : t("Choose an effort level")),
      })}
      icon={Icon.Gauge}
      shortcut={
        props.shortcuts === false
          ? undefined
          : {
              modifiers: [process.platform === "darwin" ? "cmd" : "ctrl"],
              key: "e",
            }
      }
      isLoading={props.loading}
      onOpen={() => loadOnOpen(latest.current)}
    >
      {available && model && efforts.length > 0 && (
        <ActionPanel.Section title={model.model}>
          {efforts.map((effort) => (
            <Action
              key={effort}
              title={effort}
              icon={selected.effort === effort ? Icon.Checkmark : Icon.Circle}
              autoFocus={selected.effort === effort}
              onAction={() => {
                const current = latest.current;
                if (!catalogAvailable(current)) return;
                const selection = current.selection || current.current;
                const actual = current.models.find(
                  (entry) => entry.model === selection.model,
                );
                if (
                  actual?.model === model.model &&
                  actual.efforts.includes(effort)
                )
                  current.onSelect({ model: actual.model, effort });
              }}
            />
          ))}
        </ActionPanel.Section>
      )}
      {available && model && !efforts.length && (
        <ActionPanel.Section
          title={t("This model does not expose an adjustable effort level.")}
        >
          <RefreshModels {...props} />
        </ActionPanel.Section>
      )}
      {(!available || !model || efforts.length > 0) && (
        <CatalogStatus {...props} />
      )}
    </ActionPanel.Submenu>
  );
}
