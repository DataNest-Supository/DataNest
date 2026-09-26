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


test("workflow shell guides execution forward and preserves browser history", async ({ page }) => {
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
      refresh_token: "fixture", token_type:"bearer", expires_at:4102444800,
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

  await page.goto(appPath+"?view=unifi");
  await expect(page.locator(".topbar h1")).toHaveText("UNIFI Planner");
  await expect(page.locator(".topbar .eyebrow")).toContainText("EXECUTE");
  await expect(page.getByText(/Suggested next: TranScheduler/)).toBeVisible();

  const aiNav = page.locator(".navGroup button.aiHeroNav", {hasText:"DataNest AI"});
  await expect(aiNav).toBeVisible();
  expect(await aiNav.evaluate(el => getComputedStyle(el, "::after").content)).toContain("CORE");

  await page.getByRole("button", {name:"Continue · TranScheduler →"}).click();
  await expect(page).toHaveURL(/\?view=scheduler/);
  await expect(page.locator(".topbar h1")).toHaveText("TranScheduler");
  await expect(page.getByRole("button", {name:"← UNIFI Planner"})).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\?view=unifi/);
  await expect(page.locator(".topbar h1")).toHaveText("UNIFI Planner");
});


test("dashboard recommends operational attention from live project state", async ({ page }) => {
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
      refresh_token: "fixture", token_type:"bearer", expires_at:4102444800,
      user:{id:userId,aud:"authenticated",role:"authenticated",email:"fixture@example.invalid"}
    }));
  }, {userId});

  await page.route("https://fixture.supabase.co/**", route => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = [];
    if (path.endsWith("/projects")) body = {id:projectId,slug:"resonance-datanest",name:"Fixture project",description:null,status:"ACTIVE",created_at:"2026-09-26T00:00:00Z"};
    if (path.endsWith("/project_members")) body = {project_id:projectId,user_id:userId,role:"viewer",status:"active"};
    if (path.endsWith("/get_project_dashboard_summary")) body = {total_jobs:7,active_jobs:3,running_jobs:0,blocked_jobs:2,available_capabilities:2,registered_capabilities:3};
    return route.fulfill({contentType:"application/json",body:JSON.stringify(body)});
  });

  await page.goto(appPath);
  await expect(page.getByText("STATE-AWARE")).toBeVisible();
  await expect(page.getByText(/Suggested next: TranScheduler · 2 blocked Jobs need scheduling attention/)).toBeVisible();
  await page.getByRole("button", {name:"Continue · TranScheduler →"}).click();
  await expect(page).toHaveURL(/\?view=scheduler/);
  await expect(page.locator(".topbar h1")).toHaveText("TranScheduler");
});

async function openJourneyFixture(page: import('@playwright/test').Page) {
  const projectId = "00000000-0000-4000-8000-000000000010";
  const userId = "00000000-0000-4000-8000-000000000001";
  await page.route("**/runtime-config.js", route => route.fulfill({contentType:"application/javascript",body:"window.__DATANEST_CONFIG__={supabaseUrl:'https://fixture.supabase.co',supabasePublishableKey:'fixture-key',authoritative:true}"}));
  await page.addInitScript(({userId}) => {
    const encode = (data: unknown) => btoa(JSON.stringify(data)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
    localStorage.setItem("sb-fixture-auth-token", JSON.stringify({access_token:`${encode({alg:"HS256",typ:"JWT"})}.${encode({sub:userId,exp:4102444800,role:"authenticated"})}.fixture`,refresh_token:"fixture",token_type:"bearer",expires_at:4102444800,user:{id:userId,aud:"authenticated",role:"authenticated",email:"fixture@example.invalid"}}));
  }, {userId});
  await page.route("https://fixture.supabase.co/**", route => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = [];
    if(path.endsWith("/projects")) body={id:projectId,slug:"resonance-datanest",name:"Journey fixture",description:null,status:"ACTIVE"};
    if(path.endsWith("/project_members")) body={project_id:projectId,user_id:userId,role:"viewer",status:"active"};
    if(path.endsWith("/get_project_dashboard_summary")) body={total_jobs:0,active_jobs:0,running_jobs:0,blocked_jobs:0};
    return route.fulfill({contentType:"application/json",body:JSON.stringify(body)});
  });
  await page.goto(appPath);
  await expect(page.getByRole("heading",{name:"Find your next meaningful step."})).toBeVisible();
}

