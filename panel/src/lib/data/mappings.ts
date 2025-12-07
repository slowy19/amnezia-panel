import { LevelTypes, LogTypes, Protocols } from 'prisma/generated/enums';

export const protocolsMapping: Record<Protocols, string> = {
    [Protocols.AMNEZIAWG]: 'AmneziaWG',
    [Protocols.XRAY]: 'XRAY',
};

export const protocolsApiMapping: Record<Protocols, 'amneziawg' | 'xray'> = {
    [Protocols.AMNEZIAWG]: 'amneziawg',
    [Protocols.XRAY]: 'xray',
};

export const apiProtocolsMapping: Record<'amneziawg' | 'xray', Protocols> = {
    ['amneziawg']: Protocols.AMNEZIAWG ,
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
};
