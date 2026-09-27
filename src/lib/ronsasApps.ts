export type RonsasHostedApp = {
  slug:string;
  name:string;
  aliases:readonly string[];
};

export const RONSAS_HOSTED_APPS:readonly RonsasHostedApp[] = [
  {slug:"career-compass",name:"Career Compass",aliases:[]},
  {slug:"creative-studio",name:"Creative Studio",aliases:[]},
  {slug:"epublisher",name:"ePublisher",aliases:["Epublisher","e Publisher"]},
  {slug:"lyricsync-studio",name:"LyricSync Studio",aliases:["Lyric Sync Studio"]},
  {slug:"scene-song-spark",name:"Scene Song Spark",aliases:[]},
  {slug:"sovereign-forge",name:"SovereignForge",aliases:["Sovereign Forge"]},
  {slug:"syncvision",name:"Sync Vision",aliases:["SyncVision"]},
];

function normalizeAppName(value:string){
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g,"");
}

const appByName = new Map<string,RonsasHostedApp>();
for(const app of RONSAS_HOSTED_APPS){
  for(const candidate of [app.name,...app.aliases])appByName.set(normalizeAppName(candidate),app);
}

export function getRonsasHostedApp(name:string|null|undefined){
  if(!name)return null;
  return appByName.get(normalizeAppName(name))||null;
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
