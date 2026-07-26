// src/utils/swaggerCore.ts

const XSD_NS = 'http://www.w3.org/2001/XMLSchema';

export interface ValidationIssue {
  type: 'ok' | 'warn' | 'err';
  title: string;
  sub: string;
  missingFields?: any[];
  undocumentedField?: { name: string; defName: string };
}

export interface XsdField {
  name: string;
  xsdType: string;
  oapiType: string;
  format: string | null;
  required: boolean;
  minOccurs: string;
  maxOccurs: string;
  cardinality: string;
  isArray: boolean;
  description: string;
  length: string;
  minLength?: string;
  pattern?: string;
  direction: 'TX' | 'RX';
}

export interface ValidationResult {
  issues: ValidationIssue[];
  updatedYaml: string;
  parsedXsdFields: XsdField[];
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function localName(qname: string) {
  return qname.includes(':') ? qname.split(':').pop()! : qname;
}

const ENVELOPE_ONLY_FIELDS = new Set(['REQUEST_REFERENCE_NUMBER']);

const STANDARD_FIELD_TEXT: Record<string, { description?: string; enum?: string[] }> = {
  REQUEST_REFERENCE_NUMBER: {
    description:
      'Unique Request Reference Number should be of format SBIXXYYDDDHHmmssSSSNNNNNN First 3 alphabets will always be SBI, XX will signify Channel Identifier (eg: LT for YONO channel),YYDDD will signify the Julian Date (eg: 26-02-2020 will be represented as 20057),HHmmssSSS will signify the current time in hours, minutes, second and milisecond,NNNNNN will signify running sequence number.',
  },
  ERROR_CODE: {
    enum: [
      'SI002:SI510|EIS APPLICATION INACTIVE',
      'SI569:BRANCH/TELLER MISSING',
      'SI570:BIT MAPPING NOT CONFIGURED',
      'SI014:SI500|EIS APPLICATION TIMEOUT',
      'SI011:SI520|INCORRECT DATA IN <TAG_NAME>',
      'SI011:SI520|MISSING FIELD <TAG_NAME>',
      'SI011:SI520|EXCESS FIELD PROVIDED <TAG_NAME>',
      'SI011:SI520|PARSING EXCEPTION',
      'SI001:SI530|INCORRECT REQUEST FORMATION',
      'SI001:SI530|DATA PROCESSING FAILED',
      'SI001:SI599|UNABLE TO PROCESS DUE TO TECHNICAL ERROR',
      'SI007:SI550|INTERNAL ERROR',
      'SI017:SI551|DB INTERNAL ERROR',
      'SI094:REFERENCE NUMBER NOT UNIQUE',
      'SI095:REFERENCE NUMBER NOT OF 25 CHAR',
      'SI096:REFERENCE NUMBER AND SOURCE ID MISMATCH',
      'SI097:REFERENCE NUMBER IS NOT OF FORMAT SBIXXX',
      'SI001:SI699|Any other unhandled exception received by EIS during service call with downstream',
      '<>002:<> will contain 2 character destination indicator followed by 002,indicates error being received from downstream application',
      '<>014:<> will contain 2 character destination indicator followed by 014.indicates timeout',
    ],
  },
};

export function estimateLengthFromPattern(pattern: string): { min: number; max: number; approximate: boolean } {
  const quantifiers = [...pattern.matchAll(/\{(\d+),?(\d+)?\}/g)];
  if (quantifiers.length === 0) return { min: 0, max: 0, approximate: true };
  if (quantifiers.length === 1) {
    const [, minStr, maxStr] = quantifiers[0];
    const min = parseInt(minStr, 10);
    const max = maxStr ? parseInt(maxStr, 10) : min;
    return { min, max, approximate: false };
  }
  let min = 0, max = 0;
  for (const q of quantifiers) {
    const mn = parseInt(q[1], 10);
    const mx = q[2] ? parseInt(q[2], 10) : mn;
    min += mn; max += mx;
  }
  return { min, max, approximate: true };
}

function isLeafFieldElement(el: Element): boolean {
  for (let i = 0; i < el.children.length; i++) {
    const local = localName(el.children[i].nodeName);
    if (local === 'complexType') return false;
    if (local === 'simpleType') return true;
  }
  return el.children.length === 0;
}

export function parseXSD(xsd: string): XsdField[] {
  if (!xsd || !xsd.trim()) return [];
  let doc: Document | null = null;
  try {
    doc = new DOMParser().parseFromString(xsd, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) doc = null;
  } catch {
    doc = null;
  }
  if (!doc) return parseXSDTokenizer(xsd);

  const fields: XsdField[] = [];
  const seen = new Set<string>();
  const elements = doc.getElementsByTagNameNS(XSD_NS, 'element');

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const name = el.getAttribute('name');
    if (!name || seen.has(name) || ENVELOPE_ONLY_FIELDS.has(name)) continue;
    if (!isLeafFieldElement(el)) continue;
    seen.add(name);

    const typeAttr = el.getAttribute('type') || 'xs:string';
    const min = el.hasAttribute('minOccurs') ? el.getAttribute('minOccurs')! : '1';
    const maxRaw = el.hasAttribute('maxOccurs') ? el.getAttribute('maxOccurs')! : '1';
    const max = maxRaw === 'unbounded' ? 'unbounded' : maxRaw;

    let description = '';
    const docEl = el.getElementsByTagNameNS(XSD_NS, 'documentation')[0];
    if (docEl) description = (docEl.textContent || '').trim();

    let length = '';
    let minLength = '';
    let pattern = '';
    const restr = el.getElementsByTagNameNS(XSD_NS, 'restriction')[0];
    if (restr) {
      const ml = restr.getElementsByTagNameNS(XSD_NS, 'maxLength')[0];
      if (ml) length = ml.getAttribute('value') || '';
      const mnl = restr.getElementsByTagNameNS(XSD_NS, 'minLength')[0];
      if (mnl) minLength = mnl.getAttribute('value') || '';
      const pat = restr.getElementsByTagNameNS(XSD_NS, 'pattern')[0];
      if (pat) {
        pattern = pat.getAttribute('value') || '';
        if (!length) {
          const est = estimateLengthFromPattern(pattern);
          if (est.max > 0) length = String(est.max);
          if (!minLength && est.min > 0) minLength = String(est.min);
        }
      }
    }

    fields.push({
      name,
      xsdType: typeAttr,
      oapiType: xsdToOapi(typeAttr),
      format: xsdFormat(typeAttr),
      required: min !== '0',
      minOccurs: min,
      maxOccurs: max,
      cardinality: `${min},${max}`,
      isArray: max === 'unbounded' || parseInt(max || '1', 10) > 1,
      description,
      length,
      minLength,
      pattern,
      direction: xsdDirectionOfNode(el),
    });
  }

