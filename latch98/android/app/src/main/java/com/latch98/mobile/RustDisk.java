package com.latch98.mobile;

/** Rust JNI stores LatchFS on the device; this is not a remote/cloud connection. */
public final class RustDisk {
    static { System.loadLibrary("latch98_mobile"); }
    private RustDisk() {}
    public static native String readDisk(String privateDir);
    public static native boolean writeDisk(String privateDir, String json);
}
