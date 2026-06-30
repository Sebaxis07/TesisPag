"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRut = validateRut;
exports.normalizeRut = normalizeRut;
function validateRut(rut) {
    if (!rut || typeof rut !== 'string')
        return false;
    // Bypass validation for auto-generated guest usernames/identifiers
    if (rut.startsWith('guest'))
        return true;
    // Clean dots, dashes, and spaces
    const cleanRut = rut.replace(/[^0-9kK]/g, '');
    if (cleanRut.length < 2)
        return false;
    const body = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1).toUpperCase();
    // Basic format check
    if (!/^\d+$/.test(body))
        return false;
    // Calculate DV
    let sum = 0;
    let multiplier = 2;
    for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body[i], 10) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    const expectedDv = 11 - (sum % 11);
    let calculatedDv = '0';
    if (expectedDv === 10) {
        calculatedDv = 'K';
    }
    else if (expectedDv === 11) {
        calculatedDv = '0';
    }
    else {
        calculatedDv = expectedDv.toString();
    }
    return dv === calculatedDv;
}
function normalizeRut(rut) {
    if (!rut || typeof rut !== 'string')
        return rut;
    // If it's a guest identifier, return it as is
    if (rut.startsWith('guest'))
        return rut;
    const cleanRut = rut.replace(/[^0-9kK]/g, '');
    if (cleanRut.length < 2)
        return rut;
    const body = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1).toUpperCase();
    // Format body with thousands separators
    let formattedBody = '';
    for (let i = body.length - 1, count = 0; i >= 0; i--, count++) {
        if (count > 0 && count % 3 === 0) {
            formattedBody = '.' + formattedBody;
        }
        formattedBody = body[i] + formattedBody;
    }
    return `${formattedBody}-${dv}`;
}