  return fields.length ? fields : parseXSDTokenizer(xsd);
}

export function parseXSDTokenizer(xsd: string): XsdField[] {
  const tagRe = /<(\/?)([\w.\-]+(?::[\w.\-]+)?)((?:\s+[\w.\-]+(?::[\w.\-]+)?\s*=\s*"[^"]*")*)\s*(\/?)\s*>/g;
  function attrsToObj(s: string) {
    const o: any = {};
    const ar = /([\w.\-]+(?::[\w.\-]+)?)\s*=\s*"([^"]*)"/g;
    let am;
    while ((am = ar.exec(s)) !== null) o[am[1].includes(':') ? am[1].split(':').pop()! : am[1]] = am[2];
    return o;
  }
  const fields: XsdField[] = [];
  const byName = new Map<string, XsdField>();
  const stack: any[] = [];

  function nearestNamedFieldFrame() {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].attrs.name) return stack[i];
    }
    return null;
  }
  function dirFromStack() {
    for (let i = stack.length - 1; i >= 0; i--) {
      const nm = stack[i].attrs.name;
      if (nm) {
        if (/request|req\b|_req$|\btx\b/i.test(nm)) return 'TX';
        if (/response|resp\b|_resp$|\brx\b/i.test(nm)) return 'RX';
      }
    }
    return 'TX';
  }

  let m;
  while ((m = tagRe.exec(xsd)) !== null) {
    const closing = m[1] === '/';
    const local = localName(m[2]);
    const attrs = attrsToObj(m[3]);
    const selfClosing = !!m[4];

    if (!closing && (local === 'element' || local === 'attribute') && attrs.name && stack.length > 0) {
      const name = attrs.name;
      if (!ENVELOPE_ONLY_FIELDS.has(name) && !byName.has(name)) {
        const type = attrs.type || 'xs:string';
        const min = attrs.minOccurs !== undefined ? attrs.minOccurs : '1';
        const maxRaw = attrs.maxOccurs !== undefined ? attrs.maxOccurs : '1';
        const max = maxRaw === 'unbounded' ? 'unbounded' : maxRaw;
        const field: XsdField = {
          name, xsdType: type, oapiType: xsdToOapi(type), format: xsdFormat(type),
          required: min !== '0', minOccurs: min, maxOccurs: max, cardinality: `${min},${max}`,
          isArray: max === 'unbounded' || parseInt(max || '1', 10) > 1,
          description: '', length: attrs.maxLength || '', pattern: '', direction: dirFromStack(),
        };
        fields.push(field);
        byName.set(name, field);
      }
    }

    if (!closing && local === 'pattern' && attrs.value) {
      const frame = nearestNamedFieldFrame();
      const field = frame && byName.get(frame.attrs.name);
      if (field && !field.pattern) {
        field.pattern = attrs.value;
        if (!field.length) {
          const est = estimateLengthFromPattern(attrs.value);
          if (est.max > 0) field.length = String(est.max);
        }
      }
    }

    if (!closing && local === 'maxLength' && attrs.value) {
      const frame = nearestNamedFieldFrame();
      const field = frame && byName.get(frame.attrs.name);
      if (field) field.length = attrs.value;
    }

    if (!closing && !selfClosing) stack.push({ local, attrs });
    else if (closing) stack.pop();
  }
  return fields;
}

