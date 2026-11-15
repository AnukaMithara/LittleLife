use crate::placement::Area;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Default, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Movement { #[default] Walk, Fly, Swim }

/// How the character is passing a display edge.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Transit {
    None,
    /// Walking straight onto the display beside this one.
    Cross,
    /// Walking out of sight, to come back somewhere else.
    Leave,
}

/// Everything the roaming character remembers between steps. Positions use the
/// same units as the areas passed to `advance`.
#[derive(Clone, Debug)]
pub struct Roam {
    pub x: f64,
    pub y: f64,
    pub dx: f64,
    pub phase: f64,
    pub fall: f64,
    pub target: Option<(f64, f64)>,
    pub transit: Transit,
    /// Seconds left of a pause half way in, looking around before coming in.
    pub peek: f64,
    /// The display edge being entered across; the peek happens a little way past it.
    pub gate: Option<f64>,
    /// The display the character was last on, to notice when it reaches another.
    pub area: Option<usize>,
    /// Somewhere it has been sent: it goes straight there and stops.
    pub goal: Option<(f64, f64)>,
    pub seed: u64,
}

impl Roam {
    pub fn new(seed: u64) -> Self {
        Self { x: 0.0, y: 0.0, dx: 1.0, phase: 0.0, fall: 0.0, target: None, transit: Transit::None, peek: 0.0, gate: None, area: None, goal: None, seed: seed | 1 }
    }
    pub fn falling(&self) -> bool { self.fall > 0.0 }
    pub fn peeking(&self) -> bool { self.peek > 0.0 }
    /// Forget any half-finished crossing, as after being picked up and put down.
    pub fn rest(&mut self) { self.fall = 0.0; self.target = None; self.transit = Transit::None; self.peek = 0.0; self.gate = None; self.area = None; self.goal = None; }
    fn pause(&mut self) { self.gate = None; self.peek = 1.0 + self.roll() * 0.9; }
    fn roll(&mut self) -> f64 {
        self.seed ^= self.seed << 13; self.seed ^= self.seed >> 7; self.seed ^= self.seed << 17;
        (self.seed >> 11) as f64 / (1u64 << 53) as f64
    }
}

/// The feet are drawn this far above the bottom of the window.
pub const FOOT: f64 = 8.0;
const WALK: f64 = 38.0;
const GRAVITY: f64 = 1600.0;
/// How much of the window is in view when the character stops to peek: about half its face.
const PEEK: f64 = 96.0;
/// The character is drawn in the middle of its window, so the window may hang this far
/// over a display edge with all of the character still in view.
const TUCK: f64 = 30.0;

struct Rect { x: f64, y: f64, w: f64, h: f64, scale: f64 }
impl Rect {
    fn of(a: &Area) -> Self { Self { x: f64::from(a.x), y: f64::from(a.y), w: f64::from(a.width), h: f64::from(a.height), scale: a.scale } }
    fn distance(&self, x: f64, y: f64) -> f64 {
        (x - x.clamp(self.x, self.x + self.w)).hypot(y - y.clamp(self.y, self.y + self.h))
    }
}

fn locate(rects: &[Rect], x: f64, y: f64) -> usize {
    let mut best = 0;
    for (i, r) in rects.iter().enumerate() { if r.distance(x, y) < rects[best].distance(x, y) { best = i; } }
    best
}

/// A display whose work area continues this one on the left or right.
fn neighbour(rects: &[Rect], i: usize, right: bool) -> Option<usize> {
    let a = &rects[i];
    rects.iter().enumerate().find(|(j, b)| {
        let gap = if right { b.x - (a.x + a.w) } else { a.x - (b.x + b.w) };
        *j != i && gap.abs() <= 160.0 * a.scale && b.y < a.y + a.h && a.y < b.y + b.h
    }).map(|(j, _)| j)
}

fn other(rects: &[Rect], i: usize, roam: &mut Roam) -> usize {
    if rects.len() < 2 { return i; }
    let j = (roam.roll() * (rects.len() - 1) as f64) as usize;
    (if j >= i { j + 1 } else { j }).min(rects.len() - 1)
}

