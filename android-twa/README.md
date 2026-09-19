# تطبيق الفردوس Android — TWA

مشروع Android **Trusted Web Activity** يُشغّل منصة الفردوس كتطبيق fullscreen
بدعم كامل لـ **Web Push Notifications** عبر Chrome.

---

## البنية

```
android-twa/
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml       # TWA activity + DelegationService
│   │   ├── java/com/ferdaous/app/    # (لا كود Java — TWA لا يحتاج)
│   │   └── res/
│   │       ├── values/strings.xml    # URL المنصة + اسم التطبيق
│   │       ├── values/colors.xml     # ألوان العلامة التجارية
│   │       ├── values/styles.xml     # Theme fullscreen
│   │       ├── drawable/splash.xml   # شاشة التحميل
│   │       ├── drawable/ic_launcher_foreground.xml
│   │       └── mipmap-*/             # أيقونات التطبيق
│   ├── build.gradle                  # التبعيات + signing config
│   ├── release.keystore              # ← keystore التوقيع (لا ترفعه على GitHub!)
│   └── proguard-rules.pro
├── .github/workflows/build-apk.yml  # CI/CD تلقائي
├── build.gradle
├── settings.gradle
├── gradle.properties
└── gradlew
```

---

## متطلبات المستخدم

| المتطلب | الحد الأدنى |
|---|---|
| Android | 5.0 (API 21) |
| Chrome | 72+ |
| RAM | 1 GB |

> **ملاحظة**: TWA يعتمد على Chrome المثبّت على الجهاز لتشغيل المحتوى.
> إذا لم يكن Chrome متاحاً يُعرض Custom Tabs كبديل تلقائي.

---

## كيفية البناء يدوياً

### المتطلبات
- Android Studio Flamingo+ أو JDK 17 + Android SDK
- `ANDROID_HOME` أو `ANDROID_SDK_ROOT` مضبوطة

```bash
cd android-twa
chmod +x gradlew

# Debug APK (للاختبار)
./gradlew assembleDebug

# Release APK (موقّع)
KEYSTORE_PATH=app/release.keystore \
KEYSTORE_PASSWORD=ferdaous2024 \
KEY_ALIAS=ferdaous \
KEY_PASSWORD=ferdaous2024 \
./gradlew assembleRelease
```

الـ APK يُوجد في: `app/build/outputs/apk/release/app-release.apk`

---

## بناء تلقائي عبر GitHub Actions ✅

### 1. ارفع المشروع على GitHub
```bash
cd android-twa
git init
git add .
git add -f gradle/wrapper/gradle-wrapper.jar  # jar يجب رفعه صراحةً
git commit -m "feat: initial TWA project"
git remote add origin https://github.com/YOUR_USERNAME/ferdaous-android.git
git push -u origin main
```

### 2. أضف هذه الـ Secrets في GitHub → Settings → Secrets → Actions

| Secret Name | القيمة |
|---|---|
| `KEYSTORE_BASE64` | (انظر أدناه) |
| `KEYSTORE_PASSWORD` | `ferdaous2024` |
| `KEY_ALIAS` | `ferdaous` |
| `KEY_PASSWORD` | `ferdaous2024` |

**قيمة KEYSTORE_BASE64** (انسخ هذا النص كاملاً):
```
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
```

### 3. البناء التلقائي
- كل `push` على `main` يُشغّل البناء تلقائياً
- APK متاح في **Actions → ferdaous-apk → Download artifact**
- عند إنشاء tag مثل `v1.0.0` يُنشأ **GitHub Release** تلقائياً مع APK

---

## ملف assetlinks.json

هذا الملف **ضروري** لربط التطبيق بالنطاق وتفعيل TWA الحقيقي (بدونه يفتح كـ Custom Tabs).

يجب نشره على:
```
https://www.ferdaous-debila.com/.well-known/assetlinks.json
```

**الملف جاهز في** `../public/.well-known/assetlinks.json`

محتواه:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.ferdaous.app",
    "sha256_cert_fingerprints": [
      "72:6E:0A:7E:72:EA:11:A4:6A:6A:54:C6:6A:B6:42:BB:46:26:29:28:64:A3:E7:25:3D:2E:83:2B:1F:99:6A:43"
    ]
  }
}]
```

> ⚠️ هذا البصمة مرتبطة بـ keystore المُرفق. إذا غيّرت الـ keystore يجب تحديث هذا الملف.

---

## تفعيل Web Push

Web Push يعمل تلقائياً لأن:
1. `DelegationService` مُعرَّف في `AndroidManifest.xml`
2. Chrome يُفوّض الإشعارات للتطبيق عبر TWA
3. الموقع لديه `/sw.js` وVAPID keys مضبوطة

للتحقق على الجهاز:
```
chrome://flags/#enable-trusted-web-activity-post-message
```

---

## البصمة SHA-256

```
72:6E:0A:7E:72:EA:11:A4:6A:6A:54:C6:6A:B6:42:BB:46:26:29:28:64:A3:E7:25:3D:2E:83:2B:1F:99:6A:43
```

