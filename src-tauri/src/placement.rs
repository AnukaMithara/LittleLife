use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Placement {
    pub monitor: Option<String>,
    pub monitor_x: i32,
    pub monitor_y: i32,
    pub anchor_x: f64,
    pub anchor_y: f64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(default)]
pub struct Preferences {
    pub version: u8,
    pub compact: bool,
    pub always_on_top: bool,
    pub placement: Option<Placement>,
    pub roaming: bool,
    pub movement: crate::motion::Movement,
    /// Let the companion notice the kind of application in use.
    pub awareness: bool,
}

/// Logical size of the character-only window: the character with room above for a speech bubble.
pub const COMPACT: (f64, f64) = (200.0, 236.0);

impl Default for Preferences {
    fn default() -> Self {
        Self { version: 1, compact: true, always_on_top: true, placement: None, roaming: true, movement: Default::default(), awareness: true }
    }
}

pub struct Area {
    pub name: Option<String>,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub scale: f64,
    pub primary: bool,
}

#[derive(Debug)]
pub struct Layout {
    pub x: i32,
    pub y: i32,
    pub physical_width: u32,
    pub physical_height: u32,
}

fn anchor(value: f64) -> f64 {
    if value.is_finite() { value.clamp(0.0, 1.0) } else { 0.5 }
}

pub fn decode(raw: &str) -> Preferences {
    serde_json::from_str::<Preferences>(raw)
        .ok().filter(|p| p.version == 1).unwrap_or_default()
}

pub fn layout(prefs: &Preferences, areas: &[Area]) -> Option<Layout> {
    let usable: Vec<_> = areas.iter().filter(|a| a.width > 0 && a.height > 0 && a.scale.is_finite() && a.scale > 0.0).collect();
    let saved = prefs.placement.as_ref();
    let matching = saved.and_then(|p| {
        usable.iter().copied().filter(|a| p.monitor.is_some() && a.name == p.monitor)
            .min_by(|a, b| {
                let distance = |a: &Area| (f64::from(a.x)-f64::from(p.monitor_x)).hypot(f64::from(a.y)-f64::from(p.monitor_y));
                distance(a).total_cmp(&distance(b))
            })
    });
    let area = matching.or_else(|| usable.iter().copied().find(|a| a.primary)).or_else(|| usable.first().copied())?;
    let (desired_width, desired_height) = if prefs.compact { COMPACT } else { (440.0_f64, 650.0_f64) };
    let width = desired_width.min(f64::from(area.width) / area.scale);
    let height = desired_height.min(f64::from(area.height) / area.scale);
    let ax = saved.map(|p| anchor(p.anchor_x)).unwrap_or(0.5);
    let ay = saved.map(|p| anchor(p.anchor_y)).unwrap_or(0.5);
    let spare_x = (f64::from(area.width) - (width * area.scale).ceil()).max(0.0);
    let spare_y = (f64::from(area.height) - (height * area.scale).ceil()).max(0.0);
    Some(Layout { x: (f64::from(area.x) + spare_x * ax).round() as i32,
        y: (f64::from(area.y) + spare_y * ay).round() as i32,
        physical_width: ((width * area.scale).floor() as u32).clamp(1, area.width),
        physical_height: ((height * area.scale).floor() as u32).clamp(1, area.height) })
}

pub fn capture(area: &Area, x: i32, y: i32, width: u32, height: u32) -> Placement {
    let spare_x = area.width.saturating_sub(width);
    let spare_y = area.height.saturating_sub(height);
    Placement { monitor: area.name.clone(), monitor_x: area.x, monitor_y: area.y,
        anchor_x: if spare_x == 0 { 0.0 } else { anchor((f64::from(x)-f64::from(area.x))/f64::from(spare_x)) },
        anchor_y: if spare_y == 0 { 0.0 } else { anchor((f64::from(y)-f64::from(area.y))/f64::from(spare_y)) } }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn area() -> Area { Area { name: Some("primary".into()), x: 0, y: 0, width: 1920, height: 1040, scale: 1.0, primary: true } }
    #[test]
    fn recovers_corrupt_or_future_preferences() {
        for raw in ["{", "null", "{\"version\":9}"] { assert!(decode(raw).always_on_top); assert!(decode(raw).compact); }
    }
    #[test]
    fn restores_edges_after_scaling_and_mode_changes() {
        let a = area();
        let p = capture(&a, 1480, 390, 440, 650);
        let prefs = Preferences { placement: Some(p), compact: true, ..Default::default() };
        let result = layout(&prefs, &[area()]).unwrap();
        assert_eq!((result.x, result.y), (1720, 804));
        let scaled = Area { scale: 2.0, width: 2560, height: 1440, ..area() };
        let r = layout(&prefs, &[scaled]).unwrap();
        assert_eq!((r.x, r.y), (2160, 968));
    }
    #[test]
    fn supports_negative_coordinates_and_removed_monitors() {
        let left = Area { name: Some("left".into()), x: -1920, primary: false, ..area() };
        let prefs = Preferences { placement: Some(capture(&left, -1920, 0, 440, 650)), compact: false, ..Default::default() };
        assert_eq!(layout(&prefs, &[area(), left]).unwrap().x, -1920);
        assert_eq!(layout(&prefs, &[area()]).unwrap().x, 0);
    }
    #[test]
    fn fits_small_work_areas_and_clamps_invalid_anchors() {
        let prefs = Preferences { placement: Some(Placement { monitor: None, monitor_x: 0, monitor_y: 0, anchor_x: f64::NAN, anchor_y: 99.0 }), compact: false, ..Default::default() };
        let a = Area { width: 320, height: 400, scale: 1.5, ..area() };
        let r = layout(&prefs, &[a]).unwrap();
        assert!(r.physical_width <= 320 && r.physical_height <= 400);
        assert_eq!((r.x, r.y), (0, 0));
        assert!(layout(&prefs, &[]).is_none());
    }
}
