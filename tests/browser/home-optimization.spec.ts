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
  expect(await page.locator(".resonanceRipple").evaluate(el => getComputedStyle(el).animationName)).toBe("none");
  expect(await page.locator(".intentFlowPacket").first().evaluate(el => getComputedStyle(el).animationName)).toBe("none");
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


test("dashboard follows workspace width when the AI rail is resized", async ({ page }) => {
  const projectId = "00000000-0000-4000-8000-000000000010";
  const userId = "00000000-0000-4000-8000-000000000001";

  await page.setViewportSize({ width: 1800, height: 1000 });
  await page.route("**/runtime-config.js", route => route.fulfill({
    contentType: "application/javascript",
    body: "window.__DATANEST_CONFIG__={supabaseUrl:'https://fixture.supabase.co',supabasePublishableKey:'fixture-key',authoritative:true}"
  }));
  await page.addInitScript(({userId}) => {
    const encode = (data: unknown) => btoa(JSON.stringify(data)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    localStorage.setItem("sb-fixture-auth-token", JSON.stringify({
      access_token: `${encode({alg:"HS256",typ:"JWT"})}.${encode({sub:userId,exp:4102444800,role:"authenticated"})}.fixture`,
      refresh_token: "fixture", token_type:"bearer", expires_at:4102444800,
      user:{id:userId,aud:"authenticated",role:"authenticated",email:"fixture@example.invalid"}
    }));
    localStorage.setItem("datanest.aiSidebar.open", "true");
  }, {userId});
  await page.route("https://fixture.supabase.co/**", route => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = [];
    if (path.endsWith("/projects")) body = {id:projectId,slug:"resonance-datanest",name:"Fixture project",description:null,status:"ACTIVE"};
    if (path.endsWith("/project_members")) body = {project_id:projectId,user_id:userId,role:"viewer",status:"active"};
    if (path.endsWith("/get_project_dashboard_summary")) body = {total_jobs:20,active_jobs:5,running_jobs:1,blocked_jobs:2};
    if (path.endsWith("/jobs")) body = [
      {id:"1",job_number:1,title:"Fixture job",description:null,priority:50,status:"RUNNING",required_capabilities:[],acceptance:{},created_at:"2026-09-26T00:15:00Z",updated_at:"2026-09-26T00:15:00Z"},
      {id:"2",job_number:2,title:"Fixture complete",description:null,priority:40,status:"COMPLETED",required_capabilities:[],acceptance:{},created_at:"2026-09-25T23:45:00Z",updated_at:"2026-09-25T23:45:00Z"}
    ];
    return route.fulfill({contentType:"application/json",body:JSON.stringify(body)});
  });

  await page.goto(appPath);
  await expect(page.getByRole("button", {name:"Hide AI"})).toBeVisible();
  await expect(page.locator(".externalAiDock")).toBeVisible();
  await expect(page.locator(".resonanceHome .aiIHero")).toBeVisible();

  const readLayout = () => page.evaluate(() => {
    const rect = (selector:string) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) throw new Error("Missing "+selector);
      const box = element.getBoundingClientRect();
      return {x:box.x,y:box.y,width:box.width,height:box.height,right:box.right,bottom:box.bottom};
    };
    return {
      main: rect(".mainPane"),
      content: rect(".contentPane"),
      hero: rect(".resonanceHome .aiIHero"),
      copy: rect(".resonanceHome .aiIHeroCopy"),
      core: rect(".resonanceHome .aiICoreStage"),
      dock: rect(".externalAiDock"),
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth
    };
  });

  const wide = await readLayout();
  expect(wide.main.width).toBeGreaterThan(980);
  expect(wide.core.x).toBeLessThan(wide.copy.x);
  expect(wide.hero.x).toBeGreaterThanOrEqual(wide.content.x - 1);
  expect(wide.hero.right).toBeLessThanOrEqual(wide.content.right + 1);
  expect(wide.scrollWidth).toBeLessThanOrEqual(wide.viewportWidth);

  const widen = page.getByRole("button", {name:"Widen AI sidebar"});
  for (let index = 0; index < 7; index += 1) await widen.click();

  const narrow = await readLayout();
  // Allow border/subpixel rounding around the 760px rail target.
  expect(narrow.dock.width).toBeGreaterThanOrEqual(755);
  expect(narrow.main.width).toBeLessThanOrEqual(980);
  expect(narrow.core.y).toBeGreaterThanOrEqual(narrow.copy.bottom - 2);
  expect(narrow.hero.x).toBeGreaterThanOrEqual(narrow.content.x - 1);
  expect(narrow.hero.right).toBeLessThanOrEqual(narrow.content.right + 1);
  expect(narrow.scrollWidth).toBeLessThanOrEqual(narrow.viewportWidth);
});


test("AI & I hero animates a coordinated intent-to-amplification loop", async ({ page }) => {
  await page.goto(appPath);
  await expect(page.getByLabel("Email")).toBeVisible();

  const visual = page.getByLabel("AI and human collaboration visualization");
  await expect(visual).toBeVisible();
  await expect(visual.locator(".intentFlowPacket")).toHaveCount(2);
  await expect(visual.locator(".amplifyFlowPacket")).toHaveCount(1);
  await expect(visual.locator(".feedbackFlowPacket")).toHaveCount(1);
  await expect(visual.locator(".resonanceRipple")).toHaveCount(1);

  const motion = await visual.evaluate(element => {
    const style = (selector:string) => {
      const node = element.querySelector(selector);
      if (!(node instanceof HTMLElement)) throw new Error("Missing "+selector);
      return getComputedStyle(node);
    };
    return {
      outerDuration: style(".orbitOuter").animationDuration,
      middleDuration: style(".orbitMiddle").animationDuration,
      intentAnimation: style(".intentFlowPacket").animationName,
      amplificationAnimation: style(".amplifyFlowPacket").animationName,
      feedbackAnimation: style(".feedbackFlowPacket").animationName,
      rippleAnimation: style(".resonanceRipple").animationName
    };
  });

  expect(motion.outerDuration).toBe("28s");
  expect(motion.middleDuration).toBe("34s");
  expect(motion.intentAnimation).toContain("intentToCore");
  expect(motion.amplificationAnimation).toContain("coreToAi");
  expect(motion.feedbackAnimation).toContain("aiFeedback");
  expect(motion.rippleAnimation).toContain("resonanceRipple");
});
