//! A coarse guess at what the person is doing, so the companion can keep fitting company.
//! Only the category leaves this module. Application names and window titles are
//! read, matched against the lists below and dropped; nothing is stored or sent.
use serde::Serialize;

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Activity { Coding, Music, Video, Meeting, Browsing, Writing, Chatting, Designing, Gaming, Away, Other }

#[derive(Clone, Debug, Default)]
pub struct Reading {
    /// Lowercase identifier and name of the application in front.
    pub app: Option<String>,
    /// Lowercase window title, where the system offers it without extra permission.
    pub title: Option<String>,
    pub idle_seconds: f64,
    pub audio: bool,
}

const MEETING: &[&str] = &["zoom", "teams", "webex", "facetime", "skype", "gotomeeting", "google meet"];
const VIDEO: &[&str] = &["vlc", "iina", "quicktime", "com.apple.tv", "netflix", "mpv", "plex", "infuse", "wmplayer", "kodi", "primevideo", "disney", "movies & tv"];
const STREAMS: &[&str] = &["youtube", "netflix", "prime video", "disney+", "twitch", "hotstar", "vimeo", "hulu"];
const MUSIC: &[&str] = &["spotify", "com.apple.music", "itunes", "tidal", "deezer", "foobar", "musicbee", "amazon music", "podcasts", "youtube music"];
const CODE: &[&str] = &["vscode", "code.exe", "visual studio", "xcode", "jetbrains", "intellij", "pycharm", "webstorm", "goland", "clion", "rustrover", "rider", "android studio", "studio64", "sublime", "terminal", "iterm", "warp", "ghostty", "alacritty", "kitty", "wezterm", "cursor", "dev.zed", "panic.nova", "vim", "emacs", "devenv", "powershell", "cmd.exe"];
const DESIGN: &[&str] = &["figma", "sketch", "photoshop", "illustrator", "blender", "affinity", "canva", "pixelmator", "aseprite"];
const WRITING: &[&str] = &["microsoft.word", "winword", "pages", "notion", "obsidian", "textedit", "notes", "bear", "ulysses", "scrivener", "onenote"];
const CHAT: &[&str] = &["slack", "discord", "telegram", "whatsapp", "messages", "mobilesms", "signal", "wechat", "mail", "outlook"];
const GAMES: &[&str] = &["steam", "epicgames", "minecraft", "riot", "battle.net"];
const BROWSER: &[&str] = &["safari", "chrome", "firefox", "edge", "brave", "thebrowser", "opera", "vivaldi"];

pub const AWAY_SECONDS: f64 = 300.0;

pub fn classify(reading: &Reading) -> Activity {
    let app = reading.app.as_deref().unwrap_or("");
    let title = reading.title.as_deref().unwrap_or("");
    let is = |list: &[&str]| list.iter().any(|name| app.contains(name));
    let browser = is(BROWSER);
    if is(MEETING) { return Activity::Meeting; }
    // Checked before "away": nobody touches the keyboard during a film.
    if is(VIDEO) || (browser && (STREAMS.iter().any(|name| title.contains(name)) || (reading.audio && reading.idle_seconds >= 20.0))) {
        return Activity::Video;
    }
    if reading.idle_seconds >= AWAY_SECONDS { return Activity::Away; }
    for (list, activity) in [(MUSIC, Activity::Music), (CODE, Activity::Coding), (DESIGN, Activity::Designing),
        (WRITING, Activity::Writing), (CHAT, Activity::Chatting), (GAMES, Activity::Gaming)] {
        if is(list) { return activity; }
    }
    if browser { Activity::Browsing } else { Activity::Other }
}

/// True for LittleLife itself, whose own window must not change the guess.
pub fn own(reading: &Reading) -> bool {
    reading.app.as_deref().is_some_and(|app| app.contains("littlelife"))
}

pub fn read() -> Reading { platform::read() }
/// Whether the main pointer button is held down, as it is while the character is dragged.
pub fn pressed() -> bool { platform::pressed() }

#[cfg(target_os = "macos")]
mod platform {
    use super::Reading;
    use objc2::{class, msg_send, rc::autoreleasepool, runtime::AnyObject};
    use std::ffi::{c_char, c_void, CStr};

    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" { fn CGEventSourceSecondsSinceLastEventType(state: i32, event: u32) -> f64; }
    #[repr(C)]
    struct Address { selector: u32, scope: u32, element: u32 }
    #[link(name = "CoreAudio", kind = "framework")]
    extern "C" {
        fn AudioObjectGetPropertyData(object: u32, address: *const Address, qualifier_size: u32,
            qualifier: *const c_void, size: *mut u32, data: *mut c_void) -> i32;
    }
    const fn code(tag: &[u8; 4]) -> u32 { u32::from_be_bytes(*tag) }

