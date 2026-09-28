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
  const runtime=getCloudRuntime({NODE_ENV:"production",DATANEST_CLOUD_GATEWAY_URL:"http://127.0.0.1:58600"});
  assert.equal(runtime.data.available,false);
  assert.throws(()=>requireCloudCapability(runtime,"auth"),CloudUnavailableError);
});

test("private cloud DNS enables the gateway capabilities",()=>{
  const runtime=getCloudRuntime({NODE_ENV:"production",DATANEST_CLOUD_GATEWAY_URL:"http://datanest-backend.railway.internal:8080"});
  assert.equal(runtime.auth.available,true);
  assert.equal(runtime.data.available,true);
  assert.equal(requireCloudCapability(runtime,"data"),"http://datanest-backend.railway.internal:8080");
  assert.equal(runtime.ai.available,false);
});
