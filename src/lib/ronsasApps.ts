export type RonsasHostedApp = {
  slug:string;
  name:string;
  aliases:readonly string[];
  launchKind:"datanest-pages"|"external-ssr";
  href?:string;
  family:"career"|"create"|"grow"|"build";
  role:"primary"|"module"|"acquisition";
};

export const RONSAS_HOSTED_APPS:readonly RonsasHostedApp[] = [
  {slug:"career-compass",name:"Career Compass",aliases:["Resonance Career Compass"],launchKind:"datanest-pages",family:"career",role:"primary"},
  {slug:"creative-studio",name:"Resonance Creator Studio",aliases:["Creative Studio","RONSAS Creator Studio"],launchKind:"datanest-pages",family:"create",role:"primary"},
  {slug:"epublisher",name:"Resonance Publish",aliases:["ePublisher","Epublisher","e Publisher","Publish"],launchKind:"datanest-pages",family:"create",role:"module"},
  {slug:"lyricsync-studio",name:"Resonance Lyrics & Sync",aliases:["LyricSync Studio","Lyric Sync Studio","Lyrics & Sync"],launchKind:"datanest-pages",family:"create",role:"module"},
  {slug:"scene-song-spark",name:"SongSpark",aliases:["Scene Song Spark","SceneSongSpark"],launchKind:"datanest-pages",family:"grow",role:"acquisition"},
  {slug:"sovereign-forge",name:"Sovereign Forge",aliases:["SovereignForge"],launchKind:"datanest-pages",family:"build",role:"primary"},
  {slug:"syncvision",name:"Resonance Media Sync",aliases:["Sync Vision","SyncVision","Media Sync"],launchKind:"datanest-pages",family:"create",role:"module"},
  {slug:"youtube-optimizer",name:"Resonance Creator Growth",aliases:["YouTube Optimizer","YouTubeOptimizer","Creator Growth"],launchKind:"external-ssr",href:"https://youtubeoptimizer.life",family:"grow",role:"module"},
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
