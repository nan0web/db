export default Directory;
declare class Directory {
    static FILE: string;
    static GLOBALS: string;
    static INDEX: string;
    static DATA_EXTNAMES: string[];
    get entries(): never[];
    get entriesFn(): Function;
    get filter(): void;
}
