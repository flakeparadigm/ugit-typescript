export default class Ref {
    public readonly value: string;

    public readonly symbolic: boolean;

    constructor(
        value: string,
        symbolic = false,
    ) {
        this.value = value;
        this.symbolic = symbolic;
    }
}
