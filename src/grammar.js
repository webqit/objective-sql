
/**
 * @imports
 */
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
} from '@web-native-js/subscript/src/grammar.js';
import {
	AbstractionInterface,
	AssignmentInterface,
	BoolInterface,
	CallInterface,
	MathInterface,
	NumInterface,
	StrInterface,
	VoidInterface,
} from '@web-native-js/subscript/src/grammar.js';
// Extended
import {
	AssertionInterface,
	ComparisonInterface,
	ConditionInterface,
	ReferenceInterface,
} from '@web-native-js/subscript/src/grammar.js';
import Assertion from './grammar/Assertion.js';
import Comparison from './grammar/Comparison.js';
import Condition from './grammar/Condition.js';
import Reference from './grammar/Reference.js';
// New types
import Aggr from './grammar/Aggr.js';
import AggrInterface from './grammar/AggrInterface.js';
import ArrowReference from './grammar/ArrowReference.js';
import ArrowReferenceInterface from './grammar/ArrowReferenceInterface.js';
import Delete from './statement/Delete.js';
import DeleteInterface from './statement/DeleteInterface.js';
import Field from './grammar/Field.js';
import FieldInterface from './grammar/FieldInterface.js';
import GroupBy from './grammar/GroupBy.js';
import GroupByInterface from './grammar/GroupByInterface.js';
import Insert from './statement/Insert.js';
import InsertInterface from './statement/InsertInterface.js';
import Join from './grammar/Join.js';
import JoinInterface from './grammar/JoinInterface.js';
import OrderBy from './grammar/OrderBy.js';
import OrderByInterface from './grammar/OrderByInterface.js';
import Placeholder from './grammar/Placeholder.js';
import PlaceholderInterface from './grammar/PlaceholderInterface.js';
import Select from './statement/Select.js';
import SelectInterface from './statement/SelectInterface.js';
import Table from './grammar/Table.js';
import TableInterface from './grammar/TableInterface.js';
import Union from './statement/Union.js';
import UnionInterface from './statement/UnionInterface.js';
import Update from './statement/Update.js';
import UpdateInterface from './statement/UpdateInterface.js';
import Window from './grammar/Window.js';
import WindowInterface from './grammar/WindowInterface.js';

/**
 * @var object
 */
export default {
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
