// @ts-nocheck -- Deno worker resolves pinned npm: imports via local deno.json.
import { createClient } from "@supabase/supabase-js";
import { FILE_BUCKET, MAX_FILE_BYTES, canonicalBlobPath } from "../_shared/datanestFileDomain.ts";
import { extractTxt, extractCsv, extractJson } from "../_shared/datanestFileExtract.ts";
import { extractPdf, extractDocx } from "./documentExtract.ts";

declare const Deno:{
  env:{get:(name:string)=>string|undefined};
  serve:(handler:(request:Request)=>Response|Promise<Response>)=>void;
};

type QueueMessage={msg_id:number;read_ct:number;message:{itemId?:string}};
const MAX_ATTEMPTS=3;
const DETERMINISTIC_CODES=new Set([
  "UNSUPPORTED_TYPE",
  "FILE_TOO_LARGE",
  "INVALID_FILE_SIGNATURE",
  "ENCRYPTED_FILE_UNSUPPORTED",
  "OCR_REQUIRED_UNAVAILABLE"
]);

function json(body:unknown,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{"Content-Type":"application/json","Cache-Control":"no-store"}
  });
}

function requireEnv(name:string){
  const value=Deno.env.get(name);
  if(!value)throw new Error(name+" is not configured.");
  return value;
}

async function sha256Bytes(bytes:Uint8Array){
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,"0")).join("");
}

async function sha256Text(value:string){
  return sha256Bytes(new TextEncoder().encode(value));
}

function extensionOf(name:string){
  const dot=name.lastIndexOf(".");
  return dot>=0?name.slice(dot).toLowerCase():"";
}