/// One bounded step across every display. `size` is the logical window size.
/// Returns false when there is nowhere to stand.
pub fn advance(mode: Movement, areas: &[Area], size: (f64, f64), roam: &mut Roam, seconds: f64) -> bool {
    let rects: Vec<Rect> = areas.iter()
        .filter(|a| a.width > 0 && a.height > 0 && a.scale.is_finite() && a.scale > 0.0).map(Rect::of).collect();
    if rects.is_empty() || !seconds.is_finite() { return false; }
    let dt = seconds.clamp(0.0, 0.1);
    if !roam.x.is_finite() || !roam.y.is_finite() { roam.x = rects[0].x; roam.y = rects[0].y; }
    if !roam.phase.is_finite() { roam.phase = 0.0; }
    if !roam.fall.is_finite() { roam.fall = 0.0; }
    roam.dx = if roam.dx < 0.0 { -1.0 } else { 1.0 };
    let rough = &rects[locate(&rects, roam.x, roam.y)];
    let i = locate(&rects, roam.x + size.0 * rough.scale / 2.0, roam.y + size.1 * rough.scale / 2.0);
    let before = roam.phase;
    roam.phase = (roam.phase + dt * 2.5) % std::f64::consts::TAU;
    if !roam.peek.is_finite() { roam.peek = 0.0; }
    // Half way onto another display: stop and look before coming in.
    if roam.area.is_some_and(|last| last != i) && roam.transit != Transit::Leave { roam.pause(); }
    roam.area = Some(i);
    if roam.peek > 0.0 { roam.peek = (roam.peek - dt).max(0.0); return true; }
    match mode {
        Movement::Walk => walk(&rects, i, size, roam, dt),
        Movement::Fly => glide(&rects, i, size, roam, dt, 64.0, 9.0, before, false),
        Movement::Swim => glide(&rects, i, size, roam, dt, 30.0, 16.0, before, true),
    }
    true
}

/// Whether the whole character is on a display and at rest, so it may stop here.
/// A walk that is stopped half way off a display would otherwise leave it out of sight.
pub fn settled(areas: &[Area], size: (f64, f64), roam: &Roam) -> bool {
    if roam.transit != Transit::None || roam.falling() || roam.peeking() || roam.goal.is_some() { return false; }
    areas.iter().filter(|a| a.scale.is_finite() && a.scale > 0.0).map(Rect::of).any(|r| {
        let (w, h) = (size.0 * r.scale, size.1 * r.scale);
        roam.x >= r.x - TUCK * r.scale - 0.5 && roam.x + w <= r.x + r.w + TUCK * r.scale + 0.5 && roam.y >= r.y - 0.5 && roam.y + h <= r.y + r.h + FOOT * r.scale + 0.5
    })
}

/// Where to stand to be out of the way: the nearer bottom corner of the display it is on.
pub fn corner(areas: &[Area], size: (f64, f64), roam: &Roam) -> Option<(f64, f64)> {
    let rects: Vec<Rect> = areas.iter()
        .filter(|a| a.width > 0 && a.height > 0 && a.scale.is_finite() && a.scale > 0.0).map(Rect::of).collect();
    if rects.is_empty() || !roam.x.is_finite() || !roam.y.is_finite() { return None; }
    let rough = &rects[locate(&rects, roam.x, roam.y)];
    let a = &rects[locate(&rects, roam.x + size.0 * rough.scale / 2.0, roam.y + size.1 * rough.scale / 2.0)];
    let (w, h) = (size.0 * a.scale, size.1 * a.scale);
    let tuck = TUCK * a.scale;
    let left = roam.x + w / 2.0 < a.x + a.w / 2.0;
    Some((if left { a.x - tuck } else { a.x + a.w - w + tuck }, a.y + a.h - h + FOOT * a.scale))
}
/// Where to stand to be beside a point, such as the pointer, without leaving the display.
pub fn beside(areas: &[Area], size: (f64, f64), mode: Movement, point: (f64, f64)) -> Option<(f64, f64)> {
    let rects: Vec<Rect> = areas.iter()
        .filter(|a| a.width > 0 && a.height > 0 && a.scale.is_finite() && a.scale > 0.0).map(Rect::of).collect();
    if rects.is_empty() || !point.0.is_finite() || !point.1.is_finite() { return None; }
    let a = &rects[locate(&rects, point.0, point.1)];
    let (w, h) = (size.0 * a.scale, size.1 * a.scale);
    let x = (point.0 - w / 2.0).clamp(a.x, (a.x + a.w - w).max(a.x));
    let floor = a.y + a.h - h + FOOT * a.scale;
    Some((x, if mode == Movement::Walk { floor } else { (point.1 - h * 0.75).clamp(a.y, floor) }))
}
/// Whether two points are on the same display.
pub fn together(areas: &[Area], a: (f64, f64), b: (f64, f64)) -> bool {
    let rects: Vec<Rect> = areas.iter()
        .filter(|a| a.width > 0 && a.height > 0 && a.scale.is_finite() && a.scale > 0.0).map(Rect::of).collect();
    rects.is_empty() || locate(&rects, a.0, a.1) == locate(&rects, b.0, b.1)
}

