
/**
 * @imports
 */
import {
	Lexer
} from '@web-native-js/jsen';
import Mql from './Mql.js';
import ExprInterface from './ExprInterface.js';
// Reuse
import {
	Abstraction,
	Bool,
	Math,
	Num,
	Str
} from '@web-native-js/jsen';
import {
	AbstractionInterface,
	BoolInterface,
	MathInterface,
	NumInterface,
	StrInterface
} from '@web-native-js/jsen';
import * as Commons from '@web-native-js/commons';
// Extended
import {
	AssertionInterface,
	AssignmentInterface,
	CallInterface,
	ComparisonInterface,
	ConditionInterface,
	ReferenceInterface
} from '@web-native-js/jsen';
import Assertion from './Expr/Assertion.js';
import Assignment from './Expr/Assignment.js';
import Call from './Expr/Call.js';
import Comparison from './Expr/Comparison.js';
import Condition from './Expr/Condition.js';
import Reference from './Expr/Reference.js';
// New types
import Aggr from './Expr/Aggr.js';
import AggrInterface from './Expr/AggrInterface.js';
import Delete from './Expr/Delete.js';
import DeleteInterface from './Expr/DeleteInterface.js';
import Field from './Expr/Field.js';
import FieldInterface from './Expr/FieldInterface.js';
import GroupBy from './Expr/GroupBy.js';
import GroupByInterface from './Expr/GroupByInterface.js';
import Insert from './Expr/Insert.js';
import InsertInterface from './Expr/InsertInterface.js';
import Join from './Expr/Join.js';
import JoinInterface from './Expr/JoinInterface.js';
import OrderBy from './Expr/OrderBy.js';
import OrderByInterface from './Expr/OrderByInterface.js';
import Select from './Expr/Select.js';
import SelectInterface from './Expr/SelectInterface.js';
import Table from './Expr/Table.js';
import TableInterface from './Expr/TableInterface.js';
import Union from './Expr/Union.js';
import UnionInterface from './Expr/UnionInterface.js';
import Update from './Expr/Update.js';
import UpdateInterface from './Expr/UpdateInterface.js';
import Window from './Expr/Window.js';
import WindowInterface from './Expr/WindowInterface.js';

/**
 * @var object
 */
Mql.grammars = {
	// Statements and union
	Union: Union,				// ... UNION ...
	Select: Select,				// SELECT ... FROM ...
	Insert: Insert,				// INSERT INTO ...
	Update: Update,				// UPDATE ...
	Delete: Delete,				// DELETE FROM ...
	// Expressions
	Join: Join,					// table2 ON|USING ...
	Abstraction: Abstraction,	// (...)
	Condition: Condition,		// IF(..., ..., ...)
	Assertion: Assertion,		// !field1 OR field2
	Comparison: Comparison,		// field1 > field2
	Math: Math,					// field1 + field2
	Num: Num,					// [0-9]
	Str: Str,					// ""
	Bool: Bool,					// true
	Aggr: Aggr,					// MIN() OVER()
	Call: Call,					// COUNT()
	Reference: Reference,		// field1
};

/**
 * @exports
 */
export {
	ExprInterface,
	Lexer
};
export {
	Abstraction,
	Aggr,
	Assertion,
	Assignment,
	Bool,
	Call,
	Comparison,
	Condition,
	Delete,
	Field,
	GroupBy,
	Insert,
	Join,
	Math,
	Num,
	OrderBy,
	Reference,
	Select,
	Str,
	Table,
	Union,
	Update,
	Window
};
export {
	AbstractionInterface,
	AggrInterface,
	AssertionInterface,
	AssignmentInterface,
	BoolInterface,
	CallInterface,
	ComparisonInterface,
	ConditionInterface,
	DeleteInterface,
	FieldInterface,
	GroupByInterface,
	InsertInterface,
	JoinInterface,
	MathInterface,
	NumInterface,
	OrderByInterface,
	ReferenceInterface,
	SelectInterface,
	StrInterface,
	TableInterface,
	UnionInterface,
	UpdateInterface,
	WindowInterface
};
export default Mql;
