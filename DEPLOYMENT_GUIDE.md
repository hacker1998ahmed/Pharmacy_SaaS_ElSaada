# 🚀 دليل النشر Deployment Guide

## ☁️ خيارات النشر المتاحة

### 1. النشر على Render (مجاني)

#### الخطوات:

1. **أنشئ حساب على Render**: https://render.com

2. **أنشئ Web Service جديد**:
   - Connect Repository من GitHub
   - اختر مستودع ElSaada Pharmacy

3. **إعدادات البناء**:
   ```
   Build Command: npm install
   Start Command: npm start
   ```

4. **متغيرات البيئة**:
   ```
   NODE_ENV=production
   JWT_SECRET=your-secret-key-here-change-in-production
   CORS_ORIGIN=https://your-domain.com
   PORT=3000
   ```

5. **انشر!** سيتم نشر التطبيق تلقائياً

---

### 2. النشر على Railway (مجاني)

#### الخطوات:

1. **أنشئ حساب على Railway**: https://railway.app

2. **اربط حساب GitHub**:
   - اضغط "New Project"
   - "Deploy from GitHub repo"
   - اختر المستودع

3. **Railway سيتعرف تلقائياً على Node.js**

4. **أضف متغيرات البيئة**:
   ```
   JWT_SECRET=your-secret-key-here
   CORS_ORIGIN=*
   NODE_ENV=production
   ```

5. **انشر!**

---

### 3. النشر على VPS (Ubuntu/Debian)

#### المتطلبات:
- خادم Ubuntu 20.04+ أو Debian 10+
- Node.js 18+
- Nginx
- PM2

#### الخطوات:

```bash
# 1. تحديث النظام
sudo apt update && sudo apt upgrade -y

# 2. تثبيت Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. تثبيت Git
sudo apt install git -y

# 4. استنساخ المشروع
cd /var/www
git clone https://github.com/your-username/elsaada-pharmacy.git
cd elsaada-pharmacy

# 5. تثبيت المكتبات
npm install --production

# 6. إنشاء ملف .env
cat > .env << EOF
NODE_ENV=production
JWT_SECRET=your-super-secret-key-change-this
CORS_ORIGIN=https://your-domain.com
PORT=3000
EOF

# 7. تثبيت PM2
sudo npm install -g pm2

# 8. بدء التطبيق
pm2 start server.js --name elsaada-pharmacy

# 9. جعل PM2 يبدأ مع النظام
pm2 startup
pm2 save

# 10. تثبيت Nginx
sudo apt install nginx -y

# 11. تكوين Nginx
sudo nano /etc/nginx/sites-available/elsaada-pharmacy
```

#### تكوين Nginx:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
}
```

#### تفعيل الموقع:

```bash
# ربط الملف
sudo ln -s /etc/nginx/sites-available/elsaada-pharmacy /etc/nginx/sites-enabled/

# اختبار التكوين
sudo nginx -t

# إعادة تشغيل Nginx
sudo systemctl restart nginx

# تمكين HTTPS مع Let's Encrypt
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

### 4. النشر على Docker

#### إنشاء Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

#### إنشاء docker-compose.yml:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGIN=${CORS_ORIGIN}
    volumes:
      - ./database:/app/database
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped
```

#### البناء والتشغيل:

```bash
docker-compose up -d --build
```

---

### 5. النشر على Heroku

```bash
# تثبيت Heroku CLI
npm install -g heroku

# تسجيل الدخول
heroku login

# إنشاء تطبيق جديد
heroku create elsaada-pharmacy

# إضافة remote
heroku git:remote -a elsaada-pharmacy

# دفع الكود
git push heroku main

# إضافة متغيرات البيئة
heroku config:set JWT_SECRET=your-secret-key
heroku config:set CORS_ORIGIN=*
heroku config:set NODE_ENV=production

