import test from "node:test";
import assert from "node:assert/strict";
import { createGame, actionsFor, perform, travel, travelCost, endWeek, parseSave, progress, netWorth, JOBS, GOALS, mixCoffee, serveCoffee, playOpponentWeek, raceOver, career } from "./engine.js";
import { CHARACTERS, COFFEE_RECIPES, INGREDIENTS } from "./characters.js";
import { ride, courierTarget } from "./engine.js";
import { CITY_SITES, canWalk, walkingRoute } from "./city-layout.js";
import { activityFor, activityStage } from "./city-activities.js";
import { CREATURES, creaturePortrait } from "./creatures.js";
import { characterArt } from "./art.js";
import { newsFor } from "./city-news.js";

test("news reflects applied weekly effects, persists without replaying rewards and migrates old saves", () => {
  const start = createGame(), { state } = endWeek(start, () => .25);
  assert.equal(state.cash, start.cash - start.rent + 90);
  assert.equal(state.happiness, start.happiness - 3 + 2);
  assert.equal(newsFor(state.news[0]).cash, 90);
  assert.equal(state.news[0].economy, state.economy);
  assert.deepEqual(parseSave(JSON.stringify(state)), state);
  const old = structuredClone(start); delete old.news;
  assert.deepEqual(parseSave(JSON.stringify(old)).news, []);
  const bad = structuredClone(state); bad.news[0].id = "constructor";
  assert.throws(() => parseSave(JSON.stringify(bad)));
});

test("resident and extra creature portraits preserve distinctive eyes across dialogue moods", () => {
  const portraits = new Set();
  for (const [id, design] of Object.entries(CREATURES)) {
    for (const mood of ["idle", "happy", "surprised"]) {
      const svg = creaturePortrait(id, mood);
      assert.equal([...svg.matchAll(/class="toon-eyes"/g)].length, design.eyes, `${id}: ${mood}`);
      assert.ok(svg.includes(`aria-label="${design.name}"`));
      assert.ok(svg.includes(`toon-${mood}`));
      assert.doesNotMatch(svg, /undefined|NaN|Infinity/);
    }
    portraits.add(creaturePortrait(id));
  }
  assert.equal(portraits.size, Object.keys(CREATURES).length);
  for (const [place, character] of Object.entries(CHARACTERS))
    assert.equal(characterArt(place, "happy"), creaturePortrait(character.creature, "happy"));
  assert.throws(() => creaturePortrait("constructor"));
  assert.throws(() => creaturePortrait("missing"));
});

test("every offered gameplay command and coffee control has an embodied activity", () => {
  const initial = createGame(), before = structuredClone(initial);
  for (const location of Object.keys(CHARACTERS)) {
    for (const job of [null, ...Object.keys(JOBS)]) {
      const state = { ...initial, location, job };
      for (const action of actionsFor(state)) {
        const clip = activityFor(action.id, location);
        if (action.id === "gig") assert.equal(clip.interactive, true);
        else {
          assert.ok(clip.pose && clip.prop, `${location}: ${action.id} has a pose and physical props`);
          assert.ok(clip.seconds > 0 && clip.seconds <= 5);
          assert.equal(activityStage(clip, 0).progress, 0);
          assert.equal(activityStage(clip, clip.seconds).progress, 1);
        }
      }
    }
  }
  for (const id of [...Object.keys(INGREDIENTS).map(id => `mix-${id}`), "mix-clear", "serve-coffee"])
    assert.ok(activityFor(id, "cafe").pose);
  assert.deepEqual(initial, before);
  assert.notEqual(activityFor("work", "cafe").pose, activityFor("friends", "cafe").pose);
  assert.notEqual(activityFor("work", "cafe").prop, activityFor("work", "office").prop);
});

