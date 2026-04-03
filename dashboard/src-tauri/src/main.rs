#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Hyprland + WebKitGTK crashes with Wayland protocol error 71.
    // Force XWayland before any GTK/GDK initialization.
    unsafe {
        std::env::set_var("GDK_BACKEND", "x11");
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    }

    veriel_ops_lib::run();
}

