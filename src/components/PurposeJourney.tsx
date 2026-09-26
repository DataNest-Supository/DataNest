"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import styles from "./PurposeJourney.module.css";

const steps = [
  { key: "thinktank", label: "Discover", verb: "Make room for perspectives.", description: "Bring your intent to Think Tanks. Compare ideas, gather evidence, and invite human review before deciding what to carry forward.", outcome: "Ideas with evidence you can inspect.", action: "Explore Think Tanks", glyph: "◈" },
  { key: "governance", label: "Govern", verb: "Choose with shared understanding.", description: "Read the protocol, consider proposals, and trace decisions. Your project role determines which actions are available.", outcome: "A decision with its reasoning and review history.", action: "Review governance", glyph: "◆" },
  { key: "products", label: "Build", verb: "Turn direction into a shared product.", description: "Explore Resonance products, their architecture, and the evidence behind them. Use Product Lab to inspect a surface before release.", outcome: "A product direction connected to its controls and evidence.", action: "Explore products", glyph: "◉" },
  { key: "unifi", label: "Execute", verb: "Give the next step a shape.", description: "Use UNIFI Planner to define work and acceptance criteria, then follow its progress in TranScheduler.", outcome: "A plan with a clear definition of done.", action: "Open UNIFI Planner", glyph: "◇" },
  { key: "transparency", label: "Verify", verb: "Understand the evidence behind progress.", description: "Review published audits, methods, and findings in Transparency. Follow the evidence and its stated limits before drawing a conclusion.", outcome: "An informed view of what has and has not been verified.", action: "Review transparency", glyph: "◎" }
] as const;

type Destination = typeof steps[number]["key"];

export default function PurposeJourney({ onNavigate }: { onNavigate: (view: Destination) => void }) {
  const [selected, setSelected] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const step = steps[selected];

  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % steps.length;
    else if (event.key === "ArrowLeft") next = (index + steps.length - 1) % steps.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = steps.length - 1;
    else return;
    event.preventDefault();
    setSelected(next);
    tabs.current[next]?.focus();
    tabs.current[next]?.scrollIntoView({block:"nearest",inline:"nearest",behavior:"instant"});
  }

  return <section className={styles.journey} aria-labelledby="purpose-journey-title">
    <div className={styles.intro}>
      <div><p className="eyebrow">YOUR PURPOSE, IN PRACTICE</p><h3 id="purpose-journey-title">Find your next meaningful step.</h3></div>
      <p>Explore the path at your own pace. Start wherever you need.</p>
    </div>
    <div className={styles.tabs} role="tablist" aria-label="From discovery to verification">
      {steps.map((item, index) => <button
        key={item.key}
        ref={element => { tabs.current[index] = element; }}
        id={"purpose-tab-" + item.key}
        type="button"
        role="tab"
        aria-selected={selected === index}
        aria-controls={"purpose-panel-" + item.key}
        tabIndex={selected === index ? 0 : -1}
        onClick={() => setSelected(index)}
        onKeyDown={event => move(event, index)}
      ><span className={styles.number} aria-hidden="true">0{index + 1}</span><b>{item.label}</b><span className={styles.glyph} aria-hidden="true">{item.glyph}</span></button>)}
    </div>
    {steps.map((item, index) => <div
      key={item.key}
      id={"purpose-panel-" + item.key}
      role="tabpanel"
      aria-labelledby={"purpose-tab-" + item.key}
      hidden={selected !== index}
      className={styles.panel}
      tabIndex={0}
    >
      <div className={styles.copy}><h4>{item.verb}</h4><p>{item.description}</p><small><span aria-hidden="true">↳ </span>{item.outcome}</small></div>
      <button className={styles.open} type="button" onClick={() => onNavigate(item.key)}>{item.action}<span aria-hidden="true"> →</span></button>
    </div>)}
    <div className={styles.footer}><span>Human direction · AI collaboration · Traceable decisions</span><span aria-hidden="true">{selected + 1} / {steps.length} · {step.label}</span></div>
  </section>;
}
