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
    pub seed: u64,
}

impl Roam {
    pub fn new(seed: u64) -> Self {
        Self { x: 0.0, y: 0.0, dx: 1.0, phase: 0.0, fall: 0.0, target: None, transit: Transit::None, seed: seed | 1 }
    }
    pub fn falling(&self) -> bool { self.fall > 0.0 }
    fn roll(&mut self) -> f64 {
        self.seed ^= self.seed << 13; self.seed ^= self.seed >> 7; self.seed ^= self.seed << 17;
        (self.seed >> 11) as f64 / (1u64 << 53) as f64
    }
}

/// The feet are drawn this far above the bottom of the window.
pub const FOOT: f64 = 8.0;
const WALK: f64 = 38.0;
const GRAVITY: f64 = 1600.0;

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
    if roam.transit != Transit::None || roam.falling() { return false; }
    areas.iter().filter(|a| a.scale.is_finite() && a.scale > 0.0).map(Rect::of).any(|r| {
        let (w, h) = (size.0 * r.scale, size.1 * r.scale);
        roam.x >= r.x - 0.5 && roam.x + w <= r.x + r.w + 0.5 && roam.y >= r.y - 0.5 && roam.y + h <= r.y + r.h + FOOT * r.scale + 0.5
    })
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
    roam.x += WALK * a.scale * roam.dx * dt;
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

/// Reappear just outside a display, on a side with nothing beside it.
fn arrive(rects: &[Rect], from: usize, size: (f64, f64), roam: &mut Roam) {
    let to = other(rects, from, roam);
    let b = &rects[to];
    let (w, h) = (size.0 * b.scale, size.1 * b.scale);
    let floor = b.y + b.h - h + FOOT * b.scale;
    let (left, right) = (neighbour(rects, to, false).is_none(), neighbour(rects, to, true).is_none());
    roam.transit = Transit::None; roam.fall = 0.0;
    if !left && !right {
        // Displays on both sides: drop in from above instead.
        roam.x = b.x + roam.roll() * (b.w - w).max(0.0); roam.y = b.y - h;
        return;
    }
    let from_left = if left && right { if to == from { roam.dx > 0.0 } else { roam.roll() < 0.5 } } else { left };
    roam.y = floor;
    if from_left { roam.x = b.x - w; roam.dx = 1.0; } else { roam.x = b.x + b.w; roam.dx = -1.0; }
}

#[allow(clippy::too_many_arguments)]
fn glide(rects: &[Rect], i: usize, size: (f64, f64), roam: &mut Roam, dt: f64, speed: f64, bob: f64, before: f64, level: bool) {
    let a = &rects[i];
    roam.fall = 0.0; roam.transit = Transit::None;
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
        roam.x = 1500.0; assert!(!settled(&areas, SIZE, &roam));
        roam.x = 300.0; roam.fall = 20.0; assert!(!settled(&areas, SIZE, &roam));
        roam.fall = 0.0; roam.transit = Transit::Leave; assert!(!settled(&areas, SIZE, &roam));
        // Stopping mid-exit still ends with the character back in view.
        roam.x = 1500.0; roam.dx = 1.0;
        let mut steps = 0;
        while !settled(&areas, SIZE, &roam) { advance(Movement::Walk, &areas, SIZE, &mut roam, 1.0 / 30.0); steps += 1; assert!(steps < 30 * 60); }
        assert!(roam.x <= 1400.0);
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