test("purpose guide previews each stage and opens the correct workspace without mutations", async ({page}) => {
  await openJourneyFixture(page);
  const mutations: string[]=[];
  page.on("request", request => {
    if(request.method()==="POST" && /\/rpc\/(create_|cast_|ratify_|close_|update_)/.test(request.url())) mutations.push(request.url());
  });
  for(const [label, action, view, title] of [
    ["Discover","Explore Think Tanks","thinktank","Think Tanks"],
    ["Govern","Review governance","governance","Governance"],
    ["Build","Explore products","products","Products"],
    ["Execute","Open UNIFI Planner","unifi","UNIFI Planner"],
    ["Verify","Review transparency","transparency","Transparency"]
  ]) {
    await page.getByRole("tab",{name:label,exact:true}).click();
    await expect(page.getByRole("tabpanel")).toHaveCount(1);
    await expect(page).not.toHaveURL(/view=/);
    await page.getByRole("button",{name:action,exact:true}).click();
    await expect(page).toHaveURL(new RegExp("view="+view));
    await expect(page.getByRole("heading",{name:title,level:1,exact:true})).toBeFocused();
    await page.getByRole("button",{name:"← AI & I home"}).click();
    await expect(page.getByRole("heading",{name:"AI & I",level:1,exact:true})).toBeFocused();
  }
  expect(mutations).toEqual([]);
});

