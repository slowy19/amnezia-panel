import { LevelTypes, LogTypes } from "prisma/generated/enums";

export const levelTypeEnum = LevelTypes;

export const LevelTypeFilterEnum = {
    All: 'All',
};

export type LevelTypesFilter = keyof typeof LevelTypeFilterEnum | keyof typeof levelTypeEnum;


export const logTypeEnum = LogTypes;

export const LogTypeFilterEnum = {
    All: 'All',
};

export type LogTypesFilter = keyof typeof LogTypeFilterEnum | keyof typeof logTypeEnum;