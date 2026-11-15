//! Notices when the person moves to another macOS Space, and which way they went,
//! so the companion can come after them instead of simply being there already.
use std::sync::atomic::{AtomicBool, Ordering};

static CHANGED: AtomicBool = AtomicBool::new(false);

/// True once after each change of Space.
pub fn changed() -> bool { CHANGED.swap(false, Ordering::Relaxed) }

/// Which side to arrive from, given each display's Space position before and after.
/// Moving to a Space further right means the companion runs in from the left.
pub fn side(before: &[i64], after: &[i64]) -> Option<bool> {
    if before.len() != after.len() { return None; }
    before.iter().zip(after).find(|(a, b)| a != b).map(|(a, b)| b > a)
}

#[cfg(target_os = "macos")]
pub use platform::{positions, watch};
#[cfg(not(target_os = "macos"))]
pub fn watch() {}
#[cfg(not(target_os = "macos"))]
pub fn positions() -> Vec<i64> { Vec::new() }

#[cfg(target_os = "macos")]
mod platform {
    use super::CHANGED;
    use objc2::{class, msg_send, rc::autoreleasepool, sel, runtime::{AnyObject, ClassBuilder, Sel}};
    use std::ffi::{c_char, c_void, CStr};
    use std::sync::atomic::Ordering;

    type Id = *mut AnyObject;
    extern "C-unwind" fn noticed(_: &AnyObject, _: Sel, _: Id) { CHANGED.store(true, Ordering::Relaxed); }
    unsafe fn string(text: &CStr) -> Id { msg_send![class!(NSString), stringWithUTF8String: text.as_ptr()] }

    /// Ask the workspace to tell us about Space changes. Call once, on the main thread.
    pub fn watch() {
        let Some(mut builder) = ClassBuilder::new(c"LittleLifeSpaceWatcher", class!(NSObject)) else { return; };
        // SAFETY: the method matches a notification selector: one object argument, no result.
        // The observer lives for the whole run, as the notification centre does not retain it.
        unsafe {
            builder.add_method(sel!(spaceChanged:), noticed as extern "C-unwind" fn(_, _, _));
            let observer: Id = msg_send![builder.register(), new];
            let workspace: Id = msg_send![class!(NSWorkspace), sharedWorkspace];
            if observer.is_null() || workspace.is_null() { return; }
            let centre: Id = msg_send![workspace, notificationCenter];
            if centre.is_null() { return; }
            let _: () = msg_send![centre, addObserver: observer, selector: sel!(spaceChanged:),
                name: string(c"NSWorkspaceActiveSpaceDidChangeNotification"), object: std::ptr::null_mut::<AnyObject>()];
        }
    }

    extern "C" { fn dlsym(handle: *mut c_void, symbol: *const c_char) -> *mut c_void; }
    /// The window server's own list of Spaces is not public API, so it is looked up at
    /// run time. If a system release drops it, the companion still follows, just without
    /// knowing the direction.
    unsafe fn symbol(name: &CStr) -> Option<*mut c_void> {
        // RTLD_DEFAULT
        let found = dlsym(-2isize as *mut c_void, name.as_ptr());
        (!found.is_null()).then_some(found)
    }
    unsafe fn value(dictionary: Id, key: &CStr) -> Id {
        if dictionary.is_null() { return dictionary; }
        msg_send![dictionary, objectForKey: string(key)]
    }
    unsafe fn number(dictionary: Id) -> Option<i64> {
        let id = value(dictionary, c"ManagedSpaceID");
        if id.is_null() { None } else { Some(msg_send![id, longLongValue]) }
    }

    /// For each display, the position of its current Space among that display's Spaces.
    pub fn positions() -> Vec<i64> {
        // SAFETY: both functions have had these signatures for many releases; the result is a
        // retained array of dictionaries, read through NSArray/NSDictionary and then released.
        autoreleasepool(|_| unsafe {
            let (Some(connection), Some(copy)) = (symbol(c"CGSMainConnectionID"), symbol(c"CGSCopyManagedDisplaySpaces")) else { return Vec::new(); };
            let connection: extern "C" fn() -> i32 = std::mem::transmute(connection);
            let copy: extern "C" fn(i32) -> Id = std::mem::transmute(copy);
            let displays = copy(connection());
            if displays.is_null() { return Vec::new(); }
            let count: usize = msg_send![displays, count];
            let mut result = Vec::with_capacity(count);
            for i in 0..count {
                let display: Id = msg_send![displays, objectAtIndex: i];
                let current = number(value(display, c"Current Space"));
                let spaces = value(display, c"Spaces");
                let total: usize = if spaces.is_null() { 0 } else { msg_send![spaces, count] };
                let mut position = -1;
                for j in 0..total {
                    let space: Id = msg_send![spaces, objectAtIndex: j];
                    if current.is_some() && number(space) == current { position = j as i64; }
                }
                result.push(position);
            }
            let _: () = msg_send![displays, release];
            result
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn arrives_from_the_side_the_person_came_from() {
        assert_eq!(side(&[0], &[1]), Some(true));
        assert_eq!(side(&[2, 0], &[2, 0]), None);
        assert_eq!(side(&[2, 1], &[2, 0]), Some(false));
        assert_eq!(side(&[1], &[1, 0]), None);
        assert_eq!(side(&[], &[]), None);
    }
}