function detectType(name:string,bytes:Uint8Array){
  const ext=extensionOf(name);
  if(bytes.byteLength>MAX_FILE_BYTES){
    const error=new Error("File exceeds the 25 MiB server limit.");
    (error as any).code="FILE_TOO_LARGE";
    throw error;
  }
  if(ext===".pdf"){
    const header=new TextDecoder().decode(bytes.slice(0,5));
    if(header!=="%PDF-"){
      const error=new Error("PDF signature is invalid.");
      (error as any).code="INVALID_FILE_SIGNATURE";
      throw error;
    }
    return "application/pdf";
  }
  if(ext===".docx"){
    if(bytes[0]!==0x50||bytes[1]!==0x4b){
      const error=new Error("DOCX container signature is invalid.");
      (error as any).code="INVALID_FILE_SIGNATURE";
      throw error;
    }
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if(ext===".txt")return "text/plain";
  if(ext===".csv")return "text/csv";
  if(ext===".json")return "application/json";
  const error=new Error("Unsupported file type.");
  (error as any).code="UNSUPPORTED_TYPE";
  throw error;
}

async function objectExists(storage:any,path:string){
  const parts=path.split("/");
  const name=parts.pop()||"";
  const folder=parts.join("/");
  const {data,error}=await storage.list(folder,{limit:100,search:name});
  if(error)throw error;
  return (data||[]).some((item:any)=>item.name===name);
}

async function readObject(storage:any,path:string){
  const {data,error}=await storage.download(path);
  if(error||!data)throw error||new Error("Stored upload is unavailable.");
  return new Uint8Array(await data.arrayBuffer());
}

async function canonicalize(storage:any,tempPath:string,hash:string){
  const canonical=canonicalBlobPath(hash);
  const exists=await objectExists(storage,canonical);
  if(!exists){
    const {error}=await storage.copy(tempPath,canonical);
    if(error&&!(await objectExists(storage,canonical)))throw error;
  }
  if(tempPath!==canonical){
    const {error}=await storage.remove([tempPath]);
    if(error)throw error;
  }
  return canonical;
}

async function extractByType(name:string,bytes:Uint8Array){
  const ext=extensionOf(name);
  if(ext===".pdf"){
    try{
      const result=await extractPdf(bytes);
      if(result.pages.some(page=>page.needsOcr)){
        const error=new Error("One or more PDF pages require OCR.");
        (error as any).code="OCR_REQUIRED_UNAVAILABLE";
        throw error;
      }
      return {result,method:"pdfjs-native",version:"pdfjs-dist@6.3.289"};
    }catch(error){
      if(/password|encrypted/i.test(String((error as Error)?.message||""))){
        (error as any).code="ENCRYPTED_FILE_UNSUPPORTED";
      }
      throw error;
    }
  }
  if(ext===".docx"){
    try{
      return {result:await extractDocx(bytes),method:"docx-ooxml",version:"jszip@3.10.2+fast-xml-parser@5.11.1"};
    }catch(error){
      if(/password|encrypted/i.test(String((error as Error)?.message||""))){
        (error as any).code="ENCRYPTED_FILE_UNSUPPORTED";
      }
      throw error;
    }
  }

  let text="";
  try{
    text=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
  }catch{
    const error=new Error("Text file is not valid UTF-8.");
    (error as any).code="INVALID_FILE_SIGNATURE";
    throw error;
  }
  if(ext===".txt")return {result:extractTxt(text),method:"utf8-lines",version:"1"};
  if(ext===".csv")return {result:extractCsv(text),method:"csv-state-machine",version:"1"};
  if(ext===".json")return {result:extractJson(text),method:"json-rfc6901",version:"1"};

  const error=new Error("Unsupported file type.");
  (error as any).code="UNSUPPORTED_TYPE";
  throw error;
}

async function ensureSource(client:any){
  const {data,error}=await client
    .from("datanest_sources")
    .upsert({
      source_key:"datanest-ai-file-upload",
      source_kind:"file_upload",
      display_name:"DataNest AI file uploads",
      connector:"datanest-ai-file-worker",
      enabled:true,
      metadata:{governed:true}
    },{onConflict:"source_key"})
    .select("id")
    .single();
  if(error||!data)throw error||new Error("Unable to create DataNest file source.");
  return String(data.id);
}

async function persistArtifact(client:any,item:any,hash:string,detectedMime:string,chunks:any[]){
  const sourceId=await ensureSource(client);
  const content=chunks.map(chunk=>String(chunk.text||"")).join("\n\n");
  const externalId="file-sha256:"+hash;

  const {data:artifact,error:artifactError}=await client
    .from("datanest_artifacts")
    .upsert({
      source_id:sourceId,
      external_id:externalId,
      content_sha256:hash,
      content_type:detectedMime,
      visibility:"private",
      source_uri:"storage://"+FILE_BUCKET+"/"+canonicalBlobPath(hash),
      content,
      metadata:{
        file_sha256:hash,
        file_trace_id:item.trace_id,
        extraction_method:item.extraction_method,
        extraction_version:item.extraction_version
      }
    },{onConflict:"source_id,external_id,content_sha256"})
    .select("id")
    .single();
  if(artifactError||!artifact)throw artifactError||new Error("Unable to persist DataNest artifact.");

  const rows=[];
  for(let ordinal=0;ordinal<chunks.length;ordinal++){
    const chunk=chunks[ordinal];
    const chunkContent=String(chunk.text||"");
    const contentHash=await sha256Text(chunkContent);
    const identityHash=await sha256Text(JSON.stringify(chunk.locator)+"\n"+contentHash);
    rows.push({
      artifact_id:artifact.id,
      ordinal,
      content_sha256:contentHash,
      identity_sha256:identityHash,
      visibility:"private",
      content:chunkContent,
      metadata:{locator:chunk.locator,file_sha256:hash,file_trace_id:item.trace_id}
    });
  }
  if(rows.length){
    const {error}=await client.from("datanest_chunks").upsert(rows,{onConflict:"artifact_id,ordinal"});
    if(error)throw error;
  }
  return String(artifact.id);
}

async function updateSubmissionState(client:any,submissionId:string){
  const {data:items,error}=await client
    .from("ai_file_submission_items")
    .select("status")
    .eq("submission_id",submissionId);
  if(error)throw error;
  const statuses=(items||[]).map((item:any)=>String(item.status));
  let status="PROCESSING";
  if(statuses.length&&statuses.every((value:string)=>value==="FAILED"))status="FAILED";
  else if(statuses.length&&statuses.every((value:string)=>value==="READY"||value==="FAILED"))status="PROCESSING";
  const {error:updateError}=await client
    .from("ai_file_submissions")
    .update({status,updated_at:new Date().toISOString()})
    .eq("id",submissionId);
  if(updateError)throw updateError;
}

async function processItem(client:any,itemId:string){
  const {data:item,error:itemError}=await client
    .from("ai_file_submission_items")
    .select("*")
    .eq("id",itemId)
    .maybeSingle();
  if(itemError)throw itemError;
  if(!item)return {itemId,status:"MISSING",ack:true};
  if(item.status==="READY")return {itemId,status:"READY",ack:true,idempotent:true};
  if(item.status==="FAILED"&&DETERMINISTIC_CODES.has(String(item.last_error_code||""))){
    return {itemId,status:"FAILED",ack:true,idempotent:true};
  }

  const attempt=Number(item.attempt_count||0)+1;
  if(attempt>MAX_ATTEMPTS){
    await client.from("ai_file_submission_items").update({
      status:"FAILED",
      attempt_count:attempt,
      last_error_code:"RETRY_EXHAUSTED",
      last_error_message:"Transient file processing failed after three attempts.",
      completed_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    }).eq("id",itemId);
    return {itemId,status:"FAILED",ack:true};
  }

  await client.from("ai_file_submission_items").update({
    attempt_count:attempt,
    updated_at:new Date().toISOString()
  }).eq("id",itemId);

  try{
    let current=item;
    const storage=client.storage.from(FILE_BUCKET);

    if(["UPLOADING","QUEUED","VALIDATING"].includes(String(current.status))){
      await client.from("ai_file_submission_items").update({status:"VALIDATING",updated_at:new Date().toISOString()}).eq("id",itemId);
      const bytes=await readObject(storage,String(current.storage_object_path||""));
      const detectedMime=detectType(String(current.original_name),bytes);
      const verifiedHash=await sha256Bytes(bytes);
      const canonical=await canonicalize(storage,String(current.storage_object_path||""),verifiedHash);
      const clientHash=String(current.client_sha256||"");
      const clientHashMatches=clientHash?clientHash===verifiedHash:null;

      const {data:verified,error}=await client
        .from("ai_file_submission_items")
        .update({
          byte_size:bytes.byteLength,
          detected_mime:detectedMime,
          verified_sha256:verifiedHash,
          client_hash_matches:clientHashMatches,
          storage_object_path:canonical,
          status:"EXTRACTING",
          last_error_code:null,
          last_error_message:null,
          updated_at:new Date().toISOString()
        })
        .eq("id",itemId)
        .select("*")
        .single();
      if(error||!verified)throw error||new Error("Unable to persist verified file digest.");
      current=verified;
    }

    if(String(current.status)==="EXTRACTING"){
      const bytes=await readObject(storage,String(current.storage_object_path));
      const extracted=await extractByType(String(current.original_name),bytes);
      const {data:checkpoint,error}=await client
        .from("ai_file_submission_items")
        .update({
          extracted_chunks:extracted.result.chunks,
          extraction_warnings:extracted.result.warnings,
          extraction_method:extracted.method,
          extraction_version:extracted.version,
          status:"CHUNKING",
          updated_at:new Date().toISOString()
        })
        .eq("id",itemId)
        .select("*")
        .single();
      if(error||!checkpoint)throw error||new Error("Unable to persist extraction checkpoint.");
      current=checkpoint;
    }

    if(String(current.status)==="OCR"){
      const error=new Error("OCR is required but is not available in worker v1.");
      (error as any).code="OCR_REQUIRED_UNAVAILABLE";
      throw error;
    }

    if(String(current.status)==="CHUNKING"){
      const chunks=Array.isArray(current.extracted_chunks)?current.extracted_chunks:[];
      const artifactId=await persistArtifact(
        client,
        current,
        String(current.verified_sha256),
        String(current.detected_mime||current.declared_mime||"application/octet-stream"),
        chunks
      );
      const {error}=await client.from("ai_file_submission_items").update({
        artifact_id:artifactId,
        status:"READY",
        completed_at:new Date().toISOString(),
        updated_at:new Date().toISOString()
      }).eq("id",itemId);
      if(error)throw error;
      await updateSubmissionState(client,String(current.submission_id));
      return {itemId,status:"READY",ack:true};
    }

    return {itemId,status:String(current.status),ack:false};
  }catch(error){
    const code=String((error as any)?.code||"EXTRACTION_FAILED");
    const deterministic=DETERMINISTIC_CODES.has(code);
    const terminal=deterministic||attempt>=MAX_ATTEMPTS;
    const finalCode=terminal&&attempt>=MAX_ATTEMPTS&&!deterministic?"RETRY_EXHAUSTED":code;

    await client.from("ai_file_submission_items").update({
      status:terminal?"FAILED":"QUEUED",
      last_error_code:finalCode,
      last_error_message:error instanceof Error?error.message:"File processing failed.",
      completed_at:terminal?new Date().toISOString():null,
      updated_at:new Date().toISOString()
    }).eq("id",itemId);

    if(terminal)await updateSubmissionState(client,String(item.submission_id));
    return {itemId,status:terminal?"FAILED":"QUEUED",ack:terminal,error:finalCode};
  }
}

async function drain(client:any){
  const {data,error}=await client.rpc("service_claim_datanest_file_items",{
    target_limit:5,
    visibility_seconds:120
  });
  if(error)throw error;
  const results=[];
  for(const message of (data||[]) as QueueMessage[]){
    const itemId=String(message.message?.itemId||"");
    if(!itemId){
      await client.rpc("service_ack_datanest_file_item",{target_message:message.msg_id});
      results.push({msgId:message.msg_id,status:"INVALID_MESSAGE"});
      continue;
    }
    const result=await processItem(client,itemId);
    if(result.ack){
      const {error:ackError}=await client.rpc("service_ack_datanest_file_item",{target_message:message.msg_id});
      if(ackError)throw ackError;
    }
    results.push({msgId:message.msg_id,readCt:message.read_ct,...result});
  }
  return results;
}

Deno.serve(async(request:Request)=>{
  if(request.method!=="POST")return json({error:"Method not allowed."},405);
  const url=requireEnv("SUPABASE_URL");
  const serviceKey=requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  if(request.headers.get("x-datanest-worker-auth")!==serviceKey){
    return json({error:"Worker authorization required."},401);
  }

  try{
    const client=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const results=await drain(client);
    return json({processed:results.length,results});
  }catch(error){
    return json({error:error instanceof Error?error.message:"Worker failed."},500);
  }
});
