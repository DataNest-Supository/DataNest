import { createFileRoute } from "@tanstack/react-router";
import {getCloudRuntime,requireCloudCapability} from "../../../lib/datanest-cloud.server";
import {readRonsSession} from "../../../lib/rons-local-proxy.server";
export const Route=createFileRoute("/api/rons/db")({server:{handlers:{POST:async({request})=>{
  const token=readRonsSession(request);
  if(!token)return Response.json({error:"Authentication required"},{status:401});
  const body=await request.text();
  if(new TextEncoder().encode(body).byteLength>65536) return Response.json({error:"Request too large"},{status:413});
  let upstream:Response; try{ upstream=await fetch(`${requireCloudCapability(getCloudRuntime(),"data")}/v1/db/query`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body}); }
  catch{
    return Response.json({error:"RONS database unavailable"},{status:503});
  }
  const text=await upstream.text();
  return new Response(text,{status:upstream.status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
}}}});
