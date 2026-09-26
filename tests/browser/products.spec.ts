import { expect, test } from "@playwright/test";

const appPath = process.env.DATANEST_APP_PATH || "/";

test("Products presents the governed catalog and opens the Legal Eagle concept preview on demand", async ({ page }) => {
  const projectId = "00000000-0000-4000-8000-000000000010";
  const userId = "00000000-0000-4000-8000-000000000001";

  await page.route("**/runtime-config.js", route => route.fulfill({
    contentType: "application/javascript",
    body: "window.__DATANEST_CONFIG__={supabaseUrl:'https://fixture.supabase.co',supabasePublishableKey:'fixture-key',authoritative:true}"
  }));

  await page.addInitScript(({userId}) => {
    const encode = (data: unknown) => btoa(JSON.stringify(data)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    localStorage.setItem("sb-fixture-auth-token", JSON.stringify({
      access_token: `${encode({alg:"HS256",typ:"JWT"})}.${encode({sub:userId,exp:4102444800,role:"authenticated"})}.fixture`,
      refresh_token: "fixture",
      token_type: "bearer",
      expires_at: 4102444800,
      user:{id:userId,aud:"authenticated",role:"authenticated",email:"fixture@example.invalid"}
    }));
  }, {userId});

  await page.route("https://fixture.supabase.co/**", route => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = [];
    if (path.endsWith("/projects")) body = {id:projectId,slug:"resonance-datanest",name:"Fixture project",description:null,status:"ACTIVE",created_at:"2026-09-26T00:00:00Z"};
    if (path.endsWith("/project_members")) body = {project_id:projectId,user_id:userId,role:"viewer",status:"active"};
    if (path.endsWith("/get_project_dashboard_summary")) body = {total_jobs:0,active_jobs:0,running_jobs:0,blocked_jobs:0,available_capabilities:0,registered_capabilities:0};
    return route.fulfill({contentType:"application/json",body:JSON.stringify(body)});
  });

  await page.goto(appPath+"?view=products");

  await expect(page.getByRole("heading", {name:"Products that carry their architecture, evidence and decisions with them."})).toBeVisible();
  await expect(page.getByText("Product Concept Incubator", {exact:true})).toBeVisible();
  await expect(page.getByRole("heading", {name:"Assistance with a human at the centre."})).toBeHidden();

  await page.locator("details.conceptIncubator > summary").click();

  await expect(page.getByRole("heading", {name:"Assistance with a human at the centre."})).toBeVisible();
  await expect(page.getByRole("heading", {name:"Resonance Assistance"}).first()).toBeVisible();
  await expect(page.getByRole("heading", {name:"Legal Eagle"})).toBeVisible();
  await expect(page.getByText("Designed to assist—not represent.")).toBeVisible();
  await expect(page.getByText("NO LEGAL CONCLUSION GENERATED")).toBeVisible();

  await page.getByRole("button", {name:"Build a matter timeline"}).click();
  await expect(page.getByText("Turn my notes and documents into a clear legal-event timeline.")).toBeVisible();
  await expect(page.getByText(/Mark disputed, missing or unverified facts/)).toBeVisible();

  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
