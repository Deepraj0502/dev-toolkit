import React, { useState, useEffect } from "react";
import { UploadCloud, Download, Trash2, FileText, ShieldAlert } from "lucide-react";
import { supabase } from "../utils/supabaseConfig";

interface Props {
  userRole: "masteradmin" | "user" | "viewer";
}

export interface CloudFile {
  id: string;
  name: string;
  size: number;
  url: string;
  uploadedAt: number;
}

export default function MasterAdminFileManager({ userRole }: Props) {
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // We are using a Supabase bucket named 'master_vault'
  const BUCKET_NAME = 'master_vault';

  useEffect(() => {
    if (userRole === "masteradmin") {
      fetchFiles();
    }
  }, [userRole]);

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.storage.from(BUCKET_NAME).list();

      if (error) throw error;

      const fetchedFiles: CloudFile[] = (data || [])
        .filter((file) => file.name !== ".emptyFolderPlaceholder") 
        .map((file) => {
          const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(file.name);
          
          return {
            id: file.id ?? file.name,
            name: file.name,
            size: file.metadata?.size ? Number(file.metadata.size) : 0,
            url: publicUrlData.publicUrl,
            uploadedAt: file.created_at ? new Date(file.created_at).getTime() : Date.now(),
          };
        });

      // Sort newest to oldest
      fetchedFiles.sort((a, b) => b.uploadedAt - a.uploadedAt);
      setFiles(fetchedFiles);
    } catch (error) {
      console.error("Failed to load files from Supabase:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Centralized upload function used by both input change and drag-and-drop
  const processFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(file.name, file, {
          cacheControl: '3600',
          upsert: true 
        });

      if (error) throw error;
      
      await fetchFiles();
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload file to Supabase.");
    } finally {
      setIsUploading(false);
    }
  };

  // --- Event Handlers ---
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFileUpload(file);
    }
    event.target.value = ""; // Reset input
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFileUpload(file);
    }
  };

  const handleDelete = async (fileName: string) => {
    if (window.confirm("Are you sure you want to permanently delete this file from the cloud?")) {
      try {
        const { error } = await supabase.storage.from(BUCKET_NAME).remove([fileName]);
        if (error) throw error;
        
        await fetchFiles();
      } catch (error) {
        console.error("Failed to delete file:", error);
        alert("Failed to delete the file.");
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (userRole !== "masteradmin") {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 rounded-3xl m-8">
        <ShieldAlert size={48} className="text-red-500 dark:text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-red-900 dark:text-red-400 mb-2">Access Denied</h2>
        <p className="text-red-700 dark:text-red-300 text-sm">
          You do not have the required permissions to view the Master Admin Cloud Vault.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-indigo-950 dark:text-indigo-300 flex items-center gap-2">
          <ShieldAlert className="text-indigo-600 dark:text-indigo-400" />
          Master Admin Vault
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Files are synced securely to Storage.
        </p>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div className="mb-8">
        <label 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 
            ${isDragging 
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' 
              : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            } 
            ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none">
            <UploadCloud 
              className={`w-10 h-10 mb-3 transition-colors duration-200 ${isDragging ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-indigo-500 dark:text-indigo-500/70'}`} 
            />
            <p className="mb-1 text-sm font-bold text-slate-700 dark:text-slate-300">
              {isUploading ? "Uploading to Cloud..." : isDragging ? "Drop file here to upload" : "Click or drag a file to this area to upload"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Supports DOCX, PDF, JSON, PNG, etc. (Max 50MB)</p>
          </div>
          <input 
            type="file" 
            className="hidden" 
            onChange={handleInputChange} 
            disabled={isUploading} 
          />
        </label>
      </div>

      {/* File Registry */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Cloud File Repository ({files.length})</h3>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-500 font-semibold animate-pulse">
            Connecting to Supabase Storage...
          </div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-500 italic">
            Your cloud vault is currently empty.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[500px] overflow-y-auto">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0 transition-colors">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      <span>{formatSize(file.size)}</span>
                      <span>•</span>
                      <span>{new Date(file.uploadedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4 opacity-100 lg:opacity-60 group-hover:opacity-100 transition-opacity">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-lg transition-colors inline-flex"
                    title="Download File"
                  >
                    <Download size={18} />
                  </a>
                  <button
                    onClick={() => handleDelete(file.name)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete File"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}