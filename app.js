/* ==========================================================================
   Informatics Engineer Portfolio — app.js
   --------------------------------------------------------------------------
   Responsibilities
     1. Config, i18n dictionary and inline SVG icon set
     2. Utilities (escaping, paths, hashing, base64, toasts)
     3. Data layer: data.json  ->  localStorage draft  ->  live render
     4. Site rendering (hero, about, skills, projects, timeline, contact)
     5. Interactions: theme, language, navbar, scroll progress, reveal,
        counters, 3D tilt, project modal, filters, contact form
     6. Hero particle network (canvas)
     7. Admin dashboard: PIN gate, schema-driven CRUD, import/export,
        and one-click publishing of data.json through the GitHub REST API

   Security notes
     - The PIN is only a UI gate: data.json (and therefore the PIN hash) is
       public on GitHub Pages. The real write-protection is the GitHub token,
       which is NEVER written to data.json — it lives in sessionStorage
       (or localStorage if the owner explicitly opts in) on the owner's device.
     - Every value coming from data.json is HTML-escaped before rendering and
       every URL is sanitised to block `javascript:` style payloads.
   ========================================================================== */
'use strict';

(() => {
  /* ======================================================================
     1. CONFIG
     ====================================================================== */
  const CONFIG = {
    dataUrl: 'data.json',
    pinSalt: 'portfolio-admin:',
    defaultPinHash: 'db761f8e2ed364fe9c35da8e498e31121815544670a228024ba0171c653e66cb', // "2468"
    maxPinAttempts: 5,
    lockoutMs: 30000,
    storage: {
      draft: 'pf_draft',
      theme: 'pf_theme',
      lang: 'pf_lang',
      token: 'pf_gh_token',
      session: 'pf_admin_session',
      attempts: 'pf_pin_attempts',
      lockUntil: 'pf_pin_lock'
    },
    categories: ['ai', 'networks', 'web'],
    timelineTypes: ['work', 'education', 'cert'],
    socialPlatforms: ['github', 'linkedin', 'mail', 'x', 'facebook', 'instagram', 'youtube', 'telegram', 'whatsapp', 'website'],
    pickerIcons: ['brain', 'cpu', 'server', 'network', 'code', 'terminal', 'shield', 'lock', 'database', 'cloud', 'layout', 'globe', 'mobile', 'chart', 'rocket', 'star', 'graduation', 'wrench', 'layers', 'clock', 'headset', 'briefcase', 'award', 'coffee'],
    // Brand/technology icons come from Simple Icons (pinned version, CORS-enabled CDN)
    simpleIconsBase: 'https://cdn.jsdelivr.net/npm/simple-icons@13.21.0/icons/',
    techSuggestions: [
      'python', 'docker', 'linux', 'postgresql', 'mysql', 'mongodb', 'redis', 'kubernetes', 'nginx', 'git', 'github', 'githubactions',
      'javascript', 'typescript', 'react', 'vuedotjs', 'nodedotjs', 'html5', 'css3', 'django', 'fastapi', 'flask', 'pytorch', 'tensorflow',
      'opencv', 'huggingface', 'pandas', 'numpy', 'scikitlearn', 'jupyter', 'cisco', 'mikrotik', 'fortinet', 'wireshark', 'ubuntu', 'debian',
      'ansible', 'grafana', 'prometheus', 'gnubash', 'figma', 'flutter', 'firebase', 'dotnet', 'php', 'laravel', 'sqlite', 'apache', 'vmware',
      'proxmox', 'openai', 'langchain', 'android', 'kotlin', 'go', 'rust', 'cplusplus', 'tailwindcss'
    ]
  };

  /* ======================================================================
     I18N DICTIONARY (static UI strings — content lives in data.json)
     ====================================================================== */
  const I18N = {
    ar: {
      'skip': 'تخطَّ إلى المحتوى',
      'nav.about': 'نبذة', 'nav.skills': 'المهارات', 'nav.projects': 'المشاريع', 'nav.experience': 'المسيرة', 'nav.contact': 'تواصل',
      'draft.notice': 'أنت تشاهد مسودة محلية غير منشورة.', 'draft.open': 'فتح لوحة التحكم',
      'hero.available': 'متاح لفرص جديدة', 'hero.hello': 'مرحباً، أنا', 'hero.cv': 'تحميل السيرة الذاتية', 'hero.contact': 'تواصل معي',
      'about.eyebrow': 'من أنا', 'about.title': 'نبذة ومجالات الخبرة', 'about.who': 'المهندس خلف الكود',
      'skills.eyebrow': 'الأدوات والتقنيات', 'skills.title': 'المهارات التقنية',
      'projects.eyebrow': 'أعمال مختارة', 'projects.title': 'معرض المشاريع', 'projects.empty': 'لا توجد مشاريع في هذا التصنيف بعد.',
      'filter.all': 'الكل', 'filter.ai': 'ذكاء صنعي / خلفية', 'filter.networks': 'شبكات', 'filter.web': 'ويب',
      'cat.ai': 'ذكاء صنعي / خلفية', 'cat.networks': 'شبكات', 'cat.web': 'ويب',
      'project.details': 'عرض التفاصيل', 'project.code': 'الكود المصدري', 'project.demo': 'معاينة حية', 'project.featured': 'مميّز',
      'exp.eyebrow': 'المسيرة', 'exp.title': 'الخبرات والتعليم والشهادات',
      'tl.work': 'خبرة عملية', 'tl.education': 'تعليم', 'tl.cert': 'شهادات',
      'contact.eyebrow': 'لنعمل معاً', 'contact.title': 'تواصل معي', 'contact.lead': 'لديك مشروع أو فرصة؟',
      'contact.text': 'يسعدني مناقشة الأفكار الجديدة، الاستشارات التقنية، أو فرص التعاون. أرد عادةً خلال 24 ساعة.',
      'contact.email': 'البريد الإلكتروني', 'contact.phone': 'الهاتف', 'contact.location': 'الموقع',
      'form.name': 'الاسم الكامل', 'form.email': 'البريد الإلكتروني', 'form.subject': 'الموضوع', 'form.message': 'رسالتك', 'form.send': 'إرسال الرسالة',
      'form.sending': 'جارٍ الإرسال...', 'form.sent': 'تم إرسال رسالتك بنجاح، شكراً لك!',
      'form.mailto': 'سيُفتح تطبيق البريد لديك لإكمال الإرسال.', 'form.failed': 'تعذّر الإرسال، حاول مجدداً أو راسلني مباشرة عبر البريد.',
      'err.required': 'هذا الحقل مطلوب', 'err.email': 'بريد إلكتروني غير صالح', 'err.min': 'أدخل {n} أحرف على الأقل',
      'footer.rights': 'جميع الحقوق محفوظة.',
      'pin.title': 'لوحة التحكم', 'pin.text': 'أدخل رمز الدخول للمتابعة', 'pin.enter': 'دخول',
      'pin.wrong': 'رمز غير صحيح. المحاولات المتبقية: {n}', 'pin.locked': 'محاولات كثيرة. حاول بعد {s} ثانية.',
      'common.cancel': 'إلغاء',
      'admin.title': 'لوحة التحكم', 'admin.lock': 'قفل', 'admin.export': 'تصدير JSON', 'admin.import': 'استيراد',
      'admin.discard': 'تجاهل المسودة', 'admin.publish': 'نشر على GitHub',
      'adm.tab.profile': 'الملف الشخصي', 'adm.tab.stats': 'الإحصائيات', 'adm.tab.about': 'النبذة والخبرات', 'adm.tab.skills': 'المهارات',
      'adm.tab.projects': 'المشاريع', 'adm.tab.timeline': 'المسيرة', 'adm.tab.socials': 'الروابط', 'adm.tab.settings': 'الإعدادات والنشر',
      'adm.add': 'إضافة', 'adm.edit': 'تعديل', 'adm.new': 'إضافة جديد', 'adm.save': 'حفظ التغييرات', 'adm.delete': 'حذف',
      'adm.up': 'نقل للأعلى', 'adm.down': 'نقل للأسفل', 'adm.empty': 'لا توجد عناصر بعد. ابدأ بالإضافة.',
      'adm.confirmDelete': 'هل تريد حذف "{name}" نهائياً من المسودة؟', 'adm.confirmDeleteGroup': 'سيتم أيضاً حذف {n} مهارة مرتبطة بهذه الفئة. متابعة؟',
      'adm.required': 'الحقل "{field}" مطلوب.', 'adm.slugInvalid': 'المعرّف يجب أن يحتوي أحرفاً إنجليزية صغيرة وأرقاماً وشرطات فقط.',
      'adm.slugTaken': 'هذا المعرّف مستخدم مسبقاً.',
      'adm.statusDraft': 'مسودة محلية غير منشورة · آخر تعديل {time}', 'adm.statusClean': 'المحتوى متطابق مع data.json المنشور',
      'adm.statusFallback': 'تعذّر تحميل data.json — استورد ملفاً أو شغّل الموقع عبر خادم',
      'col.stats': 'الإحصائيات السريعة', 'col.expertise': 'مجالات الخبرة', 'col.skillGroups': 'فئات المهارات', 'col.skills': 'المهارات',
      'col.projects': 'المشاريع', 'col.timeline': 'محطات المسيرة', 'col.socials': 'الحسابات المهنية',
      'sec.summary': 'النبذة التعريفية', 'sec.profile': 'البيانات الأساسية', 'sec.general': 'إعدادات عامة', 'sec.github': 'النشر عبر GitHub API', 'sec.pin': 'تغيير رمز الدخول',
      'f.initials': 'الأحرف الأولى (الشعار)', 'f.name': 'الاسم', 'f.title': 'المسمى / العنوان', 'f.tagline': 'الوصف التعريفي', 'f.location': 'الموقع',
      'f.email': 'البريد الإلكتروني', 'f.phone': 'الهاتف', 'f.avatar': 'رابط الصورة الشخصية', 'f.cvUrl': 'رابط السيرة الذاتية (PDF)',
      'f.available': 'إظهار شارة "متاح لفرص جديدة"', 'f.value': 'القيمة', 'f.suffix': 'اللاحقة (+، %)', 'f.label': 'التسمية', 'f.icon': 'الأيقونة',
      'f.description': 'الوصف', 'f.summary': 'ملخص قصير', 'f.slug': 'المعرّف (slug)', 'f.group': 'الفئة', 'f.level': 'مستوى الإتقان',
      'f.category': 'التصنيف', 'f.year': 'السنة', 'f.featured': 'مشروع مميّز', 'f.image': 'رابط صورة الغلاف (اختياري)', 'f.tags': 'الوسوم / التقنيات',
      'f.github': 'رابط GitHub', 'f.demo': 'رابط المعاينة الحية', 'f.type': 'النوع', 'f.period': 'الفترة', 'f.org': 'الجهة / المؤسسة',
      'f.platform': 'المنصة', 'f.url': 'الرابط', 'f.defaultLang': 'اللغة الافتراضية للزوار', 'f.defaultTheme': 'الوضع الافتراضي للزوار',
      'f.formEndpoint': 'رابط نموذج التواصل (Formspree مثلاً — اختياري)', 'f.owner': 'اسم المستخدم / المنظمة (Owner)', 'f.repo': 'اسم المستودع (Repo)',
      'f.branch': 'الفرع (Branch)', 'f.path': 'مسار الملف', 'f.token': 'GitHub Personal Access Token', 'f.remember': 'تذكّر التوكن على هذا الجهاز (غير مستحسن على الأجهزة المشتركة)',
      'f.newPin': 'الرمز الجديد', 'f.confirmPin': 'تأكيد الرمز',
      'hint.tags': 'افصل بين العناصر بفاصلة ,',
      'hint.multiline': 'كل سطر جديد يظهر كفقرة مستقلة.',
      'hint.profile': 'كل التعديلات تُحفظ فوراً كمسودة في متصفحك وتظهر مباشرة في الموقع. لنشرها للعامة استخدم <strong>نشر على GitHub</strong> أو <strong>تصدير JSON</strong> واستبدل الملف في المستودع.',
      'hint.github': 'أنشئ <strong>Fine-grained token</strong> من GitHub ← Settings ← Developer settings، وامنحه صلاحية <strong>Contents: Read and write</strong> على هذا المستودع فقط. التوكن لا يُكتب أبداً داخل data.json، ويُحفظ في جلسة المتصفح فقط ما لم تفعّل خيار التذكّر.',
      'hint.pin': 'تنبيه: الرمز حماية لواجهة اللوحة فقط لأن data.json عام. الحماية الفعلية للنشر هي توكن GitHub. استخدم رمزاً من 6 خانات أو أكثر، ثم انشر لتطبيقه على الموقع المباشر.',
      'hint.slug': 'يُستخدم لربط المهارات بالفئة ولا يمكن تغييره بعد الإنشاء.',
      'opt.dark': 'ليلي', 'opt.light': 'نهاري', 'opt.ar': 'العربية', 'opt.en': 'English',
      'gh.saveSettings': 'حفظ الإعدادات', 'gh.test': 'اختبار الاتصال', 'gh.publishNow': 'نشر الآن',
      'gh.missing': 'أكمل إعدادات GitHub (Owner, Repo, Token) أولاً.', 'gh.publishing': 'جارٍ النشر على GitHub...',
      'gh.success': 'تم النشر بنجاح ✓ (commit {sha}). سيتحدّث GitHub Pages خلال دقيقة تقريباً.',
      'gh.testOk': 'الاتصال ناجح ✓ لديك صلاحية الكتابة على {repo}.', 'gh.testNoPush': 'الاتصال ناجح لكن التوكن لا يملك صلاحية الكتابة.',
      'gh.err401': 'التوكن غير صالح أو منتهي الصلاحية (401).', 'gh.err403': 'التوكن لا يملك الصلاحيات الكافية أو تم تجاوز حد الطلبات (403).',
      'gh.err404': 'المستودع أو الفرع غير موجود، أو أن التوكن لا يملك وصولاً إليه (404).', 'gh.errNet': 'تعذّر الاتصال بـ GitHub. تحقق من الإنترنت.',
      'gh.err': 'فشل النشر: {msg}',
      'toast.saved': 'تم الحفظ في المسودة ✓', 'toast.deleted': 'تم الحذف', 'toast.exported': 'تم تصدير data.json',
      'toast.imported': 'تم استيراد البيانات بنجاح', 'toast.importBad': 'ملف غير صالح — تأكد أنه data.json بالبنية الصحيحة.',
      'toast.importConfirm': 'سيستبدل الاستيراد كل بيانات المسودة الحالية. متابعة؟',
      'toast.discarded': 'تم تجاهل المسودة واستعادة البيانات المنشورة', 'toast.discardConfirm': 'سيتم حذف كل التعديلات غير المنشورة. متابعة؟',
      'toast.pinChanged': 'تم تغيير الرمز في المسودة. انشر لتطبيقه على الموقع المباشر.', 'toast.pinMismatch': 'الرمزان غير متطابقين.',
      'toast.pinShort': 'الرمز يجب أن يكون 4 خانات على الأقل.', 'toast.loadFail': 'تعذّر تحميل data.json. شغّل الموقع عبر خادم محلي أو GitHub Pages.',
      'toast.locked': 'تم قفل لوحة التحكم', 'toast.noCrypto': 'المتصفح لا يدعم التشفير في هذا السياق (يتطلب HTTPS).',
      'toast.settingsSaved': 'تم حفظ الإعدادات',
      'nav.services': 'الخدمات', 'nav.courses': 'الدورات',
      'services.eyebrow': 'ماذا أقدّم', 'services.title': 'الخدمات التي أقدمها', 'svc.request': 'اطلب الخدمة',
      'svc.msg': 'مرحباً، أرغب بطلب خدمة: {service}',
      'why.eyebrow': 'قيمة مضافة', 'why.title': 'لماذا تختارني؟',
      'courses.eyebrow': 'التعلّم المستمر', 'courses.title': 'الدورات التدريبية والشهادات',
      'course.cert': 'عرض الشهادة', 'course.hours': '{n} ساعة',
      'contact.whatsapp': 'واتساب مباشر', 'wa.fab': 'تواصل عبر واتساب',
      'adm.tab.services': 'الخدمات', 'adm.tab.courses': 'الدورات',
      'col.services': 'الخدمات', 'col.whyMe': 'لماذا تختارني؟', 'col.courses': 'الدورات التدريبية',
      'f.whatsapp': 'رقم واتساب (بالصيغة الدولية بدون + أو 00)', 'f.whatsappMessage': 'رسالة واتساب الافتراضية', 'f.replyTime': 'وقت الرد',
      'f.client': 'الجهة / العميل', 'f.subtitle': 'الوصف المختصر', 'f.provider': 'الجهة المانحة', 'f.date': 'التاريخ', 'f.hours': 'عدد الساعات',
      'f.certificateUrl': 'رابط الشهادة (صورة أو PDF — اختياري)', 'f.techIcon': 'أيقونة التقنية',
      'f.showTicker': 'إظهار شريط التقنيات المتحرك', 'f.showWhatsappFab': 'إظهار زر واتساب العائم',
      'hint.techIcon': 'اكتب اسم التقنية بالإنجليزية (docker, linux, postgresql...) من مكتبة Simple Icons، أو اسم أيقونة مدمجة، أو رابط صورة.',
      'hint.iconMissing': 'لم يتم العثور على هذه الأيقونة — جرّب اسماً آخر.',
      'hint.whatsapp': 'مثال: 963912345678',
      'f.roles': 'المسميات الوظيفية المتحركة', 'hint.roles': 'اكتب كل مسمى في سطر مستقل — تُعرض بالتتابع بتأثير الكتابة والحذف.'
    },
    en: {
      'skip': 'Skip to content',
      'nav.about': 'About', 'nav.skills': 'Skills', 'nav.projects': 'Projects', 'nav.experience': 'Journey', 'nav.contact': 'Contact',
      'draft.notice': 'You are viewing an unpublished local draft.', 'draft.open': 'Open dashboard',
      'hero.available': 'Available for new opportunities', 'hero.hello': "Hello, I'm", 'hero.cv': 'Download CV', 'hero.contact': 'Get in touch',
      'about.eyebrow': 'About me', 'about.title': 'Profile & Expertise', 'about.who': 'The engineer behind the code',
      'skills.eyebrow': 'Tools & technologies', 'skills.title': 'Technical Skills',
      'projects.eyebrow': 'Selected work', 'projects.title': 'Projects Showcase', 'projects.empty': 'No projects in this category yet.',
      'filter.all': 'All', 'filter.ai': 'AI / Backend', 'filter.networks': 'Networks', 'filter.web': 'Web',
      'cat.ai': 'AI / Backend', 'cat.networks': 'Networks', 'cat.web': 'Web',
      'project.details': 'View details', 'project.code': 'Source code', 'project.demo': 'Live preview', 'project.featured': 'Featured',
      'exp.eyebrow': 'Journey', 'exp.title': 'Experience, Education & Certifications',
      'tl.work': 'Experience', 'tl.education': 'Education', 'tl.cert': 'Certifications',
      'contact.eyebrow': "Let's work together", 'contact.title': 'Contact Me', 'contact.lead': 'Have a project or an opportunity?',
      'contact.text': "I'm happy to discuss new ideas, technical consulting or collaboration. I usually reply within 24 hours.",
      'contact.email': 'Email', 'contact.phone': 'Phone', 'contact.location': 'Location',
      'form.name': 'Full name', 'form.email': 'Email address', 'form.subject': 'Subject', 'form.message': 'Your message', 'form.send': 'Send message',
      'form.sending': 'Sending...', 'form.sent': 'Your message was sent successfully — thank you!',
      'form.mailto': 'Your email app will open to complete sending.', 'form.failed': 'Sending failed. Please try again or email me directly.',
      'err.required': 'This field is required', 'err.email': 'Invalid email address', 'err.min': 'Enter at least {n} characters',
      'footer.rights': 'All rights reserved.',
      'pin.title': 'Dashboard', 'pin.text': 'Enter your access PIN to continue', 'pin.enter': 'Unlock',
      'pin.wrong': 'Wrong PIN. Attempts left: {n}', 'pin.locked': 'Too many attempts. Try again in {s}s.',
      'common.cancel': 'Cancel',
      'admin.title': 'Dashboard', 'admin.lock': 'Lock', 'admin.export': 'Export JSON', 'admin.import': 'Import',
      'admin.discard': 'Discard draft', 'admin.publish': 'Publish to GitHub',
      'adm.tab.profile': 'Profile', 'adm.tab.stats': 'Stats', 'adm.tab.about': 'About & Expertise', 'adm.tab.skills': 'Skills',
      'adm.tab.projects': 'Projects', 'adm.tab.timeline': 'Journey', 'adm.tab.socials': 'Links', 'adm.tab.settings': 'Settings & Publish',
      'adm.add': 'Add', 'adm.edit': 'Edit', 'adm.new': 'Add new', 'adm.save': 'Save changes', 'adm.delete': 'Delete',
      'adm.up': 'Move up', 'adm.down': 'Move down', 'adm.empty': 'Nothing here yet. Start by adding an item.',
      'adm.confirmDelete': 'Delete "{name}" from the draft?', 'adm.confirmDeleteGroup': '{n} skill(s) in this group will also be deleted. Continue?',
      'adm.required': 'The field "{field}" is required.', 'adm.slugInvalid': 'The slug may only contain lowercase letters, digits and dashes.',
      'adm.slugTaken': 'This slug is already in use.',
      'adm.statusDraft': 'Unpublished local draft · last edit {time}', 'adm.statusClean': 'Content matches the published data.json',
      'adm.statusFallback': 'data.json could not be loaded — import a file or serve the site over HTTP',
      'col.stats': 'Quick stats', 'col.expertise': 'Areas of expertise', 'col.skillGroups': 'Skill groups', 'col.skills': 'Skills',
      'col.projects': 'Projects', 'col.timeline': 'Journey milestones', 'col.socials': 'Professional accounts',
      'sec.summary': 'Profile summary', 'sec.profile': 'Basic information', 'sec.general': 'General settings', 'sec.github': 'Publish via GitHub API', 'sec.pin': 'Change access PIN',
      'f.initials': 'Initials (logo)', 'f.name': 'Name', 'f.title': 'Title', 'f.tagline': 'Tagline', 'f.location': 'Location',
      'f.email': 'Email', 'f.phone': 'Phone', 'f.avatar': 'Avatar image URL', 'f.cvUrl': 'CV link (PDF)',
      'f.available': 'Show the "available" badge', 'f.value': 'Value', 'f.suffix': 'Suffix (+, %)', 'f.label': 'Label', 'f.icon': 'Icon',
      'f.description': 'Description', 'f.summary': 'Short summary', 'f.slug': 'Slug', 'f.group': 'Group', 'f.level': 'Proficiency',
      'f.category': 'Category', 'f.year': 'Year', 'f.featured': 'Featured project', 'f.image': 'Cover image URL (optional)', 'f.tags': 'Tags / technologies',
      'f.github': 'GitHub URL', 'f.demo': 'Live demo URL', 'f.type': 'Type', 'f.period': 'Period', 'f.org': 'Organisation',
      'f.platform': 'Platform', 'f.url': 'URL', 'f.defaultLang': 'Default language for visitors', 'f.defaultTheme': 'Default theme for visitors',
      'f.formEndpoint': 'Contact form endpoint (e.g. Formspree — optional)', 'f.owner': 'Owner (user / organisation)', 'f.repo': 'Repository',
      'f.branch': 'Branch', 'f.path': 'File path', 'f.token': 'GitHub Personal Access Token', 'f.remember': 'Remember the token on this device (avoid on shared devices)',
      'f.newPin': 'New PIN', 'f.confirmPin': 'Confirm PIN',
      'hint.tags': 'Separate items with commas',
      'hint.multiline': 'Each new line becomes its own paragraph.',
      'hint.profile': 'Every change is saved instantly as a draft in your browser and shown live on the site. To make it public use <strong>Publish to GitHub</strong> or <strong>Export JSON</strong> and replace the file in the repository.',
      'hint.github': 'Create a <strong>fine-grained token</strong> in GitHub → Settings → Developer settings with <strong>Contents: Read and write</strong> on this repository only. The token is never written into data.json and is kept in this browser session only unless you opt in to remember it.',
      'hint.pin': 'Note: the PIN only gates this UI because data.json is public. The real protection for publishing is your GitHub token. Use 6+ characters, then publish to apply it to the live site.',
      'hint.slug': 'Used to link skills to the group; it cannot be changed after creation.',
      'opt.dark': 'Dark', 'opt.light': 'Light', 'opt.ar': 'العربية', 'opt.en': 'English',
      'gh.saveSettings': 'Save settings', 'gh.test': 'Test connection', 'gh.publishNow': 'Publish now',
      'gh.missing': 'Complete the GitHub settings (owner, repo, token) first.', 'gh.publishing': 'Publishing to GitHub...',
      'gh.success': 'Published ✓ (commit {sha}). GitHub Pages will refresh in about a minute.',
      'gh.testOk': 'Connected ✓ You have write access to {repo}.', 'gh.testNoPush': 'Connected, but the token has no write access.',
      'gh.err401': 'The token is invalid or expired (401).', 'gh.err403': 'Insufficient token permissions or rate limit exceeded (403).',
      'gh.err404': 'Repository or branch not found, or the token cannot access it (404).', 'gh.errNet': 'Could not reach GitHub. Check your connection.',
      'gh.err': 'Publishing failed: {msg}',
      'toast.saved': 'Saved to draft ✓', 'toast.deleted': 'Deleted', 'toast.exported': 'data.json exported',
      'toast.imported': 'Data imported successfully', 'toast.importBad': 'Invalid file — make sure it is a data.json with the right structure.',
      'toast.importConfirm': 'Importing replaces the whole current draft. Continue?',
      'toast.discarded': 'Draft discarded — published data restored', 'toast.discardConfirm': 'All unpublished changes will be lost. Continue?',
      'toast.pinChanged': 'PIN changed in the draft. Publish to apply it to the live site.', 'toast.pinMismatch': 'The PINs do not match.',
      'toast.pinShort': 'The PIN must be at least 4 characters.', 'toast.loadFail': 'Could not load data.json. Serve the site via a local server or GitHub Pages.',
      'toast.locked': 'Dashboard locked', 'toast.noCrypto': 'Hashing is unavailable in this context (HTTPS required).',
      'toast.settingsSaved': 'Settings saved',
      'nav.services': 'Services', 'nav.courses': 'Courses',
      'services.eyebrow': 'What I offer', 'services.title': 'Services', 'svc.request': 'Request service',
      'svc.msg': "Hello, I'd like to request the service: {service}",
      'why.eyebrow': 'Added value', 'why.title': 'Why Work With Me?',
      'courses.eyebrow': 'Lifelong learning', 'courses.title': 'Training Courses & Certificates',
      'course.cert': 'View certificate', 'course.hours': '{n} hours',
      'contact.whatsapp': 'WhatsApp', 'wa.fab': 'Chat on WhatsApp',
      'adm.tab.services': 'Services', 'adm.tab.courses': 'Courses',
      'col.services': 'Services', 'col.whyMe': 'Why work with me', 'col.courses': 'Training courses',
      'f.whatsapp': 'WhatsApp number (international, no + or 00)', 'f.whatsappMessage': 'Default WhatsApp message', 'f.replyTime': 'Reply time',
      'f.client': 'Client / organisation', 'f.subtitle': 'Short description', 'f.provider': 'Provider', 'f.date': 'Date', 'f.hours': 'Hours',
      'f.certificateUrl': 'Certificate link (image or PDF — optional)', 'f.techIcon': 'Technology icon',
      'f.showTicker': 'Show the moving tech ticker', 'f.showWhatsappFab': 'Show the floating WhatsApp button',
      'hint.techIcon': 'Type the technology name (docker, linux, postgresql...) from Simple Icons, a built-in icon name, or an image URL.',
      'hint.iconMissing': 'Icon not found — try another name.',
      'hint.whatsapp': 'Example: 963912345678',
      'f.roles': 'Rotating job titles', 'hint.roles': 'One title per line — shown in sequence with a typing and deleting effect.'
    }
  };

  /* ======================================================================
     ICONS (24×24 stroke icons, inlined to avoid external dependencies)
     ====================================================================== */
  const ICONS = {
    brain: '<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.04Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.04Z"/>',
    cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2"/>',
    server: '<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01M6 18h.01"/>',
    network: '<rect x="9" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3M12 12V8"/>',
    code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    terminal: '<path d="m4 17 6-6-6-6M12 19h8"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
    layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    mobile: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
    chart: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
    star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    graduation: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
    github: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>',
    linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
    mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/>',
    x: '<path d="M4 4l11.73 16H20L8.27 4H4z"/><path d="M4 20l6.77-6.77M13.23 10.77 20 4"/>',
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    youtube: '<path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><path d="m9.75 15.02 5.75-3.27-5.75-3.27v6.54z"/>',
    telegram: '<path d="m22 2-7 20-4-9-9-4 20-7z"/><path d="M22 2 11 13"/>',
    whatsapp: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
    website: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7l10-5z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    headset: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    coffee: '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M6 2v2M10 2v2M14 2v2"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'
  };

  /* ======================================================================
     STATE
     ====================================================================== */
  const state = {
    data: null,        // working copy rendered on the page
    remote: null,      // last copy fetched from data.json
    source: 'remote',  // 'remote' | 'draft' | 'fallback'
    lang: 'ar',
    theme: 'dark',
    projectFilter: 'all',
    timelineFilter: 'all',
    skillFilter: 'all',
    adminTab: 'profile'
  };

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ======================================================================
     2. UTILITIES
     ====================================================================== */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /** Escape a value for safe insertion into HTML text or attributes. */
  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  /** Allow only safe URL schemes (http, https, mailto, tel) and relative paths. */
  const safeUrl = (url) => {
    const value = String(url ?? '').trim();
    if (!value) return '';
    if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return ''; // any other scheme (javascript:, data:, ...)
    return value; // relative path such as "cv.pdf" or "assets/me.jpg"
  };

  const clone = (obj) => JSON.parse(JSON.stringify(obj));

  /** Translate a UI key with optional {placeholders}. */
  const t = (key, vars) => {
    let str = (I18N[state.lang] && I18N[state.lang][key]) ?? I18N.ar[key] ?? key;
    if (vars) Object.keys(vars).forEach((k) => { str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]); });
    return str;
  };

  /** Pick the current-language value from a bilingual {ar, en} object. */
  const tr = (value) => {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    return value[state.lang] || value.ar || value.en || '';
  };

  const icon = (name, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}>${ICONS[name] || ICONS.code}</svg>`;

  /**
   * Render a technology icon. The value can be:
   *   - a built-in icon name  ("server")      → inline SVG
   *   - a Simple Icons slug   ("docker")      → CSS mask tinted with the theme gold
   *   - an image URL / path   ("assets/x.svg") → <img>
   */
  const techIcon = (value) => {
    const v = String(value ?? '').trim();
    if (!v || ICONS[v]) return `<span class="tech-icon">${icon(v || 'code')}</span>`;
    if (/[/.]/.test(v)) {
      const url = safeUrl(v);
      return url ? `<img class="tech-icon tech-icon--img" src="${esc(url)}" alt="" loading="lazy">` : `<span class="tech-icon">${icon('code')}</span>`;
    }
    if (/^[a-z0-9]+$/.test(v)) {
      return `<span class="tech-icon tech-icon--mask" style="--icon:url('${CONFIG.simpleIconsBase}${v}.svg')" aria-hidden="true"></span>`;
    }
    return `<span class="tech-icon">${icon('code')}</span>`;
  };

  const uid = (prefix = 'id') => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  const getPath = (obj, path) => path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);

  const setPath = (obj, path, value) => {
    const keys = path.split('.');
    let cur = obj;
    keys.slice(0, -1).forEach((key) => {
      if (cur[key] == null || typeof cur[key] !== 'object') cur[key] = {};
      cur = cur[key];
    });
    cur[keys[keys.length - 1]] = value;
  };

  const debounce = (fn, wait = 150) => {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); };
  };

  /** Turn multi-line text into escaped <p> paragraphs. */
  const paragraphs = (text) => String(text || '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${esc(line)}</p>`)
    .join('');

  const storage = {
    get(key, area = localStorage) { try { return area.getItem(key); } catch (e) { return null; } },
    set(key, value, area = localStorage) { try { area.setItem(key, value); return true; } catch (e) { return false; } },
    remove(key, area = localStorage) { try { area.removeItem(key); } catch (e) { /* ignore */ } }
  };

  /** SHA-256 hex digest using the Web Crypto API. */
  async function sha256(text) {
    if (!window.crypto || !window.crypto.subtle) throw new Error('no-crypto');
    const bytes = new TextEncoder().encode(text);
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /** UTF-8 safe base64 encoding (required by the GitHub contents API). */
  function toBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  /** Lightweight toast notifications. */
  function toast(message, type = 'info', duration = 3800) {
    const host = $('#toasts');
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.textContent = message;
    host.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-leaving');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, duration);
  }

  /* ======================================================================
     3. DATA LAYER
     ====================================================================== */

  /** Minimal data used only when data.json cannot be fetched (e.g. file://). */
  const FALLBACK_DATA = {
    meta: { version: 1, updatedAt: new Date(0).toISOString() },
    settings: { defaultLang: 'ar', defaultTheme: 'dark', adminPinHash: CONFIG.defaultPinHash, formEndpoint: '', showTicker: true, showWhatsappFab: true, github: { owner: '', repo: '', branch: 'main', path: 'data.json' } },
    profile: {
      initials: 'IE',
      name: { ar: 'مهندس معلوماتية', en: 'Informatics Engineer' },
      title: { ar: 'ذكاء صنعي · شبكات · برمجيات', en: 'AI · Networks · Software' },
      roles: { ar: '', en: '' },
      tagline: { ar: 'تعذّر تحميل data.json — افتح لوحة التحكم (Ctrl + Shift + A) لاستيراد البيانات.', en: 'data.json could not be loaded — open the dashboard (Ctrl + Shift + A) to import data.' },
      location: { ar: '', en: '' }, email: '', phone: '', whatsapp: '', whatsappMessage: { ar: '', en: '' }, replyTime: { ar: '', en: '' },
      avatar: '', cvUrl: '', available: false
    },
    stats: [], about: { summary: { ar: '', en: '' }, expertise: [] },
    services: [], whyMe: [], skillGroups: [], skills: [], projects: [], timeline: [], courses: [], socials: []
  };

  /** Collections that are plain arrays at the top level of data.json. */
  const LIST_KEYS = ['stats', 'services', 'whyMe', 'skillGroups', 'skills', 'projects', 'timeline', 'courses', 'socials'];

  /** Guarantee the expected shape so rendering never crashes on partial data. */
  function normalizeData(input) {
    const d = (input && typeof input === 'object') ? input : {};
    const base = clone(FALLBACK_DATA);
    const out = {
      meta: { ...base.meta, ...(d.meta || {}) },
      settings: { ...base.settings, ...(d.settings || {}), github: { ...base.settings.github, ...((d.settings || {}).github || {}) } },
      profile: { ...base.profile, ...(d.profile || {}) },
      about: { summary: (d.about && d.about.summary) || { ar: '', en: '' }, expertise: (d.about && Array.isArray(d.about.expertise)) ? d.about.expertise : [] }
    };
    LIST_KEYS.forEach((key) => { out[key] = Array.isArray(d[key]) ? d[key] : []; });
    // Make sure every collection item has a stable id (needed for CRUD & modal lookups)
    LIST_KEYS.filter((key) => key !== 'skillGroups').forEach((key) => {
      out[key].forEach((item) => { if (!item.id) item.id = uid(key.slice(0, 2)); });
    });
    out.about.expertise.forEach((item) => { if (!item.id) item.id = uid('ex'); });
    return out;
  }

  const isValidData = (d) => d && typeof d === 'object' && typeof d.profile === 'object' && Array.isArray(d.projects);

  /** Compare content while ignoring the meta block (timestamps). */
  const sameContent = (a, b) => {
    if (!a || !b) return false;
    const strip = (o) => { const c = clone(o); delete c.meta; return JSON.stringify(c); };
    return strip(a) === strip(b);
  };

  async function fetchRemoteData() {
    const res = await fetch(`${CONFIG.dataUrl}?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return normalizeData(await res.json());
  }

  function readDraft() {
    const raw = storage.get(CONFIG.storage.draft);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return isValidData(parsed) ? normalizeData(parsed) : null;
    } catch (e) {
      return null;
    }
  }

  /** Load order: remote data.json, then an optional local draft that overrides it. */
  async function loadData() {
    let remote = null;
    try {
      remote = await fetchRemoteData();
    } catch (err) {
      console.warn('[portfolio] Unable to load data.json:', err);
    }
    state.remote = remote;

    const draft = readDraft();
    if (draft && remote && sameContent(draft, remote)) {
      // The draft has been published and deployed — it is no longer needed.
      storage.remove(CONFIG.storage.draft);
      state.data = remote;
      state.source = 'remote';
    } else if (draft) {
      state.data = draft;
      state.source = 'draft';
    } else if (remote) {
      state.data = remote;
      state.source = 'remote';
    } else {
      state.data = normalizeData(clone(FALLBACK_DATA));
      state.source = 'fallback';
      setTimeout(() => toast(t('toast.loadFail'), 'error', 6500), 600);
    }
  }

  function saveDraft() {
    storage.set(CONFIG.storage.draft, JSON.stringify(state.data));
    state.source = 'draft';
    updateDraftBanner();
  }

  /** Persist a change, re-render the site live and refresh the admin status. */
  function commit(message) {
    state.data.meta.updatedAt = new Date().toISOString();
    saveDraft();
    renderSite();
    updateAdminStatus();
    if (message) toast(message, 'success', 2200);
  }

  function updateDraftBanner() {
    $('#draftBanner').hidden = state.source !== 'draft';
  }

  /* ======================================================================
     4. RENDERING
     ====================================================================== */
  function applyI18n() {
    const html = document.documentElement;
    html.lang = state.lang;
    html.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $('#langLabel').textContent = state.lang === 'ar' ? 'EN' : 'ع';
    $('#langToggle').setAttribute('aria-label', state.lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
  }

  function renderProfile() {
    const p = state.data.profile;
    const name = tr(p.name);
    const title = tr(p.title);

    $('#brandInitials').textContent = p.initials || '';
    $('#brandName').textContent = name;
    $('#heroName').textContent = name;
    // Rotating job titles (one per line) with a typewriter effect; falls back to the static title
    const roles = String(tr(p.roles) || '').split('\n').map((r) => r.trim()).filter(Boolean);
    typewriter.start(roles.length ? roles : [title].filter(Boolean));
    $('#heroTagline').textContent = tr(p.tagline);
    $('#heroBadge').hidden = !p.available;

    const avatar = $('#heroAvatar');
    const avatarUrl = safeUrl(p.avatar);
    avatar.innerHTML = avatarUrl
      ? `<img src="${esc(avatarUrl)}" alt="${esc(name)}" loading="eager">`
      : esc(p.initials || '');

    const cvBtn = $('#cvBtn');
    const cvUrl = safeUrl(p.cvUrl);
    cvBtn.hidden = !cvUrl;
    cvBtn.style.display = cvUrl ? '' : 'none';
    if (cvUrl) cvBtn.href = cvUrl;

    const location = tr(p.location);
    $('#aboutLocation').textContent = location;
    $('#contactLocation').textContent = location;

    [$('#aboutEmail'), $('#contactEmail')].forEach((a) => {
      a.textContent = p.email || '';
      a.href = p.email ? `mailto:${p.email}` : '#';
    });
    const phone = $('#contactPhone');
    phone.textContent = p.phone || '';
    phone.href = p.phone ? `tel:${String(p.phone).replace(/[^\d+]/g, '')}` : '#';
    phone.closest('li').hidden = !p.phone;

    // WhatsApp: contact list entry + floating button
    const wa = waLink(tr(p.whatsappMessage));
    const waItem = $('#contactWhatsapp');
    waItem.href = wa || '#';
    waItem.textContent = p.whatsapp ? `+${String(p.whatsapp).replace(/\D/g, '')}` : '';
    $('#contactWhatsappItem').hidden = !wa;
    const fab = $('#waFab');
    fab.hidden = !wa || state.data.settings.showWhatsappFab === false;
    fab.href = wa || '#';
    fab.setAttribute('aria-label', t('wa.fab'));
    fab.title = t('wa.fab');

    $('#replyTime').textContent = tr(p.replyTime);

    // Hero GitHub button uses the first GitHub entry in the social links
    const ghSocial = state.data.socials.find((s) => s.platform === 'github' && safeUrl(s.url));
    const heroGithub = $('#heroGithub');
    heroGithub.hidden = !ghSocial;
    heroGithub.style.display = ghSocial ? '' : 'none';
    if (ghSocial) heroGithub.href = safeUrl(ghSocial.url);

    $('#footerName').textContent = name;
    $('#year').textContent = new Date().getFullYear();

    document.title = title ? `${name} | ${title}` : name;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', tr(p.tagline));
  }

  /**
   * Typewriter for the hero job titles:
   * type the role letter by letter → hold → delete it with the cursor (accelerating) → next role.
   * Calling start() again (language change, admin edit) cancels the running loop via a token.
   */
  const typewriter = (() => {
    const TYPE_MIN = 65;        // ms per typed character (plus a little random jitter)
    const TYPE_JITTER = 55;
    const HOLD = 1300;          // ms the full title stays visible
    const DELETE_START = 60;    // first delete step; deleting speeds up towards DELETE_MIN
    const DELETE_MIN = 18;
    const GAP = 380;            // pause on the empty line before typing the next title
    let timer = null;
    let token = 0;
    let lastKey = '';

    const sleep = (ms, tk) => new Promise((resolve) => {
      timer = setTimeout(() => resolve(tk === token), ms);
    });

    async function run(roles, tk) {
      const host = $('#heroTitle');
      const out = $('#heroRole');
      let index = 0;
      out.textContent = '';
      while (tk === token) {
        const chars = Array.from(roles[index]);

        host.classList.add('is-typing');
        for (let n = 1; n <= chars.length; n += 1) {
          out.textContent = chars.slice(0, n).join('');
          if (!await sleep(TYPE_MIN + Math.random() * TYPE_JITTER, tk)) return;
        }
        host.classList.remove('is-typing');
        if (roles.length === 1) return; // nothing to rotate

        if (!await sleep(HOLD, tk)) return;

        host.classList.add('is-deleting');
        for (let n = chars.length - 1; n >= 0; n -= 1) {
          out.textContent = chars.slice(0, n).join('');
          const step = Math.max(DELETE_MIN, DELETE_START - (chars.length - n) * 4);
          if (!await sleep(step, tk)) return;
        }
        host.classList.remove('is-deleting');

        if (!await sleep(GAP, tk)) return;
        index = (index + 1) % roles.length;
      }
    }

    function runStatic(roles, tk) {
      let index = 0;
      const show = () => {
        if (tk !== token) return;
        $('#heroRole').textContent = roles[index];
        index = (index + 1) % roles.length;
        if (roles.length > 1) timer = setTimeout(show, 2600);
      };
      show();
    }

    return {
      start(roles) {
        const key = `${state.lang}|${roles.join('\n')}`;
        if (key === lastKey) return; // same list already running
        lastKey = key;
        token += 1;
        clearTimeout(timer);
        const host = $('#heroTitle');
        host.classList.remove('is-typing', 'is-deleting');
        $('#heroRoleSr').textContent = roles.join(state.lang === 'ar' ? '، ' : ', ');
        if (!roles.length) { $('#heroRole').textContent = ''; return; }
        if (prefersReducedMotion) runStatic(roles, token);
        else run(roles, token);
      }
    };
  })();

  /** Build a wa.me link from the profile number with an optional pre-filled message. */
  function waLink(message) {
    const digits = String(state.data.profile.whatsapp || '').replace(/\D/g, '');
    if (!digits) return '';
    return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
  }

  function socialLinkHTML(s) {
    const url = safeUrl(s.url);
    if (!url) return '';
    const external = /^https?:/i.test(url);
    const label = s.label || s.platform;
    return `<li><a href="${esc(url)}" ${external ? 'target="_blank" rel="noopener noreferrer"' : ''} aria-label="${esc(label)}" title="${esc(label)}">${icon(s.platform in ICONS ? s.platform : 'website')}</a></li>`;
  }

  function renderSocials() {
    const html = state.data.socials.map(socialLinkHTML).join('');
    $('#heroSocials').innerHTML = html;
    $('#contactSocials').innerHTML = html;
  }

  function renderStats() {
    $('#statsGrid').innerHTML = state.data.stats.map((s) => `
      <li class="stat reveal">
        <span class="stat__value" data-count="${esc(s.value)}" data-suffix="${esc(s.suffix || '')}">0${esc(s.suffix || '')}</span>
        <span class="stat__label">${esc(tr(s.label))}</span>
      </li>`).join('');
  }

  function renderAbout() {
    $('#aboutSummary').innerHTML = paragraphs(tr(state.data.about.summary));
    const bento = $('#aboutBento');
    $$('.bento__item', bento).forEach((el) => el.remove());
    bento.insertAdjacentHTML('beforeend', state.data.about.expertise.map((x) => `
      <article class="card bento__item reveal tilt">
        <div class="card__icon">${icon(x.icon)}</div>
        <h3 class="card__title">${esc(tr(x.title))}</h3>
        <p class="card__text">${esc(tr(x.description))}</p>
      </article>`).join(''));
  }

  function renderSkills() {
    const { skillGroups, skills } = state.data;
    const groupsWithSkills = skillGroups.filter((g) => skills.some((s) => s.group === g.id));
    if (state.skillFilter !== 'all' && !groupsWithSkills.some((g) => g.id === state.skillFilter)) state.skillFilter = 'all';

    // Category filter chips
    $('#skillFilters').innerHTML = groupsWithSkills.length > 1
      ? [`<button class="chip-btn" type="button" data-group="all">${esc(t('filter.all'))}</button>`]
        .concat(groupsWithSkills.map((g) => `<button class="chip-btn" type="button" data-group="${esc(g.id)}">${esc(tr(g.title))}</button>`))
        .join('')
      : '';

    $('#skillsGrid').innerHTML = groupsWithSkills.map((g) => {
      const items = skills.filter((s) => s.group === g.id);
      return `
        <article class="card skill-card reveal tilt" data-group="${esc(g.id)}">
          <header class="skill-card__head">
            <div class="card__icon">${techIcon(g.icon)}</div>
            <h3>${esc(tr(g.title))}</h3>
            <span class="skill-card__count">${items.length}</span>
          </header>
          <ul class="skill-list">
            ${items.map((s) => {
              const level = Math.max(0, Math.min(100, Number(s.level) || 0));
              return `
              <li class="skill">
                <div class="skill__row"><span class="skill__name"><span class="tech-icon-wrap">${techIcon(s.icon)}</span>${esc(s.name)}</span><span class="skill__pct">${level}%</span></div>
                <div class="skill__bar" role="progressbar" aria-label="${esc(s.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${level}">
                  <span class="skill__fill" data-level="${level}"></span>
                </div>
              </li>`;
            }).join('')}
          </ul>
        </article>`;
    }).join('');
    applySkillFilter();
  }

  function applySkillFilter() {
    const filter = state.skillFilter;
    $$('.skill-card').forEach((card) => {
      const show = filter === 'all' || card.dataset.group === filter;
      const wasHidden = card.classList.contains('is-hidden');
      card.classList.toggle('is-hidden', !show);
      if (show && wasHidden) {
        card.classList.remove('is-entering');
        void card.offsetWidth;
        card.classList.add('is-entering');
      }
    });
    $$('#skillFilters .chip-btn').forEach((btn) => btn.classList.toggle('is-active', btn.dataset.group === filter));
  }

  /** Infinite marquee of every skill icon (list is duplicated for a seamless loop). */
  function renderTicker() {
    const ticker = $('#ticker');
    const seen = new Set();
    const items = state.data.skills.filter((s) => {
      const key = String(s.name).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    ticker.hidden = !items.length || state.data.settings.showTicker === false;
    const html = items.map((s) => `<span class="ticker__item">${techIcon(s.icon)}${esc(s.name)}</span>`).join('');
    const track = $('#tickerTrack');
    track.innerHTML = html + html.replace(/class="ticker__item"/g, 'class="ticker__item" aria-hidden="true"');
    track.style.setProperty('--ticker-duration', `${Math.max(20, items.length * 2.6)}s`);
  }

  function renderServices() {
    $('#servicesGrid').innerHTML = state.data.services.map((s, i) => {
      const title = tr(s.title);
      const wa = waLink(t('svc.msg', { service: title }));
      const cta = wa
        ? `<a class="service-card__cta" href="${esc(wa)}" target="_blank" rel="noopener noreferrer">${icon('whatsapp')}<span>${esc(t('svc.request'))}</span></a>`
        : `<a class="service-card__cta" href="#contact" data-service="${esc(title)}">${icon('mail')}<span>${esc(t('svc.request'))}</span></a>`;
      return `
        <article class="card service-card reveal tilt">
          <span class="service-card__num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <div class="card__icon">${techIcon(s.icon)}</div>
          <h3 class="card__title">${esc(title)}</h3>
          <p class="card__text">${esc(tr(s.description))}</p>
          ${cta}
        </article>`;
    }).join('');
    $('#services').hidden = !state.data.services.length;
  }

  function renderWhy() {
    $('#whyGrid').innerHTML = state.data.whyMe.map((w) => `
      <article class="card why-card reveal">
        <div class="card__icon">${techIcon(w.icon)}</div>
        <div>
          <h3 class="card__title">${esc(tr(w.title))}</h3>
          <p class="card__text">${esc(tr(w.description))}</p>
        </div>
      </article>`).join('');
    $('#why').hidden = !state.data.whyMe.length;
  }

  const isImageUrl = (url) => /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i.test(url);

  function renderCourses() {
    $('#coursesGrid').innerHTML = state.data.courses.map((c) => {
      const cert = safeUrl(c.certificateUrl);
      const certBtn = cert
        ? `<a class="course-card__cert" href="${esc(cert)}" target="_blank" rel="noopener noreferrer" ${isImageUrl(cert) ? `data-cert="${esc(c.id)}"` : ''}>${icon('award')}<span>${esc(t('course.cert'))}</span></a>`
        : '';
      const meta = [
        c.date ? `<span>${icon('calendar')}${esc(c.date)}</span>` : '',
        c.hours ? `<span>${icon('clock')}${esc(t('course.hours', { n: c.hours }))}</span>` : ''
      ].join('');
      return `
        <article class="card course-card reveal tilt">
          <div class="course-card__head">
            <div class="card__icon">${techIcon(c.icon)}</div>
            <h3 class="course-card__title">${esc(tr(c.title))}</h3>
          </div>
          <p class="course-card__subtitle">${esc(tr(c.subtitle))}</p>
          ${tr(c.provider) ? `<p class="course-card__provider">${icon('building')}<span>${esc(tr(c.provider))}</span></p>` : ''}
          ${(meta || certBtn) ? `<div class="course-card__foot"><span class="course-card__meta">${meta}</span>${certBtn}</div>` : ''}
        </article>`;
    }).join('');
    $('#courses').hidden = !state.data.courses.length;
  }

  function openCertificate(id) {
    const c = state.data.courses.find((x) => x.id === id);
    if (!c) return;
    const img = $('#certImage');
    img.src = safeUrl(c.certificateUrl);
    img.alt = tr(c.title);
    $('#certTitle').textContent = `${tr(c.title)}${tr(c.provider) ? ` — ${tr(c.provider)}` : ''}`;
    $('#certModal').showModal();
  }

  function projectMediaHTML(p) {
    const img = safeUrl(p.image);
    return img
      ? `<img src="${esc(img)}" alt="${esc(tr(p.title))}" loading="lazy">`
      : `<span class="project-card__glyph">${icon(p.icon || 'code')}</span>`;
  }

  function renderProjects() {
    $('#projectsGrid').innerHTML = state.data.projects.map((p) => {
      const gh = safeUrl(p.github);
      const demo = safeUrl(p.demo);
      return `
        <article class="card project-card reveal tilt" data-id="${esc(p.id)}" data-category="${esc(p.category)}" tabindex="0" role="button" aria-label="${esc(tr(p.title))} — ${esc(t('project.details'))}">
          <div class="project-card__media">
            ${p.featured ? `<span class="project-card__featured">${esc(t('project.featured'))}</span>` : ''}
            ${projectMediaHTML(p)}
          </div>
          <div class="project-card__body">
            <div class="project-card__meta">
              <span class="badge">${esc(t(`cat.${p.category}`))}</span>
              <span class="muted">${esc(p.year || '')}</span>
            </div>
            <h3 class="project-card__title">${esc(tr(p.title))}</h3>
            ${tr(p.client) ? `<p class="project-card__client">${icon('building')}<span>${esc(tr(p.client))}</span></p>` : ''}
            <p class="project-card__summary">${esc(tr(p.summary))}</p>
            <ul class="tags">${(p.tags || []).slice(0, 4).map((tag) => `<li>${esc(tag)}</li>`).join('')}</ul>
            <div class="project-card__foot">
              <span class="project-card__more">${esc(t('project.details'))} ${icon('arrow')}</span>
              <span class="project-card__links">
                ${gh ? `<a href="${esc(gh)}" target="_blank" rel="noopener noreferrer" aria-label="GitHub" data-stop>${icon('github')}</a>` : ''}
                ${demo ? `<a href="${esc(demo)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(t('project.demo'))}" data-stop>${icon('external')}</a>` : ''}
              </span>
            </div>
          </div>
        </article>`;
    }).join('');
    applyProjectFilter(false);
  }

  function applyProjectFilter(animate = true) {
    const filter = state.projectFilter;
    let visible = 0;
    $$('.project-card').forEach((card) => {
      const show = filter === 'all' || card.dataset.category === filter;
      card.classList.toggle('is-hidden', !show);
      if (show) {
        visible += 1;
        if (animate) {
          card.classList.remove('is-entering');
          void card.offsetWidth; // restart the animation
          card.classList.add('is-entering');
        }
      }
    });
    $('#projectsEmpty').hidden = visible > 0;
    $$('#projectFilters .filter').forEach((btn) => {
      const active = btn.dataset.filter === filter;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });
  }

  const TIMELINE_ICONS = { work: 'briefcase', education: 'graduation', cert: 'award' };

  function renderTimeline() {
    $('#timeline').innerHTML = state.data.timeline.map((item) => `
      <li class="tl-item reveal" data-type="${esc(item.type)}">
        <span class="tl-dot">${icon(TIMELINE_ICONS[item.type] || 'briefcase')}</span>
        <article class="card tl-card">
          <span class="tl-card__period">${esc(tr(item.period))}</span>
          <h3 class="tl-card__title">${esc(tr(item.title))}</h3>
          <p class="tl-card__org">${esc(tr(item.org))}</p>
          <p class="tl-card__desc">${esc(tr(item.description))}</p>
          ${(item.tags || []).length ? `<ul class="tags">${item.tags.map((tag) => `<li>${esc(tag)}</li>`).join('')}</ul>` : ''}
        </article>
      </li>`).join('');
    applyTimelineFilter();
  }

  function applyTimelineFilter() {
    const filter = state.timelineFilter;
    let index = 0;
    $$('.tl-item').forEach((item) => {
      const show = filter === 'all' || item.dataset.type === filter;
      item.classList.toggle('is-hidden', !show);
      // Alternate sides based on visible order (nth-child would break with hidden items)
      item.classList.toggle('tl-item--alt', show && index % 2 === 1);
      if (show) index += 1;
    });
    $$('#timelineFilters .chip-btn').forEach((btn) => btn.classList.toggle('is-active', btn.dataset.type === filter));
  }

  /** Render (or re-render) every data-driven part of the page. */
  function renderSite() {
    applyI18n();
    renderProfile();
    renderSocials();
    renderStats();
    renderTicker();
    renderAbout();
    renderServices();
    renderWhy();
    renderSkills();
    renderProjects();
    renderTimeline();
    renderCourses();
    observeReveals();
    bindCardEffects();
  }

  /* ======================================================================
     5. INTERACTIONS
     ====================================================================== */

  /* ---------- Theme ---------- */
  function setTheme(theme, persist = true) {
    state.theme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', state.theme === 'dark' ? '#06110C' : '#FAF8F5');
    if (persist) storage.set(CONFIG.storage.theme, state.theme);
    if (heroField) heroField.refreshColors();
  }

  /* ---------- Language ---------- */
  function setLang(lang, persist = true) {
    state.lang = lang === 'en' ? 'en' : 'ar';
    if (persist) storage.set(CONFIG.storage.lang, state.lang);
    renderSite();
    if ($('#adminPanel').open) renderAdmin();
  }

  /* ---------- Scroll reveal (IntersectionObserver + stagger) ---------- */
  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('is-visible');
        revealObserver.unobserve(el);
        onRevealed(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
    : null;

  function observeReveals() {
    const pending = $$('.reveal:not(.is-visible)');
    // Stagger siblings that share the same parent
    const groups = new Map();
    pending.forEach((el) => {
      const list = groups.get(el.parentElement) || [];
      list.push(el);
      groups.set(el.parentElement, list);
    });
    groups.forEach((list) => {
      list.forEach((el, i) => { el.style.setProperty('--delay', `${Math.min(i, 8) * 90}ms`); });
    });
    pending.forEach((el) => {
      if (revealObserver && !prefersReducedMotion) {
        revealObserver.observe(el);
      } else {
        el.classList.add('is-visible');
        onRevealed(el);
      }
    });
  }

  function onRevealed(el) {
    $$('[data-count]', el).forEach(animateCounter);
    $$('.skill__fill', el).forEach((fill) => {
      setTimeout(() => { fill.style.width = `${fill.dataset.level}%`; }, 200);
    });
    // Remove the stagger delay once the entrance is done so hover effects stay snappy
    const delay = parseInt(el.style.getPropertyValue('--delay'), 10) || 0;
    setTimeout(() => el.style.removeProperty('--delay'), delay + 950);
  }

  /* ---------- Animated counters ---------- */
  function animateCounter(el) {
    const target = parseFloat(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || '';
    const decimals = (String(el.dataset.count).split('.')[1] || '').length;
    const format = (n) => n.toLocaleString(state.lang === 'ar' ? 'en-US' : 'en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    if (prefersReducedMotion) { el.textContent = format(target) + suffix; return; }
    const duration = 1800;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      el.textContent = format(target * eased) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- 3D tilt + golden cursor glow ---------- */
  const boundCards = new WeakSet();

  function bindCardEffects() {
    $$('.card').forEach((card) => {
      if (boundCards.has(card)) return;
      boundCards.add(card);
      const canTilt = card.classList.contains('tilt') && finePointer && !prefersReducedMotion;
      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
        if (canTilt) {
          card.style.setProperty('--ry', `${((x - 0.5) * 8).toFixed(2)}deg`);
          card.style.setProperty('--rx', `${((0.5 - y) * 8).toFixed(2)}deg`);
          card.classList.add('is-tilting');
        }
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------- Navbar, progress bar, back-to-top ---------- */
  function initScrollUI() {
    const navbar = $('#navbar');
    const progress = $('#progressBar');
    const toTop = $('#toTop');
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      navbar.classList.toggle('is-scrolled', y > 30);
      progress.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
      toTop.classList.toggle('is-visible', y > 700);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();

    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' }));

    // Active nav link based on the section in the middle of the viewport
    const links = $$('#navLinks a');
    if ('IntersectionObserver' in window) {
      const spy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`));
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      $$('main section[id]').forEach((s) => spy.observe(s));
    }

    // Mobile menu
    const burger = $('#navBurger');
    const menu = $('#navLinks');
    const closeMenu = () => { menu.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); };
    burger.addEventListener('click', () => {
      const open = !menu.classList.contains('is-open');
      menu.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
    });
    links.forEach((a) => a.addEventListener('click', closeMenu));
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && !burger.contains(e.target)) closeMenu();
    });
  }

  /* ---------- Project modal ---------- */
  function openProject(id) {
    const p = state.data.projects.find((x) => x.id === id);
    if (!p) return;
    $('#pmMedia').innerHTML = projectMediaHTML(p);
    $('#pmCategory').textContent = t(`cat.${p.category}`);
    $('#pmYear').textContent = p.year || '';
    $('#pmTitle').textContent = tr(p.title);
    const client = $('#pmClient');
    client.innerHTML = tr(p.client) ? `${icon('building')}<span>${esc(tr(p.client))}</span>` : '';
    client.hidden = !tr(p.client);
    $('#pmDesc').innerHTML = paragraphs(tr(p.description) || tr(p.summary));
    $('#pmTags').innerHTML = (p.tags || []).map((tag) => `<li>${esc(tag)}</li>`).join('');
    const gh = safeUrl(p.github);
    const demo = safeUrl(p.demo);
    $('#pmActions').innerHTML = `
      ${demo ? `<a class="btn btn--gold" href="${esc(demo)}" target="_blank" rel="noopener noreferrer">${icon('external')}<span>${esc(t('project.demo'))}</span></a>` : ''}
      ${gh ? `<a class="btn btn--ghost" href="${esc(gh)}" target="_blank" rel="noopener noreferrer">${icon('github')}<span>${esc(t('project.code'))}</span></a>` : ''}`;
    $('#projectModal').showModal();
  }

  function initProjects() {
    $('#projectFilters').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;
      state.projectFilter = btn.dataset.filter;
      applyProjectFilter(true);
    });

    const grid = $('#projectsGrid');
    grid.addEventListener('click', (e) => {
      if (e.target.closest('[data-stop]')) return; // direct GitHub / demo links
      const card = e.target.closest('.project-card');
      if (card) openProject(card.dataset.id);
    });
    grid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.project-card');
      if (card && e.target === card) { e.preventDefault(); openProject(card.dataset.id); }
    });

    $('#skillFilters').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-group]');
      if (!btn) return;
      state.skillFilter = btn.dataset.group;
      applySkillFilter();
    });

    // Services without a WhatsApp number fall back to the contact form with the subject pre-filled
    $('#servicesGrid').addEventListener('click', (e) => {
      const link = e.target.closest('[data-service]');
      if (!link) return;
      const subject = $('#cfSubject');
      subject.value = link.dataset.service;
      setTimeout(() => $('#cfMessage').focus({ preventScroll: true }), 700);
    });

    // Image certificates open in a lightbox; PDFs and other links open normally
    $('#coursesGrid').addEventListener('click', (e) => {
      const link = e.target.closest('[data-cert]');
      if (!link) return;
      e.preventDefault();
      openCertificate(link.dataset.cert);
    });

    $('#timelineFilters').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-type]');
      if (!btn) return;
      state.timelineFilter = btn.dataset.type;
      applyTimelineFilter();
    });
  }

  /* ---------- Generic dialog behaviour ---------- */
  function initDialogs() {
    document.addEventListener('click', (e) => {
      const closer = e.target.closest('[data-close]');
      if (closer) closer.closest('dialog')?.close();
    });
    // Close when the backdrop (the dialog element itself) is clicked
    $$('dialog').forEach((dlg) => {
      dlg.addEventListener('mousedown', (e) => { dlg._downOnBackdrop = e.target === dlg; });
      dlg.addEventListener('click', (e) => {
        if (e.target === dlg && dlg._downOnBackdrop) dlg.close();
      });
    });
  }

  /* ---------- Contact form ---------- */
  function validateField(input) {
    const value = input.value.trim();
    if (input.required && !value) return t('err.required');
    if (input.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return t('err.email');
    const min = parseInt(input.getAttribute('minlength'), 10);
    if (min && value.length < min) return t('err.min', { n: min });
    return '';
  }

  function showFieldError(input, message) {
    const field = input.closest('.field');
    field.classList.toggle('has-error', Boolean(message));
    const holder = $(`.field__error[data-for="${input.id}"]`);
    if (holder) holder.textContent = message;
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function initContactForm() {
    const form = $('#contactForm');
    const status = $('#cfStatus');
    const submit = $('#cfSubmit');
    const inputs = $$('input:not(.hp), textarea', form);

    inputs.forEach((input) => {
      input.addEventListener('blur', () => showFieldError(input, validateField(input)));
      input.addEventListener('input', () => {
        if (input.closest('.field').classList.contains('has-error')) showFieldError(input, validateField(input));
      });
    });

    const setStatus = (msg, type) => {
      status.textContent = msg;
      status.className = `form-status${type ? ` is-${type}` : ''}`;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let firstInvalid = null;
      inputs.forEach((input) => {
        const msg = validateField(input);
        showFieldError(input, msg);
        if (msg && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) { firstInvalid.focus(); return; }

      const values = Object.fromEntries(new FormData(form).entries());
      if (values._gotcha) { form.reset(); setStatus(t('form.sent'), 'success'); return; } // bot trap

      const endpoint = safeUrl(state.data.settings.formEndpoint);
      if (endpoint && /^https:/i.test(endpoint)) {
        submit.disabled = true;
        setStatus(t('form.sending'), '');
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ name: values.name, email: values.email, subject: values.subject, message: values.message })
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          form.reset();
          setStatus(t('form.sent'), 'success');
        } catch (err) {
          console.error('[portfolio] Contact form error:', err);
          setStatus(t('form.failed'), 'error');
        } finally {
          submit.disabled = false;
        }
        return;
      }

      // No endpoint configured: fall back to the visitor's mail client
      const to = state.data.profile.email;
      if (!to) { setStatus(t('form.failed'), 'error'); return; }
      const body = `${values.message}\n\n— ${values.name} <${values.email}>`;
      window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(values.subject)}&body=${encodeURIComponent(body)}`;
      setStatus(t('form.mailto'), 'success');
    });
  }

  /* ======================================================================
     6. HERO PARTICLE NETWORK
     ====================================================================== */
  class ParticleField {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.particles = [];
      this.mouse = { x: -9999, y: -9999 };
      this.running = false;
      this.visible = true;
      this.linkDistance = 140;
      this.refreshColors(false);
      this.resize();

      window.addEventListener('resize', debounce(() => this.resize(), 200));
      const host = canvas.parentElement;
      host.addEventListener('pointermove', (e) => {
        const rect = canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
      });
      host.addEventListener('pointerleave', () => { this.mouse.x = -9999; this.mouse.y = -9999; });

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => {
          this.visible = entry.isIntersecting;
          this.visible ? this.start() : this.stop();
        }).observe(host);
      }
      document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.visible && this.start()));
    }

    refreshColors(redraw = true) {
      const cs = getComputedStyle(document.documentElement);
      this.nodeColor = cs.getPropertyValue('--canvas-node').trim() || '212, 175, 55';
      this.lineColor = cs.getPropertyValue('--canvas-line').trim() || '25, 135, 84';
      if (redraw && !this.running) this.draw();
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = this.canvas.clientWidth;
      this.height = this.canvas.clientHeight;
      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.linkDistance = this.width < 600 ? 105 : 140;
      const count = Math.max(24, Math.min(90, Math.floor((this.width * this.height) / 16000)));
      this.particles = Array.from({ length: count }, () => ({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.8,
        hub: Math.random() < 0.12
      }));
      if (prefersReducedMotion || !this.running) this.draw();
    }

    update() {
      this.particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > this.width) p.vx *= -1;
        if (p.y < 0 || p.y > this.height) p.vy *= -1;
        // gentle attraction towards the cursor
        const dx = this.mouse.x - p.x;
        const dy = this.mouse.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 200 && dist > 1) {
          p.x += (dx / dist) * 0.15;
          p.y += (dy / dist) * 0.15;
        }
      });
    }

    draw() {
      const { ctx, particles } = this;
      ctx.clearRect(0, 0, this.width, this.height);
      const max = this.linkDistance;

      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < max) {
            ctx.strokeStyle = `rgba(${this.lineColor}, ${(1 - dist / max) * 0.45})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        const md = Math.hypot(a.x - this.mouse.x, a.y - this.mouse.y);
        if (md < 180) {
          ctx.strokeStyle = `rgba(${this.nodeColor}, ${(1 - md / 180) * 0.55})`;
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(this.mouse.x, this.mouse.y);
          ctx.stroke();
        }
      }

      particles.forEach((p) => {
        if (p.hub) {
          ctx.fillStyle = `rgba(${this.nodeColor}, 0.15)`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(${p.hub ? this.nodeColor : this.lineColor}, ${p.hub ? 0.95 : 0.8})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.hub ? p.r * 1.6 : p.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    loop() {
      if (!this.running) return;
      this.update();
      this.draw();
      this.raf = requestAnimationFrame(() => this.loop());
    }

    start() {
      if (this.running || prefersReducedMotion) return;
      this.running = true;
      this.loop();
    }

    stop() {
      this.running = false;
      cancelAnimationFrame(this.raf);
    }
  }

  let heroField = null;

  /* ======================================================================
     7. ADMIN DASHBOARD
     ====================================================================== */

  /* ---------- Field schemas (drive both forms and list rendering) ---------- */
  const categoryOptions = () => CONFIG.categories.map((c) => ({ value: c, label: t(`cat.${c}`) }));
  const typeOptions = () => CONFIG.timelineTypes.map((c) => ({ value: c, label: t(`tl.${c}`) }));
  const groupOptions = () => state.data.skillGroups.map((g) => ({ value: g.id, label: tr(g.title) || g.id }));
  const platformOptions = () => CONFIG.socialPlatforms.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }));

  const PROFILE_FIELDS = [
    { k: 'name', type: 'i18n', label: 'f.name', required: true },
    { k: 'title', type: 'i18n', label: 'f.title' },
    { k: 'roles', type: 'i18n-area', label: 'f.roles', rows: 5, hint: 'hint.roles' },
    { k: 'tagline', type: 'i18n-area', label: 'f.tagline', rows: 3 },
    { k: 'location', type: 'i18n', label: 'f.location' },
    { k: 'initials', type: 'text', label: 'f.initials', dir: 'ltr', maxlength: 4 },
    { k: 'email', type: 'email', label: 'f.email', dir: 'ltr' },
    { k: 'phone', type: 'text', label: 'f.phone', dir: 'ltr' },
    { k: 'whatsapp', type: 'text', label: 'f.whatsapp', dir: 'ltr', placeholder: '963912345678', hint: 'hint.whatsapp' },
    { k: 'whatsappMessage', type: 'i18n', label: 'f.whatsappMessage' },
    { k: 'replyTime', type: 'i18n', label: 'f.replyTime' },
    { k: 'avatar', type: 'url', label: 'f.avatar', placeholder: 'assets/avatar.jpg' },
    { k: 'cvUrl', type: 'url', label: 'f.cvUrl', placeholder: 'cv.pdf' },
    { k: 'available', type: 'checkbox', label: 'f.available' }
  ];

  const SCHEMAS = {
    stats: {
      path: 'stats', title: 'col.stats', icon: 'chart', prefix: 'st',
      itemTitle: (it) => `${it.value}${it.suffix || ''} — ${tr(it.label)}`,
      blank: () => ({ value: 0, suffix: '+', label: { ar: '', en: '' } }),
      fields: [
        { k: 'value', type: 'number', label: 'f.value', step: 'any', required: true },
        { k: 'suffix', type: 'text', label: 'f.suffix', dir: 'ltr', maxlength: 4 },
        { k: 'label', type: 'i18n', label: 'f.label', required: true }
      ]
    },
    expertise: {
      path: 'about.expertise', title: 'col.expertise', prefix: 'ex',
      itemIcon: (it) => it.icon,
      itemTitle: (it) => tr(it.title),
      itemSub: (it) => tr(it.description),
      blank: () => ({ icon: 'code', title: { ar: '', en: '' }, description: { ar: '', en: '' } }),
      fields: [
        { k: 'icon', type: 'icon', label: 'f.icon' },
        { k: 'title', type: 'i18n', label: 'f.title', required: true },
        { k: 'description', type: 'i18n-area', label: 'f.description', rows: 2 }
      ]
    },
    skillGroups: {
      path: 'skillGroups', title: 'col.skillGroups', prefix: 'sg',
      itemIcon: (it) => it.icon,
      itemTitle: (it) => tr(it.title),
      itemSub: (it) => `${it.id} · ${state.data.skills.filter((s) => s.group === it.id).length}`,
      blank: () => ({ id: '', icon: 'code', title: { ar: '', en: '' } }),
      fields: [
        { k: 'id', type: 'text', label: 'f.slug', dir: 'ltr', required: true, readonlyOnEdit: true, hint: 'hint.slug', placeholder: 'cloud' },
        { k: 'icon', type: 'icon', label: 'f.icon' },
        { k: 'title', type: 'i18n', label: 'f.title', required: true }
      ],
      validate: (values, index) => {
        if (index != null) return '';
        if (!/^[a-z0-9-]+$/.test(values.id)) return t('adm.slugInvalid');
        if (state.data.skillGroups.some((g) => g.id === values.id)) return t('adm.slugTaken');
        return '';
      },
      beforeDelete: (item) => {
        const linked = state.data.skills.filter((s) => s.group === item.id);
        if (linked.length && !window.confirm(t('adm.confirmDeleteGroup', { n: linked.length }))) return false;
        state.data.skills = state.data.skills.filter((s) => s.group !== item.id);
        return true;
      }
    },
    skills: {
      path: 'skills', title: 'col.skills', prefix: 'sk', icon: 'cpu',
      itemTitle: (it) => it.name,
      itemSub: (it) => {
        const g = state.data.skillGroups.find((x) => x.id === it.group);
        return `${g ? tr(g.title) : it.group} · ${it.level}%`;
      },
      itemIcon: (it) => it.icon,
      blank: () => ({ name: '', icon: '', group: (state.data.skillGroups[0] || {}).id || '', level: 80 }),
      fields: [
        { k: 'name', type: 'text', label: 'f.name', dir: 'ltr', required: true },
        { k: 'icon', type: 'techicon', label: 'f.techIcon' },
        { k: 'group', type: 'select', label: 'f.group', options: groupOptions, required: true },
        { k: 'level', type: 'range', label: 'f.level', min: 0, max: 100 }
      ]
    },
    projects: {
      path: 'projects', title: 'col.projects', prefix: 'pr',
      itemIcon: (it) => it.icon || 'code',
      itemTitle: (it) => `${it.featured ? '★ ' : ''}${tr(it.title)}`,
      itemSub: (it) => `${t(`cat.${it.category}`)} · ${it.year || ''}`,
      blank: () => ({
        category: 'ai', year: String(new Date().getFullYear()), featured: false, icon: 'code', image: '',
        title: { ar: '', en: '' }, client: { ar: '', en: '' }, summary: { ar: '', en: '' }, description: { ar: '', en: '' }, tags: [], github: '', demo: ''
      }),
      fields: [
        { k: 'title', type: 'i18n', label: 'f.title', required: true },
        { k: 'client', type: 'i18n', label: 'f.client' },
        { k: 'category', type: 'select', label: 'f.category', options: categoryOptions },
        { k: 'year', type: 'text', label: 'f.year', dir: 'ltr' },
        { k: 'featured', type: 'checkbox', label: 'f.featured' },
        { k: 'icon', type: 'icon', label: 'f.icon' },
        { k: 'image', type: 'url', label: 'f.image', placeholder: 'assets/project.jpg' },
        { k: 'summary', type: 'i18n-area', label: 'f.summary', rows: 2 },
        { k: 'description', type: 'i18n-area', label: 'f.description', rows: 5, hint: 'hint.multiline' },
        { k: 'tags', type: 'tags', label: 'f.tags', hint: 'hint.tags' },
        { k: 'github', type: 'url', label: 'f.github', placeholder: 'https://github.com/user/repo' },
        { k: 'demo', type: 'url', label: 'f.demo', placeholder: 'https://' }
      ]
    },
    timeline: {
      path: 'timeline', title: 'col.timeline', prefix: 'tl',
      itemIcon: (it) => TIMELINE_ICONS[it.type] || 'briefcase',
      itemTitle: (it) => tr(it.title),
      itemSub: (it) => `${tr(it.org)} · ${tr(it.period)}`,
      blank: () => ({ type: 'work', period: { ar: '', en: '' }, title: { ar: '', en: '' }, org: { ar: '', en: '' }, description: { ar: '', en: '' }, tags: [] }),
      fields: [
        { k: 'type', type: 'select', label: 'f.type', options: typeOptions },
        { k: 'title', type: 'i18n', label: 'f.title', required: true },
        { k: 'org', type: 'i18n', label: 'f.org' },
        { k: 'period', type: 'i18n', label: 'f.period' },
        { k: 'description', type: 'i18n-area', label: 'f.description', rows: 3 },
        { k: 'tags', type: 'tags', label: 'f.tags', hint: 'hint.tags' }
      ]
    },
    services: {
      path: 'services', title: 'col.services', prefix: 'sv',
      itemIcon: (it) => it.icon,
      itemTitle: (it) => tr(it.title),
      itemSub: (it) => tr(it.description),
      blank: () => ({ icon: 'code', title: { ar: '', en: '' }, description: { ar: '', en: '' } }),
      fields: [
        { k: 'icon', type: 'icon', label: 'f.icon' },
        { k: 'title', type: 'i18n', label: 'f.title', required: true },
        { k: 'description', type: 'i18n-area', label: 'f.description', rows: 2 }
      ]
    },
    whyMe: {
      path: 'whyMe', title: 'col.whyMe', prefix: 'wm',
      itemIcon: (it) => it.icon,
      itemTitle: (it) => tr(it.title),
      itemSub: (it) => tr(it.description),
      blank: () => ({ icon: 'star', title: { ar: '', en: '' }, description: { ar: '', en: '' } }),
      fields: [
        { k: 'icon', type: 'icon', label: 'f.icon' },
        { k: 'title', type: 'i18n', label: 'f.title', required: true },
        { k: 'description', type: 'i18n-area', label: 'f.description', rows: 2 }
      ]
    },
    courses: {
      path: 'courses', title: 'col.courses', prefix: 'co',
      itemIcon: (it) => it.icon,
      itemTitle: (it) => tr(it.title),
      itemSub: (it) => [tr(it.provider), it.date].filter(Boolean).join(' · '),
      blank: () => ({
        icon: 'award', title: { ar: '', en: '' }, subtitle: { ar: '', en: '' }, provider: { ar: '', en: '' },
        date: String(new Date().getFullYear()), hours: '', certificateUrl: ''
      }),
      fields: [
        { k: 'title', type: 'i18n', label: 'f.title', required: true },
        { k: 'subtitle', type: 'i18n', label: 'f.subtitle' },
        { k: 'provider', type: 'i18n', label: 'f.provider' },
        { k: 'icon', type: 'techicon', label: 'f.techIcon' },
        { k: 'date', type: 'text', label: 'f.date', dir: 'ltr', placeholder: '2025' },
        { k: 'hours', type: 'text', label: 'f.hours', dir: 'ltr', placeholder: '40' },
        { k: 'certificateUrl', type: 'url', label: 'f.certificateUrl', placeholder: 'certificates/ccna.jpg' }
      ]
    },
    socials: {
      path: 'socials', title: 'col.socials', prefix: 'so',
      itemIcon: (it) => (it.platform in ICONS ? it.platform : 'website'),
      itemTitle: (it) => it.label || it.platform,
      itemSub: (it) => it.url,
      blank: () => ({ platform: 'github', label: '', url: '' }),
      fields: [
        { k: 'platform', type: 'select', label: 'f.platform', options: platformOptions },
        { k: 'label', type: 'text', label: 'f.label', dir: 'ltr' },
        { k: 'url', type: 'url', label: 'f.url', required: true, placeholder: 'https:// · mailto:' }
      ]
    }
  };

  const ADMIN_TABS = [
    { id: 'profile', icon: 'user' },
    { id: 'stats', icon: 'chart' },
    { id: 'about', icon: 'brain' },
    { id: 'services', icon: 'wrench' },
    { id: 'skills', icon: 'cpu' },
    { id: 'projects', icon: 'layout' },
    { id: 'timeline', icon: 'briefcase' },
    { id: 'courses', icon: 'award' },
    { id: 'socials', icon: 'globe' },
    { id: 'settings', icon: 'sliders' }
  ];

  /* ---------- Form building ---------- */
  let fieldSeq = 0;

  function fieldHTML(f, value, isEdit) {
    fieldSeq += 1;
    const id = `adm_${fieldSeq}`;
    const label = esc(t(f.label));
    const req = f.required ? ' *' : '';
    const hint = f.hint ? `<small class="muted">${esc(t(f.hint))}</small>` : '';
    const ph = f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : '';
    const dir = f.dir ? ` dir="${f.dir}"` : '';
    const ro = (f.readonlyOnEdit && isEdit) ? ' readonly' : '';
    const max = f.maxlength ? ` maxlength="${f.maxlength}"` : '';

    switch (f.type) {
      case 'i18n':
      case 'i18n-area': {
        const v = (value && typeof value === 'object') ? value : { ar: value || '', en: '' };
        const control = (lang) => (f.type === 'i18n'
          ? `<input id="${id}_${lang}" name="${f.k}.${lang}" type="text" dir="${lang === 'ar' ? 'rtl' : 'ltr'}" value="${esc(v[lang])}">`
          : `<textarea id="${id}_${lang}" name="${f.k}.${lang}" rows="${f.rows || 3}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">${esc(v[lang])}</textarea>`);
        const wrapClass = f.type === 'i18n' ? 'adm-pair' : '';
        return `
          <div class="${wrapClass}">
            <div class="field"><label for="${id}_ar"><span>${label}${req}</span><span class="adm-lang">AR</span></label>${control('ar')}</div>
            <div class="field"><label for="${id}_en"><span>${label}${req}</span><span class="adm-lang">EN</span></label>${control('en')}${hint}</div>
          </div>`;
      }
      case 'textarea':
        return `<div class="field"><label for="${id}">${label}${req}</label><textarea id="${id}" name="${f.k}" rows="${f.rows || 3}"${dir}>${esc(value)}</textarea>${hint}</div>`;
      case 'select': {
        const options = typeof f.options === 'function' ? f.options() : f.options;
        return `<div class="field"><label for="${id}">${label}${req}</label>
          <select id="${id}" name="${f.k}">${options.map((o) => `<option value="${esc(o.value)}"${String(o.value) === String(value) ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select>${hint}</div>`;
      }
      case 'checkbox':
        return `<label class="adm-check"><input type="checkbox" name="${f.k}"${value ? ' checked' : ''}> ${label}</label>`;
      case 'range': {
        const v = Number(value) || 0;
        return `<div class="field"><label for="${id}">${label}</label>
          <div class="adm-range"><input id="${id}" type="range" name="${f.k}" min="${f.min ?? 0}" max="${f.max ?? 100}" value="${v}"><output for="${id}">${v}%</output></div></div>`;
      }
      case 'tags':
        return `<div class="field"><label for="${id}">${label}</label><input id="${id}" name="${f.k}" type="text" dir="ltr" value="${esc((value || []).join(', '))}">${hint}</div>`;
      case 'icon':
        return `<div class="field"><label>${label}</label>
          <input type="hidden" name="${f.k}" value="${esc(value || 'code')}">
          <div class="icon-picker" role="radiogroup" aria-label="${label}">
            ${CONFIG.pickerIcons.map((name) => `<button type="button" role="radio" aria-checked="${name === value}" aria-label="${name}" title="${name}" data-icon="${name}" class="${name === value ? 'is-active' : ''}">${icon(name)}</button>`).join('')}
          </div></div>`;
      case 'techicon':
        return `<div class="field"><label for="${id}">${label}</label>
          <div class="techicon-field">
            <span class="techicon-preview">${techIcon(value)}</span>
            <input id="${id}" name="${f.k}" type="text" dir="ltr" list="techIconList" autocomplete="off" value="${esc(value)}" placeholder="docker · linux · postgresql">
          </div>
          <div class="techicon-quick">${CONFIG.techSuggestions.slice(0, 28).map((s) => `<button type="button" data-techicon="${s}" title="${s}" aria-label="${s}">${techIcon(s)}</button>`).join('')}</div>
          <small class="muted">${esc(t('hint.techIcon'))}</small>
          <small class="field__error techicon-warn"></small></div>`;
      case 'password':
        return `<div class="field"><label for="${id}">${label}${req}</label><input id="${id}" name="${f.k}" type="password" autocomplete="off" dir="ltr" value="${esc(value)}"${ph}>${hint}</div>`;
      case 'number':
        return `<div class="field"><label for="${id}">${label}${req}</label><input id="${id}" name="${f.k}" type="number" step="${f.step || '1'}" dir="ltr" value="${esc(value)}">${hint}</div>`;
      case 'url':
      case 'email':
      case 'text':
      default:
        return `<div class="field"><label for="${id}">${label}${req}</label><input id="${id}" name="${f.k}" type="${f.type === 'email' ? 'email' : 'text'}" value="${esc(value)}"${f.type === 'url' ? ' dir="ltr"' : dir}${ph}${ro}${max}>${hint}</div>`;
    }
  }

  /** Wire dynamic widgets (range outputs, icon pickers) inside a form. */
  function wireForm(form) {
    $$('input[type="range"]', form).forEach((range) => {
      const out = range.parentElement.querySelector('output');
      range.addEventListener('input', () => { out.textContent = `${range.value}%`; });
    });
    // Technology icon: live preview, quick picks and existence check for Simple Icons slugs
    $$('.techicon-field', form).forEach((wrap) => {
      const field = wrap.closest('.field');
      const input = $('input', wrap);
      const preview = $('.techicon-preview', wrap);
      const warn = $('.techicon-warn', field);
      const refresh = debounce(async () => {
        const v = input.value.trim();
        preview.innerHTML = techIcon(v);
        warn.textContent = '';
        if (v && !ICONS[v] && /^[a-z0-9]+$/.test(v)) {
          try {
            const res = await fetch(`${CONFIG.simpleIconsBase}${v}.svg`, { method: 'HEAD' });
            if (!res.ok && input.value.trim() === v) warn.textContent = t('hint.iconMissing');
          } catch (e) { /* offline: skip the check */ }
        }
      }, 250);
      input.addEventListener('input', refresh);
      $('.techicon-quick', field).addEventListener('click', (e) => {
        const btn = e.target.closest('[data-techicon]');
        if (!btn) return;
        input.value = btn.dataset.techicon;
        refresh();
      });
    });
    $$('.icon-picker', form).forEach((picker) => {
      const hidden = picker.parentElement.querySelector('input[type="hidden"]');
      picker.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-icon]');
        if (!btn) return;
        hidden.value = btn.dataset.icon;
        $$('[data-icon]', picker).forEach((b) => {
          const on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-checked', String(on));
        });
      });
    });
  }

  /** Read form values according to a field schema. */
  function readForm(form, fields) {
    const out = {};
    const el = (name) => form.elements.namedItem(name);
    fields.forEach((f) => {
      switch (f.type) {
        case 'i18n':
        case 'i18n-area':
          setPath(out, f.k, { ar: el(`${f.k}.ar`).value.trim(), en: el(`${f.k}.en`).value.trim() });
          break;
        case 'number': {
          const n = parseFloat(el(f.k).value);
          setPath(out, f.k, Number.isFinite(n) ? n : 0);
          break;
        }
        case 'range':
          setPath(out, f.k, parseInt(el(f.k).value, 10) || 0);
          break;
        case 'checkbox':
          setPath(out, f.k, el(f.k).checked);
          break;
        case 'tags':
          setPath(out, f.k, el(f.k).value.split(',').map((s) => s.trim()).filter(Boolean));
          break;
        default:
          setPath(out, f.k, el(f.k).value.trim());
      }
    });
    return out;
  }

  /** Check required fields; returns an error message or ''. */
  function checkRequired(values, fields) {
    for (const f of fields) {
      if (!f.required) continue;
      const v = getPath(values, f.k);
      const empty = (f.type === 'i18n' || f.type === 'i18n-area')
        ? !(v && (v.ar || v.en))
        : (v === '' || v == null);
      if (empty) return t('adm.required', { field: t(f.label) });
    }
    return '';
  }

  /* ---------- Collection editor (list + CRUD form) ---------- */
  function renderCollection(container, key) {
    const schema = SCHEMAS[key];
    const list = getPath(state.data, schema.path);
    const rows = list.map((item, i) => `
      <div class="adm-item">
        <span class="adm-item__icon">${techIcon(schema.itemIcon ? schema.itemIcon(item) : schema.icon)}</span>
        <div class="adm-item__text">
          <div class="adm-item__title">${esc(schema.itemTitle(item) || '—')}</div>
          ${schema.itemSub ? `<div class="adm-item__sub">${esc(schema.itemSub(item))}</div>` : ''}
        </div>
        <div class="adm-item__actions">
          <button type="button" class="adm-mini" data-act="up" data-i="${i}" aria-label="${esc(t('adm.up'))}" title="${esc(t('adm.up'))}"${i === 0 ? ' disabled' : ''}>${icon('up')}</button>
          <button type="button" class="adm-mini" data-act="down" data-i="${i}" aria-label="${esc(t('adm.down'))}" title="${esc(t('adm.down'))}"${i === list.length - 1 ? ' disabled' : ''}>${icon('down')}</button>
          <button type="button" class="adm-mini" data-act="edit" data-i="${i}" aria-label="${esc(t('adm.edit'))}" title="${esc(t('adm.edit'))}">${icon('edit')}</button>
          <button type="button" class="adm-mini adm-mini--danger" data-act="del" data-i="${i}" aria-label="${esc(t('adm.delete'))}" title="${esc(t('adm.delete'))}">${icon('trash')}</button>
        </div>
      </div>`).join('');

    container.innerHTML = `
      <div class="adm-section-title">
        <h3>${esc(t(schema.title))} <small class="muted">(${list.length})</small></h3>
        <button type="button" class="btn btn--sm btn--gold" data-act="add">${icon('plus')}<span>${esc(t('adm.add'))}</span></button>
      </div>
      <div class="adm-list">${rows || `<p class="muted">${esc(t('adm.empty'))}</p>`}</div>`;

    container.onclick = (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const i = Number(btn.dataset.i);
      switch (btn.dataset.act) {
        case 'add':
          renderItemForm(container, key, null);
          break;
        case 'edit':
          renderItemForm(container, key, i);
          break;
        case 'del': {
          const item = list[i];
          if (!window.confirm(t('adm.confirmDelete', { name: schema.itemTitle(item) || '—' }))) return;
          if (schema.beforeDelete && schema.beforeDelete(item) === false) return;
          list.splice(i, 1);
          commit(t('toast.deleted'));
          renderAdmin();
          break;
        }
        case 'up':
        case 'down': {
          const j = btn.dataset.act === 'up' ? i - 1 : i + 1;
          if (j < 0 || j >= list.length) return;
          [list[i], list[j]] = [list[j], list[i]];
          commit();
          renderCollection(container, key);
          break;
        }
        default:
      }
    };
  }

  function renderItemForm(container, key, index) {
    const schema = SCHEMAS[key];
    const list = getPath(state.data, schema.path);
    const isEdit = index != null;
    const item = isEdit ? clone(list[index]) : schema.blank();

    container.innerHTML = `
      <div class="adm-section-title"><h3>${esc(isEdit ? t('adm.edit') : t('adm.new'))} — ${esc(t(schema.title))}</h3></div>
      <form class="adm-form" novalidate>
        ${schema.fields.map((f) => fieldHTML(f, getPath(item, f.k), isEdit)).join('')}
        <div class="adm-form__actions">
          <button type="button" class="btn btn--sm btn--ghost" data-act="cancel">${esc(t('common.cancel'))}</button>
          <button type="submit" class="btn btn--sm btn--gold">${icon('check')}<span>${esc(t('adm.save'))}</span></button>
        </div>
      </form>`;

    const form = $('form', container);
    wireForm(form);
    $('#adminBody').scrollTop = Math.max(0, container.offsetTop - 16);
    const first = $('input:not([type=hidden]):not([readonly]), select, textarea', form);
    if (first) first.focus({ preventScroll: true });

    container.onclick = (e) => {
      if (e.target.closest('[data-act="cancel"]')) renderCollection(container, key);
    };

    form.onsubmit = (e) => {
      e.preventDefault();
      const values = readForm(form, schema.fields);
      const error = checkRequired(values, schema.fields) || (schema.validate ? schema.validate(values, index) : '');
      if (error) { toast(error, 'error'); return; }
      if (isEdit && schema.fields.some((f) => f.readonlyOnEdit)) {
        schema.fields.filter((f) => f.readonlyOnEdit).forEach((f) => setPath(values, f.k, getPath(item, f.k)));
      }
      const next = Object.assign(item, values);
      if (!next.id) next.id = uid(schema.prefix);
      if (isEdit) list[index] = next; else list.push(next);
      commit(t('toast.saved'));
      renderAdmin();
    };
  }

  /* ---------- Singleton form (profile, summary, settings) ---------- */
  function renderSingleForm(container, { title, fields, target, onSaved, extraHTML = '', hint = '' }) {
    const obj = target();
    container.innerHTML = `
      <div class="adm-section-title"><h3>${esc(t(title))}</h3></div>
      ${hint}
      <form class="adm-form" novalidate>
        ${fields.map((f) => fieldHTML(f, getPath(obj, f.k), false)).join('')}
        ${extraHTML}
        <div class="adm-form__actions">
          <button type="submit" class="btn btn--sm btn--gold">${icon('check')}<span>${esc(t('adm.save'))}</span></button>
        </div>
      </form>`;
    const form = $('form', container);
    wireForm(form);
    form.onsubmit = (e) => {
      e.preventDefault();
      const values = readForm(form, fields);
      const error = checkRequired(values, fields);
      if (error) { toast(error, 'error'); return; }
      fields.forEach((f) => setPath(obj, f.k, getPath(values, f.k)));
      commit(t('toast.saved'));
      if (onSaved) onSaved();
    };
    return form;
  }

  /* ---------- Admin rendering ---------- */
  function renderAdminTabs() {
    $('#adminTabs').innerHTML = ADMIN_TABS.map((tab) => `
      <button type="button" class="admin__tab${tab.id === state.adminTab ? ' is-active' : ''}" role="tab" aria-selected="${tab.id === state.adminTab}" data-tab="${tab.id}">
        ${esc(t(`adm.tab.${tab.id}`))}
      </button>`).join('');
  }

  function section(body) {
    const div = document.createElement('div');
    div.className = 'adm-group';
    body.appendChild(div);
    return div;
  }

  function renderAdmin() {
    applyI18n();
    renderAdminTabs();
    updateAdminStatus();
    const body = $('#adminBody');
    body.innerHTML = '';

    switch (state.adminTab) {
      case 'profile':
        renderSingleForm(section(body), {
          title: 'sec.profile',
          fields: PROFILE_FIELDS,
          target: () => state.data.profile,
          hint: `<p class="adm-hint">${t('hint.profile')}</p>`
        });
        break;
      case 'stats':
        renderCollection(section(body), 'stats');
        break;
      case 'about':
        renderSingleForm(section(body), {
          title: 'sec.summary',
          fields: [{ k: 'summary', type: 'i18n-area', label: 'sec.summary', rows: 6, hint: 'hint.multiline' }],
          target: () => state.data.about
        });
        renderCollection(section(body), 'expertise');
        break;
      case 'services':
        renderCollection(section(body), 'services');
        renderCollection(section(body), 'whyMe');
        break;
      case 'skills':
        renderCollection(section(body), 'skillGroups');
        renderCollection(section(body), 'skills');
        break;
      case 'courses':
        renderCollection(section(body), 'courses');
        break;
      case 'projects':
        renderCollection(section(body), 'projects');
        break;
      case 'timeline':
        renderCollection(section(body), 'timeline');
        break;
      case 'socials':
        renderCollection(section(body), 'socials');
        break;
      case 'settings':
        renderSettings(body);
        break;
      default:
    }
  }

  /* ---------- Settings tab: general, GitHub publishing, PIN ---------- */
  function guessRepo() {
    const host = window.location.hostname;
    if (!host.endsWith('github.io')) return { owner: '', repo: '' };
    const owner = host.split('.')[0];
    const firstSegment = window.location.pathname.split('/').filter(Boolean)[0];
    return { owner, repo: firstSegment && !firstSegment.includes('.') ? firstSegment : `${owner}.github.io` };
  }

  function getToken() {
    return storage.get(CONFIG.storage.token, sessionStorage) || storage.get(CONFIG.storage.token) || '';
  }

  function setToken(token, remember) {
    storage.remove(CONFIG.storage.token, sessionStorage);
    storage.remove(CONFIG.storage.token);
    if (!token) return;
    storage.set(CONFIG.storage.token, token, remember ? localStorage : sessionStorage);
  }

  function githubConfig() {
    const gh = state.data.settings.github || {};
    const guess = guessRepo();
    return {
      owner: (gh.owner || guess.owner || '').trim(),
      repo: (gh.repo || guess.repo || '').trim(),
      branch: (gh.branch || 'main').trim(),
      path: (gh.path || 'data.json').trim().replace(/^\/+/, '')
    };
  }

  function renderSettings(body) {
    // General
    renderSingleForm(section(body), {
      title: 'sec.general',
      fields: [
        { k: 'defaultLang', type: 'select', label: 'f.defaultLang', options: () => [{ value: 'ar', label: t('opt.ar') }, { value: 'en', label: t('opt.en') }] },
        { k: 'defaultTheme', type: 'select', label: 'f.defaultTheme', options: () => [{ value: 'dark', label: t('opt.dark') }, { value: 'light', label: t('opt.light') }] },
        { k: 'formEndpoint', type: 'url', label: 'f.formEndpoint', placeholder: 'https://formspree.io/f/xxxxxx' },
        { k: 'showTicker', type: 'checkbox', label: 'f.showTicker' },
        { k: 'showWhatsappFab', type: 'checkbox', label: 'f.showWhatsappFab' }
      ],
      target: () => state.data.settings
    });

    // GitHub publishing
    const ghBox = section(body);
    const guess = guessRepo();
    const gh = state.data.settings.github;
    const rememberChecked = Boolean(storage.get(CONFIG.storage.token));
    ghBox.innerHTML = `
      <div class="adm-section-title"><h3>${esc(t('sec.github'))}</h3></div>
      <p class="adm-hint">${t('hint.github')}</p>
      <form class="adm-form" id="ghForm" novalidate>
        <div class="adm-pair">
          ${fieldHTML({ k: 'owner', type: 'text', label: 'f.owner', dir: 'ltr', placeholder: guess.owner || 'username' }, gh.owner)}
          ${fieldHTML({ k: 'repo', type: 'text', label: 'f.repo', dir: 'ltr', placeholder: guess.repo || 'my-portfolio' }, gh.repo)}
        </div>
        <div class="adm-pair">
          ${fieldHTML({ k: 'branch', type: 'text', label: 'f.branch', dir: 'ltr', placeholder: 'main' }, gh.branch)}
          ${fieldHTML({ k: 'path', type: 'text', label: 'f.path', dir: 'ltr', placeholder: 'data.json' }, gh.path)}
        </div>
        ${fieldHTML({ k: 'token', type: 'password', label: 'f.token', placeholder: 'github_pat_…' }, getToken())}
        <label class="adm-check"><input type="checkbox" name="remember"${rememberChecked ? ' checked' : ''}> ${esc(t('f.remember'))}</label>
        <div class="adm-form__actions">
          <button type="button" class="btn btn--sm btn--ghost" data-gh="test">${esc(t('gh.test'))}</button>
          <button type="submit" class="btn btn--sm btn--ghost">${esc(t('gh.saveSettings'))}</button>
          <button type="button" class="btn btn--sm btn--gold" data-gh="publish">${icon('github')}<span>${esc(t('gh.publishNow'))}</span></button>
        </div>
      </form>`;

    const ghForm = $('#ghForm', ghBox);
    const saveGh = (silent) => {
      const el = (n) => ghForm.elements.namedItem(n);
      const next = {
        owner: el('owner').value.trim(),
        repo: el('repo').value.trim(),
        branch: el('branch').value.trim() || 'main',
        path: el('path').value.trim() || 'data.json'
      };
      const changed = JSON.stringify(next) !== JSON.stringify(state.data.settings.github);
      state.data.settings.github = next;
      setToken(el('token').value.trim(), el('remember').checked);
      if (changed) commit();
      if (!silent) toast(t('toast.settingsSaved'), 'success', 2200);
    };
    ghForm.onsubmit = (e) => { e.preventDefault(); saveGh(false); };
    ghForm.onclick = (e) => {
      const btn = e.target.closest('[data-gh]');
      if (!btn) return;
      saveGh(true);
      if (btn.dataset.gh === 'test') testGitHubConnection(btn);
      if (btn.dataset.gh === 'publish') publishToGitHub(btn);
    };

    // PIN change
    const pinBox = section(body);
    pinBox.innerHTML = `
      <div class="adm-section-title"><h3>${esc(t('sec.pin'))}</h3></div>
      <p class="adm-hint adm-hint--warn">${esc(t('hint.pin'))}</p>
      <form class="adm-form" id="pinChangeForm" novalidate>
        <div class="adm-pair">
          ${fieldHTML({ k: 'newPin', type: 'password', label: 'f.newPin' }, '')}
          ${fieldHTML({ k: 'confirmPin', type: 'password', label: 'f.confirmPin' }, '')}
        </div>
        <div class="adm-form__actions">
          <button type="submit" class="btn btn--sm btn--gold">${icon('lock')}<span>${esc(t('adm.save'))}</span></button>
        </div>
      </form>`;
    $('#pinChangeForm', pinBox).onsubmit = async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const pin = form.elements.namedItem('newPin').value;
      const confirmPin = form.elements.namedItem('confirmPin').value;
      if (pin.length < 4) { toast(t('toast.pinShort'), 'error'); return; }
      if (pin !== confirmPin) { toast(t('toast.pinMismatch'), 'error'); return; }
      try {
        state.data.settings.adminPinHash = await sha256(CONFIG.pinSalt + pin);
        commit();
        form.reset();
        toast(t('toast.pinChanged'), 'success', 5000);
      } catch (err) {
        toast(t('toast.noCrypto'), 'error');
      }
    };
  }

  function updateAdminStatus() {
    const el = $('#adminStatus');
    if (!el) return;
    if (state.source === 'draft') {
      const time = new Date(state.data.meta.updatedAt).toLocaleString(state.lang === 'ar' ? 'ar-SY' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
      el.textContent = t('adm.statusDraft', { time });
    } else if (state.source === 'fallback') {
      el.textContent = t('adm.statusFallback');
    } else {
      el.textContent = t('adm.statusClean');
    }
    $('#adminDiscard').disabled = state.source !== 'draft';
  }

  /* ---------- GitHub REST API ---------- */
  async function ghRequest(path, { method = 'GET', token, body } = {}) {
    let res;
    try {
      res = await fetch(`https://api.github.com${path}`, {
        method,
        cache: 'no-store',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (networkError) {
      const err = new Error(t('gh.errNet'));
      err.status = 0;
      throw err;
    }
    let json = null;
    try { json = await res.json(); } catch (e) { /* empty body */ }
    if (!res.ok) {
      const err = new Error((json && json.message) || res.statusText);
      err.status = res.status;
      throw err;
    }
    return json;
  }

  function ghErrorMessage(err) {
    switch (err.status) {
      case 0: return t('gh.errNet');
      case 401: return t('gh.err401');
      case 403: return t('gh.err403');
      case 404: return t('gh.err404');
      default: return t('gh.err', { msg: err.message });
    }
  }

  function setBusy(btn, busy) {
    if (!btn) return;
    if (busy) {
      btn.dataset.html = btn.innerHTML;
      btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>';
      btn.disabled = true;
    } else {
      if (btn.dataset.html) btn.innerHTML = btn.dataset.html;
      btn.disabled = false;
    }
  }

  function ensureGitHubReady() {
    const cfg = githubConfig();
    const token = getToken();
    if (!cfg.owner || !cfg.repo || !token) {
      toast(t('gh.missing'), 'error');
      if (state.adminTab !== 'settings') { state.adminTab = 'settings'; renderAdmin(); }
      return null;
    }
    return { cfg, token };
  }

  async function testGitHubConnection(btn) {
    const ready = ensureGitHubReady();
    if (!ready) return;
    const { cfg, token } = ready;
    setBusy(btn, true);
    try {
      const repo = await ghRequest(`/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}`, { token });
      if (repo.permissions && repo.permissions.push) toast(t('gh.testOk', { repo: repo.full_name }), 'success', 4500);
      else toast(t('gh.testNoPush'), 'error', 5000);
    } catch (err) {
      toast(ghErrorMessage(err), 'error', 6000);
    } finally {
      setBusy(btn, false);
    }
  }

  /** Build the exact object that will be written to data.json. */
  function buildExport() {
    const out = clone(state.data);
    out.meta = { ...(out.meta || {}), version: (out.meta && out.meta.version) || 1, updatedAt: new Date().toISOString() };
    return out;
  }

  async function publishToGitHub(btn) {
    const ready = ensureGitHubReady();
    if (!ready) return;
    const { cfg, token } = ready;

    const payload = buildExport();
    const content = `${JSON.stringify(payload, null, 2)}\n`;
    const repoPath = `/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${cfg.path.split('/').map(encodeURIComponent).join('/')}`;

    const getSha = async () => {
      try {
        const current = await ghRequest(`${repoPath}?ref=${encodeURIComponent(cfg.branch)}`, { token });
        return current.sha;
      } catch (err) {
        if (err.status === 404) return undefined; // file does not exist yet → create it
        throw err;
      }
    };

    const put = async (sha) => ghRequest(repoPath, {
      method: 'PUT',
      token,
      body: {
        message: `chore(content): update portfolio data via admin dashboard (${payload.meta.updatedAt})`,
        content: toBase64(content),
        branch: cfg.branch,
        ...(sha ? { sha } : {})
      }
    });

    const buttons = [btn, $('#adminPublish')].filter(Boolean);
    buttons.forEach((b) => setBusy(b, true));
    toast(t('gh.publishing'), 'info', 2500);

    try {
      let result;
      try {
        result = await put(await getSha());
      } catch (err) {
        // 409/422: the file changed between our GET and PUT — refresh the sha and retry once
        if (err.status === 409 || err.status === 422) result = await put(await getSha());
        else throw err;
      }
      state.data = payload;
      state.remote = clone(payload);
      saveDraft(); // kept until GitHub Pages serves the new file, then auto-cleared on next load
      updateAdminStatus();
      const sha = result && result.commit ? result.commit.sha.slice(0, 7) : '';
      toast(t('gh.success', { sha }), 'success', 7000);
    } catch (err) {
      console.error('[portfolio] GitHub publish failed:', err);
      toast(ghErrorMessage(err), 'error', 7000);
    } finally {
      buttons.forEach((b) => setBusy(b, false));
    }
  }

  /* ---------- Export / import / discard ---------- */
  function exportJSON() {
    const blob = new Blob([`${JSON.stringify(buildExport(), null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(t('toast.exported'), 'success', 2500);
  }

  function importJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!isValidData(parsed)) throw new Error('invalid');
        if (!window.confirm(t('toast.importConfirm'))) return;
        state.data = normalizeData(parsed);
        commit(t('toast.imported'));
        renderAdmin();
      } catch (err) {
        toast(t('toast.importBad'), 'error', 5000);
      }
    };
    reader.readAsText(file);
  }

  function discardDraft() {
    if (state.source !== 'draft') return;
    if (!window.confirm(t('toast.discardConfirm'))) return;
    storage.remove(CONFIG.storage.draft);
    state.data = state.remote ? clone(state.remote) : normalizeData(clone(FALLBACK_DATA));
    state.source = state.remote ? 'remote' : 'fallback';
    updateDraftBanner();
    renderSite();
    renderAdmin();
    toast(t('toast.discarded'), 'success');
  }

  /* ---------- Access control (PIN gate) ---------- */
  const isUnlocked = () => storage.get(CONFIG.storage.session, sessionStorage) === '1';

  function openAdmin() {
    if (isUnlocked()) showAdminPanel();
    else showPinDialog();
  }

  function showAdminPanel() {
    const panel = $('#adminPanel');
    renderAdmin();
    if (!panel.open) panel.showModal();
  }

  function showPinDialog() {
    const modal = $('#pinModal');
    $('#pinInput').value = '';
    $('#pinError').textContent = '';
    if (!modal.open) modal.showModal();
    setTimeout(() => $('#pinInput').focus(), 50);
  }

  async function verifyPin(e) {
    e.preventDefault();
    const errorEl = $('#pinError');
    const input = $('#pinInput');
    const lockUntil = Number(storage.get(CONFIG.storage.lockUntil)) || 0;
    if (Date.now() < lockUntil) {
      errorEl.textContent = t('pin.locked', { s: Math.ceil((lockUntil - Date.now()) / 1000) });
      return;
    }

    let hash;
    try {
      hash = await sha256(CONFIG.pinSalt + input.value);
    } catch (err) {
      errorEl.textContent = t('toast.noCrypto');
      return;
    }

    const expected = state.data.settings.adminPinHash || CONFIG.defaultPinHash;
    if (hash === expected) {
      storage.set(CONFIG.storage.session, '1', sessionStorage);
      storage.remove(CONFIG.storage.attempts, sessionStorage);
      $('#pinModal').close();
      showAdminPanel();
      return;
    }

    const attempts = (Number(storage.get(CONFIG.storage.attempts, sessionStorage)) || 0) + 1;
    if (attempts >= CONFIG.maxPinAttempts) {
      storage.set(CONFIG.storage.lockUntil, String(Date.now() + CONFIG.lockoutMs));
      storage.remove(CONFIG.storage.attempts, sessionStorage);
      errorEl.textContent = t('pin.locked', { s: Math.ceil(CONFIG.lockoutMs / 1000) });
    } else {
      storage.set(CONFIG.storage.attempts, String(attempts), sessionStorage);
      errorEl.textContent = t('pin.wrong', { n: CONFIG.maxPinAttempts - attempts });
    }
    input.value = '';
    const box = $('#pinForm');
    box.classList.remove('shake');
    void box.offsetWidth;
    box.classList.add('shake');
    input.focus();
  }

  function lockAdmin() {
    storage.remove(CONFIG.storage.session, sessionStorage);
    $('#adminPanel').close();
    toast(t('toast.locked'), 'info', 2000);
  }

  function initAdmin() {
    // Shared autocomplete list for technology icon fields
    const list = document.createElement('datalist');
    list.id = 'techIconList';
    list.innerHTML = CONFIG.techSuggestions.concat(Object.keys(ICONS)).map((s) => `<option value="${s}"></option>`).join('');
    document.body.appendChild(list);

    $('#pinForm').addEventListener('submit', verifyPin);
    $('#secretAdmin').addEventListener('click', openAdmin);
    $('#draftOpenAdmin').addEventListener('click', openAdmin);
    $('#adminLock').addEventListener('click', lockAdmin);
    $('#adminExport').addEventListener('click', exportJSON);
    $('#adminImport').addEventListener('change', (e) => { importJSON(e.target.files[0]); e.target.value = ''; });
    $('#adminDiscard').addEventListener('click', discardDraft);
    $('#adminPublish').addEventListener('click', (e) => publishToGitHub(e.currentTarget));

    $('#adminTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tab]');
      if (!btn) return;
      state.adminTab = btn.dataset.tab;
      renderAdmin();
      $('#adminBody').scrollTop = 0;
    });

    // Keyboard shortcut: Ctrl + Shift + A (uses e.code so it works with Arabic layouts too)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyA') {
        e.preventDefault();
        openAdmin();
      }
    });

    // Direct link: https://<site>/#admin
    if (window.location.hash === '#admin') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
      openAdmin();
    }
  }

  /* ======================================================================
     BOOTSTRAP
     ====================================================================== */
  async function init() {
    await loadData();

    const settings = state.data.settings;
    state.lang = storage.get(CONFIG.storage.lang) || settings.defaultLang || 'ar';
    setTheme(storage.get(CONFIG.storage.theme) || settings.defaultTheme || 'dark', false);

    renderSite();
    updateDraftBanner();

    initScrollUI();
    initProjects();
    initDialogs();
    initContactForm();
    initAdmin();

    $('#themeToggle').addEventListener('click', () => setTheme(state.theme === 'dark' ? 'light' : 'dark'));
    $('#langToggle').addEventListener('click', () => setLang(state.lang === 'ar' ? 'en' : 'ar'));

    const canvas = $('#heroCanvas');
    if (canvas && canvas.getContext) {
      heroField = new ParticleField(canvas);
      heroField.start();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
