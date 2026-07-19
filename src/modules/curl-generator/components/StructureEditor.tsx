import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type {
  CurlRequest,
  FieldLocation,
  FieldSource,
  StructureField,
} from "../types/CurlGenerator";
import {
  DEFAULT_STRUCTURE,
  FIELD_SOURCE_OPTIONS,
} from "../types/CurlGenerator";

interface Props {
  request: CurlRequest;
  setRequest: (request: CurlRequest) => void;
}

function createFieldId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function StructureEditor({ request, setRequest }: Props) {
  const structureMode = request.structureMode ?? "FIXED";
  const structure =
    request.structure ??
    DEFAULT_STRUCTURE.map((field) => ({ ...field, id: createFieldId() }));

  const updateStructure = (nextStructure: StructureField[]) => {
    setRequest({
      ...request,
      structure: nextStructure,
    });
  };

  const setStructureMode = (mode: "FIXED" | "CUSTOM") => {
    if (mode === "CUSTOM" && !request.structure?.length) {
      setRequest({
        ...request,
        structureMode: mode,
        structure: DEFAULT_STRUCTURE.map((field) => ({
          ...field,
          id: createFieldId(),
        })),
      });
      return;
    }

    setRequest({
      ...request,
      structureMode: mode,
    });
  };

  const updateField = (
    index: number,
    patch: Partial<StructureField>,
  ) => {
    updateStructure(
      structure.map((field, idx) =>
        idx === index ? { ...field, ...patch } : field,
      ),
    );
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= structure.length) {
      return;
    }

    const nextStructure = [...structure];
    [nextStructure[index], nextStructure[targetIndex]] = [
      nextStructure[targetIndex],
      nextStructure[index],
    ];
    updateStructure(nextStructure);
  };

  const addField = () => {
    updateStructure([
      ...structure,
      {
        id: createFieldId(),
        source: "static",
        location: "body",
        name: "",
        enabled: true,
        staticValue: "",
      },
    ]);
  };

  const removeField = (index: number) => {
    updateStructure(structure.filter((_, idx) => idx !== index));
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950 sm:rounded-3xl sm:p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <span className="font-semibold text-black dark:!text-slate-300">
            Request Layout
          </span>
          <p className="mt-1 text-xs text-black dark:!text-slate-400">
            Control where each value goes and what it is called. Disable a field
            to omit it entirely.
          </p>
        </div>

        <div className="inline-flex w-full rounded-full border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900 sm:w-auto">
          <button
            type="button"
            onClick={() => setStructureMode("FIXED")}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:flex-none sm:py-1 ${
              structureMode === "FIXED"
                ? "bg-indigo-600 text-white"
                : "text-slate-500 hover:text-slate-200"
            }`}
          >
            Fixed
          </button>
          <button
            type="button"
            onClick={() => setStructureMode("CUSTOM")}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:flex-none sm:py-1 ${
              structureMode === "CUSTOM"
                ? "bg-indigo-600 text-white"
                : "text-slate-500 hover:text-slate-200"
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {structureMode === "FIXED" ? (
        <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 text-sm text-black dark:border-slate-800 dark:bg-slate-900/40 dark:!text-slate-300">
          <p className="font-medium">Default GEN5/GEN6 layout</p>
          <ul className="mt-2 space-y-1 text-xs text-black dark:!text-slate-400">
            <li>Header: AccessToken</li>
            <li>Body: REQUEST_REFERENCE_NUMBER, REQUEST, DIGI_SIGN</li>
          </ul>
        </div>
      ) : (
        <div className="space-y-3">
          {structure.map((field, index) => (
            <div
              key={field.id}
              className="rounded-2xl border border-slate-200 bg-white/60 p-3 dark:border-slate-800 dark:bg-slate-900/40 sm:p-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[auto_1fr_1fr_1fr_auto]">
                <label className="flex items-center gap-2 text-xs text-black dark:!text-slate-300 sm:col-span-2 xl:col-span-1">
                  <input
                    type="checkbox"
                    checked={field.enabled}
                    onChange={(e) =>
                      updateField(index, { enabled: e.target.checked })
                    }
                  />
                  Enabled
                </label>

                <label className="flex flex-col gap-1 text-xs text-black dark:!text-slate-300">
                  Source
                  <select
                    value={field.source}
                    onChange={(e) =>
                      updateField(index, {
                        source: e.target.value as FieldSource,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-black dark:border-slate-800 dark:bg-slate-950 dark:!text-white"
                  >
                    {FIELD_SOURCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs text-black dark:!text-slate-300">
                  Location
                  <select
                    value={field.location}
                    onChange={(e) =>
                      updateField(index, {
                        location: e.target.value as FieldLocation,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-black dark:border-slate-800 dark:bg-slate-950 dark:!text-white"
                  >
                    <option value="header">Header</option>
                    <option value="body">Body</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs text-black dark:!text-slate-300">
                  Name
                  <input
                    value={field.name}
                    onChange={(e) =>
                      updateField(index, { name: e.target.value })
                    }
                    placeholder={field.location === "header" ? "SecretKey" : "REQUEST"}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-black dark:border-slate-800 dark:bg-slate-950 dark:!text-white"
                  />
                </label>

                <div className="flex items-center justify-end gap-2 sm:col-span-2 xl:col-span-1 xl:justify-end">
                  <button
                    type="button"
                    onClick={() => moveField(index, -1)}
                    disabled={index === 0}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 disabled:opacity-40 dark:border-slate-800"
                    aria-label="Move field up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveField(index, 1)}
                    disabled={index === structure.length - 1}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 disabled:opacity-40 dark:border-slate-800"
                    aria-label="Move field down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 dark:bg-slate-800"
                    aria-label="Remove field"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {field.source === "static" ? (
                <label className="mt-3 flex flex-col gap-1 text-xs text-black dark:!text-slate-300">
                  Static Value
                  <input
                    value={field.staticValue ?? ""}
                    onChange={(e) =>
                      updateField(index, { staticValue: e.target.value })
                    }
                    placeholder="Literal header/body value"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-black dark:border-slate-800 dark:bg-slate-950 dark:!text-white"
                  />
                </label>
              ) : null}
            </div>
          ))}

          <button
            type="button"
            onClick={addField}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs text-black dark:border-slate-800 dark:!text-white sm:w-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Field
          </button>
        </div>
      )}
    </div>
  );
}
