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
      className="admin-filter-bar"
      data-admin-browse-filters="true"
    >
      {hiddenFields && Object.entries(hiddenFields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {fields.map((field) => {
        const fieldKey = field.id ?? field.name ?? "";
        const fieldName = field.name ?? field.id ?? "";
        const inputId = `admin-filter-${fieldKey}`;

        if (field.type === "search") {
          return (
            <div key={fieldKey} className="admin-filter-field" data-admin-filter-field={fieldName}>
              <label htmlFor={inputId} className="admin-filter-label">{field.label}</label>
              <input
                id={inputId}
                type="search"
                name={fieldName}
                defaultValue={values[fieldKey] ?? ""}
                placeholder={field.placeholder ?? `Search ${field.label.toLowerCase()}…`}
                aria-label={field.label}
                className="admin-filter-control"
              />
              {field.description && (
                <p className="admin-filter-description">{field.description}</p>
              )}
            </div>
          );
        }

        if (field.type === "select") {
          return (
            <div key={fieldKey} className="admin-filter-field" data-admin-filter-field={fieldName}>
              <label htmlFor={inputId} className="admin-filter-label">{field.label}</label>
              <select
                id={inputId}
                name={fieldName}
                defaultValue={values[fieldKey] ?? ""}
                aria-label={field.label}
                className="admin-filter-control"
              >
                <option value="">All</option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {field.description && (
                <p className="admin-filter-description">{field.description}</p>
              )}
            </div>
          );
        }

        if (field.type === "toggle" && !field.options) {
          return (
            <div key={fieldKey} className="admin-filter-field" data-admin-filter-field={fieldName}>
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
                <p className="admin-filter-description">{field.description}</p>
              )}
            </div>
          );
        }

        if (field.type === "toggle" && field.options) {
          return (
            <div key={fieldKey} className="admin-filter-field" data-admin-filter-field={fieldName}>
              <fieldset className="flex flex-col gap-(--space-1)">
                <legend className="admin-filter-label">{field.label}</legend>
                <div className="admin-pill-nav">
                  {field.options.map((opt) => (
                    <label
                      key={opt.value}
                      className={`admin-pill-nav-link flex cursor-pointer items-center rounded-full border px-3 py-1 text-xs transition ${
                        values[fieldKey] === opt.value
                          ? "admin-pill-nav-link-active"
                          : "admin-pill-nav-link-idle"
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
                <p className="admin-filter-description">{field.description}</p>
              )}
            </div>
          );
        }

        if (field.type === "date") {
          return (
            <div key={fieldKey} className="admin-filter-field" data-admin-filter-field={fieldName}>
              <label htmlFor={inputId} className="admin-filter-label">{field.label}</label>
              <input
                id={inputId}
                type="date"
                name={fieldName}
                defaultValue={values[fieldKey] ?? ""}
                aria-label={field.label}
                className="admin-filter-control"
              />
              {field.description && (
                <p className="admin-filter-description">{field.description}</p>
              )}
            </div>
          );
        }

        return null;
      })}
      <div className="admin-filter-actions">
        <button type="submit" className="admin-filter-submit">
          Filter
        </button>
      </div>
    </form>
  );
}
