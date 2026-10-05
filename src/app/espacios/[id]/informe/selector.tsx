"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { BottomSheet } from "@/ui/bottom-sheet";
import { Button } from "@/ui/button";
import { SelectField } from "@/ui/field";
import { t } from "@/i18n";
import styles from "./selector.module.css";

export function ReportDownload({ spaceId, closedMonths, inView }: {
  spaceId: string;
  closedMonths: readonly string[];
  inView: string;
}) {
  const choices = [...closedMonths].sort().reverse();
  const first = choices.includes(inView) ? inView : choices[0] ?? "";
  const [selected, setSelected] = useState(first);
  const chosen = choices.includes(selected) ? selected : first;
  const year = chosen.slice(0, 4);
  const years = [...new Set(choices.map((of) => of.slice(0, 4)))];
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controls = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLDivElement>(null);
  const close = () => {
    if (!busy) {
      setOpen(false);
      trigger.current?.querySelector("button")?.focus();
    }
  };
  useEffect(() => {
    if (open) controls.current?.querySelector("select")?.focus();
  }, [open]);

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>("select, button:not(:disabled)")];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  async function download() {
    if (!chosen || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/espacios/${encodeURIComponent(spaceId)}/informe?mes=${encodeURIComponent(chosen)}`, { cache: "no-store", credentials: "same-origin" });
      if (!response.ok || response.headers.get("content-type") !== "application/pdf") {
        setError(response.status === 401 ? t("report.error.session") : response.status === 409 ? t("report.error.open") : t("report.error"));
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `contaro-${chosen}.pdf`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      // Let the browser consume the object URL before releasing its bytes.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setOpen(false);
      trigger.current?.querySelector("button")?.focus();
    } catch {
      setError(t("report.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.entry} ref={trigger}>
      <Button variant="plain" disabled={choices.length === 0} onClick={() => { setError(""); setOpen(true); }}>{t("report.download")}</Button>
      {choices.length === 0 ? <p className={styles.hint}>{t("report.none")}</p> : null}
      <BottomSheet open={open} title={t("report.choose")} onClose={close}>
        <div ref={controls} onKeyDown={trapFocus} className={styles.controls} aria-busy={busy}>
          <p className={styles.hint}>{t("report.closedOnly")}</p>
          <SelectField label={t("report.year")} value={year} disabled={busy}
            choices={years.map((value) => ({ value, label: value }))}
            onChange={(event) => setSelected(choices.find((of) => of.startsWith(`${event.target.value}-`)) ?? "")} />
          <SelectField label={t("report.month")} value={chosen} disabled={busy}
            choices={choices.filter((of) => of.startsWith(`${year}-`)).map((of) => ({ value: of,
              label: new Intl.DateTimeFormat("es-CO", { month: "long", timeZone: "UTC" }).format(new Date(`${of}-01T12:00:00Z`)),
            }))}
            onChange={(event) => setSelected(event.target.value)} />
          {error ? <p role="alert">{error}</p> : null}
          {busy ? <p role="status">{t("report.working")}</p> : null}
          <Button disabled={busy || !chosen} onClick={download}>{busy ? t("report.working") : t("report.download")}</Button>
          <Button variant="plain" disabled={busy} onClick={close}>{t("action.cancel")}</Button>
        </div>
      </BottomSheet>
    </div>
  );
}