test("activity stages finish at the exact duration and reject unknown commands or invalid time", () => {
  const clip = activityFor("friends", "cafe");
  assert.equal(activityStage(clip, clip.seconds / 3).label, clip.stages[1]);
  assert.equal(activityStage(clip, clip.seconds - .001).progress < 1, true);
  assert.deepEqual(activityStage(clip, clip.seconds + 10), { progress: 1, label: clip.stages[2] });
  for (const id of ["missing", "constructor", "talk-9", "apply-unknown"])
    assert.throws(() => activityFor(id, "cafe"), /אין סצנת ביצוע/);
  for (const time of [-1, NaN, Infinity]) assert.throws(() => activityStage(clip, time));
});

test("opponent replay is reproducible exclusively through legal actions and weekly settlement", () => {
  const initial = createGame("relaxed", true);
  const before = structuredClone(initial);
  const result = endWeek(initial, () => .5);
  assert.deepEqual(initial, before);
  let opponent = initial.opponent;
  for (const frame of result.state.rivalReplay) {
    let applied;
    if (frame.kind === "travel") applied = travel(opponent, frame.id);
    if (frame.kind === "action") applied = perform(opponent, frame.id);
    if (frame.kind === "settle") applied = endWeek(opponent, () => .5);
    if (applied) { assert.equal(applied.error, undefined); opponent = applied.state; }
    for (const key of ["location", "week", "hours", "cash", "energy", "food", "happiness", "education"])
      assert.equal(frame[key], opponent[key], `${frame.kind}: ${key}`);
    assert.equal(frame.career, career(opponent));
  }
  assert.deepEqual(opponent, result.state.opponent);
  assert.deepEqual(parseSave(JSON.stringify(result.state)), result.state);
  assert.equal(result.state.week, 2);
  assert.equal(result.state.opponent.week, 2);
  assert.equal(result.state.cash, 950);
});

for (const difficulty of ["relaxed", "classic"]) test(`${difficulty}: a legal opponent can finish first and freeze the race`, () => {
  let state = createGame(difficulty, true);
  for (let week = 0; week < 30 && !raceOver(state); week++) {
    const result = endWeek(state, () => .5);
    assert.equal(result.error, undefined);
    state = parseSave(JSON.stringify(result.state));
  }
  assert.equal(state.won, false);
  assert.equal(state.opponent.won, true);
  assert.ok(progress(state.opponent).every(goal => goal.percent === 100));
  for (const result of [travel(state, "cafe"), perform(state, "rest"), endWeek(state)]) {
    assert.ok(result.error);
    assert.equal(result.state, state);
  }
});

test("player victory does not give the opponent an extra turn", () => {
  const state = createGame("relaxed", true);
  Object.assign(state, { cash: 6000, happiness: 74, education: 3, job: "tech" });
  const result = perform(state, "rest");
  assert.equal(result.state.won, true);
  assert.deepEqual(result.state.opponent, state.opponent);
  assert.equal(endWeek(result.state).state, result.state);
  assert.throws(() => playOpponentWeek(state), /יריב/);
  state.cash += state.rent;
  const settlement = endWeek(state, () => .5);
  assert.equal(settlement.state.won, true);
  assert.deepEqual(settlement.state.opponent, state.opponent);
});

test("competition saves migrate and reject malformed or recursive opponent data", () => {
  const legacy = createGame("relaxed", true);
  delete legacy.opponent; delete legacy.rivalReplay;
  const migrated = parseSave(JSON.stringify(legacy));
  assert.equal(migrated.cash, legacy.cash);
  assert.equal(migrated.opponent.rival, false);
  const valid = endWeek(migrated, () => .5).state;
  const corruptions = [
    state => { state.opponent.rival = true; },
    state => { state.opponent.opponent = createGame(); },
    state => { state.opponent.cash = -1; },
    state => { state.opponent = null; },
    state => { state.rivalReplay[0].location = "missing"; },
    state => { state.rivalReplay[0].hours = 100; },
    state => { state.rivalReplay[0].message = null; },
    state => { state.rivalReplay = Array(143).fill(state.rivalReplay[0]); }
  ];
  for (const corrupt of corruptions) {
    const state = structuredClone(valid); corrupt(state);
    assert.throws(() => parseSave(JSON.stringify(state)));
  }
});

