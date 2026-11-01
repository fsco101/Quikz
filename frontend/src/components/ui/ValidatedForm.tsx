import React, { useId, useLayoutEffect, useRef, useState } from "react";

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type Issue = { control: Control; message: string; id: string; label: string };

export function fileError(file: File, maxBytes: number, accept = ""): string {
  if (!file.size) return "Choose a nonempty file.";
  if (file.size > maxBytes) return `Choose a file up to ${maxBytes >= 1024 * 1024 ? `${maxBytes / (1024 * 1024)} MB` : `${maxBytes / 1024} KB`}.`;
  const types = accept.split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  if (types.length && !types.some(type => type.startsWith(".") ? file.name.toLowerCase().endsWith(type) : type.endsWith("/*") ? file.type.startsWith(type.slice(0, -1)) : file.type === type))
    return `Choose a supported file (${accept}).`;
  return "";
}

function fieldError(control: Control): string {
  if (control.disabled || !control.willValidate) return "";
  const value = control.value;
  const isInput = control instanceof HTMLInputElement;
  if (control.validity.valueMissing || (control.required && (!isInput || !["password", "checkbox", "radio", "file"].includes(control.type)) && !value.trim()))
    return isInput && control.type === "checkbox" ? "Confirm this before continuing." : "This field is required.";
  if (isInput && control.type === "file") {
    const file = control.files?.[0];
    if (file) return fileError(file, Number(control.dataset.maxBytes || 25 * 1024 * 1024), control.accept);
  }
  if (control.dataset.error) return control.dataset.error;
  if (!value) return "";
  if (isInput && control.type === "email" && !/^\S+@\S+\.\S+$/.test(value.trim())) return "Enter a valid email address.";
  if (control.dataset.validate === "username" && !/^[a-zA-Z0-9_.-]{3,40}$/.test(value.trim())) return "Use 3–40 letters, numbers, dots, underscores or hyphens.";
  if (isInput && control.autocomplete === "new-password" && !value.trim()) return "Include at least one non-space character in your password.";
  if (isInput && control.autocomplete === "new-password" && new TextEncoder().encode(value).length > 72) return "Use a password of at most 72 bytes (some characters use more than one byte).";
  if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
    if (control.minLength > 0 && value.length < control.minLength) return `Enter at least ${control.minLength} characters.`;
    if (control.maxLength >= 0 && value.length > control.maxLength) return `Use at most ${control.maxLength} characters.`;
  }
  if (control.validity.rangeUnderflow) return `Enter a value of at least ${(control as HTMLInputElement).min}.`;
  if (control.validity.rangeOverflow) return `Enter a value of at most ${(control as HTMLInputElement).max}.`;
  if (control.validity.stepMismatch) return "Enter a valid increment (a whole number for counts).";
  if (!control.validity.valid) return control.validationMessage || "Check this field.";
  return "";
}

/** Shared validation for submit forms and scoped preview actions within a form. */
export function ValidatedForm({ children, onSubmit, ...props }: React.FormHTMLAttributes<HTMLFormElement>) {
  const prefix = useId();
  const form = useRef<HTMLFormElement>(null);
  const touched = useRef(new Set<Control>());
  const [issues, setIssues] = useState<Issue[]>([]);
  function validate(all = false, scope = "") {
    if (!form.current) return true;
    const controls = Array.from(form.current.querySelectorAll<Control>("input, textarea, select"));
    touched.current = new Set([...touched.current].filter(control => controls.includes(control)));
    const next: Issue[] = [];
    controls.forEach((control, index) => {
      if (all && (control.dataset.validationScope || "") === scope) touched.current.add(control);
      if (!touched.current.has(control)) return;
      const message = fieldError(control);
      const id = `${prefix}-error-${index}`;
      const descriptions = (control.getAttribute("aria-describedby") || "").split(/\s+/).filter(item => item && !item.startsWith(`${prefix}-error-`));
      if (message) {
        descriptions.push(id);
        control.setAttribute("aria-invalid", "true");
        const label = control.getAttribute("aria-label") || control.labels?.[0]?.textContent?.trim().split("\n")[0] || control.getAttribute("placeholder") || "Field";
        next.push({ control, id, label, message });
      } else control.removeAttribute("aria-invalid");
      if (descriptions.length) control.setAttribute("aria-describedby", descriptions.join(" "));
      else control.removeAttribute("aria-describedby");
    });
    if (issues.length !== next.length || next.some((issue, index) => issue.control !== issues[index]?.control || issue.message !== issues[index]?.message || issue.id !== issues[index]?.id)) setIssues(next);
    const blocking = next.filter(issue => (issue.control.dataset.validationScope || "") === scope);
    if (all && blocking.length) blocking[0].control.focus();
    return !blocking.length;
  }
  useLayoutEffect(() => { validate(); });
  return <form {...props} ref={form} noValidate
    onBlurCapture={event => {
      // Let submit/preview finish its click before messages resize a centered modal.
      const destination = event.relatedTarget;
      if (destination instanceof HTMLButtonElement && (destination.type === "submit" || destination.hasAttribute("data-validate-scope"))) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) touched.current.add(event.target);
      validate();
    }}
    onClickCapture={event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-validate-scope]");
      if (button && !validate(true, button.dataset.validateScope)) {
        event.preventDefault(); event.stopPropagation();
      }
    }}
    onSubmit={event => {
      if (!validate(true)) { event.preventDefault(); return; }
      onSubmit?.(event);
    }}>
    {children}
    {issues.length > 0 && <div className="form-validation-errors" role="alert">
      <p>Please check the following fields:</p>
      <ul>{issues.map(issue => <li key={issue.id} id={issue.id}><button type="button" onClick={() => issue.control.focus()}><strong>{issue.label}:</strong> {issue.message}</button></li>)}</ul>
    </div>}
  </form>;
}
