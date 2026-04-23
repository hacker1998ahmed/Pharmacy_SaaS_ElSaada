# 📱 دليل بناء تطبيق Android APK

## ✅ تم إعداد المشروع للتطبيق المحمول

تم تكوين مشروع ElSaada Pharmacy بنجاح للعمل كتطبيق Android باستخدام Capacitor.

---

## 🚀 خطوات بناء APK

### الطريقة 1: باستخدام Android Studio (موصى به)

```bash
# 1. افتح المشروع في Android Studio
npx cap open android

# 2. في Android Studio:
#    - انتقل إلى File > Project Structure
#    - قم بتكوين Keystore للتوقيع
#    - انتقل إلى Build > Generate Signed Bundle / APK
#    - اختر APK
#    - اتبع التعليمات لإنشاء APK
```

### الطريقة 2: باستخدام Gradle مباشرة

```bash
cd android

# بناء APK للتجربة (debug)
./gradlew assembleDebug

# سيتم إنشاء APK في:
# android/app/build/outputs/apk/debug/app-debug.apk

# بناء APK للإصدار (release) - يتطلب keystore
./gradlew assembleRelease
```

### الطريقة 3: بناء APK موقع للإنتاج

```bash
# 1. إنشاء Keystore جديد
keytool -genkey -v -keystore elsaada-release-key.keystore \
  -alias elsaada \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# 2. إنشاء ملف gradle.properties في android/
cat > android/gradle.properties << EOF
RELEASE_STORE_FILE=../elsaada-release-key.keystore
RELEASE_STORE_PASSWORD=كلمة_السر_هنا
RELEASE_KEY_ALIAS=elsaada
RELEASE_KEY_PASSWORD=كلمة_السر_هنا
EOF

# 3. تحديث build.gradle
# في android/app/build.gradle، أضف signingConfigs

# 4. بناء APK الموقع
cd android
./gradlew assembleRelease
```

---

## 📋 الصلاحيات المطلوبة

يحتاج التطبيق إلى الصلاحيات التالية في AndroidManifest.xml:

```xml
<!-- الكاميرا لمسح الباركود -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />

<!-- الإنترنت للاتصال بالخادم -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- التخزين لحفظ الفواتير -->
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

<!-- الموقع الجغرافي (اختياري) -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

---

## ⚙️ تكوين الخادم للتطبيق

### خيار 1: استخدام الخادم المحلي (للتطوير)

في `public/app.js`، غيّر API URL إلى:
```javascript
const API_URL = 'http://10.0.2.2:3000/api'; // للمحاكي
// أو
const API_URL = 'http://YOUR_LOCAL_IP:3000/api'; // للجهاز الحقيقي
```

### خيار 2: استخدام خادم بعيد (للإنتاج)

```javascript
const API_URL = 'https://your-domain.com/api';
```

---

## 🔧 حل المشاكل الشائعة

### مشكلة: خطأ في البناء
```bash
# نظف المشروع
cd android
./gradlew clean

# أعد المحاولة
./gradlew assembleDebug
```

### مشكلة: خطأ في الصلاحيات
تأكد من قبول الصلاحيات عند تشغيل التطبيق لأول مرة.

### مشكلة: لا يمكن الاتصال بالخادم
- تأكد من أن الخادم يعمل
- تحقق من عنوان IP
- للجوال الحقيقي، استخدم نفس الشبكة WiFi

---

## 📦 حجم التطبيق المتوقع

- **Debug APK**: ~25-35 MB
- **Release APK**: ~15-25 MB (بعد التصغير)
- **AAB (Play Store)**: ~12-20 MB

---

## 🎯 تحسينات الأداء

### 1. تمكين ProGuard للتصغير

في `android/app/build.gradle`:
```gradle
buildTypes {
    release {
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

### 2. استخدام WebP للصور

حوّل جميع الصور إلى صيغة WebP لتقليل الحجم.

### 3. تمكين Cache

أضف caching headers للخادم الخاص بك.

---

## 📤 النشر على Google Play

```bash
# بناء AAB (Android App Bundle)
cd android
./gradlew bundleRelease

# الملف سيكون في:
# android/app/build/outputs/bundle/release/app-release.aab
```

### متطلبات Google Play:
1. حساب مطور Google Play ($25 لمرة واحدة)
2. أيقونة التطبيق (512x512)
3. لقطات شاشة (phone & tablet)
4. وصف التطبيق
5. سياسة الخصوصية

---

## 🔄 التحديثات المستقبلية

عند تحديث الكود:

```bash
# 1. تحديث الملفات
git pull

# 2. مزامنة مع Capacitor
npx cap sync android

# 3. إعادة البناء
cd android
./gradlew assembleRelease
```

---

## 📞 الدعم الفني

للمساعدة في بناء التطبيق:
- Capacitor Docs: https://capacitorjs.com/docs
- Android Studio: https://developer.android.com/studio/intro

---

**تم الإعداد بنجاح! 🎉**

يمكنك الآن فتح المشروع في Android Studio وبدء البناء.