fn walk(rects: &[Rect], i: usize, size: (f64, f64), roam: &mut Roam, dt: f64) {
    let a = &rects[i];
    let (w, h) = (size.0 * a.scale, size.1 * a.scale);
    let (min_x, max_x) = (a.x, (a.x + a.w - w).max(a.x));
    let floor = a.y + a.h - h + FOOT * a.scale;
    roam.target = None;
    if roam.transit == Transit::Leave {
        roam.x += WALK * a.scale * roam.dx * dt; roam.y = floor;
        if roam.x + w <= a.x || roam.x >= a.x + a.w { arrive(rects, i, size, roam); }
        return;
    }
    // Dropped or carried into the air: fall to the floor before walking on.
    if roam.y < floor - 0.5 {
        roam.fall += GRAVITY * a.scale * dt;
        roam.y = (roam.y + roam.fall * dt).min(floor);
        if roam.y >= floor { roam.fall = 0.0; }
        return;
    }
    roam.fall = 0.0; roam.y = floor;
    if let Some((goal, _)) = roam.goal {
        // Sent somewhere: head there along the floor, as far as this display goes.
        let goal = goal.clamp(min_x - TUCK * a.scale, max_x + TUCK * a.scale);
        let step = WALK * 1.6 * a.scale * dt;
        if (goal - roam.x).abs() <= step { roam.x = goal; roam.goal = None; roam.gate = None; roam.transit = Transit::None; return; }
        roam.dx = (goal - roam.x).signum();
        roam.x += step * roam.dx;
        peek_at_gate(roam, w, a.scale);
        return;
    }
    roam.x += WALK * a.scale * roam.dx * dt;
    peek_at_gate(roam, w, a.scale);
    if roam.transit == Transit::Cross {
        if roam.x >= min_x && roam.x <= max_x { roam.transit = Transit::None; }
        return;
    }
    let right = roam.dx > 0.0;
    if (right && roam.x >= max_x) || (!right && roam.x <= min_x) {
        let chance = roam.roll();
        if neighbour(rects, i, right).is_some() {
            if chance < 0.7 { roam.transit = Transit::Cross; return; }
        } else if chance < 0.4 { roam.transit = Transit::Leave; return; }
        roam.dx = -roam.dx; roam.x = roam.x.clamp(min_x, max_x);
    }
}

/// Stop once enough of the character has come past the edge it is entering across.
fn peek_at_gate(roam: &mut Roam, w: f64, scale: f64) {
    let Some(gate) = roam.gate else { return; };
    let seen = if roam.dx > 0.0 { roam.x + w - gate } else { gate - roam.x };
    if seen >= PEEK * scale { roam.pause(); } else if seen >= w { roam.gate = None; }
}

/// Reappear on some display after walking out of sight.
fn arrive(rects: &[Rect], from: usize, size: (f64, f64), roam: &mut Roam) {
    let to = other(rects, from, roam);
    enter(rects, to, if to == from { Some(roam.dx > 0.0) } else { None }, size, roam);
}

