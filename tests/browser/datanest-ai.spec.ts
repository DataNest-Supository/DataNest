import { expect, test } from "@playwright/test";

async function signIn(page:import("@playwright/test").Page){
  const email=process.env.DATANEST_AI_E2E_EMAIL;
  const password=process.env.DATANEST_AI_E2E_PASSWORD;
  if(!email||!password)throw new Error("DATANEST_AI_E2E_EMAIL and DATANEST_AI_E2E_PASSWORD are required.");

  await page.goto(process.env.DATANEST_APP_PATH||"/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button",{name:"Sign in"}).click();
  await expect(
    page.getByRole("button",{name:"DataNest AI",exact:true})
  ).toBeVisible({timeout:15000});
}

test("human input is traced and remains uncertified",async({page})=>{
  await signIn(page);
  await page.getByRole("button",{name:"DataNest AI",exact:true}).click();
  await expect(page.getByText("DataNest AI E2E Job",{exact:true}).first()).toBeVisible();
  await page.getByText("DataNest AI E2E Job",{exact:true}).first().click();

  const message="Keep DataNest AI trace IDs visible on every governed turn.";
  await page.getByPlaceholder(/Enter development input/i).fill(message);
  await page.getByRole("button",{name:"Send to DataNest AI"}).click();

  await expect(page.getByText(message,{exact:true})).toBeVisible();
  await expect(page.getByText("UNCERTIFIED",{exact:true}).last()).toBeVisible();
  await expect(page.getByText(/DN-AI-/).last()).toBeVisible();
  await expect(page.getByLabel("Certified Memory")).toBeVisible();
  await expect(page.getByLabel("Learning & Certification")).toBeVisible();
});

test("AI Companion return becomes uncertified evidence in the selected Job",async({page})=>{
  await signIn(page);
  await page.getByRole("button",{name:"DataNest AI",exact:true}).click();
  await expect(page.getByText("DataNest AI E2E Job",{exact:true}).first()).toBeVisible();
  await page.getByText("DataNest AI E2E Job",{exact:true}).first().click();

  await page.getByRole("button",{name:"AI Sidebar"}).click();
  await expect(page.getByText("RETURN TO DATANEST")).toBeVisible();

  page.on("popup",popup=>void popup.close());
  await page.getByRole("button",{name:"Open companion + load prompt"}).click();
  await expect(page.getByText("COMPANION · READY",{exact:true})).toBeVisible();

  const companionResult="AI Companion E2E evidence: preserve traceability before project-wide learning.";
  await page.getByPlaceholder(/External AI response will appear here/i).fill(companionResult);
  await page.getByRole("button",{name:"Import to DataNest"}).click();
  await expect(page.getByText(/staged as UNCERTIFIED evidence/i)).toBeVisible();

  await page.getByRole("button",{name:"Hide AI Sidebar"}).click();
  await expect(page.getByText(companionResult,{exact:true})).toBeVisible();
  await expect(page.getByText("UNCERTIFIED",{exact:true}).last()).toBeVisible();
});


test("Think Tanks expose project-scoped collaboration and reviewed-memory boundaries",async({page})=>{
  await signIn(page);
  await page.getByRole("button",{name:"Think Tanks",exact:true}).click();

  await expect(page.getByText("THINK TANKS + DATANEST AI",{exact:true})).toBeVisible();
  await expect(page.getByText("Discuss → Ask → Decide → Act → Review → Remember",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Project Commons",exact:true})).toBeVisible();
  await expect(page.getByText(/Project-wide discussion; link a channel to a Job to invoke DataNest AI/)).toBeVisible();
  await expect(page.getByText(/reusable learning reaches project memory only after independent human review/i)).toBeVisible();
});


test("Sparks workspace exposes internal utility boundaries",async({page})=>{
  await signIn(page);
  await page.getByRole("button",{name:"Sparks",exact:true}).click();

  await expect(page.getByText("SPARKS · INTERNAL UTILITY",{exact:true})).toBeVisible();
  await expect(page.getByText("Earned contribution utility, not money",{exact:true})).toBeVisible();
  await expect(page.getByText(/cannot be bought for cash, redeemed for cash, transferred peer-to-peer, traded/i)).toBeVisible();
  await expect(page.getByText(/platform spending is disabled in v1/i)).toBeVisible();
  await expect(page.getByText(/Ledger entries are append-only/i)).toBeVisible();
});


test("Sovereign Governance exposes project-scoped governance boundaries",async({page})=>{
  await signIn(page);
  await page.getByRole("button",{name:"Governance",exact:true}).click();

  await expect(page.getByText("RESONANCE SOVEREIGN GOVERNANCE",{exact:true})).toBeVisible();
  await expect(page.getByText("Transparent project governance with immutable decision history",{exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"No human-ratified protocol",exact:true})).toBeVisible();
  await expect(page.getByText(/has not invented mission, vision or governance text on your behalf/i)).toBeVisible();
  await expect(page.getByText(/do not amend signed agreements, create legal ownership, create royalty entitlements, grant project roles or create financial authority/i)).toBeVisible();
});


test("Governance exposes governed project membership and non-voter pending state",async({page})=>{
  await signIn(page);
  await page.getByRole("button",{name:"Governance",exact:true}).click();

  await expect(page.getByText("FORMAL MEMBERSHIP",{exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Project members + governance voters",exact:true})).toBeVisible();
  await expect(page.getByText(/Sending an invitation never creates an independent vote by itself/i)).toBeVisible();
  await expect(page.getByText(/1 ACTIVE VOTER/)).toBeVisible();
  await expect(page.getByText(/acceptance requires the matching authenticated account/i)).toBeVisible();
});
