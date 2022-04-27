export class CursorRule {
    constructor(
        public id: string,
        public name: string,
        public pattern: string,
        public cursor: { [cursorType: string]: { data: string, center: {x: number, y: number}, size?: { width: number, height: number } } },
    ) { }
}