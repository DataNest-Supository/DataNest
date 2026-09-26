import { expect, test } from "@playwright/test";

test.use({ timezoneId: "America/Los_Angeles" });

const appPath = process.env.DATANEST_APP_PATH || "/";

test("entry fits narrow and desktop screens and keeps sign-in usable", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(appPath);
  await expect(page.getByLabel("Email")).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("heading", { name: "Your intent. Amplified." })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByLabel("Email").fill("layout@example.invalid");
    await expect(page.getByLabel("Email")).toHaveValue("layout@example.invalid");
  }
  expect(errors).toEqual([]);
});

test("keyboard skip link reaches email and motion preference persists", async ({ page }) => {
  await page.goto(appPath);
  await expect(page.getByLabel("Email")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to sign in" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Email")).toBeFocused();
  const motion = page.getByRole("button", { name: "Pause animations" });
  await motion.click();
  await expect(motion).toHaveAttribute("aria-pressed", "true");
  expect(await page.locator(".orbitOuter").evaluate(el => getComputedStyle(el).animationPlayState)).toBe("paused");
  await page.reload();
  await expect(motion).toHaveAttribute("aria-pressed", "true");
  await motion.click();
  await expect(motion).toHaveAttribute("aria-pressed", "false");
});

test("entry respects system reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(appPath);
  await expect(page.getByLabel("Email")).toBeVisible();
  expect(await page.locator(".orbitOuter").evaluate(el => getComputedStyle(el).animationName)).toBe("none");
});

test("dashboard labels its sample and groups UTC days independently of local timezone", async ({ page }) => {
  // Isolated browser fixture: no real account or backend operations.
  const projectId = "00000000-0000-4000-8000-000000000010";
  const userId = "00000000-0000-4000-8000-000000000001";
  await page.clock.setFixedTime(new Date("2026-09-26T12:00:00Z"));
  await page.route("**/runtime-config.js", route => route.fulfill({ contentType: "application/javascript", body: "window.__DATANEST_CONFIG__={supabaseUrl:'https://fixture.supabase.co',supabasePublishableKey:'fixture-key',authoritative:true}" }));
  await page.addInitScript(({userId}) => {
    const encode = (data: unknown) => btoa(JSON.stringify(data)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    localStorage.setItem("sb-fixture-auth-token", JSON.stringify({
      access_token: `${encode({alg:"HS256",typ:"JWT"})}.${encode({sub:userId,exp:4102444800,role:"authenticated"})}.fixture`,
      refresh_token: "fixture", token_type:"bearer", expires_at:4102444800,
      user:{id:userId,aud:"authenticated",role:"authenticated",email:"fixture@example.invalid"}
    }));
  }, {userId});
  await page.route("https://fixture.supabase.co/**", route => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = [];
    if (path.endsWith("/projects")) body = {id:projectId,slug:"resonance-datanest",name:"Fixture project",description:null,status:"ACTIVE"};
    if (path.endsWith("/project_members")) body = {project_id:projectId,user_id:userId,role:"viewer",status:"active"};
    if (path.endsWith("/get_project_dashboard_summary")) body = {total_jobs:20,active_jobs:5,running_jobs:1,blocked_jobs:2};
    if (path.endsWith("/jobs")) body = [
      {id:"1",status:"RUNNING",created_at:"2026-09-26T00:15:00Z"},
      {id:"2",status:"COMPLETED",created_at:"2026-09-25T23:45:00Z"}
    ];
    return route.fulfill({contentType:"application/json",body:JSON.stringify(body)});
  });
  await page.goto(appPath);
  await expect(page.getByRole("heading", {name:"Recent creation signal"})).toBeVisible();
  await expect(page.getByText("LOADED SNAPSHOT · UTC")).toBeVisible();
  await expect(page.getByRole("img", {name:/Loaded jobs created/})).toHaveAttribute("aria-label", /2026-09-25 1, 2026-09-26 1/);
  await expect(page.locator(".pulseAxis b")).toHaveText(["0","0","0","0","0","1","1"]);
  await expect(page.getByText(/2 latest loaded jobs/)).toBeVisible();
  await expect(page.getByRole("button", {name:"Viewer mode"})).toBeDisabled();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
