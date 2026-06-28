// src/utils/verdict.js

export const SCORE_THRESHOLDS = {
    HIGH: 0.75,
    MID: 0.40,
    high: 0.75,
    mid: 0.40,
};

export const getVerdictCategory = (verdict) => {
    if (!verdict) return 'OOD';
    const v = verdict.toUpperCase();

    // Check Non-Informative BEFORE Informative to avoid substring collision
    // "NON-INFORMATIVE".includes('INFORMATIVE') is true — must check NON- first
    if (
        v === 'NON-INFORMATIVE' ||
        v.includes('MISINFORMATION') ||
        v.includes('HIGH RISK') ||
        v.includes('SUSPICIOUS') ||
        v.includes('MANIPULATED') || v.includes('TAMPERED') ||
        v.includes('RUMOR') ||
        v.includes('FABRICATED') ||
        v.includes('MISLEADING') ||
        v.includes('NOT CREDIBLE') ||
        v.includes('NOT RELEVANT')
    ) {
        return 'Non-Informative';
    }

    if (
        v === 'INFORMATIVE' ||
        v.includes('CREDIBLE') ||
        v.includes('AUTHENTIC') ||
        v.includes('VERIFIED')
    ) {
        return 'Informative';
    }

    if (v === 'OOD' || v.includes('NO DATA')) {
        return 'OOD';
    }

    return 'OOD'; // safe fallback
};

export const classifyVerdict = (verdictOrRecord) => {
    const record = typeof verdictOrRecord === 'object' ? verdictOrRecord : null;
    const vType = record?.verdict_type;
    const verdict = record?.verdict ?? (typeof verdictOrRecord === 'string' ? verdictOrRecord : '');

    if (vType) {
        const typeLower = vType.toLowerCase();
        return {
            isCredible: typeLower === 'credible',
            isHighRisk: typeLower === 'high_risk',
            isSuspicious: typeLower === 'suspicious',
            isOOD: typeLower === 'ood',
        };
    }

    const v = verdict.toUpperCase();
    return {
        isCredible: v === 'INFORMATIVE' || v.includes('CREDIBLE') || v.includes('VERIFIED'),
        isHighRisk: v === 'NON-INFORMATIVE' || v.includes('MISINFORMATION') ||
            v.includes('HIGH RISK') || v.includes('FABRICATED'),
        isSuspicious: v.includes('SUSPICIOUS') || v.includes('UNCERTAIN') ||
            v.includes('MISLEADING') || v.includes('NOT RELEVANT'),
        isOOD: v === 'OOD',
    };
};

export const getVerdictColor = (verdictOrRecordOrCategory) => {
    if (verdictOrRecordOrCategory === 'Informative') return 'text-emerald-400';
    if (verdictOrRecordOrCategory === 'Non-Informative') return 'text-red-400';
    if (verdictOrRecordOrCategory === 'OOD') return 'text-gray-400';

    const { isCredible, isHighRisk, isSuspicious } = classifyVerdict(verdictOrRecordOrCategory);
    if (isCredible) return 'text-emerald-400';
    if (isHighRisk) return 'text-red-400';
    if (isSuspicious) return 'text-amber-400';
    return 'text-gray-400';
};

export const getVerdictBg = (verdictOrRecord) => {
    const { isCredible, isHighRisk, isSuspicious } = classifyVerdict(verdictOrRecord);
    if (isCredible) return 'bg-emerald-500/10 border-emerald-500/20';
    if (isHighRisk) return 'bg-red-500/10 border-red-500/20';
    if (isSuspicious) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-gray-500/10 border-gray-500/20';
};