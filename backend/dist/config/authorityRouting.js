"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDepartmentForCategory = exports.CATEGORY_AUTHORITY_MAP = void 0;
exports.CATEGORY_AUTHORITY_MAP = {
    'Road damage': {
        department: 'Municipal Corporation — Roads Dept',
        email: 'roads-dept-demo@vera-response.local',
        phoneFallback: '1800-ROADS-01',
        responseSLA: '24-48 Hours',
        isEmergencyService: false,
    },
    'Garbage/waste': {
        department: 'Municipal Corporation — Sanitation Dept',
        email: 'sanitation-demo@vera-response.local',
        phoneFallback: '1800-CLEAN-02',
        responseSLA: '12-24 Hours',
        isEmergencyService: false,
    },
    'Streetlight problems': {
        department: 'Municipal Corporation — Electrical Dept',
        email: 'electrical-dept-demo@vera-response.local',
        phoneFallback: '1800-POWER-03',
        responseSLA: '24 Hours',
        isEmergencyService: false,
    },
    'Water leakage': {
        department: 'Municipal Corporation — Water & Sewerage Dept',
        email: 'water-dept-demo@vera-response.local',
        phoneFallback: '1800-WATER-04',
        responseSLA: '6-12 Hours',
        isEmergencyService: false,
    },
    'Noise complaints': {
        department: 'Local Police — Non-Emergency Civic Cell',
        email: 'police-civic-demo@vera-response.local',
        phoneFallback: '100',
        responseSLA: '2-4 Hours',
        isEmergencyService: false,
    },
    'Harassment': {
        department: 'Police Department — Emergency Control Room',
        email: 'police-emergency-demo@vera-response.local',
        phoneFallback: '100 / 112',
        responseSLA: 'Immediate (<15 Mins)',
        isEmergencyService: true,
    },
    'Suspicious activity': {
        department: 'Police Department — Patrol Unit',
        email: 'police-patrol-demo@vera-response.local',
        phoneFallback: '100 / 112',
        responseSLA: 'Immediate (<30 Mins)',
        isEmergencyService: true,
    },
    'Accident': {
        department: 'Police Dept + Nearest Hospital Emergency Trauma',
        email: 'accident-dispatch-demo@vera-response.local',
        phoneFallback: '108 / 112',
        responseSLA: 'Immediate Critical (<10 Mins)',
        isEmergencyService: true,
    },
    'Fire': {
        department: 'Fire & Rescue Services',
        email: 'fire-control-demo@vera-response.local',
        phoneFallback: '101',
        responseSLA: 'Immediate Critical (<8 Mins)',
        isEmergencyService: true,
    },
    'Medical Emergency': {
        department: 'Nearest Hospital Emergency & Ambulance Services',
        email: 'medical-ems-demo@vera-response.local',
        phoneFallback: '108',
        responseSLA: 'Immediate Critical (<10 Mins)',
        isEmergencyService: true,
    },
    'Other civic issues': {
        department: 'General Municipal Helpdesk & Public Grievances',
        email: 'helpdesk-demo@vera-response.local',
        phoneFallback: '1800-CIVIC-00',
        responseSLA: '48 Hours',
        isEmergencyService: false,
    },
};
const getDepartmentForCategory = (category) => {
    return (exports.CATEGORY_AUTHORITY_MAP[category] || {
        department: 'General Municipal Helpdesk',
        email: 'general-demo@vera-response.local',
        responseSLA: '48 Hours',
        isEmergencyService: false,
    });
};
exports.getDepartmentForCategory = getDepartmentForCategory;
