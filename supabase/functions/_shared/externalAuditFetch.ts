function isPrivateIpv4(host:string){
  const parts=host.split(".").map(Number);
  if(parts.length!==4||parts.some(n=>!Number.isInteger(n)||n<0||n>255))return false;
  return parts[0]===10||parts[0]===127||(parts[0]===169&&parts[1]===254)||(parts[0]===192&&parts[1]===168)||(parts[0]===172&&parts[1]>=16&&parts[1]<=31)||(parts[0]===0)||(parts[0]>=224);
}

function forbiddenHostname(hostname:string){
  const host=hostname.toLowerCase().replace(/\.$/,"");
  return host==="localhost"||host.endsWith(".localhost")||host.endsWith(".local")||host==="::1"||host==="0.0.0.0"||isPrivateIpv4(host);
}

export function validatePublicSourceUrl(raw:string):URL{
  const url=new URL(raw);
  if(url.protocol!=="https:")throw new Error("https_required");
  if(url.username||url.password)throw new Error("credentials_in_url_rejected");
  if(forbiddenHostname(url.hostname))throw new Error("private_or_local_host_rejected");
  return url;
}

export async function assertPublicDns(url:URL){
  const host=url.hostname;
  if(isPrivateIpv4(host)||host.includes(":"))return;
  const deno=(globalThis as unknown as {Deno?:{resolveDns?:(host:string,record:"A"|"AAAA")=>Promise<string[]>}}).Deno;
  if(!deno?.resolveDns)return;
  for(const record of ["A","AAAA"] as const){
    let addresses:string[]=[];
    try{addresses=await deno.resolveDns(host,record);}catch{continue;}
    for(const address of addresses){
      if(forbiddenHostname(address)||address.startsWith("fc")||address.startsWith("fd")||address.startsWith("fe80:"))throw new Error("private_dns_resolution_rejected");
    }
  }
}

async function digest(body:string){
  const bytes=new TextEncoder().encode(body);
  const hash=await crypto.subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(hash)].map(value=>value.toString(16).padStart(2,"0")).join("");
}

export async function fetchPublicSnapshot(url:URL,limits:{maxBytes:number;timeoutMs:number;maxRedirects:number}){
  let current=validatePublicSourceUrl(url.toString());
  for(let redirect=0;redirect<=limits.maxRedirects;redirect++){
    await assertPublicDns(current);
    const response=await fetch(current,{redirect:"manual",signal:AbortSignal.timeout(limits.timeoutMs),headers:{"User-Agent":"DataNest-External-Auditor/1.0"}});
    if(response.status>=300&&response.status<400){
      const location=response.headers.get("location");
      if(!location)throw new Error("redirect_without_location");
      current=validatePublicSourceUrl(new URL(location,current).toString());
      continue;
    }
    if(!response.ok)throw new Error("source_http_"+response.status);
    const reader=response.body?.getReader();
    if(!reader)throw new Error("source_body_unavailable");
    const chunks:Uint8Array[]=[]; let total=0;
    while(true){
      const next=await reader.read();
      if(next.done)break;
      total+=next.value.byteLength;
      if(total>limits.maxBytes){await reader.cancel();throw new Error("source_too_large");}
      chunks.push(next.value);
    }
    const merged=new Uint8Array(total);let offset=0;
    for(const chunk of chunks){merged.set(chunk,offset);offset+=chunk.byteLength;}
    const body=new TextDecoder("utf-8",{fatal:false}).decode(merged);
    return {finalUrl:current.toString(),contentType:response.headers.get("content-type")||"application/octet-stream",body,sha256:await digest(body),fetchedAt:new Date().toISOString()};
  }
  throw new Error("redirect_limit_exceeded");
}