test("city routes reach every entrance without crossing building collision or world bounds", () => {
  const starts = [...CITY_SITES.map(site => ({ x: site.x, z: site.doorZ })), { x: 28, z: 30 }, { x: -28, z: -30 }];
  for (const start of starts) for (let index = 0; index < CITY_SITES.length; index++) {
    let from = start;
    for (const to of walkingRoute(start, index)) {
      for (let sample = 0; sample <= 100; sample++) {
        const ratio = sample / 100;
        assert.ok(canWalk(from.x + (to.x - from.x) * ratio, from.z + (to.z - from.z) * ratio));
      }
      from = to;
    }
    assert.deepEqual(from, { x: CITY_SITES[index].x, z: CITY_SITES[index].doorZ });
  }
  assert.equal(canWalk(0, -20), false);
  assert.equal(canWalk(40, 0), false);
  assert.equal(canWalk(7, 0, true), false);
  assert.equal(canWalk(0, 4, true), true);
});

test("courier must collect and reach the customer before being paid once", () => {
  const initial = createGame();
  initial.location = "park";
  assert.ok(perform(initial, "gig", 1000).error);
  initial.inventory.bike = true;
  let s = perform(initial, "gig", 1000).state;
  assert.equal(s.cash, initial.cash);
  assert.equal(s.experience, 0);
  assert.equal(s.hours, initial.hours - 3);
  assert.ok(travel(s, "home").error);
  assert.ok(endWeek(s).error);
  let now = 1000;
  function approach(x, y) {
    for (let i = 0; i < 800 && s.courier; i++) {
      const o = s.courier;
      if (Math.hypot(x-o.x,y-o.y) < .08) break;
      const desired = Math.atan2(x-o.x,o.y-y);
      const diff = Math.atan2(Math.sin(desired-o.angle), Math.cos(desired-o.angle));
      const steer = Math.abs(diff) > .04 ? Math.sign(diff) : 0;
      s = ride(s,{ dt:.04, steer, throttle:Math.abs(diff) < .15 ? 1 : 0 }, now += 40).state;
    }
  }
  function brakeAndInteract() {
    for (let i=0;i<12;i++) s = ride(s,{ dt:.04, steer:0, throttle:-1 }, now += 40).state;
    s = ride(s,{ dt:0, steer:0, throttle:0, interact:true }, now).state;
  }
  approach(2,0);
  assert.equal(s.courier.picked, false);
  assert.equal(ride(s,{dt:0,steer:0,throttle:0,interact:true},now).state.courier.picked,false);
  brakeAndInteract();
  assert.equal(s.courier.picked, true);
  s = parseSave(JSON.stringify(s));
  const target = courierTarget(s.courier);
  approach(6,0);
  approach(6,4);
  approach(target.x,target.y);
  assert.equal(s.cash,initial.cash);
  brakeAndInteract();
  assert.equal(s.cash, initial.cash + 220);
  assert.equal(s.experience, 3);
  assert.equal(s.courier, null);
  assert.ok(ride(s, "right", 30999).error);
});

test("abandoning or reaching the exact deadline after reload gives no reward", () => {
  const s = createGame();
  s.location = "park";
  s.inventory.bike = true;
  const active = parseSave(JSON.stringify(perform(s, "gig", 1000).state));
  for (const [command, now] of [["cancel", 1001], ["timeout", 61000]]) {
    const result = ride(active, command, now).state;
    assert.equal(result.courier, null);
    assert.equal(result.cash, s.cash);
    assert.equal(result.experience, 0);
  }
});

