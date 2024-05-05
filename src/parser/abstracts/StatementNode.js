
import Node from "./Node.js";
import Lexer from "../Lexer.js";

export default class StatementNode extends Node {

    /**
     * @returns String
     */
    get type() { return this.constructor.name.toUpperCase(); }

    /**
	 * @inheritdoc
	 */
	get statementNode() { return this }

    /**
	 * @inheritdoc
	 */
    connectedNodeCallback(node) {}

    /**
     * @returns String
     */
    substitutePlaceholders(expr) {
        if (expr.indexOf('?') === -1) return;
		return Lexer.split(expr, ['?'], { blocks:[] }).reduce((expr, t, i) => expr ? expr + '?' + (i - 1) + t : t, null);
    }

    /**
     * @returns Bool
     */
    get expandable() { return false; }

    /**
     * @returns Node
     */
    async expand(asClone = false) { return asClone ? this.clone() : this; }
}
