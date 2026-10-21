import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  LocalStorage,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { type CodexModel, type ModelSelection } from "./codex";
import { messageOf } from "./conversations";

import { ProviderMenu } from "./provider-menu";
import { PROVIDERS, storageKeys } from "./session-storage";
import {
  createProviderClient,
  providerCapabilities,
  type ChatClient,
  type ProviderId,
} from "./provider";
import { connectionSignature, validSelection, type Setup } from "./setup-state";

export function SetupWizard({
  preferences,
  provider,
  onProviderChange,
  previous,
  selection: savedSelection,
  onComplete,
}: {
  preferences: Preferences;
  provider: ProviderId;
  onProviderChange: (value: string) => Promise<void>;
  previous: Setup | null;
  selection: ModelSelection | null;
  onComplete: (setup: Setup) => void;
}) {
  const keys = storageKeys(provider);
  const [step, setStep] = useState(1);
  const [models, setModels] = useState<CodexModel[]>([]);
  const [model, setModel] = useState("");
  const [effort, setEffort] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const mounted = useRef(true);
  const checkingRef = useRef(false);
  const savingRef = useRef(false);
  const clientRef = useRef<ChatClient | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clientRef.current?.close();
    };
  }, []);

  async function checkConnection() {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setChecking(true);
    setError("");
    setCheckedAt(0);
    const client = createProviderClient(provider, {
      onEvent: () => undefined,
      sandbox: preferences.sandboxMode || "read-only",
      cwd: preferences.workingDirectory,
      codexPath: preferences.codexPath,
      agyPath: preferences.agyPath,
      qoderPath: preferences.qoderPath,
      qoderCnPath: preferences.qoderCnPath,
      workbuddyPath: preferences.workbuddyPath,
      geminiPath: preferences.geminiPath,
      liveSearch: preferences.liveSearch ?? true,
    });
    clientRef.current = client;
    try {
      await client.connect();
      await client.checkAuthentication();
      const catalog = await client.listModels();
      if (!catalog.length)
        throw new Error(
          "No models returned. Check your CLI configuration and try again.",
        );
      if (!mounted.current) return;
      setModels(catalog);
      const selected = savedSelection || previous?.selection;
      // Preserve an existing choice only if it is still in the CLI catalog.
      if (selected && validSelection(catalog, selected)) {
        setModel(selected.model);
        setEffort(selected.effort);
      } else {
        setModel("");
        setEffort("");
      }
      setCheckedAt(Date.now());
      setStep(2);
    } catch (reason) {
      if (mounted.current) setError(messageOf(reason));
    } finally {
      client.close();
      clientRef.current = null;
      checkingRef.current = false;
      if (mounted.current) setChecking(false);
    }
  }

  async function finish() {
    if (savingRef.current) return;
    if (!checkedAt || !validSelection(models, { model, effort })) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Choose a model and effort level to continue",
      });
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const setup: Setup = {
        version: 2,
        selection: { model, effort },
        checkedAt,
        connection: connectionSignature(preferences, provider),
      };
      // Mark setup complete last, so a failed save cannot bypass onboarding.
      await LocalStorage.setItem(keys.model, JSON.stringify(setup.selection));
      await LocalStorage.setItem(keys.setup, JSON.stringify(setup));
      if (mounted.current) onComplete(setup);
    } catch (reason) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save settings",
        message: messageOf(reason),
      });
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  const preferencesAction = (
    <Action
      title="CLI Path and Permissions"
      icon={Icon.Gear}
      onAction={openExtensionPreferences}
    />
  );
  const label = providerCapabilities(provider).label;
  const title = `Set Up ${label} in Raycast`;
  if (step === 1)
    return (
      <Detail
        navigationTitle={title}
        isLoading={checking}
        markdown={[
          `## ${label} in Raycast`,
          "**1 of 2 · Connect your CLI**",
          provider === "codex"
            ? "Install Codex CLI and run `codex login` first."
            : `Install ${label} CLI and sign in from your terminal first.`,
          provider === "codex"
            ? "Check the local connection, sign-in status, and available models. No prompt is sent; model access is confirmed with your first message."
            : "Find the local CLI and its model choices. No prompt is sent; sign-in and model access are confirmed with your first message.",
          checking
            ? "Checking Connection…"
            : error
              ? `**Connection check failed**\n\n${error.replace(/[<>]/g, "")}`
              : "Press Enter to connect. Your chats and model choice stay with this CLI.",
          "*AI in Raycast · Enable or disable each CLI command in Raycast Settings → Extensions.*",
        ].join("\n\n")}
        actions={
          <ActionPanel>
            <Action
              title={checking ? "Checking Connection…" : "Check CLI Connection"}
              icon={Icon.Link}
              onAction={checkConnection}
            />
            <ProviderMenu
              providers={PROVIDERS}
              selected={provider}
              onSelect={(value) => {
                if (!checkingRef.current) void onProviderChange(value);
              }}
            />
            {preferencesAction}
            {provider === "codex" && (
              <Action.OpenInBrowser
                title="Install Codex CLI"
                url="https://github.com/openai/codex#installation"
              />
            )}
          </ActionPanel>
        }
      />
    );
  const selected = models.find((entry) => entry.model === model);
  return (
    <Form
      navigationTitle={title}
      isLoading={saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save and Start Chatting"
            onSubmit={finish}
          />
          <Action
            title="Check Connection Again"
            onAction={() => {
              if (!savingRef.current) {
                setCheckedAt(0);
                setStep(1);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="2 of 2 · Default Model"
        text={
          provider === "codex"
            ? "CLI connected. Choose a model and effort level. You can change them later in Actions."
            : "Choose a model, or CLI Default to use the CLI's own choice. Sign-in and model access have not been verified yet."
        }
      />
      <Form.Dropdown
        id="model"
        title="Model"
        value={model}
        onChange={(value) => {
          if (savingRef.current) return;
          setModel(value);
          setEffort("");
        }}
      >
        <Form.Dropdown.Item value="" title="Choose a model" />
        {models.map((entry) => (
          <Form.Dropdown.Item
            key={entry.model}
            value={entry.model}
            title={entry.displayName || entry.model}
          />
        ))}
      </Form.Dropdown>
      {selected &&
        (selected.efforts.length ? (
          <Form.Dropdown
            id="effort"
            title="Effort Level"
            value={effort}
            onChange={(value) => {
              if (!savingRef.current) setEffort(value);
            }}
          >
            <Form.Dropdown.Item value="" title="Choose an effort level" />
            {selected.efforts.map((value) => (
              <Form.Dropdown.Item key={value} value={value} title={value} />
            ))}
          </Form.Dropdown>
        ) : (
          <Form.Description
            title="Effort Level"
            text="This model does not expose an adjustable effort level."
          />
        ))}
    </Form>
  );
}
