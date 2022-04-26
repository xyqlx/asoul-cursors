export class CursorRule {
    constructor(
        public id: string,
        public name: string,
        public pattern: string,
        public cursor: { [cursorType: string]: { data: string, size?: { width: number, height: number } } },
    ) { }
}