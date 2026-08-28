import { Languages, LevelTypes, LogTypes, Protocols, Roles } from 'prisma/generated/enums';

export const protocolsMapping: Record<Protocols, string> = {
    [Protocols.AMNEZIAWG2]: 'AmneziaWG 3.1 / 2.0',
    [Protocols.AMNEZIAWG]: 'AmneziaWG',
    [Protocols.XRAY]: 'XRAY',
};

export const protocolsApiMapping: Record<Protocols, 'amneziawg' | 'amneziawg3' | 'xray'> = {
    [Protocols.AMNEZIAWG2]: 'amneziawg3',
    [Protocols.AMNEZIAWG]: 'amneziawg',
    [Protocols.XRAY]: 'xray',
};

export const protocolsServerMapping: Record<string, string> = {
    amneziawg3: 'AmneziaWG 3.1 / 2.0',
    amneziawg: 'AmneziaWG',
    xray: 'XRAY',
};

export const apiProtocolsMapping: Record<'amneziawg' | 'amneziawg3' | 'xray', Protocols> = {
    ['amneziawg3']: Protocols.AMNEZIAWG2,
    ['amneziawg']: Protocols.AMNEZIAWG,
    ['xray']: Protocols.XRAY,
};

export const levelTypesMapping: Record<LevelTypes, string> = {
    [LevelTypes.INFO]: 'Info',
    [LevelTypes.WARNING]: 'Warning',
    [LevelTypes.ERROR]: 'Error',
};

export const logTypesMapping: Record<LogTypes, string> = {
    [LogTypes.CLIENT]: 'Client',
    [LogTypes.SERVER]: 'Server',
    [LogTypes.TELEGRAM]: 'Telegram',
    [LogTypes.ADMIN]: 'Admins',
};

export const LanguagesMapping: Record<Languages, string> = {
    [Languages.ENGLISH]: 'English',
    [Languages.RUSSIAN]: 'Russian',
};

export const rolesMapping: Record<Roles, string> = {
    [Roles.ROOT]: 'Root',
    [Roles.ADMIN]: 'Admin',
};