test("travel uses shortest ring distance, bikes reduce it, and invalid travel is atomic", () => {
  const s = createGame();
  assert.equal(travelCost(s, "home"), 0);
  assert.equal(travelCost(s, "gym"), 1);
  assert.equal(travelCost(s, "bank"), 5);
  const bikeState = { ...s, inventory: { ...s.inventory, bike: true } };
  assert.equal(travelCost(bikeState, "bank"), 3);
  const exhausted = { ...s, hours: 0 };
  assert.equal(travel(exhausted, "cafe").state, exhausted);
  assert.ok(travel(exhausted, "cafe").error);
  assert.ok(travel(s, "missing").error);
  const moved = travel(s, "cafe").state;
  assert.equal(moved.hours, 59);
  assert.equal(s.hours, 60);
  assert.equal(s.location, "home");
});

test("hiring, wages and experience follow job requirements", () => {
  let s = travel(createGame(), "cafe").state;
  s = perform(s, "apply-cafe").state;
  assert.equal(s.job, "cafe");
  const result = perform(s, "work");
  assert.equal(result.state.cash, 1670);
  assert.equal(result.state.experience, 6);
  assert.equal(result.state.energy, 56);
  s = travel(result.state, "office").state;
  assert.ok(perform(s, "apply-office").error);
  assert.equal(perform(s, "apply-office").state, s);
  const qualified = { ...s, education: 1, experience: 12 };
  assert.equal(perform(qualified, "apply-office").state.job, "office");
});

test("unaffordable, exhausted, hungry, out-of-time and out-of-place actions make no changes", () => {
  const cafe = { ...createGame(), location: "cafe", job: "cafe" };
  for (const [patch, id] of [[{ cash: 0 }, "meal"], [{ energy: 10 }, "work"], [{ food: 14 }, "work"], [{ hours: 5 }, "work"], [{}, "laptop"]]) {
    const s = { ...cafe, ...patch };
    const before = JSON.stringify(s);
    assert.ok(perform(s, id).error);
    assert.equal(JSON.stringify(s), before);
    assert.equal(perform(s, id).state, s);
  }
  const boundary = { ...cafe, energy: 33, food: 15, hours: 6 };
  assert.equal(perform(boundary, "work").state.energy, 5);
  assert.equal(perform(boundary, "work").state.hours, 0);
});

test("four lessons award a qualification and mixed online study has the same progress", () => {
  let s = { ...createGame(), location: "college", lessons: 2 };
  s = perform(s, "study").state;
  assert.equal(s.education, 0);
  assert.equal(s.lessons, 3);
  s.location = "home";
  assert.ok(perform(s, "online").error);
  s.inventory.laptop = true;
  s = perform(s, "online").state;
  assert.equal(s.education, 1);
  assert.equal(s.lessons, 0);
});

test("modern purchases unlock real earning actions, without duplicate purchases", () => {
  let s = { ...createGame(), location: "shop", cash: 5000, education: 2 };
  s = perform(s, "laptop").state;
  assert.ok(perform(s, "laptop").error);
  s = perform(s, "bike").state;
  s = travel(s, "home").state;
  const freelance = perform(s, "freelance");
  assert.equal(freelance.state.cash - s.cash, 560);
  assert.equal(freelance.state.experience, 4);
  assert.ok(actionsFor({ ...s, job: "tech" }).some(a => a.id === "remote" && a.cost === -780));
});

test("food is consumed, capped and cannot be conjured without groceries", () => {
  let s = { ...createGame(), food: 90 };
  s = perform(s, "cook").state;
  assert.equal(s.food, 100);
  assert.equal(s.inventory.groceries, 1);
  s = perform(s, "cook").state;
  assert.ok(perform(s, "cook").error);
  s.location = "market";
  s = perform(s, "groceries").state;
  assert.equal(s.inventory.groceries, 3);
  assert.ok(perform(s, "groceries").error);
});

