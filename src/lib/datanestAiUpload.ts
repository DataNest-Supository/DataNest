"use client";

import { Upload } from "tus-js-client";
import {
  FILE_BUCKET,
  MAX_BATCH_FILES,
  MAX_FILE_BYTES,
  canonicalBlobPath,
  validateBatch,
  validateFileDescriptor
} from "../../supabase/functions/_shared/datanestFileDomain";

export {FILE_BUCKET,MAX_BATCH_FILES,MAX_FILE_BYTES,canonicalBlobPath,validateBatch,validateFileDescriptor};

export async function sha256File(file:Blob){
  const bytes=await file.arrayBuffer();
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,"0")).join("");
}

export type SignedTusUploadOptions={
  file:File;
  endpoint:string;
  token:string;
  objectPath:string;
  onProgress?:(uploaded:number,total:number,percent:number)=>void;
};

export function startSignedTusUpload({
  file,
  endpoint,
  token,
  objectPath,
  onProgress
}:SignedTusUploadOptions){
  validateFileDescriptor(file);
  if(!/^https:\/\/[a-z0-9-]+\.storage\.supabase\.co\/storage\/v1\/upload\/resumable$/i.test(endpoint)){
    throw new Error("A direct Supabase Storage resumable endpoint is required.");
  }
  if(!token)throw new Error("A signed upload token is required.");
  if(!objectPath)throw new Error("An upload object path is required.");

  return new Promise<string>((resolve,reject)=>{
    const upload=new Upload(file,{
      endpoint,
      retryDelays:[0,3000,5000,10000,20000],
      headers:{"x-signature":token},
      uploadDataDuringCreation:true,
      removeFingerprintOnSuccess:true,
      chunkSize:6*1024*1024,
      metadata:{
        bucketName:FILE_BUCKET,
        objectName:objectPath,
        contentType:file.type||"application/octet-stream"
      },
      onError:error=>reject(error),
      onProgress:(uploaded,total)=>{
        onProgress?.(uploaded,total,total?uploaded/total*100:0);
      },
      onSuccess:()=>resolve(upload.url||"")
    });

    upload.findPreviousUploads()
      .then(previous=>{
        if(previous.length)upload.resumeFromPreviousUpload(previous[0]);
        upload.start();
      })
      .catch(reject);
  });
}
