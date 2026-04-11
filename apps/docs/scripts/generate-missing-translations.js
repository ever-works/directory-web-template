#!/usr/bin/env node
/**
 * generate-missing-translations.js
 * Creates all missing i18n locale files for advanced-guide/, features/, payment/,
 * plus es/faq.md and es/support.md.
 *
 * Strategy: For technical deep-dive files (advanced-guide/, features/, payment/),
 * translate only frontmatter title/sidebar_label and H1 heading; keep body in English.
 * For root-level prose files (faq.md, support.md), provide full translations.
 */

const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const DOCS_SOURCE = path.join(ROOT, '../../docs'); // English source
const I18N_BASE = path.join(ROOT, 'i18n');

const ALL_LOCALES = ['ar', 'bg', 'de', 'es', 'he', 'it', 'nl', 'pl', 'pt', 'ru', 'zh'];

// ─── Translation tables ───────────────────────────────────────────────────────
// Format: { title, sidebar_label }
// If sidebar_label is omitted it falls back to the translated title.
// FR reference kept as comment for context.

const ADVANCED_GUIDE = {
    'api-client-architecture': {
        en: { title: 'API Client Architecture', sidebar_label: 'API Client' },
        ar: { title: 'بنية عميل API', sidebar_label: 'API Client' },
        bg: { title: 'Архитектура на API клиент', sidebar_label: 'API Client' },
        de: { title: 'API-Client-Architektur', sidebar_label: 'API Client' },
        es: { title: 'Arquitectura del cliente API', sidebar_label: 'API Client' },
        he: { title: 'ארכיטקטורת לקוח API', sidebar_label: 'API Client' },
        it: { title: 'Architettura del client API', sidebar_label: 'API Client' },
        nl: { title: 'API-clientarchitectuur', sidebar_label: 'API Client' },
        pl: { title: 'Architektura klienta API', sidebar_label: 'API Client' },
        pt: { title: 'Arquitetura do cliente API', sidebar_label: 'API Client' },
        ru: { title: 'Архитектура API-клиента', sidebar_label: 'API Client' },
        zh: { title: 'API客户端架构', sidebar_label: 'API Client' },
    },
    'background-jobs': {
        en: { title: 'Background Jobs', sidebar_label: 'Background Jobs' },
        ar: { title: 'مهام الخلفية', sidebar_label: 'مهام الخلفية' },
        bg: { title: 'Фонови задачи', sidebar_label: 'Фонови задачи' },
        de: { title: 'Hintergrundaufgaben', sidebar_label: 'Hintergrundaufgaben' },
        es: { title: 'Tareas en segundo plano', sidebar_label: 'Tareas en segundo plano' },
        he: { title: 'משימות ברקע', sidebar_label: 'משימות ברקע' },
        it: { title: 'Attività in background', sidebar_label: 'Attività in background' },
        nl: { title: 'Achtergrondtaken', sidebar_label: 'Achtergrondtaken' },
        pl: { title: 'Zadania w tle', sidebar_label: 'Zadania w tle' },
        pt: { title: 'Tarefas em segundo plano', sidebar_label: 'Tarefas em segundo plano' },
        ru: { title: 'Фоновые задачи', sidebar_label: 'Фоновые задачи' },
        zh: { title: '后台任务', sidebar_label: '后台任务' },
    },
    'caching-deep-dive': {
        en: { title: 'Caching Architecture Deep Dive', sidebar_label: 'Caching Architecture' },
        ar: { title: 'التعمق في بنية التخزين المؤقت', sidebar_label: 'Caching Architecture' },
        bg: { title: 'Задълбочено разглеждане на архитектурата за кеширане', sidebar_label: 'Caching Architecture' },
        de: { title: 'Caching-Architektur – Deep Dive', sidebar_label: 'Caching Architecture' },
        es: { title: 'Arquitectura de caché en profundidad', sidebar_label: 'Caching Architecture' },
        he: { title: 'ארכיטקטורת מטמון לעומק', sidebar_label: 'Caching Architecture' },
        it: { title: "Approfondimento sull'architettura di cache", sidebar_label: 'Caching Architecture' },
        nl: { title: 'Cache-architectuur diepgaand', sidebar_label: 'Caching Architecture' },
        pl: { title: 'Szczegółowo o architekturze pamięci podręcznej', sidebar_label: 'Caching Architecture' },
        pt: { title: 'Arquitetura de cache em profundidade', sidebar_label: 'Caching Architecture' },
        ru: { title: 'Архитектура кэширования в деталях', sidebar_label: 'Caching Architecture' },
        zh: { title: '缓存架构深度解析', sidebar_label: 'Caching Architecture' },
    },
    'database-optimization': {
        en: { title: 'Database Optimization', sidebar_label: 'Database Optimization' },
        ar: { title: 'تحسين قاعدة البيانات', sidebar_label: 'تحسين قاعدة البيانات' },
        bg: { title: 'Оптимизация на базата данни', sidebar_label: 'Оптимизация на базата данни' },
        de: { title: 'Datenbankoptimierung', sidebar_label: 'Datenbankoptimierung' },
        es: { title: 'Optimización de base de datos', sidebar_label: 'Optimización de base de datos' },
        he: { title: 'אופטימיזציה של מסד נתונים', sidebar_label: 'אופטימיזציה של מסד נתונים' },
        it: { title: 'Ottimizzazione del database', sidebar_label: 'Ottimizzazione del database' },
        nl: { title: 'Database-optimalisatie', sidebar_label: 'Database-optimalisatie' },
        pl: { title: 'Optymalizacja bazy danych', sidebar_label: 'Optymalizacja bazy danych' },
        pt: { title: 'Otimização de banco de dados', sidebar_label: 'Otimização de banco de dados' },
        ru: { title: 'Оптимизация базы данных', sidebar_label: 'Оптимизация базы данных' },
        zh: { title: '数据库优化', sidebar_label: '数据库优化' },
    },
    'editor-system-deep-dive': {
        en: { title: 'Rich Text Editor System Deep Dive', sidebar_label: 'Editor System' },
        ar: { title: 'التعمق في نظام محرر النص الغني', sidebar_label: 'Editor System' },
        bg: { title: 'Задълбочено разглеждане на системата за редактиране на текст', sidebar_label: 'Editor System' },
        de: { title: 'Rich-Text-Editor-System – Deep Dive', sidebar_label: 'Editor System' },
        es: { title: 'Sistema del editor de texto enriquecido en profundidad', sidebar_label: 'Editor System' },
        he: { title: 'מערכת עורך הטקסט העשיר לעומק', sidebar_label: 'Editor System' },
        it: { title: "Approfondimento sul sistema di editor di testo ricco", sidebar_label: 'Editor System' },
        nl: { title: 'Rich-teksteditor systeem diepgaand', sidebar_label: 'Editor System' },
        pl: { title: 'Szczegółowo o systemie edytora tekstu sformatowanego', sidebar_label: 'Editor System' },
        pt: { title: 'Sistema de editor de texto rico em profundidade', sidebar_label: 'Editor System' },
        ru: { title: 'Система редактора насыщенного текста в деталях', sidebar_label: 'Editor System' },
        zh: { title: '富文本编辑器系统深度解析', sidebar_label: 'Editor System' },
    },
    'error-recovery-patterns': {
        en: { title: 'Error Recovery Patterns', sidebar_label: 'Error Recovery' },
        ar: { title: 'أنماط استرداد الأخطاء', sidebar_label: 'Error Recovery' },
        bg: { title: 'Модели за възстановяване след грешки', sidebar_label: 'Error Recovery' },
        de: { title: 'Fehlerwiederherstellungsmuster', sidebar_label: 'Error Recovery' },
        es: { title: 'Patrones de recuperación de errores', sidebar_label: 'Error Recovery' },
        he: { title: 'דפוסי שחזור שגיאות', sidebar_label: 'Error Recovery' },
        it: { title: 'Pattern di recupero degli errori', sidebar_label: 'Error Recovery' },
        nl: { title: 'Foutherstelpatronen', sidebar_label: 'Error Recovery' },
        pl: { title: 'Wzorce odtwarzania po błędach', sidebar_label: 'Error Recovery' },
        pt: { title: 'Padrões de recuperação de erros', sidebar_label: 'Error Recovery' },
        ru: { title: 'Паттерны восстановления после ошибок', sidebar_label: 'Error Recovery' },
        zh: { title: '错误恢复模式', sidebar_label: 'Error Recovery' },
    },
    extending: {
        en: { title: 'Extending the Template', sidebar_label: 'Extending' },
        ar: { title: 'توسعة القالب', sidebar_label: 'Extending' },
        bg: { title: 'Разширяване на шаблона', sidebar_label: 'Extending' },
        de: { title: 'Vorlage erweitern', sidebar_label: 'Extending' },
        es: { title: 'Extender la plantilla', sidebar_label: 'Extending' },
        he: { title: 'הרחבת התבנית', sidebar_label: 'Extending' },
        it: { title: 'Estendere il template', sidebar_label: 'Extending' },
        nl: { title: 'Template uitbreiden', sidebar_label: 'Extending' },
        pl: { title: 'Rozszerzanie szablonu', sidebar_label: 'Extending' },
        pt: { title: 'Estendendo o template', sidebar_label: 'Extending' },
        ru: { title: 'Расширение шаблона', sidebar_label: 'Extending' },
        zh: { title: '扩展模板', sidebar_label: 'Extending' },
    },
    'migration-guide': {
        en: { title: 'Version Migration Guide', sidebar_label: 'Migration Guide' },
        ar: { title: 'دليل ترحيل الإصدار', sidebar_label: 'Migration Guide' },
        bg: { title: 'Ръководство за миграция на версията', sidebar_label: 'Migration Guide' },
        de: { title: 'Versionsmigrationsleitfaden', sidebar_label: 'Migration Guide' },
        es: { title: 'Guía de migración de versiones', sidebar_label: 'Migration Guide' },
        he: { title: 'מדריך הגירת גרסאות', sidebar_label: 'Migration Guide' },
        it: { title: 'Guida alla migrazione delle versioni', sidebar_label: 'Migration Guide' },
        nl: { title: 'Versiemutatiehandleiding', sidebar_label: 'Migration Guide' },
        pl: { title: 'Przewodnik migracji wersji', sidebar_label: 'Migration Guide' },
        pt: { title: 'Guia de migração de versão', sidebar_label: 'Migration Guide' },
        ru: { title: 'Руководство по миграции версий', sidebar_label: 'Migration Guide' },
        zh: { title: '版本迁移指南', sidebar_label: 'Migration Guide' },
    },
    performance: {
        en: { title: 'Performance Optimization', sidebar_label: 'Performance' },
        ar: { title: 'تحسين الأداء', sidebar_label: 'Performance' },
        bg: { title: 'Оптимизация на производителността', sidebar_label: 'Performance' },
        de: { title: 'Leistungsoptimierung', sidebar_label: 'Performance' },
        es: { title: 'Optimización de rendimiento', sidebar_label: 'Performance' },
        he: { title: 'אופטימיזציה של ביצועים', sidebar_label: 'Performance' },
        it: { title: 'Ottimizzazione delle prestazioni', sidebar_label: 'Performance' },
        nl: { title: 'Prestatieoptimalisatie', sidebar_label: 'Performance' },
        pl: { title: 'Optymalizacja wydajności', sidebar_label: 'Performance' },
        pt: { title: 'Otimização de desempenho', sidebar_label: 'Performance' },
        ru: { title: 'Оптимизация производительности', sidebar_label: 'Performance' },
        zh: { title: '性能优化', sidebar_label: 'Performance' },
    },
    'rate-limiting-architecture': {
        en: { title: 'Rate Limiting Architecture', sidebar_label: 'Rate Limiting' },
        ar: { title: 'بنية تحديد معدل الطلبات', sidebar_label: 'Rate Limiting' },
        bg: { title: 'Архитектура за ограничаване на скоростта', sidebar_label: 'Rate Limiting' },
        de: { title: 'Rate-Limiting-Architektur', sidebar_label: 'Rate Limiting' },
        es: { title: 'Arquitectura de limitación de velocidad', sidebar_label: 'Rate Limiting' },
        he: { title: 'ארכיטקטורת הגבלת קצב', sidebar_label: 'Rate Limiting' },
        it: { title: 'Architettura del rate limiting', sidebar_label: 'Rate Limiting' },
        nl: { title: 'Rate-limitingarchitectuur', sidebar_label: 'Rate Limiting' },
        pl: { title: 'Architektura ograniczania szybkości', sidebar_label: 'Rate Limiting' },
        pt: { title: 'Arquitetura de limitação de taxa', sidebar_label: 'Rate Limiting' },
        ru: { title: 'Архитектура ограничения скорости', sidebar_label: 'Rate Limiting' },
        zh: { title: '速率限制架构', sidebar_label: 'Rate Limiting' },
    },
    security: {
        en: { title: 'Security Hardening', sidebar_label: 'Security' },
        ar: { title: 'تقوية الأمان', sidebar_label: 'الأمان' },
        bg: { title: 'Укрепване на сигурността', sidebar_label: 'Сигурност' },
        de: { title: 'Sicherheitshärtung', sidebar_label: 'Sicherheit' },
        es: { title: 'Fortalecimiento de seguridad', sidebar_label: 'Seguridad' },
        he: { title: 'חיזוק האבטחה', sidebar_label: 'אבטחה' },
        it: { title: 'Rafforzamento della sicurezza', sidebar_label: 'Sicurezza' },
        nl: { title: 'Beveiligingsverharding', sidebar_label: 'Beveiliging' },
        pl: { title: 'Wzmocnienie bezpieczeństwa', sidebar_label: 'Bezpieczeństwo' },
        pt: { title: 'Endurecimento de segurança', sidebar_label: 'Segurança' },
        ru: { title: 'Усиление безопасности', sidebar_label: 'Безопасность' },
        zh: { title: '安全加固', sidebar_label: '安全' },
    },
    'session-management-deep-dive': {
        en: { title: 'Session Management Deep Dive', sidebar_label: 'Session Management' },
        ar: { title: 'التعمق في إدارة الجلسات', sidebar_label: 'Session Management' },
        bg: { title: 'Задълбочено разглеждане на управлението на сесии', sidebar_label: 'Session Management' },
        de: { title: 'Sitzungsverwaltung – Deep Dive', sidebar_label: 'Session Management' },
        es: { title: 'Gestión de sesiones en profundidad', sidebar_label: 'Session Management' },
        he: { title: 'ניהול הפעלות לעומק', sidebar_label: 'Session Management' },
        it: { title: 'Approfondimento sulla gestione delle sessioni', sidebar_label: 'Session Management' },
        nl: { title: 'Sessiebeheer diepgaand', sidebar_label: 'Session Management' },
        pl: { title: 'Szczegółowo o zarządzaniu sesjami', sidebar_label: 'Session Management' },
        pt: { title: 'Gerenciamento de sessões em profundidade', sidebar_label: 'Session Management' },
        ru: { title: 'Управление сессиями в деталях', sidebar_label: 'Session Management' },
        zh: { title: '会话管理深度解析', sidebar_label: 'Session Management' },
    },
    support: {
        en: { title: 'Support & Help', sidebar_label: 'Support' },
        ar: { title: 'الدعم والمساعدة', sidebar_label: 'Support' },
        bg: { title: 'Поддръжка и помощ', sidebar_label: 'Support' },
        de: { title: 'Support & Hilfe', sidebar_label: 'Support' },
        es: { title: 'Soporte y ayuda', sidebar_label: 'Support' },
        he: { title: 'תמיכה ועזרה', sidebar_label: 'Support' },
        it: { title: 'Supporto e aiuto', sidebar_label: 'Support' },
        nl: { title: 'Ondersteuning & hulp', sidebar_label: 'Support' },
        pl: { title: 'Wsparcie i pomoc', sidebar_label: 'Support' },
        pt: { title: 'Suporte e ajuda', sidebar_label: 'Support' },
        ru: { title: 'Поддержка и помощь', sidebar_label: 'Support' },
        zh: { title: '支持与帮助', sidebar_label: 'Support' },
    },
    troubleshooting: {
        en: { title: 'Troubleshooting Guide', sidebar_label: 'Troubleshooting' },
        ar: { title: 'دليل استكشاف الأخطاء وإصلاحها', sidebar_label: 'استكشاف الأخطاء' },
        bg: { title: 'Ръководство за отстраняване на неизправности', sidebar_label: 'Отстраняване на неизправности' },
        de: { title: 'Fehlerbehebungsleitfaden', sidebar_label: 'Fehlerbehebung' },
        es: { title: 'Guía de resolución de problemas', sidebar_label: 'Resolución de problemas' },
        he: { title: 'מדריך פתרון בעיות', sidebar_label: 'פתרון בעיות' },
        it: { title: 'Guida alla risoluzione dei problemi', sidebar_label: 'Risoluzione dei problemi' },
        nl: { title: 'Probleemoplossingshandleiding', sidebar_label: 'Probleemoplossing' },
        pl: { title: 'Przewodnik rozwiązywania problemów', sidebar_label: 'Rozwiązywanie problemów' },
        pt: { title: 'Guia de solução de problemas', sidebar_label: 'Solução de problemas' },
        ru: { title: 'Руководство по устранению неполадок', sidebar_label: 'Устранение неполадок' },
        zh: { title: '故障排除指南', sidebar_label: '故障排除' },
    },
    'webhook-architecture': {
        en: { title: 'Webhook Architecture', sidebar_label: 'Webhooks' },
        ar: { title: 'بنية Webhook', sidebar_label: 'Webhooks' },
        bg: { title: 'Архитектура на уебхукове', sidebar_label: 'Webhooks' },
        de: { title: 'Webhook-Architektur', sidebar_label: 'Webhooks' },
        es: { title: 'Arquitectura de webhooks', sidebar_label: 'Webhooks' },
        he: { title: 'ארכיטקטורת Webhook', sidebar_label: 'Webhooks' },
        it: { title: 'Architettura dei webhook', sidebar_label: 'Webhooks' },
        nl: { title: 'Webhook-architectuur', sidebar_label: 'Webhooks' },
        pl: { title: 'Architektura webhooków', sidebar_label: 'Webhooks' },
        pt: { title: 'Arquitetura de webhooks', sidebar_label: 'Webhooks' },
        ru: { title: 'Архитектура вебхуков', sidebar_label: 'Webhooks' },
        zh: { title: 'Webhook架构', sidebar_label: 'Webhooks' },
    },
};

