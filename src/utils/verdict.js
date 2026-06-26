// src/utils/verdict.js

export const SCORE_THRESHOLDS = {
    HIGH: 0.7,
    MID: 0.45,
    // Add lowercase versions for backward compatibility
    high: 0.7,
    mid: 0.45,
};

export const getVerdictCategory = (verdict) => {
    if (!verdict) return 'OOD';
    const v = verdict.toUpperCase();
    if (v.includes('CREDIBLE') || v.includes('INFORMATIVE') || v.includes('AUTHENTIC') || v.includes('VERIFIED')) {
        return 'Informative';
    }
    if (
        v.includes('MISINFORMATION') ||
        v.includes('HIGH RISK') ||
        v.includes('SUSPICIOUS') ||
        v.includes('NON-INFORMATIVE') ||
        v.includes('MANIPULATED') ||
        v.includes('RUMOR') ||
        v.includes('FABRICATED') ||
        v.includes('MISLEADING')
    ) {
        return 'Non-Informative';
    }
    return 'OOD';
};

export const classifyVerdict = (verdictOrRecord) => {
    // Accept either a raw verdict string OR a result/record object
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
        isCredible: v.includes('CREDIBLE') || v === 'INFORMATIVE' || v.includes('VERIFIED'),
        isHighRisk: v.includes('MISINFORMATION') || v.includes('HIGH RISK') || v === 'NON-INFORMATIVE' || v.includes('FABRICATED'),
        isSuspicious: v.includes('SUSPICIOUS') || v.includes('UNCERTAIN') || v.includes('MISLEADING'),
        isOOD: v === 'OOD',
    };
};

export const getVerdictColor = (verdictOrRecordOrCategory) => {
    // Handle predefined string categories
    if (verdictOrRecordOrCategory === 'Informative') return 'text-emerald-400';
    if (verdictOrRecordOrCategory === 'Non-Informative') return 'text-red-400';
    if (verdictOrRecordOrCategory === 'OOD') return 'text-gray-400';

    // Handle full verdict record / raw string
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