test("bank transfers preserve wealth and borrowed money does not count as wealth", () => {
  let s = { ...createGame(), location: "bank" };
  const wealth = netWorth(s);
  s = perform(s, "deposit").state;
  assert.equal(s.savings, 500);
  assert.equal(netWorth(s), wealth);
  s = perform(s, "withdraw").state;
  assert.equal(s.savings, 0);
  assert.ok(perform(s, "withdraw").error);
  for (let i = 0; i < 3; i++) s = perform(s, "loan").state;
  assert.equal(netWorth(s), wealth);
  assert.ok(perform(s, "loan").error);
  s = perform(s, "repay").state;
  assert.equal(s.debt, 2500);
  assert.equal(netWorth(s), wealth);
});

test("a hungry player with no money or credit can recover and earn again", () => {
  let s = { ...createGame(), cash: 0, savings: 0, debt: 5000, food: 0, energy: 0, job: "cafe", inventory: { bike: false, laptop: false, groceries: 0 } };
  for (const [kind, id] of [["travel", "park"], ["action", "community"], ["travel", "home"], ["action", "rest"], ["travel", "cafe"], ["action", "work"]]) {
    const result = kind === "travel" ? travel(s, id) : perform(s, id);
    assert.equal(result.error, undefined, result.error);
    s = result.state;
  }
  assert.equal(s.cash, 270);
  assert.equal(s.experience, 6);
  assert.equal(s.debt, 5000);
});

test("weekly settlement uses cash then savings, adds unpaid rent to debt and reports it", () => {
  const s = { ...createGame(), cash: 100, savings: 100, debt: 1000, energy: 20 };
  const { state: next, report } = endWeek(s, () => 0);
  assert.equal(next.cash, 0);
  assert.equal(next.savings, 0);
  assert.equal(next.debt, 1269);
  assert.equal(report.unpaid, 249);
  assert.equal(report.debtInterest, 20);
  assert.equal(report.interest, 1);
  assert.equal(next.hours, 60);
  assert.equal(next.energy, 65);
  assert.equal(next.week, 2);
  assert.equal(next.inventory.groceries, 1);
  assert.equal(s.cash, 100);
  const eventDebt = endWeek({ ...createGame(), cash: 450, inventory: { laptop: false, bike: false, groceries: 0 } }, () => .99);
  assert.equal(eventDebt.state.debt, 80);
  assert.equal(eventDebt.state.cash, 0);
  assert.equal(eventDebt.state.food, 60);
});

test("only reaching all four goals together wins, and won games cannot mutate", () => {
  let s = { ...createGame(), cash: 6000, education: 3, job: "tech", happiness: 65, location: "park" };
  assert.equal(progress(s).filter(g => g.percent >= 100).length, 3);
  s = perform(s, "walk").state;
  assert.equal(s.won, true);
  assert.equal(perform(s, "walk").state, s);
  assert.equal(endWeek(s).state, s);
  assert.equal(travel(s, "home").state, s);
});

test("saved progress round-trips and corrupt or incompatible saves are explicitly rejected", () => {
  const s = perform(travel(createGame(), "cafe").state, "apply-cafe").state;
  assert.deepEqual(parseSave(JSON.stringify(s)), s);
  for (const raw of ["{", "null", "{}", JSON.stringify({ ...s, version: 9 }), JSON.stringify({ ...s, hours: -1 }), JSON.stringify({ ...s, job: "missing" }), JSON.stringify({ ...s, difficulty: "toString" }), JSON.stringify({ ...s, inventory: { ...s.inventory, groceries: 20 } })]) {
    assert.throws(() => parseSave(raw));
  }
  assert.throws(() => createGame("toString"));
  assert.equal(parseSave(JSON.stringify({ ...s, won: true })).won, false);
});

