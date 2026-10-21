import { t } from "./i18n";
import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";

export type ComposerProps = {
  draft: string;
  busy: boolean;
  canSteer: boolean;
  ready: boolean;
  onChange: (text: string) => void;
  onSend: (text: string) => Promise<boolean>;
  onStop: () => Promise<void> | void;
};

/** A native input popover above the bottom-right action bar; chat stays visible. */
export function MessageComposer(props: ComposerProps) {
  const current = useRef(props);
  current.current = props;
  const revision = useRef(0);
  const openingReset = useRef(true);
  const query = useRef("");
  const restored = useRef(false);
  const pending = useRef(false);
  const mounted = useRef(true);
  const [, refresh] = useState(0);
  const update = () => refresh((value) => value + 1);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const message = restored.current ? props.draft : query.current;
  const preview = Array.from(message.replace(/\s+/g, " "))
    .slice(0, 90)
    .join("");
  async function send() {
    if (!mounted.current || pending.current) return;
    const text = restored.current ? current.current.draft : query.current;
    if (!text.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("Enter a message in the input field first"),
      });
      return;
    }
    const submittedRevision = revision.current;
    pending.current = true;
    try {
      if (await current.current.onSend(text)) {
        if (!mounted.current || revision.current !== submittedRevision) return;
        query.current = "";
        restored.current = false;
        update();
      }
    } catch (reason) {
      if (mounted.current)
        await showToast({
          style: Toast.Style.Failure,
          title: t("Failed to send"),
          message: reason instanceof Error ? reason.message : String(reason),
        });
    } finally {
      pending.current = false;
    }
  }

  return (
    <ActionPanel.Submenu
      title={
        props.busy
          ? props.canSteer
            ? t("Add Instructions")
            : t("Write Next Message")
          : t("Enter Message")
      }
      icon={Icon.Pencil}
      shortcut={{ modifiers: [], key: "return" }}
      filtering={false}
      throttle={false}
      isLoading={!props.ready}
      onOpen={() => {
        revision.current++;
        openingReset.current = true;
        query.current = "";
        restored.current = Boolean(current.current.draft.trim());
        update();
      }}
      onSearchTextChange={(text) => {
        if (!mounted.current) return;
        // The host clears an uncontrolled submenu query on open and close.
        // Only explicit Clear Draft discards the persistent recovery copy.
        if (openingReset.current && !text) {
          openingReset.current = false;
          return;
        }
        openingReset.current = false;
        revision.current++;
        query.current = text;
        restored.current = false;
        if (text) current.current.onChange(text);
        update();
      }}
    >
      <ActionPanel.Section
        title={
          preview
            ? t("Pending · {preview}", { preview })
            : t("Type a message, press Enter to send")
        }
      >
        <Action
          title={
            props.busy && !props.canSteer
              ? t("Wait for Response")
              : restored.current
                ? t("Send Saved Draft")
                : props.busy
                  ? t("Send Instructions")
                  : t("Send Message")
          }
          icon={Icon.ArrowRight}
          onAction={send}
        />
      </ActionPanel.Section>
      {props.busy && (
        <Action
          title={t("Stop Response")}
          icon={Icon.Stop}
          shortcut={{
            modifiers: [process.platform === "darwin" ? "cmd" : "ctrl"],
            key: ".",
          }}
          onAction={() => current.current.onStop()}
        />
      )}
      {props.draft.trim() && (
        <ActionPanel.Section>
          <Action
            title={t("Clear Draft")}
            icon={Icon.Eraser}
            onAction={() => {
              revision.current++;
              query.current = "";
              restored.current = false;
              current.current.onChange("");
              update();
            }}
          />
          {restored.current && (
            <Action.CopyToClipboard
              title={t("Copy Draft to Continue Editing")}
              content={props.draft}
            />
          )}
        </ActionPanel.Section>
      )}
    </ActionPanel.Submenu>
  );
}
