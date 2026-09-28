import registry from "./ronsasAppRegistry.json" with {type:"json"};

export type RonsasKind = "static" | "server" | "native" | "operations";
export type RonsasHostedApp = {slug:string;name:string;aliases:readonly string[]};
export type RonsasLaunch = {slug:string;name:string;kind:RonsasKind;href:string|null;availability:"ready"|"unavailable"};
type RegistryEntry = RonsasHostedApp & {kind:RonsasKind;source?:string;output?:string;build?:string};
const entries:readonly RegistryEntry[]=registry as RegistryEntry[];
export const RONSAS_HOSTED_APPS:readonly RonsasHostedApp[]=entries.filter(app=>app.kind==="static");

function normalizeAppName(value:string){
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g,"");
}

const appByName = new Map<string,RegistryEntry>();
for(const app of entries){
  for(const candidate of [app.name,...app.aliases])appByName.set(normalizeAppName(candidate),app);
}

export function getRonsasHostedApp(name:string|null|undefined){
  if(!name)return null;
  const app=appByName.get(normalizeAppName(name));
  return app?.kind==="static"?app:null;
}

export function resolveRonsasLaunch(name:string|null|undefined,basePath:string,availability:Record<string,boolean>):RonsasLaunch|null{
  if(!name)return null;
  const app=appByName.get(normalizeAppName(name));
  if(!app)return null;
  const base=basePath.replace(/\/+$/,"");
  const ready=app.kind==="static"||app.kind==="native"||availability[app.slug]===true;
  const href=!ready?null:app.kind==="native"?`${base}/?view=ai`:app.kind==="operations"?`${base}/?view=ronsasops`:`${base}/apps/${app.slug}/`;
  return {slug:app.slug,name:app.name,kind:app.kind,href,availability:ready?"ready":"unavailable"};
}

export function getRonsasAppLaunch(name:string|null|undefined){
  const app=getRonsasHostedApp(name);
  if(!app)return null;
  const basePath=(process.env.NEXT_PUBLIC_BASE_PATH||"").replace(/\/+$/,"");
  return {
    ...app,
    href:`${basePath}/apps/${app.slug}/`
  };
}
