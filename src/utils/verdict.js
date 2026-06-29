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

    // Credible: only explicit CREDIBLE verdict
    if (v.includes('CREDIBLE')) return 'Informative';

    // Non-Informative: misinformation or high risk flags
    if (
        v.includes('MISINFORMATION') ||
        v.includes('HIGH RISK') ||
        v.includes('RUMOR') ||
        v === 'NON-INFORMATIVE'
    ) return 'Non-Informative';

    // Suspicious / Not Relevant → treat as Non-Informative for stats
    if (v.includes('SUSPICIOUS') || v.includes('NOT RELEVANT')) return 'Non-Informative';

    // Text-only informative
    if (v === 'INFORMATIVE') return 'Informative';

    // Image-only real crisis (no text)
    if (v.includes('REAL CRISIS')) return 'Informative';

    // OOD, uncertain, no data
    return 'OOD';
};

export const classifyVerdict = (verdictOrRecord) => {
    const record = typeof verdictOrRecord === 'object' ? verdictOrRecord : null;
    const verdict = record?.verdict ?? (typeof verdictOrRecord === 'string' ? verdictOrRecord : '');

    const v = verdict.toUpperCase();
    return {
        // Credible: only when both image authentic + text informative
        isCredible: v.includes('CREDIBLE'),

        // High Risk: multiple flags detected
        isHighRisk: v.includes('HIGH RISK') || v.includes('MISINFORMATION'),

        // Suspicious: mismatch, unrelated caption, unverified rumor
        isSuspicious: v.includes('SUSPICIOUS') || v.includes('NOT RELEVANT'),

        // OOD / no data
        isOOD: v === 'OOD' || v === 'NO DATA' || v.includes('UNCERTAIN') || v === 'ML DISABLED',
    };
};

export const getVerdictColor = (verdictOrRecordOrCategory) => {
    if (verdictOrRecordOrCategory === 'Informative') return 'text-emerald-400';
    if (verdictOrRecordOrCategory === 'Non-Informative') return 'text-red-400';
    if (verdictOrRecordOrCategory === 'OOD') return 'text-gray-400';

    const { isCredible, isHighRisk, isSuspicious, isOOD } = classifyVerdict(verdictOrRecordOrCategory);
    if (isCredible) return 'text-emerald-400';
    if (isHighRisk) return 'text-red-400';
    if (isSuspicious) return 'text-amber-400';
    if (isOOD) return 'text-gray-400';
    return 'text-gray-400';
};

export const getVerdictBg = (verdictOrRecord) => {
    const { isCredible, isHighRisk, isSuspicious } = classifyVerdict(verdictOrRecord);
    if (isCredible) return 'bg-emerald-500/10 border-emerald-500/20';
    if (isHighRisk) return 'bg-red-500/10 border-red-500/20';
    if (isSuspicious) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-gray-500/10 border-gray-500/20';
};