# فتح التطبيق
heroku open
```

---

## 🔐 أفضل ممارسات الأمان

### 1. متغيرات البيئة الحساسة

```bash
# لا تضع أبداً في الكود
❌ JWT_SECRET = 'hardcoded-secret'

# استخدم دائماً متغيرات البيئة
✅ JWT_SECRET = process.env.JWT_SECRET
```

### 2. HTTPS إلزامي

```nginx
# إعادة توجيه HTTP إلى HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### 3. Rate Limiting

مُفعّل تلقائياً في `server.js`:
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

### 4. Helmet Security

مُفعّل تلقائياً:
```javascript
app.use(helmet());
```

---

## 📊 المراقبة Monitoring

### 1. PM2 Monitoring

```bash
# عرض الحالة
pm2 status

# عرض السجلات
pm2 logs elsaada-pharmacy

# مراقبة الأداء
pm2 monit

# إحصائيات
pm2 show elsaada-pharmacy
```

### 2. إعداد Sentry للأخطاء

```bash
npm install @sentry/node
```

في `server.js`:
```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: 'your-sentry-dsn',
  environment: process.env.NODE_ENV,
});
```

---

## 💾 النسخ الاحتياطي

### قاعدة البيانات SQLite:

```bash
# نسخ احتياطي يومي
0 2 * * * cp /var/www/elsaada-pharmacy/database/pharmacy.db /backups/pharmacy-$(date +\%Y\%m\%d).db

# استعادة النسخة
cp /backups/pharmacy-20240101.db /var/www/elsaada-pharmacy/database/pharmacy.db
```

### PostgreSQL (إذا استخدمت):

```bash
# نسخ احتياطي
pg_dump -U username database_name > backup.sql

# استعادة
psql -U username database_name < backup.sql
```

---

## 🔄 التحديثات

### تحديث التطبيق:

```bash
cd /var/www/elsaada-pharmacy

# سحب التحديثات
git pull

# تثبيت المكتبات الجديدة
npm install

# إعادة التشغيل
pm2 restart elsaada-pharmacy
```

### التحديث التلقائي:

```bash
# تثبيت auto-updater
npm install -g pm2-auto-pull

# في package.json
{
  "scripts": {
    "postinstall": "pm2 auto-pull save"
  }
}
```

---

## 📈 تحسين الأداء

### 1. تمكين Gzip Compression

في Nginx:
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript 
           application/x-javascript application/xml+rss 
           application/json application/javascript;
```

### 2. استخدام CDN للـ Static Files

```html
<!-- في HTML -->
<link rel="stylesheet" href="https://cdn.your-domain.com/style.css">
```

### 3. Database Indexing

قاعدة البيانات تحتوي بالفعل على فهارس:
```sql
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_sales_tenant ON sales(tenant_id);
CREATE INDEX idx_sales_date ON sales(sale_date);
```

---

## 🆘 حل المشاكل

### المشكلة: التطبيق لا يعمل

```bash
# فحص السجلات
pm2 logs elsaada-pharmacy

# فحص المنفذ
netstat -tulpn | grep 3000

# إعادة التشغيل
pm2 restart elsaada-pharmacy
```

### المشكلة: خطأ في قاعدة البيانات

```bash
# فحص الصلاحيات
ls -la /var/www/elsaada-pharmacy/database/

# إصلاح الصلاحيات
chmod 644 /var/www/elsaada-pharmacy/database/*.db
chown www-data:www-data /var/www/elsaada-pharmacy/database/
```

### المشكلة: Nginx لا يعمل

```bash
# اختبار التكوين
sudo nginx -t

# إعادة التشغيل
sudo systemctl restart nginx

# فحص الحالة
sudo systemctl status nginx
```

---

## 📞 الدعم

للمزيد من المساعدة:
- Express Docs: https://expressjs.com/
- PM2 Docs: https://pm2.keymetrics.io/
- Nginx Docs: https://nginx.org/en/docs/

---

**جاهز للنشر! 🎉**
