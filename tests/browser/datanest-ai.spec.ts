import { expect, test } from "@playwright/test";

async function signIn(page:import("@playwright/test").Page){
  const email=process.env.DATANEST_AI_E2E_EMAIL;
  const password=process.env.DATANEST_AI_E2E_PASSWORD;
  if(!email||!password)throw new Error("DATANEST_AI_E2E_EMAIL and DATANEST_AI_E2E_PASSWORD are required.");

  await page.goto(process.env.DATANEST_APP_PATH||"/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button",{name:"Sign in"}).click();
  await expect(page.getByText("Resonance DataNest",{exact:true}).first()).toBeVisible();
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
  await expect(page.getByText(/READY/).last()).toBeVisible();

  const companionResult="AI Companion E2E evidence: preserve traceability before project-wide learning.";
  await page.getByPlaceholder(/External AI response will appear here/i).fill(companionResult);
  await page.getByRole("button",{name:"Import to DataNest"}).click();
  await expect(page.getByText(/staged as UNCERTIFIED evidence/i)).toBeVisible();

  await page.getByRole("button",{name:"Hide AI Sidebar"}).click();
  await expect(page.getByText(companionResult,{exact:true})).toBeVisible();
  await expect(page.getByText("UNCERTIFIED",{exact:true}).last()).toBeVisible();
});
