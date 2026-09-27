"use client";

import { DragEvent, FormEvent, KeyboardEvent, useRef, useState } from "react";
import {
  MAX_BATCH_FILES,
  MAX_FILE_BYTES,
  validateBatch,
  validateFileDescriptor
} from "@/lib/datanestAiUpload";

type Props={
  disabled?:boolean;
  onSubmit:(files:File[])=>Promise<void>|void;
};

function formatSize(bytes:number){
  return bytes>=1024*1024
    ?(bytes/(1024*1024)).toFixed(1)+" MB"
    :Math.max(1,Math.round(bytes/1024))+" KB";
}

export default function DataNestAiUploadComposer({disabled=false,onSubmit}:Props){
  const inputRef=useRef<HTMLInputElement|null>(null);
  const [files,setFiles]=useState<File[]>([]);
  const [error,setError]=useState("");
  const [submitting,setSubmitting]=useState(false);

  function addFiles(incoming:File[]){
    setError("");
    try{
      for(const file of incoming)validateFileDescriptor(file);
      const next=[...files,...incoming];
      validateBatch(next);
      setFiles(next);
    }catch(fileError){
      setError(fileError instanceof Error?fileError.message:"Unable to add that file.");
    }
  }

  function removeFile(index:number){
    setFiles(current=>current.filter((_,itemIndex)=>itemIndex!==index));
    setError("");
  }

  function handleDrop(event:DragEvent<HTMLDivElement>){
    event.preventDefault();
    if(disabled||submitting)return;
    addFiles(Array.from(event.dataTransfer.files));
  }

  function handleKeyDown(event:KeyboardEvent<HTMLDivElement>){
    if(event.key==="Enter"||event.key===" "){
      event.preventDefault();
      inputRef.current?.click();
    }
  }

  async function submit(event:FormEvent){
    event.preventDefault();
    if(disabled||submitting||!files.length)return;
    setSubmitting(true);
    setError("");
    try{
      await onSubmit(files);
    }catch(submitError){
      setError(submitError instanceof Error?submitError.message:"Unable to upload files.");
    }finally{
      setSubmitting(false);
    }
  }

  return <form className="datanestAiUploadComposer" onSubmit={submit}>
    <div
      className="datanestAiDropZone"
      role="button"
      tabIndex={disabled?-1:0}
      aria-disabled={disabled||submitting}
      onClick={()=>!disabled&&!submitting&&inputRef.current?.click()}
      onKeyDown={handleKeyDown}
      onDragOver={event=>event.preventDefault()}
      onDrop={handleDrop}
    >
      <b>Attach files</b>
      <span>Drop PDF, DOCX, TXT, CSV or JSON here, or choose files.</span>
      <small>{MAX_BATCH_FILES+" files maximum · "+Math.round(MAX_FILE_BYTES/(1024*1024))+" MB each"}</small>
    </div>

    <input
      ref={inputRef}
      type="file"
      multiple
      accept=".pdf,.docx,.txt,.csv,.json"
      hidden
      disabled={disabled||submitting}
      onChange={event=>{
        addFiles(Array.from(event.target.files||[]));
        event.currentTarget.value="";
      }}
    />

    {files.length>0&&<div className="datanestAiSelectedFiles" aria-live="polite">
      <div className="rowBetween">
        <b>{files.length+" selected"}</b>
        <small className="muted">Selection does not upload automatically.</small>
      </div>
      {files.map((file,index)=><div className="rowBetween" key={file.name+"-"+file.lastModified+"-"+index}>
        <span>{file.name+" · "+formatSize(file.size)}</span>
        <button
          type="button"
          className="secondaryButton"
          disabled={disabled||submitting}
          onClick={()=>removeFile(index)}
          aria-label={"Remove "+file.name}
        >
          Remove
        </button>
      </div>)}
    </div>}

    {error&&<p className="errorText" role="alert">{error}</p>}

    <div className="rowBetween">
      <small className="muted">Files remain UNCERTIFIED evidence until governed review.</small>
      <button className="primaryButton" disabled={disabled||submitting||!files.length}>
        {submitting?"Submitting…":"Upload selected files"}
      </button>
    </div>
  </form>;
}
