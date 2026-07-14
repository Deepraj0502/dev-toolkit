// YamlTool.tsx
// NOTE:
// This is a starter version containing the requested architecture.
// Install:
// npm install sql-formatter lucide-react

import { useState } from "react";
import { format } from "sql-formatter";
import { Clipboard, Wand2, CheckCircle2 } from "lucide-react";

export default function YamlTool() {
  const [sql, setSql] = useState("");
  const [yaml, setYaml] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const formatSql = () => {
    try {
      setSql(format(sql, {
        language: "postgresql",
        keywordCase: "upper",
        linesBetweenQueries: 2,
      }));
      setErrors([]);
    } catch {
      setErrors(["Unable to format SQL."]);
    }
  };

  const validate = () => {
    const e:string[] = [];
    const lines = sql.split("\n");
    const allowed = ["EISDEV","EISSIT","EISAPP"];

    lines.forEach((l,i)=>{
      const t=l.trim().toUpperCase();
      if(!t || t==="COMMIT;") return;

      if(!t.endsWith(";")) e.push(`Line ${i+1}: Missing semicolon`);
      if((t.match(/\(/g)||[]).length!==(t.match(/\)/g)||[]).length)
        e.push(`Line ${i+1}: Parentheses mismatch`);
      if(((t.match(/'/g)||[]).length)%2!==0)
        e.push(`Line ${i+1}: Quote mismatch`);

      if((t.startsWith("INSERT")||t.startsWith("UPDATE")) &&
         !allowed.some(a=>t.includes(a)))
        e.push(`Line ${i+1}: Invalid schema`);

      if(t.startsWith("UPDATE") && !t.includes(" SET "))
        e.push(`Line ${i+1}: UPDATE missing SET`);

      if((t.startsWith("UPDATE")||t.startsWith("DELETE")) && !t.includes("WHERE"))
        e.push(`Line ${i+1}: Warning - no WHERE clause`);
    });

    setErrors(e);
    return e.length===0;
  };

  const generateYaml=()=>{
    if(!validate()) return;
    let out="API:\n  Cache:\n";
    sql.split(";").forEach(q=>{
      const s=q.trim();
      if(!s || s.toUpperCase()=="COMMIT") return;
      out+=`    - Query: "${s};"\n`;
    });
    setYaml(out);
  };

  const copy=()=>{
    navigator.clipboard.writeText(yaml);
    setCopied(True);
  }

  return <div className="p-6 space-y-4">
    <textarea value={sql} onChange={e=>setSql(e.target.value)} className="w-full h-72 border p-3 rounded"/>
    <div className="flex gap-2">
      <button onClick={formatSql}><Wand2 size={16}/> Format SQL</button>
      <button onClick={generateYaml}>Validate & Generate</button>
      {yaml && <button onClick={()=>{navigator.clipboard.writeText(yaml);setCopied(true);setTimeout(()=>setCopied(false),2000);}}>
        {copied ? <CheckCircle2 size={16}/> : <Clipboard size={16}/>}
      </button>}
    </div>
    {errors.length>0 && <ul>{errors.map((x,i)=><li key={i}>{x}</li>)}</ul>}
    <pre>{yaml}</pre>
  </div>;
}