interface TargetDefinition {
  name: string;
  properties: Record<string, any>;
  required: string[];
}

function findBestMatchingDefinition(spec: any, xsdFieldNames: string[]): TargetDefinition | null {
  const defs = spec?.definitions || spec?.components?.schemas;
  if (!defs) return null;
  const wanted = new Set(xsdFieldNames.map((n) => n.toLowerCase()));
  let best: (TargetDefinition & { score: number }) | null = null;

  for (const defName of Object.keys(defs)) {
    const props = defs[defName]?.properties;
    if (!props) continue;
    const propNames = Object.keys(props).map((p) => p.toLowerCase());
    const score = propNames.filter((p) => wanted.has(p)).length;
    if (score > 0 && (!best || score > best.score)) {
      best = { name: defName, properties: props, required: defs[defName]?.required || [], score };
    }
  }
  return best ? { name: best.name, properties: best.properties, required: best.required } : null;
}

function extractBalancedBlock(text: string, openBraceIndex: number): { start: number; end: number } | null {
  if (text[openBraceIndex] !== '{') return null;
  let depth = 0;
  for (let i = openBraceIndex; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return { start: openBraceIndex, end: i + 1 };
    }
  }
  return null;
}

function extractBalancedArray(text: string, openBracketIndex: number): { start: number; end: number } | null {
  if (text[openBracketIndex] !== '[') return null;
  let depth = 0;
  for (let i = openBracketIndex; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') {
      depth--;
      if (depth === 0) return { start: openBracketIndex, end: i + 1 };
    }
  }
  return null;
}

function locateDefinitionBlock(text: string, defName: string): { start: number; end: number } | null {
  const re = new RegExp(`"${escapeRegExp(defName)}"\\s*:\\s*\\{`);
  const m = re.exec(text);
  if (!m) return null;
  return extractBalancedBlock(text, m.index + m[0].length - 1);
}

