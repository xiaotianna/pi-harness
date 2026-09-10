use std::env;

fn main() {
    if env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("macos") {
        println!("cargo:rustc-link-arg-bin=pi-computer-use-helper=-Wl,-rpath,/usr/lib/swift");
    }
}
