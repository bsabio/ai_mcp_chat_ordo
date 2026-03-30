/**
 * GET-based filter form for admin Browse pages.
 * Renders search inputs, selects, and status toggles. Submits as URL params.
 */

export interface FilterFieldConfig {
  /** Field key used as the form `name` attribute for URL params */
  name?: string;
  /** Alternative to `name`; one of `id` or `name` is required */
  id?: string;
  label: string;
  type: "search" | "select" | "toggle" | "date";
  options?: { value: string; label: string }[];
  placeholder?: string;
  description?: string;
  defaultValue?: string;
}

interface AdminBrowseFiltersProps {
  fields: FilterFieldConfig[];
  values?: Record<string, string>;
  hiddenFields?: Record<string, string>;
}

export function AdminBrowseFilters({ fields, values = {}, hiddenFields }: AdminBrowseFiltersProps) {
  return (
    <form
      method="get"
      className="flex flex-wrap items-end gap-(--space-3)"
      data-admin-browse-filters="true"
    >
      {hiddenFields && Object.entries(hiddenFields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {fields.map((field) => {
        const fieldKey = field.id ?? field.name ?? "";
        const fieldName = field.name ?? field.id ?? "";

        if (field.type === "search") {
          return (
            <div key={fieldKey} className="flex flex-col gap-(--space-1)">
              <label className="text-xs font-(--font-label) tracking-wide text-foreground/60">
                {field.label}
                <input
                  type="search"
                  name={fieldName}
                  defaultValue={values[fieldKey] ?? ""}
                  placeholder={field.placeholder ?? `Search ${field.label.toLowerCase()}…`}
                  aria-label={field.label}
                  className="mt-1 h-9 rounded-lg border border-foreground/12 bg-surface px-3 text-sm text-foreground outline-none transition focus:border-foreground/25 focus:ring-1 focus:ring-foreground/10"
                />
              </label>
              {field.description && (
                <p className="text-xs text-foreground/45">{field.description}</p>
              )}
            </div>
          );
        }

        if (field.type === "select") {
          return (
            <div key={fieldKey} className="flex flex-col gap-(--space-1)">
              <label className="text-xs font-(--font-label) tracking-wide text-foreground/60">
                {field.label}
                <select
                  name={fieldName}
                  defaultValue={values[fieldKey] ?? ""}
                  aria-label={field.label}
                  className="mt-1 h-9 rounded-lg border border-foreground/12 bg-surface px-3 text-sm text-foreground outline-none transition focus:border-foreground/25 focus:ring-1 focus:ring-foreground/10"
                >
                  <option value="">All</option>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
              {field.description && (
                <p className="text-xs text-foreground/45">{field.description}</p>
              )}
            </div>
          );
        }

        if (field.type === "toggle" && !field.options) {
          return (
            <div key={fieldKey} className="flex flex-col gap-(--space-1)">
              <label className="flex items-center gap-2 text-xs font-(--font-label) tracking-wide text-foreground/60">
                <input
                  type="checkbox"
                  id={fieldKey}
                  name={fieldName}
                  defaultChecked={(values[fieldKey] ?? field.defaultValue) === "true"}
                  onChange={(e) => {
                    const form = e.currentTarget.closest("form");
                    if (form) form.requestSubmit();
                  }}
                  aria-label={field.label}
                  className="accent-foreground"
                />
                {field.label}
              </label>
              {field.description && (
                <p className="text-xs text-foreground/45">{field.description}</p>
              )}
            </div>
          );
        }

        if (field.type === "toggle" && field.options) {
          return (
            <div key={fieldKey} className="flex flex-col gap-(--space-1)">
              <fieldset className="flex flex-col gap-(--space-1)">
                <legend className="text-xs font-(--font-label) tracking-wide text-foreground/60">{field.label}</legend>
                <div className="flex gap-(--space-1)">
                  {field.options.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-center rounded-full border px-3 py-1 text-xs transition ${
                        values[fieldKey] === opt.value
                          ? "border-foreground/25 bg-foreground/8 text-foreground"
                          : "border-foreground/8 text-foreground/50 hover:border-foreground/16"
                      }`}
                    >
                      <input
                        type="radio"
                        name={fieldName}
                      value={opt.value}
                      defaultChecked={values[fieldKey] === opt.value}
                      className="sr-only"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>
            {field.description && (
              <p className="text-xs text-foreground/45">{field.description}</p>
            )}
          </div>
          );
        }

        if (field.type === "date") {
          return (
            <div key={fieldKey} className="flex flex-col gap-(--space-1)">
              <label className="text-xs font-(--font-label) tracking-wide text-foreground/60">
                {field.label}
                <input
                  type="date"
                  name={fieldName}
                  defaultValue={values[fieldKey] ?? ""}
                  aria-label={field.label}
                  className="mt-1 h-9 rounded-lg border border-foreground/12 bg-surface px-3 text-sm text-foreground outline-none transition focus:border-foreground/25 focus:ring-1 focus:ring-foreground/10"
                />
              </label>
              {field.description && (
                <p className="text-xs text-foreground/45">{field.description}</p>
              )}
            </div>
          );
        }

        return null;
      })}
      <button
        type="submit"
        className="h-9 rounded-lg bg-foreground/8 px-4 text-sm font-medium text-foreground transition hover:bg-foreground/14 active:scale-95"
      >
        Filter
      </button>
    </form>
  );
}
