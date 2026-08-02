const { z } = require('zod');

// Zod şemasını doğrulayan middleware factory
const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        const messages = result.error.errors.map(e => e.message).join(' | ');
        return res.status(400).json({ success: false, message: messages });
    }
    req.body = result.data;
    next();
};

// ─── Auth Şemaları ───────────────────────────────────────────────
const loginSchema = z.object({
    username: z.string().min(1, 'Kullanıcı adı zorunludur.').max(100),
    password: z.string().min(1, 'Şifre zorunludur.').max(200),
});

const ilkKurulumSchema = z.object({
    username: z.string().min(3, 'Kullanıcı adı en az 3 karakter olmalıdır.').max(100),
    password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır.').max(200),
});

const hesapEkleSchema = z.object({
    username: z.string().min(3, 'Kullanıcı adı en az 3 karakter olmalıdır.').max(100),
    password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır.').max(200),
    rol: z.enum(['admin', 'user'], { message: 'Rol "admin" veya "user" olmalıdır.' }).optional(),
});

const sifreDegistirSchema = z.object({
    username: z.string().min(1, 'Kullanıcı adı zorunludur.').max(100),
    eskiSifre: z.string().min(1, 'Mevcut şifre zorunludur.'),
    yeniSifre: z.string().min(6, 'Yeni şifre en az 6 karakter olmalıdır.').max(200),
});

// ─── Kapı Şemaları ───────────────────────────────────────────────
const kapiEkleSchema = z.object({
    kapi_adi: z.string().min(1, 'Kapı adı zorunludur.').max(150),
    departman: z.string().max(150).optional().default(''),
    konum: z.string().max(200).optional().default(''),
    kapi_turu: z.enum([
        'Ana Giriş', 'Ana Çıkış', 'İç Geçiş',
        'Yemekhane Giriş', 'Yemekhane Çıkış', 'Mola / Sigara Alanı'
    ], { message: 'Geçersiz kapı türü.' }).optional().default('İç Geçiş'),
});

const kapiDurumSchema = z.object({
    durum: z.literal(0).or(z.literal(1)).or(z.boolean()),
    kapi_adi: z.string().max(150).optional(),
});

// ─── Vardiya Şemaları ─────────────────────────────────────────────
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const vardiyaSchema = z.object({
    vardiya_adi: z.string().min(1, 'Vardiya adı zorunludur.').max(150),
    mesai_baslangic: z.string().regex(timeRegex, 'Mesai başlangıcı HH:MM formatında olmalıdır.'),
    mesai_bitis: z.string().regex(timeRegex, 'Mesai bitişi HH:MM formatında olmalıdır.'),
    yemek_baslangic: z.string().regex(timeRegex).optional().nullable(),
    yemek_bitis: z.string().regex(timeRegex).optional().nullable(),
    tolerans_dk: z.number().int().min(0).max(120).optional().default(0),
    mola_hakki_dk: z.number().int().min(0).max(480).optional().default(0),
    calisma_gunleri: z.string().regex(/^[0-6](,[0-6])*$/, 'Çalışma günleri "1,2,3,4,5" formatında olmalıdır.').optional().default('1,2,3,4,5'),
});

const vardiyaDurumSchema = z.object({
    durum: z.literal(0).or(z.literal(1)).or(z.boolean()),
});

// ─── İzin Şemaları ────────────────────────────────────────────────
const izinEkleSchema = z.object({
    user_id: z.number().int().positive('Geçerli bir personel seçiniz.'),
    izin_turu: z.string().min(1, 'İzin türü zorunludur.').max(100),
    baslangic: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Başlangıç tarihi YYYY-MM-DD formatında olmalıdır.'),
    bitis: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Bitiş tarihi YYYY-MM-DD formatında olmalıdır.'),
    aciklama: z.string().max(500).optional().default(''),
    durum: z.enum(['Onaylandı', 'Bekliyor', 'Reddedildi']).optional().default('Onaylandı'),
});

// ─── Mesai Şemaları ────────────────────────────────────────────────
const mesaiOnaySchema = z.object({
    user_id: z.number().int().positive(),
    tarih: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    hesaplanan_dk: z.number().int().min(0),
    onaylanan_dk: z.number().int().min(0),
    durum: z.enum(['Onaylandı', 'Reddedildi', 'Bekliyor']),
    aciklama: z.string().max(500).optional().default(''),
});

const mesaiBulkOnaySchema = z.object({
    mesailer: z.array(z.object({
        user_id: z.number().int().positive(),
        tarih: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        hesaplanan_dk: z.number().int().min(0),
        onaylanan_dk: z.number().int().min(0),
    })).min(1, 'En az bir kayıt gereklidir.'),
    durum: z.enum(['Onaylandı', 'Reddedildi', 'Bekliyor']),
    aciklama: z.string().max(500).optional().default(''),
});

// ─── Toplu İşlem Şemaları ─────────────────────────────────────────
const bulkBaseSchema = z.object({
    hedef_turu: z.enum(['Tumu', 'Sirket', 'Departman'], { message: 'Geçersiz hedef türü.' }),
    hedef_deger: z.string().max(200).optional(),
});

const bulkShiftSchema = bulkBaseSchema.extend({
    vardiya_id: z.number().int().positive().optional().nullable(),
});

const bulkDoorsSchema = bulkBaseSchema.extend({
    doorIds: z.array(z.number().int().positive()).optional().default([]),
});

const bulkStatusSchema = bulkBaseSchema.extend({
    durum: z.literal(0).or(z.literal(1)),
    cikis_tarihi: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    cikis_nedeni: z.string().max(500).optional().default(''),
});

module.exports = {
    validate,
    schemas: {
        loginSchema, ilkKurulumSchema, hesapEkleSchema, sifreDegistirSchema,
        kapiEkleSchema, kapiDurumSchema,
        vardiyaSchema, vardiyaDurumSchema,
        izinEkleSchema,
        mesaiOnaySchema, mesaiBulkOnaySchema,
        bulkShiftSchema, bulkDoorsSchema, bulkStatusSchema,
    }
};