function locatePropertiesBlock(text: string, defName: string): { start: number; end: number } | null {
  const defBlock = locateDefinitionBlock(text, defName);
  if (!defBlock) return null;
  const inner = text.slice(defBlock.start, defBlock.end);
  const pm = /"properties"\s*:\s*\{/.exec(inner);
  if (!pm) return null;
  return extractBalancedBlock(text, defBlock.start + pm.index + pm[0].length - 1);
}

function locatePropertyBlock(text: string, defName: string, propName: string): { start: number; end: number } | null {
  const propsBlock = locatePropertiesBlock(text, defName);
  if (!propsBlock) return null;
  const inner = text.slice(propsBlock.start, propsBlock.end);
  const pm = new RegExp(`"${escapeRegExp(propName)}"\\s*:\\s*\\{`).exec(inner);
  if (!pm) return null;
  return extractBalancedBlock(text, propsBlock.start + pm.index + pm[0].length - 1);
}

function locateStringValue(text: string, blockStart: number, blockEnd: number, key: string): { start: number; end: number } | null {
  const inner = text.slice(blockStart, blockEnd);
  const m = new RegExp(`"${escapeRegExp(key)}"\\s*:\\s*"`).exec(inner);
  if (!m) return null;
  const valStart = blockStart + m.index + m[0].length;
  let i = valStart;
  while (i < blockEnd) {
    if (text[i] === '\\') { i += 2; continue; }
    if (text[i] === '"') break;
    i++;
  }
  return { start: valStart, end: i };
}

function setStringField(text: string, blockStart: number, blockEnd: number, key: string, value: string): string {
  const escaped = JSON.stringify(value).slice(1, -1);
  const existing = locateStringValue(text, blockStart, blockEnd, key);
  if (existing) {
    return text.slice(0, existing.start) + escaped + text.slice(existing.end);
  }
  const insertion = `\n      "${key}": "${escaped}",`;
  return text.slice(0, blockStart + 1) + insertion + text.slice(blockStart + 1);
}

function locateArrayValue(text: string, blockStart: number, blockEnd: number, key: string): { start: number; end: number } | null {
  const inner = text.slice(blockStart, blockEnd);
  const m = new RegExp(`"${escapeRegExp(key)}"\\s*:\\s*\\[`).exec(inner);
  if (!m) return null;
  return extractBalancedArray(text, blockStart + m.index + m[0].length - 1);
}

function setArrayField(text: string, blockStart: number, blockEnd: number, key: string, values: string[]): string {
  const formatted = `[ ${values.map((v) => JSON.stringify(v)).join(', ')} ]`;
  const existing = locateArrayValue(text, blockStart, blockEnd, key);
  if (existing) {
    return text.slice(0, existing.start) + formatted + text.slice(existing.end);
  }
  const insertion = `\n      "${key}": ${formatted},`;
  return text.slice(0, blockStart + 1) + insertion + text.slice(blockStart + 1);
}

function checkStandardFields(text: string, spec: any, changes: ValidationIssue[]): string {
  const defs = spec?.definitions || spec?.components?.schemas;
  if (!defs) return text;
  let out = text;

  for (const defName of Object.keys(defs)) {
    const props = defs[defName]?.properties;
    if (!props) continue;

    for (const propName of Object.keys(props)) {
      const rule = STANDARD_FIELD_TEXT[propName];
      if (!rule) continue;

      if (rule.description !== undefined) {
        const current = props[propName]?.description;
        if (current !== rule.description) {
          const block = locatePropertyBlock(out, defName, propName);
          if (block) {
            out = setStringField(out, block.start, block.end, 'description', rule.description);
            changes.push({
              type: 'ok',
              title: `Auto-Fixed description: "${propName}" (${defName})`,
              sub: current === undefined
                ? `Injected standard description for "${propName}" in "${defName}".`
                : `Corrected non-standard description for "${propName}" in "${defName}".`,
            });
          }
        }
      }

      if (rule.enum !== undefined) {
        const currentEnum: string[] | undefined = props[propName]?.enum;
        const matches =
          Array.isArray(currentEnum) &&
          currentEnum.length === rule.enum.length &&
          currentEnum.every((v, i) => v === rule.enum![i]);
        if (!matches) {
          const block = locatePropertyBlock(out, defName, propName);
          if (block) {
            out = setArrayField(out, block.start, block.end, 'enum', rule.enum);
            changes.push({
              type: 'ok',
              title: `Auto-Fixed enum: "${propName}" (${defName})`,
              sub: currentEnum === undefined
                ? `Injected standard error-code enum for "${propName}" in "${defName}".`
                : `Corrected non-standard enum values for "${propName}" in "${defName}".`,
            });
          }
        }
      }
    }
  }
  return out;
}

function injectMaxLength(text: string, defName: string, propName: string, maxLength: number): string {
  const block = locatePropertyBlock(text, defName, propName);
  if (!block) return text;
  const body = text.slice(block.start, block.end);
  const patched = body.slice(0, 1) + `\n      "maxLength": ${maxLength},` + body.slice(1);
  return text.slice(0, block.start) + patched + text.slice(block.end);
}

function patchMaxLength(text: string, defName: string, propName: string, oldVal: number, newVal: number): string {
  const block = locatePropertyBlock(text, defName, propName);
  if (!block) return text;
  const body = text.slice(block.start, block.end);
  const patchedBody = body.replace(new RegExp(`("maxLength"\\s*:\\s*)${oldVal}\\b`), `$1${newVal}`);
  return text.slice(0, block.start) + patchedBody + text.slice(block.end);
}

/**
 * Correctly locates the FULL `"KEY": { ... }` line inside properties and cleanly removes it
 * along with trailing commas so JSON validation does not break.
 */
function removePropertyFromSpec(text: string, defName: string, propName: string): string {
  const propsBlock = locatePropertiesBlock(text, defName);
  if (!propsBlock) return text;

  const inner = text.slice(propsBlock.start, propsBlock.end);
  const regex = new RegExp(`"${escapeRegExp(propName)}"\\s*:\\s*\\{`);
  const match = regex.exec(inner);
  if (!match) return text;

  const keyStart = propsBlock.start + match.index;
  const openBraceIndex = propsBlock.start + match.index + match[0].length - 1;
  const valueBlock = extractBalancedBlock(text, openBraceIndex);
  if (!valueBlock) return text;

  let start = keyStart;
  while (start > 0 && (text[start - 1] === ' ' || text[start - 1] === '\t')) {
    start--;
  }

  let end = valueBlock.end;
  if (text[end] === ',') end++;
  while (end < text.length && (text[end] === ' ' || text[end] === '\t' || text[end] === '\r')) {
    end++;
  }
  if (text[end] === '\n') end++;

  let out = text.slice(0, start) + text.slice(end);
  out = out.replace(/,\s*(\}\s*)$/m, '$1');
  return out;
}

