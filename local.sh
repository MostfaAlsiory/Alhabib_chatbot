# إنشاء مستخدم جديد مخصص للـ API مع صلاحيات كاملة
/user add name=flask_api password=Secure@1234 group=full comment="API User for Flask App" disabled=no

# تفعيل خدمة API وفتح المنفذ 8728
/ip service set api disabled=no port=8728 address=0.0.0.0/0

# إضافة قاعدة جدار ناري للسماح بمنفذ API
/ip firewall filter add chain=input protocol=tcp dst-port=8728 action=accept comment="Allow Flask API" src-address=0.0.0.0/0

# اختبار الاتصال الداخلي بالـ API باستخدام المستخدم الجديد
:put "=== اختبار الاتصال بالـ API ==="
/tool fetch url="http://127.0.0.1:8728/rest/system/resource" mode=http user=flask_api password=Secure@1234

# عرض بيانات المستخدم والإعدادات
:put "=== بيانات المستخدم ==="
/user print where name=flask_api
:put "=== إعدادات API ==="
/ip service print where name=api
:put "=== قواعد الجدار الناري ==="
/ip firewall filter print where comment~"Allow Flask"