const FEATURES = {
    'admin-analytics': {
        en: { title: 'Admin Analytics', sidebar_label: 'Admin Analytics' },
        ar: { title: 'تحليلات الإدارة', sidebar_label: 'تحليلات الإدارة' },
        bg: { title: 'Административна аналитика', sidebar_label: 'Административна аналитика' },
        de: { title: 'Admin-Analytik', sidebar_label: 'Admin-Analytik' },
        es: { title: 'Análisis de administración', sidebar_label: 'Análisis de administración' },
        he: { title: 'ניתוח מנהל', sidebar_label: 'ניתוח מנהל' },
        it: { title: 'Analisi amministratore', sidebar_label: 'Analisi amministratore' },
        nl: { title: 'Admin-analyses', sidebar_label: 'Admin-analyses' },
        pl: { title: 'Analityka administratora', sidebar_label: 'Analityka administratora' },
        pt: { title: 'Análise de administração', sidebar_label: 'Análise de administração' },
        ru: { title: 'Аналитика администратора', sidebar_label: 'Аналитика администратора' },
        zh: { title: '管理员分析', sidebar_label: '管理员分析' },
    },
    'admin-management': {
        en: { title: 'Admin Management', sidebar_label: 'Admin Management' },
        ar: { title: 'إدارة المشرف', sidebar_label: 'إدارة المشرف' },
        bg: { title: 'Администраторско управление', sidebar_label: 'Администраторско управление' },
        de: { title: 'Admin-Verwaltung', sidebar_label: 'Admin-Verwaltung' },
        es: { title: 'Gestión de administración', sidebar_label: 'Gestión de administración' },
        he: { title: 'ניהול מנהל', sidebar_label: 'ניהול מנהל' },
        it: { title: 'Gestione amministratore', sidebar_label: 'Gestione amministratore' },
        nl: { title: 'Admin-beheer', sidebar_label: 'Admin-beheer' },
        pl: { title: 'Zarządzanie administratorem', sidebar_label: 'Zarządzanie administratorem' },
        pt: { title: 'Gerenciamento de administração', sidebar_label: 'Gerenciamento de administração' },
        ru: { title: 'Управление администратором', sidebar_label: 'Управление администратором' },
        zh: { title: '管理员管理', sidebar_label: '管理员管理' },
    },
    analytics: {
        en: { title: 'Analytics System', sidebar_label: 'Analytics' },
        ar: { title: 'نظام التحليلات', sidebar_label: 'التحليلات' },
        bg: { title: 'Система за аналитика', sidebar_label: 'Аналитика' },
        de: { title: 'Analysesystem', sidebar_label: 'Analysen' },
        es: { title: 'Sistema de análisis', sidebar_label: 'Análisis' },
        he: { title: 'מערכת ניתוח', sidebar_label: 'ניתוח' },
        it: { title: 'Sistema di analisi', sidebar_label: 'Analisi' },
        nl: { title: 'Analysesysteem', sidebar_label: 'Analyses' },
        pl: { title: 'System analityczny', sidebar_label: 'Analityka' },
        pt: { title: 'Sistema de análises', sidebar_label: 'Análises' },
        ru: { title: 'Система аналитики', sidebar_label: 'Аналитика' },
        zh: { title: '分析系统', sidebar_label: '分析' },
    },
    breadcrumbs: {
        en: { title: 'Breadcrumb Navigation', sidebar_label: 'Breadcrumbs' },
        ar: { title: 'التنقل عبر مسار التنقل', sidebar_label: 'مسار التنقل' },
        bg: { title: 'Навигация с навигационни следи', sidebar_label: 'Навигационни следи' },
        de: { title: 'Breadcrumb-Navigation', sidebar_label: 'Breadcrumbs' },
        es: { title: 'Navegación de migas de pan', sidebar_label: 'Migas de pan' },
        he: { title: 'ניווט ארנבות', sidebar_label: 'ארנבות' },
        it: { title: 'Navigazione breadcrumb', sidebar_label: 'Breadcrumb' },
        nl: { title: 'Breadcrumb-navigatie', sidebar_label: 'Breadcrumbs' },
        pl: { title: 'Nawigacja okruszkowa', sidebar_label: 'Okruszki' },
        pt: { title: 'Navegação de breadcrumb', sidebar_label: 'Breadcrumbs' },
        ru: { title: 'Навигация хлебных крошек', sidebar_label: 'Хлебные крошки' },
        zh: { title: '面包屑导航', sidebar_label: '面包屑' },
    },
    collections: {
        en: { title: 'Collections System', sidebar_label: 'Collections' },
        ar: { title: 'نظام المجموعات', sidebar_label: 'المجموعات' },
        bg: { title: 'Система за колекции', sidebar_label: 'Колекции' },
        de: { title: 'Sammlungssystem', sidebar_label: 'Sammlungen' },
        es: { title: 'Sistema de colecciones', sidebar_label: 'Colecciones' },
        he: { title: 'מערכת אוספים', sidebar_label: 'אוספים' },
        it: { title: 'Sistema di collezioni', sidebar_label: 'Collezioni' },
        nl: { title: 'Verzamelingssysteem', sidebar_label: 'Verzamelingen' },
        pl: { title: 'System kolekcji', sidebar_label: 'Kolekcje' },
        pt: { title: 'Sistema de coleções', sidebar_label: 'Coleções' },
        ru: { title: 'Система коллекций', sidebar_label: 'Коллекции' },
        zh: { title: '收藏系统', sidebar_label: '收藏' },
    },
    'company-profiles': {
        en: { title: 'Company Profiles', sidebar_label: 'Company Profiles' },
        ar: { title: 'ملفات تعريف الشركة', sidebar_label: 'ملفات الشركة' },
        bg: { title: 'Профили на компании', sidebar_label: 'Профили на компании' },
        de: { title: 'Unternehmensprofile', sidebar_label: 'Unternehmensprofile' },
        es: { title: 'Perfiles de empresa', sidebar_label: 'Perfiles de empresa' },
        he: { title: 'פרופילי חברה', sidebar_label: 'פרופילי חברה' },
        it: { title: 'Profili aziendali', sidebar_label: 'Profili aziendali' },
        nl: { title: 'Bedrijfsprofielen', sidebar_label: 'Bedrijfsprofielen' },
        pl: { title: 'Profile firmowe', sidebar_label: 'Profile firmowe' },
        pt: { title: 'Perfis de empresa', sidebar_label: 'Perfis de empresa' },
        ru: { title: 'Профили компаний', sidebar_label: 'Профили компаний' },
        zh: { title: '公司简介', sidebar_label: '公司简介' },
    },
    'dark-mode': {
        en: { title: 'Dark Mode & Theme Switching', sidebar_label: 'Dark Mode' },
        ar: { title: 'الوضع المظلم وتبديل السمة', sidebar_label: 'الوضع المظلم' },
        bg: { title: 'Тъмен режим и смяна на тема', sidebar_label: 'Тъмен режим' },
        de: { title: 'Dunkelmodus & Themenwechsel', sidebar_label: 'Dunkelmodus' },
        es: { title: 'Modo oscuro y cambio de tema', sidebar_label: 'Modo oscuro' },
        he: { title: 'מצב כהה ומיתוג', sidebar_label: 'מצב כהה' },
        it: { title: 'Modalità scura e cambio tema', sidebar_label: 'Modalità scura' },
        nl: { title: 'Donkere modus & thema wisselen', sidebar_label: 'Donkere modus' },
        pl: { title: 'Tryb ciemny i przełączanie motywu', sidebar_label: 'Tryb ciemny' },
        pt: { title: 'Modo escuro e troca de tema', sidebar_label: 'Modo escuro' },
        ru: { title: 'Тёмный режим и переключение темы', sidebar_label: 'Тёмный режим' },
        zh: { title: '深色模式和主题切换', sidebar_label: '深色模式' },
    },
    'favorites-system': {
        en: { title: 'Favorites System', sidebar_label: 'Favorites' },
        ar: { title: 'نظام المفضلة', sidebar_label: 'المفضلة' },
        bg: { title: 'Система за любими', sidebar_label: 'Любими' },
        de: { title: 'Favoriten-System', sidebar_label: 'Favoriten' },
        es: { title: 'Sistema de favoritos', sidebar_label: 'Favoritos' },
        he: { title: 'מערכת מועדפים', sidebar_label: 'מועדפים' },
        it: { title: 'Sistema dei preferiti', sidebar_label: 'Preferiti' },
        nl: { title: 'Favorietensysteem', sidebar_label: 'Favorieten' },
        pl: { title: 'System ulubionych', sidebar_label: 'Ulubione' },
        pt: { title: 'Sistema de favoritos', sidebar_label: 'Favoritos' },
        ru: { title: 'Система избранного', sidebar_label: 'Избранное' },
        zh: { title: '收藏系统', sidebar_label: '收藏夹' },
    },
    'feature-flags': {
        en: { title: 'Feature Flags System', sidebar_label: 'Feature Flags' },
        ar: { title: 'نظام علامات الميزات', sidebar_label: 'Feature Flags' },
        bg: { title: 'Система за флагове на функции', sidebar_label: 'Feature Flags' },
        de: { title: 'Feature-Flags-System', sidebar_label: 'Feature Flags' },
        es: { title: 'Sistema de indicadores de características', sidebar_label: 'Feature Flags' },
        he: { title: 'מערכת דגלי תכונות', sidebar_label: 'Feature Flags' },
        it: { title: 'Sistema di feature flag', sidebar_label: 'Feature Flags' },
        nl: { title: 'Feature-flagssysteem', sidebar_label: 'Feature Flags' },
        pl: { title: 'System flag funkcji', sidebar_label: 'Feature Flags' },
        pt: { title: 'Sistema de flags de recursos', sidebar_label: 'Feature Flags' },
        ru: { title: 'Система флагов функций', sidebar_label: 'Feature Flags' },
        zh: { title: '功能标志系统', sidebar_label: 'Feature Flags' },
    },
    'featured-items': {
        en: { title: 'Featured Items System', sidebar_label: 'Featured Items' },
        ar: { title: 'نظام العناصر المميزة', sidebar_label: 'العناصر المميزة' },
        bg: { title: 'Система за представени елементи', sidebar_label: 'Представени елементи' },
        de: { title: 'System für hervorgehobene Elemente', sidebar_label: 'Hervorgehobene Elemente' },
        es: { title: 'Sistema de elementos destacados', sidebar_label: 'Elementos destacados' },
        he: { title: 'מערכת פריטים מוצגים', sidebar_label: 'פריטים מוצגים' },
        it: { title: 'Sistema degli elementi in evidenza', sidebar_label: 'Elementi in evidenza' },
        nl: { title: 'Aanbevolen items systeem', sidebar_label: 'Aanbevolen items' },
        pl: { title: 'System wyróżnionych elementów', sidebar_label: 'Wyróżnione elementy' },
        pt: { title: 'Sistema de itens em destaque', sidebar_label: 'Itens em destaque' },
        ru: { title: 'Система избранных элементов', sidebar_label: 'Избранные элементы' },
        zh: { title: '精选项目系统', sidebar_label: '精选项目' },
    },
    'file-upload': {
        en: { title: 'File Upload', sidebar_label: 'File Upload' },
        ar: { title: 'رفع الملفات', sidebar_label: 'رفع الملفات' },
        bg: { title: 'Качване на файлове', sidebar_label: 'Качване на файлове' },
        de: { title: 'Datei-Upload', sidebar_label: 'Datei-Upload' },
        es: { title: 'Carga de archivos', sidebar_label: 'Carga de archivos' },
        he: { title: 'העלאת קבצים', sidebar_label: 'העלאת קבצים' },
        it: { title: 'Caricamento file', sidebar_label: 'Caricamento file' },
        nl: { title: 'Bestand uploaden', sidebar_label: 'Bestand uploaden' },
        pl: { title: 'Przesyłanie plików', sidebar_label: 'Przesyłanie plików' },
        pt: { title: 'Upload de arquivo', sidebar_label: 'Upload de arquivo' },
        ru: { title: 'Загрузка файлов', sidebar_label: 'Загрузка файлов' },
        zh: { title: '文件上传', sidebar_label: '文件上传' },
    },
    'image-management': {
        en: { title: 'Image Management', sidebar_label: 'Image Management' },
        ar: { title: 'إدارة الصور', sidebar_label: 'إدارة الصور' },
        bg: { title: 'Управление на изображения', sidebar_label: 'Управление на изображения' },
        de: { title: 'Bildverwaltung', sidebar_label: 'Bildverwaltung' },
        es: { title: 'Gestión de imágenes', sidebar_label: 'Gestión de imágenes' },
        he: { title: 'ניהול תמונות', sidebar_label: 'ניהול תמונות' },
        it: { title: 'Gestione delle immagini', sidebar_label: 'Gestione delle immagini' },
        nl: { title: 'Afbeeldingsbeheer', sidebar_label: 'Afbeeldingsbeheer' },
        pl: { title: 'Zarządzanie obrazami', sidebar_label: 'Zarządzanie obrazami' },
        pt: { title: 'Gerenciamento de imagens', sidebar_label: 'Gerenciamento de imagens' },
        ru: { title: 'Управление изображениями', sidebar_label: 'Управление изображениями' },
        zh: { title: '图像管理', sidebar_label: '图像管理' },
    },
    'item-categories': {
        en: { title: 'Item Categories', sidebar_label: 'Item Categories' },
        ar: { title: 'فئات العناصر', sidebar_label: 'فئات العناصر' },
        bg: { title: 'Категории на елементи', sidebar_label: 'Категории на елементи' },
        de: { title: 'Element-Kategorien', sidebar_label: 'Element-Kategorien' },
        es: { title: 'Categorías de elementos', sidebar_label: 'Categorías de elementos' },
        he: { title: 'קטגוריות פריטים', sidebar_label: 'קטגוריות פריטים' },
        it: { title: 'Categorie degli elementi', sidebar_label: 'Categorie degli elementi' },
        nl: { title: 'Item-categorieën', sidebar_label: 'Item-categorieën' },
        pl: { title: 'Kategorie elementów', sidebar_label: 'Kategorie elementów' },
        pt: { title: 'Categorias de itens', sidebar_label: 'Categorias de itens' },
        ru: { title: 'Категории элементов', sidebar_label: 'Категории элементов' },
        zh: { title: '项目类别', sidebar_label: '项目类别' },
    },
    'item-history': {
        en: { title: 'Item History & Audit', sidebar_label: 'Item History & Audit' },
        ar: { title: 'سجل وتدقيق العناصر', sidebar_label: 'سجل وتدقيق العناصر' },
        bg: { title: 'История и одит на елементи', sidebar_label: 'История и одит на елементи' },
        de: { title: 'Element-Verlauf & Prüfung', sidebar_label: 'Element-Verlauf & Prüfung' },
        es: { title: 'Historial y auditoría de elementos', sidebar_label: 'Historial y auditoría de elementos' },
        he: { title: 'היסטוריה וביקורת פריטים', sidebar_label: 'היסטוריה וביקורת פריטים' },
        it: { title: 'Cronologia e audit degli elementi', sidebar_label: 'Cronologia e audit degli elementi' },
        nl: { title: 'Item-geschiedenis & audit', sidebar_label: 'Item-geschiedenis & audit' },
        pl: { title: 'Historia i audyt elementów', sidebar_label: 'Historia i audyt elementów' },
        pt: { title: 'Histórico e auditoria de itens', sidebar_label: 'Histórico e auditoria de itens' },
        ru: { title: 'История и аудит элементов', sidebar_label: 'История и аудит элементов' },
        zh: { title: '项目历史和审计', sidebar_label: '项目历史和审计' },
    },
    'item-submissions': {
        en: { title: 'Item Submissions', sidebar_label: 'Item Submissions' },
        ar: { title: 'تقديم العناصر', sidebar_label: 'تقديم العناصر' },
        bg: { title: 'Изпращане на елементи', sidebar_label: 'Изпращане на елементи' },
        de: { title: 'Element-Einreichungen', sidebar_label: 'Einreichungen' },
        es: { title: 'Envío de elementos', sidebar_label: 'Envío de elementos' },
        he: { title: 'הגשת פריטים', sidebar_label: 'הגשת פריטים' },
        it: { title: 'Invio degli elementi', sidebar_label: 'Invio degli elementi' },
        nl: { title: 'Item-inzendingen', sidebar_label: 'Inzendingen' },
        pl: { title: 'Zgłoszenia elementów', sidebar_label: 'Zgłoszenia' },
        pt: { title: 'Envio de itens', sidebar_label: 'Envio de itens' },
        ru: { title: 'Отправка элементов', sidebar_label: 'Отправка элементов' },
        zh: { title: '项目提交', sidebar_label: '项目提交' },
    },
    'maps-location': {
        en: { title: 'Maps & Location Features', sidebar_label: 'Maps & Location' },
        ar: { title: 'ميزات الخرائط والموقع', sidebar_label: 'الخرائط والموقع' },
        bg: { title: 'Функции за карти и местоположение', sidebar_label: 'Карти и местоположение' },
        de: { title: 'Karten & Standortfunktionen', sidebar_label: 'Karten & Standort' },
        es: { title: 'Funciones de mapas y ubicación', sidebar_label: 'Mapas & Ubicación' },
        he: { title: 'תכונות מפות ומיקום', sidebar_label: 'מפות ומיקום' },
        it: { title: 'Funzionalità mappe e posizione', sidebar_label: 'Mappe & Posizione' },
        nl: { title: 'Kaarten & locatiefuncties', sidebar_label: 'Kaarten & Locatie' },
        pl: { title: 'Funkcje map i lokalizacji', sidebar_label: 'Mapy & Lokalizacja' },
        pt: { title: 'Recursos de mapas e localização', sidebar_label: 'Mapas & Localização' },
        ru: { title: 'Функции карт и местоположения', sidebar_label: 'Карты & Местоположение' },
        zh: { title: '地图和位置功能', sidebar_label: '地图和位置' },
    },
    'multi-step-forms': {
        en: { title: 'Multi-Step Forms', sidebar_label: 'Multi-Step Forms' },
        ar: { title: 'النماذج متعددة الخطوات', sidebar_label: 'النماذج متعددة الخطوات' },
        bg: { title: 'Многостъпкови форми', sidebar_label: 'Многостъпкови форми' },
        de: { title: 'Mehrstufige Formulare', sidebar_label: 'Mehrstufige Formulare' },
        es: { title: 'Formularios de varios pasos', sidebar_label: 'Formularios de varios pasos' },
        he: { title: 'טפסים רב-שלביים', sidebar_label: 'טפסים רב-שלביים' },
        it: { title: 'Moduli a più passaggi', sidebar_label: 'Moduli a più passaggi' },
        nl: { title: 'Meerstapsformulieren', sidebar_label: 'Meerstapsformulieren' },
        pl: { title: 'Formularze wieloetapowe', sidebar_label: 'Formularze wieloetapowe' },
        pt: { title: 'Formulários de múltiplas etapas', sidebar_label: 'Formulários de múltiplas etapas' },
        ru: { title: 'Многошаговые формы', sidebar_label: 'Многошаговые формы' },
        zh: { title: '多步骤表单', sidebar_label: '多步骤表单' },
    },
    newsletter: {
        en: { title: 'Newsletter System', sidebar_label: 'Newsletter' },
        ar: { title: 'نظام النشرة الإخبارية', sidebar_label: 'Newsletter' },
        bg: { title: 'Система за бюлетин', sidebar_label: 'Newsletter' },
        de: { title: 'Newsletter-System', sidebar_label: 'Newsletter' },
        es: { title: 'Sistema de boletines', sidebar_label: 'Newsletter' },
        he: { title: 'מערכת ניוזלטר', sidebar_label: 'Newsletter' },
        it: { title: 'Sistema newsletter', sidebar_label: 'Newsletter' },
        nl: { title: 'Nieuwsbriefsysteem', sidebar_label: 'Newsletter' },
        pl: { title: 'System newslettera', sidebar_label: 'Newsletter' },
        pt: { title: 'Sistema de newsletter', sidebar_label: 'Newsletter' },
        ru: { title: 'Система рассылки', sidebar_label: 'Newsletter' },
        zh: { title: '通讯系统', sidebar_label: 'Newsletter' },
    },
    'notification-system': {
        en: { title: 'Notification System Deep Dive', sidebar_label: 'Notification System' },
        ar: { title: 'التعمق في نظام الإشعارات', sidebar_label: 'نظام الإشعارات' },
        bg: { title: 'Задълбочено разглеждане на системата за известия', sidebar_label: 'Система за известия' },
        de: { title: 'Benachrichtigungssystem – Deep Dive', sidebar_label: 'Benachrichtigungssystem' },
        es: { title: 'Sistema de notificaciones en profundidad', sidebar_label: 'Sistema de notificaciones' },
        he: { title: 'מערכת ההתראות לעומק', sidebar_label: 'מערכת ההתראות' },
        it: { title: 'Sistema di notifiche – Approfondimento', sidebar_label: 'Sistema di notifiche' },
        nl: { title: 'Notificatiesysteem diepgaand', sidebar_label: 'Notificatiesysteem' },
        pl: { title: 'System powiadomień – Szczegółowo', sidebar_label: 'System powiadomień' },
        pt: { title: 'Sistema de notificações em profundidade', sidebar_label: 'Sistema de notificações' },
        ru: { title: 'Система уведомлений в деталях', sidebar_label: 'Система уведомлений' },
        zh: { title: '通知系统深度解析', sidebar_label: '通知系统' },
    },
    notifications: {
        en: { title: 'Notification System', sidebar_label: 'Notifications' },
        ar: { title: 'نظام الإشعارات', sidebar_label: 'الإشعارات' },
        bg: { title: 'Система за известия', sidebar_label: 'Известия' },
        de: { title: 'Benachrichtigungssystem', sidebar_label: 'Benachrichtigungen' },
        es: { title: 'Sistema de notificaciones', sidebar_label: 'Notificaciones' },
        he: { title: 'מערכת ההתראות', sidebar_label: 'התראות' },
        it: { title: 'Sistema di notifiche', sidebar_label: 'Notifiche' },
        nl: { title: 'Meldingssysteem', sidebar_label: 'Meldingen' },
        pl: { title: 'System powiadomień', sidebar_label: 'Powiadomienia' },
        pt: { title: 'Sistema de notificações', sidebar_label: 'Notificações' },
        ru: { title: 'Система уведомлений', sidebar_label: 'Уведомления' },
        zh: { title: '通知系统', sidebar_label: '通知' },
    },
    'pricing-pages': {
        en: { title: 'Pricing & Checkout Pages', sidebar_label: 'Pricing Pages' },
        ar: { title: 'صفحات التسعير والدفع', sidebar_label: 'Pricing Pages' },
        bg: { title: 'Страници за ценообразуване и плащане', sidebar_label: 'Pricing Pages' },
        de: { title: 'Pricing & Kassenseiten', sidebar_label: 'Pricing Pages' },
        es: { title: 'Páginas de precios y pago', sidebar_label: 'Pricing Pages' },
        he: { title: 'דפי תמחור ותשלום', sidebar_label: 'Pricing Pages' },
        it: { title: 'Pagine di prezzi e checkout', sidebar_label: 'Pricing Pages' },
        nl: { title: "Prijs- en betaalpagina's", sidebar_label: 'Pricing Pages' },
        pl: { title: 'Strony cennika i kasy', sidebar_label: 'Pricing Pages' },
        pt: { title: 'Páginas de preços e checkout', sidebar_label: 'Pricing Pages' },
        ru: { title: 'Страницы с ценами и оформлением заказа', sidebar_label: 'Pricing Pages' },
        zh: { title: '定价和结账页面', sidebar_label: 'Pricing Pages' },
    },
    'promo-codes': {
        en: { title: 'Promo Code System', sidebar_label: 'Promo Codes' },
        ar: { title: 'نظام رموز الترويج', sidebar_label: 'رموز الترويج' },
        bg: { title: 'Система за промо кодове', sidebar_label: 'Промо кодове' },
        de: { title: 'Promo-Code-System', sidebar_label: 'Promo-Codes' },
        es: { title: 'Sistema de códigos promocionales', sidebar_label: 'Códigos promocionales' },
        he: { title: 'מערכת קודי קידום', sidebar_label: 'קודי קידום' },
        it: { title: 'Sistema di codici promozionali', sidebar_label: 'Codici promozionali' },
        nl: { title: 'Promotiecodesysteem', sidebar_label: 'Promotiecodes' },
        pl: { title: 'System kodów promocyjnych', sidebar_label: 'Kody promocyjne' },
        pt: { title: 'Sistema de códigos promocionais', sidebar_label: 'Códigos promocionais' },
        ru: { title: 'Система промо-кодов', sidebar_label: 'Промо-коды' },
        zh: { title: '促销码系统', sidebar_label: '促销码' },
    },
    recaptcha: {
        en: { title: 'reCAPTCHA Integration', sidebar_label: 'reCAPTCHA' },
        ar: { title: 'تكامل reCAPTCHA', sidebar_label: 'reCAPTCHA' },
        bg: { title: 'Интеграция reCAPTCHA', sidebar_label: 'reCAPTCHA' },
        de: { title: 'reCAPTCHA-Integration', sidebar_label: 'reCAPTCHA' },
        es: { title: 'Integración reCAPTCHA', sidebar_label: 'reCAPTCHA' },
        he: { title: 'אינטגרציה reCAPTCHA', sidebar_label: 'reCAPTCHA' },
        it: { title: 'Integrazione reCAPTCHA', sidebar_label: 'reCAPTCHA' },
        nl: { title: 'reCAPTCHA-integratie', sidebar_label: 'reCAPTCHA' },
        pl: { title: 'Integracja reCAPTCHA', sidebar_label: 'reCAPTCHA' },
        pt: { title: 'Integração reCAPTCHA', sidebar_label: 'reCAPTCHA' },
        ru: { title: 'Интеграция reCAPTCHA', sidebar_label: 'reCAPTCHA' },
        zh: { title: 'reCAPTCHA集成', sidebar_label: 'reCAPTCHA' },
    },
    'reports-moderation': {
        en: { title: 'Reports & Content Moderation', sidebar_label: 'Reports & Moderation' },
        ar: { title: 'التقارير وإشراف المحتوى', sidebar_label: 'Reports & Moderation' },
        bg: { title: 'Отчети и модериране на съдържание', sidebar_label: 'Reports & Moderation' },
        de: { title: 'Berichte & Inhaltsmoderation', sidebar_label: 'Reports & Moderation' },
        es: { title: 'Informes y moderación de contenido', sidebar_label: 'Reports & Moderation' },
        he: { title: 'דוחות ומיתון תוכן', sidebar_label: 'Reports & Moderation' },
        it: { title: 'Report e moderazione dei contenuti', sidebar_label: 'Reports & Moderation' },
        nl: { title: 'Rapporten & inhoudsmoderatie', sidebar_label: 'Reports & Moderation' },
        pl: { title: 'Raporty i moderacja treści', sidebar_label: 'Reports & Moderation' },
        pt: { title: 'Relatórios e moderação de conteúdo', sidebar_label: 'Reports & Moderation' },
        ru: { title: 'Отчёты и модерация контента', sidebar_label: 'Reports & Moderation' },
        zh: { title: '报告和内容审核', sidebar_label: 'Reports & Moderation' },
    },
    'rich-text-editor': {
        en: { title: 'Rich Text Editor', sidebar_label: 'Rich Text Editor' },
        ar: { title: 'محرر النص الغني', sidebar_label: 'محرر النص الغني' },
        bg: { title: 'Редактор на форматиран текст', sidebar_label: 'Редактор на форматиран текст' },
        de: { title: 'Rich-Text-Editor', sidebar_label: 'Rich-Text-Editor' },
        es: { title: 'Editor de texto enriquecido', sidebar_label: 'Editor de texto enriquecido' },
        he: { title: 'עורך טקסט עשיר', sidebar_label: 'עורך טקסט עשיר' },
        it: { title: 'Editor di testo ricco', sidebar_label: 'Editor di testo ricco' },
        nl: { title: 'Rich-teksteditor', sidebar_label: 'Rich-teksteditor' },
        pl: { title: 'Edytor tekstu sformatowanego', sidebar_label: 'Edytor tekstu sformatowanego' },
        pt: { title: 'Editor de texto rico', sidebar_label: 'Editor de texto rico' },
        ru: { title: 'Редактор насыщенного текста', sidebar_label: 'Редактор насыщенного текста' },
        zh: { title: '富文本编辑器', sidebar_label: '富文本编辑器' },
    },
    'search-system': {
        en: { title: 'Search System', sidebar_label: 'Search System' },
        ar: { title: 'نظام البحث', sidebar_label: 'نظام البحث' },
        bg: { title: 'Система за търсене', sidebar_label: 'Система за търсене' },
        de: { title: 'Suchsystem', sidebar_label: 'Suchsystem' },
        es: { title: 'Sistema de búsqueda', sidebar_label: 'Sistema de búsqueda' },
        he: { title: 'מערכת חיפוש', sidebar_label: 'מערכת חיפוש' },
        it: { title: 'Sistema di ricerca', sidebar_label: 'Sistema di ricerca' },
        nl: { title: 'Zoeksysteem', sidebar_label: 'Zoeksysteem' },
        pl: { title: 'System wyszukiwania', sidebar_label: 'System wyszukiwania' },
        pt: { title: 'Sistema de busca', sidebar_label: 'Sistema de busca' },
        ru: { title: 'Система поиска', sidebar_label: 'Система поиска' },
        zh: { title: '搜索系统', sidebar_label: '搜索系统' },
    },
    seo: {
        en: { title: 'SEO Configuration', sidebar_label: 'SEO' },
        ar: { title: 'تكوين SEO', sidebar_label: 'SEO' },
        bg: { title: 'SEO конфигурация', sidebar_label: 'SEO' },
        de: { title: 'SEO-Konfiguration', sidebar_label: 'SEO' },
        es: { title: 'Configuración SEO', sidebar_label: 'SEO' },
        he: { title: 'הגדרת SEO', sidebar_label: 'SEO' },
        it: { title: 'Configurazione SEO', sidebar_label: 'SEO' },
        nl: { title: 'SEO-configuratie', sidebar_label: 'SEO' },
        pl: { title: 'Konfiguracja SEO', sidebar_label: 'SEO' },
        pt: { title: 'Configuração SEO', sidebar_label: 'SEO' },
        ru: { title: 'Конфигурация SEO', sidebar_label: 'SEO' },
        zh: { title: 'SEO配置', sidebar_label: 'SEO' },
    },
    'social-sharing': {
        en: { title: 'Social Sharing', sidebar_label: 'Social Sharing' },
        ar: { title: 'المشاركة الاجتماعية', sidebar_label: 'المشاركة الاجتماعية' },
        bg: { title: 'Споделяне в социалните мрежи', sidebar_label: 'Споделяне в социалните мрежи' },
        de: { title: 'Soziales Teilen', sidebar_label: 'Soziales Teilen' },
        es: { title: 'Compartir en redes sociales', sidebar_label: 'Compartir en redes sociales' },
        he: { title: 'שיתוף חברתי', sidebar_label: 'שיתוף חברתי' },
        it: { title: 'Condivisione social', sidebar_label: 'Condivisione social' },
        nl: { title: 'Sociaal delen', sidebar_label: 'Sociaal delen' },
        pl: { title: 'Udostępnianie społecznościowe', sidebar_label: 'Udostępnianie społecznościowe' },
        pt: { title: 'Compartilhamento social', sidebar_label: 'Compartilhamento social' },
        ru: { title: 'Социальный обмен', sidebar_label: 'Социальный обмен' },
        zh: { title: '社交分享', sidebar_label: '社交分享' },
    },
    'sponsor-ads': {
        en: { title: 'Sponsor Ads System', sidebar_label: 'Sponsor Ads' },
        ar: { title: 'نظام الإعلانات الراعية', sidebar_label: 'الإعلانات الراعية' },
        bg: { title: 'Система за реклами на спонсори', sidebar_label: 'Реклами на спонсори' },
        de: { title: 'Sponsor-Anzeigen-System', sidebar_label: 'Sponsor-Anzeigen' },
        es: { title: 'Sistema de anuncios patrocinados', sidebar_label: 'Anuncios patrocinados' },
        he: { title: 'מערכת מודעות ספונסר', sidebar_label: 'מודעות ספונסר' },
        it: { title: 'Sistema di annunci sponsor', sidebar_label: 'Annunci sponsor' },
        nl: { title: 'Sponsoradvertentiesysteem', sidebar_label: 'Sponsoradvertenties' },
        pl: { title: 'System reklam sponsorów', sidebar_label: 'Reklamy sponsorów' },
        pt: { title: 'Sistema de anúncios patrocinados', sidebar_label: 'Anúncios patrocinados' },
        ru: { title: 'Система спонсорской рекламы', sidebar_label: 'Спонсорская реклама' },
        zh: { title: '赞助广告系统', sidebar_label: '赞助广告' },
    },
    surveys: {
        en: { title: 'Surveys System', sidebar_label: 'Surveys' },
        ar: { title: 'نظام الاستطلاعات', sidebar_label: 'الاستطلاعات' },
        bg: { title: 'Система за анкети', sidebar_label: 'Анкети' },
        de: { title: 'Umfragesystem', sidebar_label: 'Umfragen' },
        es: { title: 'Sistema de encuestas', sidebar_label: 'Encuestas' },
        he: { title: 'מערכת סקרים', sidebar_label: 'סקרים' },
        it: { title: 'Sistema di sondaggi', sidebar_label: 'Sondaggi' },
        nl: { title: 'Enquêtesysteem', sidebar_label: "Enquêtes" },
        pl: { title: 'System ankiet', sidebar_label: 'Ankiety' },
        pt: { title: 'Sistema de pesquisas', sidebar_label: 'Pesquisas' },
        ru: { title: 'Система опросов', sidebar_label: 'Опросы' },
        zh: { title: '调查系统', sidebar_label: '调查' },
    },
    'url-extraction': {
        en: { title: 'URL Extraction System', sidebar_label: 'URL Extraction' },
        ar: { title: 'نظام استخراج الرابط', sidebar_label: 'استخراج الرابط' },
        bg: { title: 'Система за извличане на URL', sidebar_label: 'Извличане на URL' },
        de: { title: 'URL-Extraktionssystem', sidebar_label: 'URL-Extraktion' },
        es: { title: 'Sistema de extracción de URL', sidebar_label: 'Extracción de URL' },
        he: { title: 'מערכת חילוץ URL', sidebar_label: 'חילוץ URL' },
        it: { title: 'Sistema di estrazione URL', sidebar_label: 'Estrazione URL' },
        nl: { title: 'URL-extractiesysteem', sidebar_label: 'URL-extractie' },
        pl: { title: 'System ekstrakcji URL', sidebar_label: 'Ekstrakcja URL' },
        pt: { title: 'Sistema de extração de URL', sidebar_label: 'Extração de URL' },
        ru: { title: 'Система извлечения URL', sidebar_label: 'Извлечение URL' },
        zh: { title: 'URL提取系统', sidebar_label: 'URL提取' },
    },
    'user-profiles': {
        en: { title: 'User Profiles & Settings', sidebar_label: 'User Profiles' },
        ar: { title: 'ملفات تعريف المستخدم والإعدادات', sidebar_label: 'ملفات المستخدم' },
        bg: { title: 'Потребителски профили и настройки', sidebar_label: 'Потребителски профили' },
        de: { title: 'Benutzerprofile & Einstellungen', sidebar_label: 'Benutzerprofile' },
        es: { title: 'Perfiles y configuración de usuario', sidebar_label: 'Perfiles de usuario' },
        he: { title: 'פרופילי משתמש והגדרות', sidebar_label: 'פרופילי משתמש' },
        it: { title: 'Profili utente e impostazioni', sidebar_label: 'Profili utente' },
        nl: { title: 'Gebruikersprofielen & instellingen', sidebar_label: 'Gebruikersprofielen' },
        pl: { title: 'Profile użytkownika i ustawienia', sidebar_label: 'Profile użytkownika' },
        pt: { title: 'Perfis e configurações do usuário', sidebar_label: 'Perfis de usuário' },
        ru: { title: 'Профили пользователей и настройки', sidebar_label: 'Профили пользователей' },
        zh: { title: '用户配置文件和设置', sidebar_label: '用户配置文件' },
    },
    'version-management': {
        en: { title: 'Version Management', sidebar_label: 'Version Management' },
        ar: { title: 'إدارة الإصدارات', sidebar_label: 'إدارة الإصدارات' },
        bg: { title: 'Управление на версии', sidebar_label: 'Управление на версии' },
        de: { title: 'Versionsverwaltung', sidebar_label: 'Versionsverwaltung' },
        es: { title: 'Gestión de versiones', sidebar_label: 'Gestión de versiones' },
        he: { title: 'ניהול גרסאות', sidebar_label: 'ניהול גרסאות' },
        it: { title: 'Gestione delle versioni', sidebar_label: 'Gestione delle versioni' },
        nl: { title: 'Versiebeheer', sidebar_label: 'Versiebeheer' },
        pl: { title: 'Zarządzanie wersjami', sidebar_label: 'Zarządzanie wersjami' },
        pt: { title: 'Gerenciamento de versões', sidebar_label: 'Gerenciamento de versões' },
        ru: { title: 'Управление версиями', sidebar_label: 'Управление версиями' },
        zh: { title: '版本管理', sidebar_label: '版本管理' },
    },
    'view-tracking': {
        en: { title: 'View Tracking and Engagement', sidebar_label: 'View Tracking' },
        ar: { title: 'تتبع المشاهدات والتفاعل', sidebar_label: 'تتبع المشاهدات' },
        bg: { title: 'Проследяване на прегледи и ангажираност', sidebar_label: 'Проследяване на прегледи' },
        de: { title: 'Aufrufverfolgung & Engagement', sidebar_label: 'Aufrufverfolgung' },
        es: { title: 'Seguimiento de vistas y participación', sidebar_label: 'Seguimiento de vistas' },
        he: { title: 'מעקב צפיות ומעורבות', sidebar_label: 'מעקב צפיות' },
        it: { title: 'Monitoraggio visualizzazioni e coinvolgimento', sidebar_label: 'Monitoraggio visualizzazioni' },
        nl: { title: 'Weergavetracking en betrokkenheid', sidebar_label: 'Weergavetracking' },
        pl: { title: 'Śledzenie wyświetleń i zaangażowanie', sidebar_label: 'Śledzenie wyświetleń' },
        pt: { title: 'Rastreamento de visualizações e engajamento', sidebar_label: 'Rastreamento de visualizações' },
        ru: { title: 'Отслеживание просмотров и вовлечённость', sidebar_label: 'Отслеживание просмотров' },
        zh: { title: '浏览跟踪和参与度', sidebar_label: '浏览跟踪' },
    },
    'voting-comments-deep-dive': {
        en: { title: 'Voting & Comments Deep Dive', sidebar_label: 'Voting & Comments Deep Dive' },
        ar: { title: 'التعمق في التصويت والتعليقات', sidebar_label: 'التعمق في التصويت والتعليقات' },
        bg: { title: 'Задълбочено разглеждане на гласуване и коментари', sidebar_label: 'Задълбочено разглеждане на гласуване и коментари' },
        de: { title: 'Abstimmung & Kommentare – Deep Dive', sidebar_label: 'Abstimmung & Kommentare – Deep Dive' },
        es: { title: 'Votaciones y comentarios en profundidad', sidebar_label: 'Votaciones y comentarios en profundidad' },
        he: { title: 'הצבעות ותגובות לעומק', sidebar_label: 'הצבעות ותגובות לעומק' },
        it: { title: 'Votazioni e commenti – Approfondimento', sidebar_label: 'Votazioni e commenti – Approfondimento' },
        nl: { title: 'Stemmen & reacties diepgaand', sidebar_label: 'Stemmen & reacties diepgaand' },
        pl: { title: 'Głosowanie i komentarze – Szczegółowo', sidebar_label: 'Głosowanie i komentarze – Szczegółowo' },
        pt: { title: 'Votação e comentários em profundidade', sidebar_label: 'Votação e comentários em profundidade' },
        ru: { title: 'Голосование и комментарии в деталях', sidebar_label: 'Голосование и комментарии в деталях' },
        zh: { title: '投票和评论深度解析', sidebar_label: '投票和评论深度解析' },
    },
    'voting-comments': {
        en: { title: 'Voting & Comments System', sidebar_label: 'Voting & Comments' },
        ar: { title: 'نظام التصويت والتعليقات', sidebar_label: 'التصويت والتعليقات' },
        bg: { title: 'Система за гласуване и коментари', sidebar_label: 'Гласуване и коментари' },
        de: { title: 'Abstimmungs- & Kommentarsystem', sidebar_label: 'Abstimmung & Kommentare' },
        es: { title: 'Sistema de votaciones y comentarios', sidebar_label: 'Votaciones y comentarios' },
        he: { title: 'מערכת הצבעות ותגובות', sidebar_label: 'הצבעות ותגובות' },
        it: { title: 'Sistema di votazioni e commenti', sidebar_label: 'Votazioni e commenti' },
        nl: { title: 'Stem- & reactiessysteem', sidebar_label: 'Stemmen & reacties' },
        pl: { title: 'System głosowania i komentarzy', sidebar_label: 'Głosowanie i komentarze' },
        pt: { title: 'Sistema de votação e comentários', sidebar_label: 'Votação e comentários' },
        ru: { title: 'Система голосования и комментариев', sidebar_label: 'Голосование и комментарии' },
        zh: { title: '投票和评论系统', sidebar_label: '投票和评论' },
    },
};