/// Stand just outside a display, facing in, on a side with nothing beside it.
/// `from_left` is the side asked for, used when that side is free.
fn enter(rects: &[Rect], to: usize, from_left: Option<bool>, size: (f64, f64), roam: &mut Roam) {
    let b = &rects[to];
    let (w, h) = (size.0 * b.scale, size.1 * b.scale);
    let floor = b.y + b.h - h + FOOT * b.scale;
    let (left, right) = (neighbour(rects, to, false).is_none(), neighbour(rects, to, true).is_none());
    roam.rest(); roam.area = Some(to);
    if !left && !right {
        // Displays on both sides: drop in from above instead.
        roam.x = b.x + roam.roll() * (b.w - w).max(0.0); roam.y = b.y - h;
        return;
    }
    let from_left = match from_left {
        Some(side) if if side { left } else { right } => side,
        _ => if left && right { roam.roll() < 0.5 } else { left },
    };
    roam.y = floor;
    if from_left { roam.x = b.x - w; roam.dx = 1.0; roam.gate = Some(b.x); }
    else { roam.x = b.x + b.w; roam.dx = -1.0; roam.gate = Some(b.x + b.w); }
}

/// Come after the person to the display holding `point`, arriving from one side
/// as if it had run across from the screen they just left.
pub fn follow(mode: Movement, areas: &[Area], size: (f64, f64), roam: &mut Roam, point: (f64, f64), from_left: Option<bool>) -> bool {
    let rects: Vec<Rect> = areas.iter()
        .filter(|a| a.width > 0 && a.height > 0 && a.scale.is_finite() && a.scale > 0.0).map(Rect::of).collect();
    if rects.is_empty() || !point.0.is_finite() || !point.1.is_finite() { return false; }
    let to = locate(&rects, point.0, point.1);
    let height = roam.y;
    enter(&rects, to, from_left, size, roam);
    if mode != Movement::Walk && roam.gate.is_some() {
        // Fliers and swimmers come in at the height they were at, heading for the middle.
        let b = &rects[to];
        let (w, h) = (size.0 * b.scale, size.1 * b.scale);
        roam.y = if height.is_finite() { height } else { b.y }.clamp(b.y, (b.y + b.h - h).max(b.y));
        roam.target = Some((b.x + (0.3 + 0.4 * roam.roll()) * (b.w - w).max(0.0), roam.y));
    }
    true
}

#[allow(clippy::too_many_arguments)]
fn glide(rects: &[Rect], i: usize, size: (f64, f64), roam: &mut Roam, dt: f64, speed: f64, bob: f64, before: f64, level: bool) {
    let a = &rects[i];
    roam.fall = 0.0; roam.transit = Transit::None;
    let width = size.0 * a.scale;
    if let Some(goal) = roam.goal {
        // Sent somewhere: go straight there, a little quicker, and stop.
        let (ox, oy) = (goal.0 - roam.x, goal.1 - roam.y);
        let (distance, step) = (ox.hypot(oy), speed * 1.6 * a.scale * dt);
        if distance <= step { roam.x = goal.0; roam.y = goal.1; roam.goal = None; roam.gate = None; roam.target = None; return; }
        roam.x += ox / distance * step; roam.y += oy / distance * step;
        if ox.abs() > 2.0 * a.scale { roam.dx = ox.signum(); }
        peek_at_gate(roam, width, a.scale);
        return;
    }
    let reached = roam.target.map_or(true, |t| (t.0 - roam.x).hypot(t.1 - roam.y) < 6.0 * a.scale);
    if reached {
        // Mostly wander here; now and then set off for another display.
        let to = if roam.roll() < 0.25 { other(rects, i, roam) } else { i };
        let b = &rects[to];
        let (w, h) = (size.0 * b.scale, size.1 * b.scale);
        let x = b.x + roam.roll() * (b.w - w).max(0.0);
        let mut y = b.y + roam.roll() * (b.h - h).max(0.0);
        if level && to == i { y = (roam.y + (roam.roll() - 0.5) * 0.3 * b.h).clamp(b.y, (b.y + b.h - h).max(b.y)); }
        roam.target = Some((x, y));
    }
    let (tx, ty) = roam.target.unwrap_or((roam.x, roam.y));
    let (ox, oy) = (tx - roam.x, ty - roam.y);
    let distance = ox.hypot(oy).max(0.001);
    let step = (speed * a.scale * dt).min(distance);
    roam.x += ox / distance * step;
    roam.y += oy / distance * step + (roam.phase.sin() - before.sin()) * bob * a.scale;
    if ox.abs() > 2.0 * a.scale { roam.dx = ox.signum(); }
    peek_at_gate(roam, width, a.scale);
}

