use crate::placement::Area;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Movement { #[default] Walk, Fly, Swim }

pub struct Step { pub x: i32, pub y: i32, pub dx: f64, pub dy: f64, pub phase: f64 }

/// Physical coordinates, logical speeds. Never move beyond this display's work area.
pub fn advance(mode: Movement, area: &Area, position: (i32, i32), size: (u32, u32), heading: (f64, f64), phase: f64, seconds: f64) -> Option<Step> {
    if !seconds.is_finite() || !area.scale.is_finite() || area.scale <= 0.0 || area.width == 0 || area.height == 0 { return None; }
    let dt = seconds.clamp(0.0, 0.2);
    let mut dx = if heading.0.is_finite() && heading.0 < 0.0 { -1.0 } else { 1.0 };
    let mut dy = if heading.1.is_finite() && heading.1 < 0.0 { -1.0 } else { 1.0 };
    let phase = if phase.is_finite() { phase } else { 0.0 };
    let next_phase = (phase + dt * 2.5) % std::f64::consts::TAU;
    let (vx, vy) = match mode {
        Movement::Walk => (32.0 * dx, 0.0),
        Movement::Fly => (42.0 * dx, 24.0 * dy),
        Movement::Swim => (24.0 * dx, (next_phase.sin() - phase.sin()) * 12.0 / dt.max(0.001)),
    };
    let min_x = f64::from(area.x); let min_y = f64::from(area.y);
    let max_x = min_x + f64::from(area.width.saturating_sub(size.0));
    let max_y = min_y + f64::from(area.height.saturating_sub(size.1));
    let raw_x = f64::from(position.0) + vx * area.scale * dt;
    let raw_y = f64::from(position.1) + vy * area.scale * dt;
    if raw_x <= min_x { dx = 1.0; } else if raw_x >= max_x { dx = -1.0; }
    if raw_y <= min_y { dy = 1.0; } else if raw_y >= max_y { dy = -1.0; }
    Some(Step { x: raw_x.clamp(min_x, max_x).round() as i32, y: raw_y.clamp(min_y, max_y).round() as i32, dx, dy, phase: next_phase })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn area() -> Area { Area { name: None, x: -1200, y: 0, width: 1200, height: 800, scale: 2.0, primary: true } }
    #[test]
    fn walking_moves_the_window_and_bounces_on_negative_coordinate_displays() {
        let s = advance(Movement::Walk, &area(), (-105, 500), (100, 160), (1.0, 1.0), 0.0, 0.125).unwrap();
        assert_eq!((s.x, s.y, s.dx), (-100, 500, -1.0));
        let s = advance(Movement::Walk, &area(), (-500, 500), (100, 160), (-1.0, 1.0), 0.0, 0.125).unwrap();
        assert_eq!((s.x, s.y), (-508, 500));
    }
    #[test]
    fn flying_bounces_at_top_and_bottom_and_swimming_has_a_wave() {
        let f = advance(Movement::Fly, &area(), (-500, 639), (100, 160), (1.0, 1.0), 0.0, 0.125).unwrap();
        assert_eq!((f.y, f.dy), (640, -1.0));
        let s = advance(Movement::Swim, &area(), (-500, 300), (100, 160), (1.0, 1.0), 0.0, 0.125).unwrap();
        assert!(s.x > -500 && s.y > 300);
    }
    #[test]
    fn caps_suspended_time_and_recovers_outside_positions() {
        let s = advance(Movement::Fly, &area(), (9999, -9999), (100, 160), (1.0, 1.0), f64::NAN, 500.0).unwrap();
        assert_eq!((s.x, s.y), (-100, 0));
        assert!(advance(Movement::Walk, &area(), (0, 0), (1, 1), (1.0, 1.0), 0.0, f64::NAN).is_none());
    }
}