test("dialogue choices apply advertised effects once per character per week and remember the choice", () => {
  const start = { ...createGame(), location: "cafe", energy: 50 };
  const result = perform(start, "talk-1");
  assert.equal(result.error, undefined);
  assert.equal(result.state.hours, 59);
  assert.equal(result.state.cash, 1390);
  assert.equal(result.state.energy, 68);
  assert.equal(result.state.food, 74);
  assert.equal(result.state.happiness, 43);
  assert.ok(result.message.includes(CHARACTERS.cafe.choices[1].reply));
  assert.deepEqual(start.encounters, {});
  let s = parseSave(JSON.stringify(result.state));
  assert.deepEqual(s.encounters.cafe, { week: 1, choice: 1, visits: 1 });
  assert.equal(perform(s, "talk-0").state, s);
  assert.ok(perform(s, "talk-0").error);
  s = travel(s, "home").state;
  assert.equal(perform(s, "talk-0").error, undefined);
  s = travel(endWeek(s, () => .5).state, "cafe").state;
  s = perform(s, "talk-2").state;
  assert.deepEqual(s.encounters.cafe, { week: 2, choice: 2, visits: 2 });
});

test("unaffordable and out-of-time conversations cannot grant rewards or record a meeting", () => {
  for (const s of [{ ...createGame(), cash: 0 }, { ...createGame(), hours: 0 }, { ...createGame(), won: true }]) {
    const result = perform(s, "talk-1");
    assert.ok(result.error);
    assert.equal(result.state, s);
    assert.deepEqual(s.encounters, {});
  }
  for (const location of Object.keys(CHARACTERS)) {
    assert.equal(actionsFor({ ...createGame(), location }).filter(a => a.id.startsWith("talk-")).length, 3);
  }
});

test("old saves migrate without losing progress; invalid interaction state is rejected", () => {
  const old = { ...createGame(), week: 4, cash: 2720, job: "office", education: 2 };
  delete old.encounters;
  delete old.cafeOrder;
  delete old.cafeServed;
  const restored = parseSave(JSON.stringify(old));
  assert.deepEqual(restored, { ...old, encounters: {}, cafeOrder: null, cafeServed: 0 });
  for (const patch of [
    { encounters: null }, { encounters: [] },
    { encounters: { cafe: { week: 5, choice: 1, visits: 1 } } },
    { encounters: { cafe: { week: 1, choice: 9, visits: 1 } } },
    { encounters: { cafe: { week: 1, choice: 1, visits: -1 } } },
    { cafeServed: -1 }, { cafeOrder: { recipe: 0, ingredients: [] } }
  ]) assert.throws(() => parseSave(JSON.stringify({ ...restored, ...patch })));
});

test("coffee charges time once, persists mid-recipe, and rewards an exact recipe once", () => {
  const initial = { ...createGame(), location: "cafe", job: "cafe", hours: 3 };
  let s = perform(initial, "coffee-start").state;
  assert.equal(s.hours, 0);
  assert.equal(s.energy, 73);
  assert.equal(s.cash, initial.cash);
  assert.equal(s.experience, 0);
  for (const id of COFFEE_RECIPES[0].order) {
    const result = mixCoffee(s, id);
    assert.equal(result.error, undefined);
    s = parseSave(JSON.stringify(result.state));
  }
  const result = serveCoffee(s);
  assert.equal(result.coffeeResult.correct, true);
  assert.equal(result.state.cash, 1565);
  assert.equal(result.state.experience, 3);
  assert.equal(result.state.happiness, 45);
  assert.equal(result.state.hours, 0);
  assert.equal(result.state.cafeOrder, null);
  assert.equal(result.state.cafeServed, 1);
  assert.ok(serveCoffee(result.state).error);
  assert.equal(serveCoffee(result.state).state, result.state);
  assert.equal(initial.cafeOrder, null);
});

