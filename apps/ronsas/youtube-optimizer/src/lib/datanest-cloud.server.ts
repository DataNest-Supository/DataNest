export type CloudCapability="auth"|"data"|"ai"|"storage";
export type CloudRuntime=Record<CloudCapability,{available:boolean;url:string|null}>;

export class CloudUnavailableError extends Error{
  readonly capability:CloudCapability;
  constructor(capability:CloudCapability){
    super(`DataNest cloud ${capability} is unavailable`);
    this.name="CloudUnavailableError";
    this.capability=capability;
  }
}

function cloudUrl(raw:string|undefined):string|null{
  if(!raw?.trim())return null;
  try{
    const url=new URL(raw.trim());
    if(url.username||url.password||url.search||url.hash)return null;
    const privateDns=url.hostname.endsWith(".internal")||url.hostname.endsWith(".svc.cluster.local");
    if(url.protocol!=="https:"&&!(url.protocol==="http:"&&privateDns))return null;
    return url.toString().replace(/\/$/,"");
  }catch{return null;}
}

export function getCloudRuntime(env:Record<string,string|undefined>=process.env):CloudRuntime{
  const gateway=cloudUrl(env["DATANEST_CLOUD_GATEWAY_URL"]);
  const ai=cloudUrl(env["DATANEST_CLOUD_AI_URL"]);
  const storage=cloudUrl(env["DATANEST_CLOUD_STORAGE_URL"]);
  const capability=(url:string|null)=>({available:!!url,url});
  return {auth:capability(gateway),data:capability(gateway),ai:capability(ai),storage:capability(storage)};
}

export function requireCloudCapability(runtime:CloudRuntime,capability:CloudCapability):string{
  const configured=runtime[capability];
  if(!configured.available||!configured.url)throw new CloudUnavailableError(capability);
  return configured.url;
}
