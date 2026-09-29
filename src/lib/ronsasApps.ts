export type RonsasHostedApp = {
  slug:string;
  name:string;
  aliases:readonly string[];
  launchKind:"datanest-pages"|"external-ssr";
  href?:string;
};

export const RONSAS_HOSTED_APPS:readonly RonsasHostedApp[] = [
  {slug:"career-compass",name:"Career Compass",aliases:[],launchKind:"datanest-pages"},
  {slug:"creative-studio",name:"Creative Studio",aliases:[],launchKind:"datanest-pages"},
  {slug:"epublisher",name:"ePublisher",aliases:["Epublisher","e Publisher"],launchKind:"datanest-pages"},
  {slug:"lyricsync-studio",name:"LyricSync Studio",aliases:["Lyric Sync Studio"],launchKind:"datanest-pages"},
  {slug:"scene-song-spark",name:"Scene Song Spark",aliases:[],launchKind:"datanest-pages"},
  {slug:"sovereign-forge",name:"SovereignForge",aliases:["Sovereign Forge"],launchKind:"datanest-pages"},
  {slug:"syncvision",name:"Sync Vision",aliases:["SyncVision"],launchKind:"datanest-pages"},
  {slug:"youtube-optimizer",name:"YouTube Optimizer",aliases:["YouTubeOptimizer"],launchKind:"external-ssr",href:"https://youtubeoptimizer.life"},
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
  if(app.launchKind==="external-ssr")return {...app,href:app.href!};
  const basePath=(process.env.NEXT_PUBLIC_BASE_PATH||"").replace(/\/+$/,"");
  return {...app,href:`${basePath}/apps/${app.slug}/`};
}