const PAYMENT = {
    'multi-currency': {
        en: { title: 'Multi-Currency Integration', sidebar_label: 'Multi-Currency' },
        ar: { title: 'تكامل العملات المتعددة', sidebar_label: 'Multi-Currency' },
        bg: { title: 'Интеграция на множество валути', sidebar_label: 'Multi-Currency' },
        de: { title: 'Multi-Währungs-Integration', sidebar_label: 'Multi-Currency' },
        es: { title: 'Integración multi-divisa', sidebar_label: 'Multi-Currency' },
        he: { title: 'אינטגרציית מולטי-מטבע', sidebar_label: 'Multi-Currency' },
        it: { title: 'Integrazione multi-valuta', sidebar_label: 'Multi-Currency' },
        nl: { title: 'Multi-valuta-integratie', sidebar_label: 'Multi-Currency' },
        pl: { title: 'Integracja wielu walut', sidebar_label: 'Multi-Currency' },
        pt: { title: 'Integração multi-moeda', sidebar_label: 'Multi-Currency' },
        ru: { title: 'Мультивалютная интеграция', sidebar_label: 'Multi-Currency' },
        zh: { title: '多货币集成', sidebar_label: 'Multi-Currency' },
    },
    'payment-architecture': {
        en: { title: 'Payment Architecture', sidebar_label: 'Architecture' },
        ar: { title: 'بنية الدفع', sidebar_label: 'Architecture' },
        bg: { title: 'Архитектура на плащанията', sidebar_label: 'Architecture' },
        de: { title: 'Zahlungsarchitektur', sidebar_label: 'Architecture' },
        es: { title: 'Arquitectura de pagos', sidebar_label: 'Architecture' },
        he: { title: 'ארכיטקטורת תשלומים', sidebar_label: 'Architecture' },
        it: { title: 'Architettura dei pagamenti', sidebar_label: 'Architecture' },
        nl: { title: 'Betalingsarchitectuur', sidebar_label: 'Architecture' },
        pl: { title: 'Architektura płatności', sidebar_label: 'Architecture' },
        pt: { title: 'Arquitetura de pagamentos', sidebar_label: 'Architecture' },
        ru: { title: 'Архитектура платежей', sidebar_label: 'Architecture' },
        zh: { title: '支付架构', sidebar_label: 'Architecture' },
    },
    payment: {
        en: { title: 'Payment Integration Overview', sidebar_label: 'Integration Guide' },
        ar: { title: 'نظرة عامة على تكامل الدفع', sidebar_label: 'Integration Guide' },
        bg: { title: 'Обзор на интеграцията с плащания', sidebar_label: 'Integration Guide' },
        de: { title: 'Zahlungsintegrations-Übersicht', sidebar_label: 'Integration Guide' },
        es: { title: 'Descripción general de integración de pagos', sidebar_label: 'Integration Guide' },
        he: { title: 'סקירה כללית של אינטגרציית תשלום', sidebar_label: 'Integration Guide' },
        it: { title: 'Panoramica integrazione pagamenti', sidebar_label: 'Integration Guide' },
        nl: { title: 'Overzicht betalingsintegratie', sidebar_label: 'Integration Guide' },
        pl: { title: 'Przegląd integracji płatności', sidebar_label: 'Integration Guide' },
        pt: { title: 'Visão geral da integração de pagamentos', sidebar_label: 'Integration Guide' },
        ru: { title: 'Обзор интеграции платежей', sidebar_label: 'Integration Guide' },
        zh: { title: '支付集成概述', sidebar_label: 'Integration Guide' },
    },
    'plan-expiration': {
        en: { title: 'Plan Expiration Utilities', sidebar_label: 'Plan Expiration' },
        ar: { title: 'أدوات انتهاء صلاحية الخطة', sidebar_label: 'Plan Expiration' },
        bg: { title: 'Помощни средства за изтичане на плана', sidebar_label: 'Plan Expiration' },
        de: { title: 'Plan-Ablauf-Hilfsmittel', sidebar_label: 'Plan Expiration' },
        es: { title: 'Utilidades de vencimiento de plan', sidebar_label: 'Plan Expiration' },
        he: { title: 'כלי עזר לתפוגת תוכנית', sidebar_label: 'Plan Expiration' },
        it: { title: 'Utilità di scadenza del piano', sidebar_label: 'Plan Expiration' },
        nl: { title: "Plan-vervaldatum hulpmiddelen", sidebar_label: 'Plan Expiration' },
        pl: { title: 'Narzędzia wygaśnięcia planu', sidebar_label: 'Plan Expiration' },
        pt: { title: 'Utilitários de expiração de plano', sidebar_label: 'Plan Expiration' },
        ru: { title: 'Утилиты истечения срока плана', sidebar_label: 'Plan Expiration' },
        zh: { title: '计划过期工具', sidebar_label: 'Plan Expiration' },
    },
    polar: {
        en: { title: 'Polar Configuration', sidebar_label: 'Polar' },
        ar: { title: 'تكوين Polar', sidebar_label: 'Polar' },
        bg: { title: 'Конфигурация на Polar', sidebar_label: 'Polar' },
        de: { title: 'Polar-Konfiguration', sidebar_label: 'Polar' },
        es: { title: 'Configuración de Polar', sidebar_label: 'Polar' },
        he: { title: 'הגדרת Polar', sidebar_label: 'Polar' },
        it: { title: 'Configurazione Polar', sidebar_label: 'Polar' },
        nl: { title: 'Polar-configuratie', sidebar_label: 'Polar' },
        pl: { title: 'Konfiguracja Polar', sidebar_label: 'Polar' },
        pt: { title: 'Configuração Polar', sidebar_label: 'Polar' },
        ru: { title: 'Конфигурация Polar', sidebar_label: 'Polar' },
        zh: { title: 'Polar配置', sidebar_label: 'Polar' },
    },
    solidgate: {
        en: { title: 'Solidgate Integration', sidebar_label: 'Solidgate' },
        ar: { title: 'تكامل Solidgate', sidebar_label: 'Solidgate' },
        bg: { title: 'Интеграция Solidgate', sidebar_label: 'Solidgate' },
        de: { title: 'Solidgate-Integration', sidebar_label: 'Solidgate' },
        es: { title: 'Integración Solidgate', sidebar_label: 'Solidgate' },
        he: { title: 'אינטגרציה Solidgate', sidebar_label: 'Solidgate' },
        it: { title: 'Integrazione Solidgate', sidebar_label: 'Solidgate' },
        nl: { title: 'Solidgate-integratie', sidebar_label: 'Solidgate' },
        pl: { title: 'Integracja Solidgate', sidebar_label: 'Solidgate' },
        pt: { title: 'Integração Solidgate', sidebar_label: 'Solidgate' },
        ru: { title: 'Интеграция Solidgate', sidebar_label: 'Solidgate' },
        zh: { title: 'Solidgate集成', sidebar_label: 'Solidgate' },
    },
    stripe: {
        en: { title: 'Stripe Configuration', sidebar_label: 'Stripe' },
        ar: { title: 'تكوين Stripe', sidebar_label: 'Stripe' },
        bg: { title: 'Конфигурация на Stripe', sidebar_label: 'Stripe' },
        de: { title: 'Stripe-Konfiguration', sidebar_label: 'Stripe' },
        es: { title: 'Configuración de Stripe', sidebar_label: 'Stripe' },
        he: { title: 'הגדרת Stripe', sidebar_label: 'Stripe' },
        it: { title: 'Configurazione Stripe', sidebar_label: 'Stripe' },
        nl: { title: 'Stripe-configuratie', sidebar_label: 'Stripe' },
        pl: { title: 'Konfiguracja Stripe', sidebar_label: 'Stripe' },
        pt: { title: 'Configuração Stripe', sidebar_label: 'Stripe' },
        ru: { title: 'Конфигурация Stripe', sidebar_label: 'Stripe' },
        zh: { title: 'Stripe配置', sidebar_label: 'Stripe' },
    },
    webhooks: {
        en: { title: 'Payment Webhooks', sidebar_label: 'Webhooks' },
        ar: { title: 'Webhooks للدفع', sidebar_label: 'Webhooks' },
        bg: { title: 'Уебхукове за плащания', sidebar_label: 'Webhooks' },
        de: { title: 'Zahlungs-Webhooks', sidebar_label: 'Webhooks' },
        es: { title: 'Webhooks de pago', sidebar_label: 'Webhooks' },
        he: { title: 'Webhooks לתשלום', sidebar_label: 'Webhooks' },
        it: { title: 'Webhook di pagamento', sidebar_label: 'Webhooks' },
        nl: { title: 'Betalings-webhooks', sidebar_label: 'Webhooks' },
        pl: { title: 'Webhooki płatności', sidebar_label: 'Webhooks' },
        pt: { title: 'Webhooks de pagamento', sidebar_label: 'Webhooks' },
        ru: { title: 'Вебхуки платежей', sidebar_label: 'Webhooks' },
        zh: { title: '支付Webhook', sidebar_label: 'Webhooks' },
    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Read an English source file from docs/ and create a translated version.
 * Only the frontmatter title, sidebar_label, and the first H1 heading are translated.
 * All body content is preserved verbatim from the English source.
 */
function createTranslatedDoc(srcPath, destPath, translatedTitle, translatedSidebarLabel) {
    if (!fs.existsSync(srcPath)) {
        console.warn(`  SKIP (source missing): ${srcPath}`);
        return;
    }
    if (fs.existsSync(destPath)) {
        // Don't overwrite existing translations
        return;
    }

    let content = fs.readFileSync(srcPath, 'utf8');

    // Replace frontmatter title (handles quoted and unquoted values)
    content = content.replace(
        /^(title:\s*)("?)(.+?)\2(\s*$)/m,
        (_, key, q, _val, trail) => {
            // If translated title contains special YAML chars, wrap in quotes
            const needsQuote = /[:#\[\]{}&*!|>'"%@`]/.test(translatedTitle);
            return needsQuote
                ? `${key}"${translatedTitle}"${trail}`
                : `${key}${translatedTitle}${trail}`;
        }
    );

    // Replace frontmatter sidebar_label
    content = content.replace(
        /^(sidebar_label:\s*)("?)(.+?)\2(\s*$)/m,
        (_, key, q, _val, trail) => {
            const needsQuote = /[:#\[\]{}&*!|>'"%@`]/.test(translatedSidebarLabel);
            return needsQuote
                ? `${key}"${translatedSidebarLabel}"${trail}`
                : `${key}${translatedSidebarLabel}${trail}`;
        }
    );

    // Replace the first H1 heading (# Title)
    content = content.replace(
        /^(# )(.+)$/m,
        `$1${translatedTitle}`
    );

    ensureDir(path.dirname(destPath));
    fs.writeFileSync(destPath, content, 'utf8');
    console.log(`  Created: ${destPath.replace(ROOT, '')}`);
}

// ─── Generate advanced-guide for all non-fr locales ─────────────────────────

function generateAdvancedGuide() {
    console.log('\n=== Generating advanced-guide translations ===');
    for (const locale of ALL_LOCALES) {
        const localeDir = path.join(I18N_BASE, locale, 'docusaurus-plugin-content-docs-template', 'current', 'advanced-guide');
        // Check if directory already has all files
        let dirExists = fs.existsSync(localeDir);
        
        for (const [fileId, trans] of Object.entries(ADVANCED_GUIDE)) {
            const srcFile = path.join(DOCS_SOURCE, 'advanced-guide', `${fileId}.md`);
            const destFile = path.join(localeDir, `${fileId}.md`);
            const t = trans[locale];
            if (!t) continue;
            createTranslatedDoc(srcFile, destFile, t.title, t.sidebar_label);
        }
    }
}

// ─── Generate features for all non-fr locales ───────────────────────────────

function generateFeatures() {
    console.log('\n=== Generating features translations ===');
    for (const locale of ALL_LOCALES) {
        const localeDir = path.join(I18N_BASE, locale, 'docusaurus-plugin-content-docs-template', 'current', 'features');
        
        for (const [fileId, trans] of Object.entries(FEATURES)) {
            const srcFile = path.join(DOCS_SOURCE, 'features', `${fileId}.md`);
            const destFile = path.join(localeDir, `${fileId}.md`);
            const t = trans[locale];
            if (!t) continue;
            createTranslatedDoc(srcFile, destFile, t.title, t.sidebar_label);
        }
    }
}

// ─── Generate missing payment files ──────────────────────────────────────────

function generatePayment() {
    console.log('\n=== Generating payment translations ===');

    // multi-currency missing in: ar, bg, es, he, it, pl, pt, ru, zh
    const multiCurrencyLocales = ['ar', 'bg', 'es', 'he', 'it', 'pl', 'pt', 'ru', 'zh'];

    // All other missing payment files: all 11 non-fr locales
    const otherPaymentFiles = ['payment-architecture', 'payment', 'plan-expiration', 'polar', 'solidgate', 'stripe', 'webhooks'];

    for (const locale of multiCurrencyLocales) {
        const t = PAYMENT['multi-currency'][locale];
        if (!t) continue;
        const srcFile = path.join(DOCS_SOURCE, 'payment', 'multi-currency.md');
        const destFile = path.join(I18N_BASE, locale, 'docusaurus-plugin-content-docs-template', 'current', 'payment', 'multi-currency.md');
        createTranslatedDoc(srcFile, destFile, t.title, t.sidebar_label);
    }

    for (const fileId of otherPaymentFiles) {
        for (const locale of ALL_LOCALES) {
            const t = PAYMENT[fileId] && PAYMENT[fileId][locale];
            if (!t) continue;
            const srcFile = path.join(DOCS_SOURCE, 'payment', `${fileId}.md`);
            const destFile = path.join(I18N_BASE, locale, 'docusaurus-plugin-content-docs-template', 'current', 'payment', `${fileId}.md`);
            createTranslatedDoc(srcFile, destFile, t.title, t.sidebar_label);
        }
    }
}

// ─── Generate es/faq.md ───────────────────────────────────────────────────────

function generateEsFaq() {
    console.log('\n=== Generating es/faq.md ===');
    const destFile = path.join(I18N_BASE, 'es', 'docusaurus-plugin-content-docs-template', 'current', 'faq.md');
    if (fs.existsSync(destFile)) {
        console.log('  Already exists, skipping.');
        return;
    }
    ensureDir(path.dirname(destFile));
    const content = `---
id: faq
title: Preguntas frecuentes
sidebar_label: FAQ
---

# Preguntas frecuentes

## General

### ¿Qué es el Directorio Web Template?

El Directorio Web Template es una solución full-stack lista para producción para sitios web de directorios, construida con Next.js, React, TypeScript y Tailwind CSS. Puedes clonarlo, personalizarlo y desplegarlo para crear sitios web de directorios profesionales.

### ¿Puedo usar la plantilla sin la plataforma Ever Works?

Sí. La plantilla funciona de forma independiente como una aplicación Next.js autocontenida con sus propias rutas API, autenticación, base de datos y procesamiento de pagos. La plataforma es un producto separado que puede opcionalmente potenciar la generación de contenido mediante IA. Consulta [docs.ever.works](https://docs.ever.works) para la documentación de la plataforma.

### ¿Qué es Pinler.com?

[Pinler.com](https://pinler.com) es un servicio SaaS de directorio en producción construido sobre el ecosistema Ever Works, que demuestra un despliegue en el mundo real.

## Stack tecnológico

### ¿Qué tecnologías utiliza la plantilla?

- **Framework:** Next.js 15, React 19
- **Lenguaje:** TypeScript 5
- **Estilos:** Tailwind CSS 4, HeroUI React, Radix UI
- **ORM:** Drizzle ORM con PostgreSQL
- **Auth:** NextAuth.js v5, Supabase Auth
- **Pagos:** Stripe, LemonSqueezy, Polar

### ¿Qué proveedores de autenticación son compatibles?

Google, GitHub, Facebook, Twitter y Microsoft a través de NextAuth.js v5, además de Supabase Auth como backend de autenticación alternativo.

### ¿Qué proveedores de pago son compatibles?

Stripe, LemonSqueezy y Polar, todos con soporte de gestión de suscripciones.

## Despliegue

### ¿Cómo despliego la plantilla?

El objetivo de despliegue recomendado es **Vercel** para hosting Next.js sin configuración. Docker también es compatible como alternativa. Consulta la [Guía de despliegue](/deployment/deployment-introduction) para instrucciones detalladas.

### ¿Qué base de datos debo usar?

PostgreSQL es la base de datos principal, generalmente proporcionada a través de **Supabase** (gestionado) o una instancia directa de PostgreSQL. La plantilla usa Drizzle ORM para acceso a la base de datos con seguridad de tipos.

## Contenido

### ¿Cómo funciona el CMS basado en Git?

La plantilla lee el contenido del directorio (elementos, categorías, metadatos) de archivos estructurados (YAML, Markdown) almacenados en un repositorio Git. En el momento de la compilación, el contenido se clona en el directorio \`.content/\` y es renderizado por Next.js. Puedes gestionar el contenido editando los archivos directamente o usando la Plataforma Ever Works para la generación automática de contenido con IA.

### ¿Puedo añadir elementos manualmente?

Sí. Puedes crear y editar archivos YAML y Markdown en el repositorio de datos CMS sin necesitar la Plataforma. Las contribuciones de la comunidad también se pueden enviar como pull requests.

## Soporte

### ¿Dónde puedo obtener ayuda?

Consulta la [página de Soporte](/support) para canales comunitarios, opciones de soporte profesional y guías de resolución de problemas.
`;
    fs.writeFileSync(destFile, content, 'utf8');
    console.log(`  Created: ${destFile.replace(ROOT, '')}`);
}

// ─── Generate es/support.md ──────────────────────────────────────────────────

function generateEsSupport() {
    console.log('\n=== Generating es/support.md ===');
    const destFile = path.join(I18N_BASE, 'es', 'docusaurus-plugin-content-docs-template', 'current', 'support.md');
    if (fs.existsSync(destFile)) {
        console.log('  Already exists, skipping.');
        return;
    }
    ensureDir(path.dirname(destFile));
    const content = `---
id: support
title: Soporte y ayuda
sidebar_label: Soporte
---

# Soporte y ayuda

Bienvenido al centro de soporte del Directorio Web Template.

## Obtener ayuda

### Soporte comunitario

- **[GitHub Issues](https://github.com/ever-works/directory-web-template/issues)** — Reportar errores, solicitar funcionalidades o hacer preguntas técnicas
- **[Comunidad Discord](https://discord.gg/ever)** — Únete a nuestro activo servidor Discord para soporte en tiempo real
- **[Stack Overflow](https://stackoverflow.com/questions/tagged/directory-web-template)** — Haz preguntas técnicas con la etiqueta \`directory-web-template\`

### Soporte profesional

- **[Soporte por correo electrónico](mailto:ever@ever.co)** — Soporte directo para consultas empresariales
- **[Problemas de seguridad](mailto:security@ever.co)** — Reportar vulnerabilidades de seguridad de forma privada
- **[Soporte empresarial](https://ever.co/contacts)** — Soporte dedicado para clientes enterprise

## Recursos de documentación

- **[Guía de instalación](/getting-started/installation)** — Instrucciones completas de configuración
- **[Guía de inicio rápido](/getting-started/quick-start)** — Pon todo en marcha rápidamente
- **[Descripción de la arquitectura](/architecture/overview)** — Comprende el diseño del sistema
- **[Guía de despliegue](/deployment/deployment-introduction)** — Despliega en producción

Para la documentación de la Plataforma Ever Works, visita [docs.ever.works](https://docs.ever.works).

## Demo y ejemplos

- **[Sitio de demostración](https://demo.ever.works)** — Ver la plantilla en acción
- **[Repositorio GitHub](https://github.com/ever-works/directory-web-template)** — Código fuente y ejemplos

## Resolución de problemas

### Problemas comunes

#### Problemas de instalación

- **Versión de Node.js**: Asegúrate de usar Node.js 20+
- **Gestor de paquetes**: Usa pnpm (estrictamente requerido). Ejecuta \`corepack enable\` para activarlo.
- **Dependencias**: Ejecuta \`pnpm install\` en la raíz del repositorio
- **Conflictos de puerto**: El servidor de desarrollo usa por defecto el puerto 3000. Usa el indicador \`--port\` para especificar uno diferente.

#### Problemas de compilación

- **Errores de TypeScript**: Ejecuta \`pnpm tsc --noEmit\` para verificar errores de tipo
- **Dependencias faltantes**: Asegúrate de que todos los paquetes estén correctamente instalados con \`pnpm install\`
- **Variables de entorno**: Verifica que tu archivo \`.env.local\` esté configurado (copia desde \`.env.example\`)

#### Problemas de ejecución

- **Autenticación**: Verifica tus credenciales del proveedor OAuth en \`.env.local\`
- **Base de datos**: Asegúrate de que tu cadena de conexión PostgreSQL sea correcta
- **Migraciones**: Ejecuta \`pnpm db:migrate\` para aplicar las migraciones de base de datos pendientes

### Modo de depuración

Habilita el registro de depuración configurando variables de entorno:

\`\`\`bash
DEBUG=directory-web-template:*
NODE_ENV=development
\`\`\`

## Soporte empresarial

Para clientes enterprise, ofrecemos:

- **Soporte prioritario** — Canales de soporte dedicados
- **Integraciones personalizadas** — Soluciones adaptadas a tus necesidades
- **Formación e incorporación** — Pon a tu equipo al día rápidamente
- **Garantías de SLA** — Acuerdos de nivel de servicio para despliegues críticos

Contáctanos en [ever@ever.co](mailto:ever@ever.co) para opciones de soporte empresarial.
`;
    fs.writeFileSync(destFile, content, 'utf8');
    console.log(`  Created: ${destFile.replace(ROOT, '')}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('Generating missing i18n translations...');
console.log(`Source docs: ${DOCS_SOURCE}`);
console.log(`i18n base:   ${I18N_BASE}`);

generateAdvancedGuide();
generateFeatures();
generatePayment();
generateEsFaq();
generateEsSupport();

console.log('\nDone!');