test("purpose guide supports keyboard, compact layouts, and browser history", async ({page}) => {
  await openJourneyFixture(page);
  await page.getByRole("tab",{name:"Discover",exact:true}).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab",{name:"Govern",exact:true})).toBeFocused();
  await expect(page.getByRole("tab",{name:"Govern",exact:true})).toHaveAttribute("aria-selected","true");
  await page.keyboard.press("End");
  await expect(page.getByRole("tab",{name:"Verify",exact:true})).toBeFocused();
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab",{name:"Discover",exact:true})).toBeFocused();
  for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:900});
    await expect(page.getByRole("button",{name:"Explore Think Tanks",exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.getByRole("button",{name:"Explore Think Tanks",exact:true}).click();
  await page.goBack();
  await expect(page.getByRole("heading",{name:"AI & I",level:1,exact:true})).toBeFocused();
  await page.goForward();
  await expect(page.getByRole("heading",{name:"Think Tanks",level:1,exact:true})).toBeFocused();
  await page.getByRole("button",{name:/Quick switch/}).click();
  await page.getByRole("searchbox",{name:"Search DataNest workspaces"}).fill("governance");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading",{name:"Governance",level:1,exact:true})).toBeFocused();
  await page.getByRole("button",{name:/Quick switch/}).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button",{name:/Quick switch/})).toBeFocused();
});

test("workspace arrivals honor paused and reduced motion without hiding content", async ({page}) => {
  await page.emulateMedia({reducedMotion:"reduce"});
  await openJourneyFixture(page);
  expect(await page.locator(".workspaceArrival").evaluate(el=>getComputedStyle(el).animationName)).toBe("none");
  await page.emulateMedia({reducedMotion:"no-preference"});
  await page.locator(".workspaceOptions > summary").click();
  await page.getByRole("button",{name:"Pause animations"}).click();
  await page.locator(".workspaceOptions > summary").click();
  await page.getByRole("tab",{name:"Execute",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Give the next step a shape."})).toBeVisible();
  await page.getByRole("button",{name:"Open UNIFI Planner",exact:true}).click();
  expect(await page.locator(".workspaceArrival").evaluate(el=>getComputedStyle(el).animationName)).toBe("none");
  expect(await page.locator(".workspaceArrival").evaluate(el=>getComputedStyle(el).opacity)).toBe("1");
});


test("empty operational workspaces offer direct recovery paths", async ({ page }) => {
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
      refresh_token: "fixture", token_type:"bearer", expires_at:4102444800,
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

  await page.goto(appPath+"?view=scheduler");
  await expect(page.getByRole("heading", {name:"No project jobs yet"})).toBeVisible();
  await page.getByRole("button", {name:"Open UNIFI Planner"}).click();
  await expect(page).toHaveURL(/\?view=unifi/);

  await page.goto(appPath+"?view=runs");
  await expect(page.getByRole("heading", {name:"No execution runs yet"})).toBeVisible();
  await page.getByRole("button", {name:"Open TranScheduler"}).click();
  await expect(page).toHaveURL(/\?view=scheduler/);

  await page.goto(appPath+"?view=checkpoints");
  await expect(page.getByRole("heading", {name:"No checkpoints yet"})).toBeVisible();
  await page.getByRole("button", {name:"Open Runs"}).click();
  await expect(page).toHaveURL(/\?view=runs/);

  await page.goto(appPath+"?view=audit");
  await expect(page.getByRole("heading", {name:"No audit events yet"})).toBeVisible();
  await page.getByRole("button", {name:"Open Checkpoints"}).click();
  await expect(page).toHaveURL(/\?view=checkpoints/);
});


test("specialist phase rail preserves lifecycle orientation", async ({ page }) => {
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
      refresh_token: "fixture", token_type:"bearer", expires_at:4102444800,
      user:{id:userId,aud:"authenticated",role:"authenticated",email:"fixture@example.invalid"}
    }));
  }, {userId});

  await page.route("https://fixture.supabase.co/**", route => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = [];
    if (path.endsWith("/projects")) body = {id:projectId,slug:"resonance-datanest",name:"Fixture project",description:null,status:"ACTIVE",created_at:"2026-09-26T00:00:00Z"};
    if (path.endsWith("/project_members")) body = {project_id:projectId,user_id:userId,role:"viewer",status:"active"};
    if (path.endsWith("/get_project_dashboard_summary")) body = {total_jobs:1,active_jobs:0,running_jobs:0,blocked_jobs:0,available_capabilities:0,registered_capabilities:0};
    return route.fulfill({contentType:"application/json",body:JSON.stringify(body)});
  });

  await page.goto(appPath+"?view=governance");
  const rail = page.getByRole("navigation", {name:"DataNest lifecycle phases"});
  await expect(rail).toBeVisible();
  await expect(page.getByRole("button", {name:"Govern phase · current"})).toHaveAttribute("aria-current","step");

  await page.getByRole("button", {name:"Go to Execute phase"}).click();
  await expect(page).toHaveURL(/\?view=unifi/);
  await expect(page.locator(".topbar h1")).toHaveText("UNIFI Planner");
  await expect(page.getByRole("button", {name:"Execute phase · current"})).toHaveAttribute("aria-current","step");

  await page.getByRole("button", {name:/AI CORE/}).click();
  await expect(page).toHaveURL(/\?view=ai/);
  await expect(page.locator(".topbar h1")).toHaveText("DataNest AI");
  await expect(page.getByRole("button", {name:/AI CORE/})).toHaveAttribute("aria-current","page");

  await page.setViewportSize({width:390,height:844});
  await expect(rail).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