#[cfg(test)]
mod tests {
    use super::*;
    const SIZE: (f64, f64) = (200.0, 236.0);
    fn area(x: i32, y: i32, scale: f64) -> Area { Area { name: None, x, y, width: 1600, height: 900, scale, primary: x == 0 && y == 0 } }
    fn on(areas: &[Area], roam: &Roam) -> Option<usize> {
        areas.iter().position(|a| roam.x >= f64::from(a.x) && roam.x + SIZE.0 * a.scale <= f64::from(a.x) + f64::from(a.width)
            && roam.y + SIZE.1 * a.scale / 2.0 >= f64::from(a.y) && roam.y + SIZE.1 * a.scale / 2.0 <= f64::from(a.y) + f64::from(a.height))
    }
    fn visits(mode: Movement, areas: &[Area], seed: u64, minutes: u32) -> Vec<bool> {
        let mut roam = Roam::new(seed); roam.x = 300.0; roam.y = 200.0;
        let mut seen = vec![false; areas.len()];
        for _ in 0..minutes * 60 * 30 {
            assert!(advance(mode, areas, SIZE, &mut roam, 1.0 / 30.0));
            assert!(roam.x.is_finite() && roam.y.is_finite());
            if let Some(i) = on(areas, &roam) { seen[i] = true; }
        }
        seen
    }