function locateRequiredArrayBlock(text: string, defName: string): { start: number; end: number } | null {
  const defBlock = locateDefinitionBlock(text, defName);
  if (!defBlock) return null;
  const inner = text.slice(defBlock.start, defBlock.end);
  const m = /"required"\s*:\s*\[/.exec(inner);
  if (!m) return null;
  const openBracketIndex = defBlock.start + m.index + m[0].length - 1;
  return extractBalancedArray(text, openBracketIndex);
}

function addToRequired(text: string, defName: string, fieldName: string): string {
  const arr = locateRequiredArrayBlock(text, defName);
  if (arr) {
    const body = text.slice(arr.start, arr.end);
    if (new RegExp(`"${escapeRegExp(fieldName)}"`).test(body)) return text;
    const isEmpty = /^\[\s*\]$/.test(body.trim());
    const insertPos = arr.start + 1;
    const insertion = isEmpty ? `"${fieldName}"` : ` "${fieldName}",`;
    return text.slice(0, insertPos) + insertion + text.slice(insertPos);
  }
  const propsBlock = locatePropertiesBlock(text, defName);
  if (!propsBlock) return text;
  const insertion = `,\n    "required" : [ "${fieldName}" ]`;
  return text.slice(0, propsBlock.end) + insertion + text.slice(propsBlock.end);
}

function removeFromRequired(text: string, defName: string, fieldName: string): string {
  const arr = locateRequiredArrayBlock(text, defName);
  if (!arr) return text;
  const body = text.slice(arr.start, arr.end);
  const esc = escapeRegExp(fieldName);
  let patchedBody = body;
  const trailingComma = new RegExp(`"${esc}"\\s*,\\s*`).exec(body);
  const leadingComma = new RegExp(`,\\s*"${esc}"`).exec(body);
  if (trailingComma) {
    patchedBody = body.replace(trailingComma[0], '');
  } else if (leadingComma) {
    patchedBody = body.replace(leadingComma[0], '');
  } else {
    patchedBody = body.replace(new RegExp(`"${esc}"`), '');
  }
  return text.slice(0, arr.start) + patchedBody + text.slice(arr.end);
}

function injectMissingFields(text: string, defName: string, missing: XsdField[]): string {
  const propsBlock = locatePropertiesBlock(text, defName);
  if (!propsBlock) return text;
  const inner = text.slice(propsBlock.start, propsBlock.end);
  const isEmpty = /^\{\s*\}$/.test(inner.trim());
  const insertPos = propsBlock.start + 1;

  const entries = missing
    .map((f) => {
      const obj: any = { type: f.isArray ? 'array' : f.oapiType || 'string' };
      if (f.isArray) obj.items = { type: f.oapiType || 'string' };
      if (f.length) obj.maxLength = parseInt(f.length, 10);
      if (f.description) obj.description = f.description;
      return `      "${f.name}": ${JSON.stringify(obj)}`;
    })
    .join(',\n');

  const inject = `\n${entries}${isEmpty ? '\n' : ',\n'}`;
  return text.slice(0, insertPos) + inject + text.slice(insertPos);
}

export function performRealValidation(
  xsdContent: string,
  yamlContent: string,
  fieldEdits: Record<string, any> = {},
  removedFields: string[] = [],
  ignoredFields: string[] = []
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const changes: ValidationIssue[] = [];
  let updatedYaml = yamlContent;

  if (!xsdContent || !yamlContent) {
    return { issues: [], updatedYaml, parsedXsdFields: [] };
  }

  const parsedXsdFields = parseXSD(xsdContent);
  const fieldNames = parsedXsdFields.map((f) => f.name);
  const fieldNamesLower = new Set(fieldNames.map((n) => n.toLowerCase()));

  const trimmed = yamlContent.trim();
  const looksJson = trimmed.startsWith('{') || trimmed.startsWith('[');
  let spec: any = null;
  if (looksJson) {
    try {
      spec = JSON.parse(yamlContent);
    } catch {
      spec = null;
    }
  }

  if (!spec) {
    issues.push({
      type: 'warn',
      title: 'Non-JSON spec detected',
      sub: 'This tool reliably targets JSON-formatted Swagger/OpenAPI. Plain YAML syntax cannot be safely parsed or patched here — convert to JSON first, or results below should be treated as unverified.',
    });
    return { issues, updatedYaml, parsedXsdFields };
  }

  const targetDef = findBestMatchingDefinition(spec, fieldNames);

  if (!targetDef) {
    issues.push({
      type: 'err',
      title: 'No matching schema definition found',
      sub: `None of the definitions/components.schemas blocks share property names with the XSD fields (${fieldNames.join(', ')}). Confirm the plaintext payload definition (e.g. a "PlainJSON..." schema) is present in this spec.`,
    });
    return { issues, updatedYaml, parsedXsdFields };
  }

  const matchedCount = Object.keys(targetDef.properties).filter((p) =>
    fieldNamesLower.has(p.toLowerCase())
  ).length;
  issues.push({
    type: 'ok',
    title: `Matched target schema: "${targetDef.name}"`,
    sub: `Selected by property-name overlap (${matchedCount} of ${fieldNames.length} XSD fields matched).`,
  });

  const missingForInjection: XsdField[] = [];

  parsedXsdFields.forEach((field) => {
    const { name } = field;
    const effField: XsdField = fieldEdits[name] ? { ...field, ...fieldEdits[name] } : field;

    if (effField.pattern) {
      const est = estimateLengthFromPattern(effField.pattern);
      if (est.approximate && est.max > 0) {
        changes.push({
          type: 'warn',
          title: `Composite pattern on "${name}"`,
          sub: `Pattern "${effField.pattern}" combines multiple quantifiers — derived max length (${est.max}) is a best-effort estimate.`,
        });
      }
    }

    const actualKey = Object.keys(targetDef.properties).find((p) => p.toLowerCase() === name.toLowerCase());

    if (!actualKey) {
      issues.push({
        type: 'err',
        title: `Missing Schema Property: "${name}"`,
        sub: `Mandatory field defined in the validation XSD is absent from "${targetDef.name}" in the OpenAPI spec.`,
        missingFields: [effField],
      });
      missingForInjection.push(effField);
      return;
    }

    const requiredLower = new Set(targetDef.required.map((r) => r.toLowerCase()));
    const isRequiredInSpec = requiredLower.has(name.toLowerCase());
    if (effField.required && !isRequiredInSpec) {
      updatedYaml = addToRequired(updatedYaml, targetDef.name, actualKey);
      changes.push({
        type: 'ok',
        title: `Auto-Fixed required: "${actualKey}"`,
        sub: `XSD has minOccurs=1 (mandatory) — added "${actualKey}" to "${targetDef.name}"'s required array.`,
      });
    } else if (!effField.required && isRequiredInSpec) {
      updatedYaml = removeFromRequired(updatedYaml, targetDef.name, actualKey);
      changes.push({
        type: 'ok',
        title: `Auto-Fixed required: "${actualKey}"`,
        sub: `XSD has minOccurs=0 (optional) — removed "${actualKey}" from "${targetDef.name}"'s required array.`,
      });
    }

    const xsdMax = effField.length ? parseInt(effField.length, 10) : null;
    if (xsdMax == null) return;

    const propDef = targetDef.properties[actualKey];
    const currentMax = propDef?.maxLength;

    if (currentMax === undefined) {
      updatedYaml = injectMaxLength(updatedYaml, targetDef.name, actualKey, xsdMax);
      changes.push({
        type: 'ok',
        title: `Auto-Fixed: "${actualKey}"`,
        sub: `Injected missing constraint -> maxLength: ${xsdMax} (in "${targetDef.name}")`,
      });
    } else if (currentMax !== xsdMax) {
      updatedYaml = patchMaxLength(updatedYaml, targetDef.name, actualKey, currentMax, xsdMax);
      changes.push({
        type: 'ok',
        title: `Updated: "${actualKey}"`,
        sub: `Corrected mismatched maxLength from ${currentMax} to ${xsdMax} (in "${targetDef.name}")`,
      });
    }
  });

  // Check for undocumented fields
  for (const propName of Object.keys(targetDef.properties)) {
    if (ENVELOPE_ONLY_FIELDS.has(propName)) continue;
    if (ignoredFields.includes(propName)) continue;

    if (removedFields.includes(propName)) {
      updatedYaml = removePropertyFromSpec(updatedYaml, targetDef.name, propName);
      updatedYaml = removeFromRequired(updatedYaml, targetDef.name, propName);
      changes.push({
        type: 'ok',
        title: `Removed Undocumented Field: "${propName}"`,
        sub: `Cleanly excised "${propName}" from "${targetDef.name}".`,
      });
      continue;
    }

    if (!fieldNamesLower.has(propName.toLowerCase())) {
      issues.push({
        type: 'warn',
        title: `Undocumented in XSD: "${propName}"`,
        sub: `"${propName}" exists in "${targetDef.name}" but has no corresponding element in the validation XSD. Choose an action:`,
        undocumentedField: { name: propName, defName: targetDef.name },
      });
    }
  }

  if (missingForInjection.length) {
    updatedYaml = injectMissingFields(updatedYaml, targetDef.name, missingForInjection);
    for (const f of missingForInjection) {
      if (f.required) {
        updatedYaml = addToRequired(updatedYaml, targetDef.name, f.name);
        changes.push({
          type: 'ok',
          title: `Auto-Fixed required: "${f.name}"`,
          sub: `XSD has minOccurs=1 — added newly-inserted "${f.name}" to "${targetDef.name}"'s required array.`,
        });
      }
    }
  }

  try {
    const latestSpec = JSON.parse(updatedYaml);
    updatedYaml = checkStandardFields(updatedYaml, latestSpec, changes);
  } catch {
    updatedYaml = checkStandardFields(updatedYaml, spec, changes);
  }

  const sortedReport = [...issues, ...changes].sort((a, b) => {
    const order = { err: 0, warn: 1, ok: 2 };
    return order[a.type] - order[b.type];
  });

  return { issues: sortedReport, updatedYaml, parsedXsdFields };
}

function xsdToOapi(t: string) {
  if (/int|integer|long|short|byte/.test(t)) return 'integer';
  if (/decimal|float|double/.test(t)) return 'number';
  if (/boolean/.test(t)) return 'boolean';
  return 'string';
}
function xsdFormat(t: string) {
  if (/dateTime/.test(t)) return 'date-time';
  if (/date$/.test(t)) return 'date';
  return null;
}
function xsdDirectionOfNode(el: Element) {
  let node: Element | null = el;
  while (node && node.getAttribute) {
    const name = node.getAttribute('name');
    if (name) {
      if (/request|req\b|_req$|\btx\b/i.test(name)) return 'TX';
      if (/response|resp\b|_resp$|\brx\b/i.test(name)) return 'RX';
    }
    node = node.parentElement;
  }
  return 'TX';
}