import {test} from "node:test";
import {strict as assert} from "node:assert";
import {CloudUnavailableError,getCloudRuntime,requireCloudCapability} from "../lib/datanest-cloud.server.ts";

test("missing cloud configuration fails closed for writes",()=>{
  const runtime=getCloudRuntime({});
  assert.equal(runtime.auth.available,false);
  assert.equal(runtime.data.available,false);
  assert.throws(()=>requireCloudCapability(runtime,"data"),CloudUnavailableError);
});

test("production never accepts a loopback cloud service",()=>{
  for(const url of ["http://127.0.0.1:58600","https://127.0.0.1:58600","https://localhost","https://localhost.","https://[::1]","https://192.168.1.10"]){
    const runtime=getCloudRuntime({NODE_ENV:"production",DATANEST_CLOUD_GATEWAY_URL:url});
    assert.equal(runtime.data.available,false,url);
    assert.throws(()=>requireCloudCapability(runtime,"auth"),CloudUnavailableError);
  }
});

test("private cloud DNS enables the gateway capabilities",()=>{
  const runtime=getCloudRuntime({NODE_ENV:"production",DATANEST_CLOUD_GATEWAY_URL:"http://datanest-backend.railway.internal:8080"});
  assert.equal(runtime.auth.available,true);
  assert.equal(runtime.data.available,true);
  assert.equal(requireCloudCapability(runtime,"data"),"http://datanest-backend.railway.internal:8080");
  assert.equal(runtime.ai.available,false);
});