    #[test]
    fn a_dropped_walker_falls_to_the_floor_then_walks_along_it() {
        let areas = [area(0, 0, 1.0)];
        let mut roam = Roam::new(7); roam.x = 300.0; roam.y = 100.0;
        advance(Movement::Walk, &areas, SIZE, &mut roam, 0.033);
        assert!(roam.falling() && roam.x == 300.0 && roam.y > 100.0);
        for _ in 0..90 { advance(Movement::Walk, &areas, SIZE, &mut roam, 0.033); }
        assert!(!roam.falling());
        assert_eq!(roam.y, 900.0 - 236.0 + FOOT);
        assert!(roam.x > 300.0);
    }
    #[test]
    fn a_lone_display_is_left_on_one_side_and_entered_from_the_other() {
        let areas = [area(0, 0, 2.0)];
        let mut roam = Roam::new(3); roam.x = 100.0; roam.y = 900.0;
        let (mut wrapped, mut turned, mut last) = (false, false, (roam.x, roam.dx));
        for _ in 0..30 * 60 * 30 {
            advance(Movement::Walk, &areas, SIZE, &mut roam, 1.0 / 30.0);
            assert!(roam.x >= -405.0 && roam.x <= 1605.0, "stays within one body width of the display");
            if (roam.x - last.0).abs() > 800.0 { wrapped = true; assert_eq!(roam.dx, last.1, "keeps walking the same way"); }
            else if roam.dx != last.1 { turned = true; }
            last = (roam.x, roam.dx);
        }
        assert!(wrapped && turned);
    }
    #[test]
    fn is_only_settled_when_fully_in_view_and_at_rest() {
        let areas = [area(0, 0, 1.0)];
        let mut roam = Roam::new(4); roam.x = 300.0; roam.y = 900.0 - 236.0 + FOOT;
        assert!(settled(&areas, SIZE, &roam));
        roam.x = -80.0; assert!(!settled(&areas, SIZE, &roam));
        roam.x = -30.0; assert!(settled(&areas, SIZE, &roam), "tucked into a corner is still in view");
        roam.x = 1500.0; assert!(!settled(&areas, SIZE, &roam));
        roam.x = 300.0; roam.fall = 20.0; assert!(!settled(&areas, SIZE, &roam));
        roam.fall = 0.0; roam.transit = Transit::Leave; assert!(!settled(&areas, SIZE, &roam));
        // Stopping mid-exit still ends with the character back in view.
        roam.x = 1500.0; roam.dx = 1.0;
        let mut steps = 0;
        while !settled(&areas, SIZE, &roam) { advance(Movement::Walk, &areas, SIZE, &mut roam, 1.0 / 30.0); steps += 1; assert!(steps < 30 * 60); }
        assert!(roam.x <= 1430.0);
    }
    #[test]
    fn goes_where_it_is_sent_and_stays_there() {
        let areas = [area(0, 0, 1.0)];
        let floor = 900.0 - 236.0 + FOOT;
        let mut roam = Roam::new(3); roam.x = 900.0; roam.y = floor;
        let spot = corner(&areas, SIZE, &roam).unwrap();
        assert_eq!(spot, (1430.0, floor), "the nearer bottom corner, tucked against the edge");
        roam.goal = Some(spot);
        let mut steps = 0;
        while !settled(&areas, SIZE, &roam) || roam.goal.is_some() {
            advance(Movement::Walk, &areas, SIZE, &mut roam, 1.0 / 30.0); steps += 1; assert!(steps < 30 * 30);
            assert!(roam.transit == Transit::None, "never wanders off on the way");
        }
        assert_eq!((roam.x, roam.y), spot);
        roam.x = 300.0;
        assert_eq!(corner(&areas, SIZE, &roam).unwrap().0, -30.0);
        // Called to the pointer: a walker stands under it, a flier hovers beside it.
        assert_eq!(beside(&areas, SIZE, Movement::Walk, (800.0, 200.0)).unwrap(), (700.0, floor));
        let hover = beside(&areas, SIZE, Movement::Fly, (800.0, 400.0)).unwrap();
        assert_eq!(hover, (700.0, 223.0));
        roam.goal = Some(hover);
        let mut steps = 0;
        while roam.goal.is_some() { advance(Movement::Fly, &areas, SIZE, &mut roam, 1.0 / 30.0); steps += 1; assert!(steps < 30 * 30); }
        assert_eq!((roam.x, roam.y), (700.0, 223.0));
        assert!(settled(&areas, SIZE, &roam));
        assert_eq!(beside(&areas, SIZE, Movement::Walk, (5000.0, 200.0)).unwrap().0, 1400.0);
        let two = [area(0, 0, 1.0), area(1600, 0, 1.0)];
        assert!(together(&two, (10.0, 10.0), (900.0, 500.0)) && !together(&two, (10.0, 10.0), (1700.0, 500.0)));
    }
    #[test]
    fn peeks_in_before_entering_from_off_screen() {
        let areas = [area(0, 0, 1.0)];
        let mut roam = Roam::new(8);
        assert!(follow(Movement::Walk, &areas, SIZE, &mut roam, (500.0, 300.0), Some(true)));
        assert_eq!((roam.x, roam.dx), (-200.0, 1.0), "waits outside the left edge, facing in");
        let (mut paused_at, mut paused) = (None, 0.0);
        for _ in 0..30 * 30 {
            let (before, was) = (roam.x, roam.peeking());
            advance(Movement::Walk, &areas, SIZE, &mut roam, 1.0 / 30.0);
            if roam.peeking() { paused_at.get_or_insert(roam.x); paused += 1.0 / 30.0; }
            if was { assert_eq!(roam.x, before, "stands still while looking"); }
            assert!(!roam.peeking() || !settled(&areas, SIZE, &roam));
        }
        let at: f64 = paused_at.expect("stops to peek");
        assert!(at > -110.0 && at < -95.0, "about half in view, at {at}");
        assert!((1.0..=2.0).contains(&paused), "a short look around, {paused}s");
        assert!(roam.x > 0.0 && settled(&areas, SIZE, &roam));
        // From the other side, and for a flier, which keeps its height.
        follow(Movement::Walk, &areas, SIZE, &mut roam, (500.0, 300.0), Some(false));
        assert_eq!((roam.x, roam.dx), (1600.0, -1.0));
        roam.y = 250.0;
        follow(Movement::Fly, &areas, SIZE, &mut roam, (500.0, 300.0), Some(true));
        assert_eq!((roam.x, roam.y), (-200.0, 250.0));
        let mut peeked = false;
        for _ in 0..30 * 20 { advance(Movement::Fly, &areas, SIZE, &mut roam, 1.0 / 30.0); peeked |= roam.peeking(); }
        assert!(peeked && roam.x > 0.0);
    }
    #[test]
    fn follows_to_the_display_under_the_pointer_and_avoids_a_shared_edge() {
        let areas = [area(0, 0, 1.0), area(1600, 0, 1.0)];
        let mut roam = Roam::new(6); roam.x = 300.0; roam.y = 600.0;
        // Asked to come from the left of the right-hand display, where the other display is.
        follow(Movement::Walk, &areas, SIZE, &mut roam, (2000.0, 400.0), Some(true));
        assert_eq!((roam.x, roam.dx), (3200.0, -1.0));
        follow(Movement::Walk, &areas, SIZE, &mut roam, (100.0, 400.0), None);
        assert_eq!((roam.x, roam.dx), (-200.0, 1.0));
        assert!(!follow(Movement::Walk, &[], SIZE, &mut roam, (0.0, 0.0), None));
    }
    #[test]
    fn pauses_half_way_when_walking_onto_the_display_beside() {
        let areas = [area(0, 0, 1.0), area(1600, 0, 1.0)];
        let mut roam = Roam::new(11); roam.x = 1300.0; roam.y = 900.0 - 236.0 + FOOT;
        let mut peeks = Vec::new();
        for _ in 0..30 * 60 * 20 {
            let was = roam.peeking();
            advance(Movement::Walk, &areas, SIZE, &mut roam, 1.0 / 30.0);
            if roam.peeking() && !was { peeks.push(roam.x + 100.0); }
        }
        assert!(!peeks.is_empty());
        // Every look around happens astride the shared edge, or half in from an outer one.
        for centre in peeks { assert!((centre - 1600.0).abs() < 6.0 || (centre - 0.0).abs() < 12.0 || (centre - 3200.0).abs() < 12.0, "{centre}"); }
    }
    #[test]
    fn walks_between_side_by_side_displays_with_different_scaling() {
        let areas = [area(-1600, 0, 1.0), area(0, 0, 2.0)];
        assert_eq!(visits(Movement::Walk, &areas, 11, 40), [true, true]);
    }
    #[test]
    fn reaches_a_display_above_by_leaving_and_reappearing() {
        let areas = [area(0, 0, 1.0), area(0, -900, 1.0)];
        assert_eq!(visits(Movement::Walk, &areas, 5, 60), [true, true]);
        let three = [area(-1600, 0, 1.0), area(0, 0, 1.0), area(1600, 0, 1.0), area(0, -900, 1.0)];
        assert_eq!(visits(Movement::Walk, &three, 9, 120), [true; 4]);
    }
    #[test]
    fn flying_and_swimming_travel_between_displays() {
        let areas = [area(0, 0, 1.0), area(1600, 200, 1.0)];
        assert_eq!(visits(Movement::Fly, &areas, 2, 30), [true, true]);
        assert_eq!(visits(Movement::Swim, &areas, 2, 60), [true, true]);
    }
    #[test]
    fn recovers_from_bad_numbers_and_missing_displays() {
        let mut roam = Roam::new(1); roam.x = f64::NAN; roam.phase = f64::INFINITY; roam.fall = f64::NAN;
        assert!(advance(Movement::Fly, &[area(0, 0, 1.0)], SIZE, &mut roam, 500.0));
        assert!(roam.x.is_finite() && roam.y.is_finite() && roam.phase.is_finite());
        assert!(!advance(Movement::Walk, &[], SIZE, &mut roam, 0.03));
        assert!(!advance(Movement::Walk, &[area(0, 0, 1.0)], SIZE, &mut roam, f64::NAN));
        let dead = Area { width: 0, ..area(0, 0, 1.0) };
        assert!(!advance(Movement::Walk, &[dead], SIZE, &mut roam, 0.03));
    }
}