// Integration gate: value-network capability nodes must remain subordinate to the DataNest AI core.
test("AI & I keeps DataNest AI at the core while governed products stay product nodes", async ({ page }) => {
  const projectId = "00000000-0000-4000-8000-000000000010";
  const userId = "00000000-0000-4000-8000-000000000001";
  const ronsasId = "24f2fa75-18b8-5b45-b624-b5dab381de9e";
  const aurumId = "00000000-0000-4000-8000-000000000777";

  await page.route("**/runtime-config.js", route => route.fulfill({
    contentType: "application/javascript",
    body: "window.__DATANEST_CONFIG__={supabaseUrl:'https://fixture.supabase.co',supabasePublishableKey:'fixture-key',authoritative:true}"
  }));
  await page.addInitScript(({userId}) => {
    const encode = (data: unknown) => btoa(JSON.stringify(data)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    localStorage.setItem("sb-fixture-auth-token", JSON.stringify({
      access_token: `${encode({alg:"HS256",typ:"JWT"})}.${encode({sub:userId,exp:4102444800,role:"authenticated"})}.fixture`,
      refresh_token:"fixture",token_type:"bearer",expires_at:4102444800,
      user:{id:userId,aud:"authenticated",role:"authenticated",email:"fixture@example.invalid"}
    }));
  }, {userId});

  const products = [
    {id:ronsasId,slug:"ronsas",name:"RONSAS",full_name:"Resonance Open Nova Application Suite",category:"sovereign application suite",lifecycle_status:"active development and integration",mission:"Governed suite",operating_model:"DataNest managed",primary_runtime:"Windows local environment",commercial_mode:"free promotion / no billing until pricing is established",billing_enabled:false,as_of_date:"2026-09-26",metadata:{execution_authority:"DataNest"}},
    {id:aurumId,slug:"aurum",name:"Aurum Naturals",full_name:"Resonance Aurum Naturals",category:"governed product",lifecycle_status:"active",mission:"Governed product",operating_model:"DataNest managed",primary_runtime:"managed",commercial_mode:"free promotion / no billing until pricing is established",billing_enabled:false,as_of_date:"2026-09-26",metadata:{execution_authority:"DataNest"}}
  ];
  const applications = Array.from({length:9},(_,index)=>({
    id:"00000000-0000-4000-8000-"+String(400+index).padStart(12,"0"),
    product_id:ronsasId,
    record_type:"application",
    code:"APP-"+String(index+1).padStart(2,"0"),
    name:"RONSAS App "+String(index+1),
    status:"active",
    sort_order:index+1,
    payload:{}
  }));

  await page.route("https://fixture.supabase.co/**", route => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = [];
    if(path.endsWith("/projects")) body={id:projectId,slug:"resonance-datanest",name:"Fixture project",description:null,status:"ACTIVE",created_at:"2026-09-26T00:00:00Z"};
    if(path.endsWith("/project_members")) body={project_id:projectId,user_id:userId,role:"viewer",status:"active"};
    if(path.endsWith("/get_project_dashboard_summary")) body={total_jobs:0,active_jobs:0,running_jobs:0,blocked_jobs:0,available_capabilities:0,registered_capabilities:0};
    if(path.endsWith("/jobs")) body=[];
    if(path.endsWith("/products")) body=products;
    if(path.endsWith("/product_records")) body=applications;
    return route.fulfill({contentType:"application/json",body:JSON.stringify(body)});
  });

  await page.setViewportSize({width:1440,height:900});
  await page.goto(appPath);

  const visual=page.locator(".resonanceHome .aiICoreStage");
  await expect(visual.getByText("DataNest AI",{exact:true})).toBeVisible();
  await expect(visual.locator("b").filter({hasText:/^RONSAS$/})).toBeVisible();
  await expect(visual.getByText("Aurum Naturals",{exact:true})).toBeVisible();
  await expect(visual.getByText("9 applications",{exact:true})).toBeVisible();
  await expect(visual.getByText("0 applications",{exact:true})).toBeVisible();
  await expect(visual.getByText("GOVERNED PRODUCT",{exact:true})).toHaveCount(0);
  await expect(visual).toHaveAttribute("aria-label",/DataNest AI core.*RONSAS, 9 applications.*Aurum Naturals, 0 applications/);

  const network=visual.getByLabel("Resonance DataNest value network");
  await expect(network).toBeVisible();
  for(const label of ["Governed AI","Certified Memory","Traceable Collaboration","Sovereign App Suite"]){
    await expect(network.getByText(label,{exact:true})).toBeVisible();
  }
  expect(await network.locator("[data-signal='ai']").evaluate(el=>getComputedStyle(el).animationName)).not.toBe("none");
  expect(await network.locator("[data-signal='memory']").evaluate(el=>getComputedStyle(el).animationName)).not.toBe("none");
  expect(await network.locator("[data-signal='ronsas']").evaluate(el=>getComputedStyle(el).animationName)).not.toBe("none");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await network.evaluate(el=>getComputedStyle(el).getPropertyValue("--network-x").trim())).toBe("86px");
  expect(await network.evaluate(el=>getComputedStyle(el).getPropertyValue("--network-y").trim())).toBe("82px");

  await page.emulateMedia({reducedMotion:"reduce"});
  expect(await network.locator("[data-signal='ai']").evaluate(el=>getComputedStyle(el).animationName)).toBe("none");

  await visual.getByRole("button",{name:"Open Products"}).click();
  await expect(page).toHaveURL(/view=products/);
});