    fn property(object: u32, selector: &[u8; 4]) -> Option<u32> {
        let address = Address { selector: code(selector), scope: code(b"glob"), element: 0 };
        let (mut value, mut size) = (0u32, 4u32);
        // SAFETY: both properties are documented as one 32-bit value, and `size` says so.
        let status = unsafe { AudioObjectGetPropertyData(object, &address, 0, std::ptr::null(), &mut size, (&mut value as *mut u32).cast()) };
        (status == 0).then_some(value)
    }
    /// Whether any application is sending sound to the default output device.
    fn audio() -> bool {
        property(1, b"dOut").filter(|device| *device != 0).and_then(|device| property(device, b"gone")).is_some_and(|running| running != 0)
    }
    unsafe fn text(string: *mut AnyObject) -> Option<String> {
        if string.is_null() { return None; }
        let utf8: *const c_char = msg_send![string, UTF8String];
        (!utf8.is_null()).then(|| CStr::from_ptr(utf8).to_string_lossy().to_lowercase())
    }
    fn front() -> Option<String> {
        // SAFETY: plain property reads on thread-safe AppKit objects, kept inside one pool.
        autoreleasepool(|_| unsafe {
            let workspace: *mut AnyObject = msg_send![class!(NSWorkspace), sharedWorkspace];
            if workspace.is_null() { return None; }
            let app: *mut AnyObject = msg_send![workspace, frontmostApplication];
            if app.is_null() { return None; }
            let id = text(msg_send![app, bundleIdentifier]).unwrap_or_default();
            let name = text(msg_send![app, localizedName]).unwrap_or_default();
            Some(format!("{id} {name}"))
        })
    }
    pub fn pressed() -> bool {
        // SAFETY: a class property returning an integer bit mask.
        let buttons: usize = unsafe { msg_send![class!(NSEvent), pressedMouseButtons] };
        buttons & 1 != 0
    }
    pub fn read() -> Reading {
        // SAFETY: a read-only query; 0 is the combined session state and !0 means any input.
        let idle = unsafe { CGEventSourceSecondsSinceLastEventType(0, !0) };
        Reading { app: front(), title: None, idle_seconds: if idle.is_finite() { idle.max(0.0) } else { 0.0 }, audio: audio() }
    }
}

#[cfg(windows)]
mod platform {
    use super::Reading;
    use windows_sys::Win32::{
        Foundation::CloseHandle,
        System::{SystemInformation::GetTickCount, Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION}},
        UI::{Input::KeyboardAndMouse::{GetAsyncKeyState, GetLastInputInfo, LASTINPUTINFO, VK_LBUTTON},
            WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId}},
    };
    pub fn pressed() -> bool {
        // SAFETY: reads the current state of one key.
        unsafe { GetAsyncKeyState(i32::from(VK_LBUTTON)) < 0 }
    }
    /// Sound detection is not implemented on Windows; music apps are recognized by name.
    pub fn read() -> Reading {
        let (mut app, mut title) = (None, None);
        // SAFETY: every buffer is passed with its real length, and the handle is closed.
        let idle = unsafe {
            let window = GetForegroundWindow();
            if window as usize != 0 {
                let mut process = 0u32;
                GetWindowThreadProcessId(window, &mut process);
                let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, process);
                if handle as usize != 0 {
                    let (mut path, mut length) = ([0u16; 520], 520u32);
                    if QueryFullProcessImageNameW(handle, 0, path.as_mut_ptr(), &mut length) != 0 {
                        let path = String::from_utf16_lossy(&path[..(length as usize).min(520)]);
                        app = path.rsplit(['\\', '/']).next().map(str::to_lowercase);
                    }
                    CloseHandle(handle);
                }
                let mut text = [0u16; 256];
                let length = GetWindowTextW(window, text.as_mut_ptr(), 256);
                if length > 0 { title = Some(String::from_utf16_lossy(&text[..(length as usize).min(256)]).to_lowercase()); }
            }
            let mut input = LASTINPUTINFO { cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32, dwTime: 0 };
            if GetLastInputInfo(&mut input) != 0 { f64::from(GetTickCount().wrapping_sub(input.dwTime)) / 1000.0 } else { 0.0 }
        };
        Reading { app, title, idle_seconds: idle, audio: false }
    }
}

#[cfg(not(any(target_os = "macos", windows)))]
mod platform {
    pub fn read() -> super::Reading { super::Reading::default() }
    pub fn pressed() -> bool { false }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn reading(app: &str, title: &str, idle: f64, audio: bool) -> Reading {
        Reading { app: Some(app.into()), title: (!title.is_empty()).then(|| title.into()), idle_seconds: idle, audio }
    }
    #[test]
    fn recognizes_common_work_and_play() {
        for (app, expected) in [("com.microsoft.vscode code", Activity::Coding), ("com.googlecode.iterm2 iterm2", Activity::Coding),
            ("code.exe", Activity::Coding), ("com.spotify.client spotify", Activity::Music), ("org.videolan.vlc vlc", Activity::Video),
            ("us.zoom.xos zoom.us", Activity::Meeting), ("com.figma.desktop figma", Activity::Designing),
            ("com.tinyspeck.slackmacgap slack", Activity::Chatting), ("com.apple.safari safari", Activity::Browsing),
            ("md.obsidian obsidian", Activity::Writing), ("com.apple.finder finder", Activity::Other)] {
            assert_eq!(classify(&reading(app, "", 2.0, false)), expected, "{app}");
        }
    }
    #[test]
    fn tells_watching_from_browsing_and_from_being_away() {
        assert_eq!(classify(&reading("com.google.chrome google chrome", "", 45.0, true)), Activity::Video);
        assert_eq!(classify(&reading("com.google.chrome google chrome", "", 3.0, true)), Activity::Browsing);
        assert_eq!(classify(&reading("chrome.exe", "lofi beats - youtube - google chrome", 1.0, false)), Activity::Video);
        // A long film is not absence, a silent idle editor is.
        assert_eq!(classify(&reading("com.colliderli.iina iina", "", 2400.0, true)), Activity::Video);
        assert_eq!(classify(&reading("com.microsoft.vscode code", "", 301.0, false)), Activity::Away);
        assert_eq!(classify(&Reading::default()), Activity::Other);
    }
    #[test]
    fn ignores_its_own_window() {
        assert!(own(&reading("io.github.anukamithara.littlelife littlelife", "", 0.0, false)));
        assert!(!own(&reading("com.apple.finder finder", "", 0.0, false)) && !own(&Reading::default()));
    }
}