test("coffee validates ingredients and capacity, allows clearing, and requires the right order", () => {
  let s = perform({ ...createGame(), location: "cafe", job: "cafe" }, "coffee-start").state;
  assert.equal(mixCoffee(s, "not-coffee").state, s);
  assert.ok(mixCoffee(s, "not-coffee").error);
  for (let i = 0; i < 4; i++) s = mixCoffee(s, "milk").state;
  assert.equal(mixCoffee(s, "milk").state, s);
  s = mixCoffee(s, "clear").state;
  assert.deepEqual(s.cafeOrder.ingredients, []);
  assert.equal(s.hours, 57);
  for (const id of [...COFFEE_RECIPES[0].order].reverse()) s = mixCoffee(s, id).state;
  const result = serveCoffee(s);
  assert.equal(result.coffeeResult.correct, false);
  assert.equal(result.state.cash, 1490);
  assert.equal(result.state.happiness, 38);
  assert.equal(result.state.experience, 3);
  assert.equal(perform(result.state, "coffee-start").state.cafeOrder.recipe, 1);
  const empty = serveCoffee(perform(result.state, "coffee-start").state);
  assert.equal(empty.coffeeResult.correct, false);
  assert.equal(empty.state.cafeOrder, null);
});

test("active orders cannot be abandoned through travel, work, or weekly settlement", () => {
  const base = { ...createGame(), location: "cafe", job: "cafe" };
  for (const patch of [{ hours: 2 }, { food: 14 }, { energy: 16 }, { job: null }]) {
    const s = { ...base, ...patch };
    assert.equal(perform(s, "coffee-start").state, s);
    assert.ok(perform(s, "coffee-start").error);
  }
  const s = perform(base, "coffee-start").state;
  for (const result of [perform(s, "coffee-start"), perform(s, "work"), perform(s, "talk-0"), travel(s, "home"), endWeek(s)]) {
    assert.ok(result.error);
    assert.equal(result.state, s);
  }
  for (const order of [{ recipe: 50, ingredients: [] }, { recipe: 0, ingredients: ["salt"] }, { recipe: 0, ingredients: Array(5).fill("milk") }]) {
    assert.throws(() => parseSave(JSON.stringify({ ...s, cafeOrder: order })));
  }
});

for (const difficulty of ["relaxed", "classic"]) test(`${difficulty}: a complete game can be won using only normal gameplay actions`, () => {
  let s = createGame(difficulty);
  let operations = 0;
  function apply(result) {
    assert.ok(++operations < 2500, "playthrough must finish without grinding indefinitely");
    assert.equal(result.error, undefined, result.error);
    s = result.state;
  }
  function nextWeek() { apply(endWeek(s, () => .5)); }
  function visit(place) {
    if (s.hours < travelCost(s, place)) nextWeek();
    if (s.won) return;
    apply(travel(s, place));
  }
  function doAction(place, id) {
    for (let attempt = 0; attempt < 30; attempt++) {
      visit(place);
      if (s.won) return;
      const a = actionsFor(s).find(a => a.id === id);
      assert.ok(a, `${place}/${id} must exist`);
      if (s.hours < a.hours) { nextWeek(); continue; }
      if (["work", "study"].includes(id)) {
        if (s.food < 15) { doAction("cafe", "meal"); continue; }
        if (s.energy + (a.effects.energy || 0) < 5) { doAction("home", "rest"); continue; }
      }
      apply(perform(s, id));
      return;
    }
    assert.fail("Unable to complete planned action");
  }
  doAction("cafe", "apply-cafe");
  function earnTo(amount) {
    while (s.cash < amount && !s.won) doAction(JOBS[s.job].place, "work");
  }
  earnTo(4500);
  while (s.education < 1) doAction("college", "study");
  doAction("office", "apply-office");
  earnTo(6500);
  while (s.education < 3) doAction("college", "study");
  while (s.experience < 36) doAction("office", "work");
  doAction("tech", "apply-tech");
  if (difficulty === "classic") {
    earnTo(10000);
    while (s.education < 6) doAction("college", "study");
    while (s.experience < 90) doAction("tech", "work");
    doAction("tech", "apply-lead");
  }
  earnTo(GOALS[difficulty].wealth + 1500);
  while (!s.won) doAction("park", "walk");
  assert.ok(s.won);
  assert.ok(s.week < 40, `game should be achievable; took ${s.week} weeks`);
  assert.equal(progress(s).every(g => g.percent === 100), true);
  assert.deepEqual(parseSave(JSON.stringify(s)), s);
});
