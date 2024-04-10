
/**
 * @imports
 */
import ExprInterface from './ExprInterface.js';
import CreateTable from './statement/schema/CreateTable.js';
import CreateDatabase from './statement/schema/CreateDatabase.js';
import AlterTable from './statement/schema/AlterTable.js';
import AlterDatabase from './statement/schema/AlterDatabase.js';
import DropTable from './statement/schema/DropTable.js';
import DropDatabase from './statement/schema/DropDatabase.js';
// Mains
import Abstraction from './grammar/Abstraction.js';
import AbstractionInterface from './grammar/AbstractionInterface.js';
import Aggr from './grammar/Aggr.js';
import AggrInterface from './grammar/AggrInterface.js';
import ArrowReference from './grammar/ArrowReference.js';
import ArrowReferenceInterface from './grammar/ArrowReferenceInterface.js';
import Assertion from './grammar/Assertion.js';
import AssertionInterface from './grammar/AssertionInterface.js';
import Bool from './grammar/Bool.js';
import BoolInterface from './grammar/BoolInterface.js';
import Call from './grammar/Call.js';
import CallInterface from './grammar/CallInterface.js';
import Comparison from './grammar/Comparison.js';
import ComparisonInterface from './grammar/ComparisonInterface.js';
import Condition from './grammar/Condition.js';
import ConditionInterface from './grammar/ConditionInterface.js';
import Delete from './statement/data/Delete.js';
import DeleteInterface from './statement/data/DeleteInterface.js';
import Field from './grammar/Field.js';
import FieldInterface from './grammar/FieldInterface.js';
import GroupBy from './grammar/GroupBy.js';
import GroupByInterface from './grammar/GroupByInterface.js';
import Insert from './statement/data/Insert.js';
import InsertInterface from './statement/data/InsertInterface.js';
import Join from './grammar/Join.js';
import JoinInterface from './grammar/JoinInterface.js';
import Math from './grammar/Math.js';
import MathInterface from './grammar/MathInterface.js';
import Num from './grammar/Num.js';
import NumInterface from './grammar/NumInterface.js';
import OrderBy from './grammar/OrderBy.js';
import OrderByInterface from './grammar/OrderByInterface.js';
import Placeholder from './grammar/Placeholder.js';
import PlaceholderInterface from './grammar/PlaceholderInterface.js';
import Reference from './grammar/Reference.js';
import ReferenceInterface from './grammar/ReferenceInterface.js';
import Select from './statement/data/Select.js';
import SelectInterface from './statement/data/SelectInterface.js';
import Str from './grammar/Str.js';
import StrInterface from './grammar/StrInterface.js';
import Table from './grammar/Table.js';
import TableInterface from './grammar/TableInterface.js';
import Union from './statement/data/Union.js';
import UnionInterface from './statement/data/UnionInterface.js';
import Update from './statement/data/Update.js';
import UpdateInterface from './statement/data/UpdateInterface.js';
import Void from './grammar/Void.js';
import VoidInterface from './grammar/VoidInterface.js';
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
	CreateDatabase: CreateDatabase,
	CreateTable: CreateTable,
	AlterDatabase: AlterDatabase,
	AlterTable: AlterTable,
	DropDatabase: DropDatabase,
	DropTable: DropTable,
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
	ArrowReference: ArrowReference, // ref1 ~> ref2
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
