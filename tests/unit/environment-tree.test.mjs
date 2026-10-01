import test from "node:test";
import assert from "node:assert/strict";
import { assessEnvironment } from "../../scripts/environment-assessor.mjs";

const config={
  expected:{canonicalDelivery:"GitHub Pages",backendAuthority:"Supabase",forgeMode:"governed-mirror"},
  adaptationPolicy:{}
};

test("ENVIRONMENT reports a compatible baseline without changing authority",()=>{
  const result=assessEnvironment(config,{
    node22Configured:true,
    ubuntu2404:true,
    deliveryProvider:"GitHub Pages",
    backendAuthority:"Supabase",
    forgeMode:"governed-mirror",
    botsquadProtected:true,
    environmentProtected:true,
    requiredTreeConfigs:[{}, {}, {}, {}]
  });
  assert.equal(result.compatible,true);
  assert.equal(result.productionAuthorization,false);
  assert.equal(result.reviewRequired.length,0);
});

test("ENVIRONMENT requires review for material drift",()=>{
  const result=assessEnvironment(config,{
    node22Configured:false,
    ubuntu2404:false,
    deliveryProvider:"Other",
    backendAuthority:"Other",
    forgeMode:"authority",
    botsquadProtected:false,
    environmentProtected:false,
    requiredTreeConfigs:[{}, null, {}, {}]
  });
  assert.equal(result.compatible,false);
  assert.ok(result.reviewRequired.length>=5);
  assert.equal(result.productionAuthorization,false);
});
