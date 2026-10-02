import assert from "node:assert/strict";
import test from "node:test";
import { validateProductionContract } from "../../scripts/validate-production-contract.mjs";

test("canonical production contract and Supository catalog agree", () => {
  const { contract, catalog } = validateProductionContract();
  assert.equal(contract.repository, "DataNest-Supository/DataNest");
  assert.equal(contract.branch, "main");
  assert.equal(contract.deployment.defaultMode, "authorized");
  assert.deepEqual(contract.supabase.expectedMigration, {
    head: "20261001142117",
    name: "certification_business_bank_settlement_launch"
  });
  assert.equal(catalog.canonicalRepository, contract.repository);
  assert.equal(catalog.canonicalPublicUrl, "https://datanest-supository.github.io/DataNest/");
});
