export default class Ref {
    public readonly value: string|null;

    public readonly symbolic: boolean;

    constructor(
        value: string|null,
        symbolic = false,
    ) {
        this.value = value;
        this.symbolic = symbolic;
    }
}
