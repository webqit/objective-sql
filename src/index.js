
/**
 * @imports
 */
import Parser from './Parser.js';
import grammar from './grammar.js';
import ODB from './database/odb/ODBDriver.js';

/**
 * @var object
 */
Parser.grammar = grammar;

/**
 * @exports
 */
export default Parser;
export {
	ODB,
};