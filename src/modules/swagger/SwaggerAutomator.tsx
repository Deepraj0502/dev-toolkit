// src/components/swagger/SwaggerAutomator.tsx
import { useState, useEffect } from 'react';
import { Play, RotateCcw, ShieldCheck } from 'lucide-react';
import { performRealValidation } from '../../utils/swaggerCore';
import type { ValidationIssue } from '../../utils/swaggerCore';

import FileDropzone from './FileDropzone';
import ValidationReport from './ValidationReport';
import OutputConsole from './OutputConsole';
import FieldEditorModal from './FieldEditorModal';

export default function SwaggerAutomator() {
  const [xsd, setXsd] = useState('');
  const [yaml, setYaml] = useState('');
  const [xsdName, setXsdName] = useState('');
  const [yamlName, setYamlName] = useState('');

  const [report, setReport] = useState<ValidationIssue[]>([]);
  const [outputYaml, setOutputYaml] = useState<string>('');
  const [fieldEdits, setFieldEdits] = useState<Record<string, any>>({});
  const [editingField, setEditingField] = useState<any | null>(null);

  // State to track user actions on undocumented fields
  const [removedFields, setRemovedFields] = useState<string[]>([]);
  const [ignoredFields, setIgnoredFields] = useState<string[]>([]);

  const handleRunValidation = () => {
    if (!xsd && !yaml) return;

    // Pass removedFields and ignoredFields into your engine
    const { issues, updatedYaml } = performRealValidation(
      xsd,
      yaml,
      fieldEdits,
      removedFields,
      ignoredFields
    );

    setReport(issues);
    setOutputYaml(updatedYaml);
  };

  const handleReset = () => {
    setXsd('');
    setYaml('');
    setXsdName('');
    setYamlName('');
    setReport([]);
    setOutputYaml('');
    setFieldEdits({});
    setRemovedFields([]);
    setIgnoredFields([]);
  };

  // Automatically re-run validation when any field edit, removal, or ignore happens
  useEffect(() => {
    if (xsd || yaml) {
      const { issues, updatedYaml } = performRealValidation(
        xsd,
        yaml,
        fieldEdits,
        removedFields,
        ignoredFields
      );
      setReport(issues);
      setOutputYaml(updatedYaml);
    }
  }, [fieldEdits, removedFields, ignoredFields]);

  const saveFieldEdit = (updatedField: any) => {
    setFieldEdits((prev) => ({ ...prev, [updatedField.name]: updatedField }));
    setEditingField(null);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-300">
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
              Swagger Schema Automator
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Drag & drop UAT schemas to validate and patch missing OpenAPI definitions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto w-full sm:w-auto">
          <button
            onClick={handleReset}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>

          <button
            onClick={handleRunValidation}
            className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Play size={14} className="fill-current" />
            <span>Compare & Validate</span>
          </button>
        </div>
      </div>

      {/* Main Responsive Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Dropzones (Spans 6 cols on Desktop) */}
        <div className="lg:col-span-6 flex flex-col gap-6 bg-white dark:bg-slate-900/60 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <FileDropzone
            label="UAT Validation Schema (XSD)"
            accept=".xsd,.xml"
            value={xsd}
            fileName={xsdName}
            placeholder="Drag & drop UAT validation file here, or paste raw XSD XML content..."
            onFileSelect={(content, name) => {
              setXsd(content);
              setXsdName(name);
            }}
            onChangeText={setXsd}
            onClear={() => {
              setXsd('');
              setXsdName('');
            }}
          />

          <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-4">
            <FileDropzone
              label="Existing Dev Spec (YAML / JSON)"
              accept=".yaml,.yml,.json"
              value={yaml}
              fileName={yamlName}
              placeholder="Drag & drop Dev OpenAPI file here, or paste existing Swagger YAML..."
              onFileSelect={(content, name) => {
                setYaml(content);
                setYamlName(name);
              }}
              onChangeText={setYaml}
              onClear={() => {
                setYaml('');
                setYamlName('');
              }}
            />
          </div>
        </div>

        {/* Right Column: Reports & Code Output (Spans 6 cols on Desktop) */}
        <div className="lg:col-span-6 flex flex-col gap-6 w-full">
          <div className="w-full">
            <ValidationReport
              report={report}
              fieldEdits={fieldEdits}
              onEditField={(field) => setEditingField(field)}
              onRemoveField={(fieldName) =>
                setRemovedFields((prev) => [...new Set([...prev, fieldName])])
              }
              onIgnoreField={(fieldName) =>
                setIgnoredFields((prev) => [...new Set([...prev, fieldName])])
              }
            />
          </div>

          <div className="w-full">
            <OutputConsole outputYaml={outputYaml} />
          </div>
        </div>
      </div>

      {/* Pop-up Field Modification Modal */}
      <FieldEditorModal
        field={editingField}
        onClose={() => setEditingField(null)}
        onSave={saveFieldEdit}
        onChange={setEditingField}
      />
    </div>
  );
}