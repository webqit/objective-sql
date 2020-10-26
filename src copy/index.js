
/**
 * @imports
 */
import Rql from './Rql.js';
import ExprInterface from './ExprInterface.js';
// Reuse
import {
	Abstraction,
	Assignment,
	Bool,
	Call,
	Math,
	Num,
	Str,
	Void,
} from '@web-native-js/jsen';
import {
	AbstractionInterface,
	AssignmentInterface,
	BoolInterface,
	CallInterface,
	MathInterface,
	NumInterface,
	StrInterface,
	VoidInterface,
} from '@web-native-js/jsen';
// Extended
import {
	AssertionInterface,
	ComparisonInterface,
	ConditionInterface,
	ReferenceInterface,
} from '@web-native-js/jsen';
import Assertion from './Expr/Assertion.js';
import Comparison from './Expr/Comparison.js';
import Condition from './Expr/Condition.js';
import Reference from './Expr/Reference.js';
// New types
import Aggr from './Expr/Aggr.js';
import AggrInterface from './Expr/AggrInterface.js';
import ArrowReference from './Expr/ArrowReference.js';
import ArrowReferenceInterface from './Expr/ArrowReferenceInterface.js';
import Delete from './Stmt/Delete.js';
import DeleteInterface from './Stmt/DeleteInterface.js';
import Field from './Expr/Field.js';
import FieldInterface from './Expr/FieldInterface.js';
import GroupBy from './Expr/GroupBy.js';
import GroupByInterface from './Expr/GroupByInterface.js';
import Insert from './Stmt/Insert.js';
import InsertInterface from './Stmt/InsertInterface.js';
import Join from './Expr/Join.js';
import JoinInterface from './Expr/JoinInterface.js';
import OrderBy from './Expr/OrderBy.js';
import OrderByInterface from './Expr/OrderByInterface.js';
import Placeholder from './Expr/Placeholder.js';
import PlaceholderInterface from './Expr/PlaceholderInterface.js';
import Select from './Stmt/Select.js';
import SelectInterface from './Stmt/SelectInterface.js';
import Table from './Expr/Table.js';
import TableInterface from './Expr/TableInterface.js';
import Union from './Stmt/Union.js';
import UnionInterface from './Stmt/UnionInterface.js';
import Update from './Stmt/Update.js';
import UpdateInterface from './Stmt/UpdateInterface.js';
import Window from './Expr/Window.js';
import WindowInterface from './Expr/WindowInterface.js';

/**
 * @var object
 */
Rql.grammars = {
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
	Void: Void,					// null|undefined
	Aggr: Aggr,					// MIN() OVER()
	Call: Call,					// COUNT()
	Placeholder: Placeholder,	// ? :var
	ArrowReference, ArrowReference, // ref1 ~> ref2
	Reference: Reference,		// field1
};

/**
 * @exports
 */
export default Rql;
export {
	ExprInterface,
};
export {
	Abstraction,
	Aggr,
	ArrowReference,
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
	Placeholder,
	Reference,
	Select,
	Str,
	Table,
	Union,
	Update,
	Void,
	Window
};
export {
	AbstractionInterface,
	AggrInterface,
	ArrowReferenceInterface,
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
	PlaceholderInterface,
	ReferenceInterface,
	SelectInterface,
	StrInterface,
	TableInterface,
	UnionInterface,
	UpdateInterface,
	VoidInterface,
	WindowInterface
};