# Add project specific ProGuard rules here.
# TWA / Custom Tabs: keep all browser helper classes
-keep class com.google.androidbrowserhelper.** { *; }
-keep class androidx.browser.customtabs.** { *; }
-dontwarn com.google.androidbrowserhelper.**
-dontwarn androidx.browser.**
